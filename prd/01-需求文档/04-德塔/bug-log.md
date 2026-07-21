# 德塔（NDO）Bug Log

> 倒序排列，最新在最上方。记录开发过程中遇到的 bug 及修复方式。

---

## 2026-07-21（白机 多 Agent 协作检索）

---

### BUG-36：多Agent全量检索导致服务器OOM崩溃 + SSH失联 + 首页500

- **现象**：用户测试"如何评价丘序明"后，服务器 SSH 失联、阿里云无法远程连接、官网返回 500。重启服务器后恢复
- **根因**（5 层连锁）：
  1. `personMessagesAgent` 全量查询丘序明数千条发言（无 LIMIT），每条取前后各 5 条上下文
  2. `fetchWithContext` 用 `WHERE id BETWEEN minId AND maxId`，目标消息分散在 51 万行中，minId 到 maxId 跨越数十万行 = 等效全表扫描
  3. `nickname LIKE '%丘序明%'` 双侧通配，B-tree 索引无效，51 万行逐行比较
  4. 3 个子 Agent（person_stat + person_messages + mentioned）并行触发上述全表扫描，IO + CPU + 内存三重爆
  5. SQLite cache 默认仅 2MB，热数据不常驻内存，每次查询都走磁盘
- **阿里云诊断**：磁盘 I/O 性能受限（Instance.Disk.IOLimit），云安全中心客户端离线
- **修复**（临时方案 - 限制数据量）：
  1. personMessagesAgent: 全量查询改为 `LIMIT 50` + `COUNT` 查总数
  2. mentionedAgent: `LIMIT 500` 改为 `LIMIT 30`
  3. fetchWithContext: `BETWEEN` 改为 `IN (id1,id2,...)` 精确查询，最多 300 条
  4. 子 Agent 返回数据限制 20-30 条
  5. orchestrator 分析阶段最多传 30 条给大 Agent
- **副作用**：精度下降（只取最近 50 条而非全量），待后续架构优化解决
- **待办**：全量检索配置调研（详见下方调研报告），需要做映射表 + PRAGMA 调优 或 升级 4核8GB ESSD
- **文件**：`server/src/agents/personMessagesAgent.js`、`mentionedAgent.js`、`contextSearch.js`、`orchestrator.js`
- **状态**：已临时修复，待架构优化

### BUG-35：askChat 重构后 intent 变量未定义 + 线上未 build 导致前端不更新

- **现象**：三个线上问题：① spinner "正在思考"不显示 ② 思考过程面板不展示 ③ "2026年6月聊什么"被判为闲聊不检索
- **根因**：
  1. 重构 askChat 删除意图分类后，`send('done', { intent })` 和 `prisma.chatTurn.create({ intent })` 仍引用已删除的 `intent` 变量
  2. 线上 `git pull` 只拉源码但没执行 `npm run build`，前端 dist 还是旧编译版本
  3. 路由规划 prompt 不够明确，时间范围类问题被判为 none
- **修复**：
  1. `chatController.js` - `intent` 改为 `result.intent`（两处：done 事件 + chatTurn 保存）
  2. 生产服务器执行 `npm run build`（建立标准部署流程：pull + build + restart）
  3. `orchestrator.js` - 路由 prompt 增强 + shouldForceSemantic 补丁 + extractTimeRange 时间范围检索
- **文件**：`server/src/controllers/chatController.js`、`server/src/agents/orchestrator.js`、`server/src/agents/semanticAgent.js`
- **教训**：重构删除变量后需全局搜索所有引用；线上 Vite 项目每次代码更新后必须 build 才生效
- **状态**：已修复

---

## 2026-07-20 晚（黑机 玩家精灵系统接入）

---

### BUG-35：NetworkSystem IIFE 误删右括号导致 vite build 失败

