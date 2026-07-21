# 德塔（NDO）Changelog

> 倒序排列，最新在最上方。涵盖游戏前端、游戏后端、Vue 桥接层。

---

### [feat] WebSocket 长连接方案 - 黑机外包检索（BUG-36 架构优化）

- **时间**：2026-07-21
- **变更人**：陈梓键（黑机）
- **背景**：白机临时修复 BUG-36（LIMIT 50/30）后精度下降。黑机性能基准测试显示全量 nickname LIKE 查询仅 0.07-0.13 秒（51 万行），选择 WebSocket 长连接方案外包重度检索（person_messages/mentioned），轻量任务本地执行
- **变更内容**：
  1. 新增 `server/src/searchHub.js`（WS Hub）：WebSocketServer 挂载 `/search-hub`，鉴权 + 心跳（30s ping/pong）+ 任务分发 + 结果收集 + pendingTasks Map + 15s 任务超时 + 60s 心跳超时
  2. 新增 `server/src/searchWorker.js`（黑机 Worker）：主动连接云端 WS Hub，30s 心跳，断线 5s 自动重连，收到 search_task 后调用子 Agent（全量 `limit: null`），回传 agent_thinking 进度 + search_result 结果
  3. 子 Agent 加 `options.limit` 参数：
     - personMessagesAgent：`LIMIT ${limit ?? 50}`，`slice(0, limit ?? 30)`
     - mentionedAgent：`LIMIT ${limit ?? 30}`，`slice(0, limit ?? 20)`
     - contextSearch：`options.maxIds` 控制查询上限（默认 300，黑机传大值）
  4. orchestrator `dispatchAgent`：黑机在线 + 重度任务（person_messages/mentioned）-> `sendSearchTask(task, emit)`，离线/超时 -> 降级本地 LIMIT 50
  5. `server/src/index.js`：`app.listen` 改为 `http.createServer(app)` + `attachSearchHub(server)` 挂载 WS Hub
  6. 依赖：`ws@^8.18.0`，配置：`BLACK_WORKER_TOKEN`（鉴权）、`CLOUD_WS_URL`（黑机连接地址）
  7. 数据同步：新增 `scripts/sync-prod-db.sh`，首次 scp 云端 prod.db 到本地 dev.db（黑机 7×24 常开）
- **降级策略**：黑机在线+重度任务->黑机全量；超时/断线->降级本地 LIMIT 50；轻量任务始终本地
- **性能提升**：云端全量 LIKE 查询 OOM 崩溃 -> 黑机 0.07-0.13 秒完成（51 万行）
- **文件**：`searchHub.js`（新增）、`searchWorker.js`（新增）、`personMessagesAgent.js`/`mentionedAgent.js`/`contextSearch.js`（改）、`orchestrator.js`/`index.js`（改）、`package.json`/`.env`/`deploy.sh`（改）、`scripts/sync-prod-db.sh`（新增）

---

### [fix] 多Agent全量检索导致服务器OOM崩溃 + 性能修复

- **时间**：2026-07-21
- **变更人**：陈梓键（白机）
- **背景**：多 Agent v2 上线后，用户测试"如何评价丘序明"触发 3 个子 Agent 并行全量检索，丘序明有数千条发言，每条取前后各 5 条上下文，拼成超大文本传给 LLM。2 核服务器内存和 IO 瞬间爆满，SSH 失联、阿里云无法远程、官网 500。服务器重启后才恢复
- **根因分析**（详见 `bug-log.md` BUG-36）：
  1. `personMessagesAgent` 全量查询数千条发言（无 LIMIT）
  2. `mentionedAgent` LIMIT 500 条 + 每条取上下文
  3. `fetchWithContext` 用 `BETWEEN minId AND maxId` 范围查询，目标消息分散时跨越数十万行 = 全表扫描
  4. `nickname LIKE '%xxx%'` 双侧通配，B-tree 索引无效，51 万行全表扫描
  5. 4 个子 Agent 并行触发上述全表扫描，IO+CPU+内存三重爆
- **变更内容**：
  1. `server/src/agents/personMessagesAgent.js` - 全量查询改为 LIMIT 50 取最近 + COUNT 查总数，返回数据限制 30 条
  2. `server/src/agents/mentionedAgent.js` - LIMIT 500 改为 LIMIT 30，返回数据限制 20 条
  3. `server/src/agents/contextSearch.js` - `BETWEEN` 大范围扫描改为 `IN (id1,id2,...)` 精确查询，最多 300 条
  4. `server/src/agents/orchestrator.js` - 分析阶段最多传 30 条消息给大 Agent
  5. `server/src/utils/llm.js` - LLM 超时从 60s 提到 120s
  6. `server/src/agents/orchestrator.js` - 新增 `isCasualChat` 快速判断，"你好"等短句跳过规划阶段
