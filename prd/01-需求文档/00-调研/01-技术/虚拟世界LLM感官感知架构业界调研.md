# 虚拟世界 LLM 感官感知架构业界调研

> 调研时间：2026-10-09
> 调研人：AI（白机），三路并行子调研（业内产品/学术与记忆基建/民间开源）+ 主线交叉验证
> 背景：验证《[诺诺感官架构设计](../../07-自习室/诺诺感官架构设计.md)》（L1 状态快照/L2 事件流/L3 VLM 视觉）是否闭门造车——业界有没有同类产品与理念、成熟方案长什么样、我们的设计需要哪些修正。院长指令：不闭门造车，重点看最近一年。
> 关联文档：[诺诺感官架构设计](../../07-自习室/诺诺感官架构设计.md)（被验证对象）· [记忆系统设计](../../07-自习室/记忆系统设计.md)（事件消化终点）

---

## 一、核心结论（先看这个）

1. **三层设计全部有业界先例，方向正确，不是闭门造车**：商业中间件（Convai）的"感知"就是**结构化状态+事件+长期记忆三件套注入 prompt**——与我们的 L1+L2 同构；"VLM 读画面"在业界普遍是**可选层、按需触发、按帧计费的成本项**——与我们的 L3 后置定位一致。
2. **学术与开源主流路线 = "API 读状态 → 字段化文本/JSON → 模板注入"**（Generative Agents / Voyager / Mindcraft 四方一致，一手来源交叉印证）；纯视觉路线（DeepMind SIMA）存在但定位是"无游戏 API 时的通用接口"，可靠性已被 Claude Plays Pokémon 实证打脸（撞墙逃出 Mt. Moon 花 80 小时，工程师承认"still not particularly good at understanding what's on the screen"）。
3. **上下文防膨胀的成熟三板斧**（Mindcraft 源码实证）：条数裁剪+限长摘要（500 字符硬限）+ 全量历史落盘 + embedding 检索 top-k 注入——与我们"有界队列+消化进记忆"设计一致，可补"全量落盘"一件。
4. **新收获（我们原设计没有的）**：状态不只喂被动感知，还驱动**自主动作**（Voyager 自动课程/Mindcraft self_prompter 目标自设）——诺诺"30 分钟无内容打瞌睡/自己去看书"的 idle 自主行为，正该由 L1 快照+L2 事件触发，这是"大脑自主调用动作"缺的最后一环。
5. **给 L3 的增强弹药**：VisualWebArena 基准（ACL 2024）显示"视觉+结构化标注（Set-of-Mark）> 裸视觉"——将来诺诺"看"时，把物件名/状态直接标注在截图上再给 VLM，比裸截图读得准。
6. **市场动态佐证自研路线**：Inworld 2025 年已把游戏 NPC 产品线（含世界状态）退役转型语音 API——结构化感知中间件在商业上收缩，开源/自研是更稳的路（符合项目成本纪律）。

---

## 二、业界三层对照总表

| 我们的层 | 业界同类 | 先例 | 印证情况 |
|---|---|---|---|
| L1 状态快照 | Scene/Dynamic Context 结构化注入 | Convai Dynamic Context（商业）· Generative Agents 场景树渲染成文本（学术）· Voyager 结构化文本状态 · Mindcraft 模板占位符 | ✅ 强印证，主流路线 |
| L2 事件流+记忆固化 | 状态+事件批量注入→长期记忆抽取 | Convai（0.5s 批量/3s 上限节流+会话末事实抽取去重）· Generative Agents memory stream+reflection | ✅ 强印证；节流参数与固化机制可直接借鉴 |
| L3 VLM 视觉 | 按需视觉层 | Convai Vision（WebRTC 帧采样，官方明说按 image tokens 计费需控成本）· Mindcraft 截图+准星方块分析（支线）· Claude Plays Pokémon（实证反例）· SIMA（无 API 时的通用方案） | ✅ "按需+后置+成本红线"定位正确 |
| 上下文防膨胀 | 裁剪+摘要+落盘+检索 | Mindcraft 三板斧 · Letta 分层换页/MemFS · mem0 固化管线 | ✅ 印证，可补全量落盘 |
| （新）状态驱动自主行为 | self-prompting / 自动课程 | Voyager 自动生成下一任务 · Mindcraft self_prompter | ⚠️ 我们原设计缺失，建议补 |

