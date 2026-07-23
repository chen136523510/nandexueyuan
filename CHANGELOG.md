# Changelog

> 架构级改动记录，倒序排列。

---

## 2026-07-23 德塔战斗/装备/怪物系统 + 游戏性设计调研方案（V2）

### 决策依据
- **背景**：德塔 MVP 功能已全部上线，但游戏性偏轻——成员进入德塔主要是聊天和看风景，缺少"每天想回来"的留存机制。用户提出需求：调研战斗系统、装备系统、怪物系统，设计让成员愿意留在德塔的游戏性
- **核心前提**（用户确认）：社交驱动 + 纯PVE + 20人小圈子 + 世界观先行 + 2核2G性能约束
- **V2 修正 V1 的方向性错误**：
  1. **战斗在塔外**：塔楼三层是新手村/安全区/复活点（全部开放），战斗在走出大门后的近塔森林及更远区域。V1 推荐"塔楼楼层副本"是错误方向
  2. **装备有数值但人物无等级**：装备提供攻击/防御等数值，但数值差异小（2-3倍），靠外观和机制差异化。V1 推荐"无属性纯皮肤"是矫枉过正
  3. **世界观先行**：世界观是战斗/装备/怪物的**前置任务**，游戏性从世界观提炼，不是反过来。V1 先定机制再套世界观，顺序反了
  4. **黑机做世界观**：黑机用酒馆+DeepSeek 创作世界观叙事（区域生态/NPC小传/怪物图鉴），白机从叙事提炼游戏性

### V2 方案核心内容

| 系统 | 推荐方案 | 核心理念 |
|------|---------|---------|
| 世界脉络 | **世界观骨架**：世界地图（德塔=第一大块区域=塔楼+塔外森林）、混合解锁（塔楼线性+塔外自由）、三层脉络（环境叙事/NPC故事/探索推进） | 世界观驱动游戏性，不是机制驱动 |
| 战斗 | **塔外区域战斗**：塔楼=安全区/复活点，塔外森林=战斗区，裂隙机制驱动战斗循环 | 走出大门进入荒野 |
| 装备 | **数值+机制差异化**：装备有数值（差异小），人物无等级，靠机制差异化（属性克制/特殊效果） | 变强靠装备不靠升级 |
| 怪物 | **裂隙刷新机制**：空间裂隙定时出现→泄漏怪物→玩家击杀→可封印裂隙。每日BOSS+每周轮换 | 从世界观设定自然推导 |
| 游戏性 | **三大留存支柱**（世界观驱动版）：每日仪式感/共同目标/人情记忆 | 从世界观提炼，非凭空设计 |
| 性能 | **黑机代劳**：怪物AI计算/世界状态服务/AI NPC对话可外包黑机（参考R-005架构） | 2核2G性能约束 |

### 关键设计决策
1. **无主线叙事**：用世界脉络替代主线——世界观本身提供方向感，NPC 故事通过对话自然流露（适配 AI NPC）
2. **世界地图**：德塔及塔外区域 = 第一大块区域"德塔"，是男德学院在此空间开辟的第一块落脚点
3. **塔楼三层全部开放**：一开始就完全开放，是所有人共同的复活点（初入德塔在此复活）
4. **世界观提炼方法论**：世界观中的"问题"→游戏中的"目标"；"限制"→"规则"；"资源"→"收集品"；"人物"→"NPC"
5. **黑白机分工**：黑机（酒馆）做叙事创作，白机做游戏性提炼+代码

### 影响评估
- **更新文件**：`prd/01-需求文档/04-德塔/01-需求/德塔战斗系统调研方案.md`（V2，498 行，含世界脉络骨架供黑机创作输入）
- **数据库预估新增表**：Monster/MonsterSpawn/Material/Equipment/Inventory/Rift/BattleRecord/CheckIn/TowerProgress（9 张，待 PRD 细化）
- **关联文档**：`德塔世界观.md` V2 扩展路线、`ADR-003`
- **下一步**：需求池登记 R-009 → 黑机启动酒馆世界观创作 → 世界观产出后白机提炼游戏性 → PRD MECE → 阶段1开发

---

## 2026-07-23 R-007 版本号规则规范化（ADR-004）

