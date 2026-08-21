# 美术设计 Changelog

> 记录视觉设计层面的变更。倒序排列（最新在最上方）。

---

## 2026-08-21 LOGO V4 双线提案（网站重出 + 德塔 Δ 形变）

### 背景
院长 8/21 指示：① 网站模块与德塔模块区分出设计 ② 德塔主题为 Δ 形变，在此基础上调画风滤镜 ③ 网站 LOGO 推倒重出（V3 作废）。

### 本轮产出
**德塔线（Δ 形变 × 西方奇幻油画厚涂 × 滤镜）**
- NDO-1 厚涂岩塔Δ（主推）—— feTurbulence 置换模拟笔触 + 暖窗辉光
- NDO-2 月护Δ——班走廊月亮 CG 符号化，月晕 + 冷银轮廓光
- NDO-3 阶梯塔Δ——Δ 笔画拆成 5 层退台高塔，塔尖赭金宝石
- NDO-4 虚空裂Δ——底边撕裂 Δ 缺口 + 裂缝微光 + 光尘
- NDO-5 基准Δ——单焦点骨架（favicon / 传送阵符文）

**网站线（莫兰迪 × 文楷 × 松弛手作感）**
- WEB-1 门匾——深墨绿横匾 + 如意云头角饰，TopBar 即门楣语义
- WEB-2 四训环徽——中国圆徽结构 × 四训断弧（修身/齐家/摸鱼/开摆）+ 中心「德」
- WEB-3 手绘松弛圈——一笔手绘不闭合圈 + 文楷「男德」+ 暖赭落款
- WEB-4 德字 app 图标——暖赭圆角方块 + 米白「德」+ 躺平弧线

### 文件
- 9 个 SVG 草案：`prd/01-需求文档/05-美术设计/logo-drafts/ndo-*.svg` / `web-*.svg`
- 提案文档：`LOGO设计提案.md` 更新至 V4
- 待院长裁决后精修接入

---

## 2026-08-03 社区站视觉优化第二轮（主界面/师德墙/男德通统一）

### 背景
首页验证通过后，将设计体系（字体配对 + 莫兰迪 token + 动效规范）推广到剩余社区站页面。消除各页面风格割裂，特别是 ChatView 完全脱离 `--md-*` 体系的问题。

### 本轮改动

**MainView（主界面）**
- 公告标题改用 display 字体（霞鹜文楷）

**WallView（师德墙）**
- 标题 `.wall-title` 改 display 字体
- 卡片阴影硬编码 `rgba(0,0,0,0.04/0.08)` → `var(--md-shadow-card/-hover)`
- 4 处按钮文字 `#fff` → `var(--md-text-on-primary)`
- z-index 裸数值 `10` → `var(--md-z-elevated)`
- slide-down / expand 动画 `transition: all` → 指定属性 + `var(--md-ease-out)`
- placeholder 省略号 `...` → `…`（U+2026）

**ChatView（男德通）-- 全页 token 化**
- 深色 header `#1a1a2e` → `var(--md-bg-card)` 浅色 header（统一社区站调性）
- 全部 Ant Design 蓝硬编码（`#1677ff`/`#4096ff`/`#e6f4ff`/`#91caff`）→ 莫兰迪 token
- 多 Agent 思考过程配色从 Ant 五色系 → 莫兰迪功能色系（绿/赭/奶蓝/红）
- 消息气泡、输入区、建议按钮、会话列表全部 token 化
- 标题 display 字体，正文 body 字体，`transition: all` 指定属性化

### 未改动
- 德塔游戏页（GameView / NdeVisualNovelView / CharacterView，自有设计语言）
- 所有 `<script setup>` 逻辑零改动

### 验证
- `npm run build` 通过（✓ built in 4.22s）
- 路由守卫正常（未登录访问 /wall /chat 正确重定向 /login）

---

## 2026-08-03 社区站视觉优化第一轮（首页 + 导航/页脚）

### 背景
基于 [Hallmark](https://github.com/Nutlope/hallmark) 设计技能对社区站做 anti-AI-slop audit，发现 8 critical + 5 major + 3 minor。判定 ships as slop——骨架命中 AI 模板（居中 hero 三件套 + 等高卡片网格），字体零配对，token 未贯穿。

### 本轮改动

**字体系统建立**
- 引入霞鹜文楷 (LXGW WenKai) 作为 display 字体，通过 jsDelivr CDN 加载
- 建立 `--md-font-display` / `--md-font-body` 双 token 体系，`--md-font` 向后兼容
- 所有标题改用 display 字体，正文保留系统无衬线

**首页 HomeView 重构**
- hero 从居中三件套改为左对齐 + 内容扩充（kicker + 标题 + 副标题 + 宗旨段 + 按钮）
- 「即将上线」卡片从等高网格 (`auto-fit`) 改为纵向非对称 editorial 节奏，首卡放大
- icon 从 48px 圆形独占改为 32px 方形内联到标题旁
- 所有硬编码颜色 token 化（hero 渐变、卡片阴影、纯白）
- `transition: all` 改为指定属性 + `--md-ease-out`

**导航 TopBar 调整**
- 品牌名改 display 字体，菜单紧贴品牌（打破三段均分）
- active 态从圆角背景改为下划线
- `transition: all` 指定属性化，z-index token 化

**页脚 AppFooter 调整**
- 从单行版权改为 Ft5 Statement（宣言 + 版权两行），宣言用 display 字体

**设计 token 扩充**
- 新增：`--md-text-on-primary`、`--md-hero-bg/texture`、`--md-shadow-card/-hover`、`--md-ease-out/in/in-out`、`--md-z-*` 层级
- `--md-bg-card` 从 `#FFFFFF` 微调为 `#FDFBF7`（消除纯白合成感）

### 审查依据
- Hallmark audit：8 critical · 5 major · 3 minor → ships as slop
- Genre 声明：Playful（emoji、轻松文案在该 genre 下可接受）

### 未改动
- MainView / WallView / ChatView（第二轮推广）
- 德塔游戏页（GameView / NdeVisualNovelView / CharacterView，自有设计语言，重构中）
- 所有 `<script setup>` 逻辑（功能零改动）
