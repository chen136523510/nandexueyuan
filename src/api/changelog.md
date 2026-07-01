# API Changelog

> 倒序排列，最新在最上方。

---

## 2026-07-01
- [修改] `index.js` — 请求拦截器注入 JWT，响应拦截器统一处理业务错误码与 401 跳转
- [新增] `auth.js` — 认证 API（login/register/logout/getMe）
- [新增] `user.js` — 用户 API（updateProfile/updatePassword）
- commit: 未提交

---

## 2026-06-29
- [新增] `index.js` — axios 实例，baseURL `/api`，含请求/响应拦截器
- [新增] `hello.js` — hello 接口模块（getHello）
- commit: 未提交
