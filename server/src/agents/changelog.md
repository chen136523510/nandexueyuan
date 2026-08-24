# Agents Changelog

> 倒序排列，最新在最上方。orchestrator 及子 Agent 变更记录。

---

## 2026-08-24（白机·主模型切换 deepseek-v4-flash：算力紧张降级 + 确定性场景禁思考）

### 背景

院长指示「目前算力紧张」，男德通主模型从 glm-5.3 切换为 deepseek-v4-flash。

### 模型探测（动手前实测，不靠推理）

- 账内可用两版：`deepseek-v4-flash-260425`（预览）/ `deepseek-v4-flash-ga-260731`（GA 正式），选 GA 版
- `thinking: {type:'disabled'}` 被接受（200，reasoning_tokens=0）——与 glm-5.3 不同（disabled 被 400 拒绝）
- `max_tokens` 可传且不吞正文（completion 37 中仅 10 是 reasoning）
- 混合推理模型：默认自带轻量思考链（reasoning_tokens 几十），不像 glm-5.3 思考链吃满输出预算
- 流式 SSE 格式与现有解析兼容（delta.content / delta.reasoning_content 分开，只取 content）
- 速度：1.1~5.1s（glm-5.3 时代 planner 通常 10s+）

### 代码改动

- [修改] `server/src/utils/llm.js` - MODEL 默认 glm-5.3 -> `deepseek-v4-flash-ga-260731`；TIMEOUT_MS 180s -> 60s（实测 1-5s，留足余量）；chatCompletion/chatCompletionStream 新增 `options.thinking: 'disabled'` 透传（仅确定性 JSON 场景用）
- [优化] `orchestrator.js` planner（712）/feedback（521）两处确定性 JSON 调用传 `thinking: 'disabled'`（跳过思考链，省算力提速，实测 planner 1.1-1.6s）；glm-5.2 注释改模型名表述（视觉前置逻辑不变，deepseek 同样纯文本看不到图）
- [标注] `fullAnalysisAgent.js` 两处空返回防御注释更新（glm-5.3 思考链吃预算的历史教训，deepseek 下保留防御）
- [配置] `server/.env` + 根 `.env` 的 VOLC_MODEL 同步改 deepseek-v4-flash-ga-260731（注意：llm.js 读 server/.env，但 .ai/scripts 验证脚本从根 .env 兜底，两处必须一致）

### 验证（真调 LLM）

- planner JSON 解析 3/3：`如何评价丘序明`→3 任务 / `7月份聊了什么`→1 任务 / `你好`→0 任务，1.1-1.6s（verify-deepseek-planner.mjs）
- e2e 3/3：默认推理闲聊 / thinking:disabled 输出 `[]` 可解析 / 流式首 token 3.8s（verify-deepseek-e2e.mjs）
- 冒烟：scripts/testLlm.js 200「测试成功」

### 待部署

本地 .env 已切换，**线上服务器 .env 未动**（需 SSH 后手动改 VOLC_MODEL 或随下次 deploy 一起）。部署后线上实测：问「如何评价丘序明」确认规划正常 + 回答质量可接受（deepseek 与 glm 风格有差异，观察群友反馈）。

---

## 2026-08-23（黑机·检索管线四项工程化优化）

- [新增] `orchestrator.js` planner 结果缓存（P1-3）：归一化 key（去空白+尾部标点语气词+小写）+ personaId，10min TTL / 200 条 LRU；同问法命中时跳过 planner LLM 直派任务，fallback 任务不缓存
- [新增] `personMessagesAgent.js` / `mentionedAgent.js` flatMessages 返回字段：消息+上下文化简后的扁平数组带 id，供 orchestrator 跨 Agent 去重
- [优化] `orchestrator.js` buildAnalysisPrompt 跨 Agent 去重（P0-1）：person/mentioned 的 flatMessages 按 id 去重后重建 formattedText，实测 9 条减到 6 条（省 33% 重复上下文）
- [新增] `topicSearchAgent.js` 结果缓存（P1-4）：同关键词 10min 内复用完整结果（零查询零 LLM），只缓存成功结果，LRU 50 条
- [新增] `server/scripts/add-nickname-index.js` 幂等索引脚本：`idx_group_messages_nickname_msgTime (nickname, msgTime)`，本地实测 nickname COUNT 61ms -> 3ms，典型 LIMIT 50 查询 1ms（需服务器执行）
- [修复] `topicSearchAgent.js` 同义词扩展 429 兜底：LLM 失败时直接用原始关键词，不阻断 FTS5 检索（已有逻辑，本轮缓存路径保留该行为）