- **现象**：玩家精灵系统接入后，`npx vite build` 失败，报错 `NetworkSystem.js:29:5: ERROR: Expected ")" but found "("`
- **根因**：使用 Edit 工具替换 NetworkSystem.js 的 connect 函数（加 skinId 参数）时，把原代码 L29 的 IIFE 结尾 `})()` 误删一个右括号变成 `}()`，破坏了立即执行函数表达式语法
- **修复**：恢复 `})()` 完整括号配对
- **文件**：`game/systems/NetworkSystem.js` L29
- **验证**：重新 `npx vite build` 通过，GameView chunk 1859.88 kB 正常打包
- **教训**：
  1. Edit 工具替换时若上下文含特殊语法（IIFE、模板字符串），必须用 `git diff` 复核所有改动行
  2. 项目已积累足够代码量，每次大改动后必须 `vite build` 而非仅靠 `node --check`（Node check 不支持 ESM 顶层 IIFE）
  3. `node --check` 报此类错误时，不要假设是"Node 不支持 ESM"，应直接 vite build 验证
- **状态**：已修复

---

## 2026-07-20（白机 spinner 优化 + 传送门修复）

---

### BUG-33：closeNpcDialog 引用已删除的 thinkingTimer 导致 ReferenceError

- **现象**：GameView 中 NPC 对话弹窗关闭时报错 `ReferenceError: thinkingTimer is not defined`，弹窗无法正常关闭
- **根因**：删除 `thinkingTimer` 变量和 `setInterval` 定时器后，`closeNpcDialog` 函数中仍残留 `if (thinkingTimer) { clearInterval(thinkingTimer); thinkingTimer = null }` 引用
- **修复**：删除 `closeNpcDialog` 中对 `thinkingTimer` 的引用，只保留 `showNpcDialog.value = false` + `npcThinking.value = false` + `resumeGame()`
- **文件**：`src/views/GameView.vue`
- **验证**：打开 NPC 对话弹窗后点 × 关闭，控制台零报错
- **教训**：删除变量后需全局搜索残留引用，Vue 组件方法中的引用不会在编译期报错，只在运行时触发
- **状态**：已修复

---

### BUG-34：角色出生点与传送门坐标重合，按 E 永远触发传送门

- **现象**：进入德塔后角色出生在传送门正上方，按 E 总是弹出"确定要离开塔吗？"传送门弹窗，无法走到男德通 NPC 旁边触发对话
- **根因**：
  1. 出生点 `startX = towerX + 320 = 520`，传送门 `PORTAL_POSITION.x = 520`，两者完全重合
  2. 传送门交互判断 `portalDist < nearestDist` 缺少 `< INTERACT_DISTANCE` 上限检查
  3. 大门交互判断 `doorDist < INTERACT_DISTANCE` 缺少 `< nearestDist` 条件，会强行覆盖更近的 NPC
- **修复**：
  1. 出生点从 `towerX+320`(520) 移到 `towerX+200`(400)，距传送门 120px（超出 48px 交互范围）
  2. 统一大门/传送门判断条件为 `dist < INTERACT_DISTANCE && dist < nearestDist`
- **文件**：`game/scenes/WorldScene.js`
- **验证**：刷新页面后按 E 不触发传送门；向左走 6 步到男德通 NPC 旁按 E，正常弹出 NPC 对话弹窗
- **教训**：交互对象的距离判断需要同时满足"在交互范围内"和"是最近的"两个条件，缺少任一都会导致优先级混乱
- **状态**：已修复

---

## 2026-07-20（白机 NPC AI 对话优化）

---

### BUG-32：NPC 广播双重 @ 符号 + AI 不认识对话者 + 无花名册

- **现象**：
  1. NPC 回复广播到世界频道时显示 `男德通：@陈梓键：@丘序明 你好呀~`，出现双重 @（程序加的前缀 + AI 自己写的前缀）
  2. 用户说"我是丘序明"，AI 就信了，不知道实际对话者是陈梓键
  3. 问"马逸杰在干嘛"，AI 答不出来，没有学院成员信息