### 决策依据
- **背景**：项目版本号长期无序——`package.json` 停留在脚手架 `0.0.1` 死值且从未被读取；真实版本号在数据库 `Version` 表由 `seedVersion.js` 硬编码；数据库仅 v2.0.0 一条，v1.1.0/v1.2.0 声称已记录但实际缺失；`createVersion` API 无格式校验；无版本号规则 ADR
- **需求**：R-007 规则已在需求池定稿（x.y.z 三段式 + 混合发版只递增最高级别），需落地到工程

### 替代方案对比
| 方案 | 描述 | 选择 |
|---|---|---|
| A. 轻量规范 | 仅写 ADR + 校准 package.json + 文档化发版流程 | ❌ 规则约束力弱，仍靠人工自觉 |
| **B. 中等落地** | ADR + 校准 package.json + 补录历史 + API 格式校验 + 发版流程文档化 | ✅ 采用 |
| C. 完整工程化 | 中等落地 + 前端构建期注入版本号 + bump 自动化脚本 | ❌ 前端版本来自 API，注入多余；单人项目自动化 ROI 低 |

### 影响评估
- **新增文件**：`prd/01-需求文档/00-调研/decisions/ADR-004-版本号规则规范化.md`（决策记录：x.y.z + v 前缀 + 递增规则 + 三者一致性约定 + 替代方案否决理由）
- **版本号校准**：`package.json`（根）+ `server/package.json` 的 `version` 从 `0.0.1` -> `2.0.0`（与线上 v2.0.0 对齐；npm 规范不带 v 前缀，数据库带 v 前缀，映射关系见 ADR-004）
- **历史版本补录**：`seedVersion.js` 从单版本写死改造为版本数组循环幂等写入，补录 v1.1.0（2026-07-20 NPC 精灵+检索优化+公告系统）、v1.2.0（2026-07-21 黑机外包检索），依据根 CHANGELOG.md 还原
- **API 校验**：`announcementController.js` 的 `createVersion`/`updateVersion` 新增 semver 格式校验（正则 `^v\d+\.\d+\.\d+$`），不合规返回 PARAM_ERROR
- **发版流程文档化**：`deploy.sh` 第9步注释更新；ADR-004「影响」章节明确发版 bump 流程（bump package.json -> 改 seedVersion.js -> 部署）
- **发版 skill 配套**：新增 `.zcode/skills/release-helper/SKILL.md`（发版助手 skill），自动计算版本号、提炼公告、修改 package.json/seedVersion.js/CHANGELOG/handoff，触发词"发版"/"release"/"版本号"
- **关联文档**：`prd/01-需求文档/00-基础数据/需求池.md` R-007、ADR-004

### 关键决策
1. **带 v 前缀**：数据库已有 v2.0.0 格式，保持向后兼容；package.json 遵循 npm 规范不带前缀，两者映射关系在 ADR-004 说明
2. **三者一致**：package.json version（不带 v）= 数据库最新 Version.version（带 v）= 线上应用版本
3. **不做前端构建注入**：前端版本展示 100% 来自后端 API，注入 `__APP_VERSION__` 会引入双源不一致风险

### 验证
- 正则校验 10 个用例全过（合规 v2.0.0/v1.1.0/v1.2.0 通过，缺前缀/两段/四段/预发布均拒绝）
- `seedVersion.js` 执行 3 条版本记录幂等写入，数据库核实 v2.0.0/v1.2.0/v1.1.0 倒序排列
- `npm run build` 构建通过

---

## 2026-07-23 抽取公共 TopBar 组件，统一三页导航（BUG-W04）

### 决策依据
- **背景**：用户反馈进入男通讯录（/admin）后导航页签左对齐、师德墙和德塔入口消失。排查发现导航栏在 MainView、AdminView、WallView 三处各自硬编码，新增师德墙模块时漏改 AdminView
- **方案对比**：
  - 方案A（最小改动）：仅补全 AdminView 缺失的2项 + 加 `justify-content: space-between`。止血快但3处重复代码债仍在
  - 方案B（抽公共组件）：新建 `TopBar.vue`，三页统一引用。根治问题，以后新增模块只改一处
- **决策**：采用方案B，一次根治杜绝再次漏改

### 影响评估
- **新增文件**：`src/components/TopBar.vue`（公共导航组件，含5项菜单 + UserAvatar + ProfileDialog）
- **重构文件**：`MainView.vue`、`AdminView.vue`、`WallView.vue` 三页内联导航替换为 `<TopBar />`，各自删除旧 topbar CSS 和不再需要的 import/逻辑
- **行为变化**：AdminView 导航从3项补全为5项且右对齐；WallView 导航右侧从"← 返回首页"链接改为统一头像（与其他页一致）
- **关联文档**：`prd/01-需求文档/06-师德墙/bug-log.md` BUG-W04、`changelog.md`