- commit: `a507943`

---

## 2026-08-23（黑机·男德通全量数据分析：map-reduce 分批摘要管线）

### 代码改动

- [新增] `fullAnalysisAgent.js` - 全量分析子 Agent（第 9 个子 Agent）。**背景**：院长反馈 AI 自述「统计基于抽样非全量」，排查确认检索管线三处截断（topic 每块抽 10 条 / person·mentioned 传 LLM 30/20 条 / orchestrator 总闸 2 万字符），院长裁决要「AI 针对全量数据做分析」。**架构（map-reduce）**：范围圈定（复用各 agent 条件：人物 nickname 精确匹配 / 话题 FTS5 v2 命中块+旧版 fts 降级+LIKE 兜底 / 提及关键词 LIKE / 时间范围±关键词）→ 一次性取全量 `id+LENGTH(content)`（0.2s/9.4万行，替代逐页全表扫描）→ 内存按 24,000 字符/批切分 → 上限 40 批（超出跨全时段等距抽样并明示）→ map 并发 4 批查询感知摘要（带用户原始问题，保留人物/事件/次数/金句，单批重试 3 次线性退避）→ 分层 reduce（每 12 份合一循环至 1 份）→ 底稿 ≤15,000 字符带覆盖口径头注入现有分析流。关键参数集中常量：BATCH_CHAR_BUDGET/MAX_BATCHES/MAP_CONCURRENCY/REDUCE_GROUP_SIZE/DRAFT_CHAR_LIMIT/TOPIC_CHUNK_LIMIT
- [新增] `orchestrator.js` 全量意图路由：planner prompt 加 `full:true` 字段规则+示例（限 topic_search/person_messages/mentioned/time_search 四类）；parseTasks 白名单透传 full；matchQuickPattern 正则兜底标 full（`全量|完整分析|逐条|全部消息|每一条` 与 planner 双保险）；dispatchAgent 检测 full 走本地 fullAnalysisAgent（不走黑机避开 WS 60s 超时），失败降级普通检索，CLIENT_ABORTED 透传中断；dispatchAgent 签名加第三参 question（map prompt 需要）
- [修复] `personMessagesAgent.js` + `mentionedAgent.js` **BUG-74**：`limit ?? 30` 在黑机传 `null` 全量时也取默认值（`??` 只放行 undefined），全量名不副实近一个月。改显式三分支：undefined=默认 / 数字=显式条数 / null=全量（SQL 无 LIMIT + msgSlice 提至 300/200 有界防 OOM），真·全量由 fullAnalysisAgent 负责
- [修复] `topicSearchAgent.js` **BUG-75**（存量，`6717042` 引入）：两处 catch 块引用 try 内 `const ftsQuery`，FTS5 报错时 catch 自身抛 ReferenceError 吞掉真实错误（本地缺 v2 表环境必现）。ftsQuery 提到 try 外
- [修复] `fullAnalysisAgent.js` OR 优先级：含 OR 的动态 whereSql 与外部 AND 组合处统一括号包裹（dry-run 抓到 BETWEEN 返回 93873 条而非 642 条）
- [防御] map/reduce 对 glm-5.3 偶发空 content（思考链吃掉输出预算）视为失败重试；reduce 合并失败保留原始摘要拼接不丢数据

### 验证

- 考研话题全量（真调 LLM）：命中 30 块 3,029 条 → 5 批 5/5 成功 → 底稿 3,882 字符（人物观点演变+金句+时间线），86s
- 丘序明全部发言（dry-run 零 LLM）：93,873 行 0.2s 取完 → 148 批 → 等距抽样 40 批（25,183 条，首尾保真）→ 单批拉取与预估一致（642=642，OR 括号修复生效）
- 普通提问回归：「考研讨论过吗」走原 topic_search 路径不变
- 意图正则单测 5/5（全量类命中/普通问题不误标）
- ⚠️ 验证中途火山 coding plan 5 小时额度耗尽（429，18:55 重置），前端浏览器实测待补

- commit: 见本轮

---

## 2026-08-21（白机·男德通 AI 优化第二批：13 项痛点落地）

### 代码改动

