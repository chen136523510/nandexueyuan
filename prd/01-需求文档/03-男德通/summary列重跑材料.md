# summary 列重跑材料

> 版本：v1.0 | 日期：2026-09-15（白机）
> 状态：📄 设计落档，**未排期、未实施**（院长 2026-09-15 第 2 条指令："记录相关信息，但不是近期需要实现的"）
> 关联：R-053（话题检索增强方案 B/C/D，已落地）、R-054（群聊数据考古，待排期）
> 决策权：未来启动 R-054 数据考古或下一轮检索质量评估时一并决定

---

## 1. 现状（基于代码层事实）

### 1.1 FTS5 索引结构

`server/scripts/rebuildFtsV2.js` 第 24 行：

```sql
CREATE VIRTUAL TABLE message_chunks_fts_v2 USING fts5(keywords, summary, tokenize='unicode61')
```

**双列索引**：keywords（LLM 提炼的主题词）+ summary（流水摘要）。

### 1.2 两列都走 tokenizeZh 预分词

`rebuildFtsV2.js` 第 41-42 行：

```js
const kw = tokenizeZh(r.keywords).replace(/'/g, "''")
const sm = tokenizeZh(r.summary || '').replace(/'/g, "''")
return `(${r.id}, '${kw}', '${sm}')`
```

空字符串走 `tokenizeZh` → 产出空 Set → FTS5 索引里无 token。

### 1.3 当前实际状态（2026-09-15）

- 5,372 块 chunks 中 **summary 列 5,372/5,372 全空**
- 索引层：`message_chunks_fts_v2` 的 summary 列 5,372 行全是空字符串 → 索引无 token
- 数据层：`message_chunks.summary` 列 5,372 行 NULL 或空（建表以来从未填充过）

---

## 2. 当前排序层的实际行为（R-053 方案 C 的设计意图被破坏）

### 2.1 R-053 方案 C 调用形态

`server/src/agents/topicSearchAgent.js` 第 240 行：

```sql
SELECT c.id, c.startMsgId, c.endMsgId, c.chunkDate, c.keywords
FROM message_chunks_fts_v2 f
JOIN message_chunks c ON f.rowid = c.id
WHERE f.message_chunks_fts_v2 MATCH ?
ORDER BY bm25(message_chunks_fts_v2, 3.0, 1.0)
LIMIT 20
```

`bm25()` 第二参数 1.0 对应 summary 列权重（按 CREATE 顺序：keywords=1st、summary=2nd），3.0 对应 keywords。

### 2.2 现实效果（summary 列空时）

| 层 | 设计意图 | 实际行为 |
|---|---|---|
| 索引层 | summary 列含 token | summary 列无 token（5,372 块空字符串） |
| 召回层（MATCH） | SQLite FTS5 `MATCH ?` 是"任一列含任一 token 即召回"——空列等价于不存在 | 当前等价于"只对 keywords 列检索" |
| 排序层（bm25） | keywords 3x + summary 1x 均衡 | summary 1.0 倍权重因列空归零 → **等效 `bm25(4.0, 0.0)` keywords 单边 4 倍集中** |

**R-053 方案 C 的设计意图只发挥了一半**（关键词列权重从 3x 隐性变成 4x 单边集中）。方案 C 仍能用，但排序层 keywords 过度集中。

### 2.3 Level 2 LIKE 同样受影响

`topicSearchAgent.js` 第 255 行：

```js
return `(keywords LIKE '%${e}%' ESCAPE '\\' OR summary LIKE '%${e}%' ESCAPE '\\')`
```

双列都查，但 summary 列空时第二列无命中——当前等于"只对 keywords 列 LIKE"。

---

## 3. 重跑后的预期效果

### 3.1 索引层

summary 列从空 → 含 LLM 生成的更宽泛摘要 token。每块 summary 通常 30~80 字，含比 keywords 更丰富的同义/近义 token。

### 3.2 召回层（MATCH）

summary token 参与 MATCH → **命中 keywords 没覆盖但 summary 覆盖的查询词**（边缘召回扩展）。例：
- keywords「考研 复试 调剂」 + summary 包含「上岸 笔试 面试 408 推免 国家线」等周边词
- 用户问"上岸经验"时仅 keywords 「考研」命中，但 summary token「上岸」可命中更多候选块

### 3.3 排序层（bm25）

真正生效 `bm25(3.0, 1.0)` → keywords 3x + summary 1x 均衡设计意图恢复。**排序层不再过度集中 keywords**——含边缘相关但 keywords 不直接命中的块可凭 summary 得分进入候选。

### 3.4 对其他模块的影响

| 模块 | 是否受影响 | 原因 |
|---|---|---|
| `rerankChunks`（LLM rerank） | ❌ 不直接受益 | `topicSearchAgent.js:139` 的 prompt 只展示 keywords + chunkDate，未读 summary |
| 块间去重 `dedupChunks` | ❌ 不受影响 | keywords 词集 Jaccard > 0.7，未涉及 summary |
| `fullAnalysisAgent` | ❌ 不受影响 | 基于 messages 原始数据，不读 summary |
| 统计类（person/mentioned/db_info） | ❌ 不受影响 | 基于 messages，不依赖 chunks summary |
| orchestrator 分析 prompt 注入 | ✅ **直接受益** | `topicSearchAgent.js:313` 的 `formattedText` 包含每块的 keywords + summary 字段——AI 拿到更丰富上下文 |
| rerank 间接影响 | ⚠️ **双刃剑** | rerank 候选集来自 Level 1 召回，召回层变化 → 候选集变化 → rerank 输出间接受影响 |

---

## 4. 重跑成本估算

