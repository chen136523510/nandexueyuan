# 男德通 AI 优化方案设计

> 创建：2026-08-21（白机）
> 依据：《男德通AI产品全览.md》第 14 章 26 项痛点
> 状态：方案设计阶段，呈院长裁决后实施

---

## 分类说明

- **P0**：投入产出比最高，改一两处代码立竿见影
- **P1**：中等投入，需结构调整但风险可控
- **P2**：较大投入或依赖外部条件，排期实施
- **P3**：低优先级或当前规模不需要

---

## 一、检索质量（痛点 1-5）

### 痛点 1：FTS5 trigram 对 2 字中文词不友好 [P1]

**现状**：`ftsWords = rawWords.filter(k => k.length >= 3)`，2 字关键词（考研、打球）不走 FTS5 只走 LIKE 全表扫描。538,915 条消息 LIKE 全表扫描约 200ms，量大时有延迟。

**方案**：FTS5 trigram 对中文 2 字词确实有先天缺陷（trigram 是 3 字符滑窗，2 字词无 3-gram 可匹配）。三个可选路径：

| 方案 | 做法 | 成本 | 效果 |
|------|------|------|------|
| A（推荐）| FTS5 改用 `tokenize='unicode61'` + 自定义中文分词（jieba 预处理入索引时分词） | 中 | 根治，但需重建索引 |
| B | 2 字词也走 FTS5（`f.message_chunks_fts MATCH '"考研"'`，加引号做前缀匹配） | 低 | trigram 下 2 字词加引号可做前缀匹配，召回率提升但不完美 |
| C | 保持现状（LIKE 全表扫描 200ms 可接受） | 零 | 不改 |

**推荐**：先做方案 B（一行代码改 + 不需重建索引），观察效果。若仍不理想再上方案 A。

---

### 痛点 2：同义词扩展每次实时调 LLM [P0]

**现状**：每次话题检索 `expandSynonyms()` 调一次 `chatCompletion(temp=0)`，增加 3-5s 延迟 + token 消耗。相同关键词重复扩展。

**方案**：加内存缓存（LRU Map），key = 原始关键词，TTL = 1 小时。

```javascript
const synonymCache = new Map() // key: keywords, value: { expanded, ts }
const CACHE_TTL = 3600000 // 1 小时

async function expandSynonyms(keywords) {
  const cached = synonymCache.get(keywords)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.expanded
  // ... 原扩展逻辑 ...
  synonymCache.set(keywords, { expanded: result, ts: Date.now() })
  // 限制缓存大小
  if (synonymCache.size > 200) {
    const firstKey = synonymCache.keys().next().value
    synonymCache.delete(firstKey)
  }
  return result
}
```

**成本**：~15 行代码，零风险。**效果**：相同关键词第二次查询从 3-5s 降到 0ms。

---

### 痛点 3：无向量语义检索 [P2]

**现状**：PRD 规划了 RAG 向量检索（sqlite-vec + embedding），从未启用。语义相近但字面不同的消息无法召回。

**方案**：火山引擎 doubao-embedding-text-240715，1024 维，¥0.7/百万 token，53 万条约 ¥7。

| 步骤 | 内容 |
|------|------|
| 1 | 批量向量化：黑机跑 `scripts/buildEmbeddings.js`，53 万条约 ¥7 |
| 2 | 存储：sqlite-vec 虚拟表 `message_embeddings(messageId, embedding)` |
| 3 | 检索：新增 `semanticSearchAgent`，问题向量化 -> 余弦相似 Top-K |
| 4 | orchestrator planner prompt 新增 `semantic_search` 类型 |

**成本**：中（1 个新 Agent + 批量脚本 + 索引重建）。**效果**："大家最近运动了吗"能搜到"打球""篮球"。

**前置确认**：火山方舟 coding plan 端点是否支持 embedding API（需实测）。

---

### 痛点 4：规划 LLM 偶尔解析失败 [P1]

**现状**：`parseTasks` 靠正则提取 JSON。glm-5.3 实测 3/3 解析成功，但偶发情况仍可能输出带多余文本。

**方案**：双保险--正则提取失败时尝试 JSON.parse 整段 + 规划 prompt 加更强约束。

