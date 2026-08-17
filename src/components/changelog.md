# Components Changelog

> 倒序排列，最新在最上方。

---

## 2026-08-17（白机·星河问签运势模块）
- [新增] `FortuneCard.vue` - 星河问签卡片（大厅第三行 4 列）：双 tab（今日运势/星座分析）。今日运势=星级+宜忌+幸运数字/色+三维运势条+签语；星座分析=12 宫图标选择器+综合指数+梗文案+生日登记（localStorage `nde-birth-md`，本命星座金色角标+「我的」badge）。全 token 化适配深色主题，含 aria-label/reduce-motion 兜底
- commit: 待提交 [feat](门户): 星河问签运势模块

---

## 2026-08-13（白机·移动端适配）
- [修改] `TopBar.vue` - 移动端抽屉菜单过滤德塔入口（`drawerItems`，桌面菜单不受影响）
- [修改] `BottomNav.vue` - 移除德塔 tab（移动端隐藏德塔模块）
- commit: 待提交 [feat](德塔): 移动端适配

---

## 2026-08-13（白机·门户趣味化）
- [新增] `ThemeToggle.vue` - 主题开关（自动→晚自习深色→浅色 循环，lucide 图标，aria-label）
- [新增] `BottomNav.vue` - 移动端底部 tab 导航（5 入口 + 安全区适配 + 激活指示条 + 上滑入场）
- [修改] `TopBar.vue` - 接入主题开关
- [修改] `WordCloud.vue` - hover 词条显示词频悬浮提示 + 光标反馈 + 底部提示文案（复用 wordcloud2.js hover 回调）
- [修改] `UserAvatar.vue` / `ProfileDialog.vue` - 深色模式回归：硬编码色 token 化
- [修改] `../App.vue` - 页面转场升级（fade→淡入+上浮缩放"推门而入"）；移动端 BottomNav 按路由挂载（/home /chat /wall /mailbox）；主题初始化 + auto 模式跨时辰刷新
- commit: 待提交 [feat](德塔): 门户趣味化

---

## 2026-08-03
- [修改] `TopBar.vue` - 标题 display 字体化、active 态圆角背景改下划线、token 化。初版误删 space-between 导致导航挤左，已即时修复（见 BUG-51）
- [修改] `AppFooter.vue` - 新增 Ft5 宣言行「最尊重女性之人所建」，配色 token 化
- commit: 53ab43f [refactor](德塔): 社区站视觉体系统一

---

## 2026-06-29
- [新增] `AppFooter.vue` - 通用页脚组件
- commit: 未提交

---

> 以下为断档补全（基于 git 历史，正序追加）

## 2026-07-05
- [新增] `WordCloud.vue` - 群聊词云组件（wordcloud2.js 螺旋布局，55.8 万条记录高频词）
- [修改] `ProfileDialog.vue` - 莫兰迪化：硬编码颜色替换为 --md-* 设计令牌
- [修改] `UserAvatar.vue` - 莫兰迪化：下拉菜单配色替换为 --md-* 设计令牌
- commit: 5d06f5e feat: 群聊词云 + 莫兰迪视觉体系

---

## 2026-07-20
- [新增] `VersionHistoryDialog.vue` - 版本历史弹窗（Transition 动画 + 动态增删版本记录，admin 可编辑）
- commit: 6d8ce17 [feat](首页): 版本公告系统 R-004

---

## 2026-07-22
- [修改] `ProfileDialog.vue` - 新增形象 5 宫格选择器（skinId 角色 P4 角色创建）
- commit: c6306d3 [feat](德塔): P4 角色创建系统

---

## 2026-07-23
- [新增] `TopBar.vue` - 公共顶部导航组件，统一三页（男德通/师德墙/管理后台）导航
- commit: 71da456 [refactor](导航): 抽取公共TopBar组件

---

## 2026-07-24
- [新增] `NdeSettingsDialog.vue` - 德塔 HUD 角色面板设置弹窗（R-010 五栏布局）
- [修改] `ProfileDialog.vue` - 清理角色面板相关逻辑（迁移至 NdeSettingsDialog）
- [修改] `TopBar.vue` - 新增下拉菜单
- [修改] `UserAvatar.vue` - 配套调整
- commit: f0e0733 R-010 HUD五栏布局重构+角色面板弹窗
