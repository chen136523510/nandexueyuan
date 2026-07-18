# 德塔（NDO）Bug Log

> 倒序排列，最新在最上方。记录开发过程中遇到的 bug 及修复方式。

---

## 2026-07-18（黑机 P5 美术 + 场景瓦片接入）

---

### BUG-24：ComfyUI 绘世启动器覆盖 output_directory 配置

- **现象**：在 `preference.json` 的 `args` 里加了 `output_directory` 指向项目目录，重启 ComfyUI 后配置被还原
- **根因**：绘世启动器在关闭时用自己的内存状态覆盖 `preference.json`，不认识手动加的键
- **应对**：放弃改配置，改为 AI 直接读 ComfyUI 默认 output 目录（`E:/ai/ComfyUI-aki(1)/ComfyUI-aki-v3/ComfyUI/output/`），验证后手动复制到项目
- **教训**：整合包的启动器配置文件不能直接手改，得通过启动器 UI 设置；或用 ComfyUI 原生命令行启动绕过启动器

---

### BUG-23：角色坐标系调试失败，玩家掉入虚空（已回退）

- **现象**：接入男德通像素精灵后，调整玩家/NPC 坐标到 64px 高（2 格）规范，玩家出生后直接掉入虚空
- **根因**：
  1. 第一版用 `body.setOffset(0, -16)` 把物理 body 推到 sprite 上方，导致下落时 body 错过草地碰撞体
  2. 第二版改用 `setOrigin(0.5, 1)` 脚底对齐 + 传入脚底 Y 坐标，仍异常（具体机制未定位，可能 Phaser 4 的 body 与 origin 配合有坑）
- **失败调试**：加了 console.log 打印出生点和 groundY，但未深挖 Phaser 4 physics body 与 sprite origin 的精确关系
- **应对**：回退 `Player.js` 和 `WorldScene.js` 到 `ff28d79`（色块稳定状态），美术资源只入库不接入
- **教训**：
  1. 色块时代坐标都是凑合的，换真实素材后问题集中爆发，不应逐个素材调
  2. 应等所有美术资源（瓦片+角色）就绪后，一次性设计坐标系规范（参考 ADR-002）
  3. Phaser 4 的 Arcade physics body 与 sprite origin 配合需要专门验证，不能想当然
- **状态**：已回退，待场景瓦片接入后重新设计（见 ADR-002）

---

### BUG-22：男德通统计查询把时间戳当字符串，误报"只有 2022 年 7 月数据"

- **现象**：问男德通数据时间分布，回复"非空记录只有 2022-07-11、12 两天"；实际库内 2022~2026 共 5 年 51 万条数据完好
- **根因**：`group_messages.msgTime` 存的是 **Unix 毫秒时间戳整数**（如 `1657524075000` 表示 2022-07-11），但 `chatController.js` 的 SQL 生成 prompt 把它误描述为 `'YYYY-MM-DD HH:MM:SS'` 字符串。LLM 据此生成 `substr(msgTime,1,N)` 字符串切片——而毫秒戳前缀 `1657524xxx` 恰好只落在 2022-07-11~12 两天，形成"只有那两天"的精确假象（不是随机错误，是数值前缀的必然结果）
- **修复**：`server/src/controllers/chatController.js` 两处 prompt（L96 分析段、L128 SQL 生成段）——字段说明改为"Unix 毫秒时间戳整数"，并补 `datetime(msgTime/1000,'unixepoch','localtime')` 转换示例与按年/月统计模板
- **验证**：实测按年份统计正确分布，覆盖 2022~2026 全 5 年
- **教训**：让 LLM 生成 SQL，prompt 中的字段格式描述必须与真实存储一致；时间戳字段务必给出转换函数，否则 LLM 会按"想当然"的字符串格式处理
- **状态**：已修复，已推送，待部署

---

## 2026-07-15（生产环境部署 + 多人同步修复）

---

### BUG-21：聊天框只显示自己消息，看不到别人发的

- **现象**：两个设备进入德塔，A 发消息只有 A 自己的聊天框能看到，B 完全收不到
- **根因**：
  1. `NetworkSystem` 收到服务器广播的 `chat` 消息时没有 `emit` 给 Vue 层，消息被丢弃
  2. 自己发送的消息在 `GameView` 中直接本地 `push`，而非通过服务器广播回来统一处理
- **修复**：
  1. `NetworkSystem` 收到 `chat` 消息时 `emit('chat-received', { nickname, text })` 给 Vue
  2. `GameView` 移除本地 push，统一由 `chat-received` 事件处理（自己发的也等服务器广播回来）
  3. 每条消息加时间戳前缀，格式：`【2026/7/15 17:30:30】昵称：内容`
