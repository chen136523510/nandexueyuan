# 岁月史书·学院数据 module_visits 建表 SQL

> 2026-08-19 落地 R-043（模块使用频率+停留时间）时，因 dev.db 迁移史漂移，
> `prisma migrate dev` 要求 reset dev.db 会丢群聊数据（BUG-61 教训），改走手动建表。
> 生产部署时同样需在 prod.db 手动执行以下 SQL（不走 deploy.sh 的 migrate deploy）。

## 执行方式

```bash
# SSH 登录服务器（IP 以 docs/account-passwords.md 为准：47.96.158.104）
ssh root@47.96.158.104

# 进入项目目录
cd /root/projects/www.nandexueyuan.top/server

# 用 sqlite3 执行建表（如服务器无 sqlite3，用 node + prisma 替代，见下方）
sqlite3 prisma/dev.db < docs/module-visits-schema.sql

# 验证表已建
sqlite3 prisma/dev.db "SELECT count(*) FROM module_visits"
```

## 如服务器无 sqlite3 命令，用 node 替代

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
```
