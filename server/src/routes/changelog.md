# Routes Changelog

> 倒序排列，最新在最上方。

---

## 2026-07-01
- [修改] `api.js` — 注册认证/用户/邀请码/成员管理全部路由，接入 auth 中间件与角色守卫
- commit: 未提交

---

## 2026-06-29
- [新增] `api.js` - API 路由聚合，挂载 `/api/hello`
- commit: 未提交

---

## 2026-07-05
- [修改] `api.js` - 注册男德通路由（CSV 导入+批次、问答 ask+限流、会话历史 CRUD）
- commit: 739306d feat: 新增「男德通」AI群聊助手(意图分类+SQL/FTS5问答+对话UI+会话历史)

---

## 2026-07-18
- [修改] `api.js` - 新增 NPC AI 对话路由 POST /chat/npc/talk（auth + rateLimit）
- commit: 76fe825 [feat](P2): 后端 NPC AI 对话接口 + 德塔专属 persona

---

## 2026-07-20
- [修改] `api.js` - 重构公告路由为版本公告系统（版本 CRUD 5 个 REST API，向后兼容旧 GET）
- commit: 6d8ce17 [feat](首页): 版本公告系统 R-004 - 版本管理+变更日志+未来规划

---

## 2026-07-22
- [修改] `api.js` - 新增形象切换路由 PUT /user/skin（角色创建系统 skinId 持久化）
- commit: c6306d3 [feat](德塔): P4 角色创建系统 - skinId后端持久化+角色选择页

---

## 2026-07-23
- [修改] `api.js` - 新增男德墙路由（动态发布/删除、评论增删、点赞/取消，含图片上传 multer）
- commit: 5698107 [feat](男德墙): R-008 男德墙模块完整实现

---

## 2026-07-23
- [修改] `api.js` - 「男德墙」注释改名为「师德墙」
- commit: f638751 [refactor](师德墙): 男德墙改名为师德墙 + 系统管理员账号