- [重构] `orchestrator.js` parseTasks - 双保险兜底：JSON.parse 失败时尝试从字符串数组（`["person_stat(丘序明)"]`）恢复任务对象；温度硬编码全替换为 `TEMPS.*` 常量引用（PLANNING/ANALYSIS/CHAT/FEEDBACK）
- [新增] `orchestrator.js` 多轮追问（痛点22）：buildPlannerPrompt 新增 lastIntent 参数，注入"上一轮检索了 {意图}，追问时在上一轮基础上扩展"约束 + 示例；chatController 从会话最后一个 assistant turn 的 intent 字段读取传入
- [重构] `topicSearchAgent.js` FTS5 方案A（痛点1）：两处 FTS5 查询从 trigram 旧表切 v2 表（unicode61 + 预分词），2 字中文词可直接 MATCH 命中；查询侧用 `buildFtsQuery()` 构建 FTS 表达式；同义词扩展加 LRU 缓存（200 组/TTL 1h，命中缓存 0ms）
- [重构] `personStatAgent.js` + `personMessagesAgent.js`（痛点13）：buildPersonConditions 的 LIKE 改 `nickname = 'xxx'` 精确匹配（只查该人自己发的消息），mentionedAgent 保持 LIKE（职责就是搜"别人提到"）
- [重构] `mentionedAgent.js` FTS5 切 v2 表 + buildFtsQuery 查询
- [新增] `memoryCompress.js`（痛点21）：超 20 turns 自动压缩早期轮次为摘要存 ChatSession.summary，注入 system 消息保留上下文；buildHistoryWithSummary 替换早期轮次为摘要消息；前端 SSE `history_compressed` 事件 + 提示条 UI
- [标注] `semanticAgent.js` + `statisticAgent.js`（痛点17）：标注已弃用，保留代码作工程参考，写明弃用原因/保留原因/复活方式
- [标注] `server/prisma/dev.db.README.md`（痛点19/20）：dev.db 标注已过时（0 消息 0 分块，数据在线上 prod.db），记录同族 BUG-61/65/70 事故史

### 验证

- 全量模块加载 11/11 通过（含 memoryCompress/tokenizer/TEMPS/frequentPersons）
- 前端 build 5.74s 通过
- FTS5 v2 测试 7/7 通过（造数据+重建+2字词命中+长词子串命中+消息级命中+清理）

### 方案文档

- `男德通AI优化方案设计.md`：26 项痛点裁决结果回写，已实施 18 项
- `AI助手.md`（PRD）：按当前多 Agent 架构重写为 v2，旧三分类架构标注归档

- commit: 见本轮

---

## 2026-08-21（白机·男德通 AI 优化第一批：人设重构 + glm-5.3 + 闲聊上下文感知）

- [重构] `orchestrator.js` isCasualChat - 闲聊判断上下文感知：匹配词分两级，`ABSOLUTE_CASUAL`（问候/致谢/身份类，零信息量，无论有无上下文都短路）+ `REACTION_CASUAL`（哈哈哈/笑死/吃了吗等情绪反应词，**有上下文时不再短路**，交给规划阶段判断——有语境时短话语可能是高密度回应，规划返回空任务且无数据信号词时仍走闲聊，路由更聪明）。isCasualChat 签名改 `(question, history=[])` 并导出（供测试）
- [配套] 规划/分析/闲聊全链路人设默认从 tiwei 群友风格改为 normal 中性风格（详见 utils/changelog persona.js 条目）
- [验证] 20 项单测全过（verify-persona-casual.mjs）+ glm-5.3 真实 planner prompt 3/3 解析成功（verify-glm53-planner.mjs：如何评价丘序明->3任务/7月份聊了什么->1任务/你好->0任务）
- commit: 见本轮

---

## 2026-08-20（白机·男德通多模态一期：视觉子 Agent）
- [新增] `visionAgent.js` - 视觉子 Agent（第 8 个子 Agent）：读 `/uploads/chat/` 图片转 base64 data URL（服务器无公网图片地址，火山 API 访问不到内网，base64 在 dev/prod 行为一致），调 doubao-seed-2-0-mini 生成中文描述（150 字内，带用户问题引导重点）；多图逐张识别单张失败不炸整体；路径白名单校验（仅 `/uploads/chat/` 前缀 + 防 `..` 穿越）
- [改造] `orchestrator.js` - orchestrate 新增第 6 参 `images`：带图必先跑视觉识别（主模型 glm-5.2 纯文本看不到图，无法自行判断），识别结果拼进 effectiveQuestion 供规划/闲聊/分析全阶段使用；带图时跳过 isCasualChat/matchQuickPattern 短路（图是消息主体）；buildAnalysisPrompt 新增 visionContext 参数把【视觉识别】段注入数据上下文首部；所有 return 点带 imageDescriptions 回传 chatController 写回 user turn
- [成本] doubao-seed-2-0-mini 输入 0.2 元/百万 tokens，一张图约 1000+ tokens ≈ 0.001 元/次，忽略不计
- commit: 见本轮