- **教训**：2 核小机器不能暴力全量检索，需要架构优化（映射表+PRAGMA调优）或升级配置（4核8GB ESSD）
- **状态**：已修复部署，但精度受限于条数限制（临时方案）
- **关联文档**：`bug-log.md` BUG-36，全量检索配置调研报告

---

### [fix] 思考太久 + network error + 线上首页500

- **时间**：2026-07-21
- **变更人**：陈梓键（白机）
- **背景**：线上测试发现三个问题：① "你好"也思考很久 ② 子 Agent 完成后主 Agent 报 network error ③ 首页 500
- **根因**：
  1. network error = 火山引擎 API 429 配额超限（月度配额用完）
  2. 思考太久 = "你好"也要走规划阶段（一次 LLM 调用），且超时 60s 太短
  3. 首页 500 = nginx worker 无权访问 /root/ 目录（`chmod o+x /root` 修复）
- **修复**：`isCasualChat` 跳过规划、LLM 超时提到 120s、`chmod o+x /root`
- **状态**：已修复

---

### [feat] 动态多 Agent 协作检索 v2 - 大 Agent 规划 + 全量检索 + 分析推理

- **时间**：2026-07-21
- **变更人**：陈梓键（白机）
- **背景**：v1 的固定双 Agent（统计+语义）检索精度不足，无法针对"评价某人"这类问题同时查该人统计、发言、被提及等多维度信息。改为大 Agent 动态规划子 Agent 任务
- **变更内容**：
  1. `server/src/agents/orchestrator.js` - 重写：大 Agent 三阶段（规划->检索->分析回答），持有完整上下文
  2. `server/src/agents/contextSearch.js` - 新增：上下文检索工具（批量取前后各5条+去重）
  3. `server/src/agents/personStatAgent.js` - 新增：人物统计子 Agent（发言数/活跃时段/发言长度）
  4. `server/src/agents/personMessagesAgent.js` - 新增：人物发言子 Agent（全量+上下文）
  5. `server/src/agents/mentionedAgent.js` - 新增：被提及子 Agent（全量+上下文）
  6. `server/src/agents/topicSearchAgent.js` - 新增：话题检索子 Agent（FTS5 四级降级）
  7. `src/views/ChatView.vue` - 思考过程 UI 改为动态渲染（支持任意 agent 类型分组）
- **验证**：本地 API 验证通过，"如何评价丘序明"正确规划 3 个子 Agent 任务（person_stat/person_messages/mentioned）并行执行
- **状态**：代码完成，已验证，已部署（`ed4fa8d`）
- **关联文档**：`bug-log.md` BUG-35

---

### [feat] 多 Agent 协作检索 v1 - 统计+语义并行检索

- **时间**：2026-07-21
- **变更人**：陈梓键（白机）
- **背景**：原三分类（statistic/semantic/chat 三选一）排他式路由导致混合型问题信息缺失
- **变更内容**：
  1. `server/src/agents/orchestrator.js` - 新增：协调器，前置路由 + 并行调度 + 主 Agent 综合
  2. `server/src/agents/statisticAgent.js` - 新增：数据统计子 Agent
  3. `server/src/agents/semanticAgent.js` - 新增：语义检索子 Agent
  4. `server/src/controllers/chatController.js` - askChat 从三分类改为调用 orchestrate()
  5. `src/views/ChatView.vue` - 新增 agent_thinking 事件消费 + 多 Agent 思考过程分组 UI
- **状态**：已被 v2 替代（v1 文件保留但不再使用）
- **关联文档**：`bug-log.md` BUG-35

---

### [feat] 玩家精灵四方向行走系统 + 5 套少女形象（R-003 阶段 1）

