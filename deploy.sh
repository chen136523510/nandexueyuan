#!/bin/bash
# 部署脚本 - 在服务器上执行
# 用法: bash deploy.sh [--data <csv路径>]
#   --data: 重新导入群聊数据 + 重建 FTS5 索引
#
# 分层设计：
#   每次必做：拉代码 → 装依赖 → 构建 → 重启 → 公告 → 验证
#   首次/按需：数据库迁移 → 管理员账号 → 师德墙种子（仅在缺失时触发）

set -e

DEPLOY_DIR=/root/projects/www.nandexueyuan.top
cd "$DEPLOY_DIR"

echo "=== 1/9 拉取最新代码 ==="
git pull origin master

echo "=== 2/9 安装后端依赖 ==="
cd server
npm install
# 确保 ws 依赖已安装（黑机外包检索 WebSocket）
npm install ws 2>/dev/null || true

echo "=== 2.5/9 生成 Prisma Client ==="
npx prisma generate

echo "=== 3/9 数据库迁移（按需）==="
# 只在有未应用的迁移时才执行
# ⚠️ grep 模式必须匹配实际输出 "not yet been applied"（曾用 "not applied" 漏检导致迁移被跳过，BUG-58）
PENDING=$(npx prisma migrate status 2>&1 | grep -cE "not (yet been )?applied" || true)
if [ "$PENDING" -gt 0 ]; then
  echo "  检测到 $PENDING 个未应用的迁移，执行 migrate deploy"
  npx prisma migrate deploy
else
  echo "  无待应用迁移，跳过"
fi

echo "=== 4/9 安装游戏服务器依赖 ==="
cd ../game-server
npm install

echo "=== 5/9 安装前端依赖 ==="
cd ..
npm install --legacy-peer-deps

echo "=== 6/9 构建前端 ==="
NODE_OPTIONS=--max-old-space-size=512 npm run build

echo "=== 7/9 重启服务 ==="
pm2 restart nandexueyuan-api 2>/dev/null || pm2 start src/index.js --name nandexueyuan-api --cwd server
pm2 restart nandexueyuan-game 2>/dev/null || pm2 start game-server/src/index.js --name nandexueyuan-game
pm2 save

echo "=== 8/9 写入版本公告 ==="
cd "$DEPLOY_DIR/server"
node prisma/seedVersion.js

echo "=== 9/9 验证 ==="
sleep 2
http_code() {
  curl -s -o /dev/null -w "%{http_code}" "$1"
}

if [ "$(http_code http://localhost:3000/api/hello)" = "200" ]; then
  echo "✓ 后端 API 正常"
else
  echo "✗ 后端 API 异常"
fi
if [ "$(http_code http://localhost:3000/api/wall/posts)" = "200" ] || [ "$(http_code http://localhost:3000/api/wall/posts)" = "401" ]; then
  echo "✓ 师德墙 API 正常"
else
  echo "✗ 师德墙 API 异常"
fi
VERSION=$(node -p "require('./package.json').version")
if curl -s http://localhost:3000/api/announcement | grep -q "\"v${VERSION}\""; then
  echo "✓ 版本公告 v${VERSION} 正常"
else
  echo "✗ 版本公告异常（期望 v${VERSION}）"
fi
# 配 HTTPS 后 80 端口对 localhost Host 头返回 404（域名级 301 跳转不匹配 localhost），
# 改为检测 https://localhost/ 返回 200
if [ "$(curl -sk -o /dev/null -w "%{http_code}" https://localhost/)" = "200" ]; then
  echo "✓ 前端正常（HTTPS）"
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
  cd "$DEPLOY_DIR/server"
  node scripts/importChat.js "$2" --clear
  echo "=== 附加:重建 FTS5 紹索引 ==="
  node scripts/buildFtsIndex.js
  echo "✓ 数据导入 + 索引重建完成"
fi

echo ""
echo "=== 部署完成 ==="
echo "访问: https://www.nandexueyuan.top"
