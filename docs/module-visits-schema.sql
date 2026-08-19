-- module_visits 表（岁月史书·学院数据 R-043）
-- 在 prod.db 上执行：sqlite3 prisma/dev.db < docs/module-visits-schema.sql

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
