# 工业控制系统设计系统 - HTML 结构规范

> 本规范从现有页面提取，定义 HTML 结构、命名约定和可访问性要求。

---

## 一、核心设计原则

### 1. 语义化优先

| 原则 | 说明 |
|------|------|
| 使用语义化标签 | `<main>`、`<nav>`、`<section>`、`<h2>`/`<h3>` 优先于通用 `<div>` |
| 可访问性保障 | 关闭按钮使用 `aria-label`，Tab 使用 `role="tablist"` 和 `aria-selected` |
| 命名一致性 | 页面类型 class、组件 class 遵循统一命名模式 |

### 2. 命名模式

```
页面容器: [页面名]-page
主内容:   [页面名]-main
组件:     [页面名]-[组件名]
元素:     [页面名]-[组件名]__[元素]
修饰符:   [页面名]-[组件名]--[修饰符]
```

---

## 二、文档基础结构

### 标准模板

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
  <!-- 页面内容 -->
</body>
</html>
```

### 必须项清单

| 项目 | 要求 | 示例 |
|------|------|------|
| 语言声明 | `lang="zh-CN"` | `<html lang="zh-CN">` |
| 字符编码 | UTF-8 | `<meta charset="utf-8" />` |
| 视口设置 | 响应式 | `<meta content="width=device-width, initial-scale=1.0" name="viewport" />` |
| 样式引入 | 主样式文件 | `<link rel="stylesheet" href="styles/main.css" />` |
| Body ID | 必须有 | `<body id="app">` |

---

## 三、Body 结构规范

### 页面类型 Class 命名

| 页面类型 | Body Class | 来源文件 |
|----------|------------|----------|
| 仪表盘 | `h-screen flex flex-col` | dashboard-spec.html |
| 工业首页 | `h-screen flex flex-col` | industrial-dashboard-spec.html |
| 数据初始化 | `h-screen flex flex-col data-init-page` | data-init-spec.html |
| 设备控制 | `h-screen flex flex-col device-control-page` | device-control-spec.html |
| 参数配置 | `h-screen flex flex-col param-config-page` | param-config-spec.html |
| 表格页面 | `table-page` | table-spec.html |
| 创建版本弹窗 | `create-version-page` | create-minor-version-spec.html |
| 上传记录弹窗 | `upload-records-page` | upload-records-spec.html |

### 规范要点

```html
<!-- ✅ 正确：全屏页面 -->
<body class="h-screen flex flex-col data-init-page" id="app">

<!-- ✅ 正确：弹窗页面 -->
<body class="create-version-page" id="app">

<!-- ❌ 错误：缺少 id="app" -->
<body class="h-screen flex flex-col">
```

---

## 四、主内容区域 `<main>`

### 结构规范

```html
<!-- 仪表盘页面 -->
<main class="dash-main flex-grow overflow-auto min-h-0">
  <div class="dashboard-spec">
    <!-- 内容 -->
  </div>
</main>

<!-- 数据初始化页面 -->
<main class="data-init-main flex-grow overflow-auto min-h-0">
  <div class="data-init-content">
    <!-- 内容 -->
  </div>
</main>

<!-- 设备控制页面（双栏布局） -->
<main class="device-control-main flex-grow overflow-hidden min-h-0 flex">
  <section class="device-control-preview">...</section>
  <section class="device-control-grid-wrap">...</section>
</main>

<!-- 参数配置页面 -->
<main class="param-config-main flex-grow overflow-auto min-h-0">
  <section class="param-config-section">...</section>
</main>
```

### 规范要点

| 项目 | 要求 |
|------|------|
| 标签 | 使用 `<main>` 标签 |
| 基础 class | `flex-grow overflow-auto min-h-0` |
| 页面特定 class | `dash-main`、`data-init-main`、`device-control-main` 等 |

---

## 五、底部导航 `<bot-nav>`

### 结构规范

```html
<!-- 基础用法 -->
<div class="dash-bottom-nav">
  <bot-nav id="botNav" status-text="当前状态：强制停机" active-nav="监控台" show-tuning-btn></bot-nav>
