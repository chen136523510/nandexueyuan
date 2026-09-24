-- Baseline：历史漂移补录（chat_sessions.summary / chat_turns.images / feedbacks / module_visits）
-- 这些结构在 dev.db 与线上 prod.db 均已实际存在（历史上经 db push/手工 SQL 应用），
-- 本迁移仅用于补齐迁移文件记录，部署时须用 migrate resolve --applied 标记而非执行（线上已有结构，执行会报重复列）。

-- AlterTable
ALTER TABLE "chat_sessions" ADD COLUMN "summary" TEXT;

-- AlterTable
ALTER TABLE "chat_turns" ADD COLUMN "images" TEXT;

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "authorId" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'other',
    "title" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT '无',
    "content" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "feedbacks_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "module_visits" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "module" TEXT NOT NULL,
    "enteredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" DATETIME,
    "durationSec" INTEGER,
    CONSTRAINT "module_visits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "feedbacks_status_idx" ON "feedbacks"("status");

-- CreateIndex
CREATE INDEX "feedbacks_type_idx" ON "feedbacks"("type");

-- CreateIndex
CREATE INDEX "module_visits_module_enteredAt_idx" ON "module_visits"("module", "enteredAt");

-- CreateIndex
CREATE INDEX "module_visits_userId_idx" ON "module_visits"("userId");
