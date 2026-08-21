# Changelog

> 架构级改动记录，倒序排列。

---

## 2026-08-21 v3.6.0 男德通 AI 优化（glm-5.3 + FTS5 v2 + 记忆压缩 + 人设重构）

### 概要

男德通 AI 两批优化落地：主模型 glm-5.2->glm-5.3、人设系统重构（基础模板中性化+默认改 normal）、FTS5 方案A（unicode61+预分词，2 字中文词可检索）、超 10 轮对话自动记忆压缩、多轮追问（lastIntent 注入规划）、同义词缓存（LRU）、人名精确匹配、圈外常谈人物、温度常量集中、黑机超时 60s、parseTasks 兜底、版本号动态化。

### 代码变更

| 文件 | 变更 |
|------|------|
| `server/src/utils/llm.js` | MODEL 默认 glm-5.3；新增 TEMPS 温度常量集中导出（PLANNING/ANALYSIS/CHAT/FEEDBACK/NPC） |
| `server/src/utils/persona.js` | BASE_TEMPLATE 中性化（去"老群友"默认身份）；PERSONAS normal 置首；默认 tiwei->normal |
| `server/src/utils/knowledge.js` | 版本号硬编码 v3.2.0 改动态读 package.json；新增 frequentPersons（开开/周姐=高中同班同学）注入知识库 |
| `server/src/utils/tokenizer.js` | 新建：中文分词工具（≤4 字整词 + 长词 bigram 滑窗），FTS5 方案A 核心 |
| `server/src/agents/orchestrator.js` | isCasualChat 上下文感知（情绪反应词有上下文不短路）；parseTasks 兜底；buildPlannerPrompt +lastIntent 多轮追问；温度改 TEMPS |
| `server/src/agents/memoryCompress.js` | 新建：超 20 turns 压缩早期轮次为摘要，注入 system 消息 |
| `server/src/agents/topicSearchAgent.js` | FTS5 查询切 v2 表；同义词扩展加 LRU 缓存 |
| `server/src/agents/personStatAgent.js` + `personMessagesAgent.js` | nickname LIKE 改 `=` 精确匹配 |
| `server/src/agents/mentionedAgent.js` | FTS5 切 v2 + buildFtsQuery |
| `server/src/agents/semanticAgent.js` + `statisticAgent.js` | 标注已弃用（工程经验保留） |
| `server/src/searchHub.js` | TASK_TIMEOUT 15s->60s |
| `server/src/controllers/chatController.js` | 记忆压缩集成；lastIntent 读取传入；NPC 温度改 TEMPS |
| `server/prisma/schema.prisma` | ChatSession +summary String? |
| `server/scripts/rebuildFtsV2.js` | 新建：FTS5 v2 索引重建脚本（unicode61+预分词） |
| `src/views/ChatView.vue` | 默认人设 normal；记忆压缩提示条 UI（details 折叠） |

### 决策依据

glm-5.3 实测连通（thinking:disabled 仍被 400，与 5.2 行为一致，不传即可）。FTS5 trigram 对 2 字中文词先天缺陷（3 字符滑窗无 2-gram），方案A 用 unicode61+预分词根治（≤4 字整词入索引，>4 字 bigram 滑窗），7/7 验证通过（考研命中 202 块，旧版 0 命中）。记忆压缩阈值 20 turns（=10 轮对话），前端 details 折叠条防误操作。人名 personStat/personMessages 改 `=` 精确匹配（只查本人发言），mentioned 保持 LIKE（职责就是搜"别人提到"）。prompt caching 实测火山自动生效（cached_tokens=1024），无需代码改动。

### 影响评估

男德通对话链路全面升级，纯文字消息回归正常。FTS5 v2 新表与旧 trigram 表并存（回退用），线上已重建（30 秒，5,372 块+538,915 消息）。ChatSession 新增可空 summary 列。部署已完成：.env glm-5.3 + prod.db ALTER TABLE summary + rebuildFtsV2 + pm2 restart。

---

## 2026-08-20 v3.5.0 男德通多模态一期（图片理解）

### 概要

男德通 AI 对话新增图片理解能力：主 Agent（glm-5.2，coding plan）+ 视觉子 Agent（doubao-seed-2-0-mini-260428，标准按量端点）双层架构，用户发图男德通先识别再回答。识别描述回写 user turn，历史上下文自带图片记忆。

### 代码变更

| 文件 | 变更 |
|------|------|
| `server/src/utils/llm.js` | 新增 visionChatCompletion()：标准端点 `/api/v3`（VOLC_STD_BASE_URL/VOLC_VISION_MODEL/VOLC_VISION_API_KEY），thinking disabled |
| `server/src/agents/visionAgent.js` | 新建：第 8 个子 Agent，读图转 base64 调视觉模型，路径白名单 |
| `server/src/agents/orchestrator.js` | orchestrate 第 6 参 images；带图先识别（跳过闲聊/快速短路）；识别结果注入全阶段；回传 imageDescriptions |
| `server/src/controllers/chatController.js` | 新增 POST /chat/upload（4MB 白名单）；askChat 接收 images 数组落库+描述回写 |
| `server/prisma/schema.prisma` | ChatTurn +images String? 列 |
| `src/views/ChatView.vue` | 🖼️按钮+预览条+气泡缩略图+历史恢复 |

### 决策依据

主模型 glm-5.2 是纯文本模型无法看图，院长"主 Agent 识别到图像需求时调子 Agent"的设想落地为"带图必先识别"（省一次 LLM 判断调用且必正确）。图片传火山用 base64 data URL 而非公网 URL：服务器图片无公网地址（dev 是 localhost），base64 在 dev/prod 行为一致。视觉模型选 doubao-seed-2-0-mini：输入 0.2 元/百万 tokens（单图约 0.001 元），与现有 VOLC_API_KEY 同 key 可用（curl 实测）。替代方案：换多模态主模型（glm-5.2 换 VLM，成本高且丢 coding plan 通道）被否。

### 影响评估