</div>

<!-- Dashboard 模式 -->
<div class="device-control-bottom-nav">
  <bot-nav id="botNav" data-mode="dashboard" active-nav="设备控制"></bot-nav>
</div>

<!-- 带调机按钮 -->
<div class="param-config-bottom-nav">
  <bot-nav id="botNav" 
    status-text="当前状态：调机模式" 
    active-nav="项目管理" 
    show-tuning-btn 
    tuning-line1="开始" 
    tuning-line2="调机"></bot-nav>
</div>

<!-- 引入组件脚本 -->
<script src="components/bot-nav.js"></script>
```

### bot-nav 属性说明

| 属性 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `id` | string | 组件 ID | `id="botNav"` |
| `status-text` | string | 状态文本 | `status-text="当前状态：强制停机"` |
| `active-nav` | string | 当前激活的导航项 | `active-nav="监控台"` |
| `data-mode` | string | 模式：full / dashboard | `data-mode="dashboard"` |
| `show-tuning-btn` | boolean | 是否显示调机按钮 | `show-tuning-btn` |
| `tuning-line1` | string | 调机按钮第一行文字 | `tuning-line1="开始"` |
| `tuning-line2` | string | 调机按钮第二行文字 | `tuning-line2="调机"` |

---

## 六、顶部导航 `<nav>`

### 结构规范

```html
<nav class="data-init-top-nav">
  <a href="#" class="data-init-top-nav-item">
    <span class="data-init-nav-icon">
      <svg viewBox="0 0 24 24" fill="currentColor">...</svg>
    </span>
    <span class="data-init-nav-label">关于版本</span>
  </a>
  <a href="#" class="data-init-top-nav-item data-init-top-nav-item--active">
    <span class="data-init-nav-icon">...</span>
    <span class="data-init-nav-label">数据初始化</span>
  </a>
</nav>
```

### 规范要点

| 项目 | 要求 |
|------|------|
| 标签 | 使用 `<nav>` 标签 |
| 导航项 | 使用 `<a>` 标签 |
| 激活状态 | 使用修饰符 class：`[页面名]-top-nav-item--active` |

---

## 七、卡片/面板组件

### 结构规范

```html
<!-- 数据卡片 (data-init-spec.html) -->
<div class="card--data">
  <div class="card__left">
    <div class="card__title">设备库数据</div>
    <div class="card__body">
      <span class="card__meta"><span>更新时间：</span>2024-08-11</span>
      <a href="#" class="card__link">本地数据：10200条 >></a>
    </div>
  </div>
  <button type="button" class="card__action">更新数据</button>
</div>

<!-- 面板组件 (dashboard-spec.html) -->
<div class="dash-panel dash-panel-device">
  <div class="dash-panel-header dash-panel-header--center">
    <svg class="dash-panel-icon">...</svg>
    系统设备监控
  </div>
  <div class="dash-device-list">...</div>
</div>

<!-- 控制卡片 (device-control-spec.html) -->
<div class="card--control">
  <h3 class="card__title">旋转</h3>
  <div class="device-control-row">...</div>
</div>
```

### 命名规范

| 组件类型 | 容器 Class | 标题 Class | 内容 Class |
|----------|------------|------------|------------|
| 数据卡片 | `card--data` | `card__title` | `card__body` |
| 面板 | `dash-panel` | `dash-panel-header` | `dash-device-list` |
| 控制卡片 | `card--control` | `card__title` | `device-control-row` |
| 统计卡片 | `card--summary` | `card__label` | `card__value` |

---

## 八、表单组件

### 结构规范

```html
<section class="param-config-section">
  <h2 class="param-config-title">参数配置</h2>
  <div class="param-config-grid">
    <div class="param-config-col">
      <!-- 表单字段 -->
      <div class="param-config-field">
        <label class="param-config-label">云服务器地址</label>
        <input type="text" class="param-config-input" />
      </div>
      <!-- 选择框 -->
      <div class="param-config-field">
        <label class="param-config-label">排列方式</label>
        <select class="param-config-select">
          <option value="3">3</option>
        </select>
      </div>
    </div>
  </div>
