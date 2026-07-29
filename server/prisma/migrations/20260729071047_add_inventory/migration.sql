-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_game_progress" (
    "userId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "unlockedChapters" TEXT NOT NULL DEFAULT '[]',
    "unlockedCGs" TEXT NOT NULL DEFAULT '[]',
    "affinity" TEXT NOT NULL DEFAULT '{}',
    "storyVariables" TEXT NOT NULL DEFAULT '{}',
    "inventory" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "game_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_game_progress" ("affinity", "storyVariables", "unlockedCGs", "unlockedChapters", "updatedAt", "userId") SELECT "affinity", "storyVariables", "unlockedCGs", "unlockedChapters", "updatedAt", "userId" FROM "game_progress";
DROP TABLE "game_progress";
ALTER TABLE "new_game_progress" RENAME TO "game_progress";
CREATE TABLE "new_game_saves" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "slot" INTEGER NOT NULL,
    "node" TEXT NOT NULL,
    "chapter" TEXT NOT NULL,
    "affinity" TEXT NOT NULL,
    "variables" TEXT NOT NULL,
    "inventory" TEXT NOT NULL DEFAULT '[]',
    "thumbnail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "game_saves_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_game_saves" ("affinity", "chapter", "createdAt", "id", "node", "slot", "thumbnail", "updatedAt", "userId", "variables") SELECT "affinity", "chapter", "createdAt", "id", "node", "slot", "thumbnail", "updatedAt", "userId", "variables" FROM "game_saves";
DROP TABLE "game_saves";
ALTER TABLE "new_game_saves" RENAME TO "game_saves";
CREATE UNIQUE INDEX "game_saves_userId_slot_key" ON "game_saves"("userId", "slot");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
