-- CreateTable
CREATE TABLE "versions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "version" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "updates" TEXT NOT NULL DEFAULT '[]',
    "plans" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "versions_version_key" ON "versions"("version");

-- RedefineIndex
DROP INDEX "idx_message_chunks_chunkDate";
CREATE INDEX "message_chunks_chunkDate_idx" ON "message_chunks"("chunkDate");
