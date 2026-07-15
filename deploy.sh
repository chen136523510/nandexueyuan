#!/bin/bash
# 部署脚本 — 在服务器上执行
# 用法: bash deploy.sh [--data <csv路径>]
#   --data: 重新导入群聊数据 + 重建 FTS5 索引

set -e

DEPLOY_DIR=/root/projects/www.nandexueyuan.top
cd "$DEPLOY_DIR"

echo "=== 1/9 拉取最新代码 ==="
git pull origin master

echo "=== 2/9 安装后端依赖 ==="
cd server
npm install

echo "=== 2.5/9 生成 Prisma Client ==="
npx prisma generate

echo "=== 3/9 应用数据库迁移 ==="
npx prisma migrate deploy

echo "=== 4/9 安装游戏服务器依赖 ==="
cd ../game-server
npm install

echo "=== 5/9 安装前端依赖 ==="
cd ..
npm install --legacy-peer-deps

echo "=== 6/9 构建前端 ==="
NODE_OPTIONS=--max-old-space-size=512 npm run build

echo "=== 7/9 重启后端 ==="
pm2 delete nandexueyuan-api 2>/dev/null
pm2 start src/index.js --name nandexueyuan-api --cwd server
pm2 save

echo "=== 8/9 重启游戏服务器 ==="
pm2 restart nandexueyuan-game 2>/dev/null || pm2 start game-server/src/index.js --name nandexueyuan-game
pm2 save

echo "=== 9/9 验证 ==="
sleep 2
if curl -s http://localhost:3000/api/hello | grep -q "message"; then
  echo "✓ 后端 API 正常"
else
  echo "✗ 后端 API 异常"
fi
if curl -sI http://localhost/ | grep -q "200\|301\|302"; then
  echo "✓ 前端正常"
else
  echo "✗ 前端异常"
fi
if curl -s http://localhost:2567/matchmake | grep -q "."; then
  echo "✓ 游戏服务器正常"
else
  echo "✗ 游戏服务器异常（可能未启动或端口未开放）"
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