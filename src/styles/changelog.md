# Styles Changelog

> 倒序排列，最新在最上方。

---

## 2026-08-22（黑机·BUG-73 修复）
- [修改] `base.css` - 新增 `body.has-bottom-nav .chat-page { height: calc(100dvh - 64px - env(safe-area-inset-bottom, 0px)); }`。修复手机端男德通输入框被底部导航遮挡：ChatView.vue scoped CSS 里 `:global(body.has-bottom-nav) .chat-page` 混搭写法被 Vue SFC 编译器静默丢弃（线上 styleSheets 实测无此规则），移到全局样式文件稳定生效
- commit: 待提交 [fix](男德通): BUG-73

---

## 2026-08-13（白机·晚自习模式）
- [修改] `variables.css` - 新增深色主题 token 层（`:root[data-theme='dark']` 覆写色彩/阴影/渐变：青灰底 + 暖米白字 + 主色提亮 + 主色按钮深底字）；`:root` 补 `color-scheme: light`
- [修改] `base.css` - body 主题切换颜色平滑过渡；新增 `body.has-bottom-nav` 移动端底部导航占位（含 iOS 安全区）
- commit: 待提交 [feat](德塔): 门户趣味化

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
