-- Create message_chunks table for semantic search
CREATE TABLE IF NOT EXISTS "message_chunks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "startMsgId" INTEGER NOT NULL,
    "endMsgId" INTEGER NOT NULL,
    "chunkDate" TEXT,
    "keywords" TEXT NOT NULL,
    "summary" TEXT,
    "participants" TEXT,
    "msgCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_message_chunks_chunkDate" ON "message_chunks"("chunkDate");
