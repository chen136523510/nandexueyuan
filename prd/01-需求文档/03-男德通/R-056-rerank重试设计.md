# R-056 rerank 重试设计

> 版本：v1.0 | 日期：2026-09-15（白机）
> 状态：⛰️ uphill 设计落档，**未排期**（院长 2026-09-15 明确"可以做重试设计，但不是今天要处理的"）
> 关联：R-053 方案 B（LLM rerank，已落地）+ R-055 方案①（兜底放宽到前 8，已实施）
> 改动范围：`server/src/agents/topicSearchAgent.js` `rerankChunks` 函数（约 R-053 落地的代码段）
> 前置依赖：R-055 实施（commit `0859277`）已新增 `RERANK_FALLBACK_KEEP=8` 常量

---

## 1. 背景

R-053 方案 B 把 LLM rerank 接入话题检索主链路（commit `dcd993a`，2026-08-24），线上观察发现：

| 现象 | 来源 |
|------|------|
| `[TopicSearch] rerank 失败，降级取初排前 5` 日志出现 | 9-10 部署后核查（handoff） |
| 触发条件未定性 | 疑服务器出网调用波动或超时 |
| 影响 | 降级本身优雅（`ok=true` 仍有结果），但本可进榜的块丢失 |

院长 2026-09-15 裁决："可以做重试设计，降级是无奈之举"——区分"重试有意义"与"重试无意义"两类失败，前者重试优先，后者直接降级。

---

## 2. 现状（rerankChunks 函数当前行为）

`server/src/agents/topicSearchAgent.js` `rerankChunks(question, chunks)`：

1. 空 chunks 早返回
2. 构造 prompt（包含用户问题 + 候选块的 id/chunkDate/keywords）
3. 调 LLM `chatCompletion`：`temperature: 0 + thinking: 'disabled'`（确定性 JSON）
4. 解析返回 JSON 数组（id 列表）
5. 失败兜底：catch / 解析失败 / id 全幻觉 → `chunks.slice(0, RERANK_FALLBACK_KEEP)`（R-055 实施后为前 8）

**问题**：当前 catch 内仅打印错误并返回兜底结果，**没有重试**——偶发失败（429/5xx/网络抖动/JSON 解析失败/空返回）被直接降到兜底，浪费了一次可恢复的机会。

---

## 3. 目标

- **重试优先**：可恢复的失败（429/5xx/超时/解析失败/空返回）做指数退避重试 3 次
- **降级兜底**：重试仍失败 → 走 R-055 兜底（取前 8）
- **不重试白费**：输入侧审核 `CONTENT_MODERATION`（重试仍触发）与其他 4xx（参数错误）直接降级
- **观测**：PM2 日志区分 `[Rerank Retry]` vs `[Rerank Fallback]`，观察重试成功率决定下次调参

---

## 4. 错误分类矩阵

| 错误类型 | 识别方式 | 重试策略 | 原因 |
|---------|---------|---------|------|
| `429 Too Many Requests` | HTTP 状态 / err.message 含 '429' | ✅ 指数退避（1s/2s/4s）最多 3 次 | 限流类，重试可恢复 |
| `5xx`（500/502/503/504） | HTTP 状态 / err.message 含 '5' | ✅ 同 | 服务端偶发抖动 |
| 网络超时（`AbortError`/`ETIMEDOUT`/`fetch failed`） | 异常类型 | ✅ 同 | 出网调用偶发 |
| JSON 解析失败 | LLM 返回非 JSON（围栏/截断/模型异常） | ✅ 重试（每次 temp=0 重抽） | 重试可换一组 token |
| 空返回（content 长度 0） | `raw.length === 0` | ✅ 重试 | glm-5.x 已知偶发（BUG-77/78 同源） |
| **`CONTENT_MODERATION`** | err.message 含 'SensitiveContent' 或 ark 返回 code === 'SensitiveContentDetected' | ❌ **不重试，直接降级** | 输入侧审核，重试仍触发；R-055 兜底宽度 5→8 已在 commit `0859277` 落地 |
| **其他 4xx**（400 InvalidParameter 等） | HTTP 状态 | ❌ 不重试 | 参数错误，重试无意义 |

---

## 5. 重试策略

```
单次 rerank 真实耗时：1.3~1.6s（deepseek-v4-flash）/ glm-5.3-flash 1.9~4.3s（探针实测）
重试预算：3 次重试 + 指数退避（1s + 2s + 4s = 7s）≤ 总耗时 12~15s 可接受
RERANK_TRIGGER = 6：候选 > 6 才触发 rerank（≤6 跳过 rerank 直返回 RERANK_KEEP=5）
```