| 项 | 数值 | 备注 |
|---|---|---|
| 块数 | 5,372 | 全部 chunks |
| 单块 LLM 调用 | 1 次 | 生成 ~50~80 字中文 summary |
| 单块 prompt+输出 token | ~350 token | input 200 + output 150 |
| 总 token | ~1.88M | 5,372 × 350 |
| 单价（参考 deepseek-flash / glm-flash） | ~0.001 元/千 token | |
| **总成本** | **~5~8 元** | 与上次 R-054 数据补跑（437 块 × ~0.015 元 ≈ 7 元）同一量级 |
| 并发 4 批的耗时 | ~3.5 小时 | 全量直跑 ~14 小时（不推荐） |
| 风险点 | 排序漂移 | 已上线 R-053 线上真调基于 keywords 单列，重跑后排序结果变化 |

---

## 5. 实施选项

### 选项 A：全量重跑后立即生效

- **工作量**：~3.5h 自动（并发 4）
- **风险**：排序漂移 + 线上召回可能变化
- **收益**：summary 列权重真正生效，5,372 块数据完整

### 选项 B：全量重跑但**先备份旧索引**

- **工作量**：~3.5h + 20min 备份
- **风险**：同 A
- **收益**：必要时可快速回滚（按 `bm25(fts, 3.0, 0.0)` 临时禁用 summary 列——一行 SQL）

### 选项 C：增量重跑（仅新近或缺失块）

- **工作量**：几分钟
- **风险**：summary 列数据密度仍不均
- **收益**：不解决"5,372 列全空"问题，无意义

### 选项 D：暂缓（当前默认）

- **工作量**：0
- **风险**：无
- **收益**：等 R-054 启动或检索质量投诉时再决定

**建议**：选项 B——全量重跑 + 保留灰度回滚能力。R-054 数据考古启动后，summary 列是数据产品的**必备输入**（生成人物卡/事件卡都要用），迟早要补。

---

## 6. 实施步骤（待未来院长裁决后启动）

1. **跑前备份**：`cp prod.db prod.db.bak.<日期>`（WAL 模式必须用 `sqlite3 .backup` 而非 cp——BUG-61 同族教训）
2. **建批量重跑脚本**（参考 `server/scripts/repairChunks.js` 的设计）：
   - 按 id 范围断点续跑（已有 `repairChunks.js` 的幂等筛选骨架可复用）
   - 复用 `buildChunks.js` 的 prompt 模板生成 summary
   - 空返回/占位返回一律判失败（BUG-77 防御）
3. **重跑策略**：并发 4 批，每批 ~1,300 块；总耗时 ~3.5 小时
4. **写回库**：`UPDATE message_chunks SET summary = ? WHERE id = ?`
5. **重建索引**：`rebuildFtsV2.js`（DROP + CREATE + 批量 INSERT，FTS5 v2 表重建）
6. **灰度切换**：先 `bm25(fts, 3.0, 0.0)` 临时禁用 summary 列 → 观察无回归 → 改 `bm25(fts, 3.0, 1.0)` 启用
7. **线上真调验证**：同 R-053 部署时验证方式

---

## 7. 回滚方案

- 旧索引不删，重跑前 `cp prod.db.bak.<日期> prod.db`（先停/重启 API 让 SQLite 接管）
- 灰度切换期间一行 SQL 即可临时禁用 summary 列：`bm25(fts, 3.0, 0.0)`

---

## 8. 风险与权衡

| 风险 | 缓解 |
|---|---|
| 排序漂移（线上 R-053 已基于 keywords 单列 5 天使用） | 选项 B 保留旧索引 + 灰度切换 |
| LLM 失败块（空字符串复现 BUG-77） | 重跑脚本加空返回判失败防御 |
| 资金成本（~5~8 元） | 与上次 R-054 数据补跑同量级，可接受 |
| 时间成本（~3.5h） | 并发 4 后台跑，无需前台 |

---

## 9. 不做的事（明确边界）

- ❌ 不动 R-053 方案 C 的 SQL（`bm25(3.0, 1.0)` 权重值不变）
- ❌ 不动索引 schema（`fts5(keywords, summary)` 双列结构不变）
- ❌ 不引入新依赖（复用 `repairChunks.js` 与 `rebuildFtsV2.js`）
- ❌ 不动 `message_chunks` 表结构

---

## 10. 待未来院长裁决的设计参数

| 参数 | 建议值 | 备选 |
|---|---|---|
| 触发时机 | R-054 启动时一并 | 立即 / 等投诉时 |
| 实施选项 | B（全量 + 备份回滚） | D（暂缓）|
| 并发度 | 4（参照 repairChunks） | 2（更保守）/ 8（更快但风险高）|
| summary prompt 模板 | 复用 `buildChunks.js` 现有 | 单独写更精简版本 |

---

## 11. 参考代码位置

| 内容 | 路径 |
|---|---|
| FTS5 v2 表结构 | `server/scripts/rebuildFtsV2.js:24` |
| 双列写入 tokenizeZh | `server/scripts/rebuildFtsV2.js:41-42` |
| bm25(3.0, 1.0) 调用 | `server/src/agents/topicSearchAgent.js:240` |
| LIKE 双列查询 | `server/src/agents/topicSearchAgent.js:255` |
| formattedText 输出（含 summary） | `server/src/agents/topicSearchAgent.js:313` |
| 重跑脚本骨架（可复用） | `server/scripts/repairChunks.js` |
| 单块 prompt 模板（可复用） | `server/scripts/buildChunks.js` |

---

院长下次涉及 R-054 或检索质量评估时重读本文件即可。所有事实与成本估算均基于 2026-09-15 实际代码状态。