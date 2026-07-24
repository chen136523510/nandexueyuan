#!/bin/bash
# 部署脚本 - 在服务器上执行
# 用法: bash deploy.sh [--data <csv路径>]
#   --data: 重新导入群聊数据 + 重建 FTS5 索引

set -e

DEPLOY_DIR=/root/projects/www.nandexueyuan.top
cd "$DEPLOY_DIR"

echo "=== 1/11 拉取最新代码 ==="
git pull origin master

echo "=== 2/11 安装后端依赖 ==="
cd server
npm install
# 确保 ws 依赖已安装（黑机外包检索 WebSocket）
npm install ws 2>/dev/null || true

echo "=== 2.5/11 生成 Prisma Client ==="
npx prisma generate

echo "=== 3/11 应用数据库迁移 ==="
npx prisma migrate deploy

echo "=== 3.5/11 创建系统管理员账号 ==="
node prisma/seed.js

echo "=== 3.6/11 师德墙种子数据 ==="
# 确保 uploads 目录存在
mkdir -p uploads/wall uploads/wall-seed
# 种子图片已在 git 仓库中（uploads/wall-seed/），此处检查
if [ -f uploads/wall-seed/einstein.jpg ]; then
  node prisma/seedWall.js
else
  echo "⚠ 师德墙种子图片不存在，跳过种子数据。请从本地上传 uploads/wall-seed/ 目录"
fi

echo "=== 4/11 安装游戏服务器依赖 ==="
cd ../game-server
npm install

echo "=== 5/11 安装前端依赖 ==="
cd ..
npm install --legacy-peer-deps

echo "=== 6/11 构建前端 ==="
NODE_OPTIONS=--max-old-space-size=512 npm run build

echo "=== 7/11 重启后端 ==="
pm2 delete nandexueyuan-api 2>/dev/null
pm2 start src/index.js --name nandexueyuan-api --cwd server
pm2 save

echo "=== 8/11 重启游戏服务器 ==="
pm2 restart nandexueyuan-game 2>/dev/null || pm2 start game-server/src/index.js --name nandexueyuan-game
pm2 save

echo "=== 9/11 写入版本公告 ==="
# 写入版本公告（seedVersion.js 含 v1.1.0/v1.2.0/v2.0.0 三条，幂等：已存在则更新）
# 版本号规则见 ADR-004，新增版本时在 seedVersion.js 顶部数组追加
cd "$DEPLOY_DIR/server"
node prisma/seedVersion.js

echo "=== 10/11 验证 ==="
sleep 2
http_code() {
  curl -s -o /dev/null -w "%{http_code}" "$1"
}

if [ "$(http_code http://localhost:3000/api/hello)" = "200" ]; then
  echo "✓ 后端 API 正常"
else
  echo "✗ 后端 API 异常"
fi
if [ "$(http_code http://localhost:3000/api/wall/posts)" = "200" ]; then
  echo "✓ 师德墙 API 正常"
else
  echo "✗ 师德墙 API 异常"
fi
VERSION=$(node -p "require('./package.json').version")
if curl -s http://localhost:3000/api/announcement | grep -q "v${VERSION}\|\"${VERSION}\""; then
  echo "✓ 版本公告 v${VERSION} 正常"
else
  echo "✗ 版本公告异常（期望 v${VERSION}）"
fi
if [ "$(http_code http://localhost/)" = "200" ] || [ "$(http_code http://localhost/)" = "301" ] || [ "$(http_code http://localhost/)" = "302" ]; then
  echo "✓ 前端正常"
else
  echo "✗ 前端异常"
fi
GAME_CODE=$(http_code http://localhost:2567/matchmake)
if [ "$GAME_CODE" != "000" ]; then
  echo "✓ 游戏服务器正常（HTTP $GAME_CODE）"
else
  echo "✗ 游戏服务器异常（连接失败）"
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
echo "=== 11/11 部署完成 ==="
echo "访问: https://www.nandexueyuan.top"