---

## 2026-07-23 师德墙模块 + 系统管理员账号（R-008 / v2.0.0）

### 决策依据
- **背景**：男德学院现有功能偏工具向（聊天检索、游戏世界），缺少用户之间的轻社交互动
- **方案**：新增师德墙模块（类似校园墙 / 朋友圈），支持图文动态、评论、点赞

### 影响评估
- **数据库变更**：新增 `posts` / `comments` / `likes` 三张表，Prisma 迁移 `20260723020354_add_wall_tables`
- **新增账号**：系统管理员 `_system`（status=disabled，不可登录），系统默认数据统一归属
- **API 变更**：新增 7 个 RESTful 接口（`/api/wall/*`），含 multer 图片上传
- **前端变更**：新增 `WallView.vue`（横向画展布局）+ `src/api/wall.js`，导航栏新增「师德墙」入口
- **新增文件**：`seedWall.js`（种子动态）、`seedVersion.js`（版本公告）、`wallController.js`
- **deploy.sh 变更**：部署步骤 9 -> 11，增加 seed.js / seedWall.js / seedVersion.js 执行
- **关联文档**：`prd/01-需求文档/06-师德墙/师德墙.md`、`需求池.md` R-008

### 关键决策
1. **横向画展布局**：动态卡片从左到右滚动排列，左侧竖排标题栏，给人逛画展的浏览体验
2. **系统管理员账号**：种子动态等系统默认数据不挂在具体用户头上，避免"陈梓键既是开发者又是用户"的误解
3. **命名变更**：开发过程中"男德墙"改为"师德墙"，全局替换（前端 + 后端 + 文档）

---

## 2026-07-22 P4 角色创建系统 - skinId 后端持久化 + 角色选择页

### 决策依据
- **背景**：R-003 阶段 1 完成了 5 套形象的精灵/立绘/HUD 接入，但 `skinId` 仅存于前端 localStorage
- **问题**：换设备/清缓存即丢失形象选择，且未与账号绑定，无法追溯
- **方案**：将 skinId 提升为 User 模型字段，通过 API 持久化；新增角色选择页（仅进德塔时拦截）

### 影响评估
- **数据库变更**：`users` 表新增 `skinId TEXT` 列（nullable，null=未选择），Prisma 迁移 `20260722075830_add_skin_id_to_user`
- **API 变更**：新增 `PUT /api/user/skin`（auth 路由），`publicUser()` 投影新增 skinId 字段
- **前端路由变更**：新增 `/character` 路由 + 路由守卫（仅进 `/nde` 时检查 skinId===null -> 跳角色选择）
- **前端状态变更**：auth store 新增 `loaded` 状态标记，login/register/fetchMe 同步 skinId 从后端
- **新增文件**：`src/views/CharacterView.vue`（横向角色选择页）
- **关联文档**：`prd/01-需求文档/04-德塔/changelog.md`、`需求池.md`

### 关键决策
1. **路由守卫按需拦截**：初版"任何页面 + skinId=null 强制跳角色选择"改为"仅进德塔 `/nde` 时拦截"，首页/男德通/个人中心等页面不受影响，用户体验更自然
2. **角色选择页横向卡片**：5 个形象横向均分排列（flex 自适应），上立绘下精灵，仅标注"形象 A~E"无描述文字，暗色原神风格 UI
3. **localStorage 兜底**：初始化时读 localStorage 避免刷新误判，后端 user.skinId 覆盖后同步写回 localStorage

---

## 2026-07-22 黑机外包检索算力 - WebSocket 长连接方案（R-005 / BUG-36 架构优化）

### 决策依据
- **背景**：R-002 多 Agent 协作检索 v2 上线后，全量检索导致 2 核 2G 服务器 OOM 崩溃（BUG-36），临时降级为 LIMIT 50/30 导致精度严重下降
- **触发**：用户提出"黑机配置比较高，能不能把这部分性能瓶颈外包给黑机"
- **基准测试**：黑机（R7 9700X / 32GB DDR5）全量 `nickname LIKE '%xxx%'` 查询 51 万行仅需 0.07-0.13 秒，PRAGMA 2GB cache 后更快