- **时间**：2026-07-20 晚
- **变更人**：陈梓键（黑机）
- **背景**：原玩家为 32×32 蓝色色块，无形象差异，无行走动画（仅靠 `flipX` 翻贴）。需为 20 人社区提供 5 套少女形象（鸣潮/原神风），支持四方向行走动画，HUD 头像框显示真实头像
- **变更内容**：
  1. **架构级 - 启用 Phaser 动画系统**（首次）：项目历史 0 处 `anims.create`/`anims.play` 调用，本次从零搭建。PreloadScene 注册 40 个 anim（5 套 × 4 方向 × 2 状态 idle/walk），Player.js 通过 `anims.play` 切换，NetworkSystem.js 同步远程玩家动画
  2. **schema 变更**（`game-server/src/schema/PlayerState.js`）：新增 `skinId: 'string'` 字段（默认 '1'），WorldRoom.onJoin 接收 `options.skinId`，向后兼容（旧客户端自动得默认值）
  3. **资源加载**（`game/scenes/PreloadScene.js`）：preload 加载 5 套 spritesheet（128×128，4×4 网格，每格 32×32）+ 5 张立绘 + 5 张头像；generateFallbackTextures 为每套生成色块兜底；createPlayerAnimations 自适应检测 frame 数量，真实资源 16 帧时启用循环，fallback 1 帧时退化静态
  4. **玩家逻辑**（`game/objects/Player.js`）：构造函数加 `skinId` 参数；新增 `facing` + `anim` 内部状态字段（避免每帧重复 `anims.play` 抖动）；update() 把 `setFlipX` 替换为 `_playAnim(state, facing)`，正常/爬梯模式都支持 4 方向（上下左右）判定
  5. **场景**（`game/scenes/WorldScene.js`）：从 registry 取 skinId 传给 Player + NetworkSystem.connect；sendNetworkPosition facing 优先用 `this.player.facing`（4 方向），回退 `sprite.flipX`
  6. **网络同步**（`game/systems/NetworkSystem.js`）：createOtherPlayer 优先用对应 skinId 的 spritesheet 纹理（不再动态色块）；updateOtherPlayer 消费 `state.facing` + `state.anim` 切换 anim（修复 schema 字段在前端被丢弃的最后一公里）；removeOtherPlayer 仅清理 sessionId 专属色块，不删共享 spritesheet
  7. **HUD 头像**（`src/views/GameView.vue`）：原 `<canvas 40×40>` 空白从未绘制改为 `<img :src="avatarUrl">`；点击头像打开「玩家形象弹窗」显示 1024 立绘 + 5 套头像选择列表；切换形象写入 auth store 持久化（重进德塔生效）
  8. **auth store**（`src/stores/auth.js`）：新增 `skinId` ref（localStorage 持久化）+ `setSkinId` 方法
  9. **main.js**：createGame 加 `skinId` 第 4 参数，写入 Phaser registry
- **5 套人设**（鸣潮/原神风少女，AI 默认设计）：
  | 套 | 发色 | 发型 | 服装 | 风格 |
  |---|---|---|---|---|
  | set1 | 粉色 | 双马尾 | 学院制服（西装+短裙+长袜） | 学园少女 |
  | set2 | 黑色 | 长直 | 巫女服（红白袴+白衣） | 和风神职 |
  | set3 | 金色 | 单马尾 | 骑士轻甲（胸甲+披风） | 西幻骑士 |
  | set4 | 银色 | 短发 | 法师长袍（宽袖+星纹） | 魔导师 |
  | set5 | 蓝色 | 双长辫（参考金克丝 Jinx） | 战斗机甲服（机械臂+发光纹） | 赛博机甲 |
- **配套资源**：
  - 5 套立绘工作流 JSON：`.ai/comfyui-workflows/players/portrait_player_set{1..5}.json`（基于 `npc/portrait_illustrious.json` 模板，删除 mygo LoRA，改用纯 waiIllustriousSDXL_v160 大模型；每套 seed 100001~100005 保证差异化）
  - 生成脚本：`scripts/gen_player_portrait_workflows.py`（批量生成 5 套 JSON，未来扩展皮肤复用）
  - PIL 头像脚本：`scripts/portrait_to_avatar.py`（从立绘截取头部上 35% 区域，nearest 降采样到 40×40）
  - ComfyUI 模型下载脚本：`scripts/download_models.sh`（hf-mirror 镜像，下载 SDXL Base + Pixel-Art-XL LoRA + ControlNet OpenPose SDXL）
- **验证**：`npx vite build` 通过（构建无错），GameView chunk 1.86MB（含 5 套 spritesheet 加载逻辑）
- **未完成（待模型下载后下一会话继续）**：
  - 阶段 C：用工作流 JSON 在 ComfyUI 中跑出 5 套真实立绘（1024×1024 抠图透明 PNG）
  - 阶段 E：ControlNet OpenPose 精灵表工作流 JSON（4 方向 × 4 帧 = 16 帧/套）
  - 阶段 F：OpenPose 骨架参考图（16 张）
  - 阶段 G：生成 5 套精灵表（80 帧）+ PIL 拼 4×4 网格
- **状态**：代码接入完成（本地构建通过），美术资源待 ComfyUI 生成
- **关联文档**：`bug-log.md` BUG-35（NetworkSystem IIFE 误删右括号）；根 `CHANGELOG.md`；`.ai/handoff.md`

