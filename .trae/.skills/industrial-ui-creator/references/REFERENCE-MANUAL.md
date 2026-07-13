# 工业控制系统设计系统 - 参考手册

> 本手册提供样式使用规则和最佳实践，配合 `main.css` 使用。

---

## 一、核心原则

### 1. 优先级法则

```
预定义组件类 > 工具类组合 > CSS 变量 > 硬编码值
```

| 优先级 | 方式 | 示例 | 适用场景 |
|-------|------|------|----------|
| ⭐⭐⭐ | 预定义组件 | `class="btn btn-primary"` | 有现成组件时 |
| ⭐⭐ | 工具类组合 | `class="flex items-center gap-md"` | 快速布局调整 |
| ⭐ | CSS 变量 | `color: var(--color-accent-primary)` | 自定义样式时 |
| ❌ | 硬编码值 | `color: #f9b707` | **禁止使用** |

### 2. 命名规范

```
组件: .btn, .card, .modal
元素: .btn__icon, .card__title
修饰符: .btn--primary, .card--data
状态: .is-active, .is-disabled
```

---

## 二、颜色使用规则

### 背景色选择

| 场景 | 使用变量 | 说明 |
|------|---------|------|
| 页面主背景 | `var(--color-bg-primary)` | 最底层背景 |
| 卡片/面板背景 | `var(--color-card-bg-dark)` | 内容容器 |
| 导航栏背景 | `var(--color-bg-navbar)` | 顶部/底部导航 |
| 弹窗遮罩 | `var(--color-bg-overlay)` | 模态框背景 |

```html
<!-- ✅ 正确 -->
<div class="page" style="background-color: var(--color-bg-primary)">
  <div class="card">内容</div>
</div>

<!-- ❌ 错误 -->
<div style="background-color: #002621">
  <div style="background-color: #00332E">内容</div>
</div>
```

### 文字色选择

| 场景 | 使用变量 | 工具类 |
|------|---------|--------|
| 标题/强调文字 | `var(--color-text-primary)` | `.text-primary` |
| 正文内容 | `var(--color-text-secondary)` | `.text-secondary` |
| 辅助说明 | `var(--color-text-muted)` | `.text-muted` |
| 表单内文字 | `var(--color-text-dark)` | `.text-dark` |

### 状态色选择

| 状态 | 颜色 | 工具类 | 使用场景 |
|------|------|--------|----------|
| 成功 | 绿色 | `.text-success` | 正常状态、完成提示 |
| 错误 | 红色 | `.text-error` | 异常状态、错误提示 |
| 警告 | 橙黄 | `.text-warning` | 警告提示、调机状态 |
| 信息 | 蓝色 | `.text-info` | 信息提示、链接 |

---

## 三、组件使用指南

### 1. 按钮

#### 场景选择

| 场景 | 推荐类名 | 说明 |
|------|---------|------|
| 主要操作（提交、确认） | `.btn .btn-primary` | 金黄背景，最醒目 |
| 次要操作（取消、重置） | `.btn .btn-ghost` | 透明背景+边框 |
| 设备控制 | `.btn-pill` | 胶囊形状 |
| 仪表盘操作 | `.btn-action` | 带图标，垂直布局 |

```html
<!-- 主要按钮 -->
<button class="btn btn-primary">确认提交</button>

<!-- 次要按钮 -->
<button class="btn btn-ghost">取消</button>

<!-- 按钮组 -->
<div class="flex gap-md">
  <button class="btn btn-ghost">取消</button>
  <button class="btn btn-primary">确认</button>
</div>
```

#### 禁用状态

```html
<button class="btn btn-primary" disabled>禁用按钮</button>
```

### 2. 卡片

#### 场景选择

| 场景 | 推荐类名 |
|------|---------|
| 通用内容容器 | `.card` |
| 数据统计展示 | `.card--summary` |
| 数据列表项 | `.card--data` |
| 设备控制面板 | `.card--control` |

```html
<!-- 统计卡片 -->
<div class="card-summary-row">
  <div class="card card--summary">
    <div class="card__value">128</div>
    <div class="card__label">设备总数</div>
  </div>
  <div class="card card--summary">
    <div class="card__value">96</div>
    <div class="card__label">在线设备</div>
  </div>
</div>

<!-- 数据卡片 -->
<div class="card card--data">
  <div class="card__left">
    <div class="card__title">数据版本 v1.0.0</div>
    <div class="card__body">
      <span class="card__meta"><span>创建时间:</span>2024-01-01</span>
    </div>
  </div>
  <button class="card__action">操作</button>
</div>
```

