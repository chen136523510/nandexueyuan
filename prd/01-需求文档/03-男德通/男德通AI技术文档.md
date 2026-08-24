# 男德通 AI 技术文档

> 版本：v1.0 | 基于线上 v3.6.0 源码 + 需求池规划项 | 日期：2026-08-24
> 代码位置：`server/src/agents/`（9 个子 Agent + orchestrator）、`server/src/utils/`（llm/persona/knowledge/tokenizer）、`server/src/controllers/chatController.js`、`server/src/searchHub.js`
> 前端：`src/views/ChatView.vue`

---

## 1. 产品定位

男德通是男德学院社区网站（21 人朋友圈限定社区）的 AI 助手，用自然语言查询 53.8 万条微信群聊记录、闲聊、查设定、提反馈。有两个独立形态：

| 维度 | 站外男德通 `/chat` | 德塔 NPC `/api/chat/npc/talk` |
|------|-------------------|------------------------------|
| 架构 | 多 Agent 三阶段（规划→检索→分析回答） | 纯流式对话（无检索） |
| 人设 | `persona.js`（4 预设 + 自定义） | `chatController.buildGamePersona()`（读世界观文档动态构建） |
| 知识 | 群聊数据 + 设定集 + 网站信息 | 德塔世界观 + 花名册 + 交互需求 |
| 对话长度 | 无硬限制 | ≤50 字、禁换行、禁 @ |
| 历史轮次 | 最近 19 轮 | 最近 19 轮 |
| 限流 | 10 次/分钟 | 10 次/分钟 |

---

## 2. 系统架构

```
用户提问 (POST /api/chat/ask, SSE)
  │
  ▼
chatController.askChat()
  ├─ 图片校验（/uploads/chat/ 前缀，最多 3 张）
  ├─ 创建/复用 ChatSession，存 user turn
  ├─ 读取历史（最近 20 轮 desc → reverse → 截尾 19）
  │    └─ 有 summary 时走 buildHistoryWithSummary() 替换早期轮次
  │
  └─ orchestrate(question, history, send, personaId, customDesc, images, lastIntent)
       │
       ├─ ① 视觉识别（带图必跑，无图跳过）
       │    └─ visionAgent → visionChatCompletion（doubao-seed-2-0-mini）
       │       识别结果拼进 effectiveQuestion，回写 user turn
       │
       ├─ ② 快速短路判断（无图时）
       │    ├─ isCasualChat() → 直接闲聊 runDirectChat()
       │    ├─ matchQuickPattern() → 正则模板直接派 Agent（跳过规划 LLM）
       │    └─ matchFeedbackIntent() → runFeedbackFlow()
       │
       ├─ ③ 阶段 1：规划（LLM，deepseek-v4-flash temp=0 thinking:disabled）
       │    └─ buildPlannerPrompt() → chatCompletion() → parseTasks()
       │       输出 JSON 任务数组 → 规划缓存（10min TTL / 200 条 LRU）
       │
       ├─ ④ 阶段 2：并行检索
       │    └─ tasks.map(dispatchAgent) → Promise.all
       │       ├─ 全量任务 → runFullAnalysisAgent（本地 map-reduce）
       │       ├─ 重度任务 + 黑机在线 → sendSearchTask()（WS 外包黑机）
       │       └─ 轻量/降级 → 本地执行对应 Agent
       │
       └─ ⑤ 阶段 3：分析 + 回答（LLM 流式 temp=0.5）
            └─ buildAnalysisPrompt() → chatCompletionStream()
               数据口径约束 → 逐 chunk send('token') 推前端
               │
               └─ 回答后异步 compressIfNeeded()（超 20 turns 压缩早期轮次）
```

### 路由四级短路（无图时，按优先级）

1. **闲聊短路**：`isCasualChat(question, history)` --≤10 字 + 匹配 ABSOLUTE_CASUAL 词表（问候/致谢/身份类零信息量）直接闲聊；REACTION_CASUAL（哈哈哈/笑死等）有上下文时不短路（可能是高密度回应）
2. **快速路由**：`matchQuickPattern(question)` --正则匹配高频模板（"XX 发了多少条"→person_stat、"群里最近聊了什么"→topic_search、"多少条消息"→db_info），跳过规划 LLM
3. **反馈检测**：`matchFeedbackIntent(question)` --用户说"xx 有 bug""xx 太慢"时走反馈流程，LLM 判断是否真反馈，确认后 `feedback_created` SSE 事件推前端确认
4. **LLM 规划**：deepseek-v4-flash temp=0 thinking:disabled，输出 JSON 任务数组，带 `full:true` 标记走全量管线