---

### [fix] NPC 思考状态 spinner 优化 + 传送门交互修复

- **时间**：2026-07-20
- **变更人**：陈梓键（白机）
- **背景**：NPC AI 对话"正在思考"动画使用 `setInterval` 轮询文字点号（`. .. ...`），存在内存泄漏风险且视觉不够专业；角色出生点与传送门坐标重合，按 E 永远触发传送门而非男德通 NPC
- **变更内容**：
  1. **NPC 思考状态 spinner 优化**（`src/views/ChatView.vue` + `src/views/GameView.vue`）：AI 思考中改用纯 CSS spinner（0.8s 线性旋转金色圆圈）替代文字点号动画；去掉 `setInterval` 定时器 + `thinkingDots`/`thinkingTimer` 变量；ChatView 修复气泡渲染条件（空 content + loading 时显示 spinner + "正在思考..."）
  2. **传送门出生点修复**（`game/scenes/WorldScene.js`）：出生点从 `towerX+320`(520) 移到 `towerX+200`(400)，远离传送门(520)触发范围
  3. **交互距离判断统一**（`game/scenes/WorldScene.js`）：大门判断缺少 `< nearestDist` 条件（会覆盖更近的 NPC），传送门判断缺少 `< INTERACT_DISTANCE` 上限，统一为 `dist < INTERACT_DISTANCE && dist < nearestDist`
- **验证**：浏览器端到端验证 - NPC 对话弹窗正常弹出（男德通立绘 + 欢迎消息 + 输入框），发送"你是谁"-> AI 正常回复，控制台零报错
- **状态**：代码完成，已验证（本地浏览器端到端通过），已部署（`6bf5e57`）
- **关联文档**：`bug-log.md` BUG-33、BUG-34

---

### [feat] 版本公告系统（R-004）

- **时间**：2026-07-20
- **变更人**：陈梓键（白机）
- **背景**：原首页公告为单条文本、纯人工维护，无法体现版本迭代历程。需要将版本信息同步到公告系统，让用户了解更新内容与未来规划
- **变更内容**：
  1. **数据库**（`schema.prisma` + 迁移）：新增 `Version` 模型（id/version/date/summary/updates/plans），`updates` 和 `plans` 用 JSON 字符串存储数组；旧 `Announcement` 表保留兼容
  2. **后端 API**（`announcementController.js` + `api.js`）：重构为 5 个接口 — `GET /announcement`（最新版本摘要，向后兼容旧格式）、`GET /announcement/versions`（版本列表）、`POST /announcement/versions`（新增）、`PUT /announcement/versions/:id`（编辑）、`DELETE /announcement/versions/:id`（删除）
  3. **前端 API**（`announcement.js`）：新增 `getVersions`/`createVersion`/`updateVersion`/`deleteVersion` 4 个函数
  4. **版本历史弹窗**（`VersionHistoryDialog.vue` 新增）：参考 ProfileDialog 模式（Transition 动画 + overlay），列表态展示版本号/日期/摘要/更新项/规划项，编辑态支持动态增删更新项和规划项
  5. **首页公告栏改造**（`MainView.vue`）：公告栏展示版本徽章 + 日期 + 摘要，新增「版本历史」按钮（全员可见），admin 可在弹窗内增删改版本
- **验证**：首页公告栏显示 `v1.1.0 (2026/7/20)` + 摘要；版本历史弹窗展示 3 条更新 + 2 条规划；admin 新增/编辑/删除功能正常
- **状态**：代码完成，已验证（本地浏览器端到端通过）
- **关联文档**：`需求池.md` R-004

---

### [feat] NPC 广播 @ 提问者 + 身份感知 + 花名册注入

- **时间**：2026-07-20
- **变更人**：陈梓键（白机）
- **背景**：NPC 回复广播到世界频道时缺少上下文（不知道在回复谁），且 AI 不知道对话者真实身份（用户说"我是丘序明"就被骗），也无法查询学院成员信息
- **变更内容**：
  1. **广播 @ 前缀（程序处理）**（`game/systems/NetworkSystem.js`）：NPC 回复广播时自动加 `@提问者昵称：` 前缀，格式 `男德通：@陈梓键：回复内容`；头顶气泡同步加前缀
  2. **提问者身份注入**（`server/src/controllers/chatController.js`）：`buildGamePersona()` 改为每次请求动态构建（原启动时缓存一次），从 `req.user.nickname` 取提问者真实昵称注入 system prompt，AI 能识破冒充（"系统告诉我你是陈梓键哦~"）
  3. **花名册注入**（`server/src/controllers/chatController.js`）：新增 `parseRoster()` 函数，从 `prd/01-需求文档/00-基础数据/成员信息填写表.md` 读取并解析成紧凑纯文本列表（21 人，含外号/绰号/现状），注入到 system prompt 末尾；AI 可查询任意成员信息（如"马逸杰在干嘛"->"马哥在澳洲留学呢~"）
  4. **Prompt 调优**：禁止 AI 在回复内容里使用 @ 符号（@ 由程序处理，避免双重 @）；缩短世界观/交互需求参考文档（3000->800、2000->500），花名册置于 prompt 末尾（AI 对末尾内容记忆更深）