### 3. 表单

#### 输入框

```html
<!-- 基础输入框 -->
<input type="text" class="input" placeholder="请输入">

<!-- 深色主题输入框 -->
<input type="text" class="input input--dark" placeholder="深色背景">

<!-- 全宽输入框 -->
<input type="text" class="input input--block">
```

#### 表单字段布局

```html
<div class="form-field">
  <label class="form-field__label">标签名称</label>
  <input type="text" class="input input--block">
</div>

<!-- 表单区块 -->
<div class="form-section">
  <div class="form-section__title">基础信息</div>
  <div class="form-grid">
    <div class="form-grid__col">
      <div class="form-field">...</div>
    </div>
    <div class="form-grid__col">
      <div class="form-field">...</div>
    </div>
  </div>
</div>
```

#### 选择框

```html
<select class="select">
  <option>选项1</option>
  <option>选项2</option>
</select>
```

#### 步进器

```html
<div class="stepper">
  <button class="stepper__btn">-</button>
  <input type="number" class="stepper__input" value="1">
  <button class="stepper__btn">+</button>
</div>
```

### 4. 表格

```html
<div class="table-container">
  <table class="table">
    <thead>
      <tr>
        <th class="col-index">#</th>
        <th>名称</th>
        <th>状态</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="col-index">1</td>
        <td>设备A</td>
        <td>
          <div class="status-indicator">
            <span class="status-dot status-dot--green"></span>
            正常
          </div>
        </td>
        <td>
          <div class="action-links">
            <a class="action-link">编辑</a>
            <a class="action-link">删除</a>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

#### 表格变体

| 类名 | 用途 |
|------|------|
| `.table` | 深色主题表格 |
| `.table--light` | 浅色主题表格 |
| `.table-container` | 表格容器 |
| `.table-container--light` | 浅色容器 |

### 5. 弹窗

```html
<!-- 弹窗遮罩 -->
<div class="modal-overlay">
  <div class="modal">
    <button class="modal__close">×</button>
    <div class="modal__title">弹窗标题</div>
    <div class="modal__content">
      <!-- 内容 -->
    </div>
    <div class="modal__actions">
      <button class="btn btn-ghost">取消</button>
      <button class="btn btn-primary">确认</button>
    </div>
  </div>
</div>

<!-- 大尺寸弹窗 -->
<div class="modal modal--lg">...</div>
```

### 6. 面板

```html
<!-- 基础面板 -->
<div class="panel">
  <div class="panel__header">
    <span class="panel__icon">📊</span>
    面板标题
  </div>
  <div class="panel__content">
    内容区域
  </div>
</div>

<!-- 设备列表面板 -->
<div class="panel panel--device">
  <div class="panel__row">
    <span class="panel__name">设备A</span>
    <span class="device-status device-status--normal">● 正常</span>
  </div>
</div>
```

### 7. 标签页

```html
<!-- 分段控制器 -->
<div class="tabs-segmented">
  <button class="tabs-segmented__tab tabs-segmented__tab--active">全部</button>
  <button class="tabs-segmented__tab">在线</button>
  <button class="tabs-segmented__tab">离线</button>
</div>

<!-- 下划线样式 -->
<div class="tabs-underline">
  <button class="tabs-underline__tab tabs-underline__tab--active">全部</button>
  <button class="tabs-underline__tab">在线</button>
</div>
```

### 8. 状态指示器

```html
<!-- 状态点 -->
<span class="status-dot status-dot--green"></span>  <!-- 绿色 -->
<span class="status-dot status-dot--red"></span>    <!-- 红色 -->

<!-- 状态指示器（带文字） -->
<div class="status-indicator">
  <span class="status-dot status-dot--green"></span>
  运行正常
</div>

<!-- 设备状态 -->
<div class="device-status device-status--normal">● 正常</div>
<div class="device-status device-status--error">● 异常</div>

<!-- 脉冲动画点 -->
<div class="vab-dot vab-dot--success">
  <span class="status-dot status-dot--green"></span>
