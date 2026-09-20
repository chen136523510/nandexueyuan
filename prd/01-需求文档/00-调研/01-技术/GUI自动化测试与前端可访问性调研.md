# GUI 自动化测试与前端可访问性调研

> 调研时间：2026-08-09
> 状态：⛰️ uphill（方案已成型，待院长拍板决策点后进入实现）
> 关联：本轮 `.ai/handoff.md` 2026-08-09 19:06 节

---

## 一、背景

### 1.1 项目现状

德塔（视觉小说）开发过程中，GUI 自动化测试频繁遇到三类痛点：

1. **HTTPS 自签名证书**：浏览器自动化工具遇到证书错误需额外处理
2. **原生弹窗**：`alert`/`confirm`/`prompt` 弹出时阻塞测试流程，需逐个手动接受
3. **图标按钮定位**：无文字的图标按钮（emoji/符号/SVG）难以用语义化方式定位，只能靠脆弱的 CSS class

导致测试代码高度冗余且容易出错，每次测试都要重复处理这三类问题。

### 1.2 调研目的

1. 摸清项目当前测试基建、图标按钮、原生弹窗、HTTPS 的**真实现状**（实证，非推测）
2. 摸清现有 GUI 测试技能链（web-gui-tester / control-browser）对上述三痛点的**支持能力边界**
3. 产出成型的工具集方案 + 前端可访问性/测试钩子规范方案，供院长拍板后执行

### 1.3 事实校正（调研前后的认知差异）

本次调研发现，用户原始描述与实际现状存在三处偏差，直接影响方案设计：

| 原始描述 | 实际现状 | 影响 |
|---|---|---|
| "复杂的 SVG 图标按钮" | src 全目录**零 `<svg>`**，图标全是 emoji/符号字符（🎒💾⚙✕▶） | 规范需覆盖未来 SVG 场景；当前痛点是 emoji 按钮无语义属性 |
| "频繁处理 HTTPS 自签名证书" | 本地全链路**纯 HTTP**（vite:4396 / express:3000 / colyseus:2567，无证书文件、无 `server.https` 配置） | 痛点是测线上 `nandexueyuan.top` 或 staging 时遇到；工具集需同时覆盖 HTTP(本地)+HTTPS(线上) |
| "测试代码高度冗余" | 现有 GUI 测试技能链（node_repl+browser-client）**不支持 `ignoreHTTPSErrors`**（插件全代码零命中） | 根因是技能链能力缺口，需引入原生 `@playwright/test` 才能用原生 API 一行解决 |

---

## 二、重点调研对象

### 2.1 项目测试基建现状（实证）

| 维度 | 现状 | 证据 |
|---|---|---|
| 测试框架依赖 | **无** | 4 个 package.json 均无 `@playwright/test`/`playwright`/`vitest`/`jest`；package-lock.json 零相关条目 |
| Playwright 配置 | **无** | 全仓库无 `playwright.config.*` |
| 测试目录 | **无** | 无 `e2e/`/`tests/`/`__tests__/`（命中的 test 目录均为第三方工具包内部） |
| 测试 helper/fixture | **无** | 无 `*test*util*`/`*fixture*`/`*.setup.*` |
| test scripts | **无** | 根 package.json scripts 仅 `dev`/`build`/`preview` |
| eslint | **无** | 无配置文件、vite 无 eslint 插件、src 无引用；devDeps 仅 `@vitejs/plugin-vue`+`vite` |
| `.playwright-mcp/` | 仅为 MCP 工具运行时控制台日志缓存 | 已被 `.gitignore` 忽略（非测试基建） |

**结论**：项目完全没有任何自动化测试基础设施，需从零搭建。

### 2.2 HTTPS 配置现状

| 服务 | 地址 | 协议 | 配置位置 |
|---|---|---|---|
| 前端 | localhost:4396 | **HTTP** | `vite.config.js`：`server` 仅 host/port/proxy，无 `server.https` |
| API 后端 | localhost:3000 | **HTTP** | `server/src/index.js:26`：`http.createServer(app)` |
| 游戏服务器 | localhost:2567 | **WS（非 WSS）** | `game-server/src/index.js:20`：启动日志打印 `ws://` |

全仓库无 `.pem`/`.crt`/`.key` 证书文件。本地开发不存在 HTTPS 场景。

### 2.3 图标按钮与可访问性现状

**图标载体**：全 src 零 `<svg>`，图标用 emoji（🎒💾📜⚙👁💬🗺️📷）+ 符号字符（✕ × ▶）。

**语义化/测试属性分布**（全局 grep 实证）：