### 替代方案对比
| 方案 | 描述 | 优点 | 缺点 | 选择 |
|---|---|---|---|---|
| A. frp 内网穿透 | 云端跑 frps，黑机跑 frpc，HTTP 调黑机检索服务 | 改动小，标准 HTTP 可 curl 调试 | 需自写降级逻辑，依赖 frp 进程 | ❌ 否决 |
| **B. WebSocket 长连接** | 黑机 WS Worker 主动出站连接云端 WS Hub，云端通过 WS 下发任务 | 不需要公网 IP，天然降级，断线自动重连 | 改动偏大，WS 调试难度高 | ✅ 采用 |

### 影响评估
- **架构级**：首次引入跨机协作检索，云端 Express 从 `app.listen` 改为 `http.createServer` + WS Hub 挂载
- **服务拓扑变更**：新增黑机 PM2 进程 `search-worker`，7×24 常驻，通过 WS 连接云端
- **降级策略**：黑机在线+重度任务→黑机全量检索；离线/超时→降级本地 LIMIT 50；轻量任务始终本地
- **新增依赖**：`ws@^8.18.0`
- **新增配置**：`BLACK_WORKER_TOKEN`（鉴权）、`CLOUD_WS_URL`（黑机连接地址）
- **Nginx 变更**：新增 `/search-hub` WebSocket 反代
- **关联文档**：`prd/01-需求文档/04-德塔/changelog.md`、`bug-log.md` BUG-36、`需求池.md` R-005、`deploy-production.md` v1.1

### 关键决策
1. **选 B 不选 A**：黑机出口网络有间歇性中断，WS 自动重连 + 天然降级比 frp 更健壮
2. **只外包重度任务**：person_messages 和 mentioned 外包黑机全量检索，person_stat 和 topic_search 始终本地（轻量任务不值得增加网络延迟）
3. **数据同步用 scp**：黑机 7×24 常开，首次全量 scp prod.db，后续可增量推送

### 文件变更
| 文件 | 动作 |
|------|------|
| `server/src/searchHub.js` | 新增 - 云端 WS Hub |
| `server/src/searchWorker.js` | 新增 - 黑机 WS Worker |
| `server/scripts/benchmark-query.js` | 新增 - 性能基准测试 |
| `scripts/sync-prod-db.sh` | 新增 - 数据同步脚本 |
| `server/src/agents/orchestrator.js` | 改 - dispatchAgent 双路调度 |
| `server/src/agents/personMessagesAgent.js` | 改 - 加 options.limit |
| `server/src/agents/mentionedAgent.js` | 改 - 加 options.limit |
| `server/src/agents/contextSearch.js` | 改 - 加 options.maxIds |
| `server/src/index.js` | 改 - http.createServer + attachSearchHub |
| `server/package.json` | 改 - 新增 ws 依赖 |

---

## 2026-07-20 晚 玩家精灵四方向行走系统 + 5 套形象（R-003 阶段 1）

### 决策依据
- **背景**：原玩家为 32×32 蓝色色块（`player_default`），无形象差异、无行走动画（仅靠 `setFlipX` 翻贴），20 人社区无法体现个人特色
- **触发**：用户拉取最新代码后明确需求："玩家精灵先全作为少女形象，5 套差异化，参考鸣潮/原神风，四方向行走动画用于玩家行动"
- **现状核查**：项目历史 0 处 `anims.create`/`anims.play` 调用，Phaser 动画系统从未启用；PlayerState schema 有 `facing`/`anim` 字段但前端 `updateOtherPlayer` 完全丢弃；HUD `<canvas class="avatar-canvas">` 空白从未绘制

### 替代方案对比
| 方案 | 描述 | 优点 | 缺点 | 选择 |
|---|---|---|---|---|
| A. ControlNet OpenPose 逐帧 | SDXL + ControlNet 约束 16 帧姿势 | 角色一致性最强 | 需下载 8GB 模型，调试 2-4 小时 | ✅ 采用（待模型下载） |
| B. waiIllustriousSDXL 直出 spritesheet | 复用现有二次元大模型 | 无需下载 | 角色一致性差，像素感弱 | ❌ 否决 |
| C. 立绘降采样单帧 + flipX | 复用现有立绘直接降采样 | 最快 | 无真正动画感 | ❌ 否决 |