- **文件**：`game/systems/NetworkSystem.js`、`src/views/GameView.vue`
- **状态**：已修复

---

### BUG-20：聊天框空内容按 Enter 无法关闭（Esc/Tab 也不行）

- **现象**：按 Enter 打开聊天框后，不输入任何内容再按 Enter 无法关闭，Esc 和 Tab 键也无法关闭，聊天框死锁
- **根因**：`handleChatKeydown` 无论 Enter/Esc/Tab 都调用 `handleChatSend()`，但 `handleChatSend()` 在内容为空时 `return` 不执行 `closeChat()`，导致聊天框无法关闭
- **修复**：
  1. Enter + 空内容 -> 直接 `closeChat()`
  2. Esc/Tab -> 直接 `closeChat()`，不再调用 `handleChatSend()`
- **文件**：`src/views/GameView.vue`
- **状态**：已修复

---

### BUG-19：切换页签留残影 + 聊天 Enter 无反应

- **现象**：
  1. 从德塔切到主页（Vue 路由切换），德塔中留下角色残影，再次进入会重新生成角色
  2. 按 Enter 键无法打开聊天框
- **根因**：
  1. Vue 路由切换时 Phaser 场景的 `shutdown` 事件未被正确处理，WebSocket 连接保持，角色残留在服务器
  2. `this.input.keyboard.on('keydown-Enter')` 在 Phaser 4 不生效，InputSystem 已捕获 Enter 但 WorldScene 没用它
- **修复**：
  1. ~~监听 `document.visibilitychange`~~ -> **已废弃**：visibilitychange 是浏览器 tab 级别事件，不适用于 Vue 路由切换
  2. **正确方案**：Vue `onUnmounted` -> `destroyGame()` -> `game.destroy(true)` -> Phaser scene `shutdown` + `destroy` 事件 -> `network.disconnect()`。双重注册确保至少触发一次
  3. `NetworkSystem.disconnect()` 清理 `knownPlayers` + `stateReady`，重连后 diff 正确
  4. 删除 `keydown-Enter` 监听，改用 `InputSystem.keyEnter.justDown` 在 `update()` 中检测
- **文件**：`game/scenes/WorldScene.js`、`game/main.js`、`game/systems/NetworkSystem.js`
- **教训**：
  1. Phaser 4 键盘事件 API 与 3.x 不同，统一用 InputSystem 的 `keydown` + `event.key` 方式
  2. 切换场景的正确清理链是组件卸载 -> 游戏销毁 -> 场景事件，不要混用 DOM 级别事件
- **状态**：已修复

---

### BUG-18：JWT 密钥运行时读取（ESM 模块导入顺序）

- **现象**：Express 和 game-server 的 JWT_SECRET 都来自同一个 `server/.env`，但 game-server 验证始终 `invalid signature`
- **根因**：ESM 模块的 import 是提升的（hoisted），`auth.js` 中的 `const SECRET = process.env.JWT_SECRET || 'change-me-in-production'` 在 `index.js` 的 `dotenv.config()` 执行之前就已求值，SECRET 永远是回退值
- **修复**：把 `const SECRET` 改成 `function getSecret()`，在 `verifyToken()` 调用时才读取 `process.env.JWT_SECRET`
- **文件**：`game-server/src/lib/auth.js`
- **教训**：ESM 中不能在顶层 const 中依赖 dotenv 加载的环境变量，必须改为运行时读取
- **状态**：已修复

---

### BUG-17：visibilitychange 方案导致多人同步再次失效（已回退）

- **现象**：部署 BUG-19 修复后，多人同框功能再次失效，两个设备看不到彼此
- **根因**：`visibilitychange` 监听器在初始连接阶段（`connect()` 异步未完成）就触发断开，导致连接失败
- **修复**：回退到 `2586e83`，移除 `visibilitychange`，改用 `shutdown` + `destroy` 双重事件 + `_initialConnected` 防护
- **文件**：`game/scenes/WorldScene.js`
- **教训**：异步连接阶段不能被 DOM 事件中断，清理逻辑应挂在场景生命周期事件上
- **状态**：已回退并重新修复

---

### BUG-16：生产环境多人同步完全失败（两个根因叠加）