| 属性 | 全 src 出现次数 | 结论 |
|---|---|---|
| `aria-label` | **0** | 完全不存在 |
| `aria-*`（任意） | **0** | 完全不存在 |
| `data-testid` | **0** | 完全不存在 |
| `role=` | **0** | 完全不存在 |
| `title=` | visualnovel 仅 2 处（QuickMenu） | 唯一无障碍替代手段，且多为 tooltip 用途 |

**button 统计**：visualnovel 模块 16 个、全 src 76 个，全部靠 CSS class 定位。

**代表性问题点**：

| 文件 | 行号 | 问题 |
|---|---|---|
| `QuickMenu.vue` | 7-42 | 5 个 emoji 按钮，仅 `:title` 兜底，无 `aria-label` |
| `SettingsPanel/HistoryPanel/InventoryPanel/MapPanel/SaveLoadPanel.vue` | 各关闭按钮 | 15 处纯 `✕` 符号，无 aria-label，屏幕阅读器误读为"乘号" |
| `HotspotLayer.vue` | 38-48 | 热点按钮有 label 文字但无 aria-label/role |
| `SettingsPanel.vue` | 57-63 | toggle 按钮用文字"开/关"，无 `role="switch"`/`aria-pressed` |

**依赖预埋**：`package.json` 已装 `lucide-vue-next`（SVG 图标库）但未启用--未来引入 SVG 图标时规范必须提前就位。

### 2.4 原生弹窗现状

| 类型 | 次数 | 分布 |
|---|---|---|
| `alert(` | 6 处 | WallView.vue(5)、VersionHistoryDialog.vue(1) |
| `confirm(` | 7 处 | AdminView.vue(3)、WallView.vue(2)、ChatView.vue(1)、VersionHistoryDialog.vue(1) |
| `prompt(` | 0 处 | - |

**已有自定义弹窗体系**（两套，共 9 个组件，但 views 层未迁移）：
- visualnovel 模块：`*-overlay` + `@click.self="close"` 模式（SettingsPanel/HistoryPanel/InventoryPanel/MapPanel/NoticePopup/SaveLoadPanel）
- 全局通用：`modal-overlay` + `modal-card` + `@click.stop` 模式（ProfileDialog/NdeSettingsDialog/VersionHistoryDialog）

所有自定义弹窗均无 `role="dialog"`/`aria-modal`/焦点陷阱。

### 2.5 文件上传现状

`<input type="file">` 全 src 仅 **1 处**：`src/views/WallView.vue:204-207`（表白墙发帖图片上传，hidden input + label 触发）。德塔 visualnovel 模块内无文件上传。

### 2.6 现有 GUI 测试技能链能力边界

本环境的 GUI 测试依赖两个技能：

| 技能 | 性质 | 工作方式 |
|---|---|---|
| `web-gui-tester` | 纯方法论 | 不绑定工具，委托会话内实际存在的浏览器自动化工具；定义"怎么测"，不定义"用什么工具" |
| `control-browser` | 工具驱动层 | 浏览器由 Node REPL MCP 的 `js` 工具（`mcp__node_repl__js`）驱动，**非** `mcp__playwright__browser_*`（本环境无此工具） |

**三痛点支持能力**（插件全代码 grep 实证）：

| 痛点 | 技能链支持情况 | 证据 |
|---|---|---|
| 忽略 HTTPS 自签名证书 | **不支持** | `ignoreHTTPSErrors` 在插件 skills/docs/scripts/server.js 全代码**零命中** |
| 原生 Dialog 处理 | 底层 API 有，**指引文档无** | `getJsDialog()`/`accept()`/`dismiss()` 存在于 api.json，但两个 SKILL.md 正文未提及何时/如何使用 |
| 图标按钮定位 | 支持 ARIA 语义定位，**无图标按钮专项指引** | 推荐 `getByRole/getByLabel/getByTestId`，但对无 aria-label 的纯图标按钮无专门指南，只能落到截图坐标点击 |

**关键结论**：现有技能链无法满足"忽略证书"诉求，这是测试冗余的根因之一。要原生解决三痛点，需引入 `@playwright/test`。

---

## 三、横向对比

### 3.1 工具集形态对比

| 维度 | 方案 A：建 e2e 基建+工具集 | 方案 B：仅写测试模板文档 |
|---|---|---|
| 依赖 | 新增 `@playwright/test`（+浏览器二进制~100MB） | 零新增依赖 |
| 忽略证书 | `use.ignoreHTTPSErrors=true` 一行解决 | 现有技能链不支持，自签名证书场景仍受限 |
| 自动接受 Dialog | `page.on('dialog')` fixture 一行解决 | 需运行时查 `getJsDialog` API，无模板 |
| 文件上传 | `setInputFiles` 原生支持 | 需自行处理 hidden input |
| 长期价值 | 为全项目补齐 e2e 能力 | 轻量，但能力上限低 |
| 代价 | 首次下载浏览器二进制 | 证书场景无解 |