---

## 3. 子 Agent 一览

共 9 个子 Agent + 1 个视觉 Agent。已弃用 2 个（semanticAgent / statisticAgent），保留代码作工程参考。

| # | Agent | 入口函数 | 数据源 | LLM 调用 | 职责 |
|---|-------|---------|--------|----------|------|
| 1 | person_stat | `runPersonStatAgent` | `group_messages` SQL | 无（纯 SQL） | 人物统计：发言总数/月度分布/平均长度 |
| 2 | person_messages | `runPersonMessagesAgent` | `group_messages` + `fetchWithContext` | 无 | 人物发言检索，nickname 精确匹配，带上下文 |
| 3 | mentioned | `runMentionedAgent` | `group_messages` LIKE | 无 | 被提及检索（别人提到某人），LIKE 是职责要求 |
| 4 | topic_search | `runTopicSearchAgent` | `message_chunks` + FTS5 v2 | 同义词扩展 1 次 LLM | 话题检索，FTS5 四级降级 + 块内抽样 |
| 5 | time_search | `runTimeSearchAgent` | `message_chunks` 按日期 | 话题块摘要 1 次 LLM | 时间范围检索，按日/月聚合 |
| 6 | worldbook | `runWorldbookAgent` | 设定集文件（3 万字） | 无 | 德塔世界观设定，按需注入全文 |
| 7 | db_info | `runDbInfoAgent` / `queryDbStats` | `group_messages` + `message_chunks` SQL | 无（纯 SQL） | 数据库元信息：总数/跨度/排行/版本 |
| 8 | vision | `runVisionAgent` | 图片 base64 | doubao-seed-2-0-mini | 图片理解，150 字中文描述 |
| 9 | full_analysis | `runFullAnalysisAgent` | `group_messages` 全量 | map-reduce 多次 LLM | 全量数据分析，分批摘要 + 分层合并 |
| - | ~~semantic~~ | - | - | - | 已弃用（被 topic+time 替代） |
| - | ~~statistic~~ | - | - | - | 已弃用（被直查 SQL 替代，避免幻觉） |

### 子 Agent 关键参数

| Agent | 参数 | 值 | 说明 |
|-------|------|-----|------|
| topic_search | 同义词缓存 | LRU 1h / 200 条 | LLM 失败时用原始关键词 |
| topic_search | 结果缓存 | LRU 10min / 50 条 | 同关键词零查询零 LLM |
| topic_search | 分块 LIMIT | 5 | 最多 5 个话题块 |
| topic_search | 消息 LIMIT | 50 | 每块抽样上限 |
| topic_search | 抽样预算 | `MSG_BUDGET_PER_CHUNK=10` | 每块 10 条（关键词命中优先 + 头尾定边界） |
| topic_search | 单条截断 | 200 字符 | content 超 200 截断 |
| topic_search | FTS5 降级链 | v2 MATCH → 分块 LIKE → 消息级 FTS5 → 消息 LIKE | 四级 |
| time_search | 每月块上限 | 8 | 防 18 万字符 prompt 爆炸（BUG-67） |
| time_search | 每天抽样 | 3 条 | 总 30 条上限 |
| time_search | 聚合 | ≤31 天按日 / >31 天按月 | - |
| person_messages | 本地模式 | limit=50 / msgSlice=30 / ctxSlice=200 | - |
| person_messages | 黑机全量 | limit=null / msgSlice=200 | 无 LIMIT 全量，fullAnalysis 负责 |
| person_stat | 匹配 | `nickname = 'xxx'` 精确匹配 | 只查本人发言（不像 mentioned 用 LIKE） |
| context_search | 上下文窗口 | 前后各 5 条 | - |
| context_search | maxTargets | 50（默认）/ 可放宽 | 黑机全量模式放宽 |
| context_search | maxIds | 300（默认）/ 可放宽 | 上下文 ID 总上限 |
| full_analysis | 批字符预算 | `BATCH_CHAR_BUDGET=24000` | ≈3.6 万 token/批 |
| full_analysis | 批上限 | `MAX_BATCHES=40` | 超出等距抽样（保首尾） |
| full_analysis | map 并发 | `MAP_CONCURRENCY=4` | - |
| full_analysis | reduce 分组 | `REDUCE_GROUP_SIZE=12` | 分层合并 |
| full_analysis | 底稿上限 | `DRAFT_CHAR_LIMIT=15000` | 给 orchestrator 2 万总闸留余量 |
| full_analysis | 话题块上限 | `TOPIC_CHUNK_LIMIT=30` | 超出丢弃 |
| memory_compress | 压缩阈值 | `COMPRESS_THRESHOLD=20` turns | =10 轮对话 |
| memory_compress | 保留近期 | `KEEP_RECENT_TURNS=10` | 最近 10 turns 不动 |

