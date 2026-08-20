# Utils Changelog

> 倒序排列，最新在最上方。

---

## 2026-08-20（白机 男德通多模态一期：视觉模型接入层）

- [新增] `llm.js` visionChatCompletion() - 视觉模型调用（图片理解，doubao-seed-2-0-mini-260428）：走标准按量计费端点（`VOLC_STD_BASE_URL`，默认 `https://ark.cn-beijing.volces.com/api/v3`，与 coding plan `/api/coding/v3` 不同通道），key 支持 `VOLC_VISION_API_KEY || VOLC_API_KEY`（2026-08-20 curl 实测同 key 可用），超时 60s，`thinking:{type:'disabled'}` 关闭思考链（实测比 `reasoning_effort:'minimal'` 更干净，后者仍输出 reasoning_content）；复用 makeLlmError（451 审核→CONTENT_MODERATION 上层话术）。现有 chatCompletion/chatCompletionStream 零改动（glm-5.2 coding plan 链路不受影响）
- commit: 82d2e33

---

## 2026-08-13（黑机 v3.2.1 昵称映射补全）

- [修改] `knowledge.js` - 补全 nickname 映射：`做题体孝子（暂时）`->丘序明 / `MICO`（大写）->陈梓键；确认 `0.o`->陈梓键 / `O.o`->饶志锐 / `优质单马/优质单男`->王乐添 / `失败的人生/🤡`->黄学远
- commit: d7229d6

---

## 2026-08-11（黑机 知识库升级 + LLM 回退）

- [新增] `knowledge.js` - `buildSiteKnowledge()` 网站六大功能信息注入 system prompt；补全 `0.o->陈梓键`、`O.o->饶志锐` 昵称映射
- [修改] `persona.js` - BASE_TEMPLATE 追加网站信息块（buildSiteKnowledge 注入）
- [回退] `llm.js` - 移除 DeepSeek 多通道，恢复纯火山引擎（`VOLC_*` 配置 + 无条件 `thinking: { type: 'disabled' }`）。院长要求不需要 LLM 多通道
- commit: 9659047 [feat](男德通): AI知识库四层升级+数据纯净重建+DeepSeek备用通道（DeepSeek 部分本轮已回退）

---

## 2026-08-10（Phase2）
- [修改] `persona.js` - 新增 PERSONAS 字典（4 套预设：体委/丘比/开开/正常人）+ getPersona(id,desc) 函数 + buildCustomPersona 自定义人设，BASE_TEMPLATE 模板复用成员知识库+数据规则
- commit: ba91f1f [feat](男德通): AI优化Phase2第一批-人设切换+需求反馈页+AI提需求+黑机离线提示

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
