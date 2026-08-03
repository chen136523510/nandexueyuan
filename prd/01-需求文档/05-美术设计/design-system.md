# 男德学院 · 设计系统

> 本文档是社区站视觉设计的 source of truth。后续页面推广改造以此为准。
> 最后更新：2026-08-03

## Genre 声明

**Playful**（20 人搞怪社区）。audit 按 editorial 严审，但 emoji 图标、轻松文案、非正式调性在 playful genre 下可接受。设计目标是「有手作感、松弛、不像 AI 生成」。

## 设计意图

消除「AI 生成感」（anti-AI-slop），让 UI 看起来像「人做的」。核心理念来自 [Hallmark](https://github.com/Nutlope/hallmark) 设计技能：
- **结构多样性优先**：不套用居中 hero 三件套 + 等高卡片网格的模板节奏
- **字体配对**：display + body 双字族，而非单字族走天下
- **token 纪律**：所有颜色/字体/阴影引用命名 token，禁止硬编码

---

## 字体系统

| 角色 | token | 字体 | 用途 |
|------|-------|------|------|
| Display | `--md-font-display` | 霞鹜文楷 (LXGW WenKai) + 系统兜底 | 标题、品牌名、页脚宣言 |
| Body | `--md-font-body` | 系统无衬线 (-apple-system / PingFang SC / Microsoft YaHei) | 正文、按钮、菜单、说明 |

- **加载**：`index.html` 通过 jsDelivr CDN 引入 `lxgw-wenkai-webfont@1.7.0`
- **降级**：CDN 不可达时自动 fallback 到系统无衬线，不影响功能
- **向后兼容**：`--md-font` 仍存在，指向 `--md-font-body`

## 莫兰迪色板

| token | 值 | 用途 |
|-------|-----|------|
| `--md-primary` | `#A8C5A0` | 主色：鼠尾草绿 |
| `--md-primary-hover` | `#94B48C` | 主色 hover |
| `--md-primary-bg` | `#EEF3EC` | 主色浅底 |
| `--md-secondary` | `#AEC2CF` | 辅色：奶蓝 |
| `--md-accent` | `#D4A574` | 点缀：暖赭（克制） |
| `--md-bg` | `#F5F2EC` | 页面背景：温暖米白 |
| `--md-bg-card` | `#FDFBF7` | 卡片背景：微倾米白（消除纯白合成感） |
| `--md-text` | `#4A4A4A` | 主文字（非纯黑） |
| `--md-text-on-primary` | `#FDFBF7` | 主色按钮上的文字（替代 #fff） |

**配色原则**：低饱和、柔和、松弛。功能色复用主色系（success 复用绿、warning 复用赭、danger 用莫兰迪红）。

## 间距

4pt 体系：`--md-sp-1`(4px) ~ `--md-sp-7`(48px)。

**节奏原则**：相邻区块 padding 制造差异（一紧一松），打破均等。

## 阴影

极轻、柔和（用 `rgba(74,74,74)` 而非 `rgba(0,0,0)`）：
- `--md-shadow-sm` / `--md-shadow` / `--md-shadow-lg`：通用层级
- `--md-shadow-card` / `--md-shadow-card-hover`：卡片专用

## 动效

| token | 值 | 用途 |
|-------|-----|------|
| `--md-ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | 默认出场 |
| `--md-ease-in` | `cubic-bezier(0.7, 0, 0.84, 0)` | 退场 |
| `--md-ease-in-out` | `cubic-bezier(0.65, 0.05, 0.36, 1)` | 状态切换 |

**纪律**：
- `transition` 必须指定属性，**禁止** `transition: all`
- 禁止浏览器默认 `ease`、禁止 bounce/overshoot
- 所有动效支持 `prefers-reduced-motion: reduce`

## z-index 层级

| token | 值 | 用途 |
|-------|-----|------|
| `--md-z-base` | 1 | 基础 |
| `--md-elevated` | 10 | 提升元素 |
| `--md-z-overlay` | 50 | 浮层 |
| `--md-z-modal` | 100 | 模态/sticky nav |
| `--md-z-toast` | 200 | toast/最高 |

禁止裸数值 z-index。

## 页脚原型

采用 **Ft5 Statement**：一句态度宣言收尾（`最尊重女性之人所建`）+ 版权行，替代无意义的 4 列链接 AI footer。

## 导航原型

打破「品牌左/菜单中/头像右」AI nav 三段式：品牌用 display 字体 + 菜单紧贴品牌右侧（`flex:1` 占位推头像到右），active 态用下划线（非圆角背景）。

---

## 改造范围记录

| 状态 | 页面 | 说明 |
|------|------|------|
| ✅ 已完成 | HomeView | 首页：字体+hero左对齐+卡片非对称+token化 |
| ✅ 已完成 | TopBar / AppFooter | 导航/页脚协调 |
| ✅ 已完成 | MainView | 主界面：公告标题 display 化 |
| ✅ 已完成 | WallView | 师德墙：标题字体+阴影/颜色 token 化+transition 规范化+省略号修正 |
| ✅ 已完成 | ChatView | 男德通：深色 header→浅色+全页 Ant 蓝硬编码→莫兰迪 token+Agent 配色统一 |
| 🔒 不动 | GameView / NdeVisualNovelView / CharacterView | 德塔游戏页，自有设计语言，重构中 |

## OKLCH 化计划（后续）

当前色板仍是 hex。Hallmark 推荐 OKLCH 以获得感知均匀的配色。计划在第二轮推广时统一转 OKLCH，当前先保持 hex 保证稳定性。
