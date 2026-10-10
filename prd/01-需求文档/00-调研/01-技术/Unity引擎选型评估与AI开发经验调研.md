# Unity 引擎选型评估与 AI 开发经验调研

> 调研时间：2026-10-10
> 调研人：AI（白机）·子调研单路+主会话整理
> 背景：院长提出诺诺从 Web(three.js)转 Unity 单机客户端的意向（四点论据：exe 分发无所谓零门槛/性能用机主配置/可完全离线/练手学习新栈），本调研回答"Unity 是什么、AI 友好度、他人 Unity+AI 开发经验、现有资产可否平移"
> 关联文档：[世界模型技术版图与诺诺参考价值调研](世界模型技术版图与诺诺参考价值调研.md)（同日）

---

## 一、核心结论（先看这个）

1. **AI 写 Unity C#：可行且官方已下场**——Unity 官方发布 Claude Code/Codex/Grok 插件捆绑 Unity 工程技能，CLI 与 MCP Server **免费且无并发限制**（需 Unity 6+）；社区 26k star 的 Claude-Code-Game-Studios 提供 49 个游戏开发专用 agent。AI 写 MonoBehaviour/物理/UI 代码质量好。
2. **公认痛点=AI 不识场景/prefab 依赖**（Hades 项目实测：读 20 万 token 场景 YAML 仍漏 variant、方案会破坏 prefab）——解法成熟：**MCP Server 让 AI 直接管资产/场景/脚本**（CoplayDev/unity-mcp，14,802 stars）或官方 MCP。**对黑白机分工的意义：黑机装 Unity 跑 MCP Server，白机 AI 可远程操作编辑器——"白机不能开 Unity"的协作缺口有官方级解法**。
3. **现有资产迁移零障碍（五项中风险最低）**：UniVRM（v0.131.3，2026-10-02 发布，极活跃）支持 VRM 1.0/0.x/blendshape/**弹簧骨/.vrma 动画**——诺诺的 VRM、Krita 贴图（内嵌）、**连 Blender 导出的步态 .vrma 都原生可用**（原以为要改 FBX 导出，实测不需要）。
4. **本地离线 LLM 走 llama.cpp 绑定而非 Sentis**：LLMUnity（1,719 stars，llama.cpp 本地推理，PC/移动/VR，RAG+函数调用）是主流；Unity Sentis 已更名 Inference Engine（UPM 2.6.1 稳定），跑 transformer LLM 非主流路线。**完全离线单机可行**。
5. **近乎定制的现成参考：ChatdollKit**（1,232 stars，2026-09 活跃）——VRM 语音对话 SDK：口型/表情/动作自动同步+STT/TTS+多 LLM+**内置 AITuber（AI VTuber）模式**——与"诺诺虚拟直播间"的需求画像高度重合，Unity 版开发可基于它起步而非从零。

## 二、AI 写 Unity C# 的真实水平

- **可用性**：官方把 agent 编码当正统工作流（unity.com/ai：Claude Code/Codex/Grok 官方插件）；MonoBehaviour/物理/UI 脚本 AI 生成质量好（模式高度套路化）。
- **结构性盲区（已确认，Hades 案例 https://github.com/TheArcForge/Hades）**：AI 读不到场景 YAML 里的对象依赖——分析改 `EnemyAI` 的影响时读 20 万 token 仍漏 3 个 variant、给出的方案会破坏 4 个 prefab。**对策=让 AI 拥有工程结构化访问能力（MCP）**。
- **社区工作流**：Claude-Code-Game-Studios（26k stars，https://github.com/Donchitos/Claude-Code-Game-Studios）49 个游戏开发专用 agent（含 unity-specialist）。

## 三、AI 操作 Unity 编辑器（黑白机协作的关键解法）

- **纯代码路径完全可行**：命令行 batchmode 可构建（https://docs.unity3d.com/Manual/EditorCommandLineArguments.html）；Editor Scripting 可场景搭建/组件配置/打包。
- **官方 AI 工具现状**：Muse 品牌退役→"Unity's AI tools"：编辑器内项目感知助手（操作 GameObject/组件）+ CLI + **MCP Server**；**CLI/MCP Server/官方插件免费无并发限制**（助手 Pro 订阅内含、Personal 试用后 $10/月——**注意：编辑器内助手 Pro 订阅撞成本红线，但 CLI/MCP 免费档足够**，需 Unity 6+）。（来源：https://unity.com/ai ）
- **第三方 unity-mcp**（CoplayDev，14,802 stars，周内活跃）：Claude 等 AI 直接管 Unity 资产/场景/脚本。（来源：https://github.com/CoplayDev/unity-mcp ）

## 四、LLM 驱动 Unity 角色的代表项目

- **LLMUnity**（1,719 stars）：llama.cpp 本地推理，PC/移动/VR，System Prompt+RAG+函数调用——**完全离线单机的现成件**。（https://github.com/undreamai/LLMUnity ）
- **ChatdollKit**（1,232 stars，2026-09 活跃）：VRM 语音对话 SDK——口型/表情/动作自动同步、STT/TTS、多 LLM、内置 AITuber 双人对聊。（https://github.com/uezo/ChatdollKit ）
- Real-Agents（Unity 生成式 agent 规划框架，https://github.com/AkiKurisu/Real-Agents ）；Vtuber-Framework-Unity-and-Python（深度学习身体追踪/表情，https://github.com/HectorPulido/Vtuber-Framework-Unity-and-Python ）

## 五、端上推理与 VRM 支持

- **Sentis→Inference Engine**（UPM com.unity.ai.inference 2.6.1 稳定/3.2.1 preview）：ONNX opset 7~15、GPU/CPU、全平台 release；官方含 NLP 用例，但**未见官方 LLM 示例**，主流端上 LLM 走 llama.cpp（LLMUnity 选型佐证）——推断 Sentis 跑 transformer 性能不佳（分析推断，非实测）。
- **UniVRM**：v0.131.3（2026-10-02），3,392 stars；VRM 1.0/0.x/glTF 2.0/**VRM-Animation(.vrma)**；运行时+编辑器导入导出；要求 Unity 2022.3 LTS+；全平台。（https://github.com/vrm-c/UniVRM ）——**诺诺的 nonono_v7.vrm、blendshape、弹簧骨、blender_walk_gait.py 产出的 walk_loop.vrma 全部原生可用，无需改 FBX 导出**。

## 六、对诺诺迁移的建议

1. **工作流定型**：黑机 Unity+官方 MCP Server（或 unity-mcp）；白机 AI 经 MCP 远程操作编辑器+本地写 C#/配方——"白机无 Unity"的缺口由 MCP 闭合，双机均可驱动编辑器。
2. **成本**：Unity Personal 免费；CLI/MCP 免费档够用（编辑器内 AI 助手 Pro $10/月不必要）；LLMUnity+Ollama 本地推理免费——**全程零订阅，符合成本红线**。
3. **起步件**：Unity 6+URP+UniVRM（加载现有 v7 VRM 与 .vrma 步态）+ChatdollKit 参考其口型/动作同步架构+LLMUnity（离线模式）或 WebSocket 连现有大脑服务（在线模式）。
4. **风险登记**：AI 不识场景依赖（用 MCP+约定 prefab 单人负责制缓解）；两机 Unity 版本必须一致（Hub 锁版本入 README）；LFS 免费额度 1GB+1GB 月（定版入库制压增量，超限再议）。

---

## 来源汇总

### 一手来源
- Unity AI 官方 https://unity.com/ai ；命令行构建 https://docs.unity3d.com/Manual/EditorCommandLineArguments.html
- Hades 案例 https://github.com/TheArcForge/Hades ；Claude-Code-Game-Studios https://github.com/Donchitos/Claude-Code-Game-Studios ；unity-mcp https://github.com/CoplayDev/unity-mcp
- LLMUnity https://github.com/undreamai/LLMUnity ；ChatdollKit https://github.com/uezo/ChatdollKit ；Real-Agents https://github.com/AkiKurisu/Real-Agents
- UniVRM https://github.com/vrm-c/UniVRM ；three-vrm https://github.com/pixiv/three-vrm
- Sentis/Inference Engine https://docs.unity3d.com/Packages/com.unity.sentis@2.1/manual/index.html ；https://packages.unity.com/com.unity.ai.inference

### 二手来源
- 无重大二手依赖；全部结论 2026-10-10 实抓验证。
