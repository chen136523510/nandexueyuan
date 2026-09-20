# Utils Changelog

> 倒序排列，最新在最上方。

---

## 2026-09-20（白机·调休日·LLM 双通道改造：DeepSeek 官方 + 火山 ARK）

- 背景：院长火山引擎 coding plan 订阅 2026-09-20 到期，实测 `ark.cn-beijing.volces.com/api/coding/v3` 返回 `InvalidSubscription: subscription has expired`（账户 2126889078），男德通主对话链路（本地+线上同端点）中断。院长裁决切 DeepSeek 官方 API，模型 ID `deepseek-flash`（DeepSeek-V4.1-Flash，官方文档确认自带图像理解，1M 上下文，OpenAI 兼容端点 https://api.deepseek.com）
- [新增] `llm.js` 双通道自动选择：配置了 `DEEPSEEK_API_KEY` → 走 DeepSeek 官方（`DEEPSEEK_BASE_URL` 默认 api.deepseek.com，`DEEPSEEK_MODEL` 默认 deepseek-flash，文本+视觉同模型）；未配置 → 原火山 ARK 行为完全不变（向后兼容，已回归验证 PROVIDER=volc/BASE_URL/MODEL 与改造前一致）
- [改造] `visionChatCompletion` DeepSeek 通道下视觉请求走主端点主模型（flash 自带识图），火山通道保持独立 doubao 标准端点；视觉调用补 thinking:disabled 不支持时的降级重试（此前硬编码 thinking 无兜底）
- [导出] `PROVIDER / BASE_URL / MODEL` 供探针与运维确认当前通道
- [改造] `probeModel.js` 头部显示当前通道（DeepSeek 官方/火山 ARK）+ 端点 + 模型；模型 ID override 同时写 DEEPSEEK_MODEL/VOLC_MODEL 兼容两通道
- [配置] 根 `.env.example` AI 段重写为「DeepSeek 官方（主）+ 火山（回退）」二选一说明
- 实测（零成本，用现有 ark key）：①ark key 对 api.deepseek.com 鉴权失败（必须官方 sk- key）；②ark key 对火山**标准按量端点 /api/v3 仍有效**，doubao-seed-2-0-mini 探针 4/4 全过（基础连通/thinking降级/JSON/流式，0.5-2s）——留作未拿到官方 key 前的应急路径
- 待办：院长提供官方 sk- key 后写入 server/.env（不入库）→ `node scripts/probeModel.js --vision <图URL>` 实测五项 → 全过后按部署纪律等院长指示上线（线上 .env 需同步加 DEEPSEEK_API_KEY 并重启 Express）
- commit: 见本轮

---

## 2026-09-10（黑机·主模型切 glm-5.3-flash + thinking 参数自动降级）

- [切换] `llm.js` - 主模型默认值 `deepseek-v4-flash-ga-260731` → `glm-5.3-flash`（院长指示统一火山引擎原生多模态模型）。同步 `server/.env` VOLC_MODEL=glm-5.3-flash + 根 `.env.example`
- [新增] `llm.js` 抽出 `buildRequestBody(messages, options, stream)` - 统一组装请求体（stream 标志 + thinking:disabled 附加），供 chatCompletion / chatCompletionStream 复用，消除两处重复的 body 构造
- [新增] `llm.js` `postChat(body, signal)` - 统一 POST `/chat/completions`，返回原始响应不做 ok 判定，便于调用方按需降级重试
- [修复] `llm.js` 能力差异参数降级（BUG-78）- `isThinkingUnsupported(err)` 识别「模型不支持 thinking:disabled」的 400（思考链/InvalidParameter|not supported）；`chatCompletion` 与 `chatCompletionStream` 命中时**摘掉 thinking 重试一次**并打印 warn。背景：glm 系不支持该参数，而 planner/feedback 无条件透传，换模型即断链（BUG-68 同因）。不删参数是为了保留 deepseek 上的省算力优化
- [验证] 探针实测：`glm-5.3-flash` 无 thinking 正常返回（1.9s）；带 thinking:disabled 经降级后成功（4.3s，warn 日志正常打印）。此前未降级版本直接 400 失败
- commit: 见本轮

---

## 2026-08-21（白机·男德通 AI 优化第二批：tokenizer + TEMPS + knowledge frequentPersons）

- [新增] `tokenizer.js` - 中文分词工具（FTS5 方案A）：≤4 字整词 + 长词 bigram 滑窗 + 非汉字小写保留；`tokenizeZh(text)` 索引侧分词、`buildFtsQuery(rawWords)` 查询侧构建 FTS5 表达式
- [新增] `llm.js` TEMPS - 温度常量集中导出（PLANNING=0 / ANALYSIS=0.5 / CHAT=0.7 / FEEDBACK=0 / NPC=0.8），各调用点引用
- [新增] `knowledge.js` frequentPersons - 圈外常谈人物列表（开开/周姐，身份待院长确认），buildMemberKnowledge 末尾注入
- [验证] prompt caching 实测：火山 coding 端点自动缓存 system prompt（cached_tokens=1024），无需代码改动

- commit: 见本轮

---

## 2026-08-21（白机·人设系统重构 + glm-5.3 切换 + 版本号动态化）

