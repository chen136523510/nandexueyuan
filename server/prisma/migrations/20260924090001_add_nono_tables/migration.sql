-- 诺诺·自习室（R-058 一期）：L3 长期记忆库 + L1 用户认知

-- CreateTable
CREATE TABLE "nono_memories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "kind" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "importance" INTEGER NOT NULL DEFAULT 5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "nono_profiles" (
    "userId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "summary" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "nono_memories_userId_idx" ON "nono_memories"("userId");

-- CreateIndex
CREATE INDEX "nono_memories_createdAt_idx" ON "nono_memories"("createdAt");