### 影响评估
- **架构级**：首次启用 Phaser 动画系统，新增 `createPlayerAnimations` 模块（40 anims）
- **schema 变更**：PlayerState 加 `skinId: 'string'` 字段，向后兼容（默认 '1'，旧客户端自动得默认值）
- **资源目录**：`public/game/sprites/players/` + `public/game/sprites/avatars/` + `public/game/portraits/player_set{N}.png` 新增 5 套资源位（现仅 .gitkeep，待 ComfyUI 生成）
- **跨机影响**：白机无需改动，schema 默认值兼容；黑机需下载 SDXL/Pixel-Art-XL LoRA/ControlNet OpenPose SDXL 共 8GB
- **关联文档**：`prd/01-需求文档/04-德塔/changelog.md` 详细技术方案；`bug-log.md` BUG-35

### 关键决策
1. **5 套全少女**：用户明确要求"玩家精灵先全作为少女形象"，社区 20 人共用 5 套（后续 P4 角色创建系统可扩展到每人独立）
2. **set5 参考金克丝发型**：用户指定双长辫子（two long braids）配赛博机甲服
3. **立绘与精灵分离**：立绘摆很多 pose（鸣潮/原神风），精灵是常态动作（行走），两者 prompt 不同
4. **skinId 走 localStorage**：不进后端用户表，后续 P4 接入时再迁移
5. **切换形象重进生效**：Phaser 纹理加载后不易热替换，HUD 切换立绘+头像，精灵需重连 Colyseus 触发 PreloadScene

---

## 2026-07-20 NPC思考状态spinner优化 + 传送门交互修复

### NPC 思考状态 UI 优化（ChatView + GameView）
- [修改] `src/views/ChatView.vue` - AI 思考中改用纯 CSS spinner 替代文字点号；修复气泡渲染条件（空 content + loading 时显示"正在思考..."）
- [修改] `src/views/GameView.vue` - 去掉 `startThinkingAnimation`/`stopThinkingAnimation` + `setInterval` 定时器 + `thinkingDots`/`thinkingTimer` 变量；模板改用 `nde-spinner` CSS 旋转圈
- [修复] `src/views/GameView.vue` - `closeNpcDialog` 引用已删除的 `thinkingTimer` 导致 `ReferenceError`，已清理

### 传送门交互修复（WorldScene）
- [修复] `game/scenes/WorldScene.js` - 出生点从 `towerX+320`(520) 移到 `towerX+200`(400)，远离传送门触发范围
- [修复] `game/scenes/WorldScene.js` - 大门交互判断缺少 `< nearestDist` 条件，会覆盖更近的 NPC，已统一为 `doorDist < INTERACT_DISTANCE && doorDist < nearestDist`
- [修复] `game/scenes/WorldScene.js` - 传送门交互判断缺少 `< INTERACT_DISTANCE` 上限，已统一为 `portalDist < INTERACT_DISTANCE && portalDist < nearestDist`

### 工程配置
- [修改] `.gitignore` - `*.png` 改为 `/*.png`（仅忽略根目录临时截图，不影响 `public/game/` 下游戏资源）
- commit: `6bf5e57`（已部署）

---

## 2026-07-05 P3-P5:语义检索 + 对话 UI + 会话历史
- [新增] P3: `server/scripts/buildFtsIndex.js` — FTS5 trigram 索引构建(51万条,1.8s)
- [新增] P3: `chatController.js` handleSemantic — LLM 提取关键词 → FTS5 检索 Top-5 → LLM 生成(附引用)
- [新增] P4: `src/views/ChatView.vue` — GPT 式对话 UI(气泡 + 引用折叠 + 加载动画 + 推荐问题)
- [新增] P4: 路由 `/chat`(requiresAuth)
- [新增] P4: `public/chat-test.html` — 独立测评页
- [新增] P5: `server/src/middleware/rateLimit.js` — 限流中间件(10次/分钟)
- [新增] P5: 会话 CRUD(listSessions/getSession/deleteSession)+ askChat 持久化 ChatSession/ChatTurn
- [新增] P5: 会话路由 `GET/DELETE /chat/sessions`
- [修改] `src/api/chat.js` — 补充会话 API + askChat 支持 sessionId
- [修改] `src/views/ChatView.vue` — 多轮会话(sessionId 传递)
- commit: 未提交

---

