# RAG 检索增强开发方案（方案 B/C/D）

> 版本：v1.0 | 日期：2026-08-24（白机）
> 状态：⛰️ uphill，方案已定待排期（院长已批准出方案，实施时间待定）
> 前置调研：《[RAG检索策略与工程化调研](../00-调研/RAG检索策略与工程化调研.md)》（2026-08-15 黑机，方案 A 已落地）
> 改动范围：`server/src/agents/topicSearchAgent.js` 为主 + `orchestrator.js` 一行传参

---

## 1. 背景与目标

2026-08-15 调研确认男德通话题检索的三处失真点，方案 A（块内抽样）已落地。剩余三方案针对**块选取层**的失真：

| 失真点 | 现状 | 后果 |
|--------|------|------|
| LIMIT 5 无依据 | `ORDER BY rank LIMIT 5` 纯排名截断 | 相关但排第 6 的块被硬切；无关块挤占名额 |
| 列权重未利用 | keywords 和 summary 同权重 | summary 里顺带提到关键词的块可能挤掉 keywords 正命中的块 |
| 同质块冗余 | 无去重 | 同一天同一话题被切成相邻块，可能占满全部 5 个名额 |

业界标准解法（Pinecone/Cohere 两阶段架构）：**第一阶段大召回（15-20 候选）不漏，第二阶段 rerank 精排（3-5 块）排对**。男德通用 LLM 打分替代 cross-encoder，无需本地模型。

---

## 2. 现状链路（改动基准）

```
关键词 → 同义词扩展(LLM, LRU 1h) → rawWords
  ↓
Level 1: 分块 FTS5 v2 MATCH (keywords+summary 两列) ORDER BY rank LIMIT 5   ← 改这里
  ↓ (0 命中才降级)
Level 2: 分块 LIKE
  ↓
每块捞全部消息 → sampleChunkMessages 抽样(每块10条) → formattedText
  ↓
结果缓存(resultCache, 10min/50条 LRU)
```

关键事实（代码核实）：
- FTS5 v2 表结构：`CREATE VIRTUAL TABLE message_chunks_fts_v2 USING fts5(keywords, summary, tokenize='unicode61')`——两列
- `dispatchAgent(task, emit, question)` 已有 question 第三参（fullAnalysis 在用），但 `case 'topic_search'` 分发时未传给 `runTopicSearchAgent`——**需补一行传参**
- resultCache 命中时整条链路（含未来的 rerank）跳过，天然复用

---

## 3. 方案 B：LLM Rerank 候选块（核心改动）

### 流程

```
Level 1 FTS5 召回: LIMIT 5 → LIMIT 20（候选池扩大）
  ↓
方案 D 去重（先做，减少 rerank 输入体积）
  ↓
方案 C 列权重排序（bm25 加权，rerank 前的初排）
  ↓
候选 ≤ 5 个？→ 是：直接用（省一次 LLM）
  ↓ 否
LLM Rerank（一次非流式调用，temp=0 + thinking:disabled）
  输入: 用户原问题 + 候选块列表（每块: id/chunkDate/keywords 截 100 字）
  输出: JSON 数组，最相关的 3-5 个块 id
  ↓
rerank 失败 → 降级取初排前 5（与现状一致，不阻断）
  ↓
选中块 → 走现有 sampleChunkMessages 抽样展开
```

### 新增常量

```js
const RERANK_CANDIDATES = 20   // Level 1 召回上限（原 5）
const RERANK_KEEP = 5          // rerank 保留块数
const RERANK_TRIGGER = 6       // 候选数 > 此值才触发 rerank（≤5 没必要）
```

### Rerank prompt 骨架

```
system: 你是检索结果重排序器。根据用户问题，从候选话题块中选出最相关的块。
规则：
- 只依据块的日期和关键词判断相关性
- 保留 3-5 个最相关块，按相关性降序
- 只输出 JSON 数组（块 id），不要其他内容
user: 【用户问题】{question}
【候选块】
1. id=123 2026-03-27 关键词：考研 复试 分数线
2. id=456 2026-03-29 关键词：考研 调剂 双非
...
```

- 调用：`chatCompletion(messages, { temperature: 0, thinking: 'disabled' })`（确定性 JSON 场景禁思考链，与 planner/feedback 同策略）
- 解析：复用 parseTasks 风格的容错（剥 ```json 围栏 + 正则提取 `[...]` + JSON.parse），解析失败按 rerank 失败降级

### 传参改动（orchestrator.js）

```js
// 现状（259-260 行）
case 'topic_search':
  result = { agentType: '话题检索', ...await runTopicSearchAgent(task, emit) }
// 改为
case 'topic_search':
  result = { agentType: '话题检索', ...await runTopicSearchAgent(task, emit, question) }