```javascript
function parseTasks(raw) {
  let cleaned = raw.replace(/```json|```/g, '').trim()
  const match = cleaned.match(/\[[\s\S]*\]/)
  if (match) cleaned = match[0]
  try {
    const tasks = JSON.parse(cleaned)
    if (!Array.isArray(tasks)) return []
    return tasks.filter(/* ... 现有白名单 ... */)
  } catch {
    // 新增：尝试从整段文本中提取第一个 { 到最后一个 }
    try {
      const obj = JSON.parse(cleaned)
      if (Array.isArray(obj)) return obj.filter(/* ... */)
    } catch { /* 确实无法解析 */ }
    return []
  }
}
```

**成本**：~5 行。**效果**：边缘情况多一层兜底。

---

### 痛点 5：timeSearchAgent FTS5 Error 偶现 [P1]

**现状**：BUG-67 遗留，error message 为空，偶现。

**方案**：在 timeSearchAgent 和 topicSearchAgent 的 FTS5 catch 块中打印完整 error 对象（含 SQL + 参数），收集一次完整错误日志后定位根因。

```javascript
} catch (err) {
  console.error('[TopicSearch FTS5 Error]', {
    message: err.message,
    stack: err.stack?.slice(0, 500),
    ftsQuery,
    rawWords,
  })
}
```

**成本**：~10 行日志增强。**效果**：下次触发时能定位是 SQL 语法还是参数问题。

---

## 二、响应速度（痛点 6-9）

### 痛点 6：glm-5.2/5.3 推理模型延迟高 [P0 → 已处理]

**现状**：纯推理模型首 token 延迟约 5s（已切 glm-5.3，实测规划 2.5-7.6s）。

**方案**：已切换 glm-5.3（本次完成）。若仍需降延迟：
- 方案 A：规划阶段换轻量非推理模型（如 doubao-lite），分析/回答保留 glm-5.3。需确认 coding plan 端点是否支持其他模型。
- 方案 B：接受现状（5s 首 token 对推理模型已属正常）。

---

### 痛点 7：三阶段串行 LLM 调用 [P1]

**现状**：规划(1次) + 同义词扩展(1次) + 分析回答(1次流式) = 至少 3 次 LLM 调用，总延迟 10-20s。

**方案**：减少 LLM 调用次数。

| 优化点 | 做法 | 节省 |
|--------|------|------|
| 同义词扩展缓存 | 痛点 2 方案 | 命中缓存时 -1 次调用（-3-5s） |
| 快速路由覆盖面扩大 | matchQuickPattern 增加更多模板（如"XX和XX谁更活跃"-> person_stat×2） | 命中时跳过规划（-1 次调用） |
| 规划与分析合并 | 实验性：将规划+分析合并为一次调用（LLM 先输出 JSON 任务，检索后第二次调用回答）。不推荐--合并后 LLM 上下文管理复杂 |

**推荐**：做前两项（缓存 + 快速路由扩展），不做合并。

---

### 痛点 8：黑机任务超时仅 15s [P1]

**现状**：`TASK_TIMEOUT = 15000`，黑机全量检索 person_messages（10 万条）可能超时。

**方案**：超时从 15s 提升到 30s，黑机端加进度反馈防假死。

```javascript
const TASK_TIMEOUT = 30000 // 15s -> 30s
```

黑机端 worker 在执行中定期发 `agent_thinking` 心跳（已有协议支持），云端收到心跳即重置超时计时器。

**成本**：1 行代码 + 黑机 worker 加心跳逻辑。**效果**：重度任务不再因 15s 硬超时降级。

---

### 痛点 9：分析 prompt 可能超大 [P1]

**现状**：formattedText 截断阈值 20000 字符，5 块 × 10 条 + 世界书 3 万字 = 可能超 5 万字符。

**方案**：分级 token 预算控制。

```javascript
const MAX_CONTEXT_CHARS = 20000 // 总上下文预算（含所有 Agent 结果）
let totalChars = 0
for (const result of agentResults) {
  if (result.formattedText) {
    const remaining = MAX_CONTEXT_CHARS - totalChars
    if (remaining <= 0) break
    const text = result.formattedText.slice(0, remaining)
    dataContext += `\n消息记录：\n${text}\n`
    totalChars += text.length
  }
}
```

世界书单独处理：只注入与问题相关的段落（LLM 先提取关键词 -> 世界书按关键词截取），不全文注入。

**成本**：中。**效果**：prompt 体积可控，避免超长 prompt 导致的延迟和费用。

---

## 三、成本（痛点 10-12）

### 痛点 10：glm-5.3 推理模型 token 消耗高 [P1]

**现状**：思考链消耗大量 token，不设 max_tokens。

