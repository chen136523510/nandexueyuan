# 工业控制 UI 快速参考

> 本文档是工业控制 UI 规范的**唯一入口**，帮助你快速了解品牌形象、HTML 写法和 CSS 用法。

---

## 零、路径引用（重要）

### 资源位置

```
docs/
├── prd/                          ← 你的 HTML 在这里
│   └── your-page.html
└── assets/
    └── industrial-ui-spec/       ← UI 资源在这里
        ├── styles/main.css
        └── components/bot-nav.js
```

### 引用路径

**从 `docs/prd/` 目录引用资源：**

```html
<!-- CSS 样式 -->
<link rel="stylesheet" href="../assets/industrial-ui-spec/styles/main.css" />

<!-- Web Components -->
<script src="../assets/industrial-ui-spec/components/bot-nav.js"></script>
<script src="../assets/industrial-ui-spec/components/table.js"></script>
<script src="../assets/industrial-ui-spec/components/modal.js"></script>

<!-- 图标（如需单独引用） -->
<img src="../assets/industrial-ui-spec/icons/icon-plc.svg" />
```

### 完整模板（docs/prd/ 下使用）

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta content="width=device-width, initial-scale=1.0" name="viewport" />
  <title>页面名称 - 系统名称</title>
  <!-- 引用 UI 规范样式 -->
  <link rel="stylesheet" href="../assets/industrial-ui-spec/styles/main.css" />
  <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
  <script>
    tailwind.config = {
      theme: { extend: { colors: {
        'industrial-dark': 'var(--color-bg-primary)',
        'industrial-accent': 'var(--color-accent-primary)',
        'navbar-bg': 'var(--color-bg-navbar)',
      }}}}
  </script>
</head>
<body class="h-screen flex flex-col" id="app">
  <main class="flex-grow overflow-auto min-h-0">
    <!-- 页面内容 -->
  </main>
  <div class="bottom-nav">
    <bot-nav id="botNav" active-nav="当前页面"></bot-nav>
  </div>
  <!-- 引用 Web Components -->
  <script src="../assets/industrial-ui-spec/components/bot-nav.js"></script>
</body>
</html>
```

---

## 一、品牌形象

### 核心颜色

| 用途 | 颜色 | 色值 |
|------|------|------|
| 页面背景 | 深墨绿 | `#002621` |
| 强调色/标题 | 金黄 | `#f9b707` |
| 主要文字 | 金黄 | `#f9b707` |
| 次要文字 | 白色 | `#ffffff` |
| 成功状态 | 绿色 | `#4ade80` |
| 错误状态 | 红色 | `#f87171` |

### 字体

```
主字体: 'PingFang SC', 'Microsoft YaHei', sans-serif
等宽字体: 'Consolas', 'Monaco', monospace
```

### 设计风格

- **深色主题优先**：适合工业监控场景
- **金黄色强调**：醒目的操作提示
- **全屏固定布局**：`h-screen flex flex-col`

### 详细定义

- 设计令牌：`styles/tokens.css`

---

## 二、HTML 写法

### 标准页面模板

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta content="width=device-width, initial-scale=1.0" name="viewport" />
  <title>页面名称 - 系统名称</title>
  <link rel="stylesheet" href="styles/main.css" />
  <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
  <script>
    tailwind.config = {
      theme: { extend: { colors: {
        'industrial-dark': 'var(--color-bg-primary)',
        'industrial-accent': 'var(--color-accent-primary)',
        'navbar-bg': 'var(--color-bg-navbar)',
      }}}}
  </script>
</head>
<body class="h-screen flex flex-col [页面类型-class]" id="app">
  <main class="[页面名]-main flex-grow overflow-auto min-h-0">
    <!-- 页面内容 -->
  </main>
  <div class="[页面名]-bottom-nav">
    <bot-nav id="botNav" active-nav="当前页面"></bot-nav>
  </div>
  <script src="components/bot-nav.js"></script>