```

`runTopicSearchAgent(task, emit, question)` 签名加第三参。question 为空时（黑机 WS 通道不传 question）跳过 rerank 走初排。

---

## 4. 方案 C：FTS5 列权重（改一行 SQL）

```sql
-- 现状
ORDER BY rank
-- 改为（keywords 列权重 3 倍于 summary）
ORDER BY bm25(message_chunks_fts_v2, 3.0, 1.0)
```

- bm25() 返回负值（越小越相关），ORDER BY 升序语义不变
- 依据：keywords 是 LLM 提炼的主题词（正命中），summary 是流水摘要（顺带提及），正命中应优先
- Level 3 消息级 FTS5（单列 content）无需改

---

## 5. 方案 D：块间去重（纯 JS，零成本）

```js
/**
 * 候选块按 keywords 词集 Jaccard 相似度去重
 * 相似度 > 0.7 视为同质块（同一天同一话题被切成相邻块的冗余），保留 rank 靠前的
 */
function dedupChunks(chunks) {
  const kept = []
  for (const c of chunks) { // chunks 已按相关性排序
    const wordsC = new Set((c.keywords || '').split(/\s+/).filter(Boolean))
    const isDup = kept.some((k) => {
      const wordsK = new Set((k.keywords || '').split(/\s+/).filter(Boolean))
      const inter = [...wordsC].filter((w) => wordsK.has(w)).length
      const union = new Set([...wordsC, ...wordsK]).size
      return union > 0 && inter / union > 0.7
    })
    if (!isDup) kept.push(c)
  }
  return kept
}
```

插入位置：Level 1 召回之后、rerank 之前。去重后候选不足 `RERANK_TRIGGER` 个则免 rerank 直接用。

---

## 6. 改动清单

| 文件 | 改动 | 规模 |
|------|------|------|
| `topicSearchAgent.js` | 新增 3 常量 + `dedupChunks()` + `rerankChunks()`（LLM 调用）+ Level 1 SQL 两处改（LIMIT 20 + bm25 列权重）+ 主流程接入 | ~100 行 |
| `orchestrator.js` | `case 'topic_search'` 传 question 第三参 | 1 行 |

不动数据库 schema、不动前端、不动其他 Agent。

---

## 7. 成本与延迟评估

| 项 | 值 | 说明 |
|----|-----|------|
| LLM 增量调用 | 每次 topic_search 未命中缓存时 +1 次 rerank | resultCache 命中（10min 同关键词）则零增量 |
| rerank prompt 体积 | ~2k 字符（问题 + 20 块 × keywords 截 100 字） | deepseek-v4-flash 单次 < 0.001 元 |
| rerank 延迟 | 实测 1-2s（thinking:disabled + temp=0） | 总延迟 5-10s → 6-12s，可接受 |
| 方案 C/D | 零成本 | SQL 改一行 + 纯 JS |

---

## 8. 验证方案（PoC 先行）

1. **分数分布调试**（方案 C 前置）：`SELECT rowid, bm25(message_chunks_fts_v2, 3.0, 1.0) AS score FROM message_chunks_fts_v2 WHERE message_chunks_fts_v2 MATCH ? ORDER BY score LIMIT 20`——看加权后分数分布，确认无异常
2. **rerank 质量对比**：拿 5 个真实问题（考研/打游戏/吐槽/某人物相关/时间+话题复合），对比「rank 前 5」vs「rerank 选 5」的块组成差异，人工判断哪个更贴问题
3. **去重效果**：观察同日期相邻块（如 BUG-67 里 3/27、3/29、3/30 三连块）是否被合并
4. **降级链路**：模拟 rerank LLM 失败（断 key），确认走初排前 5 不阻断
5. **缓存回归**：同关键词 10min 内第二次提问，确认零 LLM 零查询
6. **线上实测**：部署后问「群里讨论考研的频率高吗」，检查思考面板出现「重排」过程提示且回答块覆盖更准

---

## 9. 风险与回退

| 风险 | 缓解 |
|------|------|
| rerank LLM 输出非法 JSON | 解析失败降级初排前 5（与现状一致），不阻断 |
| bm25() 列权重在旧版 SQLite 行为差异 | 服务器 SQLite 版本确认（FTS5 bm25 为 3.9+ 标准函数，线上已用 FTS5 MATCH 无问题） |
| 候选 20 块全捞消息变慢 | 捞消息只对**选中后**的 ≤5 块做（现状即如此），候选阶段只取 id/keywords/summary 元数据，体积小 |
| 黑机 WS 通道不传 question | question 为空时跳过 rerank，行为与现状一致 |

回退方式：三个方案相互独立，任一出问题单独 revert 对应改动；rerank 可通过把 `RERANK_TRIGGER` 调到 `Infinity` 一键禁用。

---

## 10. 与其他需求的关系

- **R-048 向量语义检索**：本方案 B/C/D 是关键词路线的精度压榨；R-048 上向量后，rerank 层可直接复用（候选从 FTS5+向量 RRF 融合后再过 LLM rerank），不冲突
- **R-050 精确短语统计**：正交（那是消息级 COUNT，这是块级选取）
- **调研文档结论**：「不建议现在做向量+RRF 全家桶」——本方案就是该结论下的最优性价比路径
