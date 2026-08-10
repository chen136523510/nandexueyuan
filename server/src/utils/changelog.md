# Utils Changelog

> 倒序排列，最新在最上方。

---

## 2026-08-10
- [新增] `persona.js` - 统一男德通群友人设 CHAT_PERSONA（群友风格+21人成员知识库注入+数据规则+Markdown格式提示），orchestrator 和 chatController 共用
- commit: d4a2fe5 [feat](男德通): AI优化Phase1-Markdown渲染+死代码清理+快速路由+FTS5增强+前端体验

---

## 2026-07-01
- [新增] `response.js` - 统一响应格式（success/fail）+ 错误码常量
- [新增] `jwt.js` - JWT 签发/校验工具
- [新增] `password.js` - bcrypt 密码哈希/比对工具
- [新增] `inviteCode.js` - 随机邀请码生成器（排除易混淆字符）
- commit: 未提交

---

## 2026-07-05
- [新增] `llm.js` - LLM 客户端封装（火山引擎方舟 ARK，OpenAI 兼容协议，fetch 调用）
- commit: 739306d feat: 新增「男德通」AI群聊助手(意图分类+SQL/FTS5问答+对话UI+会话历史)

---

## 2026-07-07
- [新增] `knowledge.js` - 知识库语义检索工具（向量化+检索）
- [修改] `llm.js` - 群友人设+知识库+上下文相关调整
- commit: 399ee8f feat: 男德通全面优化 - 群友人设+知识库+上下文+语义检索修复

---

## 2026-07-13
- [修改] `llm.js` - 语义检索分块提示词+流式输出支持
- commit: a7cebac feat: 语义检索分块提示词+流式输出+SSE代理修复

---

## 2026-07-21
- [修改] `llm.js` - LLM 超时从 60s 提升至 120s（分析阶段数据量大，修复思考太久+network error）
- commit: 1a9855b [fix](男德通): 修复思考太久+network error
