# Styles Changelog

> 倒序排列，最新在最上方。

---

## 2026-08-03
- [修改] `variables.css` - 扩充设计令牌：新增 display/body 双字体 token（霞鹜文楷+系统无衬线）、hero 字号、shadow-card/-hover、z-index 层级命名、ease-out 缓动；卡片底色从纯白微倾（`#FBFAF8`）消除合成感
- commit: 53ab43f [refactor](德塔): 社区站视觉体系统一

---

## 2026-06-29
- [新增] `variables.css` - CSS 设计令牌（色彩/字体/间距变量）
- [新增] `base.css` - 全局基础重置（替换原 styles.css）
- commit: 未提交

---

> 以下为断档补全（基于 git 历史，正序追加）

## 2026-07-01
- [修改] `variables.css` - 设计令牌从「学院风」重构为「Qzone 风格」（--qz-* 主色蓝/功能色/中性色/字体/间距/圆角/阴影体系）
- [修改] `base.css` - 同步迁移至 Qzone 令牌（--qz-*），新增链接 hover 过渡
- commit: 62586ed feat: 用户认证系统 + Qzone 风格样式重构

---

## 2026-07-05
- [修改] `variables.css` - 设计令牌从「Qzone 风格」重构为「莫兰迪风格」（--md-* 低饱和柔和色板：鼠尾草绿主色/奶蓝辅色/暖赭点缀/温暖米白背景）
- [修改] `base.css` - 同步迁移至莫兰迪令牌（--md-*），行高放宽至 1.75
- commit: 5d06f5e feat: 群聊词云 + 莫兰迪视觉体系