</div>
```

---

## 四、布局使用指南

### 页面结构

```html
<body class="page">
  <!-- 顶部导航（可选） -->
  <nav class="top-nav">...</nav>
  
  <!-- 主内容区 -->
  <main class="page-main page-main--padded">
    <div class="container">
      <!-- 内容 -->
    </div>
  </main>
  
  <!-- 底部导航 -->
  <nav class="navbar">...</nav>
</body>
```

### Flex 布局

```html
<!-- 水平居中 -->
<div class="flex items-center justify-center">
  内容
</div>

<!-- 两端对齐 -->
<div class="flex items-center justify-between">
  <span>左侧</span>
  <span>右侧</span>
</div>

<!-- 带间距 -->
<div class="flex items-center gap-md">
  <span>项目1</span>
  <span>项目2</span>
</div>

<!-- 垂直布局 -->
<div class="flex flex-col gap-lg">
  <div>项目1</div>
  <div>项目2</div>
</div>
```

### Grid 布局

```html
<!-- 两列 -->
<div class="grid grid-cols-2 gap-lg">
  <div>列1</div>
  <div>列2</div>
</div>

<!-- 四列 -->
<div class="grid grid-cols-4 gap-md">
  <div>1</div>
  <div>2</div>
  <div>3</div>
  <div>4</div>
</div>

<!-- 响应式图标网格 -->
<div class="app-grid">
  <div class="nav-item">图标1</div>
  <div class="nav-item">图标2</div>
  ...
</div>
```

---

## 五、间距使用规则

### 间距等级选择

| 变量 | 值 | 使用场景 |
|------|-----|---------|
| `--spacing-xs` | 4px | 紧凑元素间距、图标与文字 |
| `--spacing-sm` | 8px | 小组件内部间距 |
| `--spacing-md` | 16px | 常规间距、卡片内边距 |
| `--spacing-lg` | 24px | 区块间距、大组件内边距 |
| `--spacing-xl` | 32px | 页面区块间距 |
| `--spacing-2xl` | 40px | 大区块分隔 |

### 工具类使用

```html
<!-- 内边距 -->
<div class="p-md">四边 16px</div>
<div class="px-lg py-md">左右 24px，上下 16px</div>
<div class="pt-xl">上边距 32px</div>

<!-- 外边距 -->
<div class="m-auto">居中</div>
<div class="mx-auto">水平居中</div>
<div class="mb-lg">下边距 24px</div>

<!-- Gap 间距 -->
<div class="flex gap-sm">子元素间距 8px</div>
<div class="flex gap-md">子元素间距 16px</div>
```

---

## 六、字体使用规则

### 字号选择

| 变量 | 值 | 使用场景 |
|------|-----|---------|
| `--font-size-xs` | 10px | 极小标注 |
| `--font-size-sm` | 12px | 辅助说明、标签 |
| `--font-size-base` | 14px | 正文、表格内容 |
| `--font-size-lg` | 16px | 表单标签、卡片内容 |
| `--font-size-xl` | 18px | 小标题 |
| `--font-size-2xl` | 20px | 卡片标题 |
| `--font-size-3xl` | 24px | 面板标题 |
| `--font-size-4xl` | 32px | 页面标题 |
| `--font-size-5xl` | 36px | 大标题、Logo |

### 字重选择

| 变量 | 值 | 使用场景 |
|------|-----|---------|
| `--font-weight-normal` | 400 | 正文 |
| `--font-weight-medium` | 500 | 标签、按钮 |
| `--font-weight-semibold` | 600 | 小标题 |
| `--font-weight-bold` | 700 | 标题、强调 |

```html
<span class="text-sm font-medium">标签</span>
<span class="text-xl font-semibold">小标题</span>
<span class="text-3xl font-bold">大标题</span>
```

---

## 七、常见场景模板

### 1. 页面头部

```html
<div class="flex items-center justify-between p-lg border-b" 
     style="border-color: var(--color-card-border)">
  <h1 class="text-3xl font-bold text-primary">页面标题</h1>
  <button class="btn btn-primary">新建</button>
</div>
```

### 2. 统计卡片组

```html
<div class="flex gap-md">
  <div class="card card--summary flex-1">
    <div class="card__value text-2xl font-semibold">128</div>
    <div class="card__label text-sm text-muted">设备总数</div>
  </div>
  <div class="card card--summary flex-1">
    <div class="card__value text-2xl font-semibold text-success">96</div>
    <div class="card__label text-sm text-muted">在线设备</div>
  </div>
  <div class="card card--summary flex-1">
    <div class="card__value text-2xl font-semibold text-error">32</div>
    <div class="card__label text-sm text-muted">离线设备</div>
  </div>
