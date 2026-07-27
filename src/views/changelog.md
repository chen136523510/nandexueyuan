# Views Changelog

> 倒序排列，最新在最上方。

---

## 2026-07-16
- [新增] `GameView.vue` — F13 传送门交互：按 E 确认弹窗（是/否），确认后离开德塔返回主界面
- 原因：德塔出生点传送门交互需求，玩家需能离开德塔回到主界面

---

## 2026-06-30
- [修改] `HomeView.vue` — 重构首页：去掉功能卡片和按钮，改为 Hero + 两个预告卡片（数据看板/高光时刻）+ 右上角彩蛋（丘序明照片隐藏，点击弹出）
- commit: 未提交

---

## 2026-07-01
- [新增] `LoginView.vue` — 登录页（用户名+密码，登录后跳转 redirect 或首页）
- [新增] `RegisterView.vue` — 注册页（邀请码+用户名+密码，注册后自动登录）
- [新增] `ProfileView.vue` — 个人中心（信息编辑+修改密码+退出登录）
- commit: 未提交

---

## 2026-06-29
- [新增] `HomeView.vue` - 首页视图（从 App.vue 迁移，含 hero + stats + features）
- [新增] `AboutView.vue` - 关于页占位
- commit: 未提交

---

> 以下为断档补全（基于 git 历史，正序追加）
> 注：7-16 GameView 传送门条目已在上文记录，对应 commit d9621b3（7-17），不再重复

## 2026-07-05
- [修改] `HomeView.vue` - 莫兰迪视觉体系迁移（落地页浅绿渐变 + 点状纹理）
- [修改] `MainView.vue` - 莫兰迪化（词云 + 公告 + Lucide 图标）
- [修改] `LoginView.vue` - 莫兰迪化配色
- [修改] `RegisterView.vue` - 莫兰迪化配色
- commit: 5d06f5e feat: 群聊词云 + 莫兰迪视觉体系

---

## 2026-07-05
- [新增] `ChatView.vue` - 男德通 AI 群聊助手对话页（提问 + 会话历史 UI）
- [修改] `MainView.vue` - 新增男德通入口
- commit: 739306d feat: 新增「男德通」AI群聊助手

---

## 2026-07-07
- [修改] `ChatView.vue` - 男德通全面优化（群友人设 + 知识库 + 上下文 + 语义检索修复）
- commit: 399ee8f feat: 男德通全面优化

---

## 2026-07-13
- [修改] `ChatView.vue` - 接入语义检索分块提示词 + SSE 流式输出
- commit: a7cebac feat: 语义检索分块提示词+流式输出+SSE代理修复

---

## 2026-07-14
- [新增] `AdminView.vue` - 管理后台页（德塔 P0+P1 管理功能）
- [新增] `GameView.vue` - 德塔游戏页（地图/角色/HUD/多人同步）
- [修改] `MainView.vue` - 新增德塔入口
- commit: 7329e25 feat: 德塔P0+P1完成

---

## 2026-07-15
- [修改] `GameView.vue` - 修复聊天框空内容时 Enter/Esc/Tab 无法关闭
- commit: 73db13e fix: 聊天框空内容Enter/Esc/Tab无法关闭

---

## 2026-07-15
- [修改] `GameView.vue` - 修复聊天框显示所有人消息 + 时间戳前缀
- commit: fbbe785 fix: 聊天框显示所有人消息+时间戳前缀

---

## 2026-07-18
- [修改] `GameView.vue` - NPC 立绘弹窗 + SSE 流式对话（@ 前缀预填）
- commit: adee897 [feat](P2): NPC 立绘弹窗 + SSE 流式对话

---

## 2026-07-20
- [修改] `MainView.vue` - 版本公告系统 R-004 改造（版本徽章 + 摘要 + 版本历史按钮）
- commit: 6d8ce17 [feat](首页): 版本公告系统 R-004

---

## 2026-07-20
- [修改] `ChatView.vue` - NPC 思考状态 spinner 优化
- [修改] `GameView.vue` - 传送门交互修复
- commit: 6bf5e57 [fix](德塔): NPC思考状态spinner优化 + 传送门交互修复

---

## 2026-07-21
- [修改] `GameView.vue` - 玩家精灵四方向行走系统（HUD canvas 改 img 头像 + 5 套形象切换）
- commit: 779f593 [feat](德塔): 玩家精灵四方向行走系统

---

## 2026-07-21
- [修改] `ChatView.vue` - 多 Agent 协作检索架构（统计 + 语义并行检索）
- commit: 956aad2 [feat](男德通): 多Agent协作检索架构

---

## 2026-07-21
- [修改] `ChatView.vue` - 动态多 Agent 协作检索 v2（大 Agent 规划 + 全量检索 + 分析推理）
- commit: ed4fa8d [feat](男德通): 动态多Agent协作检索 v2

---

## 2026-07-22
- [新增] `CharacterView.vue` - 角色选择页（横向 5 卡片，上立绘下精灵，形象 A~E）
- commit: c6306d3 [feat](德塔): P4 角色创建系统

---

## 2026-07-23
- [修改] `CharacterView.vue` - 角色选择 4 项体验修复
- commit: 54079b5 [fix](德塔): 角色选择4项体验修复

---

## 2026-07-23
- [新增] `WallView.vue` - 男德墙模块（朋友圈风格卡片布局，发帖/评论/点赞/删除）
- [修改] `MainView.vue` - 新增男德墙导航入口
- commit: 5698107 [feat](男德墙): R-008 男德墙模块完整实现

---

## 2026-07-23
- [修改] `WallView.vue` - 男德墙改名为师德墙
- [修改] `MainView.vue` - 导航文案同步改名
- commit: f638751 [refactor](师德墙): 男德墙改名为师德墙

---

## 2026-07-23
- [修改] `WallView.vue` - 发帖后自动滚动到最左侧展示新动态
- commit: f60413e [fix](师德墙): 发帖后自动滚动到最左侧展示新动态

---

## 2026-07-23
- [修改] `AdminView.vue` - 抽取公共 TopBar 组件，修复页签左对齐及模块缺失
- [修改] `MainView.vue` - 移除内联导航，改用 TopBar 组件
- [修改] `WallView.vue` - 移除内联导航，改用 TopBar 组件
- commit: 71da456 [refactor](导航): 抽取公共TopBar组件统一三页导航

---

## 2026-07-23
- [修改] `WallView.vue` - 黑白机合并：师德墙 v2.0.0（merge 提交，合并立绘修复 + 师德墙重构）
- commit: 55fe5e0 [merge] 黑白机合并

---

## 2026-07-24
- [修改] `CharacterView.vue` - R-003 角色行走精灵表全量入库配套调整（5套×4方向×4帧）
- commit: 433ddb2 [feat](塔楼): R-003 角色行走精灵表全量入库

---

## 2026-07-24
- [修改] `GameView.vue` - R-010 HUD 五栏布局重构（角色面板弹窗接入 NdeSettingsDialog）
- commit: f0e0733 R-010 HUD五栏布局重构+角色面板弹窗

---

## 2026-07-27
- [修改] `GameView.vue` - R-009 德塔战斗系统阶段 1（追击型怪物 + 鼠标扇形攻击 + 血条实时绑定 + 大门按 E 开门通行 + 形象 set3/set4 方向修正）
- commit: 489e0e8 R-009 德塔战斗系统阶段1+大门开放+形象方向修正