- [重构] `persona.js` - 人设系统三层重构：① BASE_TEMPLATE 中性化（删"老群友"默认身份，改为「男德学院网站的 AI 助手」中性表述，结构分【说话风格】/【话题边界】/【成员信息】/【网站信息】/【数据规则】五段，语气完全由各人设 style 块独立定义）② PERSONAS 顺序调整 normal 置首 + 各人设细则微调 ③ 默认人设 tiwei→normal（CHAT_PERSONA 与 getPersona fallback 均改）
- [切换] `llm.js` - 主模型 glm-5.2→glm-5.3（2026-08-21 实测：连通 3.9s/响应正常；thinking:disabled 仍被 400 拒绝（同 5.2 行为）；glm-latest 别名仍指向 glm-5.2 故弃用；不传 thinking/不设 max_tokens 策略不变）。同步根 `.env` VOLC_MODEL=glm-5.3
- [修复] `knowledge.js` buildSiteKnowledge - 版本号硬编码 v3.2.0 改为动态读根 package.json 的 version 字段（发版流程改 package.json 即自动同步，不再手动维护）；网站功能介绍同步更新（人设列表顺序 + 发图提问）
- [验证] 20 项单测全过；llm.js 端到端 glm-5.3 三场景实测通过（normal 人设闲聊 5.5s / 流式 / 规划 JSON 输出）
- commit: 见本轮

---

## 2026-08-20（白机 男德通多模态一期：视觉模型接入层）

- [新增] `llm.js` visionChatCompletion() - 视觉模型调用（图片理解，doubao-seed-2-0-mini-260428）：走标准按量计费端点（`VOLC_STD_BASE_URL`，默认 `https://ark.cn-beijing.volces.com/api/v3`，与 coding plan `/api/coding/v3` 不同通道），key 支持 `VOLC_VISION_API_KEY || VOLC_API_KEY`（2026-08-20 curl 实测同 key 可用），超时 60s，`thinking:{type:'disabled'}` 关闭思考链（实测比 `reasoning_effort:'minimal'` 更干净，后者仍输出 reasoning_content）；复用 makeLlmError（451 审核→CONTENT_MODERATION 上层话术）。现有 chatCompletion/chatCompletionStream 零改动（glm-5.2 coding plan 链路不受影响）
- commit: 82d2e33

---

## 2026-08-13（黑机 v3.2.1 昵称映射补全）

- [修改] `knowledge.js` - 补全 nickname 映射：`做题体孝子（暂时）`->丘序明 / `MICO`（大写）->陈梓键；确认 `0.o`->陈梓键 / `O.o`->饶志锐 / `优质单马/优质单男`->王乐添 / `失败的人生/🤡`->黄学远
- commit: d7229d6

---

## 2026-08-11（黑机 知识库升级 + LLM 回退）

- [新增] `knowledge.js` - `buildSiteKnowledge()` 网站六大功能信息注入 system prompt；补全 `0.o->陈梓键`、`O.o->饶志锐` 昵称映射
- [修改] `persona.js` - BASE_TEMPLATE 追加网站信息块（buildSiteKnowledge 注入）
- [回退] `llm.js` - 移除 DeepSeek 多通道，恢复纯火山引擎（`VOLC_*` 配置 + 无条件 `thinking: { type: 'disabled' }`）。院长要求不需要 LLM 多通道
- commit: 9659047 [feat](男德通): AI知识库四层升级+数据纯净重建+DeepSeek备用通道（DeepSeek 部分本轮已回退）

---

## 2026-08-10（Phase2）
- [修改] `persona.js` - 新增 PERSONAS 字典（4 套预设：体委/丘比/开开/正常人）+ getPersona(id,desc) 函数 + buildCustomPersona 自定义人设，BASE_TEMPLATE 模板复用成员知识库+数据规则
- commit: ba91f1f [feat](男德通): AI优化Phase2第一批-人设切换+需求反馈页+AI提需求+黑机离线提示

---

## 2026-08-10
- [新增] `persona.js` - 统一男德通群友人设 CHAT_PERSONA（群友风格+21人成员知识库注入+数据规则+Markdown格式提示），orchestrator 和 chatController 共用
- commit: d4a2fe5 [feat](男德通): AI优化Phase1-Markdown渲染+死代码清理+快速路由+FTS5增强+前端体验

---

## 2026-07-01
- [新增] `response.js` - 统一响应格式（success/fail）+ 错误码常量
- [新增] `jwt.js` - JWT 签发/校验工具
- [新增] `password.js` - bcrypt 密码哈希/比对工具
- [新增] `inviteCode.js` - 随机邀请码生成器（排除易混淆字符）
- commit: 未提交

---

## 2026-07-05
- [新增] `llm.js` - LLM 客户端封装（火山引擎方舟 ARK，OpenAI 兼容协议，fetch 调用）
- commit: 739306d feat: 新增「男德通」AI群聊助手(意图分类+SQL/FTS5问答+对话UI+会话历史)

---

## 2026-07-07
- [新增] `knowledge.js` - 知识库语义检索工具（向量化+检索）
- [修改] `llm.js` - 群友人设+知识库+上下文相关调整
- commit: 399ee8f feat: 男德通全面优化 - 群友人设+知识库+上下文+语义检索修复

---

## 2026-07-13
- [修改] `llm.js` - 语义检索分块提示词+流式输出支持
- commit: a7cebac feat: 语义检索分块提示词+流式输出+SSE代理修复

---

## 2026-07-21
- [修改] `llm.js` - LLM 超时从 60s 提升至 120s（分析阶段数据量大，修复思考太久+network error）
- commit: 1a9855b [fix](男德通): 修复思考太久+network error
