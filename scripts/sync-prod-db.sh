#!/bin/bash
# 从云端拉取 prod.db 到本地（黑机首次同步或手动同步）
# 用法: bash scripts/sync-prod-db.sh

set -e

echo "=== 同步 prod.db 从云端到本地 ==="

# 云端服务器配置
SERVER="root@47.96.158.104"
REMOTE_DB="/root/projects/www.nandexueyuan.top/server/prisma/prod.db"
LOCAL_DB="server/prisma/dev.db"

# 备份本地 dev.db
if [ -f "$LOCAL_DB" ]; then
  BACKUP_DB="${LOCAL_DB}.backup.$(date +%Y%m%d_%H%M%S)"
  echo "备份本地 dev.db -> $BACKUP_DB"
  cp "$LOCAL_DB" "$BACKUP_DB"
fi

# 拉取云端 prod.db
echo "从 $SERVER:$REMOTE_DB 拉取..."
scp "$SERVER:$REMOTE_DB" "$LOCAL_DB"

# 显示文件大小
SIZE=$(stat -f%z "$LOCAL_DB" 2>/dev/null || stat -c%s "$LOCAL_DB" 2>/dev/null)
SIZE_MB=$((SIZE / 1024 / 1024))
echo "dev.db 大小: ${SIZE_MB} MB"

echo "=== 同步完成 ==="