</body>
</html>
```

### 必须项清单

| 项目 | 要求 |
|------|------|
| 语言声明 | `lang="zh-CN"` |
| 字符编码 | UTF-8 |
| 样式引入 | `styles/main.css` |
| Body ID | `id="app"` |
| 底部导航 | 工业控制页面必须包含 `<bot-nav>` |

### 命名规范

```
页面容器: [页面名]-page
主内容:   [页面名]-main
组件:     [页面名]-[组件名]
元素:     [页面名]-[组件名]__[元素]
修饰符:   [页面名]-[组件名]--[修饰符]
```

### 详细规范

- HTML 结构：`HTML-SPEC.md`

---

## 三、CSS 资源

### 引入方式

```html
<link rel="stylesheet" href="styles/main.css">
```

### 优先级法则

```
预定义组件类 > 工具类组合 > CSS 变量 > 硬编码值 (禁止)
```

### 工具类速查

#### 间距

| 类名 | 值 | 示例 |
|------|-----|------|
| `.p-xs` / `.m-xs` | 4px | 极小间距 |
| `.p-sm` / `.m-sm` | 8px | 小间距 |
| `.p-md` / `.m-md` | 16px | 中等间距 |
| `.p-lg` / `.m-lg` | 24px | 大间距 |
| `.gap-sm` / `.gap-md` | 8px / 16px | 子元素间距 |

#### 颜色

| 类名 | 用途 |
|------|------|
| `.text-primary` | 金黄文字 |
| `.text-secondary` | 白色文字 |
| `.text-muted` | 弱化文字 |
| `.text-success` | 成功状态 |
| `.text-error` | 错误状态 |
| `.bg-primary` | 深墨绿背景 |
| `.bg-accent` | 金黄背景 |

#### 布局

| 类名 | 用途 |
|------|------|
| `.flex` | Flex 容器 |
| `.flex-col` | 垂直布局 |
| `.items-center` | 垂直居中 |
| `.justify-between` | 两端对齐 |
| `.justify-center` | 水平居中 |

### 组件类速查

| 组件 | 类名 | 用途 |
|------|------|------|
| 主按钮 | `.btn .btn-primary` | 主要操作 |
| 次按钮 | `.btn .btn-ghost` | 次要操作 |
| 统计卡片 | `.card .card--summary` | 数据统计 |
| 数据卡片 | `.card .card--data` | 数据列表项 |
| 控制卡片 | `.card .card--control` | 设备控制面板 |
| 输入框 | `.input` | 表单输入 |
| 深色输入框 | `.input .input--dark` | 深色背景 |
| 深色表格 | `.table` | 数据表格 |
| 浅色表格 | `.table--light` | 弹窗表格 |
| 弹窗 | `.modal` | 模态框 |
| 状态点 | `.status-dot` | 状态指示器 |
| 标签页 | `.tabs-segmented` | 分段控制器 |

### 详细规则

- 样式手册：`REFERENCE-MANUAL.md`

---

## 四、页面模板速查

| 模板文件 | 页面类型 | 特点 |
|----------|----------|------|
| `dashboard-spec.html` | 仪表盘 | 设备监控 + 图表 + 统计卡片 |
| `industrial-dashboard-spec.html` | 工业首页 | 应用图标网格布局 |
| `data-init-spec.html` | 数据初始化 | 顶部Tab导航 + 数据卡片 |
| `device-control-spec.html` | 设备控制 | 3D预览 + 控制网格 |
| `param-config-spec.html` | 参数配置 | 表单 + 操作栏 |
| `table-spec.html` | 表格页面 | 数据表格 + 分页 |
| `create-minor-version-spec.html` | 弹窗表单 | 白色背景表单弹窗 |
| `upload-records-spec.html` | 弹窗表格 | 白色背景表格弹窗 |

---

## 五、Web Components 速查

### bot-nav 底部导航

```html
<bot-nav
  id="botNav"
  status-text="当前状态：强制停机"
  active-nav="监控台"
  data-mode="full"
  show-tuning-btn
  tuning-line1="开始"
  tuning-line2="调机">
</bot-nav>
<script src="components/bot-nav.js"></script>
```

| 属性 | 说明 |
|------|------|
| `status-text` | 状态文本 |
| `active-nav` | 当前激活项 |
| `data-mode` | `full` / `dashboard` |
| `show-tuning-btn` | 显示调机按钮 |

### ind-table 数据表格

```html
<ind-table
  columns='[{"key": "index", "label": "序号", "width": 52}]'
  data='[{"index": 1, "deviceId": "NC-A-0001"}]'
  theme="dark">
</ind-table>
<script src="components/table.js"></script>
```

### ind-modal 模态弹窗

```html
<ind-modal size="md" title="弹窗标题">
  <!-- 内容 -->
</ind-modal>
<script src="components/modal.js"></script>
```

---

## 六、CSS 变量速查

### 颜色变量

```css
/* 背景 */
--color-bg-primary: #002621;      /* 页面主背景 */
--color-bg-navbar: #00332e;       /* 导航栏背景 */
--color-card-bg-dark: #00332E;    /* 卡片背景 */

/* 强调 */
--color-accent-primary: #f9b707;  /* 主强调色 */

/* 文字 */
--color-text-primary: #f9b707;    /* 主要文字 */
--color-text-secondary: #ffffff;  /* 次要文字 */
--color-text-muted: #A0B0AF;      /* 弱化文字 */

/* 状态 */
--color-status-success: #4ade80;  /* 成功 */
--color-status-error: #f87171;    /* 错误 */
--color-status-warning: #FFB800;  /* 警告 */
```

### 间距变量

```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
```

---

## 七、文件索引

### 必看文件

| 文件 | 用途 |
|------|------|
| `QUICK-REFERENCE.md` | **入口文档（本文档）** |
| `styles/tokens.css` | 设计令牌定义 |
| `styles/main.css` | 样式入口 |

### 详细文档

| 文件 | 用途 |
|------|------|
| `HTML-SPEC.md` | HTML 结构详细规范 |
| `REFERENCE-MANUAL.md` | 样式使用详细规则 |
| `assets.json` | 资产映射配置（机器可读） |

### 组件文件

| 文件 | 组件 |
|------|------|
| `components/bot-nav.js` | 底部导航 |
| `components/table.js` | 数据表格 |
| `components/card.js` | 卡片 |
| `components/modal.js` | 模态弹窗 |
| `components/popup.js` | 提示弹窗 |
| `components/status.js` | 状态指示器 |
| `components/stepper.js` | 步进器 |
| `components/tabs.js` | 标签页 |
| `components/index.js` | 组件入口 |

---

*版本：v1.0 | 更新日期：2026-03-25*