- **验证**：
  - 冒充测试：用户说"我是丘序明"，AI 回复"你好呀蛋哥~"（用外号反调侃，识破冒充）
  - 查人测试：查马逸杰->"马哥在澳洲留学"；查丘序明->"丘哥，外号丘比、禀心寒霜，本科山大，在深圳，预计读港科"
  - 广播格式：世界频道显示 `男德通：@陈梓键：回复内容` ✅；AI 回复内无 @ 符号 ✅
- **状态**：代码完成，已验证（本地三服务联调通过）
- **关联文档**：`德塔男德通交互需求.md` §2.2（广播规则修订）

---

### [fix] 三层塔楼改造收尾（爬梯/门/墙/背景多项修复）

- **时间**：2026-07-18
- **变更人**：陈梓键（黑机）
- **背景**：三层塔楼首版上线后，发现 6+ 个 bug，集中修复
- **变更内容**：
  1. **爬梯逻辑重写**：`updateLadderState` 改用距离检测（不依赖 overlap 回调）；冷却变量 `climbEnterCooldown/climbExitCooldown` 在 create() 开头初始化；Player.update 不再主动退出爬梯（统一由 WorldScene 管理，避免双重改状态刷屏）
  2. **墙瓦片选错修复**：`wall_dark_1` 从 Tiny Dungeon (9,0)（火炉装饰）改为 (0,0)（纯色墙砖），不再像铁路
  3. **塔内背景**：从 tileSprite 平铺改为 `rectangle` 纯色矩形（`0x1a1f2e` 深蓝黑），无缝不晃眼
  4. **门重做**：放弃拼接 2 个 door_mid（像柜子），改为 PIL 手绘 32×64 拱顶单门 `door_full.png`（拱顶+单把手+横向装饰条）
  5. **门坐标修复**：`floorTopY` 是地板中心不是表面，门 Y 从 `floorTopY` 改为 `floorTopY - 16`（贴地板表面）
  6. **buildTower 调用顺序**：从 player 创建前移到创建后（修 BUG-26 卡加载界面）
  7. **塔楼入口大门**：从 `tile_door` 色块改为 `door_full` 拱顶门
- **状态**：代码完成，待用户最终验证

---

### [feat] 三层塔楼改造（爬梯机制 + 物理门 + Tiny Dungeon 素材）

- **时间**：2026-07-18
- **变更人**：陈梓键（黑机）
- **背景**：原塔楼是火柴盒单层，用户要求做回三层架构，有楼梯攀爬、房间门可交互、室内家具装饰
- **变更内容**（7 阶段）：
  1. **素材切片**（`scripts/slice_tileset.py`）：从 Tiny Dungeon tilemap 切出 36 个瓦片（16×16 放大 2 倍到 32×32），含石墙 3 色调、木地板、楼梯、门、火把、窗户、桌椅、床、宝箱、书架、木桶、骷髅
  2. **PreloadScene**：加载 36 个新瓦片（`wall_dark_1` 等）
  3. **Player 爬梯能力**（`Player.js` + `InputSystem.js`）：新增 `isClimbing` 状态 + `setClimbing()` 方法；爬梯时关闭重力，上下键控制 Y 速度；左右键/跳跃键退出爬梯；InputSystem 新增 S/↓ 键支持
  4. **buildTower 三层重建**（`WorldScene.js`）：底层会客厅（柜台+桌椅+火把+木桶）、中层房间区（床+宝箱+书架+2 道物理门）、顶层哨位（窗户+发光宝箱+骷髅）；每层 6 格高，梯子连接层间（带梯子口）
  5. **门交互**（`WorldScene.js`）：`createDoor()` + `toggleRoomDoor()`；门初始为 ground 碰撞体（挡路），按 E 切换 `body.enable` + 换贴图
  6. **塔内背景**：tileSprite 平铺深色石墙，替换原天空背景
  7. **梯子检测**：`updateLadderState()` + `physics.add.overlap(player, ladders)`，按 ↑ 进入爬梯，着地/离开自动退出