---

## 4. LLM 封装层（llm.js）

统一入口，所有文本模型调用走这里，无旁路直调。

### 模型配置

| 参数 | 值 | 说明 |
|------|-----|------|
| `MODEL` | `deepseek-v4-flash-ga-260731` | 火山引擎方舟 GA 版（2026-08-24 从 glm-5.3 切换，算力紧张降级） |
| `BASE_URL` | `https://ark.cn-beijing.volces.com/api/coding/v3` | coding plan 端点 |
| `TIMEOUT_MS` | 60000 (60s) | glm 时代 180s，deepseek 实测 1-5s |
| 视觉模型 | `doubao-seed-2-0-mini-260428` | 标准按量端点，60s，thinking:disabled |

### 导出函数

| 函数 | 用途 | thinking 参数 |
|------|------|--------------|
| `chatCompletion(messages, options)` | 非流式对话 | `options.thinking='disabled'` 跳过思考链 |
| `chatCompletionStream(messages, options)` | 流式对话（SSE） | 同上 |
| `visionChatCompletion(messages)` | 图片理解 | 固定 thinking:disabled |
| `TEMPS` | 温度常量 | PLANNING=0 / ANALYSIS=0.5 / CHAT=0.7 / FEEDBACK=0 / NPC=0.8 |

### 模型特性（deepseek-v4-flash vs glm-5.3）

| 维度 | deepseek-v4-flash | glm-5.3（旧） |
|------|-------------------|-------------|
| `thinking:disabled` | 接受（200，reasoning_tokens=0） | 400 拒绝 |
| `max_tokens` | 可传，不吞正文 | 思考链吃满输出预算导致正文截断/为空 |
| 推理类型 | 混合推理（默认轻量思考链） | 纯推理（思考链重） |
| 响应速度 | 1-5s | 10s+ |
| 流式格式 | delta.content / delta.reasoning_content 分开 | 同 |

适配策略：planner / feedback 两个确定性 JSON 输出场景传 `thinking:'disabled'`（省算力 + 提速 + 避免思考内容干扰 JSON 解析）；闲聊/分析/流式保留默认混合推理能力。

### 错误处理

- `makeLlmError(status, errText)`：HTTP 451 或 code 含 content/filter/moderation/sensitive/censor → `CONTENT_MODERATION`（上层有专门话术）；其他 → 带错误码描述
- `AbortError` → `LLM API 超时`

---

## 5. 人设系统（persona.js）

**设计原则**：BASE_TEMPLATE（中性基础模板）定义身份+知识+数据规则，**不含语气**；语气由各 PERSONAS 的 style 块独立定义。

| ID | 名称 | 风格 |
|----|------|------|
| **normal** | 正常人（默认） | 客观/理性/数据驱动/结构化列表 |
| tiwei | 体委 | 口语化/确实/没毛/不赖 |
| qiubi | 丘比 | 阴阳怪气/反问句/嘴毒不恶意 |
| kaikai | 开开 | 温柔/耐心/呢呀语气词 |
| custom | 自定义 | 用户描述 → `buildCustomPersona(desc)` |

**BASE_TEMPLATE 结构**：身份声明 → 【说话风格】style → 【话题边界】（不规避话题/不说"我不能回答"）→ 【成员信息】`buildMemberKnowledge()` → 【网站信息】`buildSiteKnowledge()` → 【数据规则】（必须基于检索结果/不编数字/"这个我得查查"兜底）。

---

## 6. 知识库层（knowledge.js）

### 三部分知识

