# Stores Changelog

> 倒序排列，最新在最上方。

---

## 2026-07-01
- [新增] `auth.js` — 认证状态管理（token/user 状态、login/register/fetchMe/logout 动作）
- commit: 未提交

---

## 2026-06-29
- [新增] `hello.js` - Pinia store（hello 模块），含 message/loading 状态 + fetchHello 动作
- commit: 未提交

---

> 以下为断档补全（基于 git 历史，正序追加）

## 2026-07-21
- [修改] `auth.js` - 新增 skinId 状态（默认 '1'）+ setSkinId 动作，localStorage 持久化（R-003 玩家精灵四方向行走系统阶段 1）
- commit: 779f593 [feat](德塔): 玩家精灵四方向行走系统

---

## 2026-07-22
- [修改] `auth.js` - P4 角色创建系统接入后端：新增 loaded 状态；login/register/fetchMe 同步后端 skinId（可能为 null）；logout 清除 skinId；displayName 兜底「学员」
- commit: c6306d3 [feat](德塔): P4 角色创建系统