- **关键设计**：见 ADR-003（梯子机制 + 物理门）
- **状态**：代码完成，待用户验证爬梯手感和门交互

---

### [feat] P2 NPC AI 对话功能接入（全栈 6 阶段完成）

- **时间**：2026-07-18
- **变更人**：陈梓键（黑机）
- **背景**：实现德塔大厅男德通 NPC 的 AI 对话功能（按 E 触发立绘弹窗 + 输入问题 + AI 流式回复 + 全服广播）
- **变更内容**（全栈 6 层）：
  1. **Phaser 层**（`WorldScene.js`）：`handleInteract` 加 `showNpcBubble`，按 E 时 NPC 头顶冒打招呼气泡（5秒淡隐）
  2. **Vue 层**（`GameView.vue`）：NPC 弹窗从"占位"改为"立绘+聊天"双栏布局；加 `sendNpcMessage`、`streamNpcReply`（SSE 流式消费）、`handleNpcKeydown`、思考动画；`@ 男德通` 前缀预填不可删
  3. **后端 API**（`chatController.js`）：新增 `buildGamePersona()`（读 4 份德塔文档拼 system prompt，启动时内存缓存）；新增 `talkNpc()`（SSE 流式，德塔专用，不走三分类，美少女口吻 50 字内禁换行）
  4. **路由**（`api.js`）：新增 `POST /api/chat/npc/talk`（带 auth + rateLimit）
  5. **Colyseus**（`WorldRoom.js` + `NetworkSystem.js`）：新增 `npc-reply` 消息类型；玩家问完男德通后，AI 回复广播给全服（其他玩家头顶气泡 + 聊天框）
  6. **桥接**（`main.js`）：导出 `sendNpcReply` 供 Vue 调用
- **关键设计**：
  - 复用站外 ChatSession（`intent='npc_talk'` 标记区分），不污染站外对话
  - API 额度/quota 错误友好提示（"男德通暂时走神了，过两天再找我聊~"）
  - 第一个 token 到时停止思考动画，避免空白等待
- **状态**：代码完成，**待 API 额度重置后联调测试**（AC-N1~N7 验收）
- **关联文档**：`德塔男德通交互需求.md`

---

### [feat] 男德通像素精灵定稿 + 滚轮缩放 + 塔楼精简

- **时间**：2026-07-18
- **变更人**：陈梓键（黑机）
- **背景**：AI 生 32×32 精灵反复尝试，最终选定 v3 prompt `0003` 立姿版本；塔楼多层架构无实际功能，先精简
- **变更内容**：
  - 男德通像素精灵定稿：`ND_npc_sprite_v3_00003_.png` → 裁切透明边 → 降采样 32×32，入库 `public/game/sprites/npcs/nandetong.png`（2.1KB）
  - NPC 精灵用 `origin(0.5, 1)` 脚底贴地 + `setDisplaySize(64, 64)` 2 格显示
  - 新增 `scripts/sprite_32.py`：裁切透明边 + 降采样工具脚本（可复用）
  - 新增滚轮缩放：`WorldScene.js` 监听滚轮，camera.zoom 范围 0.75~3.0，初始 1.5，平滑过渡
  - 删除塔楼梯子 + 二三层地板 + 层级标签（"底层·大厅"等），只保留底层大厅外墙
  - 玩家角色恢复 32×32 色块稳定状态（修复跳跃踏空 bug，见 BUG-25）
- **关联**：见 BUG-25（踏空根因）、ADR-002（坐标系规范草案）
- **状态**：完成，已推送 `eb81dfd`

---

### [调研] Tiny Dungeon 素材包下载 + Office Objects 弃用

- **时间**：2026-07-18
- **变更人**：陈梓键（黑机）
- **背景**：三层塔楼改造需要室内家具（火把/桌子/床/柜台/楼梯），Tiny Town 是室外包不够用
- **变更内容**：
  - 下载 Kenney Tiny Dungeon CC0 素材包（136 个 PNG，16×16 地牢主题）：石墙/门/宝箱/药水/武器，**但不含家具**
  - 试下载 OpenGameArt Office Objects（20 号素材）：画风不符（黑白线条图标），弃用
  - 还缺：火把/桌子/椅子/床/柜台/楼梯
- **状态**：素材储备中，家具待补

---

### [feat] P5 场景瓦片接入：Tiny Town CC0 素材包

