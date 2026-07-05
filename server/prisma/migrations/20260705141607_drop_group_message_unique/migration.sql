-- DropIndex
DROP INDEX "group_messages_talker_msgTime_content_key";

-- CreateIndex
CREATE INDEX "group_messages_talker_msgTime_idx" ON "group_messages"("talker", "msgTime");