1. **members（21 人）**：每人 `{ name, role, aliases(外号), status(现状), nicknames(群昵称) }`。如丘序明有 4 外号 + 4 群昵称；陈梓键昵称含 '我'（微信导出本人标识，11 万条消息）
2. **frequentPersons（圈外常谈人物）**：开开/周姐（高中同班同学，非群成员），用于人名消歧
3. **网站功能**：六大功能 + 版本号（动态读 `package.json`）

### 关键函数

| 函数 | 用途 |
|------|------|
| `resolveName(nickname)` | 昵称→真名映射，未找到返回原昵称 |
| `buildMemberKnowledge()` | 输出编号列表 + 圈外人物清单 |
| `buildSiteKnowledge()` | 网站功能 + 动态版本号 |

---

## 7. FTS5 检索（tokenizer.js + topicSearchAgent.js）

### 方案 A：unicode61 + 预分词

旧 trigram 3 字符滑窗对 2 字中文词（考研/打球）无法命中。方案 A 用 `tokenize='unicode61'`（按空格切分）+ 预分词写入：

| 文本类型 | 分词规则 | 示例 |
|---------|---------|------|
| 汉字 ≤4 字 | 整词入索引 | "考研" → "考研" |
| 汉字 >4 字 | bigram 滑窗 | "广州游玩" → "广州 州游 游玩" |
| 英文/数字 | 原样小写 | unicode61 原生支持 |

| 函数 | 用途 |
|------|------|
| `tokenizeZh(text)` | 索引侧：token 空格 join 写入 FTS5 列 |
| `buildFtsQuery(rawWords)` | 查询侧：多词 token 全部 OR 连接（宽松召回） |

索引重建脚本 `scripts/rebuildFtsV2.js`：纯本地 CPU 操作，batch 500，不调 LLM。

### FTS5 四级降级链（topicSearchAgent）

```
Level 1: 分块 FTS5 v2 (unicode61 + 预分词，搜 keywords + summary 两列)
  ↓ 失败（缺 v2 表等）
Level 2: 分块 LIKE (keywords LIKE '%词%' OR summary LIKE '%词%')
  ↓ 召回不足
Level 3: 消息级 FTS5 (content MATCH，走原始消息表)
  ↓ 失败
Level 4: 消息级 LIKE (content LIKE '%词%')
```

### 数据口径约束（2026-08-24 新增）

`buildAnalysisPrompt` 注入数据口径约束块，防止 AI 用抽样数据冒充精确统计：

- **人物统计**（SQL 精确 COUNT）：总条数、月度条数、平均长度 → 可引用为确切数据
- **话题检索/消息记录**（块内抽样样本）→ 只能定性描述（趋势/代表内容/情绪），**禁止数样本得出人数/块数等精确统计**
- 需要精确统计时引导用户走全量分析或人物统计

---

## 8. 黑机 WS 外包检索（searchHub.js）

### 架构

```
云端服务器（Express :3000/search-hub）  ←──WS──  黑机（RTX 4070）
    │                                              │
    └─ orchestrator.dispatchAgent()                  └─ searchWorker.js（PM2 常开）
       重度任务 (person_messages/mentioned)            全量检索，不受 60s 限制
```

黑机作为 WS Worker **主动连接**云端 Hub，云端下发重度检索任务，黑机执行后回传。

### 关键参数

| 参数 | 值 | 说明 |
|------|-----|------|
| `HEARTBEAT_TIMEOUT` | 60s | 无 ping 判离线 |
| `TASK_TIMEOUT` | 60s | 院长裁决从 15s 提升 |
| 心跳检查间隔 | 20s | - |
| `BLACK_WORKER_TOKEN` | env 或默认值 | WS 鉴权 |

### WS 消息协议

| 方向 | type | 载荷 |
|------|------|------|
| 黑机→云 | auth | `{token}` |
| 黑机→云 / 云→黑机 | ping / pong | 心跳 |
| 云→黑机 | search_task | `{taskId, agentType, task}` |
| 黑机→云 | agent_thinking | `{taskId, agent, phase, content, data}` → 转发 SSE |
| 黑机→云 | search_result / search_error | `{taskId, result/error}` |

### 降级链路

黑机离线/超时/断开 → dispatchAgent 本地受限执行（msgSlice 30/200） → 前端收 `phase:'warning'` 提示"高性能计算节点离线"。

---

## 9. 全量分析管线（fullAnalysisAgent.js）

### 触发方式

