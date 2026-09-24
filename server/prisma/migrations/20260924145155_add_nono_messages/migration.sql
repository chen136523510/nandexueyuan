-- 诺诺直播间公共消息流（v4.1.0：自习室由私人会话改为直播间共享消息流）

-- CreateTable
CREATE TABLE "nono_messages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "nono_messages_createdAt_idx" ON "nono_messages"("createdAt");
