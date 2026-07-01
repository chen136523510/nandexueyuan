-- CreateTable
CREATE TABLE "announcements" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "content" TEXT NOT NULL DEFAULT '欢迎来到男德学院',
    "updatedAt" DATETIME NOT NULL
);
