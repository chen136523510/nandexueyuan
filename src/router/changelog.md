# Router Changelog

> 倒序排列，最新在最上方。

---

## 2026-08-10
- [修改] `index.js` - 新增 /feedback 路由 -> FeedbackView.vue（requiresAuth）
- commit: ba91f1f [feat](男德通): AI优化Phase2第一批-人设切换+需求反馈页+AI提需求+黑机离线提示

---

## 2026-07-01
- [修改] `index.js` — 新增 login/register/profile 路由，添加路由守卫（requiresAuth/guestOnly）
- commit: 未提交

---

## 2026-06-29
- [新增] `index.js` - Vue Router 配置，路由：`/`（HomeView）、`/about`（AboutView）
- commit: 未提交

---

> 以下为断档补全（基于 git 历史，正序追加）

## 2026-07-05
- [修改] `index.js` - 新增 `/chat` 路由（ChatView，requiresAuth）
- commit: 739306d feat: 新增「男德通」AI群聊助手

---

## 2026-07-14
- [修改] `index.js` - 新增 `/admin` 路由（AdminView，requiresAuth+requiresAdmin）、`/nde` 路由（GameView，requiresAuth）；路由守卫新增 requiresAdmin 管理员校验
- commit: 7329e25 feat: 德塔P0+P1完成

---

## 2026-07-22
- [修改] `index.js` - 新增 `/character` 路由（CharacterView 角色选择页）；路由守卫新增进德塔前 skinId===null 拦截跳转角色选择
- commit: c6306d3 [feat](德塔): P4 角色创建系统

---

## 2026-07-23
- [修改] `index.js` - 新增 `/wall` 路由（WallView 师德墙，requiresAuth）
- commit: 5698107 [feat](男德墙): R-008 男德墙模块完整实现