用户说"全量/完整分析/逐条/全部消息/每一条" → planner 标 `full:true` → `matchQuickPattern` 正则兜底 → `dispatchAgent` 检测 full 走本地 fullAnalysisAgent（不走黑机避开 60s 超时）。

### map-reduce 架构

```
范围圈定（复用各 agent 条件）
  ↓
一次性取全量 id + LENGTH(content)（0.2s/9.4 万行）
  ↓
内存按 24,000 字符/批切分
  ↓
上限 40 批（超出跨全时段等距抽样，保首尾，coverage 明示）
  ↓
map 并发 4 批 → 每批 LLM 查询感知摘要（保留人物/事件/次数/金句，单批重试 3 次）
  ↓
分层 reduce（每 12 份合一循环至 1 份）
  ↓
底稿 ≤15,000 字符 → 注入 orchestrator 分析流
```

### 成本

| 场景 | 批数 | LLM 调用 | 输入 token | 耗时 |
|------|------|----------|------------|------|
| 考研话题 | 5 批 | 5 map + 1 reduce | ~18 万 | 86s |
| 某人全部发言（9 万条） | 148→抽样 40 批 | 40 map + 4 reduce | ~140 万 | 10-15 分钟 |

普通提问（topic_search 标准路径）约 3 次 LLM 调用，几秒完成。全量是普通的 10-20 倍成本，因此默认走标准路径。

---

## 10. 记忆压缩（memoryCompress.js）

| 参数 | 值 |
|------|-----|
| `COMPRESS_THRESHOLD` | 20 turns（=10 轮对话） |
| `KEEP_RECENT_TURNS` | 10（最近 10 turns 原文不动） |
| 摘要上限 | 300 字 |
| turnsText 截断 | 8000 字符 |

`compressIfNeeded(sessionId)` 在 assistant turn 入库后异步调用，超阈值取早期全部轮次重新摘要，写 `ChatSession.summary`。前端收到 `history_compressed` SSE 事件显示提示条。

`buildHistoryWithSummary(turns, summary)`：有摘要时头部插一条 `{role:'assistant', content:'【早期对话摘要（系统压缩）】\n'+summary}`，后接最近 turns。

---

## 11. 前端交互层（ChatView.vue）

### SSE 事件协议

| 事件 | data | 说明 |
|------|------|------|
| `agent_thinking` | `{agent, phase, content, data}` | 规划/检索/分析过程进度 |
| `token` | `{content}` | 流式回答逐字 |
| `done` | `{sessionId, intent}` | 回答完成 |
| `error` | `{message}` | 错误 |
| `history_compressed` | - | 记忆压缩通知 |
| `feedback_created` | feedback 对象 | AI 生成反馈草稿，前端确认后提交 |

### 思考面板

展示 agent_thinking 事件流：agent（main/person_stat/topic_search...）+ phase（planning/analyzing/searching/done）+ content。全量分析时显示 📚 图标 + mapping/reducing phase + 「第 x/y 批」进度徽章。

---

## 12. 数据库表结构

### group_messages（53.8 万条消息）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int PK | 自增 |
| batchId | Int FK | 导入批次 |
| talker | String | 微信 ID |
| nickname | String? | 群昵称 |
| content | String | 消息内容 |
| msgTime | DateTime | 消息时间 |
| type | String | 默认 text |

索引：`@@index([talker, msgTime])`、`@@index([talker])`、`@@index([msgTime])`、`idx_group_messages_nickname_msgTime (nickname, msgTime)`（2026-08-23 新增联合索引，61ms→3ms）

### message_chunks（5,372 个分块）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Int PK | - |
| startMsgId | Int | 起始消息 ID |
| endMsgId | Int | 结束消息 ID |
| chunkDate | String? | YYYY-MM-DD |
| keywords | String | LLM 生成关键提示词 |
| summary | String? | LLM 生成简要摘要 |
| participants | String? | 参与者 |
| msgCount | Int | 消息数 |

索引：`@@index([chunkDate])`

### ChatSession + ChatTurn

ChatSession：`id, userId, title, summary(压缩摘要), createdAt, updatedAt`

ChatTurn：`id, sessionId, role(user/assistant), content, images(JSON), intent, sources(JSON), createdAt`

---

## 13. 缓存机制