男德通对话链路新增视觉能力，纯文字消息链路零变化（回归实测通过）。数据库 chat_turns 新增可空列，旧数据不受影响。部署需 prod.db 手动 ALTER TABLE（检查单见 handoff）。

---

## 2026-08-17 v3.4.0 星河问运势模块（门户趣味新模块）

### 概要

学院大厅第三行新增「星河问」卡片（词云 12 列缩至 8 列让位）：今日运势（星级/宜忌/幸运数字色/三维运势条/签语）+ 星座分析（12 宫选择/综合指数/生日登记本命星座）。纯前端确定性生成，零 LLM 成本。

### 代码变更

| 文件 | 变更 |
|------|------|
| `src/utils/fortune.js` | 新增：FNV-1a+mulberry32 确定性伪随机生成器、星座月日换算、莫兰迪色系文案池 |
| `src/components/FortuneCard.vue` | 新增：星河问卡片组件（双 tab+生日登记 localStorage 持久化） |
| `src/views/MainView.vue` | 大厅第三行布局改版（8+4 列），断点同步 |
| `tests/e2e/fortune.spec.js` | 新增：4 用例 e2e（内容完整性/星座切换/布局/深色模式） |

### 决策依据

两方案对比：A 纯前端模板生成（确定性伪随机+文案池）vs B 接男德通 LLM 生成。选 A：零成本秒开（B 有 5-15s 延迟+token 成本）、梗可控（文案池可按院长口味调整）、同人同天结果恒定符合"运势"心理预期。B 作为未来升级路径保留（换数据源即可）。

命名沿革：观星台 -> 星河问签 -> **星河问**（院长四方案裁决后自定）。

### 影响评估

- 新增 `src/utils/changelog.md`（该目录层此前无 changelog）
- 生日登记存 localStorage `nde-birth-md`，不动后端数据库
- e2e 基建首次在本机安装 Playwright chromium 二进制

---

## 2026-08-13 v3.3.0 门户趣味化 + 全站主题体系 + 移动端基础设施

### 概要

社区站门户（落地页 + 大厅）趣味化改版，同时引入两项跨层基础设施：**全站主题体系**（新增 `src/composables/` 目录层 + `useTheme` 单例 + `:root[data-theme='dark']` token 覆写，实现晚自习深色模式）和**移动端导航体系**（全局 BottomNav 底部 tab 栏 + `body.has-bottom-nav` 占位机制 + 德塔桌面端路由守卫）。大厅接入真实群聊数据看板（`/chat/db-info` REST 端点，复用 dbInfoAgent SQL）。德塔资产（立绘/背景图）明确边界：仅限德塔内使用，社区站页面不展示。

### 代码变更

| 文件 | 变更 |
|------|------|
| `src/composables/useTheme.js`（新增层） | 主题单例组合式函数：auto（18:00~7:00 自动深色）/light/dark 循环，localStorage 持久化，跨时辰自动刷新 |
| `src/styles/variables.css` | 新增 `:root[data-theme='dark']` 全量 token 覆写（青灰底+暖米白字+主色提亮+按钮深底字）；`:root` 补 `color-scheme: light` |
| `src/components/ThemeToggle.vue`（新增） | 主题开关（自动→深色→浅色循环），接入 TopBar + 落地页 |
| `src/components/BottomNav.vue`（新增） | 移动端底部 tab 导航（4 入口，安全区适配），App.vue 按路由+窄屏挂载 |
| `src/App.vue` | 主题初始化 + 页面转场升级（淡入+上浮缩放）；BottomNav 全局挂载 + `body.has-bottom-nav` 占位 |
| `src/views/HomeView.vue` / `MainView.vue` | 门户改版：时辰问候、数字滚动、Top5 头像奖牌、打字机提问、公告未读红点、词云词频提示 |
| `src/router/index.js` | 德塔移动端守卫：窄屏（≤768px）访问 /nde 回大厅（手游/页游差距大，德塔仅桌面端） |
| `server/src/agents/dbInfoAgent.js` + `chatController.js` + `routes/api.js` | 新增 `GET /chat/db-info` 数据看板端点（auth），复用 queryDbStats SQL |
| `src/views/LoginView.vue` 等 8 个视图 | 移动端适配：380px 卡片溢出、100vh→100dvh+底栏让位、AdminView 堆叠、深色回归白底 token 化 |

### 决策依据

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 主题方案 | `html[data-theme]` 属性 + CSS token 覆写（非 class 切换） | 存量页面全部已 token 化，一处覆写全站生效；属性选择器不污染 class 语义 |
| 主题状态管理 | 模块级单例（`src/composables/useTheme.js`），非 Pinia | 主题是全局 UI 状态、无跨组件数据流，单例 + 组合式函数最轻 |
| 底部导航挂载位置 | App.vue 全局按路由挂载（非 TopBar 内部） | ChatView/FeedbackView 无 TopBar，全局挂载才能覆盖 4 个主功能路由 |
| 德塔移动端处理 | 入口隐藏（抽屉过滤+底栏移除）+ 路由守卫兜底 | 手游与页游差距大，德塔不做移动端；守卫防收藏夹/旧链接进入 |
| 数据看板接口 | 复用 dbInfoAgent 的 queryDbStats，前端/Agent 共用 | 避免双份 SQL 漂移；字段裁剪不返回话题块样本 |

### 影响评估

- **影响范围**：全站页面（落地页/大厅/师德墙/男德通/院长信箱/管理后台/登录注册）视觉与移动端体验；新增深色主题全局生效
- **不影响**：德塔视觉小说本体（未改动游戏逻辑）；后端 AI Agent 流程（仅新增只读统计端点）
- **兼容性**：`npm run build` 通过；全动效带 `prefers-reduced-motion` 兜底；触屏设备降级（立绘探出等 hover 交互已按院长要求移除）；100dvh 带 100vh 回退
- **边界**：德塔资产（立绘/背景/CG）仅限德塔内使用，社区站页面不展示（院长红线）

---

## 2026-08-10 v3.1.0 全局自定义弹窗基础设施 + a11y 无障碍改造