- **现象**：两个不同设备登录不同账号进入德塔，看不到彼此
- **根因**：两个独立问题叠加：
  1. **JWT 密钥不匹配**：Express 从根目录启动，`dotenv/config` 找不到 `.env`，回退到 `change-me-in-production`；game-server 正确加载 `server/.env` 得到 `nande-secret-2026-change-me`。签名和验证密钥不同，连接全部被拒绝
  2. **Nginx proxy_pass 缺少尾部斜杠**：`proxy_pass http://127.0.0.1:2567;` 保留了 `/ws` 前缀，Colyseus 收到 `/ws/matchmake/world` 而它不是 `/matchmake/world`，路由完全不匹配
- **修复**：
  1. Express 改为从 `server/` 目录启动（`pm2 start --cwd server`），正确加载 `server/.env`
  2. Nginx `proxy_pass http://127.0.0.1:2567/;` 加尾部斜杠，剥离 `/ws` 前缀
  3. `deploy.sh` 同步更新：Express 用 `--cwd server` + `src/index.js`
- **文件**：`deploy.sh`、`/etc/nginx/sites-available/default`
- **状态**：已修复

---

### BUG-15：生产环境多人同步不生效

- **现象**：不同电脑进入德塔，看不到彼此
- **根因**：生产服务器从未部署 Colyseus 游戏服务器，三个缺失：
  1. Nginx 未配置 `/ws` WebSocket 代理到 2567
  2. Colyseus 进程未通过 PM2 启动
  3. `game-server` 依赖未安装
- **修复**：
  1. `game-server/src/index.js` 添加 dotenv 加载 `server/.env`（JWT 密钥一致）
  2. `deploy.sh` 新增 game-server 安装和 PM2 启动步骤
  3. 服务器需手动添加 Nginx `/ws` WebSocket 代理配置
- **文件**：`game-server/src/index.js`、`game-server/package.json`、`deploy.sh`
- **状态**：已修复

---

### BUG-14：按 E 无法交互（线上）

- **现象**：线上环境按 E 键，NPC/物品/大门交互无反应
- **根因**：`WorldScene.update()` 中 `inputSystem.update()` 在 `checkInteraction()` 之前执行，导致 `_eJustDown` 在被检查前就被重置为 `false`
- **修复**：调换执行顺序，`checkInteraction()` 移到 `inputSystem.update()` 之前
- **文件**：`game/scenes/WorldScene.js`
- **状态**：已修复

---

## 2026-07-14（多人同步开发）

---

### BUG-13：所有玩家昵称都显示"学员"

- **现象**：两个不同账号进入德塔，所有玩家头顶都显示"学员"
- **根因**：Express 签发 JWT 时只包含 `{ userId, role }`，没有 `nickname` 字段。Colyseus `verifyToken` 后 `payload.nickname` 为 undefined，回退到默认值"学员"
- **修复**：WorldRoom onJoin 优先使用客户端连接时传入的 `options.nickname`（来自前端 auth store），JWT 只用于身份验证
- **文件**：`game-server/src/rooms/WorldRoom.js` - onJoin
- **状态**：已修复

---

### BUG-12：多人同步玩家属性全为 undefined（type() 不存在）

- **现象**：两个浏览器在同一房间（roomId 一致，players.size=2），但其他玩家的 nickname/x/y 全是 undefined，精灵创建在 NaN 位置
- **根因**：`@colyseus/schema@3.0.76` 没有 `type()` 导出，用 `type('number', prototype, 'x')` 静默失败，Schema 字段未注册，客户端反序列化时拿不到值
- **修复**：改用 `defineTypes(PlayerState, { x: 'number', y: 'number', ... })` 正确注册字段
- **文件**：`game-server/src/schema/PlayerState.js`、`game-server/src/schema/WorldState.js`
- **状态**：已修复

---

### BUG-11：两个浏览器地图不一致（云/树随机生成）

- **现象**：Chrome 和 Edge 进入德塔，看到的云和树位置不同
- **根因**：`Phaser.Math.Between()` 随机生成云和树的位置，每次进入地图都不同，两个浏览器各自随机
- **修复**：云（6 朵）和树（6 棵）位置硬编码，所有浏览器看到同一张地图；同时固定世界尺寸 3200x700，groundY 固定为 636
- **文件**：`game/scenes/WorldScene.js` - create()
- **状态**：已修复

---

### BUG-10：聊天框 Enter 发送后又自动重新打开

- **现象**：聊天框中按 Enter 发送消息后，聊天框关闭又立刻重新打开
- **根因**：Vue closeChat() 调用 enableKeyboard() 后，同一帧的 Enter keydown 事件传播到 Phaser，Phaser 检查 chatOpen=false 又触发 chat-open
- **修复**：enableKeyboard() 时在 registry 设置 chatCooldown 时间戳，WorldScene 的 Enter 处理检查 400ms 冷却期
- **文件**：`game/main.js` - enableKeyboard、`game/scenes/WorldScene.js` - Enter handler
- **状态**：已修复

