# Agents Changelog

> 倒序排列，最新在最上方。orchestrator 及子 Agent 变更记录。

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
