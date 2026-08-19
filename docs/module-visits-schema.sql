-- module_visits 表（岁月史书·学院数据 R-043）
-- 在服务器 prod.db 上执行（非 dev.db）：sqlite3 prisma/prod.db < docs/module-visits-schema.sql
-- 服务器 .env DATABASE_URL=file:./prod.db，Prisma 实际连接的是 prod.db 不是 dev.db（BUG-70 教训）

CREATE TABLE IF NOT EXISTS "module_visits" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "module" TEXT NOT NULL,
    "enteredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" DATETIME,
    "durationSec" INTEGER,
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_module_visits_module_entered" ON "module_visits"("module", "enteredAt");
CREATE INDEX IF NOT EXISTS "idx_module_visits_user" ON "module_visits"("userId");
