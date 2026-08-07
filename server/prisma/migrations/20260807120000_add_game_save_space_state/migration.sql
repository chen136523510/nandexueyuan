-- AlterTable: game_saves 增加 spaceState（R-035 空间状态快照）
ALTER TABLE "game_saves" ADD COLUMN "spaceState" TEXT DEFAULT '{}';