---

## 三、业内商业产品（D1 维度）

- **Convai（官方文档，一手）**——与我们架构最接近的商业样本，感知=三层结构化注入：
  - *Scene Metadata*：把 Unity 场景对象注入角色上下文；
  - *Dynamic Context*：SDK 把"状态（键值行）+事件"拼成规范化文本，**0.5s 批量、3s 上限发送**，服务端重建 prompt——这就是 L1+L2 的商业实现，节流参数可直接参考；
  - *Long-term Memory*：会话结束时抽取事实、语义去重，下次按"用户×角色"注入——与 NonoMemory 固化思路同源；
  - *Vision*：WebRTC 视频流→后端滚动帧缓冲采样→帧挂到模型 turn（VLM 读渲染画面），官方明确"每帧按 image tokens 计费、需显式调参控成本"。
- **NVIDIA ACE（官方文档，一手）**：只定义语音/人脸链路（Riva ASR/TTS+NeMo LLM+Audio2Face），"游戏状态→LLM"无公开规范；其旗舰演示 Covert Protocol 的环境感知由 Inworld 引擎提供——**状态注入在合作方引擎内**，ACE 本身不含感知层。
- **Charisma（官方文档，一手）**：脚本约束式感知——Memories 五类（词/句/决策/计数/布尔）+Gates 按状态分支，LLM 仅在指定节点自由生成。与诺诺"自主个体"定位相反，不采用，但其"状态分类原语"可参考。
- **Inworld（官方文档+媒体，一手+二手）**：2025 年转型语音 API（TTS/STT/Realtime），**游戏 NPC 产品线（Character Studio/Goals/世界状态）已退役**，仅存跨会话长期记忆（外部存储再注入）。商业中间件在"感知"细分收缩。
- **Neuro-sama（二手，未交叉验证）**：Wikipedia 确认 LLM+TTS+Unity 头像、2018 年起源于 osu! AI；但弹幕注入与游戏感知机制**无一手公开技术文档**（Vedal 未公开），仅低可信博客称"CV 模型读游戏画面"——**不足为依据**，我们对她的架构只能存疑。

---

## 四、学术奠基与近一年进展（D2 维度）

- **Generative Agents（arXiv 2304.03442，一手）**——"虚拟世界 LLM 感知"的奠基作：
  - 环境输入：Smallville 场景以树结构存储，**递归展平渲染为自然语言文本**，观察即文本事件——L1 的学术原型；
  - 记忆流检索公式：recency（0.995/游戏小时指数衰减）× importance（LLM 按 1-10 打 poignancy 分，整理房间=2、约暗恋对象=8）× relevance（嵌入余弦），三项归一化加权——**可作 NonoMemory 事件固化权重的参照数值**；
  - reflection 触发：最近事件重要性之和 >150 时触发（约每日 2-3 次）——"消化"机制的量化先例。
- **近一年/近两年综述与大型实验（一手）**：Gallotta et al.《LLMs and Games: Survey and Roadmap》（arXiv 2402.18659，IEEE ToG 2024）为首个 LLM×游戏综述；Project Sid（arXiv 2411.00114）Minecraft 千级 agent 社会；2026-03 新综述《Memory for Autonomous LLM Agents》（arXiv 2603.07670）提出 write–manage–read 循环三维分类。
- **state vs vision 对比（一手数据）**：
  - **VisualWebArena**（arXiv 2401.13649，ACL 2024）：GPT-4 纯文本（accessibility tree）成功率 7.25%，GPT-4V 视觉 15.05%，**视觉+结构化标注（Set-of-Mark）16.37%**（人类 88.7%）——注意这是 Web 操作语境，不能直接套"视觉优于文本"；可迁移的结论是**画面叠加结构化标注优于裸画面**；
  - **SIMA**（arXiv 2404.10179，DeepMind）：纯像素+语言指令跨游戏通用——定位是"无特权 API 时的接口"，**我们有 API（three.js 场景图），不需要走这条路**；
  - **Claude Plays Pokémon**（Ars Technica 采访，二手较权威）：输入=模拟器截图+监听 RAM，工程师原话"Claude's still not particularly good at understanding what's on the screen"，逃出 Mt. Moon 花 78-80 小时、200k 上下文摘要丢失细节——**视觉通道可靠性与延迟的活体反例**，支撑我们"决策走状态不走视觉"。

