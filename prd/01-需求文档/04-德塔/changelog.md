# 德塔（NDO）Changelog

> 倒序排列，最新在最上方。涵盖游戏前端、游戏后端、Vue 桥接层。

---

## 2026-07-14

### #18 昵称修复（JWT 不含 nickname，改用 options.nickname）
- [修改] `game-server/src/rooms/WorldRoom.js` — onJoin 优先使用客户端传来的 `options.nickname`，而非 JWT payload
- commit: 未提交

### #17 多人同步修复（Schema type() → defineTypes + onStateChange diff）
- [修改] `game-server/src/schema/PlayerState.js` — `type()` 改为 `defineTypes()`（schema 3.x 正确 API）
- [修改] `game-server/src/schema/WorldState.js` — 同上
- [修改] `game/systems/NetworkSystem.js` — 移除无效的 `onAdd/onChange/onRemove` 回调，改用 `room.onStateChange` + diff 算法
- [修改] `game-server/src/rooms/WorldRoom.js` — 增加 state.players.size 日志
- [修改] `game/scenes/WorldScene.js` — 世界尺寸固定 3200x700，云树硬编码位置
- commit: 未提交

### #16 地图种子固定化（修复多人同步地图不一致）
- [修改] `game/scenes/WorldScene.js` — 世界尺寸固定 3200x700，groundY 固定 636，不随浏览器变化
- [修改] `game/scenes/WorldScene.js` — 云朵 6 朵硬编码位置 + 固定 scale
- [修改] `game/scenes/WorldScene.js` — 树木 6 棵硬编码位置
- [修改] `game/scenes/WorldScene.js` — 新增 `physics.world.setBounds` / `cameras.setBounds` 固定世界边界
- commit: 未提交

### #15 聊天框逻辑修复 + 小地图坐标修复
- [修改] `src/views/GameView.vue` — Enter/Esc/Tab 均发送内容并关闭聊天框
- [修改] `game/main.js` — enableKeyboard 设置 chatCooldown 冷却时间戳到 registry
- [修改] `game/scenes/WorldScene.js` — Enter 处理加 400ms 冷却检查防重开
- [修改] `game/scenes/WorldScene.js` — emitPosition 传递实际 groundY（动态值）
- [修改] `src/views/GameView.vue` — drawMinimap 用实际 groundY + 偏移量计算，垂直范围固定 640px
- commit: 未提交

### #14 暗面UI重构 + 聊天气泡升级
- [修改] `src/views/GameView.vue` — 暗面四模块布局：角色信息(灰色底) | 背包(暗橙金属格子) | 聊天(亮色底) | 小地图(棕色边框+发光)
- [修改] `src/views/GameView.vue` — 聊天 Enter 发送不关闭，Esc/Tab 关闭，移除 10s 自动清空
- [修改] `game/scenes/WorldScene.js` — 聊天气泡改为 container + 箭头三角形，每帧跟随角色，6s 后 2s 渐变消失
- [修改] `game/systems/NetworkSystem.js` — 其他玩家聊天气泡同步跟随+渐变
- [修改] `game/systems/NetworkSystem.js` — 其他玩家从 staticImage 改为普通 image（修复位置不刷新）
- commit: 未提交

### #13 Colyseus 多人同步搭建
- [新增] `game-server/src/index.js` — Colyseus Server 启动入口（:2567）
- [新增] `game-server/src/rooms/WorldRoom.js` — 世界房间：join/leave/move/chat + JWT 验证
- [新增] `game-server/src/schema/PlayerState.js` — 玩家状态 Schema（x/y/nickname/facing/anim）
- [新增] `game-server/src/schema/WorldState.js` — 世界状态 Schema（players MapSchema）
- [新增] `game-server/src/lib/auth.js` — JWT 验证（复用 Express 密钥）
- [新增] `game/systems/NetworkSystem.js` — 前端 Colyseus 客户端（连接/同步/其他玩家渲染）
- [修改] `game/scenes/WorldScene.js` — 集成 NetworkSystem，连接/位置同步/聊天广播
- [修改] `game/main.js` — sendChatMessage 路由到 WorldScene
- [新增] `prd/01-需求文档/04-德塔/04-技术方案/Colyseus多人同步部署方案.md` — 部署方案文档
- 依赖: `colyseus@0.16.0`, `@colyseus/schema@3.0.76`, `colyseus.js@0.16.0`, `jsonwebtoken`
- commit: 未提交

