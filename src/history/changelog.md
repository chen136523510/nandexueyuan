# History（岁月史书）Changelog

> 岁月史书模块专属 changelog。层定位：学院数据展示（R-043）+ 剧情可视化编辑器（R-034，搁置中）。
> 倒序排列，最新在最上方。

---

## 2026-08-19（白机·学院数据功能落地）

### [feat] 学院数据：模块使用频率 + 停留时间（R-043 首个功能）

**院长指示**：剧情编辑器太复杂先搁置，先做学院数据（各模块使用频率/停留时间）。

- [新增] `server/src/routes/analyticsRouter.js` - 埋点 API：POST /analytics/visit（enter 创建记录返回 visitId / leave 回填 leftAt+durationSec）；GET /analytics/summary?days=N（按模块聚合：访问次数/独立用户/平均停留/最近访问）。口径：<3s 误触不计停留；>2h 挂机截断 7200s；刷新/崩溃残留由 closeStaleVisits 兜底关闭
- [新增] `server/prisma/schema.prisma` - ModuleVisit 模型（userId/module/enteredAt/leftAt/durationSec + 双索引）。⚠️ 迁移走手动 CREATE TABLE（`npx prisma migrate dev` 会 reset dev.db 丢群聊数据，BUG-61 教训），client 已 regenerate
- [修改] `server/src/middleware/auth.js` - auth 支持 `?token=` query 补偿（sendBeacon 场景无法带 Authorization header）
- [新增] `src/composables/useModuleTracking.js` - 前端埋点：路由 afterEach 进入白名单模块报 enter（visitId 存 sessionStorage）、离开报 leave；beforeunload 用 sendBeacon 保底
- [新增] `src/api/analytics.js` - reportVisit/getAnalyticsSummary
- [修改] `src/main.js` - initModuleTracking(router) 全局挂载
- [新增] `src/components/history/AnalyticsPanel.vue` - 学院数据面板：时间范围选择（7/14/30/90/全部）+ 概要卡（总访问/活跃模块/范围）+ 使用频率条形图 + 平均停留条形图（模块分色，duration 格式化分秒，最近访问相对时间）
- [修改] `src/views/HistoryView.vue` - 双 tab 改造：学院数据（默认）+ 剧情编辑器（懒加载）；编辑器 tab 保留全部功能
- 验证：API 三端点 curl 实测全通（enter/leave/summary 聚合正确）+ Playwright 真实浏览链路（home 3s -> wall 2s -> history）数据正确入库上屏 + e2e 5/5 + a11y 0 违规 + build 通过
- 踩坑：①axios 拦截器已剥一层 response，组件取值是 `res.data` 不是 `res.data.data`（首次实测条形图 0 根由此发现，非推理）②`prisma migrate dev` 对漂移的 dev.db 会要求 reset（拒绝，改手动建表）③sendBeacon 不能带自定义 header，auth 中间件补 query token

---

## 2026-08-19（白机·一期 PoC 落地）

### [feat] 剧情可视化编辑器一期（R-034）

- [新增] `converter.js` - 转换层纯函数：`nodesToFlow()`（骨架+文案 -> Vue Flow nodes/edges，复刻 mergeScript 合并语义，choice/condition 多 Handle sourceHandle 映射）；`layoutWithDagre()`（LR 层次自动布局，dagre 参数注入保持纯 ESM）；`flowToScriptFile()`（画布 -> .script.js 格式化源码，控制字符全转义）；`flowToSkeletonJson()`；`validate()`（死链/id 重复/文案 id 双向匹配/choice 下标对齐四类检测）
- [新增] `components/history/StoryEditor.vue` - Vue Flow 画布：6 种节点类型自定义渲染（#node-xxx slot，分色+角标+概要），右侧属性面板（dialogue speaker/text/next 可编辑、choice 选项 text/impact/next 可编辑、condition/event/input/end 一期只读），校验结果面板
- [依赖] 新增 @vue-flow/core/@vue-flow/background/@vue-flow/controls/@vue-flow/minimap + @dagrejs/dagre（npm --legacy-peer-deps，存量 vue-router@5.1.0/vite@6 peer 冲突非本次引入）
- 验证：converter 往返测试 477 节点（157+320）零差异（.ai/scripts/test-converter.mjs，node 直跑）+ e2e history.spec.js 4/4 + lint:a11y 0 违规 + build 通过（HistoryView 懒加载 chunk 288KB gzip 95KB）
- 踩坑：①`@vue-flow/background` 无独立 CSS（exports 仅 "."），import 其 style.css 会 build 失败；②台词含换行符，jsString 转义必须覆盖 \n\r\t（往返测试抓到）；③dagre 布局 Q&A 循环边致节点重叠，e2e 点击需 DOM 派发 click 绕过遮挡；④项目 npm 装 vue-flow 系需 --legacy-peer-deps（存量 peer 冲突）
- 使用方式：导出的 .script.js 手动替换 `src/visualnovel/data/scripts/` 对应文件即生效（引擎零改动）

---