</div>
```

### 3. 搜索栏

```html
<div class="flex items-center gap-md p-lg" 
     style="background: var(--color-card-bg-dark); border-radius: var(--radius-lg)">
  <input type="text" class="input input--dark" placeholder="搜索...">
  <select class="select">
    <option>全部状态</option>
    <option>在线</option>
    <option>离线</option>
  </select>
  <button class="btn btn-primary">查询</button>
  <button class="btn btn-ghost">重置</button>
</div>
```

### 4. 空状态

```html
<div class="flex flex-col items-center justify-center p-3xl text-center">
  <div class="text-5xl mb-lg">📭</div>
  <div class="text-xl text-muted mb-md">暂无数据</div>
  <button class="btn btn-primary">添加数据</button>
</div>
```

### 5. 操作确认弹窗

```html
<div class="modal-overlay">
  <div class="popup">
    <div class="popup__header">
      <div class="popup__title">确认操作</div>
      <button class="popup__close">×</button>
    </div>
    <div class="popup__content">
      <span class="popup__icon">⚠️</span>
      <span class="popup__text">确定要执行此操作吗？</span>
    </div>
    <div class="popup__buttons">
      <button class="btn btn-ghost">取消</button>
      <button class="btn btn-primary">确认</button>
    </div>
  </div>
</div>
```

---

## 八、Do's and Don'ts

### ✅ Do's

```html
<!-- 使用预定义组件 -->
<button class="btn btn-primary">提交</button>

<!-- 使用 CSS 变量 -->
<style>
.my-card {
  background: var(--color-card-bg-dark);
  padding: var(--spacing-md);
}
</style>

<!-- 使用工具类组合 -->
<div class="flex items-center gap-md p-lg">
  ...
</div>

<!-- 遵循 BEM 命名 -->
<div class="my-component">
  <div class="my-component__header">...</div>
</div>
```

### ❌ Don'ts

```html
<!-- 硬编码颜色值 -->
<button style="background: #f9b707; color: #002621">提交</button>

<!-- 硬编码间距 -->
<div style="padding: 16px; margin: 8px">...</div>

<!-- 自定义样式覆盖组件 -->
<button class="btn btn-primary" style="background: red">提交</button>

<!-- 随意命名 -->
<div class="myButtonWrapper">...</div>
```

---

## 九、快速查找表

### 颜色速查

| 用途 | 变量 | 工具类 |
|------|------|--------|
| 页面背景 | `--color-bg-primary` | `.bg-primary` |
| 卡片背景 | `--color-card-bg-dark` | - |
| 强调色 | `--color-accent-primary` | `.text-accent` / `.bg-accent` |
| 主文字 | `--color-text-primary` | `.text-primary` |
| 白色文字 | `--color-text-secondary` | `.text-secondary` |
| 弱化文字 | `--color-text-muted` | `.text-muted` |
| 成功色 | `--color-status-success` | `.text-success` |
| 错误色 | `--color-status-error` | `.text-error` |

### 间距速查

| 变量 | 值 | 工具类 |
|------|-----|--------|
| xs | 4px | `.p-xs` `.m-xs` `.gap-xs` |
| sm | 8px | `.p-sm` `.m-sm` `.gap-sm` |
| md | 16px | `.p-md` `.m-md` `.gap-md` |
| lg | 24px | `.p-lg` `.m-lg` `.gap-lg` |
| xl | 32px | `.p-xl` `.m-xl` `.gap-xl` |

### 组件速查

| 需求 | 使用 |
|------|------|
| 主要按钮 | `.btn .btn-primary` |
| 次要按钮 | `.btn .btn-ghost` |
| 基础卡片 | `.card` |
| 统计卡片 | `.card .card--summary` |
| 输入框 | `.input` |
| 深色输入框 | `.input .input--dark` |
| 深色表格 | `.table` |
| 浅色表格 | `.table--light` |
| 弹窗 | `.modal` |
| 面板 | `.panel` |
| 状态点 | `.status-dot` |
| 标签页 | `.tabs-segmented` |

---

*参考手册版本：v1.0*