### 3.2 规范强制手段对比

| 维度 | 方案 A：轻量 check-a11y.mjs 脚本 | 方案 B：eslint + vuejs/accessibility 全家桶 |
|---|---|---|
| 依赖 | 零（Node 原生） | eslint + eslint-plugin-vue + vuejs/accessibility + 解析器（4+包） |
| 规则覆盖 | 聚焦"图标按钮必须有 aria-label 或 data-testid"单一规则 | 覆盖全套 a11y 规则 |
| 既有噪音 | 无（只检查新增问题点） | 会对全项目 76 个 button 现有缺失批量报错 |
| 约束力 | npm script + 人工 review | 可接入 pre-commit / CI 强制 |
| 升级路径 | 未来可升级到 eslint | - |

### 3.3 改造范围对比

| 维度 | 方案 A：德塔 visualnovel 模块示范 | 方案 B：全项目改造 |
|---|---|---|
| 工作量 | 16 个 button（小） | 76 个 button + 13 处原生弹窗替换（大） |
| 覆盖 | 验证规范可行，其余渐进迁移 | 一次到位 |
| 风险 | 低（仅加属性，不改逻辑） | views 层 alert/confirm 替换涉及行为变更，属另一条改造线 |

---

## 四、总结与建议

### 4.1 选型建议（默认推荐）

| 决策点 | 推荐 | 理由 |
|---|---|---|
| 工具集形态 | **方案 A：建 e2e 基建+工具集** | 三痛点均可用 Playwright 原生 API 一行解决；项目零测试基建，引入有长期价值；证书痛点在现有技能链无解 |
| 规范强制手段 | **方案 A：轻量 check-a11y.mjs** | 项目 devDeps 极简（仅2个），eslint 全家桶膨胀过重且报既有噪音；自制脚本零依赖、聚焦单一规则；未来可升级 |
| 改造范围 | **方案 A：德塔示范+规范文档** | 全项目一次改造量大，且 views 层原生弹窗替换属另一条线；先在德塔验证规范可行 |

### 4.2 优势与短板

**推荐方案优势**：
- 证书/弹窗/上传三痛点用原生 API 解决，测试代码不再冗余
- 规范文档 + 扫描脚本形成"约定+强制"双保险
- 德塔示范为后续全项目迁移提供样板

**推荐方案短板**：
- 新增 `@playwright/test` 依赖与浏览器二进制（~100MB，仅开发环境）
- 轻量脚本约束力弱于 eslint（靠人工 review 补强）
- 德塔示范后其余页面仍需渐进迁移，非一次到位

### 4.3 成型方案细节（拍板后执行）

**线1：Playwright E2E 基建 + 工具集**
- `playwright.config.js`：`use.ignoreHTTPSErrors=true` + `baseURL` 环境变量切换本地/线上 + webServer 自动起 vite
- `tests/e2e/fixtures.js`：`autoAcceptDialogs`（自动接受 alert/confirm/prompt）+ `secureContext`（隔离 context）
- `tests/e2e/utils.js`：`uploadFiles`（多类型文件上传）+ `clickIconBtn`（优先 getByTestId > getByRole > getByLabel）+ `dismissNativeDialog`
- `tests/e2e/example.spec.js`：演示三类工具用法
- `package.json`：devDeps 加 `@playwright/test`，scripts 加 `test:e2e`

**线2：前端可访问性 + 测试钩子规范**
- 规范文档 `prd/.../技术设计/前端可访问性与测试钩子规范.md`：图标按钮强制 aria-label 或 data-testid + 定位优先级 + 各场景细则 + data-testid 命名约定
- 轻量扫描脚本 `scripts/check-a11y.mjs`（零依赖）：扫描 src/**/*.vue，缺 aria-label/data-testid 的图标按钮报错
- 德塔 visualnovel 模块示范改造：16 个 button 补属性
- CONTRIBUTING.md 新增 a11y 章节

---

## 五、待确认事项

### 5.1 需院长决策

| # | 决策点 | 选项 | 默认推荐 |
|---|---|---|---|
| 1 | 工具集形态 | A 建 e2e 基建+工具集 / B 仅模板文档 | A |
| 2 | 规范强制手段 | A 轻量 check-a11y.mjs / B eslint 全家桶 | A |
| 3 | 改造范围 | A 德塔示范 / B 全项目 | A |

### 5.2 需验证假设

- [ ] HTTPS 证书痛点是否确实来自线上/staging 测试（本地纯 HTTP 不存在此场景）？若是，线上证书是 Let's Encrypt 正规证书还是自签名？
- [ ] 是否需要 e2e 测试接入 CI（目前项目无 CI 配置）？
- [ ] 德塔示范改造后，views 层 13 处原生 alert/confirm 是否本轮一并替换（属另一条改造线，默认不做）？
