# Colyseus 多人同步部署方案

> 版本：V1 | 日期：2026-07-14 | 状态：决策已确认，待实施

---

## 1. 决策背景

### 1.1 需求

德塔（NDO）需要多人同步功能：两个浏览器用不同账号进入德塔，互相可见对方位置和移动。

### 1.2 选型记录

| 方案 | 评估 | 结论 |
|------|------|------|
| Colyseus | 权威服务器框架，Node.js 原生，房间管理/状态同步/delta encoding 开箱即用 | **选用** |
| Socket.io | 通用实时通信库，需自行实现状态同步/房间/匹配 | 不选用（开发量过大） |
| 原生 WebSocket | 底层传输，需从零实现游戏同步协议 | 不选用 |

> 选型依据详见 [技术栈选型.md](./技术栈选型.md)

---

## 2. 核心问题：本地测试是否等于生产成功？

**答案：否。本地通过约等于 90% 确认，但生产部署有额外工作。**

### 2.1 本地可验证的（90%）

- 状态同步协议（position/delta encoding）
- 房间管理（join/leave/broadcast）
- 位置广播 + 客户端渲染
- 玩家进出通知
- JWT 认证校验逻辑

### 2.2 生产额外需要处理的（10%）

| 项目 | 说明 |
|------|------|
| Nginx WebSocket 反代 | `/ws` → Colyseus :2567，需要 Upgrade 头 |
| 端口开放 | 服务器防火墙开放 2567 端口（或走 443 复用） |
| PM2 双进程管理 | Express :3000 + Colyseus :2567 |
| 生产环境变量 | COLYSEUS_PORT、JWT_SECRET 等 |
| 部署脚本更新 | deploy.sh 增加 Colyseus 启动步骤 |

### 2.3 结论

**先在本地把同步逻辑跑通，部署时加一段 Nginx 配置 + 启动 Colyseus 进程即可。**

---

## 3. 架构

### 3.1 本地开发架构

```
Chrome 浏览器（testuser）       Edge 浏览器（chenzijian）
  │                                │
  │ WebSocket :2567                │ WebSocket :2567
  ▼                                ▼
  game-server/ (Colyseus :2567)
  └── WorldRoom
       ├── onJoin(players[testuser])
       ├── onJoin(players[chenzijian])
       └── 每 50ms patch → 所有客户端
```

### 3.2 生产部署架构

```
浏览器1/浏览器2 → Nginx :443
                    ├─ /api  → Express :3000（现有）
                    └─ /ws   → Colyseus :2567（新增）
```

### 3.3 Nginx 配置（新增）

```nginx
# /etc/nginx/conf.d/nandexueyuan.conf 追加

# Colyseus WebSocket 反代
location /ws {
    proxy_pass http://127.0.0.1:2567;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 86400s;
}
```

### 3.4 PM2 配置（更新）

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'nandexueyuan-api',
      script: 'server/src/index.js',
      env: { PORT: 3000, NODE_ENV: 'production' },
    },
    {
      name: 'nandexueyuan-game',
      script: 'game-server/src/index.js',
      env: { COLYSEUS_PORT: 2567, NODE_ENV: 'production', JWT_SECRET: 'xxx' },
    },
  ],
}
```

---

## 4. 实施步骤

### 4.1 本地开发步骤

```bash
# 1. 安装依赖
cd game-server
pnpm install --ignore-workspace

# 2. 启动 Colyseus
pnpm start    # 或 node src/index.js

# 3. 前端安装 Colyseus Client
cd ..
pnpm add colyseus.js

# 4. 创建 NetworkSystem.js
# 5. 创建 WorldRoom.js
# 6. 测试：Chrome + Edge 双浏览器
```

### 4.2 生产部署步骤

```bash
# 1. 推送代码到服务器
git push

# 2. 服务器拉取
git pull

# 3. 安装 game-server 依赖
cd game-server && pnpm install --ignore-workspace

# 4. 更新 Nginx 配置
sudo vim /etc/nginx/conf.d/nandexueyuan.conf
sudo nginx -t && sudo nginx -s reload

# 5. 更新 PM2 配置
pm2 delete nandexueyuan-api
pm2 start ecosystem.config.js
pm2 save
```

---

## 5. 前后端依赖

### 5.1 前端（根目录）

```bash
pnpm add colyseus.js
```

### 5.2 后端（game-server/）

已在 `game-server/package.json` 中定义：
- `colyseus` ^0.15.0
- `@colyseus/ws-transport` ^0.15.0

---

## 6. 风险评估

| 风险 | 影响 | 应对 |
|------|------|------|
| WebSocket 连接被防火墙阻断 | 无法同步 | 走 Nginx 443 复用，不直接暴露 2567 |
| JWT 跨服务验证失败 | 无法加入房间 | game-server 与 server 共享 JWT_SECRET |
| Colyseus 版本不兼容 | 运行时错误 | 锁定版本号，本地先跑通 |
| 服务器内存不足 | 服务崩溃 | 2 核 2G 对 30 人绰绰有余 |

---

## 7. 参考资源

| 资源 | 链接 |
|------|------|
| Colyseus 官方文档 | https://docs.colyseus.io/ |
| Phaser + Colyseus 模板 | https://github.com/colyseus/phaser3-colyseus |
| Nginx WebSocket 代理 | https://nginx.org/en/docs/http/websocket.html |