---

### BUG-09：小地图玩家标记位置偏高

- **现象**：小地图上玩家标记比实际位置偏高，与地面线不对应
- **根因**：地图 groundY 是动态计算的（`H - 64`，取决于浏览器窗口高度），但小地图使用静态 GROUND.y=636 和 WORLD_HEIGHT=700 做比例，导致比例不对
- **修复**：Phaser emitPosition 传递实际 groundY，小地图用 `toMiniY()` 相对坐标函数计算，垂直范围固定为 640px（塔 576 + 地面 64）
- **文件**：`game/scenes/WorldScene.js` - emitPosition、`src/views/GameView.vue` - drawMinimap
- **状态**：已修复

---

### BUG-08：多人同步看不到其他玩家

- **现象**：两个浏览器进入德塔，看不到对方角色
- **根因**：`physics.add.staticImage()` 创建的精灵带有静态物理 body，频繁调用 `body.reset()` 导致位置不刷新
- **修复**：改为 `add.image()`（普通 sprite），直接设置 x/y 坐标，不参与物理
- **文件**：`game/systems/NetworkSystem.js` - createOtherPlayer / updateOtherPlayer
- **状态**：已修复

---

### BUG-07：Colyseus state.players 为 undefined

- **现象**：`[NetworkSystem] 连接失败: Cannot set properties of undefined (setting 'onAdd')`
- **根因**：`joinOrCreate` resolve 后 state 尚未同步到客户端，`this.room.state.players` 为 undefined
- **修复**：添加 `waitForState()` 轮询，state 同步后再设置监听器
- **文件**：`game/systems/NetworkSystem.js` - waitForState
- **状态**：已修复

---

### BUG-06：@colyseus/schema 版本不匹配导致 handshake.copy 错误

- **现象**：`handshake.copy is not a function`
- **根因**：game-server 安装了 `@colyseus/schema@4.0.0`，但 `colyseus@0.16.0` 的 peerDependency 要求 `^3.0.0`，客户端 `colyseus.js@0.16.0` 也用 schema 3.x
- **修复**：game-server 降级到 `@colyseus/schema@3.0.76`
- **文件**：`game-server/package.json`
- **状态**：已修复

---

### BUG-05：Colyseus 0.15 + schema 3.x 不兼容

- **现象**：`import_schema.Context is not a constructor`
- **根因**：`colyseus@0.15.57` 不兼容 `@colyseus/schema@3.x`
- **修复**：升级到 `colyseus@0.16.0`
- **文件**：`game-server/package.json`
- **状态**：已修复

---

### BUG-04：@colyseus/ws-transport 0.17 依赖 uWebSockets.js 下载超时

- **现象**：`pnpm add colyseus@latest` 超时，uWebSockets.js 从 GitHub 下载失败
- **根因**：`@colyseus/ws-transport@0.17` 依赖 `@colyseus/uwebsockets-transport`，需从 GitHub 下载 40MB 二进制
- **修复**：锁定 `colyseus@0.16.0` + `@colyseus/ws-transport@0.16.0`（使用标准 ws 库）
- **文件**：`game-server/package.json`
- **状态**：已修复

---

### BUG-03：WorldScene create() 重复声明 nickname

- **现象**：`SyntaxError: Identifier 'nickname' has already been declared`
- **根因**：`create()` 方法中 line 88 和 line 142 都声明了 `const nickname`
- **修复**：删除 line 142 的重复声明，复用 line 88 的变量
- **文件**：`game/scenes/WorldScene.js`
- **状态**：已修复

---

### BUG-02：Colyseus 0.16 CommonJS 导入问题

- **现象**：`Named export 'Room' not found. The requested module 'colyseus' is a CommonJS module`
- **根因**：`colyseus@0.15` 是 CommonJS，ESM `import { Room }` 不兼容
- **修复**：升级到 `colyseus@0.16.0`（支持 ESM named exports）
- **文件**：`game-server/src/index.js`、`game-server/src/rooms/WorldRoom.js`
- **状态**：已修复

---

### BUG-01：全屏黑边

- **现象**：游戏两侧有大黑块，未填充浏览器
- **根因**：`Scale.FIT` 模式保持宽高比，两侧留黑
- **修复**：改为 `Scale.RESIZE`，填充整个容器
- **文件**：`game/config.js`
- **状态**：已修复