- **时间**：2026-07-18
- **变更人**：陈梓键（黑机）
- **背景**：原计划用 SDXL + Pixel-Art-XL LoRA AI 生瓦片，调研发现瓦片需无缝拼接（AI 做不到），改用 Kenney Tiny Town CC0 素材包（免费可商用）
- **变更内容**：
  - 下载 Tiny Town 瓦片包（177KB，136 个瓦片），用 PIL 放大 2 倍（16→32px）并切片为 4 个独立 PNG（grass/dirt/stone/wood），用项目原有 key 名避免改 WorldScene
  - 改造 `game/scenes/PreloadScene.js`：加载真实 PNG，色块作 fallback（用 `textures.exists()` 判断不覆盖）
  - 入库 `public/game/tilesets/tiny_town.png` + `public/game/tilesets/sliced/*.png`
- **关联决策**：见 ADR-001（CC0 素材包替代 AI 生瓦片）
- **状态**：接入完成，待用户验证显示效果

---

### [feat] P5 男德通立绘 + 像素精灵生成入库

- **时间**：2026-07-18
- **变更人**：陈梓键（黑机）
- **背景**：德塔 NPC 男德通需要立绘（对话框）和像素精灵（地图显示）两种美术资源
- **变更内容**：
  - 立绘 1024×1024 透明 PNG：waiIllustriousSDXL_v160 + mygo LoRA（千早爱音，强度 0.7）+ ComfyUI-RMBG（BiRefNet-portrait）抠图，入库 `public/game/portraits/nandetong.png`
  - 像素精灵 128×128 透明 PNG：立绘降采样（PIL nearest 保 alpha），入库 `public/game/sprites/npcs/nandetong.png`
  - 新增 `scripts/portrait_to_pixel.py` 可复用脚本（支持任意立绘转像素）
  - ComfyUI 工作流目录重组：`lib/`（通用）、`npc/`（角色）、`scene/`、`effects/`，含 README
  - 新增 `prd/01-需求文档/00-基础数据/美术资源索引.md`（全项目美术资源单一信息源）
- **人设锁定**：千早爱音参考，触发词 `chihaya anon`，粉发/眼镜/虎牙/糖糖笑
- **状态**：资源已入库，**未接入游戏代码**（坐标问题阻塞，见下条）

---

### [回退] 角色坐标系调试失败回退（BUG-23）

- **时间**：2026-07-18
- **变更人**：陈梓键（黑机）
- **背景**：接入立绘后发现玩家掉入虚空，坐标调试失败
- **变更内容**：`game/objects/Player.js` 和 `game/scenes/WorldScene.js` 的坐标系改动全部回退到 `ff28d79`（色块稳定状态）
- **失败原因**：`body.setOffset(0, -16)` 把物理 body 推到 sprite 上方，导致下落时错过地面碰撞体；改用 `origin(0.5, 1)` 后仍异常
- **教训**：色块时代坐标都是凑合的，换 PNG 后问题集中爆发。不应逐个素材调坐标，应等场景瓦片全接入后一次性规范
- **详见**：`bug-log.md` BUG-23

---

### [Bug修复] BUG-22 男德通时间查询误报"只有 2022 年 7 月数据"

- **时间**：2026-07-17
- **变更人**：陈梓键（黑机）
- **背景**：询问男德通数据时间分布时，它误报"非空记录只有 2022 年 7 月 11、12 号那两天"，实际数据库 2022~2026 共 51 万条数据完好
- **变更内容**：
  - 修复 `server/src/controllers/chatController.js` 两处 SQL 生成 prompt：将 `msgTime` 字段说明从错误的"DateTime 格式 'YYYY-MM-DD HH:MM:SS'"改为真实的"Unix 毫秒时间戳整数"，并补充 `datetime(msgTime/1000,'unixepoch','localtime')` 转换示例
  - 详见 `bug-log.md` BUG-22
- **影响范围**：男德通统计类问答（站外 /chat、德塔 P2）
- **验证方式**：实测按年份统计正确分布（2022:54039 / 2023:85181 / 2024:98594 / 2025:153047 / 2026:119198）

---

### [文档修复] 德塔世界观.md 两处表格行损坏修复

- **时间**：2026-07-17
- **变更人**：陈梓键（黑机）
- **背景**：`德塔世界观.md` 有两处 markdown 表格行被错误合并截断，其中 L194 已在交接单登记，L109 未登记。这两处将进入 P2 男德通 AI 的 system prompt 上下文，损坏会影响生成质量
- **变更内容**：
  - L109 底层大厅表格：拆分"传送门入口"与"NPC 位置"两行，补全丢失的描述列
  - L194 FAQ 表格：拆分"德塔是什么？"与"怎么进入德塔？"两行，补全截断的答案
- **影响范围**：德塔世界观文档（P2 阶段 0 文档清理任务）

---

### [文档更新] 文档管理体系建立

