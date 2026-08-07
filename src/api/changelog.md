# API Changelog

> 倒序排列，最新在最上方。

---

## 2026-08-07
- [修改] `visualNovel.js` — 存档快照新增 spaceState 字段（空间状态：currentLocation/currentExploreLocation/visitedLocations/unlockedLocations），R-035 探索态存档恢复
- commit: `b4c9e68`

---

## 2026-07-01
- [修改] `index.js` — 请求拦截器注入 JWT，响应拦截器统一处理业务错误码与 401 跳转
- [新增] `auth.js` — 认证 API（login/register/logout/getMe）
- [新增] `user.js` — 用户 API（updateProfile/updatePassword）
- commit: 未提交

---

## 2026-06-29
- [新增] `index.js` - axios 实例，baseURL `/api`，含请求/响应拦截器
- [新增] `hello.js` - hello 接口模块（getHello）
- commit: 未提交

---

> 以下为断档补全（基于 git 历史，正序追加）

## 2026-07-05
- [新增] `chat.js` - 男德通 AI 群聊助手 API（importChatCsv/listBatches/askChat/listSessions/getSession/deleteSession）
- commit: 739306d feat: 新增「男德通」AI群聊助手

---

## 2026-07-13
- [修改] `chat.js` - askChat 提问超时放宽至 120s（适配语义检索耗时）
- [修改] `index.js` - 响应拦截器网络错误区分超时（ECONNABORTED）与连接失败提示
- commit: a7cebac feat: 语义检索分块提示词+流式输出+SSE代理修复

---

## 2026-07-14
- [新增] `admin.js` - 管理后台 API（德塔 P0+P1 管理功能）
- [新增] `inviteCode.js` - 邀请码 API
- commit: 7329e25 feat: 德塔P0+P1完成

---

## 2026-07-20
- [修改] `announcement.js` - 版本公告系统 R-004：重构为 getVersions/createVersion/updateVersion/deleteVersion 四个 REST API（向后兼容旧 GET）
- commit: 6d8ce17 [feat](首页): 版本公告系统 R-004

---

## 2026-07-22
- [新增] `user.js` - 新增 updateSkin 接口（PUT /user/skin，角色形象持久化）
- commit: c6306d3 [feat](德塔): P4 角色创建系统

---

## 2026-07-23
- [新增] `wall.js` - 男德墙模块 API（动态发布/评论/点赞/删除）
- commit: 5698107 [feat](男德墙): R-008 男德墙模块完整实现
