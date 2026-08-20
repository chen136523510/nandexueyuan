# Agents Changelog

> 倒序排列，最新在最上方。orchestrator 及子 Agent 变更记录。

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