### 概要

引入全局自定义弹窗组件（GlobalDialog + Pinia store），替换全站 13 处原生 `alert()`/`confirm()`，消除浏览器原生弹窗的样式割裂和测试阻塞问题。同时完成 a11y 第 2/3 阶段改造（views/components 层 9 处图标按钮补语义化属性，白名单清零）。项目从"图标按钮零语义 + 原生弹窗"升级为"全量 aria-label/data-testid + 统一莫兰迪风格弹窗 + role=dialog 无障碍语义"。

### 代码变更

| 文件 | 变更 |
|------|------|
| `src/stores/dialog.js`（新增） | Pinia store，暴露 `confirm()`（返回 Promise\<boolean\>）+ `alert()`（返回 Promise\<void\>），支持 danger 模式/自定义按钮文案 |
| `src/components/GlobalDialog.vue`（新增） | 莫兰迪风格弹窗组件，role="dialog" + aria-modal + data-testid + ESC 关闭 + 过渡动画 |
| `src/App.vue` | 挂载 `<GlobalDialog />` 全局组件 |
| `src/views/WallView.vue` | 6 处原生 alert/confirm 替换为 dialog.alert/confirm |
| `src/views/AdminView.vue` | 3 处原生 confirm 替换（禁用操作带 danger 红色） |
| `src/views/ChatView.vue` | 1 处原生 confirm 替换（danger） |
| `src/components/VersionHistoryDialog.vue` | 2 处原生 alert/confirm 替换 |
| `src/components/NdeSettingsDialog.vue` / `ProfileDialog.vue` / `src/views/GameView.vue`（3处）/ `WallView.vue` | a11y 第 2 阶段：9 处图标按钮补 aria-label + data-testid |
| `.a11y-ignore` | 白名单清空（第 2 阶段完成，0 待迁移项） |

### 决策依据

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 弹窗实现方式 | Pinia store + 全局组件（非 Vue 插件） | 项目状态管理统一走 Pinia，无 composable 先例；store 方式调用最简单（`await dialog.confirm()`），与原生调用习惯一致 |
| API 形态 | Promise 化（`confirm()` 返回 Promise\<boolean\>） | 原生 confirm 是同步阻塞返回 boolean，Promise 化后 `if (!await dialog.confirm()) return` 最小改动替换 |
| z-index | `var(--md-z-modal)`（100） | 修正现有 Dialog 组件用 300 越界的问题，遵循 CSS token 体系 |
| 样式 | 复用全站 modal 范式（莫兰迪 token） | 与 NdeSettingsDialog/ProfileDialog 风格统一，不引入新视觉 |

### 影响评估

- **影响范围**：全站弹窗交互（师德墙/男德通/管理后台/版本历史/德塔设置）；全站图标按钮无障碍属性
- **不影响**：业务逻辑（弹窗返回值与原生一致）；后端/游戏服务器
- **兼容性**：build 通过；lint:a11y 0 违规 0 白名单；线上全量测试通过（登录/师德墙/男德通/德塔/管理后台 5 个页面 × alert+confirm 弹窗）
- **后续**：a11y 三阶段全部完成；弹窗组件可复用于未来新页面

---

## 2026-08-10 v3.0.2 部署上线 + deploy.sh 验证脚本修复

### 概要

v3.0.2（WebP 图片压缩优化）部署上线，线上游戏资源从 146.65MB 降至 28.19MB（省 80%），显著改善进德塔加载慢的问题。部署过程中发现 deploy.sh 前端验证项误报（HTTPS 配置后 `http://localhost/` 走 80 端口对 localhost Host 头返回 404），修复为 `https://localhost/` 检测。

### 变更内容

| 文件 | 变更 |
|------|------|
| `deploy.sh` | 前端验证从 `http_code http://localhost/`（期望 200/301/302）改为 `curl -sk https://localhost/`（期望 200），适配 certbot 配置后域名级 301 跳转不匹配 localhost 的场景 |

### 部署结果（线上验证通过）

| 验证项 | 结果 |
|--------|------|
| HTTPS 域名访问 | ✅ 200 OK |
| HTTP->HTTPS 跳转 | ✅ 301 Moved Permanently |
| WebP 资源（tower_day.webp） | ✅ 200 OK，Content-Type: image/webp，453KB（旧 PNG 2.1MB） |
| 旧 PNG 资源 | ✅ 404（已替换） |
| 版本公告 v3.0.2 | ✅ 正常 |
| 后端 API / 师德墙 / 游戏服务器 | ✅ 全部正常 |

### 影响评估

- **影响范围**：线上生产环境（服务器 master `695b765` -> 本地已推 `6e98c1d`）
- **用户感知**：进德塔加载速度大幅提升（图片总体积降 80%）
- **回滚策略**：deploy.sh 改动为单 commit `6e98c1d`，可单独 revert

---

## 2026-08-10 新增 E2E 测试基建 + 前端可访问性规范

### 概要

引入 Playwright E2E 测试基础设施 + 前端可访问性/测试钩子规范，解决 GUI 自动化测试三大痛点（HTTPS 证书、原生弹窗、图标按钮定位）。项目从零测试基建升级为具备 e2e 能力 + a11y 强制扫描。德塔 visualnovel 模块完成示范改造，其余页面渐进迁移。

### 代码变更