| 缓存层 | key | TTL | 容量 | 命中效果 |
|--------|-----|-----|------|---------|
| 规划缓存 | `personaId\|归一化question` | 10min | 200 LRU | 跳过 planner LLM，直派任务 |
| 话题检索缓存 | `归一化keywords` | 10min | 50 LRU | 零查询零 LLM，复用完整结果 |
| 同义词缓存 | `原始关键词` | 1h | 200 LRU | 跳过同义词扩展 LLM |
| prompt caching | 火山自动 | - | - | `cached_tokens` 复用（无需代码） |

缓存只缓存成功结果，fallback 任务不缓存。

---

## 14. 数据管线

### 导入流程

```
CSV 文件（微信导出）
  ↓ admin POST /api/admin/chat/import（admin only，multer 上传）
importChat.js --clear
  ↓ 清空 group_messages + batch 记录
  ↓ 逐行解析，batch INSERT
group_messages（53.8 万条）
  ↓
buildChunks.js（LLM 分块）
  ↓ 每 100 条为一块
  ↓ LLM 生成 keywords + summary + participants
message_chunks（5,372 块）
  ↓
rebuildFtsV2.js（FTS5 v2 索引重建）
  ↓ tokenizer.js 预分词
  ↓ tokenize='unicode61'，batch 500
message_chunks_fts_v2（FTS5 虚拟表）
```

### 数据规模

| 维度 | 值 |
|------|-----|
| 消息总数 | 538,915 条 |
| 分块总数 | 5,372 个 |
| 时间跨度 | 2022-07 至今 |
| 发言 Top1 | 陈梓键 114,723 条（昵称含'我'） |
| 数据库 | SQLite，生产 prod.db |

---

## 15. 环境变量

```env
# LLM
VOLC_API_KEY=ark-xxx
VOLC_BASE_URL=https://ark.cn-beijing.volces.com/api/coding/v3
VOLC_MODEL=deepseek-v4-flash-ga-260731
VOLC_STD_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
VOLC_VISION_MODEL=doubao-seed-2-0-mini-260428
VOLC_VISION_API_KEY=<同 VOLC_API_KEY 或独立>

# 数据库
DATABASE_URL=file:./prod.db  # 生产；本地 dev.db

# WS 黑机通道
CLOUD_WS_URL=wss://www.nandexueyuan.top/search-hub  # 黑机连接云端
BLACK_WORKER_TOKEN=<鉴权 token>

# JWT
JWT_SECRET=<生产必须更换>
```

---

## 16. 规划中（需求池）

### R-045 男德通多模态二期·出图（P2，uphill）

用户说"画一个 XX" → 主 Agent 识别出图意图 → 生成提示词呈院长确认 → Seedream API 出图 → 回传图片。**红线：AGENTS 禁止事项第 5 条，每次出图前提示词必须呈院长逐次确认**。需设计"提示词确认卡片"交互（类似反馈确认制）。

### R-046 男德通多模态三期·视频输入（P3，uphill）

