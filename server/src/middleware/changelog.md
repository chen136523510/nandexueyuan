# Middleware Changelog

> 倒序排列，最新的最上方。

---

## 2026-07-01
- [新增] `auth.js` — JWT 鉴权中间件 + 角色守卫工厂函数
- [修改] `errorHandler.js` — 支持 ApiError 业务错误类，统一错误响应格式，处理 Prisma P2002 冲突
- commit: 未提交

---

## 2026-06-29
- [新增] `errorHandler.js` - 统一错误处理中间件
- commit: 未提交

---

## 2026-07-05
- [新增] `rateLimit.js` - 接口限流中间件（用于男德通问答接口）
- commit: 739306d feat: 新增「男德通」AI群聊助手(意图分类+SQL/FTS5问答+对话UI+会话历史)