**方案**：
- 监控：在 llm.js 的 chatCompletion/chatCompletionStream 返回值中附带 usage 统计，日志记录每次调用的 token 消耗。
- 优化：system prompt 精简（21 人知识库可压缩为"关键人物 Top 10 + 其余一句话"，减约 1500 字符/次）。

**成本**：低。**效果**：每次调用节省约 500-1000 token。

---

### 痛点 11：system prompt 重复发送 [P2]

**现状**：每次 LLM 调用都带完整 system prompt（~3000 字符），三阶段 3 次调用 = 3 倍。

**方案**：火山引擎若支持 prompt caching（与 OpenAI 类似的 cached_tokens），则在 system prompt 结尾加固定标记触发缓存。实测已返回 `prompt_tokens_details.cached_tokens`（目前为 0），需确认如何触发。

**成本**：低（如支持缓存）。**效果**：system prompt 部分只计费一次。

---

### 痛点 12：世界书全量注入 [P1]

**现状**：worldbookAgent 读取 3 万字设定集全文注入分析 prompt。

**方案**：分段索引。设定集按章节拆分为 chunk，worldbookAgent 先用 LLM 提取问题关键词 -> 只注入相关章节。

**成本**：中（需重构设定集为分块 + worldbookAgent 加检索逻辑）。**效果**：世界书从 3 万字符降到 3-5 千字符。

---

## 四、准确性（痛点 13-16）

### 痛点 13：人名匹配靠 LIKE 模糊 [P1]

**现状**：`nickname LIKE '%丘序明%'` 会匹配别人消息中提到"丘序明"的，统计偏高。

**方案**：personStatAgent 改为精确匹配 + 昵称列表 IN 查询。

```javascript
// 旧：nickname LIKE '%丘序明%'
// 新：nickname IN ('丘序明', '蒸糯re鸽', '不玩游戏', ...)
const inClause = names.map(() => '?').join(',')
const totalResult = await prisma.$queryRawUnsafe(
  `SELECT COUNT(*) as total FROM group_messages WHERE nickname IN (${inClause})`,
  ...names,
)
```

**成本**：改 personStatAgent / personMessagesAgent / mentionedAgent 三处 LIKE -> IN。**效果**：统计精确，不含别人提及的消息。

---

### 痛点 14：分析阶段只传 30 条消息 [P1]

**现状**：无 formattedText 时 `messages.slice(0, 30)`，后 N 条被丢弃。

**方案**：有 formattedText 时优先用 formattedText（已实现）；无 formattedText 时增加抽样逻辑（关键词命中优先 + 时间分散），不再简单 slice(0,30)。

复用 topicSearchAgent 的 `sampleChunkMessages` 思路，提取为公共工具函数。

**成本**：低。**效果**：30 条消息更有代表性。

---

### 痛点 15：知识库版本号过时 [P0 → 已处理]

**现状**：`SITE_VERSION = 'v3.2.0'`，与线上 v3.5.0 不一致。

**方案**：本次已修复--knowledge.js 改为动态读 `package.json` 的 version 字段，与发版流程自动同步。

---

### 痛点 16：规划阶段无人名消歧 [P2]

**现状**：规划 LLM 直接用用户输入的人名派任务，不校验是否是真实成员。

**方案**：规划 prompt 中注入成员名列表（已有 buildMemberKnowledge），prompt 中增加规则"人名必须是以下成员之一：{names}"。planner 返回的人名在 dispatchAgent 前做 resolveName 校验，不在成员列表中的 -> fallback 闲聊。

**成本**：低。**效果**：避免对不存在的人名浪费检索。

---

## 五、架构/可维护性（痛点 17-20）

### 痛点 17：两个已弃用 Agent 残留 [P0]

**现状**：semanticAgent.js(279行) + statisticAgent.js(141行) 不再被调用，420 行死代码。

**方案**：删除这两个文件 + 移除任何 import。确认无其他引用后直接删。

**成本**：5 分钟。**效果**：代码库干净，新人不困惑。

---

### 痛点 18：旧 PRD 严重过时 [P1]

**现状**：`AI助手.md` 描述的是三分类架构（statistic/semantic/chat），与当前多 Agent 架构完全不符。

**方案**：将旧 `AI助手.md` 移入 `归档/` 目录，顶部加"已过时"标注。新 PRD 以《男德通AI产品全览.md》为准。

**成本**：5 分钟。**效果**：文档不误导。

---

### 痛点 19：温度参数分散硬编码 [P1]

**现状**：规划 0 / 分析 0.5 / 闲聊 0.7 / 反馈生成 0 / NPC 0.8，散落各处。