---

## 五、民间开源项目与社区观点（D3 维度）

- **Open-LLM-VTuber（GitHub 一手，~14k star，活跃）**：开源 AI VTuber 头部项目，**没有"虚拟世界状态"层**——其视觉感知是摄像头/屏幕录制（面向用户环境而非虚拟世界 API），记忆为 Letta 系（曾标注"暂时移除、即将回归"），Agent 接口可插拔（Mem0/Hume 等）。说明：**开源 VTuber 生态普遍没解决虚拟世界感知**——我们做的这层在这个生态里是超前的。
- **Mindcraft（GitHub 源码，一手，5.9k star）**——Minecraft LLM agent，民间最完整的"世界状态→LLM"实现：
  - 状态：mineflayer 读世界→文本行填充 prompt 模板占位符（`$STATS`/`$INVENTORY`），另有六块结构化采集器（gameplay/action/surroundings/inventory/nearby/modes 的 JSON）；
  - 事件：聊天/死亡/行为日志（≤500 字符）以 system 消息进历史；
  - 防膨胀三板斧：超 `max_messages` 按 5 条切块→LLM 摘要（硬限 500 字符）→全量历史落盘；示例与技能按 embedding 检索 top-k 注入；
  - VLM 支线：截图+vision 模型+准星方块分析，文本回流对话——按需触发非轮询。
- **Voyager（arXiv+GitHub 一手，7.3k star）**：迭代提示=环境反馈+执行报错+自我验证全文本化；明确"不支持视觉感知"，依赖 Mineflayer 高层 API；**课程机制=根据当前状态自动生成下一任务**——状态驱动自主动作的先例。
- **社区观点（HN 二手评论）**：对 Voyager 的代表性批评"靠高层 API 而非像素，回避了感知难题"+支持观点"文本为高层推理提供构件，正如人类语言之于人"；Project Sid 讨论中确认"agent 只喂相关记忆子集而非全量历史"。
- **其他**：Amica（视觉仅限用户主动投图，无持续感知）；OpenAvatarChat（PerceptionAgent 处理摄像头，面向真人对话场景）——均无虚拟世界状态层。

---

## 六、记忆与上下文管理成熟方案（对应 L2 膨胀问题）

| 方案 | 机制要点 | 对诺诺的借鉴 |
|---|---|---|
| mem0（文档+论文 arXiv 2504.19413，一手） | `add`=LLM 抽事实→去重→嵌入→实体链接；`search`=语义/关键词/实体/时间四信号融合；论文称比全上下文 token 省 90%、p95 延迟降 91% | 与 NonoMemory 既有"mem0 式固化"同源 ✓；注意其更新为"增量不覆写"，矛盾事件纠错需显式 update（论文的自动 UPDATE/NOOP 决策细节未从一手确认，未交叉验证） |
| MemGPT→Letta（论文 arXiv 2310.08560+官方文档，一手） | OS 式分层换页→现行 git 版本化 MemFS：`system/` 文件常驻，其余按需读取；"dreaming"后台子代理在 compaction 时固化会话经验 | "dreaming"=离线固化的工程范式，诺诺打瞌睡时段正好可做记忆整理的叙事化包装 |
| Mindcraft（源码，一手） | 裁剪+限长摘要+落盘+检索 top-k | 防膨胀四件套的极简开源实现，参数量级可参考（摘要 500 字符级） |

---

## 七、对感官架构设计的印证与修订建议

**总体裁定：三层设计获业界全面印证，无需推倒；以下为增强修订**（已同步登记回[诺诺感官架构设计](../../07-自习室/诺诺感官架构设计.md)）：