- **根因**：
  1. 广播 @ 前缀由 AI 自行在回复内容里写（不可控），而非程序统一处理
  2. system prompt 没有注入提问者真实身份信息
  3. system prompt 没有注入花名册（学院成员信息），AI 无法查询
- **修复**（三个层面）：
  1. **程序处理 @ 前缀**：`NetworkSystem.js` 收到 `npc-reply` 广播时，自动拼接 `@${data.nickname}：${data.text}`，AI 不再需要自己写 @
  2. **身份注入**：`chatController.js` 的 `buildGamePersona()` 改为动态构建，每次请求从 `req.user.nickname` 取提问者昵称注入 prompt
  3. **花名册注入**：新增 `parseRoster()` 从 `成员信息填写表.md` 解析 21 人列表（含外号/现状），注入 prompt 末尾；prompt 禁止 AI 使用 @ 符号
- **文件**：`game/systems/NetworkSystem.js`、`server/src/controllers/chatController.js`
- **验证**：
  - 冒充"我是丘序明" -> AI 回"你好呀蛋哥~"（用外号识破）
  - 查马逸杰 -> "马哥在澳洲留学呢~"
  - 查丘序明 -> "丘哥，外号丘比、禀心寒霜，本科山大，在深圳，预计读港科"
  - 广播格式 -> `男德通：@陈梓键：回复内容`（无双重 @）
- **教训**：
  1. @ 前缀这类格式化逻辑应由程序统一处理，不能交给 LLM 自由发挥
  2. system prompt 中信息越多不一定越好，参考文档过长（6000 字）会淹没关键信息（花名册 447 字），需要精简并置于 prompt 末尾
  3. 从数据库查花名册不如从 PRD 文档读（PRD 含外号/绰号/现状等丰富信息，数据库只有账号昵称）
- **状态**：已修复

---

## 2026-07-18（黑机 P5 美术 + 三层塔楼改造）

---

### BUG-31：塔楼入口大门是色块 + 室内门像柜子

- **现象**：塔楼入口大门是 `tile_door` 色块；室内门用 2 个 door_mid 拼接，视觉识别成"双门柜子"
- **根因**：
  1. 入口大门没替换素材
  2. Tiny Dungeon 没有原生 1×2 门，用 2 个 1×1 拼接必然像两个物体叠起来
- **修复**：用 PIL 手绘 32×64 拱顶单门 `door_full.png`（拱顶+门框+门板纹理+单把手+横向装饰条）；入口大门和室内门统一用 `door_full`
- **教训**：素材包没有的形状，直接 PIL 画比拼接好

---

### BUG-30：门嵌进地板半格

- **现象**：室内门下段嵌进地板上半部分
- **根因**：`floorTopY` 是地板瓦片的中心 Y（不是表面），因为 Phaser static body 默认 origin (0.5, 0.5)。传给 createDoor 的 `floorY = floorTopY`，门底段在 `floorTopY - 0.5*TS`，嵌进地板上半部
- **修复**：调用 createDoor 时传 `floorTopY - 16`（地板表面 Y）

---

### BUG-29：塔内背景瓦片有接缝 + wall_dark_1 选错坐标

- **现象**：塔内背景用 tileSprite 平铺，瓦片间有明显接缝；外墙瓦片看起来像铁路/管道
- **根因**：
  1. `wall_dark_1` 切的是 Tiny Dungeon (9,0)，实际是**火炉/管道装饰物**，不是纯墙
  2. tileSprite 平铺时瓦片边缘有 1px 错位
- **修复**：
  1. 重新切 (0,0) 作为 wall_dark_1（纯色墙砖，色彩方差 0.0）
  2. 背景从 tileSprite 改为 `rectangle` 纯色矩形（`0x1a1f2e`），完全无缝
- **教训**：切瓦片前必须用 PIL 分析每个瓦片的颜色均匀度，不能靠行号猜

---

### BUG-28：爬梯状态反复进入退出（F12 刷屏）

