# 德塔（NDO）Changelog

> 倒序排列，最新在最上方。涵盖游戏前端、游戏后端、Vue 桥接层。

---

### [文档更新] ComfyUI 像素风生图工作流调研完成

- **时间**：2026-07-16
- **变更人**：陈梓键
- **背景**：德塔 P5 美术资源替换需要黑机 ComfyUI 生图，需明确工作流搭建方案、模型选择、抠图方案
- **变更内容**：
  - 新建调研文档 `prd/01-需求文档/04-德塔/03-调研/comfyui-pixel-art-generation-workflow.md`
  - 确定三个工作流：场景贴图（SDXL+Pixel-Art LoRA）、角色精灵表（+ControlNet OpenPose）、二次元立绘（Illustrious XL）
  - 抠图方案：BiRefNet（ComfyUI 内置），不用 RemBG
  - 立绘画风从像素风改为二次元美少女画风
  - 工作流 JSON 存放 `.ai/comfyui-workflows/`（gitignore）
  - 混合搭建模式：用户导出空工作流 JSON -> AI 读取扩展 -> 用户拖入 ComfyUI
- **影响范围**：德塔 P5 美术资源替换、黑机 ComfyUI 工作流搭建
- **验证方式**：黑机实际搭建工作流后出图验证

## #25 聊天框显示所有人消息 + 时间戳前缀

- **日期**：2026-07-15
- **变更内容**：
  1. `game/systems/NetworkSystem.js` — 收到服务器广播的 `chat` 消息时 `emit('chat-received')` 给 Vue 层
  2. `src/views/GameView.vue` — 移除本地 push，统一由 `chat-received` 事件处理（自己发的也等服务器广播回来）
  3. `src/views/GameView.vue` — 每条消息加时间戳前缀，格式：`【2026/7/15 17:30:30】昵称：内容`
- **影响范围**：多人聊天可见性、消息格式
- commit: `fbbe785`（已部署到生产环境）

---

## #24 聊天框空内容 Enter/Esc/Tab 死锁修复

- **日期**：2026-07-15
- **变更内容**：
  1. `src/views/GameView.vue` — Enter + 空内容直接 `closeChat()`，不再调用 `handleChatSend()`
  2. `src/views/GameView.vue` — Esc/Tab 直接 `closeChat()`，不再调用 `handleChatSend()`
- **影响范围**：聊天框关闭逻辑
- commit: `73db13e`（已部署到生产环境）

---

## #23 两机协作规则更新 + .trae 目录优化 + bug-log 补全

- **日期**：2026-07-15
- **变更内容**：
  1. `.trae/rules/two-machine-collab.md` 全面重写：白机也可合并 PR + push master + SSH 部署，两机能力对等
  2. `.trae/rules/deploy-discipline.md` 新增部署流程模板（构建→SSH→拉代码→安装依赖→重启→验证）
  3. `.trae` 目录结构优化：`.rules` → `rules`，`.skills` → `skills`
  4. `.gitignore` 新增 `askpass.bat`
  5. `prd/01-需求文档/04-德塔/bug-log.md` 补充 BUG-14~19 记录
  6. `prd/05-开发规范/ai-collab.md`、`git-manage.md` 同步 `.trae` 路径引用
- **影响范围**：开发规范、双机协作流程
- commit: `9330170`

---

## #22 页签切换清理 + 聊天 Enter 修复 + JWT 运行时读取

- **日期**：2026-07-15
- **变更内容**：
  1. `game/scenes/WorldScene.js` — 移除错误的 `visibilitychange` 监听，改用 `shutdown` + `destroy` 双重事件处理 Vue 路由切换时的网络清理
  2. `game/scenes/WorldScene.js` — 删除 `keydown-Enter` 监听，改用 `InputSystem.keyEnter.justDown` 在 `update()` 中检测 Enter 打开聊天
  3. `game/systems/NetworkSystem.js` — `disconnect()` 新增清理 `knownPlayers.clear()` + `stateReady = false`，确保重连后 diff 正确
  4. `game/main.js` — `destroyGame()` 添加日志
  5. `game-server/src/lib/auth.js` — `const SECRET` 改为 `function getSecret()` 运行时读取，修复 ESM 模块导入顺序导致的 JWT 密钥回退
- **影响范围**：Vue 路由切换 → Phaser 清理链、Enter 聊天键、JWT 验证
- commit: `45156b3`（已部署到生产环境）

---

## #21 生产环境首次部署 game-server + 多人同步修复

- **日期**：2026-07-15
- **变更内容**：
  1. `game-server/src/index.js` 添加 dotenv，加载 `server/.env` 确保 JWT_SECRET 一致
  2. `game-server/package.json` 新增 `dotenv` 依赖
  3. `deploy.sh` 从 7 步扩展到 9 步，新增 game-server 安装 + PM2 启动
  4. `deploy.sh` 中 Express 改为 `--cwd server` 启动，正确加载 `server/.env`
  5. deploy.sh 全部从 pnpm 改为 npm（与黑机切换一致）
  6. 服务器 Nginx 新增 `/ws` WebSocket 代理配置（`proxy_pass http://127.0.0.1:2567/;`）
- **影响范围**：生产部署流程、Colyseus 多人同步、JWT 密钥一致性
- commit: `eb5772c` + `2586e83`

---

## #20 修复生产环境多人同步 + 部署脚本完善

- **日期**：2026-07-15
- **变更内容**：
  1. `game-server/src/index.js` 添加 dotenv，加载 `server/.env` 确保 JWT_SECRET 一致
  2. `game-server/package.json` 新增 `dotenv` 依赖
  3. `deploy.sh` 从 7 步扩展到 9 步，新增 game-server 安装 + PM2 启动
  4. deploy.sh 全部从 pnpm 改为 npm（与黑机切换一致）
- **影响范围**：生产部署流程、Colyseus 多人同步
- **服务器待办**：Nginx 需手动添加 `/ws` WebSocket 代理配置

---

## #19 修复按 E 无法交互（线上）

- **日期**：2026-07-15
- **变更**：`WorldScene.update()` 中调换 `checkInteraction()` 和 `inputSystem.update()` 执行顺序
- **原因**：`inputSystem.update()` 会重置 `_eJustDown = false`，若在 `checkInteraction()` 之前执行，E 键的 justDown 永远检测不到
- **影响**：NPC 对话、物品查看、大门彩蛋全部恢复正常

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