## 2026-07-05 P2:意图分类 + 统计类问答
- [新增] `server/src/utils/llm.js` — LLM 客户端(火山引擎 ARK,fetch 调用,thinking disabled)
- [新增] `server/src/controllers/chatController.js` — 意图分类 + 统计 SQL 问答 + 闲聊
- [修改] `server/src/routes/api.js` — 注册 `POST /api/chat/ask`
- [修改] `src/api/chat.js` — 新增 askChat 方法
- [修改] `server/.env` / `.env.example` — VOLC_BASE_URL 改为 `/api/coding/v3`(编程端点,支持 GLM)
- 验证:"群里发言最多的人是谁" → 正确返回"我,108689 条"
- 修复:BigInt 序列化、GLM 5.2 推理模型 thinking 禁用、网络超时兜底
- commit: 未提交

---

## 2026-07-05 真实群聊数据导入
- [新增] `.trae/tool-WeChatMsg-master/export_chat.py` — 从微信 db 导出文本消息 CSV 脚本(protobuf 解析群聊发送者)
- [新增] `server/scripts/importChat.js` — 流式导入脚本(直接读文件,不走 HTTP,5000 条/批)
- 数据:51 万条文本消息(chat_export.csv, 37.6MB),跳过 134 条,批次 ID=2
- 证实:文本消息仅几十 MB,2G2核服务器完全胜任
- commit: 未提交

---

## 2026-07-05 P1:群聊数据导入管线
- [新增] `server/src/controllers/chatImportController.js` — CSV 上传 + 解析 + 归一化 + 去重 + 事务写入
- [新增] `src/api/chat.js` — 前端 API 模块(导入 + 批次列表)
- [修改] `server/src/routes/api.js` — 注册 `/admin/chat/import`、`/admin/chat/batches` 路由
- [修改] `server/prisma/schema.prisma` — 去掉 GroupMessage 唯一约束(SQLite 批量导入不支持 skipDuplicates)
- [新增] `server/prisma/migrations/20260705141607_drop_group_message_unique/migration.sql`
- 依赖:新增 multer 2.2.0、csv-parse 7.0.1
- 验证:测试 CSV 10 条全部导入成功,batchId=1
- commit: 未提交

---

## 2026-07-05 P0:AI 助手数据模型落地
- [新增] `server/prisma/schema.prisma` — 新增 GroupMessage / ImportBatch / ChatSession / ChatTurn 模型,User 加反向关系字段
- [新增] `server/prisma/migrations/20260705140936_add_chat_ai_models/migration.sql` — 建表迁移(含索引与唯一约束)
- [修改] `server/.env` / `.env.example` — 新增 AI 助手环境变量块(VOLC_API_KEY / VOLC_BASE_URL / VOLC_MODEL / VOLC_EMBED_MODEL / CHAT_RATE_LIMIT)
- 选型:Embedding 模型 doubao-embedding-text-240715(1024 维);对话模型 glm-latest;向量库 sqlite-vec(P3 阶段接入)
- commit: 未提交

---

## 2026-07-05 新增 AI 助手 PRD
- [新增] `prd/03-功能模块/AI助手.md` — 群聊数据 AI 问答模块 PRD（业务契约 + MECE 边界 + 实施路径）
- [修改] `prd/README.md` — 文档索引新增 AI 助手条目
- 决策摘要：数据来源 WeChatMsg CSV；AI 方案 B+C 混合（统计类 SQL + 语义类 RAG）；向量库 sqlite-vec；LLM 火山引擎 glm-latest；权限全局共享；前端 GPT 式对话 UI；展示引用来源
- commit: 未提交

---

## 2026-07-01 新增用户认证系统
- [新增] `server/src/lib/` — Prisma Client 单例层
- [新增] `server/src/utils/` — 工具层（response/jwt/password/inviteCode）
- [新增] `server/prisma/` — Prisma schema + 迁移 + seed 脚本
- [修改] `server/src/controllers/` — 新增 auth/user/inviteCode/admin 四个控制器
- [修改] `server/src/middleware/` — 新增 auth 中间件，重构 errorHandler
- [修改] `server/src/routes/api.js` — 注册全部认证/用户/邀请码/成员管理路由
- [修改] `src/api/` — 重构 axios 拦截器，新增 auth/user API 模块
- [新增] `src/stores/auth.js` — 认证状态管理
- [新增] `src/views/` — LoginView/RegisterView/ProfileView
- [修改] `src/router/index.js` — 路由守卫（requiresAuth/guestOnly）
- commit: 未提交

