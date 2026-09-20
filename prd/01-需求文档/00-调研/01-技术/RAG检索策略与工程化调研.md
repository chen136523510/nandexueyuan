# RAG 检索策略与工程化调研

> 调研时间：2026-08-15
> 调研人：AI（黑机）
> 背景：BUG-68 修复后的复查发现，男德通话题检索存在信息失真：FTS5 命中 5 个话题块共 505 条消息，但 `orchestrator.js` 只把前 30 条传给 LLM，后面 4 个块约 400 条消息完全没被利用（取头部 slice(0,30)）。院长质疑"只取 5 个块、且块内信息大量丢弃，岂不是会失真"。本调研回答：业界的检索策略（两阶段 rerank、层级检索、多路召回、MMR）有哪些成熟做法，各自解决什么失真，男德通该怎么借鉴。
> 调研结果用在哪：男德通 topicSearchAgent / orchestrator 分析阶段的改造决策（uphill，先方案后代码）。
> 关联文档：bug-log.md BUG-67（prompt 爆炸）/ BUG-68（LLM 全挂）/ handoff.md 黑机 2026-08-15 23:10

---

## 一、核心结论（先看这个）

1. **「检索取 top-k」本身不是失真，是必需**——业界共识是两阶段：第一阶段大范围召回（不漏），第二阶段精排压缩（排对）。真正的失真发生在男德通**两头的压缩都是"截断式"**：话题块 LIMIT 5 无相关性依据，消息 slice(0,30) 无代表性依据，丢什么全凭运气。
2. **业界标准解法是 rerank（精排）**：第一阶段召回 25 个候选，用打分器只留最相关的 3~5 个给 LLM。打分器可以是 cross-encoder（本地模型）或 LLM 打分（GLM/Cohere API）。关键思想：**"留哪些"要基于与问题的相关性判断，而不是位置顺序**（Pinecone 实测：排名 23 的相关文档经 rerank 升到第 1）。
3. **「块摘要 + 局部展开」是层级检索的标准形态**——LlamaIndex AutoMergingRetriever 的做法：小块（细粒度）检索命中，若某父块下的子块命中比例 ≥ 0.5 则整块合并上浮。男德通的「话题块（摘要索引）→ 块内消息（原文）」天然就是这个两级结构，差的只是展开策略。
4. **LLM 上下文有 U 形利用曲线（Lost in the Middle，Stanford TACL 2023）**：塞 505 条原文既超预算也会让中部信息被忽略。正确做法不是"全塞"而是"压缩"：每块给摘要 + 抽样代表消息，把预算花在刀刃上。
5. **SQLite FTS5 本身有被我们浪费的能力**：`bm25()` 支持**列权重**（keywords 列命中 1 次 = summary 列命中 5 次这种加权），rank 分数可做阈值过滤和调试。当前代码 `ORDER BY rank LIMIT 5` 没有利用列权重，也没看过分数分布。

---

## 二、问题定位：男德通当前链路的失真点

当前链路（`topicSearchAgent.js` + `orchestrator.js:126`）：

```
问题 -> 关键词扩展 -> FTS5 搜话题块索引(keywords+summary) -> LIMIT 5 个块
     -> 每块捞全部原始消息（505 条） -> slice(0,30) 传给 LLM -> 回答
```

| 环节 | 现状 | 失真风险 |
|------|------|---------|
| 话题块选取 | `ORDER BY rank LIMIT 5`，无分数检查 | 无关块挤占名额；相关但排第 6 的块被硬切 |
| 块内展开 | 每块**全量**捞消息 | 块大时浪费（505 条里 470 条注定被丢） |
| 传给 LLM | `messages.slice(0, 30)` 按顺序取头 | 只覆盖第 1 个块；后面块的关键信息（如"睿哥卸载博德3四五回"恰在第 3 块）会被漏掉 |

对照组：BUG-67 是相反方向的失败（18 万字符全塞导致时间错乱）。**两头都是失真：全塞会淹没，乱截会漏关键。** 工程上的正解是中间态：按相关性选取 + 按预算压缩。

---

## 三、业界检索策略盘点

### 3.1 两阶段检索 + Rerank（业界主流，Pinecone/Cohere 方案）

核心矛盾（Pinecone 官方论证）：
- 向量/关键词检索有信息损失，相关文档可能排在 top-k 之外 → 要大召回
- LLM 上下文有限，且**塞得越多召回率越低**（Lost in the Middle）→ 要精压缩
- 结论：**第一阶段大召回保证"不漏"，第二阶段 rerank 保证"排对"**

架构参数（Pinecone 实例）：召回 top_k=25 → rerank 到 top_n=3。

Cross-encoder 精排原理：查询+文档一起进完整 transformer 推理打分，比双塔（预计算向量）准得多但慢得多（"rerankers are slow, retrievers are fast"）。效果实证：原始排名 23、14 的相关文档经 rerank 后升至 1、2 位。

