# Agents Changelog

> 倒序排列，最新在最上方。orchestrator 及子 Agent 变更记录。

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