| 文件 | 变更 |
|------|------|
| `playwright.config.js`（新增） | E2E 配置：`ignoreHTTPSErrors=true` 全局忽略证书 + baseURL 环境变量切换本地/线上 + webServer 自动起 vite |
| `tests/e2e/fixtures.js`（新增） | `autoAcceptDialogs` fixture：自动接受 alert/confirm/prompt，解决原生弹窗阻塞测试 |
| `tests/e2e/utils.js`（新增） | `clickIconBtn`（图标按钮定位：getByTestId > getByRole > getByText）+ `uploadFiles`（多类型文件上传）+ `dismissNativeDialog` + `waitForVNScene` |
| `tests/e2e/example.spec.js`（新增） | 4 个示例测试，演示三类工具用法 |
| `scripts/check-a11y.mjs`（新增） | 零依赖 a11y 扫描脚本：检查图标按钮是否带 aria-label 或 data-testid，支持 `.a11y-ignore` 白名单 |
| `.a11y-ignore`（新增） | 白名单：9 个 views/components 层待迁移项 |
| `package.json` | devDeps 加 `@playwright/test`；scripts 加 `lint:a11y`/`test:e2e`/`test:e2e:ui` |
| `prd/.../技术设计/前端可访问性与测试钩子规范.md`（新增） | 规范文档：核心规则 + 各场景细则 + data-testid 命名约定 + 定位优先级 |
| `CONTRIBUTING.md` | 新增「八、前端可访问性与测试钩子」章节 |
| `src/visualnovel/components/*.vue`（8 文件） | 德塔模块示范改造：QuickMenu/SettingsPanel/HistoryPanel/InventoryPanel/MapPanel/SaveLoadPanel/HotspotLayer/DialogueBox 补 aria-label/data-testid/role |

### 决策依据

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 工具集形态 | 建 e2e 基建（非仅模板文档） | 三痛点均可用 Playwright 原生 API 一行解决；现有 AI 测试技能链不支持 ignoreHTTPSErrors；项目零测试基建，引入有长期价值 |
| 规范强制手段 | 轻量 check-a11y.mjs（非 eslint 全家桶） | 项目 devDeps 极简，eslint 膨胀过重且报既有噪音；自制脚本零依赖、聚焦单一规则 |
| 改造范围 | 德塔示范（非全项目） | 全项目 76 个 button 一次改造量大；views 层 13 处原生弹窗替换属另一条改造线 |

### 影响评估

- **影响范围**：新增 `tests/`/`scripts/` 目录层；德塔 visualnovel 模块 8 个组件加属性（不改逻辑）
- **不影响**：现有功能行为（仅加 HTML 属性）；后端/游戏服务器代码
- **兼容性**：build 通过；a11y 扫描 0 违规（9 个待迁移项在白名单）；4 个 e2e 测试全绿
- **后续**：views/components 层待渐进迁移（每迁移完一个文件删 .a11y-ignore 对应行）

---

## 2026-08-08 v3.0.1 修复塔楼自由探索空间跳转逻辑（BUG-59）

### 概要

v3.0.0 上线后院长实测反馈"地图跳转逻辑有问题，上了楼没有下楼选项，点了睡觉还出去了"。黑机通读空间机制代码 + 线上实测复现，定位并修复 4 个空间跳转缺陷，均为 v3.0.0 空间机制迁移时的遗漏。

### 变更内容

| 类别 | 变更 |
|------|------|
| fix | 缺陷1（P0）：房间点"睡觉"触发出门剧情（ch_room_sleep_router 直接跳 ch3_leave1）-> 改为睡觉旁白（ch3_room_sleep）-> 回房间探索态（ch3_room_morning），玩家主动点"出门"热点触发信使段 |
| fix | 缺陷2（P0）：第三幕走廊 corridor.exits 只有"下一楼"无"回房间"（迁移遗漏）-> 补"回房间"出口 |
| fix | 缺陷3（P1）：第三幕大厅 hall.hotspots 有"回房睡觉"（房间在二楼，空间错乱）-> 删除，睡觉统一走 上二楼->走廊->回房间 |
| fix | 缺陷4（P1）：房间 room.exits 为空（进房间被困）-> 新增"出房间"热点 + ch_room_exit_router 路由节点（按 ch2_done 分流 corridor_free/corridor 的 onEnter 演出） |

### 影响评估

- **影响范围**：德塔视觉小说第三幕过渡段空间跳转（locations.js hall/corridor/room + chapter1.js 节点链）
- **不影响**：第二幕链路（已正常工作，未改动）；剧情文本（仅新增一句睡觉旁白）
- **兼容性**：旧存档恢复后行为与修复后一致（探索态热点由地点图实时推导）
- **回滚策略**：commit `4f48477` 可单独 revert

---

## 2026-08-07 v3.0.0 德塔空间探索机制上线：第一章第三幕「东来的信」落地

### 概要

本次发版核心是**空间探索机制（R-035）**：视觉小说引擎从"纯节点驱动"升级为"剧情（时间线）+ 空间（地点图）解耦"的双层模型——`explore` 成为节点属性（dialogue/end 均可带），进入探索态时由地点数据（LOCATIONS）生成合成节点驱动渲染。第二幕结尾（自由活动/走廊看月亮/回房间）与第一章第三幕全程迁移为探索态，玩家可在塔楼大厅/走廊/房间走动、与角色互动，存档保留空间位置。第一章第三幕「东来的信」台词全量定稿落地（含信使段：神秘信使=饶死灵傀儡，见察觉死灵气息的疑点暗线）。

### 变更内容

| 类别 | 变更 |
|------|------|
| feat(major) | 空间机制引擎（R-035）：locations.js 升级为地点图（bg/hotspots/exits/onEnter/unlockedBy）；store 新增 currentLocation/currentExploreLocation/unlockedLocations/visitedLocations + enterExplore/travelTo；explore 节点属性（dialogue/end 均可带，剧情内部可随时进出探索态）；合成节点渲染（渲染层与剧情模式共用）；HotspotLayer 支持出口（travel action）；NdeVisualNovelView 探索态 desc 横幅 |
| feat | 存档接口扩展：GameSave 新增 spaceState JSON 字段（前后端 + 正式迁移文件，旧存档向后兼容：无字段自动进探索态） |
| feat | 第一章第三幕「东来的信」全量落地：商队段（三张事变照片）/段六讨论+判断选择（benefit_choice）/过渡段探索态（见/添 Q&A+班+回房）/信使段（下楼选择+死灵气息讨论+17 按 contract 分支+丘的信道具） |
| feat | 道具：丘的信（qiu_letter，伏笔道具） |
| refactor | 第二幕结尾迁移探索态：hall_free/corridor_free/room 三地点 + 班/睡觉路由分流（ch2_done 变量），旧存档节点 id 保留兼容 |
| fix | 第二幕收尾场景切换时机修正：幸起身说话保持谈判全景，离场后才恢复立绘层与大厅实景 |
| docs | 世界观双向同步：记忆碎片（帝国传讯）、共和国照片科技、沙漠附庸史、饶死灵傀儡信使（世界书+设定集） |
| docs | AGENTS 新增美术资产 README 纪律（入库即登记，视觉模型描述不可靠） |