Cohere Rerank 生产参数：输入 query + documents 数组，返回按相关性排序的 index + relevance_score（0~1），官方示例 top_n=5。

> 对男德通的映射：我们没有 cross-encoder，但有 GLM。**用 LLM 给候选块打分**（每个块的 keywords+summary 拼起来让它按问题相关性排序/打分）就是"LLM rerank"，一次便宜的非流式调用可完成。这直接解决"LIMIT 5 无依据"和"30 条留哪块"两个失真点。

### 3.2 层级检索 / 自动合并（LlamaIndex AutoMergingRetriever，源码已核）

机制（源码确认，一手）：
- 文档构建为父子两层：大块（章节/话题）挂小块（段落/句子）
- 检索在**小块**上做（细粒度命中更准）
- 某父块下的子块命中比例 `len(命中的子块)/len(父块全部子块) ≥ simple_ratio_thresh（默认 0.5）` 时，**整块合并上浮**：子块删除，父块整体返回（父块得分 = 子块平均分）
- 解决的问题：命中碎片太碎没有上下文，但直接给大块又浪费预算——按命中密度自适应决定粒度

> 对男德通的映射：话题块（父）→ 块内消息（子）结构现成。可借鉴的思想是"**按命中密度决定展开多少**"：一个话题块里命中关键词的消息密度高 → 多传几条；密度低 → 只传摘要。比现在"全捞 505 条再 slice(0,30)"合理。

### 3.3 多路召回 + RRF 融合（Elasticsearch 官方，公式一手）

RRF 公式：`score(d) = Σ 1/(k + rank_i(d))`，k 默认 60。
- 只用**名次**不用原始分数 → BM25 分数、向量相似度量纲不同的问题天然规避
- 官方结论："RRF requires no tuning"，且实测相关性**优于任何单路检索**
- 典型组合：BM25（关键词）+ 向量（语义）

> 对男德通的映射：男德通已有两路雏形——FTS5（关键词）和 LIKE（模糊），但现在是**串联 fallback**（FTS 失败才 LIKE）。若未来加向量（VOLC_EMBED_MODEL 已在 .env 里占位 doubao-embedding-text-240715），RRF 是现成的融合公式：FTS5 名次和向量名次各算 1/(60+rank) 求和。**短期不急着上向量**，关键词+同义词扩展对群聊黑话的召回已经不错。

### 3.4 MMR 多样性选取（未找到一手来源，标注待验证）

（来源：LangChain 文档页附带的通用说明，非原文档章节，**未交叉验证**）

思想：top-k 检索常返回大量雷同结果（都是同一个话题的高相似变体）。MMR 迭代选取时同时考虑"与查询相关"和"与已选结果不重复"：`λ·sim(query, d) - (1-λ)·max sim(d, 已选)`，λ 越小越多样。

> 对男德通的映射：5 个话题块常出现"同一天同一话题被切成相邻块"的冗余（BUG-67 里 1,466 个块大量同质）。选取时若两个块 keywords 高度重合，留一个即可，名额让给不同时间段/不同角度的块。**简单版实现**：块间 keywords 词集 Jaccard 相似度 > 0.7 视为冗余。不需要向量。

### 3.5 LLM 上下文特性（Lost in the Middle，Stanford，arXiv 一手）

- 多文档问答中，相关信息在上下文**开头或结尾**时效果最好，**中部**显著变差（U 形曲线）
- 即使长上下文模型也不稳健，**加长上下文 ≠ 提升召回**
- 工程启示：① 传给 LLM 的资料要少而精；② 最关键的资料放开头/结尾；③ 不要指望"塞进去就等于看到了"

> 对男德通的映射：BUG-67（18 万字符时间错乱）正是该论文预言的失败模式。修复后的按月聚合（每月 8 块）本质就是"压缩后放置"，方向正确。

---

## 四、SQLite FTS5 被浪费的能力（官方文档一手）

当前 SQL：`ORDER BY rank LIMIT 5`。可改进点：

1. **列权重**：`bm25(表名, w1, w2...)` 按列加权。话题块 FTS 表有 keywords + summary 两列——keywords 是提炼过的主题词，summary 是流水摘要，**keywords 命中应比 summary 命中权重高**（如 `bm25(ft, 3.0, 1.0)`）
2. **rank 是负值**（FTS5 把 BM25 乘 -1 保证 ASC 排序时最相关在前），分数越小越相关。可先打印分布再定阈值，过滤"沾边但实际无关"的块
3. **调试语句**（官方建议）：`SELECT rowid, bm25(ft) AS score, snippet(ft,0,'[',']') FROM ft WHERE ft MATCH ? ORDER BY rank LIMIT 20` —— 先看分数分布再调参，别拍脑袋

---

## 五、对项目的建议（按性价比排序）