**方案**：在 llm.js 导出温度常量，各调用点引用。

```javascript
// llm.js
export const TEMPS = {
  PLANNING: 0,
  ANALYSIS: 0.5,
  CHAT: 0.7,
  FEEDBACK: 0,
  NPC: 0.8,
}
```

**成本**：低。**效果**：调参集中管理。

---

### 痛点 20：dev.db/prod.db 混淆 [P2]

**现状**：3 次事故（BUG-61/65/70）因操作错库。

**方案**：
- deploy.sh 部署前自动备份 prod.db（`cp prod.db prod.db.bak.$(date +%Y%m%d_%H%M%S)`）。
- 所有文档中的 sqlite3 命令统一标注 `# 必须与 DATABASE_URL 指向的库一致`。
- 考虑 dev.db 改名为 `nande-dev.db`，prod.db 改名为 `nande-prod.db`，视觉上区分。

**成本**：低。**效果**：减少混淆概率。

---

## 六、功能缺口（痛点 21-26）

### 痛点 21：无对话记忆压缩 [P2]

**现状**：历史只取最近 19 轮原文，长对话超出后早期上下文丢失。

**方案**：超过 19 轮时，对早期轮次做 LLM 摘要压缩为 1 条 system 消息"之前的对话摘要：..."。

**成本**：中。**效果**：长对话不丢早期上下文。

---

### 痛点 22：无多轮追问能力 [P2]

**现状**：每次 askChat 独立规划，不感知上一轮派了哪些 Agent。

**方案**：orchestrate 接收 `lastIntent` 参数，规划 prompt 中注入"上一轮检索了 {lastIntent} 数据"。用户追问"还有呢"时，规划阶段知道在上一轮检索基础上扩展。

**成本**：中。**效果**："还有呢""然后呢"类追问能接续上下文。

---

### 痛点 23：无出图能力 [P2]

**现状**：v3.5.0 仅图片理解（输入），无图片生成（输出）。

**方案**：Seedream API 接入男德通，用户说"画一个XX"时主 Agent 识别出图意图 -> 生成提示词 -> 院长确认红线 -> 调 Seedream -> 返回图片。

**成本**：中。**前置**：AGENTS 禁止事项第 5 条（AI 生成 API 必须院长确认）。

---

### 痛点 24：无视频/音频输入 [P3]

**现状**：mini 支持但体积/成本/请求体风险大。

**方案**：暂缓。accept 改 `video/*,audio/*` + 50MB 限制 + base64 体积评估。等图片理解稳定后再考虑。

---

### 痛点 25：无 uploads/chat 清理 [P3]

**现状**：孤儿图片（删除会话后图片残留）无清理机制。

**方案**：定时任务（每天凌晨）扫描 uploads/chat，与 ChatTurn.images 列比对，删除无引用的孤儿文件。

**成本**：低。**效果**：磁盘不积攒垃圾。当前量小暂不急。

---

### 痛点 26：FTS5 索引不支持增量更新 [P2]

**现状**：新消息导入后需手动跑 `rebuildFts.js` 全量重建。

**方案**：importChat.js 导入新消息后，增量插入对应的 message_chunks + message_chunks_fts 行。buildChunks.js 改为支持增量模式（从 MAX(endMsgId) 继续）。

**成本**：中。**效果**：新消息即时可检索，不需手动重建。

---

## 实施优先级排序

| 优先级 | 痛点 | 预计工时 | 依赖 |
|--------|------|----------|------|
| P0 已完成 | 6（glm-5.3 切换）、15（版本号修复） | 本次 | - |
| P0 待做 | 2（同义词缓存）、17（删死代码） | 0.5h | - |
| P1 低风险 | 4（parseTasks 兜底）、5（FTS5 日志增强）、8（黑机超时 30s）、19（温度集中） | 1h | - |
| P1 中风险 | 1（FTS5 2字词前缀匹配）、7（快速路由扩展）、9（token 预算）、12（世界书分段）、13（人名 IN 查询）、14（消息抽样）、18（旧 PRD 归档） | 4h | - |
| P2 | 3（向量检索）、10（token 监控）、11（prompt caching）、16（人名消歧）、20（db 命名）、21（记忆压缩）、22（多轮追问）、26（FTS5 增量） | 2-3 天 | 部分需黑机配合 |
| P3 | 23（出图）、24（视频输入）、25（图片清理） | 排期 | 出图需院长确认红线 |