- **时间**：2026-07-17
- **变更人**：陈梓键（白机）
- **背景**：项目文档种类增多，需要统一管理体系，明确各类文档的定位、存放位置和生命周期
- **变更内容**：
  - 新建 `prd/01-需求文档/00-基础数据/需求池.md`（全局需求池）
  - 新建 `prd/01-需求文档/00-调研/` 目录（全局调研）
  - 迁移 `comfyui-pixel-art-generation-workflow.md` 从德塔/03-调研 → 00-调研（属于全局调研）
  - 新建 `.trae/rules/docs-management.md`（文档管理规则，强制执行）
  - 明确四类文档：需求池、需求文档、changelog/bug-log、调研文档（全局/模块两级）
- **影响范围**：文档管理流程、.trae/rules/ 规则体系

---

### [功能增强] F13 传送门交互实现

- **时间**：2026-07-16
- **变更人**：陈梓键（白机）
- **背景**：德塔出生点需要传送门，玩家可通过按 E 确认后离开德塔回到主界面
- **变更内容**：
  - `game/mapData.js` 新增 `PORTAL_POSITION` 常量（x:520, y:620）
  - `game/scenes/PreloadScene.js` 新增传送门占位纹理（紫色三层圆）
  - `game/scenes/WorldScene.js` 新增传送门精灵 + 交互检测 + `portal-interact` 事件发射
  - `game/scenes/UIScene.js` 小地图新增传送门紫色点位
  - `src/views/GameView.vue` 新增传送门确认弹窗（是/否），确认后 `router.push('/home')`
- **影响范围**：游戏场景、HUD 小地图、GameView 弹窗
- **验证方式**：走近传送门显示「按 E 返回男德学院」-> 按 E 弹出确认框 -> 选「是」跳转主界面 -> 选「否」关闭弹窗

---

### [文档更新] 德塔男德通交互需求澄清与方案修订

- **时间**：2026-07-16
- **变更人**：陈梓键（白机）
- **背景**：黑机产出的 npc-ai-chat-integration.md 提出方案 A（GameView 内嵌独立弹窗），经评审后推翻，改为更贴合"QQ 群机器人"的 @ 模式
- **变更内容**：
  - 新建 `prd/01-需求文档/04-德塔/01-需求/德塔男德通交互需求.md`
  - 新建 `prd/01-需求文档/04-德塔/02-设计/德塔世界观.md`（德塔独立世界观，含三界关系/传送门/FAQ）
  - 交互模式：不使用独立弹窗，改为 HUD 聊天框 + @ 男德通蓝色前缀
  - 回复风格：美少女口吻，50 字以内，禁止换行
  - 广播规则修订：男德通对话和回复**均广播给所有在线玩家可见**（非仅发送者可见）
  - 按 E 交互时男德通头顶弹出打招呼气泡（5s 淡隐，所有人可见）
  - 明确通用规则：所有按 E 交互的头顶气泡都是全服可见
  - 新增 F13 传送门交互：走到传送门按 E 确认后离开德塔返回主界面
  - 上下文注入：德塔运作/德塔世界观（含学院/传送门/异世界设定）/操作指南/开发进度
  - 立绘展示列入需求池 R1（按 E 触发，5s 自动消失）
  - 同步更新 MVP需求文档 F4+F13 章节
- **影响范围**：F4 NPC 交互、F13 传送门交互、后端 chatController 上下文注入逻辑、GameView 聊天框、Colyseus 广播
- **验证方式**：待开发后按 AC-N1 ~ AC-N7 验收

---

### [文档更新] P2 NPC AI 对话接入需求调研完成

- **时间**：2026-07-16
- **变更人**：陈梓键（黑机）
- **背景**：德塔 P2 NPC AI 对话是下一优先级任务，需在开发前完成需求调研，明确技术方案和待决策事项
- **变更内容**：
  - 新建调研文档 `prd/01-需求文档/04-德塔/03-调研/npc-ai-chat-integration.md`
  - 完成 NPC 系统现状调研（含代码行号引用）
  - 完成 AI 对话系统现状调研（SSE 流式、意图分类、RAG 检索）
  - 对比三方案：A. GameView 内嵌对话（推荐） / B. 路由跳转 / C. iframe
  - 梳理 5 步实现路线：useChatSSE composable → NPCDialog 组件 → 后端人设参数 → greetText 自动发送 → 联调
  - 列出 5 项待决策清单，需白机逐项拍板
- **影响范围**：P2 开发任务、`src/views/GameView.vue`、`src/views/ChatView.vue`、`server/src/controllers/chatController.js`
- **验证方式**：白机评审待决策清单后进入开发

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