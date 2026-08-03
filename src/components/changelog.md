# Components Changelog

> 倒序排列，最新在最上方。

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
