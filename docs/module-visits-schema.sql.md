# 岁月史书·学院数据 module_visits 建表 SQL

> 2026-08-19 落地 R-043（模块使用频率+停留时间）时，因 dev.db 迁移史漂移，
> `prisma migrate dev` 要求 reset dev.db 会丢群聊数据（BUG-61 教训），改走手动建表。
> 生产部署时同样需在 prod.db 手动执行以下 SQL（不走 deploy.sh 的 migrate deploy）。
>
> ⚠️ **BUG-70 教训（2026-08-19）**：服务器 `.env` 的 `DATABASE_URL=file:./prod.db`，
> Prisma 实际连接的是 **prod.db**，不是 dev.db。sqlite3 命令行必须指定 `prisma/prod.db`，
> 否则建到 dev.db 里 API 仍报「表不存在」。

## 执行方式

```bash
# SSH 登录服务器（IP 以 docs/account-passwords.md 为准：47.96.158.104）
ssh root@47.96.158.104

# 进入项目根目录（注意是项目根，不是 server 目录，因为 SQL 文件在 docs/ 下）
cd /root/projects/www.nandexueyuan.top

# ⚠️ 必须对 prod.db 执行，不是 dev.db（服务器 DATABASE_URL=file:./prod.db）
sqlite3 server/prisma/prod.db < docs/module-visits-schema.sql

# 验证表已建
sqlite3 server/prisma/prod.db "SELECT count(*) FROM module_visits"

# 执行后重启 API 进程（Prisma 连接需重新初始化才能发现新表）
pm2 restart nandexueyuan-api
```

## 如服务器无 sqlite3 命令，用 node 替代

> node 方案通过 Prisma Client 连接，走 `DATABASE_URL`（服务器指向 prod.db），无需手动指定 db 文件。

```bash
cd /root/projects/www.nandexueyuan.top/server
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$queryRaw\`CREATE TABLE IF NOT EXISTS module_visits (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER NOT NULL, module TEXT NOT NULL, enteredAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, leftAt DATETIME, durationSec INTEGER, FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE)\`
  .then(() => p.\$queryRaw\`CREATE INDEX IF NOT EXISTS idx_module_visits_module_entered ON module_visits(module, enteredAt)\`)
  .then(() => p.\$queryRaw\`CREATE INDEX IF NOT EXISTS idx_module_visits_user ON module_visits(userId)\`)
  .then(() => { console.log('OK: module_visits table created'); return p.\$disconnect(); })
  .catch(e => { console.error('FAIL:', e.message); process.exit(1); });
"
# 执行后重启 API 进程
pm2 restart nandexueyuan-api
```