### 影响评估

- **影响范围**：德塔视觉小说引擎（store/渲染层/存档）+ 第一章全章节数据
- **架构决策**：空间与剧情解耦（explore 节点属性 + 合成节点），替代"每处自由活动写死一组节点"——为第二章自由探索提供数据驱动底座
- **兼容性**：旧存档（无 spaceState）读档自动恢复剧情模式/探索态（explore 节点自带 location）；序章旧模式（end+hotspots）继续兼容运行
- **数据库**：game_saves 新增 spaceState 列（迁移文件 `20260807120000_add_game_save_space_state`），deploy.sh 的 migrate deploy 自动应用
- **回滚策略**：各改动独立提交可 revert；空间机制未启用时（无 explore 节点）行为与旧版一致

---

## 2026-08-03 v2.4.0 社区站视觉体系统一：霞鹜文楷+莫兰迪token+首页重构

### 概要

本次发版聚焦社区站视觉体验：基于 Hallmark 设计审查（anti-AI-slop），建立霞鹜文楷 display + 系统无衬线 body 的字体配对体系，全站硬编码颜色统一为莫兰迪 token。首页从居中三件套重构为左对齐 editorial 布局，男德通页面深色顶栏改为浅色并全页配色统一。

### 变更内容

| 类别 | 变更 |
|------|------|
| feat | 引入霞鹜文楷（LXGW WenKai）作为 display 字体，建立 `--md-font-display`/`--md-font-body` 双 token 体系 |
| feat | 首页 hero 从居中三件套改为左对齐 editorial，等高卡片网格改为纵向非对称 |
| feat | 男德通页面深色顶栏改为浅色，全页 Ant Design 蓝硬编码统一为莫兰迪 token |
| feat | 师德墙、主界面、导航、页脚标题字体统一为 display，硬编码颜色全部 token 化 |
| feat | 新增 hero/阴影/z-index/缓动 token，卡片底色微倾消除纯白合成感 |
| chore | 清理根目录 13 个测试截图 + dist + 过程文件，增强 .gitignore |
| docs | 新增 `prd/05-美术设计/` design-system.md + changelog.md |

### 影响评估

- **影响范围**：社区站全部页面（HomeView/MainView/WallView/ChatView/TopBar/AppFooter）
- **不影响**：德塔游戏页（GameView/视觉小说页，自有设计语言）、所有业务逻辑（`<script setup>` 零改动）
- **字体加载**：霞鹜文楷通过 jsDelivr CDN 加载，不可达时 fallback 到系统无衬线，不影响功能
- **回滚策略**：每个改动独立提交，可按文件 revert

---

## 2026-08-01 v2.3.0 序章体验大升级：存档优化+热点Q&A+世界地图+旁白打磨

### 概要

本次发版聚焦序章体验打磨：存档系统从"手动"升级为"自动恢复+新建从头"双模式；序章结束场景新增热点交互（见/添对话+世界格局地图）；旁白全面优化（减密度+做白描+删升华+删情绪标签），台词零改动。

### 变更内容

| 类别 | 变更 |
|------|------|
| 存档系统 | 进入德塔自动跟进上次进度（读 slot=0）；新建存档从头开始（pro_001），与当前进度解耦 |
| 热点交互 | 序章结束场景：见📖/添🔧/地图🗺️ 三热点圆形脉冲按钮，点击触发对话或地图面板 |
| 添Q&A改造 | 热点场景添对话从线性闲聊改为 Q&A 问答模式（7话题+主线隔离），event 标记+condition 路由实现话题复用但结束走向隔离 |
| 世界格局地图 | Seedream Pro 2K 生成世界格局地图（2816×1584），MapPanel 面板展示，HotspotLayer 新增 map 类型 |
| 旁白优化 | 四幕 44 句旁白->42 句（删 2 句，42 句原地优化），删解读式旁白/情绪标签/升华句，增白描动作。台词零改动 |
| Bug修复 | pro_302 储物发放场景上下楼方向穿帮（见说"去上面找添"但原文写"下了楼"->修正为"上了楼"） |

### 版本号

- `package.json` / `server/package.json`: 2.1.1 -> 2.3.0
- `seedVersion.js`: 新增 v2.3.0 记录（跳过 v2.2.x，对齐实际发版节奏）

### 涉及 commits

| commit | 说明 |
|--------|------|
| `b5077c5` | 存档系统优化-自动存档恢复+新建存档从头开始 |
| `2f1c96b` | 热点场景添对话改为Q&A问答+主线流程隔离 |
| `43411b3` | 世界格局地图生成+地图面板交互(热点点击展示) |
| 本轮 | 序章旁白优化+pro_302穿帮修正 |

---

## 2026-07-30 视觉小说 剧本文案与逻辑分离（ADR-008）

### 概要

把剧本的「文案」（台词/选项/输入提示）从 `prologue.js` 抽离到独立的 `data/scripts/` 目录，按幕拆分、带中文注释。院长改台词只动文案文件，碰不到任何引擎逻辑，改完 Vite HMR 立即生效。

### 决策依据

- 原 `prologue.js` 1454 行，文案与逻辑焊死，改一句台词要在海量逻辑字段中定位，易碰坏 `next`/`effects`/`branches`
- 院长需要能独立微调台词，不依赖 AI、不碰代码
- ADR-006 曾设想 JSON，但 JSON 无注释可读性差，改用 JS 文案文件（支持说话人/场景注释）

### 替代方案

- JSON 文案：否决（无注释，可读性差）
- Markdown+脚本同步：否决（双份数据源，易漂移）