1. **L1 增补节流参数**：参考 Convai 的 0.5s 批量/3s 上限——前端身体态上报采用同量级节流，避免高频洪水。
2. **L2 增补"全量落盘"**：事件出队前全量写入记忆库（哪怕未消化），Mindcraft 证明这是防丢失的廉价保险；消化/摘要只管上下文侧，落盘只管持久侧，两件事解耦。
3. **L3 增补"标注式视觉"**：将来诺诺"看"时，截图上叠加物件名/状态文字标注（Set-of-Mark 思路）再给 VLM——ACL 2024 数据支持标注优于裸图。
4. **新增"状态驱动自主行为"层**（原设计缺失，价值最大）：L1 快照+L2 事件不只喂被动感知，还是 idle 自主决策的触发器——"30 分钟无弹幕→打瞌睡/自己去看书"不需要等大脑集成，self-prompting 模式（Voyager/Mindcraft 先例）就是需求池原始设定的实现路径。建议归入大脑集成阶段设计，白机在快照适配器里预留 `onIdle` 事件位。
5. **Neuro-sama 路线不作为依据**：无一手技术文档，社区传言（CV 读画面）不可靠；我们以有文档的 Convai/Generative Agents/Mindcraft 为参照系。
6. **检视结论**：没有发现"该做而没做"的业界标配；唯一超出我们设计的方向是"视觉+结构化标注"与"dreaming 式离线固化"，均已列为增强项而非缺口。

---

## 来源汇总

### 一手来源（官方文档/论文/源码）
- Convai Dynamic Context / Vision / Long-term Memory 官方文档：docs.convai.com（…/dynamic-context/how-dynamic-context-works · …/vision/how-vision-works · …/long-term-memory/how-long-term-memory-works）
- NVIDIA ACE 文档（archive.docs.nvidia.com/ace/overview/latest）+ [ACE GA 官方博客](https://developer.nvidia.com/blog/build-lifelike-digital-humans-with-nvidia-ace-now-generally-available/)
- Charisma 官方文档（docs.charisma.ai/memories-gates）
- Inworld 长期记忆文档（docs.inworld.ai/realtime/usage/long-term-memory.md）
- Generative Agents：arXiv 2304.03442 · Voyager：arXiv 2305.16291 · VisualWebArena：arXiv 2401.13649 · SIMA：arXiv 2404.10179 + [DeepMind 博客](https://deepmind.google/discover/blog/sima-generalist-ai-agent-for-3d-virtual-environments/) · LLM×游戏综述：arXiv 2402.18659 · Project Sid：arXiv 2411.00114 · 记忆综述：arXiv 2603.07670 · MemGPT：arXiv 2310.08560 · mem0：arXiv 2504.19413 + docs.mem0.ai
- Letta 官方文档（docs.letta.com）
- Open-LLM-VTuber（github.com/Open-LLM-VTuber/Open-LLM-VTuber + docs.llmvtuber.com）· Mindcraft（github.com/kolbytn/mindcraft，src/models/prompter.js 等源码）· Amica（github.com/semperai/amica）· OpenAvatarChat（github.com/HumanAIGC-Engineering/OpenAvatarChat）

### 二手来源（媒体/社区）
- [Ars Technica：Why Anthropic's Claude still hasn't beaten Pokémon](https://arstechnica.com/ai/2025/03/why-anthropics-claude-still-hasnt-beaten-pokemon/)（工程师采访）
- [Wikipedia: Neuro-sama](https://en.wikipedia.org/wiki/Neuro-sama)
- HackerNews 讨论：Voyager 帖（36085936）、Project Sid 帖（42035319）

### 未交叉验证项（使用时注意）
- Neuro-sama 感知机制细节（无一手来源，社区传言存疑不引用）
- mem0 自动 UPDATE/DELETE/NOOP 决策管线细节（论文与官方文档表述不一致）
- Mindcraft full_state.js 是否接入默认 prompt 主路径
- Inworld 旧版游戏 NPC 文档原文（Wayback 持续 429，仅据现行文档判断产品线退役）
- 2025 年专门的"LLM agents in games"新综述未命中（最新为 IEEE ToG 2024 收录版）