> 现状约束：SQLite 单机、无 embedding 服务在跑、黑机可做重计算、LLM 调用走火山（glm-5.2，token 单价低但推理模型消耗上升）。

### 方案 A：块内抽样 + 摘要混合（改动小，直接消灭 slice(0,30) 失真）★推荐先做

把"每块全捞 + slice(0,30)"改为"**每块给摘要 + 抽样消息，预算按块分配**"：
- 每块固定预算（如 10 条）：优先取**命中关键词的消息**（`content LIKE` 过滤）+ 头尾各 1 条定时间边界，不足再补顺序条
- 每块顶部加一行块摘要（keywords + chunkDate + 块内消息总数）
- 5 块 × 10 条 + 5 条摘要 ≈ 55 条信息量，覆盖全部 5 个块，prompt 体积反而比 505 条全捞更小且可控
- 依据：Lost in the Middle（少而精）+ AutoMergingRetriever（按块组织上下文）

### 方案 B：LLM rerank 候选块（消灭 LIMIT 5 无依据）★推荐与 A 同做

- FTS5 召回放宽到 15~20 个候选块（只取 id/keywords/summary，体积很小）
- 一次非流式 LLM 调用（temperature 0）：给 GLM 问题 + 候选块摘要列表，让它输出最相关的 3~5 个块 id（JSON）
- 用选出的块走方案 A 的展开
- 依据：Pinecone/Cohere 两阶段架构；LLM 打分 = 无需本地 cross-encoder 的 rerank
- 成本：每问多一次轻量 LLM 调用（prompt < 2k 字符），男德通量级（20 人朋友圈）完全可承受

### 方案 C：FTS5 列权重 + 阈值过滤（改一行 SQL 的事，顺手做）

- `ORDER BY bm25(message_chunks_fts, 3.0, 1.0) LIMIT 15`（keywords 权重 3 倍）
- 上线前用调试语句看分数分布，定一个"低于此分不要"的软阈值

### 方案 D：块间去重（简单 Jaccard，暂不需要 MMR 全套）

- 候选块两两算 keywords 词集 Jaccard，> 0.7 的合并留一个（保留分数高的）
- 防止同一天同一话题的相邻块占满 5 个名额

### 不建议现在做的

- **向量检索 + RRF 全家桶**：群聊黑话（外号、梗）embedding 效果存疑，且引入 embedding 管线（存向量、建索引、维护）的复杂度对 20 人产品不划算。关键词+同义词扩展+LLM rerank 已能覆盖。留作未来男德通升级时的方向，RRF 公式已备。
- **505 条全塞**：BUG-67 已证明是灾难，Lost in the Middle 论文也反对。

### 落地形态建议

方案 A+B+C+D 都在 `topicSearchAgent.js`（检索侧）+ `orchestrator.js:126`（分析侧）两个文件内完成，不动数据库 schema，不需要部署新服务。建议作为 R-039 登记需求池，按 uphill 做一版 PoC（先跑真实问题对比新旧答案质量）再合入。

---

## 六、验证与局限声明

- 已交叉验证：两阶段 rerank 架构（Pinecone + Cohere 两个独立一手来源一致）；Lost in the Middle（arXiv 原文摘要）；AutoMergingRetriever 机制（GitHub 源码直读）；RRF 公式与默认参数（Elasticsearch 官方文档）
- 未交叉验证：MMR 公式细节（当晚网络不稳，Wikipedia/CMU 原论文均超时，仅 LangChain 附带说明），已标注
- BM25 阈值的具体数值需拿真实数据分布调试（官方明确分数是相对值无绝对意义），本调研只给方法
- 调研环境备注：2026-08-15 晚国际网络不稳（sqlite.org/weaviate/milvus/anthropic 多次超时），SQLite FTS5 文档最终抓取成功

---

## 来源汇总

### 一手来源（官方文档/源码/论文）
- [SQLite FTS5 官方文档（rank/bm25/列权重）](https://www.sqlite.org/fts5.html)（2026-08-15 抓取）
- [Pinecone: Rerankers and Two-Stage Retrieval](https://www.pinecone.io/learn/series/rag/rerankers/)（2026-08-15）
- [Cohere Rerank 官方文档](https://docs.cohere.com/docs/rerank-overview)（2026-08-15）
- [LlamaIndex AutoMergingRetriever 源码（GitHub）](https://github.com/run-llama/llama_index/blob/main/llama-index-core/llama_index/core/retrievers/auto_merging_retriever.py)（raw 直读，2026-08-15）
- [Lost in the Middle (Liu et al., TACL 2023, arXiv:2307.03172)](https://arxiv.org/abs/2307.03172)（2026-08-15）
- [Elasticsearch RRF 官方文档](https://www.elastic.co/guide/en/elasticsearch/reference/current/rrf.html)（2026-08-15）

### 二手来源（社区/附带说明）
- LangChain MMR 说明（docs.langchain.com 概览页附带，**未交叉验证**）
