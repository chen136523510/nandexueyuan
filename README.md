# 南德学院

> 朋友圈限定社区（约 20 人），Web 端 + 2D 虚拟世界「德塔」

线上地址：https://www.nandexueyuan.top

## 技术栈

| 层 | 技术 | 说明 |
|---|------|------|
| 前端 | Vue 3 + Vite 6 + Pinia | SPA，端口 4396 |
| 游戏前端 | Phaser 4 | 2D 侧视角像素风虚拟世界 |
| 游戏后端 | Colyseus 0.16 | 多人实时同步，端口 2567 |
| API 后端 | Express + Prisma | JWT 鉴权，端口 3000 |
| 数据库 | SQLite | Prisma ORM |
| 部署 | Nginx + PM2 | 阿里云 ECS |

## 项目结构

```
nandexueyuan/
├── src/                # Vue 前端
│   ├── views/          # 页面（MainView, GameView, AdminView 等）
│   ├── api/            # API 封装
│   ├── stores/         # Pinia 状态
│   └── router/         # 路由
├── game/               # Phaser 游戏前端
│   ├── scenes/         # 场景（Boot, Preload, World）
│   ├── systems/        # 系统（Input, Network）
│   └── objects/        # 游戏对象
├── game-server/        # Colyseus 游戏后端
│   └── src/
│       ├── rooms/      # 房间逻辑（WorldRoom）
│       ├── schema/     # 状态同步 Schema
│       └── lib/        # JWT 验证
├── server/             # Express API 后端
│   ├── src/
│   │   ├── controllers/ # 控制器
│   │   ├── routes/     # 路由
│   │   ├── middleware/  # 中间件
│   │   └── utils/      # 工具
│   └── prisma/         # 数据库 Schema + 迁移
├── shared/             # 前后端共享常量
├── public/             # 静态资源
└── prd/                # 产品需求文档
```

## 快速开始

### 环境要求

- Node.js >= 18
- npm（本项目统一使用 npm，不使用 pnpm）

### 安装

```bash
# 前端
npm install

# API 后端
cd server && npm install

# 游戏后端
cd game-server && npm install
```

### 配置

在 `server/` 目录下创建 `.env`：

```env
JWT_SECRET=your-secret-here
DATABASE_URL="file:./dev.db"
```

### 启动

```bash
# 前端（终端 1）
npm run dev

# API 后端（终端 2）
cd server && npm run dev

# 游戏后端（终端 3）
cd game-server && npm run dev
```

前端访问 http://localhost:4396

### 部署

```bash
bash deploy.sh
```

## 核心功能

- 用户认证（注册/登录/JWT）
- 德塔虚拟世界（地图探索/角色移动/NPC 交互/物品交互）
- 多人实时同步（位置/动画/聊天）
- 聊天系统（公共聊天框 + 时间戳）
- 管理后台（成员管理/邀请码）
- AI 知识库问答