视觉模型 mini 支持 video 输入，accept 改 video/* + 50MB 限制 + base64 体积评估。风险：50MB 视频→66MB base64，请求体/成本/延迟均需评估，可能需转 URL 模式或抽帧方案。

### R-047 FTS5 索引增量更新（P2，uphill）

新消息导入后即时可检索，替代全量重建。调研方向：①按 endMsgId 增量分块（buildChunks 已支持断点续传）②FTS5 v2 增量 INSERT ③增量与全量成本对比。需慎重：全量分块总结很消耗资源。

### R-048 向量语义检索（P2，uphill）

doubao-embedding 1024 维，向量化 5,372 分块 keywords+summary → sqlite-vec 虚拟表 → 新增 semanticSearchAgent 余弦相似 Top5 → planner 路由 semantic_search 类型。成本极低（分块版约 0.75 元 + 1 小时）。建议 FTS5 v2 上线后观察 1-2 周再实施。后续让黑机操作。

### R-050 精确短语统计 Agent（P2，uphill）

**院长 2026-08-24 提出**：短语不在分块总结里无法统计频率。推荐方案：新建 `phraseStatAgent` 走消息级 FTS5 content MATCH（优先）/ LIKE COUNT（兜底），返回精确命中次数 + 月度分布 + 发言排行，零 LLM 检索，结果可直接引用。风险：50 万行 LIKE 全表扫描性能需实测，FTS5 消息索引需确认是否已建。

### R-051 前端检索强度选择器（P2，uphill）

**院长 2026-08-24 提出**：轻量/标准/全量三档。方案 A=常驻三档开关（门槛高）；方案 B=AI 暗示后浮现快捷重发 chips（推荐，零门槛场景化，复用 📚 进度徽章基建）；方案 C=发送前 tooltip 文档化（轻量 1-3s / 标准 5-10s / 全量 1-15 分钟 + token 开销对比）。推荐 B+C 组合。

### R-052 答案级缓存与对话知识库（P2，uphill）

**院长 2026-08-24 提出 + 补充关键前提：数据库静态（几个月一更），更新时统一刷缓存**。

该前提大幅简化设计--无需 TTL/数据版本哈希实时校验，改用**代际失效**：`dataGeneration` 单调递增（每次 `--data` 重导入时 +1），缓存 key 全部携带代数，导入后旧代缓存整代作废自然淘汰。

约束：①只缓存封闭式问答 intent（统计/检索/db_info/topic_search），闲聊/追问不缓存；②前端标注"来自缓存"（可展开原始检索数据）。

分阶段：
- **Phase 1**：db_info/person_stat/topic_search 答案缓存 + 代际失效（一次导入全清，简单可靠）
- **Phase 2**：长尾问题沉淀知识库（高频问题自动入候选，院长审核后固化为"官方答案"，AI 优先命中）

与 R-048（向量检索，召回侧）互补不冲突。

---

## 17. 关键踩坑记录

高频坑（完整记录见 `prd/01-需求文档/04-德塔/bug-log.md` 和 `.ai/handoff.md`）：

| Bug | 根因 | 教训 |
|-----|------|------|
| BUG-68 | glm-latest 被火山指向纯推理模型 glm-5.2，完全不回答 | 模型别名指向会变，需锁定具体版本 |
| BUG-67 | 大范围查询 18 万字符 prompt 爆炸致 LLM 时间混乱 | 话题块按月聚合，每月上限 8 块 |
| BUG-62 | FTS5 双列 MATCH `f.keywords MATCH ? OR f.summary MATCH ?` 列级 OR 不支持 | 改表级 `f.message_chunks_fts_v2 MATCH ?` |
| BUG-74 | `limit ?? 30` 在黑机传 null 全量时也取默认值 | `??` 只放行 undefined，null 需显式判断 |
| BUG-75 | catch 引用 try 内 const ftsQuery，ReferenceError 吞掉真实错误 | catch 块引用的变量必须在 try 外声明 |
| BUG-76 | 黑机缓存代码插进 orchestrate 函数体内部，planTasks 从未被调用，主流程引用 planningFailed 时 ReferenceError | 内联代码抽函数后必须确认调用点已更新；deploy.sh 9/9 全过 ≠ 功能可用 |
| BUG-61/65/70 | DATABASE_URL 指向错库（dev.db vs prod.db） | 操作前确认连接的是哪个库 |

---

## 18. 文档索引

| 文档 | 位置 | 定位 |
|------|------|------|
| 男德通 AI 技术文档（本文档） | `prd/01-需求文档/03-男德通/男德通AI技术文档.md` | 现状+规划综合技术文档 |
| AI 助手 PRD v2 | `prd/01-需求文档/03-男德通/AI助手.md` | 产品需求（v1 三分类已废弃） |
| 男德通 AI 产品全览 | `prd/01-需求文档/03-男德通/男德通AI产品全览.md` | 工程实况快照（v3.5.0 逐行审计） |
| 男德通 AI 优化方案设计 | `prd/01-需求文档/03-男德通/男德通AI优化方案设计.md` | 26 项痛点裁决记录 |
| Agents Changelog | `server/src/agents/changelog.md` | Agent 代码变更记录 |
| Bug Log | `prd/01-需求文档/04-德塔/bug-log.md` | Bug 修复记录 |
| 需求池 | `pm/需求池.md` | 全局需求排期 |
| RAG 检索策略调研 | `prd/01-需求文档/00-调研/RAG检索策略与工程化调研.md` | 检索方案对比 |

> **注**：《男德通AI产品全览.md》基于 v3.5.0 审计，部分内容已过时（默认人设写 tiwei 实际已改 normal、TASK_TIMEOUT 写 15s 实际已改 60s、SITE_VERSION 写硬编码实际已改动态）。本文档以 v3.6.0 + deepseek-v4-flash 线上代码为准，如遇冲突以本文档和源码为准。
