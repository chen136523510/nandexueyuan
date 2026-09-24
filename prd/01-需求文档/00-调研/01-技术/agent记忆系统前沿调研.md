# Agent 记忆系统前沿方案调研（2025-2026）

> 调研时间：2026-09-24（白机，子 Agent 执行+主 Agent 落档）
> 背景：诺诺记忆系统 v2 设计的前置专项——院长指示"记忆系统只是引子不是定版，调研更好的思路或我没考虑到的地方"。
> 用途：《自习室·记忆系统设计》的架构依据。关联：[记忆注入注意力分散调研](./记忆注入注意力分散调研.md)（姊妹篇）。

---

## 一、核心结论（先看这个）

1. **BM25 基线打平多数记忆系统**（GroupMemBench, arXiv:2605.14498）：最强记忆系统在群聊记忆基准上平均仅 46.0%，简单 BM25 持平或超过大多数——**SQLite FTS5 就是合格主力检索，不需要向量库服务**（本项目零新依赖路线被学术界背书）。
2. **多用户共享 agent 是 2026 小热点且问题远未解决**：AIM（arXiv:2609.12320）严格记忆操作准确率仅 58.8%；AFA（2604.25022）命名了 **persona confusion**（"一个居民的偏好泄漏进另一个的回复"）——隔离必须做在**检索层（索引级 WHERE scope 过滤）**，不能靠嘱咐 LLM。
3. **群聊记忆的命门是说话者结构**（GroupMemBench 三维度）：群组动态（非多个一对一拼接）/说话者锚定（谁说过什么）/面向受众的语言适应——现有摄取流程把这些压缩掉了。**公共流摄取每条事实必须带 subject 和 reply_target**。
4. **时间线问题是纯向量检索的结构性盲区**（Zep/Graphiti, arXiv:2501.13956）："他以前喜欢 X 现在呢"需要 bi-temporal 时间有效期。**穷人版**：SQLite 两张表 + `t_valid`/`t_invalid` 两列即可获得时间推理能力；旧事实**标记失效永不删除**，新信息一致优先。
5. **覆盖式更新是主要故障源**（TrustMem 2606.25161 + Mem0 v3）：更新操作的三类错误（遗漏/破坏/幻觉）；Mem0 v3 干脆改 ADD-only+检索时消解。**patch 式增减要保守化**：LLM 只判矛盾（bool+理由），标失效不物理改写。
6. **写入时判重要性不可靠，使用频率才是固化信号**（MemSIF, arXiv:2608.01742）：dual-track——CoreFact（写入时只固化稳定 schema 内信息）+ ActiveFact（按需生成，"被多来源支撑且被反复查询"才晋升持久）——**hit_count 作为固化信号**，防一句闲聊变成终身认知。
7. **"传闻被固化成自信事实"是真实风险**（Manufactured Confidence, 2606.29279）：21 人社区"A 说的八卦被固化成诺诺的确信"需要 confidence 元数据+溯源。
8. **Letta sleep-time compute（已更名 dreaming）**（arXiv:2504.13171 + letta-code）：空闲时预计算可省 5x test-time 计算；新架构已把调度外置（官方推荐自建 cron）——**"诺诺睡觉"= node-cron 整理 agent 独占 patch 工具，对话中的诺诺只读记忆**；整理不止压缩还包括**预判明天话题预备上下文**。
9. **集体记忆必须挂在个体记忆之上**（Emergent Collective Memory, arXiv:2512.10166）：只有共享痕迹没有个体记忆时系统完全失效——公共记忆层（群像/梗）有效的前提是诺诺有自己的认知基础设施。
10. **Memobase 的 per-user profile 与本项目"用户存档"同构**：离线 buffer 批处理（攒 1024 tokens 或闲置 1 小时才 flush，固定 3 次 LLM 调用）——**热路径零 LLM 摄取**保实时性。

## 二、方案速览

| 方案 | 核心机制 | 对本项目的可借鉴点 |
|---|---|---|
| Zep/Graphiti（31.1k★） | 四层图+bi-temporal+边失效+episodes 溯源 | 数据模型全抄（SQLite 穷人版）；无 SQLite 后端不自建服务 |
| A-Mem（1.2k★） | Zettelkasten 自链接+memory evolution（新记忆回头改旧记忆的 context） | 主存档自组织 |
| MemU（14.4k★） | 已转型个人 wiki；SQLite+暴力余弦 | 暴力余弦在 20 人规模够用 |
| Memobase（2.9k★） | per-user Profile+事件时间线+离线 buffer 批处理 | 与用户存档同构；批处理保实时 |
| mem0 v3 | 单遍 ADD-only+三路融合检索+检索时时间推理 | 写入简单化检索做厚 |
| Letta dreaming | 双 agent：对话只读+整理 agent 独占编辑权 | "诺诺睡觉"的直接模板 |
| AIM/AFA/GroupMemBench | 私有/公共分类+索引级隔离+说话者锚定 | 检索层隔离设计 |

## 三、来源

一手：arXiv 2501.13956（Zep）/2502.12110（A-Mem）/2504.13171（sleep-time）/2609.12320（AIM）/2604.25022（AFA）/2605.14498（GroupMemBench）/2606.25161（TrustMem）/2608.01742（MemSIF）/2606.29279（Manufactured Confidence）/2512.10166（集体记忆）/2304.03442（Generative Agents）/2411.00114（Project Sid）；GitHub getzep/graphiti、agiresearch/A-mem、NevaMind-AI/memU、memodb-io/memobase、letta 官方博客与 letta-code README
自述未复核：Mem0 v3 与 Memobase 的 LOCOMO 数字；Character.AI 记忆机制（官方博客+二手）；Neuro-sama 架构未证实