### 代码变更

| 文件 | 变更 |
|------|------|
| `src/visualnovel/data/scripts/`（新建） | 4 个按幕拆分的文案文件 + README 操作指南 |
| `src/visualnovel/data/prologue.js` | 删除全部 text/placeholder/choices文案，变为纯逻辑骨架（129节点，id 不变） |
| `src/visualnovel/engine/engine.js` | 新增 `mergeScript()`（按 id 合并文案）+ `interpolate()`（通用变量插值） |
| `src/visualnovel/stores/visualNovelStore.js` | `CHAPTER_LOADERS` 改为多 import + merge；插值改用通用 `interpolate()` |
| `prd/.../剧情设计/序章-*-台词.md`（4份） | 标注为历史创作稿，运行文案以 scripts/ 为准 |

### 影响评估

- **旧存档 100% 兼容**：存档只存节点 id，id（pro_001~pro_end）未变
- **choice 选项顺序不变**：合并按下标对应
- Playwright 全流程实测通过（四幕通关 + 热更新验证）

### 产出物

- ADR-008：`prd/01-需求文档/00-调研/decisions/ADR-008-剧本文案与逻辑分离.md`
- 文案操作指南：`src/visualnovel/data/scripts/README.md`

---

## 2026-07-29 Galgame -> 视觉小说 全局重命名 + 02-设计目录重构

### 概要

两轮架构级文档/代码重构：① Galgame 全局重命名为视觉小说（避免 R18 歧义），涉及代码目录/文件/变量/API 路由/CSS class + 全部文档；② 02-设计目录按设计领域分类为 7 个子目录。

### 代码变更（重命名）

| 旧 | 新 |
|----|-----|
| `src/galgame/` | `src/visualnovel/` |
| `galgameStore.js` / `useGalgameStore` | `visualNovelStore.js` / `useVisualNovelStore` |
| `galgameController.js` | `visualNovelController.js` |
| `NdeGalgameView.vue` | `NdeVisualNovelView.vue` |
| `api/galgame.js` | `api/visualNovel.js` |
| API `/api/galgame/*` | `/api/visualnovel/*` |
| CSS `.galgame-page` | `.visualnovel-page` |

### 文档变更（目录重构）

| 旧 | 新 |
|----|-----|
| `02-设计/` 下 10 个文件平铺 | 7 个子目录：世界观/剧情设计/形象设计/美术设计/音频设计/技术设计/归档-旧版本 |
| `德塔世界观设定集-正式版v1.0.md` | `世界观/设定集-v1.3.md` |
| `AI交接单.md` | `创作速查手册.md`（区分换机交接与创作参考） |

### 决策依据

- Galgame 一词在中文语境有 R18 歧义，项目是朋友圈限定社区不适合
- 02-设计目录文件平铺难看，按设计领域分类便于管理
- AI交接单.md 与 .ai/handoff.md 名字混淆，重命名明确分工

---

## 2026-07-29 视觉小说 引擎核心 PoC 完成（v2.2.0）

### 概要

院长确认 视觉小说 方向后，白机完成 M-G1 引擎核心 PoC，浏览器实测 7 项验收标准全部通过。Vue3 自研 视觉小说 引擎上线，`/nde` 路由从占位页切换到 视觉小说 主界面。

### 代码变更

| 文件 | 变更 |
|------|------|
| `src/视觉小说/engine/` | 新增 -- 剧本引擎核心（engine.js + types.js），支持 dialogue/choice/condition/event/end 五种节点 |
| `src/视觉小说/stores/视觉小说Store.js` | 新增 -- Pinia store，状态管理 + 存档/进度 API 对接 + 打字机效果 |
| `src/视觉小说/components/` | 新增 -- 8 个 Vue 组件：DialogueBox/CharacterLayer/ChoiceMenu/QuickMenu/SaveLoadPanel/HistoryPanel/SettingsPanel/BackgroundLayer |
| `src/视觉小说/data/prologue.js` | 新增 -- 序章「学院降临」22 节点剧本 |
| `src/views/Nde视觉小说View.vue` | 新增 -- 视觉小说 主视图，快捷键绑定（Space/Enter/H/S/L/Esc） |
| `src/api/视觉小说.js` | 新增 -- 存档/进度 API 封装 |
| `src/router/index.js` | `/nde` 路由从 NdeRebuildingView 切换到 Nde视觉小说View |
| `server/prisma/schema.prisma` | 新增 GameSave + GameProgress 两张表 |
| `server/src/controllers/视觉小说Controller.js` | 新增 -- 6 个 API 端点（progress/saves CRUD） |
| `server/src/routes/api.js` | 挂载 `/api/视觉小说/*` 路由 |

### 文档同步

| 文档 | 变更 |
|------|------|
| ADR-006 | 新增 -- 视觉小说 引擎选型决策（Vue3 Web 自研 vs Unity vs Ren'Py） |
| 技术设计/视觉小说重构规划.md | 新增 -- M-G1~M-G4 里程碑规划 |
| pm/ROADMAP | M-G1 标记 done，新增 M-G1~M-G4 里程碑 |
| pm/需求池 | R-009~R-017 废弃，R-018~R-023 新增 |
| 根 README | 功能描述/技术栈/项目结构更新，废弃 game/game-server |
| .ai/handoff.md | 白机本轮产出记录 |

### 数据变更

- 公告版本记录新增 v2.2.0

---

## 2026-07-29 德塔方向废弃 + 视觉小说 重构

### 方向决策（院长确认）

| 决策项 | 结论 |
|---|---|
| 原 2D 游戏方向 | **废弃**（横版像素、等距俯视、Phaser/Colyseus 多人同步全部停止） |
| 新方向 | **视觉小说**（基于原世界观，叙事驱动、立绘+背景+对话文本、分支世界线） |
| 决策依据 | 世界观设定集 v1.3 足够庞大适合叙事；视觉小说 三件套（立绘+背景+对话）已有 AI 出图管线支撑；俯视游戏基础设施工作量过大且无法展现世界观深度 |
| 保留资产 | 世界观设定集 v1.3、5 角色形象设计文档、AI 出图精选资产（睿/杰/丘）、ComfyUI 出图管线 |