---

## 2026-07-01 修复换设备依赖安装流程
- [修改] `.trae/rules/git-manage.md` — 换设备流程改用 `corepack enable pnpm`，移除对 gitignore 的 `package/` bundle 依赖
- [修改] `CONTRIBUTING.md` — 安装步骤同步改用 corepack，移除 pnpm bundle 说明
- commit: b4120f1

---

## 2026-07-01 优化协作指南
- [修改] `CONTRIBUTING.md` — 新增技术栈与项目结构说明；补充 Node 版本要求、Git 首次配置、SSH key/PAT 认证配置；合并重复的分支工作流章节；补充 commit scope 规范与 PR 描述模板；扩充常见问题（误提交大文件/commit 错分支/撤销提交）；修正跨平台命令（cp/copy）
- commit: 0825466

---

## 2026-07-01 引入 GitHub 托管 + 多人协作
- [新增] `CONTRIBUTING.md` — 协作开发指南（面向丘序明：环境搭建/分支工作流/提交规范/PR 流程）
- [修改] `.trae/rules/git-manage.md` — 中央仓库由服务器 bare 改为 GitHub；分支策略明确角色分工（陈梓键维护 master、丘序明 feature+PR）；部署/换设备流程改为从 GitHub 拉取
- commit: 5e3fdd3

---

## 2026-06-30 .trae 目录 gitignore + 部署规则强化
- [修改] `.gitignore` — 忽略 `.trae/*`（IDE 技能库等资源），例外保留 `.trae/rules/` 项目规则
- [新增] `.trae/rules/git-manage.md` — 纳入 git 跟踪；强化部署流程（部署前必须 commit+push）+ 补充功能分支合并规则
- commit: 未提交

---

## 2026-06-30 多媒体目录 + git 管理规则
- [新增] `public/media/` — 多媒体数据目录（avatars/posts/activities/temp）
- [新增] `.trae/rules/git-manage.md` — git 管理规则（开发流程/分支策略/提交规范/部署流程）
- [修改] `.gitignore` — 忽略 *.db 数据库文件 + public/media 实际文件（保留 .gitkeep）
- commit: 未提交

---

## 2026-06-29 PRD 文档库建立 + env 规范
- [新增] `prd/` — PRD 文档库（01-需求调研/02-技术架构/03-功能模块/04-接口契约）
- [删除] `需求调研.md` — 内容拆解至 prd/01-需求调研/ 各模块文档
- [新增] `.env.example` — 环境变量模板（提交 git）
- [新增] `.env` — 实际环境变量（不提交，含服务器/域名/JWT/数据库配置）
- commit: 未提交

---

## 2026-06-29 前后端项目结构规范化
- [新增] `src/api/` — 请求层（axios 实例 + 接口模块）
- [新增] `src/router/` — 路由层（Vue Router）
- [新增] `src/stores/` — 状态管理层（Pinia）
- [新增] `src/views/` — 页面视图层
- [新增] `src/components/` — 通用组件层
- [新增] `src/styles/` — 样式层（variables + base，替换原 styles.css）
- [删除] `src/styles.css` — 拆分为 styles/variables.css + styles/base.css
- [新增] `server/src/routes/` — 后端路由层
- [新增] `server/src/controllers/` — 后端控制器层
- [新增] `server/src/middleware/` — 后端中间件层
- [修改] `src/App.vue` — 精简为根布局（仅 router-view）
- [修改] `src/main.js` — 挂载 pinia + router
- commit: 未提交

---

## 2026-06-29 首页设计与脚手架修复
- [修改] `src/App.vue` — 重写为首页（hero + stats + features + footer）
- [新增] `src/styles.css` — 补全 main.js 引用缺失的样式文件（后已拆分）
- [新增] `server/` — 后端骨架（Express + cors）
- [新增] `pnpm-lock.yaml` / `pnpm-workspace.yaml` — pnpm 配置
- [修改] `.gitignore` — 忽略 pnpm standalone bundle
- commit: `fa58eaf`

---

## 2026-06-29 项目初始化
- [新增] 前端脚手架 — Vue 3 + Vite（index.html, App.vue, main.js, vite.config.js）
- [新增] `.gitignore` — 项目级忽略规则
- [服务器] 新建 bare 中央仓库 `/root/projects/www.nandexueyuan.top.git`
- commit: `27446e7` / `60c8416` / `1b1e203`
