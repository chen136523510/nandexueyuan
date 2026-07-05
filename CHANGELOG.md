# Changelog

> 架构级改动记录，倒序排列。

---

## 2026-07-05 P3-P5:语义检索 + 对话 UI + 会话历史
- [新增] P3: `server/scripts/buildFtsIndex.js` — FTS5 trigram 索引构建(51万条,1.8s)
- [新增] P3: `chatController.js` handleSemantic — LLM 提取关键词 → FTS5 检索 Top-5 → LLM 生成(附引用)
- [新增] P4: `src/views/ChatView.vue` — GPT 式对话 UI(气泡 + 引用折叠 + 加载动画 + 推荐问题)
- [新增] P4: 路由 `/chat`(requiresAuth)
- [新增] P4: `public/chat-test.html` — 独立测评页
- [新增] P5: `server/src/middleware/rateLimit.js` — 限流中间件(10次/分钟)
- [新增] P5: 会话 CRUD(listSessions/getSession/deleteSession)+ askChat 持久化 ChatSession/ChatTurn
- [新增] P5: 会话路由 `GET/DELETE /chat/sessions`
- [修改] `src/api/chat.js` — 补充会话 API + askChat 支持 sessionId
- [修改] `src/views/ChatView.vue` — 多轮会话(sessionId 传递)
- commit: 未提交

---

## 2026-07-05 P2:意图分类 + 统计类问答
- [新增] `server/src/utils/llm.js` — LLM 客户端(火山引擎 ARK,fetch 调用,thinking disabled)
- [新增] `server/src/controllers/chatController.js` — 意图分类 + 统计 SQL 问答 + 闲聊
- [修改] `server/src/routes/api.js` — 注册 `POST /api/chat/ask`
- [修改] `src/api/chat.js` — 新增 askChat 方法
- [修改] `server/.env` / `.env.example` — VOLC_BASE_URL 改为 `/api/coding/v3`(编程端点,支持 GLM)
- 验证:"群里发言最多的人是谁" → 正确返回"我,108689 条"
- 修复:BigInt 序列化、GLM 5.2 推理模型 thinking 禁用、网络超时兜底
- commit: 未提交

---

## 2026-07-05 真实群聊数据导入
- [新增] `.trae/tool-WeChatMsg-master/export_chat.py` — 从微信 db 导出文本消息 CSV 脚本(protobuf 解析群聊发送者)
- [新增] `server/scripts/importChat.js` — 流式导入脚本(直接读文件,不走 HTTP,5000 条/批)
- 数据:51 万条文本消息(chat_export.csv, 37.6MB),跳过 134 条,批次 ID=2
- 证实:文本消息仅几十 MB,2G2核服务器完全胜任
- commit: 未提交

---

## 2026-07-05 P1:群聊数据导入管线
- [新增] `server/src/controllers/chatImportController.js` — CSV 上传 + 解析 + 归一化 + 去重 + 事务写入
- [新增] `src/api/chat.js` — 前端 API 模块(导入 + 批次列表)
- [修改] `server/src/routes/api.js` — 注册 `/admin/chat/import`、`/admin/chat/batches` 路由
- [修改] `server/prisma/schema.prisma` — 去掉 GroupMessage 唯一约束(SQLite 批量导入不支持 skipDuplicates)
- [新增] `server/prisma/migrations/20260705141607_drop_group_message_unique/migration.sql`
- 依赖:新增 multer 2.2.0、csv-parse 7.0.1
- 验证:测试 CSV 10 条全部导入成功,batchId=1
- commit: 未提交

---

## 2026-07-05 P0:AI 助手数据模型落地
- [新增] `server/prisma/schema.prisma` — 新增 GroupMessage / ImportBatch / ChatSession / ChatTurn 模型,User 加反向关系字段
- [新增] `server/prisma/migrations/20260705140936_add_chat_ai_models/migration.sql` — 建表迁移(含索引与唯一约束)
- [修改] `server/.env` / `.env.example` — 新增 AI 助手环境变量块(VOLC_API_KEY / VOLC_BASE_URL / VOLC_MODEL / VOLC_EMBED_MODEL / CHAT_RATE_LIMIT)
- 选型:Embedding 模型 doubao-embedding-text-240715(1024 维);对话模型 glm-latest;向量库 sqlite-vec(P3 阶段接入)
- commit: 未提交

---

## 2026-07-05 新增 AI 助手 PRD
- [新增] `prd/03-功能模块/AI助手.md` — 群聊数据 AI 问答模块 PRD（业务契约 + MECE 边界 + 实施路径）
- [修改] `prd/README.md` — 文档索引新增 AI 助手条目
- 决策摘要：数据来源 WeChatMsg CSV；AI 方案 B+C 混合（统计类 SQL + 语义类 RAG）；向量库 sqlite-vec；LLM 火山引擎 glm-latest；权限全局共享；前端 GPT 式对话 UI；展示引用来源
- commit: 未提交

---

