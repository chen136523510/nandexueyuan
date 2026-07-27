# 男德学院

> 朋友圈限定社区（约 20 人）-- 带德塔虚拟世界和师德墙的 Web 平台

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Vue](https://img.shields.io/badge/Vue-3.x-brightgreen)](https://vuejs.org/)
[![Phaser](https://img.shields.io/badge/Phaser-4.x-orange)](https://phaser.io/)
[![License](https://img.shields.io/badge/license-Private-red)](./LICENSE)

线上地址：https://www.nandexueyuan.top

## 这是什么

男德学院是一个面向朋友圈的限定社区平台。除了常规的 Web 功能（认证、管理后台、AI 问答），核心亮点是一个名为「德塔」的 2D 虚拟世界——成员可以操作角色探索塔楼地图、与 NPC 交互、战斗打怪，并能实时看到其他在线成员并聊天。德塔正在从横版像素风向**等距俯视角 + 分层美术方案**（立绘/漫画=美漫厚涂，精灵=Q版/低分辨率）重构。

## 快速开始

```bash
# 安装依赖（三个子项目）
npm install && cd server && npm install && cd ../game-server && npm install && cd ..

# 配置环境变量
cp server/.env.example server/.env   # 编辑填入 JWT_SECRET 和 DATABASE_URL

# 启动（需三个终端）
npm run dev                          # 终端 1：前端 -> localhost:4396
cd server && npm run dev             # 终端 2：API 后端 -> localhost:3000
cd game-server && npm run dev        # 终端 3：游戏后端 -> localhost:2567
```

## 功能

- 用户认证 —— 注册、登录、JWT 鉴权
- 管理后台 —— 成员管理、角色变更、邀请码生成
- 师德墙 —— 横向画展式社交动态墙，图文动态、评论、点赞
- 德塔虚拟世界 —— 2D 侧视角、塔楼地图、WASD 移动 + 跳跃（正在重构为等距俯视角）
- 战斗系统 —— 鼠标攻击、追击型怪物（虚空史莱姆）、服务端权威 HP/死亡复活
- 多人实时同步 —— 位置、动画、聊天气泡实时同步
- NPC / 物品交互 —— 按 E 触发对话、查看物品、大门彩蛋
- 公共聊天 —— 带时间戳的消息广播，所有在线成员可见
- AI 问答 —— 基于知识库的智能问答（多 Agent 协作检索 + 黑机外包算力）
- 版本公告 —— 语义化版本管理 + 变更日志 + 未来规划

## 技术栈

| 层 | 技术 | 端口 |
|---|------|------|
| 前端 | Vue 3 + Vite 6 + Pinia | 4396 |
| 游戏前端 | Phaser 4 | - |
| 游戏后端 | Colyseus 0.16 | 2567 |
| API 后端 | Express + Prisma | 3000 |
| 数据库 | SQLite | - |
| 部署 | Nginx + PM2（阿里云 ECS） | - |

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `JWT_SECRET` | JWT 签名密钥（Express 和 game-server 共用） | - |
| `DATABASE_URL` | Prisma 数据库连接 | `file:./dev.db` |
| `BLACK_WORKER_TOKEN` | 黑机 WS 检索算力鉴权 token | - |
| `CLOUD_WS_URL` | 黑机连接云端的 WS Hub 地址 | - |

## 项目结构

```
nandexueyuan/
├── src/                    # Vue 前端
│   ├── views/              # 页面组件（11 个视图）
│   ├── api/                # 后端 API 封装
│   ├── components/         # 公共组件（TopBar/NdeSettings/ProfileDialog 等）
│   ├── stores/             # Pinia 状态管理
│   ├── router/             # 路由配置
│   └── styles/             # 全局样式 + 设计令牌
├── game/                   # Phaser 游戏前端
│   ├── scenes/             # 场景（Boot, Preload, World）
│   ├── systems/            # 系统（Input, Network）
│   └── objects/            # 游戏对象（Player）
├── game-server/            # Colyseus 多人游戏后端
│   └── src/
│       ├── rooms/          # 房间逻辑（WorldRoom）
│       ├── schema/         # 状态同步 Schema（PlayerState/MonsterState/WorldState）
│       ├── commands/       # 命令处理
│       └── lib/            # JWT 验证
├── server/                 # Express API 后端
│   ├── src/
│   │   ├── controllers/    # 控制器（auth/chat/wall/announcement 等）
│   │   ├── routes/         # 路由聚合
│   │   ├── middleware/      # 中间件（auth, errorHandler, rateLimit）
│   │   ├── utils/          # 工具（jwt, password, llm, knowledge 等）
│   │   └── agents/         # AI 检索 Agent（orchestrator + 6 个子 Agent）
│   ├── prisma/             # 数据库 Schema + 迁移 + 种子脚本
│   └── uploads/            # 师德墙图片上传目录
├── shared/                 # 前后端共享常量（constants/monsters/npcs/avatars）
├── pm/                     # 项目管理（ROADMAP + 需求池）
├── prd/                    # 产品需求文档
├── public/                 # 静态资源
└── deploy.sh               # 一键部署脚本
```

## 部署

```bash
bash deploy.sh
```

部署脚本会自动：构建前端 -> 安装依赖 -> 启动/重启 Express 和 game-server（通过 PM2）。

## License

Private - 本项目为朋友圈内部使用，不对外开源。
