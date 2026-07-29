# 男德学院

> 朋友圈限定社区（约 20 人）-- 带师德墙、AI 问答和 Galgame 叙事体验的 Web 平台

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Vue](https://img.shields.io/badge/Vue-3.x-brightgreen)](https://vuejs.org/)
[![License](https://img.shields.io/badge/license-Private-red)](./LICENSE)

线上地址：https://www.nandexueyuan.top

## 这是什么

男德学院是一个面向朋友圈的限定社区平台。除了常规的 Web 功能（认证、管理后台、AI 问答、师德墙），还有一个名为「德塔」的核心模块 -- 一个基于世界观设定集（黑深残×戏谑反差，118 年正史）的 Galgame 叙事引擎，支持立绘对话、分支选项、好感度系统和服务端存档。

## 快速开始

```bash
# 安装依赖
npm install && cd server && npm install && cd ..

# 配置环境变量
cp server/.env.example server/.env   # 编辑填入 JWT_SECRET 和 DATABASE_URL

# 数据库迁移
cd server && npx prisma db push && cd ..

# 启动（需两个终端）
npm run dev                          # 终端 1：前端 -> localhost:4396
cd server && npm run dev             # 终端 2：API 后端 -> localhost:3000
```

## 功能

- 用户认证 -- 注册、登录、JWT 鉴权
- 管理后台 -- 成员管理、角色变更、邀请码生成
- 师德墙 -- 横向画展式社交动态墙，图文动态、评论、点赞
- 德塔 Galgame -- Vue3 自研叙事引擎，立绘对话、打字机效果、选项分支、好感度系统、服务端存档
- 公共聊天 -- 带时间戳的消息广播，所有在线成员可见
- AI 问答 -- 基于知识库的智能问答（多 Agent 协作检索 + 黑机外包算力）
- 版本公告 -- 语义化版本管理 + 变更日志 + 未来规划

## 技术栈

| 层 | 技术 | 端口 |
|---|------|------|
| 前端 | Vue 3 + Vite 6 + Pinia | 4396 |
| API 后端 | Express + Prisma | 3000 |
| 数据库 | SQLite | - |
| 部署 | Nginx + PM2（阿里云 ECS） | - |

> 原 Phaser 游戏前端 + Colyseus 多人后端已废弃保留，不启动。

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
│   ├── views/              # 页面组件（NdeGalgameView 等）
│   ├── api/                # 后端 API 封装
│   ├── components/         # 公共组件（TopBar/ProfileDialog 等）
│   ├── stores/             # Pinia 状态管理
│   ├── router/             # 路由配置
│   ├── styles/             # 全局样式 + 设计令牌
│   └── galgame/            # Galgame 引擎模块
│       ├── engine/         # 剧本引擎核心（节点解析/跳转/条件判断）
│       ├── components/     # Galgame 组件（对话框/立绘/选项/存档/设置等）
│       ├── stores/         # galgameStore（状态 + 存档/进度 API 对接）
│       └── data/           # 剧本数据（prologue.js 等）
├── server/                 # Express API 后端
│   ├── src/
│   │   ├── controllers/    # 控制器（auth/chat/wall/galgame/announcement 等）
│   │   ├── routes/         # 路由聚合
│   │   ├── middleware/      # 中间件（auth, errorHandler, rateLimit）
│   │   ├── utils/          # 工具（jwt, password, llm, knowledge 等）
│   │   └── agents/         # AI 检索 Agent（orchestrator + 6 个子 Agent）
│   ├── prisma/             # 数据库 Schema + 迁移 + 种子脚本
│   └── uploads/            # 师德墙图片上传目录
├── shared/                 # 前后端共享常量
├── pm/                     # 项目管理（ROADMAP + 需求池）
├── prd/                    # 产品需求文档
├── public/                 # 静态资源
├── game/                   # [已废弃] 原 Phaser 游戏前端
├── game-server/            # [已废弃] 原 Colyseus 多人后端
└── deploy.sh               # 一键部署脚本
```

## 部署

```bash
bash deploy.sh
```

部署脚本会自动：构建前端 -> 安装依赖 -> 启动/重启 Express 和 game-server（通过 PM2）。

## License

Private - 本项目为朋友圈内部使用，不对外开源。