</section>
```

### 规范要点

| 项目 | 要求 |
|------|------|
| 表单区域 | 使用 `<section>` 包裹 |
| 标题 | 使用 `<h2>` 标签 |
| 字段容器 | `[页面名]-field` |
| 标签 | `<label class="[页面名]-label">` |
| 输入框 | `<input class="[页面名]-input">` |

---

## 九、按钮组件

### 结构规范

```html
<!-- 主要按钮 -->
<button type="button" class="btn btn-primary">确定</button>

<!-- 页面特定按钮 -->
<button type="button" class="card__action">更新数据</button>
<button type="button" class="param-config-btn">重新生成并上传</button>

<!-- 查询/重置按钮 -->
<button class="dash-btn-query">查询</button>
<button class="dash-btn-reset">重置</button>

<!-- 胶囊按钮 (设备控制) -->
<button type="button" class="device-control-pill">
  <span class="device-control-dot"></span>
  <span class="device-control-pill-text">正向旋转</span>
  <span class="device-control-dot"></span>
</button>

<!-- 关闭按钮 (弹窗) -->
<button type="button" class="create-version-close" aria-label="关闭">×</button>
```

### 规范要点

| 项目 | 要求 |
|------|------|
| type 属性 | 按钮必须包含 `type="button"` |
| 可访问性 | 关闭按钮必须包含 `aria-label="关闭"` |
| 命名规范 | 页面特定按钮：`[页面名]-btn` 或 `[页面名]-btn-功能` |

---

## 十、表格组件

### 结构规范

```html
<div class="table-container">
  <table class="data-table">
    <colgroup>
      <col /><col /><col />
    </colgroup>
    <thead>
      <tr>
        <th class="col-index">序号</th>
        <th>设备人员号</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="col-index">1</td>
        <td>NC-A-0001-0000266</td>
        <td>
          <div class="action-links">
            <button type="button" class="action-link">远控制机</button>
          </div>
        </td>
      </tr>
      <tr class="highlight-row">
        <!-- 高亮行 -->
      </tr>
    </tbody>
  </table>
</div>
```

### 表格状态

```html
<!-- 状态指示器 -->
<span class="status-indicator">
  <span class="status-dot"></span>频繁停止
</span>

<!-- 上传状态 -->
<span class="upload-records-status upload-records-status--success">成功</span>
<span class="upload-records-status upload-records-status--fail">失败</span>
```

---

## 十一、弹窗/模态框

### 结构规范

```html
<!-- 弹窗遮罩 + 容器 -->
<div class="create-version-overlay">
  <div class="create-version-modal">
    <!-- 关闭按钮 -->
    <button type="button" class="create-version-close" aria-label="关闭">×</button>
    
    <!-- 标题 -->
    <h2 class="create-version-title">创建小版本</h2>
    
    <!-- 表单内容 -->
    <form class="create-version-form">
      <!-- 表单字段 -->
    </form>
  </div>
</div>
```

### Tab 切换

```html
<div class="upload-records-tabs" role="tablist">
  <button type="button" 
    class="upload-records-tab upload-records-tab--active" 
    role="tab" 
    aria-selected="true">MES系统上传记录</button>
  <button type="button" 
    class="upload-records-tab" 
    role="tab" 
    aria-selected="false">云服务器上传记录</button>
</div>
```

### 规范要点

| 项目 | 要求 |
|------|------|
| 遮罩层 | `[页面名]-overlay` |
| 弹窗容器 | `[页面名]-modal` |
| 关闭按钮 | 必须有 `aria-label="关闭"` |
| Tab 容器 | 必须有 `role="tablist"` |
| Tab 按钮 | 必须有 `role="tab"` 和 `aria-selected` |

---

## 十二、状态指示器

### 结构规范

```html
<!-- 设备状态 (dashboard-spec.html) -->
<span class="dash-device-status">
  <span class="dash-status-dot dash-status-dot--green"></span>
  <span class="dash-status-normal">正常</span>