实现：
- 提取一个 `callRerankWithRetry(question, prompt)` 内部函数
- 循环 try-catch，按错误类型决定 continue 重试或 throw
- 计数器 `attempt`，日志打 `[Rerank Retry attempt=2/3 err.type=429]`
- 重试时复用同一 chunks（不变）+ 同一 prompt（不变；temp=0 + thinking=disabled 决定性）

---

## 6. 失败兜底

重试 3 次仍失败（含不重试类错误）→ 走 R-055 兜底：

```js
return chunks.slice(0, RERANK_FALLBACK_KEEP)  // commit 0859277 已落地 = 8
```

兜底宽度与 R-055 实施保持一致，**R-056 实施时不再修改兜底宽度**——本设计要点与 R-055 正交（一个管"该不该重试"，一个管"重试仍失败时兜多宽"）。

---

## 7. 与 R-053 / R-055 关联

| 项 | 关系 |
|---|------|
| R-053 方案 B | rerank 函数封装（rerankChunks），R-056 在其内增强 |
| R-055 方案① | 兜底宽度 5→8（已实施，commit `0859277`）；R-056 不再动宽度 |
| R-048 向量语义检索 | 未来若引入，rerank 阶段可改用 embedding 排序，R-056 的"重试"机制可复用 |

---

## 8. 实施步骤（待院长排期）

1. 在 `rerankChunks` 内提取 `callRerankWithRetry` 内部函数
2. 增加 `classifyError(err)` 工具函数：错误类型 → {retryable: bool, label: string}
3. 循环 try-catch，按分类决定 continue/throw
4. 日志区分：`[Rerank Retry attempt=2/3 label=429]` vs `[Rerank Fallback label=CONTENT_MODERATION]`
5. 单元测试（mock chatCompletion 抛各种错误）：重试次数、兜底触发、日志格式
6. 内存库端到端：20 个 chunk 强制 chatCompletion 抛 429 → 验证重试 3 次后兜底返回 8 块
7. **本地验证通过后**，部署由院长指示走 release-helper 发版流程

---

## 9. 验证方法

| 验证项 | 期望 |
|--------|------|
| mock 第一次 429 第二次成功 | 重试一次成功，attempt=2 |
| mock 三次都 429 | 三次重试后兜底返回前 8 |
| mock CONTENT_MODERATION | 不重试，直接兜底前 8 |
| mock JSON 解析失败 | 重试 temp=0 抽新 token，至多 3 次 |
| mock 5xx + 网络超时 | 退避后重试 |
| mock 4xx（参数错） | 不重试，直接兜底前 8 |
| 线上真调（部署后） | PM2 日志 `[Rerank Retry]` 出现频率、`[Rerank Fallback]` 是否仍高频 |

预期：**线上 rerank Fallback 频率下降 70%+**（基于偶发失败的多数为可恢复类型）。

---

## 10. 回滚方案

R-056 改造点单一（rerankChunks 内部），回滚 = 还原函数体即可，git revert 或手改。无 schema/索引变更，**回滚零副作用**。

---

## 11. 风险与权衡

| 风险 | 缓解 |
|------|------|
| 重试引入额外延迟（最多 ~12s） | 仅在候选 > RERANK_TRIGGER=6 时触发；小召回本就不走 rerank |
| 重试放大 token 成本（429/5xx 重试 3 次） | 失败是稀有事件（线上偶发）；与"丢榜"相比成本可接受 |
| 错误的错误分类导致重试无意义 | 优先实现 `classifyError` 单元测试，覆盖所有错误类型 |
| `CONTENT_MODERATION` 误判为可重试 | err.message 精确匹配关键字 `SensitiveContent` / ark code 匹配 |

---

## 12. 不做的事（明确边界）

- ❌ 不动 R-053 方案 B 的核心逻辑（temp=0 + thinking disabled + JSON 解析）
- ❌ 不动 R-055 已实施的兜底宽度（8 块）
- ❌ 不引入新依赖（不用 retry-axios 之类的库，纯手写循环）
- ❌ 不动 prompt 内容（重试时 prompt 不变）
- ❌ 不在 orchestrator 层加重试（只在 rerank 函数内部；orchestrator 不知道 rerank 失败细节）

---

## 13. 待院长裁决的设计参数

| 参数 | 建议值 | 备选 |
|------|--------|------|
| 最大重试次数 | 3 | 2（更保守） |
| 退避基数（秒） | 1, 2, 4（指数） | 固定 2s（更简单） |
| 是否对 `JSON parse error` 加重试温度微调 | 否（保持 temp=0） | 加 temp=0.1 增加多样性（牺牲 rerank 稳定性，不推荐） |

院长裁决建议值后即可进入 downhill 排期。