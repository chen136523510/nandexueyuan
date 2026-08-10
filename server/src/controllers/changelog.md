# Controllers Changelog

> 倒序排列，最新在最上方。

---

## 2026-08-10（Phase2）
- [新增] `feedbackController.js` - 需求反馈 CRUD（listFeedback/createFeedback/deleteFeedback/updateStatus），复用师德墙权限模型
- [修改] `chatController.js` - askChat 加 personaId/customDesc 参数传给 orchestrate；加 AI 自动提交反馈（result.feedback 入库 source=ai）；加 feedback_created SSE 事件
- commit: ba91f1f [feat](男德通): AI优化Phase2第一批-人设切换+需求反馈页+AI提需求+黑机离线提示

---

## 2026-08-10
- [重构] `chatController.js` - 删除 ~340 行死代码（classifyIntent/handleStatistic/handleSemantic/handleChat/validateSql/looksLikeDataQuestion/buildContextMessages 7 个废弃函数），askChat 已改走 orchestrator 不再走旧版三分支
- [修改] `chatController.js` - SYSTEM_PERSONA 改为 import 统一 persona.js（原本地硬编码人设删除），移除未使用的 chatCompletion/resolveName/buildMemberKnowledge import
- [修改] `chatController.js` - askChat 加客户端断开检测（req.on('close') + CLIENT_ABORTED 中断流式输出），用户点停止生成时后端静默停止
- commit: d4a2fe5 [feat](男德通): AI优化Phase1-Markdown渲染+死代码清理+快速路由+FTS5增强+前端体验

---

## 2026-07-29
- [新增] `visualNovelController.js` - 视觉小说存档/进度 controller（getProgress/updateProgress/listSaves/getSave/writeSave/deleteSave）
- [重命名] `galgameController.js` -> `visualNovelController.js`（Galgame 全局重命名）
- [修改] `visualNovelController.js` - 增加 inventory 字段读写（GameProgress + GameSave）
- commit: 5cf0b32 + 44f5587 + 7643964

---

## 2026-07-01
- [新增] `authController.js` — 认证控制器（注册/登录/登出/获取当前用户）
- [新增] `userController.js` — 用户控制器（修改个人信息/修改密码）
- [新增] `inviteCodeController.js` — 邀请码控制器（生成/列表）
- [新增] `adminController.js` — 管理后台控制器（成员列表/禁用启用/重置密码/变更角色）
- commit: 未提交

---

## 2026-06-29
- [新增] `helloController.js` - hello 控制器，返回联通测试消息
- commit: 未提交

---

## 2026-07-05
- [新增] `chatController.js` - 男德通 AI 群聊助手（意图分类+SQL/FTS5 问答+会话历史）
- [新增] `chatImportController.js` - 群聊 CSV 导入控制器（上传解析+批次列表）
- commit: 739306d feat: 新增「男德通」AI群聊助手(意图分类+SQL/FTS5问答+对话UI+会话历史)

---

## 2026-07-07
- [修改] `chatController.js` - 群友人设+知识库+上下文记忆+语义检索修复
- commit: 399ee8f feat: 男德通全面优化 - 群友人设+知识库+上下文+语义检索修复

---

## 2026-07-13
- [修改] `chatController.js` - 语义检索分块提示词+流式输出+SSE 代理修复
- commit: a7cebac feat: 语义检索分块提示词+流式输出+SSE代理修复

---

## 2026-07-14
- [修改] `chatController.js` - 语义检索增加 LIKE 后备查询，解决 trigram 无法匹配 2 字词
- commit: 94f04b7 fix: 语义检索增加 LIKE 后备查询，解决 trigram 无法匹配 2 字词

---

## 2026-07-17
- [修改] `chatController.js` - 修复统计查询把毫秒时间戳当字符串切片导致误报「只有2022年7月数据」（BUG-22）
- commit: 9f4c48b [fix](男德通): 修复统计查询把毫秒时间戳当字符串切片，导致误报'只有2022年7月数据'（BUG-22）

---

## 2026-07-18
- [修改] `chatController.js` - 新增 NPC AI 对话接口 talkNpc（SSE 流式，德塔专属 persona）
- commit: 76fe825 [feat](P2): 后端 NPC AI 对话接口 + 德塔专属 persona

---

## 2026-07-20
- [修改] `chatController.js` - NPC 广播@提问者+身份感知+花名册注入
- commit: c391dc0 [feat](德塔): NPC 广播@提问者 + 身份感知 + 花名册注入 + sync-docs 技能

---

## 2026-07-20
- [修改] `announcementController.js` - 重构为版本公告系统（5 个 REST API：公告+版本 CRUD，向后兼容旧接口）
- commit: 6d8ce17 [feat](首页): 版本公告系统 R-004 - 版本管理+变更日志+未来规划

---

## 2026-07-21
- [修改] `chatController.js` - 多 Agent 协作检索架构（统计+语义并行检索），精简冗余逻辑
- commit: 956aad2 [feat](男德通): 多Agent协作检索架构 - 统计+语义并行检索

---

## 2026-07-22
- [修改] `authController.js` - publicUser 投影新增 skinId 字段
- [修改] `userController.js` - 新增 updateSkin（PUT /user/skin，形象 1-5 校验+持久化）
- commit: c6306d3 [feat](德塔): P4 角色创建系统 - skinId后端持久化+角色选择页

---

## 2026-07-23
- [新增] `wallController.js` - 男德墙模块（发帖/评论/点赞/删除，图文上传 multer）
- commit: 5698107 [feat](男德墙): R-008 男德墙模块完整实现

---

## 2026-07-23
- [修改] `announcementController.js` - 版本号格式校验（vx.y.z 三段式 semver，ADR-004）
- commit: 975d2c6 [feat](版本): R-007 版本号规则规范化 - ADR-004决策 + package.json校准 + 历史版本补录 + API semver校验