### #12 管理后台开发
- [新增] `src/api/admin.js` — 管理 API（成员列表/禁用启用/重置密码/角色变更）
- [新增] `src/api/inviteCode.js` — 邀请码 API（生成/列表）
- [新增] `src/views/AdminView.vue` — 管理后台页面（双 Tab：成员管理 + 邀请码管理）
- [修改] `src/router/index.js` — 新增 `/admin` 路由 + `requiresAdmin` 角色守卫
- [修改] `src/views/MainView.vue` — 导航栏「男通讯录」入口（admin+ 可见）
- commit: 未提交

### #11 世界观更新 + 测试账号 + 文档
- [修改] `prd/01-需求文档/00-基础数据/世界观.md` — V2 修订：德塔=学院在异世界建造的塔楼据点，传送门+三层架构+远域
- [新增] 测试账号 `testuser` / `test123456`
- [修改] `prd/01-需求文档/04-德塔/01-需求/MVP需求文档.md` — 实施状态表 + 架构变更记录
- [修改] `prd/01-需求文档/04-德塔/04-技术方案/架构设计.md` — V2 更新：底部面板/EventBus/P0 完成
- [修改] `prd/01-需求文档/04-德塔/04-技术方案/开发路线与占位策略.md` — V2：P0 完成
- commit: 未提交

### #10 产品需求更新
- [修改] `prd/01-需求文档/04-德塔/01-需求/MVP需求文档.md` — 新增 F9 位置记忆、F10 聊天系统、F11 大门彩蛋、F12 HUD、F13 角色创建
- [修改] `prd/01-需求文档/04-德塔/02-设计/美术设计规范.md` — 更新 HUD 布局、地图、角色信息面板
- commit: 未提交

---
## 2026-07-13

### #9 P0 地图+角色+移动+HUD 开发
- [新增] `game/config.js` — Phaser 配置（Scale.RESIZE 全屏、arcade 物理）
- [新增] `game/main.js` — 游戏生命周期 + 键盘启停 + 聊天接口
- [新增] `game/events.js` — Phaser ↔ Vue 事件总线
- [新增] `game/scenes/BootScene.js` — 启动场景
- [新增] `game/scenes/PreloadScene.js` — 色块占位纹理
- [新增] `game/scenes/WorldScene.js` — 三层塔楼地图 + 角色 + 物理 + 交互检测 + 聊天气泡
- [新增] `game/objects/Player.js` — 玩家角色（WASD 移动 + 跳跃 + 昵称显示）
- [新增] `game/systems/InputSystem.js` — 键盘输入（WASD/方向键/空格/E 交互）
- [新增] `game/mapData.js` — 地图布局数据
- [新增] `src/views/GameView.vue` — 博德之门3风格底部面板（角色信息/聊天/小地图）
- [修改] `src/router/index.js` — `/nde` 路由
- [修改] `src/views/MainView.vue` — 导航栏「德塔」入口
- [修改] `vite.config.js` — 端口改为 4396
- 依赖: `phaser@4.2.1`
- commit: 未提交

### #8 技术方案文档
- [新增] `prd/01-需求文档/04-德塔/04-技术方案/技术栈选型.md` — Phaser/Colyseus/Tiled 选型
- [新增] `prd/01-需求文档/04-德塔/04-技术方案/架构设计.md` — 整体架构 + Vue↔Phaser 通信
- [新增] `prd/01-需求文档/04-德塔/04-技术方案/目录结构规范.md` — 完整目录树
- [新增] `prd/01-需求文档/04-德塔/04-技术方案/开发路线与占位策略.md` — 色块占位 + P0-P5 计划
- [新增] `game/`、`game-server/`、`shared/`、`public/game/` 目录结构
- [新增] `shared/constants.js` — 地图/物理/交互/网络常量
- [新增] `shared/npcs.js` — NPC + 物品配置
- [新增] `game-server/package.json` — 独立依赖
- commit: 未提交

### #7 前期调研 + 需求文档
- [新增] `prd/01-需求文档/04-德塔/01-需求/MVP需求文档.md` — MVP 需求（F1-F8）
- [新增] `prd/01-需求文档/04-德塔/02-设计/美术设计规范.md` — 像素风规范
- [新增] `prd/01-需求文档/04-德塔/02-设计/Logo设计说明.md` — Logo 设计
- [新增] `prd/01-需求文档/04-德塔/03-调研/泰拉瑞亚模块调研.md` — 参考调研
- commit: 未提交