### 代码变更

| 文件 | 变更 |
|------|------|
| `src/views/NdeRebuildingView.vue` | 新建 -- "正在重构"占位页 |
| `src/router/index.js` | `/nde` 路由指向占位页，删除形象检查拦截 |
| `server/prisma/seedVersion.js` | 新增 v2.2.0 版本公告 |
| `GameView.vue` / `game/` / `game-server/` | 废弃保留，不删（路由已断开） |

### 文档同步

| 文档 | 变更 |
|------|------|
| 德塔 README | 重写 -- 保留有效/已废弃分区 |
| 设计 README | 形态重构规划标记已废弃 |
| PRD README | 德塔描述改为"正在重构中" |
| pm/ROADMAP | M-1~M-6 全部废弃，当前阶段改为 视觉小说 方向 |
| 根 README | 德塔描述更新 |
| AGENTS.md | 项目概览更新 |
| .ai/handoff.md | 当前阶段 + 下一步更新 |

---

## 2026-07-28 画风方向决策 + 文档全量同步 + changelog 补全

### 画风方向决策（方向性，无代码改动）

| 决策项 | 结论 |
|---|---|
| 画风分层方案 | **立绘/漫画/CG = 美漫厚涂**（Hades / Jen Zee 路线），**游戏内精灵 = Q版/低分辨率** |
| 决策依据 | 院长选定美漫厚涂方向（参考 WLOP 鬼刀厚涂），能承载世界观深度；精灵走 Q版/低分辨率方便开发 |
| 画风原则 | 画风保持一致严肃（厚涂质感托住世界分量），轻松感交给文本层。入戏玩家不被打扰，戏谑玩家也有出口 |
| 影响 | M-2 美术 PoC 验证目标更新为：① ComfyUI+LoRA 能否产出美漫厚涂立绘 ② 精灵方向决策（Q版 vs 低分辨率降采样） |
| 降级方案 | 美术 PoC 失败则保持现有像素风，只做视角+氛围，立绘/漫画可独立推进 |

### 文档全量同步

| 文档 | 变更 |
|------|------|
| 战略规划 / ROADMAP / handoff | "饥荒手绘暗黑童话风"描述全量替换为"分层美术方案" |
| 需求池 | 修复 pm 搬迁后路径断裂 + 精简已完成详情(-195行) + 登记 R-014~R-017 + 更新 R-009 描述 |
| 根 README.md | 功能描述更新 + 技术栈修正 + 项目结构补全 + 环境变量补 BLACK_WORKER_TOKEN |
| 德塔 README.md | Phaser 3->4 + 文档索引补全（形态重构战略规划/设定集/ADR-005） |
| 德塔设计 README.md | 设定集版本号标注 v1.3 + 补形态重构战略规划索引 |

### 代码级 changelog 断档补全

10 个代码目录级 changelog 全部从 git 历史补全，共 +442 行：

| 目录 | 补全条目 |
|------|---------|
| `server/src/controllers/` | 12 个 commit（男德通/公告/角色/师德墙等） |
| `server/src/middleware/` | 1 个 commit（rateLimit） |
| `server/src/utils/` | 4 个 commit（llm/knowledge/超时修复） |
| `server/src/routes/` | 6 个 commit（路由注册系列） |
| `src/api/` | 6 个 commit |
| `src/components/` | 5 个 commit（TopBar/NdeSettings 等） |
| `src/router/` | 4 个 commit |
| `src/stores/` | 2 个 commit |
| `src/styles/` | 2 个 commit |
| `src/views/` | 23 个 commit（最大量） |

> `server/src/lib/` 确认无断档（仅 1 个 commit，已被初始化条目覆盖），不改动。

---

## 2026-07-27 ADR-005 德塔世界观承载方式决策（方向性，无代码改动）

### 决策依据
- **背景**：设定集 v1.3 已沉淀庞大世界观资产（118年历史/六大势力/四大伏笔/好感度系统），但当前泰拉瑞亚式 2D 横版 sandbox 叙事承载力不足，70% 设定内容是叙事性的，纯打怪探索无法承载，黑机世界观产出面临沉没风险。
- **触发**：院长提出两个待评估方向（切 Unity 做 3D / 用 AI 视频-漫画搭 CG 工作流），需提前锁定承载方式，避免战斗系统做完才发现剧情无处安放。

### 决策内容

| 决策项 | 结论 |
|---|---|
| 剧情承载方式 | **CG/漫画演出层**（JRPG 式"战斗 sandbox + 独立剧情演出层"分离架构），P0 纯漫画，P1 可选视频增强 |
| 漫画工作流 | **ComfyUI + IP-Adapter**（黑机已有，零 API 成本，复用 R-003 美术流水线，像素风优先） |
| 视频候选 | Vidu（首选，多主体一致性7张参考图）/ 腾讯混元（次选），即梦/可灵/万相待院长手核 |
| 进度同步 | 所有进度类状态（剧情解锁/好感度/净化进度）**必须服务端持久化**，禁止仅用 localStorage |
| 技术栈 | **否决切 Unity 做 3D 大型游戏**（单人开发成功率极低 + AI 解决不了动画/关卡/手感 + 现有投入打水漂 + 背离"小集体抽象娱乐"初衷） |

### 影响评估
- **对战斗系统阶段1**：无直接影响，演出层是独立后续工作
- **新增架构组件**（未来）：剧情触发消息通道 `story-trigger`、用户表 `unlockedStoryIds`、Vue 剧情回顾组件
- **核心约束**：项目初衷是"小集体抽象娱乐"，不可过度工程化

详见 `prd/01-需求文档/00-调研/decisions/ADR-005-德塔世界观承载方式.md`

---

## 2026-07-24 R-003 角色行走精灵表全量上线（v2.1.0）