## 2026-07-01 新增用户认证系统
- [新增] `server/src/lib/` — Prisma Client 单例层
- [新增] `server/src/utils/` — 工具层（response/jwt/password/inviteCode）
- [新增] `server/prisma/` — Prisma schema + 迁移 + seed 脚本
- [修改] `server/src/controllers/` — 新增 auth/user/inviteCode/admin 四个控制器
- [修改] `server/src/middleware/` — 新增 auth 中间件，重构 errorHandler
- [修改] `server/src/routes/api.js` — 注册全部认证/用户/邀请码/成员管理路由
- [修改] `src/api/` — 重构 axios 拦截器，新增 auth/user API 模块
- [新增] `src/stores/auth.js` — 认证状态管理
- [新增] `src/views/` — LoginView/RegisterView/ProfileView
- [修改] `src/router/index.js` — 路由守卫（requiresAuth/guestOnly）
- commit: 未提交

---

## 2026-07-01 修复换设备依赖安装流程
- [修改] `.trae/rules/git-manage.md` — 换设备流程改用 `corepack enable pnpm`，移除对 gitignore 的 `package/` bundle 依赖
- [修改] `CONTRIBUTING.md` — 安装步骤同步改用 corepack，移除 pnpm bundle 说明
- commit: b4120f1

---

## 2026-07-01 优化协作指南
- [修改] `CONTRIBUTING.md` — 新增技术栈与项目结构说明；补充 Node 版本要求、Git 首次配置、SSH key/PAT 认证配置；合并重复的分支工作流章节；补充 commit scope 规范与 PR 描述模板；扩充常见问题（误提交大文件/commit 错分支/撤销提交）；修正跨平台命令（cp/copy）
- commit: 0825466

---

## 2026-07-01 引入 GitHub 托管 + 多人协作
- [新增] `CONTRIBUTING.md` — 协作开发指南（面向丘序明：环境搭建/分支工作流/提交规范/PR 流程）
- [修改] `.trae/rules/git-manage.md` — 中央仓库由服务器 bare 改为 GitHub；分支策略明确角色分工（陈梓键维护 master、丘序明 feature+PR）；部署/换设备流程改为从 GitHub 拉取
- commit: 5e3fdd3

---

## 2026-06-30 .trae 目录 gitignore + 部署规则强化
- [修改] `.gitignore` — 忽略 `.trae/*`（IDE 技能库等资源），例外保留 `.trae/rules/` 项目规则
- [新增] `.trae/rules/git-manage.md` — 纳入 git 跟踪；强化部署流程（部署前必须 commit+push）+ 补充功能分支合并规则
- commit: 未提交

---

## 2026-06-30 多媒体目录 + git 管理规则
- [新增] `public/media/` — 多媒体数据目录（avatars/posts/activities/temp）
- [新增] `.trae/rules/git-manage.md` — git 管理规则（开发流程/分支策略/提交规范/部署流程）
- [修改] `.gitignore` — 忽略 *.db 数据库文件 + public/media 实际文件（保留 .gitkeep）
- commit: 未提交

---

## 2026-06-29 PRD 文档库建立 + env 规范
- [新增] `prd/` — PRD 文档库（01-需求调研/02-技术架构/03-功能模块/04-接口契约）
- [删除] `需求调研.md` — 内容拆解至 prd/01-需求调研/ 各模块文档
- [新增] `.env.example` — 环境变量模板（提交 git）
- [新增] `.env` — 实际环境变量（不提交，含服务器/域名/JWT/数据库配置）
- commit: 未提交

---

## 2026-06-29 前后端项目结构规范化
- [新增] `src/api/` — 请求层（axios 实例 + 接口模块）
- [新增] `src/router/` — 路由层（Vue Router）
- [新增] `src/stores/` — 状态管理层（Pinia）
- [新增] `src/views/` — 页面视图层
- [新增] `src/components/` — 通用组件层
- [新增] `src/styles/` — 样式层（variables + base，替换原 styles.css）
- [删除] `src/styles.css` — 拆分为 styles/variables.css + styles/base.css
- [新增] `server/src/routes/` — 后端路由层
- [新增] `server/src/controllers/` — 后端控制器层
- [新增] `server/src/middleware/` — 后端中间件层
- [修改] `src/App.vue` — 精简为根布局（仅 router-view）
- [修改] `src/main.js` — 挂载 pinia + router
- commit: 未提交

---

## 2026-06-29 首页设计与脚手架修复
- [修改] `src/App.vue` — 重写为首页（hero + stats + features + footer）
- [新增] `src/styles.css` — 补全 main.js 引用缺失的样式文件（后已拆分）
- [新增] `server/` — 后端骨架（Express + cors）
- [新增] `pnpm-lock.yaml` / `pnpm-workspace.yaml` — pnpm 配置
- [修改] `.gitignore` — 忽略 pnpm standalone bundle
- commit: `fa58eaf`

---

## 2026-06-29 项目初始化
- [新增] 前端脚手架 — Vue 3 + Vite（index.html, App.vue, main.js, vite.config.js）
- [新增] `.gitignore` — 项目级忽略规则
- [服务器] 新建 bare 中央仓库 `/root/projects/www.nandexueyuan.top.git`
- commit: `27446e7` / `60c8416` / `1b1e203`