---

## 2026-08-16（黑机 方案A + BUG-68 glm-5.2 适配）

- [修改] `topicSearchAgent.js` - 方案A落地：新增 `sampleChunkMessages()` 块内抽样（关键词命中优先+头尾各1条定边界+顺序补齐，每块预算 `MSG_BUDGET_PER_CHUNK=10`），命中块返回 formattedText（每块摘要头+抽样消息，5 块全覆盖），替代旧版全量返回由 orchestrator `slice(0,30)` 截断的信息失真。同题对比：旧版只引用第 1 块，新版挖出多块证据完整排行。commit: 586bb0e
- [修改] `llm.js`（utils，影响所有 Agent）- BUG-68 适配 glm-5.2 纯推理模型：删 thinking:disabled 参数（被 400 拒绝）、不再发送 max_tokens（思考消耗输出预算）、makeLlmError 按错误码识别审核（不再 400 全判 CONTENT_MODERATION）、超时 120s->180s
- [修改] `orchestrator.js` - BUG-68：三处流式 catch 补 `send('token')` 兜底文案推前端（原来静默只写库，用户端零输出）；规划/闲聊/分析/反馈流去 maxTokens
- [修改] `statisticAgent.js` / `semanticAgent.js` - 去 maxTokens（思考模型预算适配）
- commit: 7f516a8 / 586bb0e

---

## 2026-08-15（黑机 BUG-67 修复）

- [修改] `timeSearchAgent.js` - 话题块摘要按月聚合（chunksByMonth），每月只取前 8 个代表性话题块、keywords 截 100 字、标题标注每月总块数。修复大范围查询 18 万字符 prompt 爆炸导致 LLM 时间错乱（BUG-67），2026 全年查询 prompt 184,082 -> 7,278 字符
- commit: 8cc3f13

---

## 2026-08-13（黑机 v3.2.1 时间范围检索+发言排行修复）

- [新增] `timeSearchAgent.js` - 时间范围检索 Agent，自然语言时间转 SQL 日期查询（`chunkDate BETWEEN ? AND ?`），支持可选关键词叠加。按日/月聚合统计 + 话题块摘要 + 每天抽样消息（防 token 爆炸）
- [修改] `orchestrator.js` - 四处改动支持 time_search：import / planner prompt（新增类型+路由规则+示例）/ dispatchAgent switch / parseTasks 白名单
- [修改] `dbInfoAgent.js` - 发言排行查 Top 30 后 JS 层 `resolveName` 合并同一人不同昵称；不排除 `nickname='我'`（=陈梓键 11 万条）；参与人数同样 JS 层去重
- [修改] `orchestrator.js` - dbInfoPatterns 补 `/多少信息|知道多少/`；fallback dataSignals 加 `|信息`
- commit: f295f88 / b89afb5 / d7229d6 / 1b826c0

---

## 2026-08-11（黑机 知识库四层升级）

- [新增] `worldbookAgent.js` - 世界书 Agent，按需读取设定集 v1.4 全文（3 万字），用户问到德塔/世界观/角色设定/势力/历史时触发，避免常驻上下文
- [新增] `dbInfoAgent.js` - 数据库信息 Agent，直接 SQL 查询元信息（消息总数/时间跨度/发言排行 Top10/年度统计/版本信息），不经 LLM 避免幻觉
- [修改] `orchestrator.js` - 四项升级：
  1. `isCasualChat` 精简：门槛 40 字 -> 10 字，删掉"好的/收到/嗯/哦"等口语碎词
  2. `matchQuickPattern` 扩展：新增话题搜索模板（"群里最近聊了什么"）+ 数据库信息模板（"多少条消息/谁最活跃/版本"），命中跳过 LLM 规划
  3. 规划异常 fallback 改为信号词判断：含数据信号词才 fallback topic_search，否则走闲聊
  4. `parseTasks` 白名单 + `dispatchAgent` 新增 worldbook/db_info 分发
- [修复] `topicSearchAgent.js` - FTS5 双列 MATCH 语法错误（BUG-62）：`f.keywords MATCH ? OR f.summary MATCH ?`（列级 OR 不支持）-> `f.message_chunks_fts MATCH ?`（表级搜索所有列）
- commit: 9659047 [feat](男德通): AI知识库四层升级+数据纯净重建+DeepSeek备用通道
