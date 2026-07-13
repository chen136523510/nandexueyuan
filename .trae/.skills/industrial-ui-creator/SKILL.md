---
name: industrial-ui-creator
description: 工业控制系统高保真原型生成器。基于设计系统自动生成符合品牌形象的 HTML 原型页面。当用户需要创建工业控制界面、设备监控页面、仪表盘、参数配置页面、数据管理页面或任何工业风格的高保真原型时使用此技能。即使只是描述一个页面需求或提及"工业原型"、"设备控制界面"、"监控页面"、"工业UI"等关键词，也应主动触发此技能。生成的原型输出到 docs/prd/ 目录下。
---

# 工业控制系统高保真原型生成器

## 核心原则

1. **品牌一致性**：严格遵循设计系统的颜色、字体、间距规范
2. **外部资源引用**：CSS 必须使用外部文件，禁止行内样式
3. **组件化思维**：优先使用预定义组件类，保证全局统一
4. **可访问性**：遵循 WCAG 标准，添加必要的 ARIA 属性

---

## 一、资源引用规范

### 外部文件引用（必须）

从 `docs/prd/` 目录引用资源：

```html
<!-- CSS 样式 - 必须外部引用 -->
<link rel="stylesheet" href="../assets/industrial-ui-spec/styles/main.css" />

<!-- Web Components - 按需引入 -->
<script src="../assets/industrial-ui-spec/components/bot-nav.js"></script>
<script src="../assets/industrial-ui-spec/components/table.js"></script>
<script src="../assets/industrial-ui-spec/components/modal.js"></script>
```

### 交互脚本规范

- **简单交互**：JS 用内部脚本即可
- **复杂交互**：用外部 JS 文件

---

## 二、标准页面模板

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta content="width=device-width, initial-scale=1.0" name="viewport" />
  <title>页面名称 - 系统名称</title>
  <!-- 引用 UI 规范样式 - 必须外部引用 -->
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
  <script src="../assets/industrial-ui-spec/components/bot-nav.js"></script>
</body>
</html>
```

---

## 三、品牌形象

### 核心颜色

| 用途 | 颜色 | CSS 变量 |
|------|------|----------|
| 页面背景 | 深墨绿 #002621 | `--color-bg-primary` |
| 强调色/标题 | 金黄 #f9b707 | `--color-accent-primary` |
| 主要文字 | 金黄 #f9b707 | `--color-text-primary` |
| 次要文字 | 白色 #ffffff | `--color-text-secondary` |
| 成功状态 | 绿色 #4ade80 | `--color-status-success` |
| 错误状态 | 红色 #f87171 | `--color-status-error` |

### 设计风格

- **深色主题优先**：适合工业监控场景
- **金黄色强调**：醒目的操作提示
- **全屏固定布局**：`h-screen flex flex-col`

---

## 四、样式优先级法则

```
预定义组件类 > 工具类组合 > CSS 变量 > 硬编码值 (禁止)
```

---

## 五、输出检查清单

- [ ] CSS 使用外部文件引用
- [ ] 无行内样式 (`style="..."`)
- [ ] 使用 CSS 变量而非硬编码颜色
- [ ] 遵循 BEM 命名规范
- [ ] 包含必要的可访问性属性
- [ ] 文件保存到 `docs/prd/` 目录

---
---

## 六、页面结构描述

生成后html后，请用列表或表格形式详细描述页面的结构，把每个可交互区域（如筛选区、表格、分页）、每个可交互元素（如按钮、输入框、下拉菜单）以及每个数据字段（如状态、优先级、日期）都命名清楚，并说明它们的位置和基本功能。
这份描述将作为我后续提出修改需求的索引，我需要能够直接引用你列出的名称来精准指定要修改的内容。

---
## 参考文档

详细规范请阅读技能 references 目录下的文档：

| 文档 | 用途 |
|------|------|
| `references/QUICK-REFERENCE.md` | **入口文档（必看）** |
| `references/HTML-SPEC.md` | HTML 结构详细规范 |
| `references/REFERENCE-MANUAL.md` | 样式使用详细规则 |
| `references/tokens.css` | 设计令牌定义 |

---

*技能版本：v1.0*
