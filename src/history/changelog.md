# History（岁月史书）Changelog

> 岁月史书模块专属 changelog。层定位：剧情可视化编辑器（R-034）+ 学院数据展示（R-043，后续规划）。
> 倒序排列，最新在最上方。

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