</span>

<!-- 表格状态 (table-spec.html) -->
<span class="status-indicator">
  <span class="status-dot"></span>频繁停止
</span>

<!-- 上传状态 (upload-records-spec.html) -->
<span class="upload-records-status upload-records-status--success">成功</span>
<span class="upload-records-status upload-records-status--fail">失败</span>
```

---

## 十三、完整页面模板

### 工业控制页面标准模板

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

  <!-- 主内容区域 -->
  <main class="[页面名]-main flex-grow overflow-auto min-h-0">
    <div class="[页面名]-content">
      <!-- 页面内容 -->
    </div>
  </main>

  <!-- 底部导航 -->
  <div class="[页面名]-bottom-nav">
    <bot-nav id="botNav" active-nav="当前页面"></bot-nav>
  </div>

  <script src="components/bot-nav.js"></script>
</body>
</html>
```

---

## 十四、可访问性清单

### 必须项

| 项目 | 要求 | 示例 |
|------|------|------|
| 页面标题 | 有意义的 `<title>` | `<title>设备控制 - 旋转平台</title>` |
| 主内容标识 | 使用 `<main>` | `<main class="...">` |
| 导航标识 | 使用 `<nav>` | `<nav class="...">` |
| 关闭按钮 | `aria-label` | `aria-label="关闭"` |
| Tab 组件 | `role` + `aria-selected` | `role="tab" aria-selected="true"` |
| 表格说明 | `aria-label` | `<table aria-label="设备列表">` |
| 弹窗标识 | `role="dialog"` + `aria-modal` | `role="dialog" aria-modal="true"` |

### 屏幕阅读器隐藏

```html
<!-- 仅视觉显示，屏幕阅读器跳过 -->
<h1 class="sr-only">工业监控仪表盘</h1>
```

---

## 十五、Do's and Don'ts

### ✅ Do's

```html
<!-- 使用语义化标签 -->
<main class="dash-main">...</main>
<nav class="data-init-top-nav">...</nav>
<section class="param-config-section">...</section>

<!-- 遵循命名规范 -->
<div class="data-init-card">
  <div class="data-init-card-title">...</div>
</div>

<!-- 添加可访问性属性 -->
<button type="button" aria-label="关闭">×</button>
<div role="tablist">...</div>
```

### ❌ Don'ts

```html
<!-- 使用通用 div 替代语义化标签 -->
<div class="main">...</div>
<div class="nav">...</div>

<!-- 随意命名 -->
<div class="myCard">
  <div class="title">...</div>
</div>

<!-- 忽略可访问性 -->
<button type="button">×</button>
<div class="tabs">...</div>
```

---

## 十六、页面文件索引

| 文件名 | 页面类型 | 主要组件 |
|--------|----------|----------|
| `index.html` | 导航首页 | 卡片导航 |
| `dashboard-spec.html` | 仪表盘 | 面板、图表、统计卡片、bot-nav |
| `industrial-dashboard-spec.html` | 工业首页 | 图标网格、bot-nav |
| `data-init-spec.html` | 数据初始化 | 顶部导航、数据卡片、bot-nav |
| `device-control-spec.html` | 设备控制 | 3D预览、控制卡片、bot-nav |
| `param-config-spec.html` | 参数配置 | 表单、操作栏、bot-nav |
| `table-spec.html` | 表格页面 | 数据表格、弹窗 |
| `create-minor-version-spec.html` | 创建版本 | 弹窗表单、步进器、单选 |
| `upload-records-spec.html` | 上传记录 | 弹窗、Tab、表格、分页 |
| `components-showcase.html` | 组件展示 | 所有组件文档 |
| `brand-identity.html` | 品牌规范 | HTML规范文档 |
| `status-test.html` | 状态测试 | 状态指示器组件 |

---

*HTML 结构规范版本：v1.1 | 更新日期：2026-03-24*
