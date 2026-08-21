# dev.db 已过时

> 创建：2026-08-21
> 标注人：白机

## 状态

**dev.db 是早期开发数据库，当前已过时，不应作为开发数据源。**

## 原因

- `group_messages` 表 0 条消息，`message_chunks` 表 0 条分块
- 53 万条群聊数据只在**线上 prod.db**（`DATABASE_URL=file:./prod.db`）
- 本地开发若需群聊数据测试男德通检索功能，需从服务器拉取 prod.db（131MB）

## 混淆事故史（同族 BUG）

| BUG | 时间 | 事故 |
|-----|------|------|
| BUG-61 | 2026-08-10 | `prisma db push --accept-data-loss` 触发 FTS5 连锁删表，dev.db 131MB->36KB |
| BUG-65 | 2026-08-13 | `cp dev.db prod.db` 时把缺 `spaceState` 列的 dev.db 带上线 |
| BUG-70 | 2026-08-19 | 对 dev.db 建表但 `DATABASE_URL` 指向 prod.db，API 仍报表不存在 |

**教训**：dev.db 与 prod.db 混淆已造成 3 次事故。服务器环境 `DATABASE_URL=file:./prod.db`，所有数据库操作必须以 prod.db 为准。

## 本地开发数据获取

1. 从服务器拉取：`scp root@47.96.158.104:/root/projects/www.nandexueyuan.top/server/prisma/prod.db ./server/prisma/`（IP 以 `docs/account-passwords.md` 为准）
2. 或微信传（131MB）

## 何时使用 dev.db

- 仅做**表结构变更测试**（migrate/db push 验证 schema）时使用
- 测试完毕后清空，不保留群聊数据