### 决策依据
- **背景**：P4 角色创建系统已上线，但角色在德塔内仍是色块占位（32×32 纯色方块），缺乏辨识度和沉浸感
- **触发**：R-003 立绘已完成（类原神风格半身胸像），需将立绘转化为 Phaser 可用的行走精灵表，替换色块占位
- **方案**：黑机 ComfyUI 生成 5 套 × 3 方向（正/背/侧）chibi 行走图 → BiRefNet 抠图 → Python 脚本合成 256×256 精灵表（4×4 网格，每帧 64×64）

### 变更内容

| 类别 | 内容 |
|------|------|
| **美术资源** | 5 套角色行走精灵表（256×256，4方向×4帧），从色块占位升级为真实像素角色 |
| **流水线脚本** | 7 个 Python 脚本（ComfyUI 生成 → BiRefNet 抠图 → 自动合成精灵表 + 朝向自动检测） |
| **前端代码** | PreloadScene（32→64加载）、Player（碰撞体偏移 setOffset）、NetworkSystem（多人尺寸同步）、CharacterView（CSS裁帧+返回按钮） |
| **Bug 修复** | BUG-39（AI侧面图生成）/ BUG-40（抠图半透明）/ BUG-41（背面空头）/ BUG-42（方向反转） |

### 文件变更
| 文件 | 动作 |
|------|------|
| `public/game/sprites/players/player_set{1..5}_walk.png` | 新增 — 5 套行走精灵表 |
| `public/game/sprites/players/raw/` + `cutout/` | 新增 — 30 张源文件（生成原图+抠图透明PNG） |
| `public/game/portraits/player_set{1..5}.png` | 新增 — 5 套立绘 |
| `public/game/sprites/avatars/player_set{1..5}.png` | 新增 — 5 套头像 |
| `game/scenes/PreloadScene.js` | 改 — 精灵表加载从 32×32 改为 64×64 |
| `game/objects/Player.js` | 改 — 碰撞体偏移 setOffset(16,32)，昵称位置-38 |
| `game/systems/NetworkSystem.js` | 改 — 多人精灵尺寸 32→64 同步 |
| `src/views/CharacterView.vue` | 改 — CSS裁帧预览+返回按钮 |
| `scripts/*.py` | 新增 — 7 个生成/抠图/合成脚本 |
| `package.json` + `server/package.json` | 改 — version 2.0.0 → 2.1.0 |
| `server/prisma/seedVersion.js` | 改 — 新增 v2.1.0 版本公告 |

### 影响评估
- **线上版本**：v2.0.0 → v2.1.0（minor 递增，功能新增）
- **下一步**：德塔战斗系统调研 V2 已完成 → 需求池登记 R-009 → 黑机世界观创作 → 白机 PRD MECE → 阶段 1 开发

---

## 2026-07-23 P4 立绘类原神立绘重做 + 角色选择页 4 项体验修复

### 决策依据
- **背景**：首轮 P4 立绘为全身 + 复杂场景背景（街道/城堡/魔法阵），多角色和文字污染问题反复，用户反馈风格与参考图（原神角色卡）差距大
- **触发**：用户提供类原神立绘参考图，要求半身胸像 + 干净渐变单色背景；同时反馈 4 个体验问题

### 问题修复（BUG-32~36）
| # | 问题 | 根因 | 解决方案 |
|---|------|------|---------|
| 1+2 | 个人中心/角色选择 换形象"保存失败" | ①旧后端进程（PID 80160）未加载 `/api/user/skin` 路由，返回 404 ②Prisma Client 未同步 + 3 个迁移未应用 | ①终止旧进程 → 重启后端 ②`prisma generate` + `migrate deploy` |
| 3 | 精灵图区域显示整张四方图 | `<img>` 标签直接拉伸 128×128 整图 | 改用 CSS `background-image` + `background-size:96px` 只显示左上角第一帧 |
| 4 | 立绘风格不符（全身+复杂背景） | 提示词残留 `city street at sunset` + 缺少半身胸像关键词 | 重写提示词：`bust shot, upper body, portrait composition` + 渐变单色背景 |
| 5 | 角色选择页无返回按钮 | 缺失 | 左上角新增「← 返回」按钮，跳转 `/` |
| 6 | 公告显示"加载失败" | Prisma Client 未同步（Announcement 模型未加载） | 同 BUG-1+2 根因②，一并修复 |

### 立绘提示词重构
- **正面**：`masterpiece, 1girl, solo, {角色描述}, bust shot, upper body, chest up, portrait composition, centered, {情绪}, looking at viewer, soft gradient background, {主题色}, clean simple background, genshin impact style portrait`
- **负面**：追加 `background scenery, environment, buildings, city, street, nature, landscape, detailed background, busy background, outdoor, indoor`
- **主题色**：set1粉 / set2紫 / set3蓝 / set4深蓝 / set5青
- **状态**：工作流 JSON + 脚本已提交；**美术资源（立绘/头像/精灵图）未提交 git**，用户认为仍需优化，留黑机下次继续打磨

### 文件变更
| 文件 | 动作 |
|------|------|
| `src/views/CharacterView.vue` | 改 - 精灵帧裁切（CSS background）+ 返回按钮 |
| `.ai/comfyui-workflows/players/portrait_player_set{1..5}.json` | 新增 - 提示词全部重写为类原神立绘 |
| `scripts/gen_player_portraits_api.py` | 新增 - ComfyUI API 调用脚本 |
| `scripts/portrait_to_spritesheet.py` | 新增 - 立绘转精灵图脚本 |

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
| 战斗 | **塔外泰拉瑞亚风格战斗**：鼠标控制朝向+左键攻击（近战扇形/远程投射物），四种怪物行为模式（追击/远程/范围/召唤），预警>反应，走位是核心 | 走出大门进入荒野 |
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
- **关联文档**：`pm/需求池.md` R-007、ADR-004

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
2. **角色选择页横向卡片**：5 个形象横向均分排列（flex 自适应），上立绘下精灵，仅标注"形象 A~E"无描述文字，暗色类原神风格 UI
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
