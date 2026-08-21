# Views Changelog

> 倒序排列，最新在最上方。

---

## 2026-08-21（白机·默认人设改 normal）
- [修改] `ChatView.vue` - currentPersona localStorage fallback 从 `'tiwei'` 改为 `'normal'`（与 persona.js 默认人设同步；已存过人设选择的用户不受影响，仅新用户/清缓存者默认 normal）
- commit: 见本轮

---

## 2026-08-20（白机·男德通多模态一期：图片上传 UI）
- [修改] `ChatView.vue` - 输入区多模态改造：🖼️ 图片按钮（aria-label="上传图片"，次级样式与主发送按钮区分）+ 隐藏 file input（accept jpeg/png/webp/gif，multiple）+ 待发送预览条（64px 缩略图 + × 删除，blob URL 用后 revoke）；ask() 先逐张 POST /chat/upload 得 URL 再发 /chat/ask 带 `images` 数组；有图无文字可发送（显示 [图片]）；用户消息气泡渲染图片缩略图（160px，历史会话恢复同渲染，selectSession 解析 images JSON）；agentIcons/agentLabels 新增「视觉识别: 👁️」分组；发送按钮 disabled 条件改为「无文字且无图」
- commit: 见本轮

---

## 2026-08-19（白机·岁月史书模块一期）
- [新增] `HistoryView.vue` - 岁月史书页面（/history）：TopBar + 工具栏（章节选择/自动布局/校验/导出文案）+ StoryEditor 画布区。章节加载镜像 visualNovelStore.CHAPTER_LOADERS（序章 157 节点/第一章 320 节点），统计徽标实时显示节点/连线数，dirty 状态「未导出」标记
- commit: 待提交 [feat](岁月史书): 剧情可视化编辑器一期（R-034）

---

## 2026-08-17（白机·星河问运势模块）
- [修改] `MainView.vue` - 大厅第三行改版：词云卡 12 列 -> 8 列，右侧新增 `FortuneCard`（4 列，星河问运势/星座）；1023px 断点两卡转全宽
- commit: 0bdb3a4 [feat](门户): 星河问运势模块（改名历程：观星台 -> 星河问签 5b2f674 -> 定名星河问 945f7a2，院长裁决）

---

## 2026-08-13（白机·移动端适配）
- [修改] `LoginView.vue` / `RegisterView.vue` - 修复窄屏溢出：auth-card 固定 380px 改 width:100%+max-width，页面加安全内边距
- [修改] `FeedbackView.vue` / `ChatView.vue` / `WallView.vue` - 100vh 布局改 100dvh（iOS 地址栏）+ `body.has-bottom-nav` 时让出底部导航高度（64px+安全区），反馈列表/聊天输入框/动态流不再被底栏遮住；新增移动端媒体查询（header 内边距、feedback-top 换行、filter-bar 换行）
- [修改] `AdminView.vue` - 移动端媒体查询（成员卡纵向堆叠+操作按钮换行+邀请码区换行）；邀请码卡片硬编码 #fff/#eee/#aaa 改 --md-* token（深色模式回归）
- [修改] `HomeView.vue` - 落地页主题开关加 iOS 安全区偏移
- commit: 待提交 [feat](德塔): 移动端适配

---

## 2026-08-13（白机·门户趣味化）
- [修改] `HomeView.vue` - 学院大门沉浸化：新增时辰问候语（登录后带昵称）；落地页主题开关悬浮按钮；彩蛋遮罩/弹窗文案 token 化（Hero 场景背景图+视差、功能卡立绘探出按院长要求删除——德塔内容仅限德塔内使用，网站不展示）
- [修改] `MainView.vue` - 大厅动效：统计数字入场 count-up 滚动；Top5 排行加头像（/man 6 位成员照片映射，其余首字色块兜底）+ 金银铜奖牌；示例提问改打字机轮播（光标闪烁）；公告未读红点 + 铃铛轻摇（localStorage 记录已读版本）；retry 按钮硬编码色 token 化
- [修改] `AdminView.vue` / `ProfileView.vue` - 深色模式回归：硬编码 #fff/#f5f5f5 改 --md-* token
- commit: 待提交 [feat](德塔): 门户趣味化

---

## 2026-08-10（Phase2）
- [新增] `FeedbackView.vue` - 需求反馈独立页面（表单+列表+状态筛选+admin状态管理+AI提交标记）
- [修改] `ChatView.vue` - sidebar 加人设选择器（4预设+自定义+localStorage）；SSE 处理 feedback_created 事件展示"已自动提交反馈"提示；warning 阶段高亮样式
- commit: ba91f1f [feat](男德通): AI优化Phase2第一批-人设切换+需求反馈页+AI提需求+黑机离线提示

---

## 2026-08-10
- [新增] `../utils/markdown.js` - Markdown 安全渲染封装（markdown-it + dompurify，禁 HTML/限链接协议）
- [修改] `ChatView.vue` - bot 回复改 Markdown 渲染（v-html + renderMarkdown），加完整 .markdown-body 样式（列表/表格/代码块/引用）
- [修改] `ChatView.vue` - 新增停止生成按钮（AbortController 中断 fetch）+ 复制回答按钮 + 移动端 sidebar overlay 抽屉式（窄屏默认收起 + resize 监听）
- commit: d4a2fe5 [feat](男德通): AI优化Phase1-Markdown渲染+死代码清理+快速路由+FTS5增强+前端体验

---

## 2026-08-03
- [重构] `HomeView.vue` - hero 居中三件套→左对齐 editorial，等高卡片网格→纵向非对称，icon 圆形→内联方形，全页 token 化
- [修改] `MainView.vue` - 公告标题 display 字体化
- [修改] `WallView.vue` - 标题 display 字体、卡片阴影 token 化、z-index 命名化、transition 指定属性、省略号 U+2026
- [修改] `ChatView.vue` - 深色 header→浅色统一、全页 Ant Design 蓝（#1677ff）→莫兰迪 token、多 Agent 配色体系统一、字体配对
- commit: 53ab43f [refactor](德塔): 社区站视觉体系统一

---

## 2026-07-29
- [新增] `NdeVisualNovelView.vue` - 视觉小说主视图（替换原 NdeRebuildingView 占位页）。挂载 8 组件 + InventoryPanel，快捷键 Space/Enter/H/S/L/Esc/B
- [重命名] `NdeGalgameView.vue` -> `NdeVisualNovelView.vue`（Galgame 全局重命名）
- commit: 5cf0b32 + 44f5587 + 7643964

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