- **现象**：按一次 W 爬梯，F12 出现几十条"进入/退出爬梯状态"日志
- **根因**：爬梯状态被两个地方同时修改--Player.update 里按空格自己调 setClimbing(false)，WorldScene.updateLadderState 同一帧又检查到条件调 setClimbing(true)，isClimbing 在 true/false 横跳
- **修复**：爬梯状态切换全部收归 WorldScene.updateLadderState 统一管理，Player.update 只负责"爬梯中怎么移动"不主动退出；加双向冷却（进入后 20 帧不退出，退出后 30 帧不进入）
- **教训**：状态机只能有一个管理者，不能多处修改同一状态

---

### BUG-27：decorateFloor 引用未定义的 ground

- **现象**：进入游戏卡在加载界面，F12 报 `Uncaught ReferenceError: ground is not defined`
- **根因**：`decorateFloor(floor, towerX, ...)` 函数签名没有 ground 参数，但函数体内调 `createDoor(ground, ...)` 引用了它
- **修复**：`createDoor(ground, ...)` -> `createDoor(this.ground, ...)`（用实例属性）
- **教训**：改完代码后应该用浏览器跑一次看 F12，而不是改完就提交

---

### BUG-26：buildTower 在 player 创建前调用，卡加载界面

- **现象**：进入德塔卡在加载进度条，F12 无明显报错
- **根因**：`buildTower()` 里注册 `physics.add.overlap(this.player.sprite, ladders)`，但 buildTower 在 L62 调用时 `this.player` 还没创建（L120 才创建），访问 undefined.sprite 抛异常中断 create()
- **修复**：把 buildTower 调用从 L62 移到 player 创建 + collider 注册之后
- **教训**：依赖 player 的函数必须在 player 创建后调用；create() 里的执行顺序要仔细核对

---

### BUG-25：玩家跳跃后踏空（body offset 错位）

- **现象**：玩家视觉拉伸到 64 高后，跳跃落地时踏空（视觉上有悬空感）
- **根因**：`body.setOffset(0, 16)` 把物理 body 下移 16px，导致跳跃落地时 body 底部和视觉脚底错位 16px
- **修复**：回退玩家为 32×32 色块稳定状态（视觉 + body 统一），去掉所有 body offset 和 displaySize 改动
- **教训**：色块阶段不要动 body offset，等换真实精灵时统一用 origin 脚底对齐方案。Body 和视觉的耦合容易出问题
- **状态**：已修复

---

### 踩坑：AI 生 32×32 精灵反复调试过程

- **背景**：男德通像素精灵需要 32×32，尝试了多种方案
- **过程**：
  - v1 prompt：`pixel art, sprite, 8-bit, 512×512` → 比基尼 + 金属杆幻觉，质量差
  - v2 prompt：去掉 pixel art 标签，改为普通二次元 + 白底 → 不是像素风
  - v3 prompt：`1024×1024` + `pixel art, game sprite, RPG character, full clothes, chihaya anon` + 强 NSFW 过滤 → 效果略好但仍有闭眼问题
  - 最终 prompt：加 `open eyes, gentle smile, front view, character fills frame` → 0003 立姿效果好
- **教训**：
  - 32×32 太小，AI 生 1024 再降 32 倍，细节必然丢失。关键在于 prompt 填满画面 + 服饰约束 + NSFW 严格过滤
  - 不用 `pixel art` 标签时画风不对，用太强 NSFW 也不够，需平衡
  - 最终方案：1024×1024 生成 → 裁切透明边 → 降采样到 32×32
- **状态**：已定稿（0003 立姿）

---

### 踩坑：Office Objects 素材包弃用

- **背景**：为三层塔楼改造找室内家具，试了 OpenGameArt 的 Office Objects（20 号素材）
- **现象**：画风为黑白线条图标风，与 Tiny Town 的彩色像素风完全不搭
- **应对**：弃用，继续搜索或手绘
- **状态**：素材等待中

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
