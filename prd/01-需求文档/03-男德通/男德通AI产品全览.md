# 男德通 AI 产品全览

> 最后更新：2026-08-21（白机，基于 v3.5.0 线上代码逐行审计产出）
> 来源：`server/src/agents/`、`server/src/utils/`、`server/src/controllers/chatController.js`、`server/src/searchHub.js`、`server/scripts/`、`src/views/ChatView.vue` 全部源码
> 定位：本文是男德通 AI 的**工程实况快照**，每个参数/阈值/prompt 均来自源码，可直接作为优化依据

---

## 目录

1. [产品定位与双形态](#1-产品定位与双形态)
2. [系统架构总览](#2-系统架构总览)
3. [主 Agent（Orchestrator）三阶段流程](#3-主-agentorchestrator三阶段流程)
4. [七个子 Agent 详解](#4-七个子-agent-详解)
5. [LLM 封装层（llm.js）](#5-llm-封装层llmjs)
6. [人设系统（persona.js）](#6-人设系统personajs)
7. [知识库层（knowledge.js）](#7-知识库层knowledgejs)
8. [黑机搜索 Hub（searchHub.js）](#8-黑机搜索-hubsearchhubjs)
9. [数据管线（导入→分块→索引）](#9-数据管线导入分块索引)
10. [前端交互层（ChatView.vue）](#10-前端交互层chatviewvue)
11. [API 契约与 SSE 协议](#11-api-契约与-sse-协议)
12. [数据库表结构](#12-数据库表结构)
13. [环境变量清单](#13-环境变量清单)
14. [当前痛点与优化机会盘点](#14-当前痛点与优化机会盘点)

---

## 1. 产品定位与双形态

男德通 AI 有**两个独立形态**，共用 LLM 封装层（llm.js）但人设/链路/入口完全不同：

| 维度 | 站外男德通（/chat） | 德塔 NPC 男德通（/nde 内） |
|------|---------------------|---------------------------|
| 入口 | `POST /api/chat/ask` | `POST /api/chat/npc/talk` |
| 架构 | 多 Agent 三阶段（规划→检索→分析回答） | 纯流式对话（无检索） |
| 人设来源 | `persona.js`（4 预设 + 自定义） | `chatController.js → buildGamePersona()`（读世界观文档动态构建） |
| 知识范围 | 群聊数据（53 万条）+ 设定集 + 网站信息 | 德塔世界观 + 花名册 + 交互需求文档 |
| 人设语气 | 群友风格（口语/调侃/阴阳怪气） | 美少女向导（俏皮/撒娇/~结尾） |
| 对话长度 | 无硬限制 | 每次≤50 字、禁止换行 |
| 历史轮次 | 最近 19 轮 | 最近 19 轮 |
| 限流 | 10 次/分钟 | 10 次/分钟 |

---

## 2. 系统架构总览

```
用户提问
  │
  ▼
chatController.askChat()
  ├─ 图片校验（/uploads/chat/ 前缀正则，最多 3 张）
  ├─ 创建/复用 ChatSession
  ├─ 存 user turn（含 images JSON）
  ├─ 读取历史（最近 20 轮 desc → reverse → 截尾 19）
  │
  └─ orchestrate(question, history, send, personaId, customDesc, images)
       │
       ├─ ① 视觉识别（带图必跑）
       │    └─ visionAgent → visionChatCompletion（doubao-seed-2-0-mini）
       │       识别结果拼进 effectiveQuestion
       │
       ├─ ② 快速短路判断（无图时）
       │    ├─ isCasualChat() → 直接闲聊 runDirectChat()
       │    ├─ matchQuickPattern() → 正则匹配直接派 Agent（跳过规划 LLM）
       │    └─ matchFeedbackIntent() → runFeedbackFlow()
       │
       ├─ ③ 阶段 1：规划（LLM）
       │    └─ buildPlannerPrompt() → chatCompletion(temp=0) → parseTasks()
       │       输出 JSON 任务数组：[{"type":"person_stat","target":"丘序明"}, ...]
       │
       ├─ ④ 阶段 2：并行检索
       │    └─ tasks.map(dispatchAgent) → Promise.all
       │       ├─ 重度任务 + 黑机在线 → sendSearchTask()（WS 外包黑机）
       │       └─ 轻量/降级 → 本地执行对应 Agent
       │
       └─ ⑤ 阶段 3：分析 + 回答（LLM 流式）
            └─ buildAnalysisPrompt() → chatCompletionStream(temp=0.5)
               逐 chunk send('token') 推前端
```

---

## 3. 主 Agent（Orchestrator）三阶段流程

> 文件：`server/src/agents/orchestrator.js`（722 行）

### 3.1 入口函数签名

```javascript
orchestrate(question, history, send, personaId, customDesc, images = [])
// question:     用户原始问题（string）
// history:      [{role:'user'|'assistant', content}] 最近 19 轮
// send:         SSE 发送函数 send(event, data)
// personaId:    'tiwei'|'qiubi'|'kaikai'|'normal'|'custom'
// customDesc:   自定义人设描述（personaId='custom' 时）
// images:       ['/uploads/chat/xxx.png', ...] 最多 3 张
// 返回:          { answer, sources, intent, imageDescriptions?, feedback? }
```

### 3.2 视觉识别前置（带图必跑）

| 条件 | 行为 |
|------|------|
| `images.length > 0` | **无条件**先跑 `runVisionAgent()`（主模型 glm-5.2 是纯文本看不到图，无法自行判断是否需识别） |
| 视觉异常 | 降级为"图片识别服务异常"，主 Agent 基于文字回答，不中断 |
| 识别结果拼接 | `effectiveQuestion = question + "\n\n[用户同时发来图片，视觉子Agent识别结果：]\n图1: xxx\n图2: xxx"` |

带图时**跳过** `isCasualChat` 和 `matchQuickPattern` 短路（图片是消息主体，不能当闲聊处理）。

### 3.3 快速短路判断

#### 3.3.1 闲聊判断 `isCasualChat(question)`

| 参数 | 值 | 来源 |
|------|-----|------|
| 最大长度 | **10 字**（超过直接判 false） | `q.length > 10 return false` |
| 匹配方式 | `casualPatterns.some(p => q.includes(p))` | 子串匹配，非正则 |
| 匹配词表 | 你好/哈喽/嗨/hi/hello/在吗/在不在/早上好/中午好/下午好/晚上好/晚安/谢谢/感谢/谢了/多谢/辛苦了/拜拜/再见/88/bye/你是谁/你叫什么/你是什么/你能做什么/你是ai/你是机器人/哈哈哈/呵呵/笑死/绝了/吃了吗/干嘛呢/在干嘛/睡了吗 | 共 ~35 个 |

命中 → 走 `runDirectChat()`（纯流式，跳过整个三阶段）。

#### 3.3.2 快速路由 `matchQuickPattern(question)`

成员名匹配：将 21 人真名 + 外号（≥2 字）转义后用 `|` 连接成正则 OR，**按长度倒序**优先匹配长名。

| 模板类型 | 正则 | 命中后派发任务 |
|----------|------|----------------|
| 话题搜索 | `群里最近聊了什么\|大家在聊什么\|最近有什么新鲜事\|最近群里在聊` | `[{type:'topic_search', keywords: q}]` |
| 话题搜索 | `讨论过(.{1,10})吗\|有人聊过(.{1,10})吗\|有没有人提过(.{1,10})\|聊过(.{1,10})吗` | 提取关键词 → `[{type:'topic_search', keywords: kw}]` |
| 数据库信息 | `聊天记录跨度\|跨度有.*长\|跨度多长\|多少条消息\|总.*消息\|数据库.*统计` | `[{type:'db_info'}]` |
| 数据库信息 | `群聊统计\|发言.*排行\|谁最活跃\|最活跃` | `[{type:'db_info'}]` |
| 数据库信息 | `当前版本\|最新版本\|网站版本\|版本信息` | `[{type:'db_info'}]` |
| 数据库信息 | `多少信息\|知道多少\|了解多少\|有哪些信息\|什么信息` | `[{type:'db_info'}]` |
| 人物统计（需命中成员名） | `发了多少条\|发了多少\|发言多少\|发言数\|发了几条\|活跃吗\|活跃不\|多少消息` | `[{type:'person_stat', target: resolvedName}]` |
| 人物发言（需命中成员名） | `说了什么\|聊了什么\|最近说了\|最近聊了\|说了啥\|聊了啥` | `[{type:'person_messages', target: resolvedName}]` |
| 人物评价（需命中成员名） | `怎么样\|如何评价\|什么样的人\|这人咋样\|靠谱吗\|是个啥` | `[{type:'person_stat'},{type:'person_messages'},{type:'mentioned'}]` 三 Agent 并行 |

命中 → 跳过规划 LLM，直接派发。未命中成员名 → return null（继续走规划阶段）。

#### 3.3.3 反馈意图检测 `matchFeedbackIntent(question)`

| 正则 | 说明 |
|------|------|
| `(.{2,10})(有bug\|黑屏\|闪退\|崩溃\|报错\|白屏\|卡死\|不能用\|用不了\|坏了\|出问题)` | BUG 反馈 |
| `(.{2,10})(太慢\|加载慢\|卡\|延迟高\|响应慢\|性能差\|很卡)` | 性能问题 |
| `(建议\|希望\|能不能\|可以不可以\|为什么不\|为啥不\|应该)(.{2,30})` | 需求建议 |
| `(新开\|新增\|加一个\|来一个)(.{2,20})(模块\|功能\|页面\|按钮)` | 功能新增 |

命中 → `runFeedbackFlow()`（LLM 生成结构化反馈 JSON → SSE 推前端确认卡片 → 流式回答）。

### 3.4 阶段 1：规划

**`buildPlannerPrompt(question, history, persona)`** 构造规划 prompt：

- System: 人设 prompt（`persona` 或 `CHAT_PERSONA`）
- 历史注入：逐轮 `push({role, content})`
- User: 用户问题 + 7 类子 Agent 说明 + 判断规则 + 8 个示例

规划 LLM 调用参数：

| 参数 | 值 | 说明 |
|------|-----|------|
| temperature | **0** | 规划需确定性 |
| max_tokens | 不设 | glm-5.2 纯推理模型，设了会被思考消耗导致正文截断 |
| thinking | 不传 | glm-5.2 不支持 disabled，传了会 400（BUG-68 教训） |
| 超时 | 180s | `TIMEOUT_MS = 180000` |

**`parseTasks(raw)`** 解析规划输出：

1. 去 markdown 标记（` ```json ` / ` ``` `）
2. 提取 `[...]` JSON 数组
3. `JSON.parse` + 过滤白名单 type：`person_stat`/`person_messages`/`mentioned`/`topic_search`/`time_search`/`worldbook`/`db_info`
4. 非法/解析失败 → 空数组

**规划 fallback 策略**（规划异常或返回空数组时）：

- 检查问题是否含数据信号词：`/群里|群聊|聊天|发言|消息|谁|讨论|聊过|活跃|统计|数据|信息/`
- 含数据信号 → fallback 到 `[{type:'topic_search', keywords: question}]`
- 不含数据信号 → 走闲聊 `runDirectChat()`
- 带图时规划无任务很正常（图是消息主体），直接走闲聊回答

### 3.5 阶段 2：并行检索

**`dispatchAgent(task, emit)`** 派发逻辑：

```
重度任务（HEAVY_TASKS = ['person_messages', 'mentioned']）
  ├─ 黑机在线 → sendSearchTask(task, emit)（WS 外包黑机全量检索）
  │    └─ 成功：返回 { ...result, _wasHeavy:true, _degraded:false }
  │    └─ 失败：降级本地执行 + emit warning
  └─ 黑机离线 → 本地执行 + { _wasHeavy:true, _degraded:true }

轻量任务 → 本地执行
```

本地执行 switch：

| task.type | 调用 | agentType 标签 |
|-----------|------|----------------|
| person_stat | runPersonStatAgent | '人物统计' |
| person_messages | runPersonMessagesAgent | '人物发言' |
| mentioned | runMentionedAgent | '被提及' |
| topic_search | runTopicSearchAgent | '话题检索' |
| time_search | runTimeSearchAgent | '时间检索' |
| worldbook | runWorldbookAgent | '世界书' |
| db_info | runDbInfoAgent | '数据库信息' |

所有任务 `Promise.all` 并行执行。

### 3.6 阶段 3：分析 + 回答

**黑机降级检测**：所有重度任务全降级时，发 `phase:'warning'` 事件提示用户"高性能计算节点（黑机）离线"。

**`buildAnalysisPrompt(question, history, agentResults, persona, visionContext)`** 构造分析 prompt：

数据上下文拼装规则：

| agentType | 拼装方式 |
|-----------|----------|
| 视觉识别 | `【视觉识别】{summary}\n图片1（{url}）：{description}` |
| 失败的 Agent | `【{agentType}】检索失败：{error}` |
| 人物统计 | 摘要：`统计：共{total}条，最活跃月份：{topMonths}，平均长度{avgLen}字符`（只传摘要不传原始 JSON） |
| 有 formattedText | 取前 **20000 字符**（超出截断标注），作为消息记录文本注入 |
| 无 formattedText 有 messages | 取前 **30 条**，每条 `[nickname time] content` |
| 通用 | 每个 result 加 `【{agentType}】{summary}` 头 |

分析 prompt 尾部约束：
- 严格只使用提供的检索数据，不要编造
- nickname 是群昵称，回答时用成员真名
- 数据不足诚实说明
- 用群友语气回答，别啰嗦

分析 LLM 调用参数：

| 参数 | 值 |
|------|-----|
| temperature | **0.5** |
| stream | true |
| 超时 | 180s |

流式异常兜底：`if (!answer) { answer = '回答时出错...'; send('token', answer) }`（BUG-68 教训：catch 里必须 send token 否则前端零输出）。

**引用来源汇总**：每个 ok 的 Agent 取前 3 条 messages → 总计 slice(0,5)。

**intent 判定**：去重 agentType，多个 → 'multi'，单个 → 该 type，无 → 'chat'。

### 3.7 纯闲聊 `runDirectChat(question, history, send, persona)`

| 参数 | 值 |
|------|-----|
| temperature | **0.7** |
| stream | true |

流式异常兜底同上。

### 3.8 反馈流程 `runFeedbackFlow(question, history, send, persona)`

两步 LLM 调用：

**Step 1：生成结构化反馈**（`chatCompletion`，temp=0）

System prompt 要求输出 JSON：
```json
{"is_feedback": true, "type": "bug|optimization|new_feature|story", "title": "≤15字", "action": "操作步骤", "content": "详细描述"}
```

type 映射到 Feedback 表的 type 字段。`is_feedback: false` → 不生成反馈。

**Step 2：流式回答**（`chatCompletionStream`，temp=0.7）

前缀注入：告知"已帮你提交反馈，后续院长会处理"，要求自然回复不提 JSON。

返回 `{ answer, sources: [], intent: 'feedback', feedback }`。**反馈不自动入库**，由前端用户点"确认投递"后调 API 提交（确认制）。

---

## 4. 七个子 Agent 详解

### 4.1 话题检索 Agent（topicSearchAgent.js）

> 文件 242 行。这是最复杂、调用频率最高的 Agent。

**输入**：`{ keywords: "打球 游戏" }`

**流程**：

```
expandSynonyms(keywords)          ← 1 次 LLM 调用（temp=0）
  → "打球 篮球 足球 羽毛球 运动"
    → 分词：rawWords(≥2字) / ftsWords(≥3字)
      → Level 1: 分块 FTS5（keywords+summary 双列 MATCH，LIMIT 5）
      → Level 2: 分块 LIKE（keywords OR summary，LIMIT 5）  ← Level1 无结果时
      → Level 3: 原始消息 FTS5（content MATCH，LIMIT 50）   ← 分块全无时
      → Level 4: 原始消息 LIKE（content OR，LIMIT 50）      ← Level3 无结果时
```

**同义词扩展 prompt**：

```
System: 你是一个同义词扩展助手。保留原始关键词，补充3-8个同义词/近义词/下位词，
        每个词至少2个汉字，只输出词语用空格分隔，不要解释不要标点。
User:   {keywords}
```
temp=0，失败时用原始关键词。

**块内消息抽样 `sampleChunkMessages(msgs, keywords, budget=10)`**：

这是方案 A 的核心（解决旧版 orchestrator slice(0,30) 只覆盖第一个块的信息失真）：

1. 关键词命中的消息优先（按命中词数排序），预留头尾 2 个名额
2. 头尾各 1 条，定块的时间边界
3. 不足预算时顺序补齐
4. 保持原对话顺序输出

**命中分块时的 formattedText 格式**：

```
【话题块 2026-01-01】关键词：广州 游玩 灯泡（块内共 87 条，抽样 10 条）
[丘序明 01-01 14:30] ...
[陈梓键 01-01 14:32] ...

【话题块 2026-03-15】关键词：...
```

每块消息预算 **MSG_BUDGET_PER_CHUNK = 10**。5 块 × 10 条 + 摘要头 ≈ 覆盖全部块且体积可控。

**关键参数**：

| 参数 | 值 | 说明 |
|------|-----|------|
| MSG_BUDGET_PER_CHUNK | 10 | 每块抽样消息数 |
| 分块 FTS5 LIMIT | 5 | 最多命中 5 个分块 |
| 原始消息 LIMIT | 50 | Level 3/4 最多 50 条 |
| content 截断 | 200 字符 | 单条消息超过 200 字截断 |
| keywords 截断 | 100 字符 | 块摘要 keywords 截断 |
| FTS5 分词器 | trigram | 双列 keywords + summary |

### 4.2 时间检索 Agent（timeSearchAgent.js）

> 文件 173 行。处理"X月份聊了什么""去年暑假"等时间范围问题。

**输入**：`{ startDate: "2026-07-01", endDate: "2026-07-31", keywords?: "游戏" }`

日期范围由**规划阶段 LLM** 从自然语言转化的（规划 prompt 示例中有"7月份聊了什么 → startDate:2026-07-01"）。

**流程**：

1. 按 msgTime 时间戳范围统计每日消息数（`strftime` 按日 GROUP BY）
2. 查话题块（`chunkDate BETWEEN ? AND ?`，可选 keywords LIKE 过滤），**不限 30**
3. 聚合统计：
   - ≤31 天 → 按日展示
   - \>31 天 → 按月展示
4. 话题块摘要**按月聚合，每月最多 8 个块**（BUG-67 修复：防止 1466 块全塞给 LLM 导致 18 万字符 prompt 爆炸）
5. 抽样消息：每天最多 3 条，总共最多 30 条

**关键参数**：

| 参数 | 值 | 说明 |
|------|-----|------|
| 每月话题块上限 | 8 | 防止 prompt 爆炸 |
| 每天抽样消息 | 3 | |
| 总抽样消息上限 | 30 | |
| 消息内容截断 | 80 字符 | |
| keywords 截断 | 100 字符 | |
| 日期聚合阈值 | 31 天 | ≤31 按日，>31 按月 |

### 4.3 人物统计 Agent（personStatAgent.js）

> 文件 93 行。**不经过 LLM**，直接 SQL 查询避免幻觉。

**输入**：`{ target: "丘序明" }`

**人名反查 `buildPersonConditions(target)`**：

从 `members` 数组找匹配者（真名/外号/昵称），收集所有可能名称 → 构建 LIKE 条件。

例：target="丘哥" → member=丘序明 → names=["丘序明","蒸糯re鸽","不玩游戏","魔弹仙君","做题体孝子（暂时）","丘哥","丘比","禀心寒霜","四季"] → 9 个 LIKE OR 条件。

**三条 SQL**：

| 查询 | SQL |
|------|-----|
| 总发言数 | `SELECT COUNT(*) as total FROM group_messages WHERE {conditions}` |
| 月度活跃 Top5 | `SELECT strftime('%Y-%m', ...) AS ym, COUNT(*) as cnt ... GROUP BY ym ORDER BY cnt DESC LIMIT 5` |
| 长度统计 | `SELECT AVG(length(content)) as avgLen, MAX(length(content)) as maxLen ...` |

返回 `{ ok, summary, result, target, matchedNames }`。summary 格式：`丘序明（匹配昵称：...）共发言 93873 条，最活跃月份是 2026-07，平均发言长度 X 字符`。

### 4.4 人物发言 Agent（personMessagesAgent.js）

> 文件 114 行。**重度任务**（HEAVY_TASKS）。

**输入**：`{ target: "丘序明" }`

**参数**：

| 参数 | 默认值 | 黑机全量模式 |
|------|--------|-------------|
| limit（SQL LIMIT） | 50 | null（不限） |
| msgSlice（传给 LLM 条数） | 30 | 200 |
| ctxSlice（上下文总条数上限） | 200 | 全部 |

**流程**：

1. 人名反查 → LIKE 条件
2. 查该人发言（`ORDER BY msgTime DESC LIMIT 50`）+ COUNT 总数
3. `fetchWithContext(targetIds, 5)` → 每条发言前后各 5 条上下文
4. `formatMessagesAsText()` 格式化为 `[真名 MM-DD HH:mm] content`
5. 返回 `{ ok, messages, count, target, matchedNames, formattedText }`

上下文工具 `contextSearch.js`：

| 参数 | 值 | 说明 |
|------|-----|------|
| contextSize | 5 | 前后各 5 条 |
| maxTargets | 50 | 最多 50 条目标消息 |
| maxIds | 300 | 上下文 ID 总上限 |

### 4.5 被提及 Agent（mentionedAgent.js）

> 文件 140 行。**重度任务**（HEAVY_TASKS）。

**输入**：`{ target: "丘序明" }`

**搜索关键词构建**：真名 + 外号 + 昵称，过滤掉 <2 字的。

**检索**：先 FTS5（≥3 字的词），无结果再 LIKE。

**参数**：

| 参数 | 默认值 | 黑机全量模式 |
|------|--------|-------------|
| limit | 30 | null |
| msgSlice | 20 | 150 |
| ctxSlice | 150 | 全部 |

流程与人物发言 Agent 相同（查发言 → 取上下文 → 格式化），区别是搜索的是**别人提到该人的消息**。

### 4.6 数据库信息 Agent（dbInfoAgent.js）

> 文件 160 行。**不经过 LLM**，纯 SQL。

**`queryDbStats()`**（与 REST 端点 `/chat/db-info` 共用）返回 6 项统计：

| 统计项 | SQL |
|--------|-----|
| 消息总数+时间跨度 | `SELECT COUNT(*), MIN(msgTime), MAX(msgTime) FROM group_messages` |
| 参与人数 | `SELECT DISTINCT nickname` → JS 层 `resolveName` 去重合并 |
| 发言排行 Top10 | `GROUP BY nickname ORDER BY cnt DESC LIMIT 30` → JS 层 resolveName 合并 → 取 Top10 |
| 分块统计 | `SELECT COUNT(*), MIN(chunkDate), MAX(chunkDate) FROM message_chunks` |
| 年度消息数 | `strftime('%Y', ...) GROUP BY year` |
| 年度话题分布 | `substr(chunkDate,1,4) GROUP BY year` + `GROUP_CONCAT(DISTINCT substr(keywords,1,200))` |

**关键设计**：不排除 `nickname='我'`（微信导出本人标识 = 陈梓键，11 万条），`resolveName('我')` → 陈梓键。

### 4.7 世界书 Agent（worldbookAgent.js）

> 文件 47 行。最简单的 Agent。

读取设定集 v1.4 全文（`prd/01-需求文档/04-德塔/02-设计/世界观/设定集-v1.4.md`），返回 `{ ok, formattedText: content, summary, count:1 }`。

按需加载，不常驻上下文（3 万字常驻太费 token）。

### 4.8 视觉 Agent（visionAgent.js）

> 文件 134 行。多模态一期（v3.5.0）。

**`describeImage(imageUrl, question)`** 单张识别：

1. 路径白名单校验（防 `../` 目录穿越）
2. 扩展名 → MIME 映射（jpg/png/webp/gif）
3. `readFile` → base64 → data URL
4. 调 `visionChatCompletion()`（doubao-seed-2-0-mini）

**视觉 prompt**：

```
System: 你是图片描述助手。客观描述图片内容：画面里有什么（人物/物体/场景/动作）、
        可见文字、整体风格与氛围。用中文，150字以内，不要猜测图片之外的信息，不要编造。
User:   [image_url: base64] + text: "用户对这张图片的提问是「{question}」，请结合提问重点描述图片。"
```

**`runVisionAgent(imageUrls, question, emit)`** 多张识别：逐张串行（非并行），单张失败不影响其他。

### 4.9 语义检索 Agent（semanticAgent.js）— 已弃用

> 文件 279 行。**当前 orchestrator 不再调用**此 Agent（被 topicSearchAgent + timeSearchAgent 替代）。

保留在代码库中但 `dispatchAgent` 的 switch 无 `semantic` 分支。内部逻辑：LLM 提取关键词 → FTS5/LIKE 四级降级（类似 topicSearch 但无同义词扩展、无块内抽样）。

### 4.10 统计 Agent（statisticAgent.js）— 已弃用

> 文件 141 行。**当前 orchestrator 不再调用**。

旧版 LLM 生成 SQL 方案（分析→生成 SQL→校验→执行→摘要），被 personStatAgent 的直接 SQL 方案替代（避免 LLM 幻觉）。

---

## 5. LLM 封装层（llm.js）

> 文件：`server/src/utils/llm.js`（209 行）

### 5.1 主模型配置

| 配置项 | 默认值 | 环境变量 | 说明 |
|--------|--------|----------|------|
| BASE_URL | `https://ark.cn-beijing.volces.com/api/coding/v3` | `VOLC_BASE_URL` | 火山引擎 coding plan 端点 |
| API_KEY | （必填） | `VOLC_API_KEY` | |
| MODEL | `glm-5.2` | `VOLC_MODEL` | 纯推理模型（旧值 glm-latest 已被火山指向 glm-5.2） |
| TIMEOUT_MS | **180000**（180s） | — | glm-5.2 思考耗时长 |

### 5.2 视觉模型配置

| 配置项 | 默认值 | 环境变量 | 说明 |
|--------|--------|----------|------|
| STD_BASE_URL | `https://ark.cn-beijing.volces.com/api/v3` | `VOLC_STD_BASE_URL` | 标准按量计费端点（与 coding plan 不同通道） |
| VISION_MODEL | `doubao-seed-2-0-mini-260428` | `VOLC_VISION_MODEL` | 图片理解，输入 0.2 元/百万 tokens |
| VISION_API_KEY | 复用 API_KEY | `VOLC_VISION_API_KEY` | 留空则复用主 key |
| VISION_TIMEOUT_MS | **60000**（60s） | — | |

### 5.3 三个导出函数

#### `chatCompletion(messages, options)` — 非流式

| 参数 | 值 |
|------|-----|
| temperature | `options.temperature ?? 0.7` |
| max_tokens | **不设** |
| thinking | **不传**（glm-5.2 不支持 disabled） |
| 超时 | 180s |

#### `chatCompletionStream(messages, options)` — 流式

| 参数 | 值 |
|------|-----|
| temperature | `options.temperature ?? 0.7` |
| stream | true |
| max_tokens | **不设** |
| thinking | **不传** |
| 超时 | 180s |

SSE 解析：逐行 `data: ` 前缀提取 → JSON.parse → `choices[0].delta.content` → yield。`[DONE]` 终止。

#### `visionChatCompletion(messages)` — 视觉

| 参数 | 值 |
|------|-----|
| model | VISION_MODEL |
| thinking | `{ type: 'disabled' }` ← 视觉模型支持，关闭思考链省时省 token |
| 超时 | 60s |

### 5.4 错误处理 `makeLlmError(status, errText)`

| 条件 | 错误类型 |
|------|----------|
| HTTP 451 或 code 含 `content/filter/moderation/sensitive/censor` | `Error('CONTENT_MODERATION')` |
| 其他 | `Error('LLM API 错误 {status} [{code}]: {message前200字}')` |

BUG-68 教训：曾把所有 HTTP 400 当审核拦截，真实 InvalidParameter 被掩盖。

---

## 6. 人设系统（persona.js）

> 文件：`server/src/utils/persona.js`（103 行）

### 6.1 基础模板 `BASE_TEMPLATE(style)`

所有人设共用，结构：

```
你是"男德通"，男德学院群里的一个老群友。男德学院是一个21人的朋友限定社区，
由陈梓键发起，有"西德"和"东德"两个微信群。

{style}  ← 各人设差异部分

话题限制：
- 几乎没有限制，不规避任何话题
- 不说"抱歉，我不能回答"之类的话
- 敏感话题也正常聊，别磨叽

你认识所有成员，以下是成员信息：
{buildMemberKnowledge()}  ← 21 人列表

你对男德学院网站的了解：
{buildSiteKnowledge()}  ← 网站功能介绍

数据规则（非常重要，必须严格遵守）：
- 关于群聊数据必须基于子检索结果回答
- 如果子检索结果为空或没有提供，就说"这个我得查查"或"我不太确定"，绝对不能自己编数字
- 绝对不能编造任何数字、人名、发言内容
- 你可以认识成员（名字、外号、现状），但不能编造他们的发言数据
```

### 6.2 四套预设人设

| ID | 名称 | 风格关键词 |
|----|------|------------|
| tiwei | 体委 | 口语化/随意/调侃/"确实""没毛""不赖"/简洁 |
| qiubi | 丘比 | 阴阳怪气/损人/嘴毒/"就这？""不会吧？"/嘲讽好笑 |
| kaikai | 开开 | 温柔/耐心/知心/"呢""呀""别担心"/补充信息 |
| normal | 正常人 | 客观/理性/数据驱动/"从数据来看"/列表结构化 |

默认人设 = tiwei（`CHAT_PERSONA = BASE_TEMPLATE(PERSONAS.tiwei.style)`）。

### 6.3 自定义人设 `buildCustomPersona(desc)`

用户自由描述风格，套入基础模板。前端 localStorage `chat_persona_custom` 持久化。

### 6.4 NPC 人设（德塔内）`buildGamePersona(userNickname, rosterText)`

> 在 `chatController.js` 中，不走 persona.js。

读取两个文档拼装：
- `prd/.../04-德塔/02-设计/世界观/德塔世界观.md`（截取前 800 字）
- `prd/.../04-德塔/01-需求/德塔男德通交互需求.md`（截取前 500 字）

核心约束：
- 你是「男德通」不是「美少女」（外形碰巧是美少女但身份是男德通）
- 当前对话者是 `{userNickname}`（系统告知真实身份）
- 每次回复≤50 字、禁止换行、禁止 @ 符号
- 不说"我是 AI"
- 花名册从 `成员信息填写表.md` 解析

---

## 7. 知识库层（knowledge.js）

> 文件：`server/src/utils/knowledge.js`（85 行）

### 7.1 成员列表（21 人）

每人包含：name、role（院长/成员）、aliases（外号）、status（现状）、nicknames（群昵称）。

昵称→真名映射表 `nicknameToName`：遍历所有 nicknames + 真名 → 构建查找表。

`resolveName(nickname)`：查映射表，未找到返回原昵称。

### 7.2 `buildMemberKnowledge()` — 注入 system prompt

格式：`1. 陈梓键（院长）。外号：蛋哥、mico、魔弹、modan。群昵称：我、0.o、MICO`

### 7.3 `buildSiteKnowledge()` — 注入 system prompt

网站六大功能介绍 + 当前版本号。

⚠️ **版本号硬编码为 v3.2.0**（`SITE_VERSION = 'v3.2.0'`），与线上 v3.5.0 不一致。

---

## 8. 黑机搜索 Hub（searchHub.js）

> 文件：`server/src/searchHub.js`（208 行）

### 8.1 架构

黑机 RTX 4070 作为 WS Worker，**主动连接**云端 WS Hub（`/search-hub`）。云端通过 WS 下发重度检索任务，黑机执行后回传结果。

### 8.2 WS 消息协议

| 方向 | type | 说明 |
|------|------|------|
| 黑机→云端 | `auth` | 鉴权 `{type:'auth', token}` |
| 云端→黑机 | `auth_ok`/`auth_fail` | 鉴权结果 |
| 黑机→云端 | `ping` | 心跳 |
| 云端→黑机 | `pong` | 心跳回应 |
| 云端→黑机 | `search_task` | 任务下发 `{type:'search_task', taskId, agentType, task}` |
| 黑机→云端 | `agent_thinking` | 进度回传 `{taskId, agent, phase, content, data}` |
| 黑机→云端 | `search_result` | 最终结果 `{taskId, result}` |
| 黑机→云端 | `search_error` | 错误 `{taskId, error}` |

### 8.3 关键参数

| 参数 | 值 | 说明 |
|------|-----|------|
| BLACK_WORKER_TOKEN | `process.env.BLACK_WORKER_TOKEN` 或 `dev-token-change-in-production` | 鉴权 token |
| HEARTBEAT_TIMEOUT | 60s | 60 秒无 ping 判定离线 |
| 心跳检查间隔 | 20s | 每 20 秒检查一次 |
| TASK_TIMEOUT | 15s | 单任务超时 |

### 8.4 降级机制

黑机离线时，重度任务（person_messages/mentioned）自动降级为本地执行（数据量受限），并向前端发 `phase:'warning'` 提示。

---

## 9. 数据管线（导入→分块→索引）

### 9.1 数据导入 `scripts/importChat.js`

```
node scripts/importChat.js <csv路径> [--clear]
```

- CSV 字段：talker, nickname, msg_time, message, type
- BATCH_SIZE = 5000
- `--clear` 清空旧数据
- 数据来源：微信导出，`export_chat.py` 过滤仅西德+东德两个群

### 9.2 分块 `scripts/buildChunks.js`

| 参数 | 值 | 说明 |
|------|-----|------|
| CHUNK_SIZE | 100 | 每块 100 条消息 |
| CONCURRENCY | 5 | 5 并发 |
| MAX_RETRIES | 3 | 失败重试 3 次 |

分块 LLM prompt：分析 100 条消息 → 输出话题/人物/关键词/情绪/摘要五字段。

断点续传：`SELECT MAX(endMsgId) FROM message_chunks` 跳过已处理。

### 9.3 FTS5 索引 `scripts/rebuildFts.js`

```sql
DROP TABLE IF EXISTS message_chunks_fts;
CREATE VIRTUAL TABLE message_chunks_fts USING fts5(keywords, summary, tokenize='trigram');
INSERT INTO message_chunks_fts(rowid, keywords, summary)
  SELECT id, keywords, COALESCE(summary, "") FROM message_chunks;
```

**双列 trigram**：keywords + summary 都被索引（Phase1 改造前只有 keywords）。

### 9.4 当前数据规模（线上 prod.db）

| 指标 | 值 |
|------|-----|
| 消息总数 | 538,915 条 |
| 时间跨度 | 2022-07-11 ~ 2026-08-10 |
| 话题分块 | 5,372 个 |
| FTS5 索引 | 5,372 条 |
| 参与人数 | ~21 人 |
| 发言 Top1 | 陈梓键 114,723 条 |

---

## 10. 前端交互层（ChatView.vue）

> 文件：`src/views/ChatView.vue`

### 10.1 人设选择器

- 5 选项：体委/丘比/开开/正常人/自定义
- localStorage `chat_persona` 持久化选中 id
- 自定义描述 localStorage `chat_persona_custom` 持久化
- 发送时传 `personaId` + `customDesc`（仅 custom 时）

### 10.2 图片上传（多模态一期）

| 参数 | 值 |
|------|-----|
| MAX_IMAGES | 3 |
| 单张大小限制 | 4MB |
| 支持格式 | jpg/png/webp/gif |
| 上传端点 | `POST /api/chat/upload` |
| 预览 | `URL.createObjectURL()` 本地预览 |
| 上传状态 | `uploadingImages` ref |
| 移除 | `URL.revokeObjectURL()` 释放内存 |

### 10.3 SSE 事件处理

前端读取 SSE 流（`reader.read()` 逐 chunk），按 `event: ` 前缀分发：

| 事件 | 处理 |
|------|------|
| `agent_thinking` | 推入 bot 消息的 `thinking` 数组，展示思考过程面板 |
| `token` | 追加到 bot 消息 content（实时流式渲染） |
| `sources` | 设置 bot 消息 `sources`，展示引用来源折叠面板 |
| `feedback_created` | 设置 bot 消息 `feedback`，展示确认卡片 |
| `done` | 标记完成，保存 sessionId |
| `error` | 标记 bot 消息 error，展示错误文案 |

### 10.4 停止生成

`AbortController` 中断 fetch → 后端 `req.on('close')` 检测 → `send()` 抛 `CLIENT_ABORTED` 静默中断。前端保留已生成部分回答。

### 10.5 Markdown 渲染

bot 回复 `v-html="renderMarkdown(msg.content)"`，`renderMarkdown` = markdown-it + DOMPurify 安全渲染。

### 10.6 Agent 图标与标签

| agent 值 | 图标 | 标签 |
|----------|------|------|
| main | 🧠 | 男德通（主 Agent） |
| person_stat | 📊 | 人物统计 Agent |
| person_messages | 💬 | 人物发言 Agent |
| mentioned | 🔍 | 被提及 Agent |
| topic_search | 🔎 | 话题检索 Agent |
| 视觉识别 | 👁️ | 视觉识别 Agent |

### 10.7 阶段标签

| phase | 标签 |
|-------|------|
| planning | 规划 |
| analyzing | 分析 |
| searching | 检索 |
| reasoning | 推理 |
| analysis | 综合分析 |
| done | 完成 |
| warning | ⚠️ 提示 |

### 10.8 引用来源展示

`msg.sources` 有值时展示 `<details>` 折叠面板「📎 引用来源 (N)」，每条显示 nickname + msgTime + content。

### 10.9 反馈确认卡片

`msg.feedback` 有值时展示卡片：类型/标题/操作/描述 + "确认投递"按钮 → 调 `createFeedback()` API 入库。失败显示"提交失败，请稍后重试"。

---

## 11. API 契约与 SSE 协议

### 11.1 API 端点

| 方法 | 路径 | 鉴权 | 限流 | 说明 |
|------|------|:----:|:----:|------|
| POST | `/api/chat/ask` | 已登录 | 10/min | 提问（SSE 流式） |
| POST | `/api/chat/upload` | 已登录 | 10/min | 上传聊天图片 |
| POST | `/api/chat/npc/talk` | 已登录 | 10/min | NPC 对话（SSE 流式） |
| GET | `/api/chat/sessions` | 已登录 | — | 会话列表 |
| GET | `/api/chat/sessions/:id` | 已登录 | — | 会话详情 |
| DELETE | `/api/chat/sessions/:id` | 已登录 | — | 删除会话 |
| GET | `/api/chat/db-info` | 已登录 | — | 数据库统计看板 |

### 11.2 POST /api/chat/ask 请求体

```json
{
  "question": "如何评价丘序明",
  "sessionId": 123,
  "personaId": "tiwei",
  "customDesc": "说话像个海盗",
  "images": ["/uploads/chat/chat_xxx.png"]
}
```

### 11.3 SSE 事件序列

```
event: agent_thinking     ← 规划/检索/分析各阶段进度
data: {"agent":"main","phase":"planning","content":"正在分析...","data":null}

event: agent_thinking     ← 子 Agent 进度
data: {"agent":"topic_search","phase":"searching","content":"关键词：..."}

event: agent_thinking     ← 黑机离线警告（可选）
data: {"agent":"main","phase":"warning","content":"⚠️ 当前高性能计算节点..."}

event: token              ← 流式回答（逐 chunk）
data: {"content":"丘"}

event: feedback_created   ← 反馈草稿（可选）
data: {"type":"bug","title":"...","action":"...","content":"..."}

event: sources            ← 引用来源（可选）
data: [{"nickname":"丘序明","msgTime":"...","content":"..."}]

event: done               ← 完成
data: {"sessionId":123,"intent":"multi"}
```

### 11.4 限流中间件 `rateLimit(maxPerMinute=10)`

- 内存限流：`Map<userId, timestamps[]>`
- 窗口 60 秒，超限返回 `{code:4290, message:'提问过于频繁，请稍后再试'}` HTTP 429

### 11.5 图片上传 `POST /api/chat/upload`

- multer 磁盘存储 `uploads/chat/`
- 文件名：`chat_{timestamp}_{random6}.{ext}`
- 4MB/张，jpg/png/webp/gif
- 返回 `{url: '/uploads/chat/chat_xxx.png'}`
- chatController 入口二次校验：`/^\/uploads\/chat\/[\w.-]+$/` 正则 + slice(0,3)

---

## 12. 数据库表结构

### 12.1 GroupMessage（群聊消息）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int PK | 自增 |
| batchId | Int FK | 导入批次 |
| talker | String | 发言者 wxid |
| nickname | String? | 发言者昵称 |
| content | String | 消息正文 |
| msgTime | DateTime | 原始时间 |
| type | String | 默认 text |
| createdAt | DateTime | 入库时间 |

索引：`(talker, msgTime)`、`talker`、`msgTime`

### 12.2 MessageChunk（话题分块）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int PK | 自增 |
| startMsgId | Int | 起始消息 ID |
| endMsgId | Int | 结束消息 ID |
| chunkDate | String? | YYYY-MM-DD |
| keywords | String | LLM 生成关键词 |
| summary | String? | 一句话摘要 |
| participants | String? | 参与者 |
| msgCount | Int | 消息数 |
| createdAt | DateTime | |

索引：`chunkDate`

### 12.3 FTS5 虚拟表（非 Prisma 管理）

```sql
message_chunks_fts USING fts5(keywords, summary, tokenize='trigram')
group_messages_fts USING fts5(content, tokenize='trigram')
```

⚠️ FTS5 虚拟表不在 Prisma schema 中，`prisma db push --accept-data-loss` 会触发连锁删表（BUG-61 教训）。

### 12.4 ChatSession / ChatTurn

| 表 | 关键字段 |
|----|----------|
| ChatSession | id, userId, title, createdAt, updatedAt |
| ChatTurn | id, sessionId, role(user/assistant), content, **images**(JSON), intent, sources(JSON), createdAt |

### 12.5 Feedback

| 字段 | 类型 | 说明 |
|------|------|------|
| type | String | optimization/new_feature/story/bug |
| title | String | 反馈标题 |
| action | String | 用户操作步骤 |
| content | String | 详细描述 |
| status | String | open/in_progress/resolved |
| priority | String | low/medium/high |
| source | String | manual/ai |

---

## 13. 环境变量清单

| 变量名 | 用途 | 默认值 |
|--------|------|--------|
| `VOLC_API_KEY` | 火山引擎 API Key（必填） | — |
| `VOLC_BASE_URL` | 主模型端点 | `https://ark.cn-beijing.volces.com/api/coding/v3` |
| `VOLC_MODEL` | 主模型 ID | `glm-5.2` |
| `VOLC_STD_BASE_URL` | 视觉模型端点 | `https://ark.cn-beijing.volces.com/api/v3` |
| `VOLC_VISION_MODEL` | 视觉模型 ID | `doubao-seed-2-0-mini-260428` |
| `VOLC_VISION_API_KEY` | 视觉模型独立 Key（留空复用主 key） | — |
| `VOLC_EMBED_MODEL` | Embedding 模型（待启用） | — |
| `CHAT_RATE_LIMIT` | 每分钟提问上限 | 10 |
| `BLACK_WORKER_TOKEN` | 黑机 WS 鉴权 token | `dev-token-change-in-production` |
| `DATABASE_URL` | SQLite 路径 | `file:./dev.db`（线上 `file:./prod.db`） |
| `PORT` | 后端端口 | 3000 |

---

## 14. 当前痛点与优化机会盘点

> 以下每条均来自源码审计，标注了具体文件和行号，可直接作为优化任务拆解依据。

### 14.1 检索质量

| # | 痛点 | 现状 | 影响 | 源码位置 |
|---|------|------|------|----------|
| 1 | **FTS5 trigram 对中文不友好** | trigram 按 3 字符滑窗切分，中文 2 字关键词无法命中（`ftsWords = rawWords.filter(k => k.length >= 3)`） | "考研"等 2 字词不走 FTS5 只走 LIKE，大表 LIKE 全表扫描慢 | topicSearchAgent.js:100 |
| 2 | **同义词扩展每次实时调 LLM** | 每次话题检索都调一次 `chatCompletion(temp=0)` 扩展同义词 | 增加延迟（3-5s）+ token 消耗，相同关键词重复扩展 | topicSearchAgent.js:25-51 |
| 3 | **无向量语义检索** | PRD 规划了 RAG 向量检索（sqlite-vec + embedding），但从未启用 | 语义相近但字面不同的消息无法召回（"打球"搜不到"运动""篮球"） | knowledge.js 无 embedding 相关 |
| 4 | **规划 LLM 偶尔解析失败** | `parseTasks` 靠正则提取 JSON，glm-5.2 推理模型有时输出带多余文本 | 规划失败 → fallback topic_search（可能不是最优路由） | orchestrator.js:334-354 |
| 5 | **BUG-67 遗留** | timeSearchAgent FTS5 Error 偶现，error message 为空 | 时间检索偶发静默失败 | handoff.md 记录 |

### 14.2 响应速度

| # | 痛点 | 现状 | 影响 | 源码位置 |
|---|------|------|------|----------|
| 6 | **glm-5.2 推理模型延迟高** | 纯推理模型首 token 延迟约 5s，思考耗时长 | 用户等待感强，简单问题也要 8-13s | llm.js:9 注释记录 |
| 7 | **三阶段串行 LLM 调用** | 规划(1次) + 检索(同义词1次) + 分析回答(1次流式) = 至少 3 次 LLM 调用 | 非闲聊问题总延迟 10-20s | orchestrator.js 全流程 |
| 8 | **黑机任务超时仅 15s** | `TASK_TIMEOUT = 15000`，黑机全量检索 person_messages（10万条）可能超时 | 重度任务超时降级为本地受限检索 | searchHub.js:19 |
| 9 | **分析 prompt 可能超大** | formattedText 截断阈值 20000 字符，5 块 × 10 条 + 世界书 3 万字 = 可能超 5 万字符 | LLM 处理超长 prompt 更慢 + token 费用高 | orchestrator.js:129 |

### 14.3 成本

| # | 痛点 | 现状 | 影响 | 源码位置 |
|---|------|------|------|----------|
| 10 | **glm-5.2 推理模型 token 消耗高** | 思考链消耗大量 token，不设 max_tokens（设了会截断正文） | 火山引擎账单上升 | llm.js:58 注释 |
| 11 | **system prompt 重复发送** | 每次 LLM 调用都带完整 system prompt（人设+21人知识库+网站信息 ≈ 3000 字） | 三阶段 3 次调用 = 3 倍 system prompt token | orchestrator.js 各 build*Prompt |
| 12 | **世界书全量注入** | worldbookAgent 读取 3 万字设定集全文注入分析 prompt | 一次性 +3 万字符 token | worldbookAgent.js:28 |

### 14.4 准确性

| # | 痛点 | 现状 | 影响 | 源码位置 |
|---|------|------|------|----------|
| 13 | **人名匹配靠 LIKE 模糊** | `nickname LIKE '%丘序明%'` 会误匹配含该名的其他上下文 | 统计可能偏高（别人提到"丘序明"的消息也被计入） | personStatAgent.js:38 |
| 14 | **分析阶段只传 30 条消息** | 无 formattedText 时 `messages.slice(0, 30)` | personMessages 取 50 条但只传 30 条给 LLM，后 20 条被丢弃 | orchestrator.js:136 |
| 15 | **知识库版本号过时** | `SITE_VERSION = 'v3.2.0'`，线上已 v3.5.0 | AI 回答版本信息时给出错误版本号 | knowledge.js:73 |
| 16 | **规划阶段无人名消歧** | 规划 LLM 直接用用户输入的人名派任务，不校验是否是真实成员 | 输入不存在的人名 → Agent 查无结果但浪费 LLM 调用 | orchestrator.js:69 规划 prompt |

### 14.5 架构/可维护性

| # | 痛点 | 现状 | 影响 | 源码位置 |
|---|------|------|------|----------|
| 17 | **两个已弃用 Agent 残留** | semanticAgent.js(279行) + statisticAgent.js(141行) 不再被调用 | 420 行死代码，新人困惑 | orchestrator.js dispatchAgent 无 semantic/statistic 分支 |
| 18 | **旧 PRD 严重过时** | `AI助手.md` 描述的是三分类架构（statistic/semantic/chat），与当前多 Agent 架构完全不符 | 文档误导 | prd/03-男德通/AI助手.md |
| 19 | **温度参数分散硬编码** | 规划 0 / 分析 0.5 / 闲聊 0.7 / 反馈生成 0 / NPC 0.8，散落在各处 | 调参需翻多个文件 | orchestrator.js 多处 + chatController.js:343 |
| 20 | **dev.db/prod.db 混淆** | 3 次事故（BUG-61/65/70）因操作错库 | 数据丢失/缺列/建错表 | handoff.md 记录 |

### 14.6 功能缺口

| # | 缺口 | 说明 | 优先级建议 |
|---|------|------|------------|
| 21 | **无对话记忆压缩** | 历史只取最近 19 轮原文，长对话超出后早期上下文丢失 | P2 |
| 22 | **无多轮追问能力** | 每次 askChat 独立规划，不感知上一轮派了哪些 Agent | P2 |
| 23 | **无出图能力** | v3.5.0 仅图片理解（输入），无图片生成（输出） | P2（Seedream 后续一期） |
| 24 | **无视频/音频输入** | mini 支持但体积/成本/请求体风险大，暂缓 | P3 |
| 25 | **无 uploads/chat 清理** | 孤儿图片（删除会话后图片残留）无清理机制 | P3 |
| 26 | **FTS5 索引不支持增量更新** | 新消息导入后需手动跑 `rebuildFts.js` 全量重建 | P2 |

---

> **本文档基于 v3.5.0 线上代码逐行审计，所有参数/阈值/prompt 均来自源码原文。**
> 若代码变更后文档过时，以源码为准。
