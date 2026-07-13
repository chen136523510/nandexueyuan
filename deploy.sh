#!/bin/bash
# 部署脚本 — 在服务器上执行
# 用法: bash deploy.sh [--data <csv路径>]
#   --data: 重新导入群聊数据 + 重建 FTS5 索引

set -e

DEPLOY_DIR=/root/projects/www.nandexueyuan.top
cd "$DEPLOY_DIR"

echo "=== 1/7 拉取最新代码 ==="
git pull origin master

echo "=== 2/7 安装后端依赖 ==="
cd server
corepack enable pnpm 2>/dev/null || true
pnpm install --frozen-lockfile

echo "=== 2.5/7 生成 Prisma Client ==="
npx prisma generate

echo "=== 3/7 应用数据库迁移 ==="
npx prisma migrate deploy

echo "=== 4/7 安装前端依赖 ==="
cd ..
pnpm install --frozen-lockfile

echo "=== 5/7 构建前端 ==="
NODE_OPTIONS=--max-old-space-size=512 pnpm build

echo "=== 6/7 重启后端 ==="
pm2 restart nandexueyuan-api 2>/dev/null || pm2 start server/src/index.js --name nandexueyuan-api
pm2 save

echo "=== 7/7 验证 ==="
sleep 2
if curl -s http://localhost:3000/api/hello | grep -q "message"; then
  echo "✓ 后端正常"
else
  echo "✗ 后端异常"
fi
if curl -sI http://localhost/ | grep -q "200\|301\|302"; then
  echo "✓ 前端正常"
else
  echo "✗ 前端异常"
fi

# 可选:数据重新导入 + FTS5 重建
if [ "$1" = "--data" ] && [ -n "$2" ]; then
  echo ""
  echo "=== 附加:重新导入群聊数据 ==="
  cd server
  node scripts/importChat.js "$2" --clear
  echo "=== 附加:重建 FTS5 索引 ==="
  node scripts/buildFtsIndex.js
  echo "✓ 数据导入 + 索引重建完成"
fi

echo ""
echo "=== 部署完成 ==="
echo "访问: https://www.nandexueyuan.top"
