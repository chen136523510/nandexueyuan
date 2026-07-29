-- CreateTable
CREATE TABLE "game_saves" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "slot" INTEGER NOT NULL,
    "node" TEXT NOT NULL,
    "chapter" TEXT NOT NULL,
    "affinity" TEXT NOT NULL,
    "variables" TEXT NOT NULL,
    "thumbnail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "game_saves_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "game_progress" (
    "userId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "unlockedChapters" TEXT NOT NULL DEFAULT '[]',
    "unlockedCGs" TEXT NOT NULL DEFAULT '[]',
    "affinity" TEXT NOT NULL DEFAULT '{}',
    "storyVariables" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "game_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "game_saves_userId_slot_key" ON "game_saves"("userId", "slot");
