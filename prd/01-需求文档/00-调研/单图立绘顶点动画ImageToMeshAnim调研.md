# 单图立绘顶点动画（ImageToMeshAnim）调研

> 调研时间：2026-08-17 16:47
> 调研人：AI（白机）
> 背景：院长点名阅读 GitHub 项目 windsmoon/ImageToMeshAnim 的「具体制作过程」。该项目用 AI + Mesh 顶点动画把单张静态立绘变成类 Live2D 循环动画，与德塔「Seedream 单张立绘 + 视觉小说」的美术管线高度相关，调研其制作流程与可移植性。
> 关联文档：`视频生成API调研.md`（Seedance）、`提示词工程调研.md`（图片+视频语义提示词）

---

## 一、核心结论（先看这个）

1. **该项目解决的是德塔同款痛点**：低成本游戏立绘是纯静态图，做 Spine/Live2D 太贵；AI 视频在游戏内播放麻烦、转序列帧体积爆炸。该方案用**顶点差值动画**（单 Mesh 单贴图）同时拿下内存、运行时开销、制作成本三项最低，适合「不追求高质量立绘动画」的项目——正是德塔的定位。

2. **制作过程的核心是四个环节**：①AI 生成规则网格基础 Mesh（必须用 Region 数据结构约束，否则 AI 会生成跨身体部位的长三角形边废 Mesh）→ ②AI 分析动作参考视频找真实循环区间，产出最多 13 个同拓扑姿态 Mesh（6 条硬性约束）→ ③编码器把姿态间 XY 顶点差值打包进 Mesh 通道（NORMAL/TANGENT/UV0.zw/UV1~4 共 12 组）→ ④顶点 Shader 按 `_AnimationProgress` 0~1 分段累加差值驱动循环。

3. **仓库本身只含"编码端"，不含"生成端"**：仓库核心代码仅 3 个文件（编码器窗口 350 行 + Shader 103 行 + Region 数据结构）约 460 行；AI 生成姿态 Mesh 的工具代码不在仓库里，靠 README 附带的完整 Agent 提示词由 AI 在用户工程中现场编写并保留复用。**想用该方案，主要工作量在"生成端"的一次性工具链搭建**。

4. **当前最大局限是无分层**：单张图变形时，衣服-皮肤、头发-身体交界处会互相带歪（肌肉扭曲/局部膨胀），只能要求 AI 在这些区域避免大幅变形；作者明言 AI 目前做不好切图分层，分层工作流待能力成熟后补。

5. **对德塔的适用性：技术路线可移植但需换渲染端**。演示是 Unity URP，德塔前端是 Phaser 4（底层 PixiJS/WebGL），顶点差值 + uniform 进度驱动的原理在 PixiJS Mesh + 自定义 shader 上同样成立；且该项目的工作流前半段（AI 立绘 + AI 动作参考视频）德塔已具备（Seedream 立绘 + seedance_client.py）。**建议作为 P3 备选技术储备，PoC 前置条件较多（见末章）**。

---

## 二、项目概述

- 仓库：https://github.com/windsmoon/ImageToMeshAnim（公开，中英双语文档，另有知乎版 Doc/Doc.md）
- 定位：基于 AI 和 Mesh 顶点动画制作类 Live2D 效果的低成本技术方案，Unity 演示工程
- 依赖：FFmpeg + OpenCV（Python 调用，供 AI 分析视频用）+ Unity 命令行环境
- 效果：单张立绘（无分层）制作的 Idle 循环动画（README 内 MaoNiang / Woman 两个示例 GIF/MP4）
- 仓库结构：`Doc/`（文档与示例媒体）+ `ImageToMeshAnim_Unity/Assets/ImageToMesh/`（Editor 工具 + Shader）+ 完整 Unity 工程配置，共 115 个文件

**问题空间对比**（来源：README 概述节，一手）：

| 方案 | 制作成本 | 内存/体积 | 运行时开销 | 效果上限 |
|------|---------|----------|-----------|---------|
| Spine / Live2D 手工 | 高（时间+金钱） | 低 | 低 | 高 |
| AI 视频直接播放 | 低 | - | 播放/管理麻烦 | 中高 |
| 视频转序列帧 | 低 | **大**（高清流畅序列帧一次性加载难接受） | 高 | 中高 |
| **本方案（顶点差值）** | **低** | **单 Mesh 单贴图** | **一个 Shader** | 低~中（idle 级微动） |

## 三、基本原理

与 Mesh 变形、Blend Shape 同族：通过改变顶点位置形成动画。

- 从单张图片生成 Mesh（AI 或人工）
- 准备一系列姿态 Mesh（同一初始 Mesh 变形而来，拓扑完全一致）
- 后一姿态顶点位置 − 前一姿态顶点位置 = 差值，写入 Mesh 的顶点通道
- 顶点 Shader 根据动画进度，把通道里的差值按权重累加到原始顶点位置上

因为是 2D 图，只记录 XY 位移，不依赖 Z 轴。

## 四、具体制作过程（重点）

### 4.1 生成基础 Mesh

**反面教材**：只对 AI 说"帮我把这张图片转成 Mesh"，会得到看似划分了身体部位、实则布满**超长三角形边**的废 Mesh——局部顶点一移动，远处顶点跟着动，全身动画都会怪。

**正确做法**（两件套）：

1. **先定义 Region 数据结构**（C#，仓库 `ImageMeshRegionConfig.cs` 同款），让 AI 分析图片包含哪些身体部位，记录每个部位的顶点索引。这份区域索引表同时是后续生成姿态 Mesh 的稳定参照：

```csharp
[Serializable]
public sealed class Region
{
    [SerializeField] private string _regionName;
    [SerializeField] private int[] _vertexIndices;
    // ...
}
```

2. **明确拓扑要求**：顶点使用**规则网格**，相邻四点组成小矩形再拆成两个局部三角形；**禁止**跨网格、跨透明区域、跨身体部位的长三角形边。

**分区依据**：只看图片，AI 的部位划分不一定贴合目标动画；最好直接提供目标动画的视频或文字描述，分区结果更准。

### 4.2 生成姿态 Mesh（最多 13 个姿态）

动作来源：AI 根据立绘生成的参考视频（立绘本身也是 AI 生成——**与德塔 Seedream+Seedance 工作流完全同构**）。

流程：
1. AI 用 FFmpeg/OpenCV 分析视频，**找出真正的单次循环区间**（如 10 秒视频可能只是 2.5 秒动作重复 4 遍，把 10 秒当循环会导致每个关键帧位置错位）
2. 按动作变化选定初始姿态 + 最多 12 个后续关键姿态
3. 为每个关键姿态生成对应 Mesh，**最后一个姿态须能平滑过渡回初始姿态**以保证循环

**姿态 Mesh 的 6 条硬性约束**（违反任何一条即作废）：
1. 顶点数量完全一致
2. 顶点索引和排列顺序完全一致（每个索引在所有姿态中对应同一身体位置）
3. 三角形拓扑完全一致（不重新布线、不增删合并顶点）
4. UV0 的数量/索引/纹理对应关系一致
5. 相同对象坐标空间、原点、朝向、缩放（不许用 Transform 变化冒充顶点变形）
6. 只用 XY 位移，不依赖 Z 轴

⚠️ 编码工具**只自动校验顶点数量**这一条，其余全靠生成时自行保证。顶点数相同但顺序/拓扑变了，同索引指向不同身体位置，动画会撕裂、跳点、大面积错误变形。

### 4.3 计算顶点差值并编码进通道

每个姿态存的是**相对前一姿态**的 XY 差值。12 个后续姿态 = 12 组差值，通道分配：

```hlsl
float3 keyFrame1 : NORMAL;          // 姿态1（Normal 本职废弃）
float4 keyFrame2And3 : TANGENT;     // 姿态2 xy / 姿态3 zw
float4 uv0AndKeyFrame4 : TEXCOORD0; // xy 保留采样贴图，zw 存姿态4
float4 keyFrame5And6 : TEXCOORD1;   // 姿态5 xy / 姿态6 zw
float4 keyFrame7And8 : TEXCOORD2;
float4 keyFrame9And10 : TEXCOORD3;
float4 keyFrame11And12 : TEXCOORD4;
```

### 4.4 Shader 顶点动画（核心算法）

材质参数 `_AnimationProgress`（0~1）+ `_AnimationCount`（1~12）。进度乘 (N+1) 摊到 N+1 个等分区间，每段差值按 `saturate(keyFrameProgress - i)` 权重累加（0→1 过渡中，之前的姿态全权重、当前姿态部分权重、之后的零权重）：

```hlsl
float animationProgress = saturate(_AnimationProgress) * (_AnimationCount + 1.0);
float keyFrameProgress = min(animationProgress, _AnimationCount);
positionOS.xy += input.keyFrame1.xy * saturate(keyFrameProgress);
positionOS.xy += input.keyFrame2And3.xy * saturate(keyFrameProgress - 1.0);
// ... 依此类推到姿态12
float returnProgress = saturate(animationProgress - _AnimationCount);
positionOS.xy = lerp(positionOS.xy, input.positionOS.xy, returnProgress);  // 最后一段：从末姿态插值回初始姿态
```

**末段特殊处理**：从最后姿态回到初始姿态不再加差值，而是从累计位置 lerp 回原始顶点位置——省掉一份"回程姿态"的存储。

### 4.5 Unity 编辑器工具（仓库唯一成型的"编码端"）

`Tools > Mesh > Encode Vertex Key Frames`：初始姿态 Mesh 放 Start，1~12 个姿态 Mesh 按播放顺序放入列表 → `Generate Mesh Asset` 生成含动画数据的最终 Mesh → 建材质选 `ImageToMeshAnim/Vertex Delta` Shader、设贴图和 `_AnimationCount` → MeshFilter/MeshRenderer 挂上，用 Animation Clip 或脚本驱动 `_AnimationProgress` 0→1 循环播放。

### 4.6 AI Agent 提示词（生成端的关键资产）

README 提供完整可复制的中文/英文 Agent 提示词（替换尖括号占位符即用），要求 Agent：
1. 先检查工程结构、复用 `ImageMeshRegionConfig` 和现有目录
2. 用 FFmpeg/OpenCV 识别真实单次循环区间，选初始姿态 + ≤12 关键姿态
3. 规则网格生成初始 Mesh，登记头部/头发/躯干/手臂/手/腿/服装/饰品各区域顶点索引
4. 后续姿态严格保持同顶点数/同索引序/同拓扑/同 UV0/同坐标空间/仅 XY
5. 注意衣服-皮肤、头发-身体、肢体交界的变形，避免露底/粘连/拉伸/膨胀/纹理撕裂
6. 逐项校验并汇报生成文件、参数、验证结果、剩余视觉限制；输入不足时明说原因，**不许靠改拓扑/顶点顺序规避问题**

首次执行时 Agent 需现场编写 Mesh 生成、姿态处理、数据校验、Unity 批处理等中间工具代码，耗时较长；**保留这些可复用工具代码**，后续做其他角色/动作会明显加速。

## 五、仓库代码核实（一手，已逐行读过）

| 文件 | 行数 | 职责 | 与 README 的一致性 |
|------|------|------|------------------|
| `Editor/MeshVertexDeltaEncoderWindow.cs` | 350 | EditorWindow + `EncodeToAsset` 静态编码：校验（仅顶点数）、逐帧算 XY 差值、按 NORMAL/TANGENT/UV0.zw/UV1~4 打包、合并包围盒、写资产 | ✅ 完全一致，通道分配、差值相对前一姿态均有代码注释佐证 |
| `Shader/VertexDeltaUnlit.shader` | 103 | URP Unlit 透明 Shader，`_AnimationCount`(1~12)/`_AnimationProgress`(0~1) 两个材质参数，顶点函数分段累加 + 末段 lerp 回初始 | ✅ 与 README 算法逐行一致 |
| `Editor/ImageMeshRegionConfig.cs` | - | Region（部位名 + 顶点索引）序列化配置 | ✅ 即 4.1 节数据结构 |

**核实发现的要点**（README 未明说、代码可证）：
- 编码器的唯一自动校验就是顶点数（`startPoseMesh.vertexCount != animationPoseMesh.vertexCount` 抛异常），README 所言"其余约束需自行保证"属实
- 输出 Mesh 的 bounds 会 Encapsulate 所有姿态的 bounds（防动画顶点被视锥剔除）
- 生成端（AI 分析视频、生成姿态 Mesh）确实**零代码入库**，全靠提示词驱动 Agent 现场写

## 六、局限与风险（来源：README 注意事项节 + 推断标注）

1. **无分层**【已确认】：单张图变形时衣服带歪皮肤、肌肉扭曲、局部膨胀；只能让 AI 在交界区域避免大幅变形 → **只适合 idle 级微动，不适合大幅度动作**
2. **AI 分层能力不足**【已确认，作者原话】：目前 AI 无法可靠完成切图分层，分层工作流"等能力成熟后补充" → 若强行分层，需要人工切图（成本回到 Live2D 路线）
3. **姿态 Mesh 生成成功率未知**【推测】：6 条硬性约束极严，AI 一次通过率无公开数据；作者也只演示了两个 idle 案例，未见大幅动作成功案例
4. **13 姿态上限**【已确认】：由通道容量决定（12 组 XY 差值 + 末段回程），更长/更复杂的动作需拆多段或多 Mesh

## 七、对项目的建议

**德塔现状对照**：德塔立绘 = Seedream 出图 + rembg 抠图 + 单张 PNG 前端展示（`public/`），前端 Phaser 4（PixiJS/WebGL 底座），黑机已有 Seedance 视频生成管线（seedance_client.py）。该项目工作流前半段（AI 立绘 → AI 动作参考视频）德塔已具备，缺的是后半段（姿态 Mesh 生成 + 编码 + 运行时 shader）。

**建议路径**（两案对比）：

| | 路径 A：技术储备登记，暂不动手（推荐） | 路径 B：立即 PoC |
|---|---|---|
| 内容 | 调研落档 + 需求池登记 P3，主线（第一章+R-042 裁决）优先 | 黑机做 PixiJS Mesh + 差值 shader 的 hello world（手工顶点位移，不调 AI API） |
| 业务价值 | 零成本锁定技术选项，立绘 idle 微动可作后续版本亮点 | 早暴露 Phaser 4 Mesh 能力边界 |
| 交付成本 | 0 | 黑机数小时级；若接 Seedance 生成动作视频则受红线约束（**必须院长确认提示词后才能调 API**） |

**推荐路径 A**，理由：
1. 德塔当前主线是第一章剧情落地 + R-042 抽象小剧场待裁决，立绘 idle 动画非当前痛点
2. 该方案效果上限低（idle 微动级），对视觉小说体验提升有限，优先级天然靠后
3. 若未来推进，技术落点是 **Phaser 4/PixiJS Mesh + 自定义 shader**（非 Unity）：
   - PixiJS Mesh 支持自定义 geometry/shader，顶点属性存差值、uniform 存进度的原理可直接平移
   - ⚠️ 前置验证点：Phaser 4 对多 UV 通道（UV0~4）自定义顶点属性的支持程度——若通道不够，可降级为多 Mesh 叠加（每姿态一个偏移纹理）或减姿态数（如只用 NORMAL+TANGENT 存 3 姿态）
4. ⚠️ 若 PoC 需 Seedance 生成动作参考视频，**必须先将提示词完整呈院长确认**（AGENTS 禁止事项第 5 条红线）

**若院长有意推进，登记需求池后的分步**：①黑机手工验证 PixiJS Mesh 差值动画可行性（纯本地、零 API）→ ②拿一张已入库立绘（如幸）+ 程序化正弦呼吸位移做端到端 demo → ③再评估是否引入 AI 姿态生成（涉及 API 调用，逐次过院长）。

---

## 来源汇总

### 一手来源（官方文档/源码/论文）
- [GitHub 仓库 windsmoon/ImageToMeshAnim（README + 全部源码，main 分支，2026-08-17 抓取）](https://github.com/windsmoon/ImageToMeshAnim)
- [MeshVertexDeltaEncoderWindow.cs（编码器源码，已逐行核实）](https://github.com/windsmoon/ImageToMeshAnim/blob/main/ImageToMeshAnim_Unity/Assets/ImageToMesh/Editor/MeshVertexDeltaEncoderWindow.cs)
- [VertexDeltaUnlit.shader（Shader 源码，已逐行核实）](https://github.com/windsmoon/ImageToMeshAnim/blob/main/ImageToMeshAnim_Unity/Assets/ImageToMesh/Shader/VertexDeltaUnlit.shader)

### 二手来源（媒体报道/社区讨论）
- 无（本次全部结论来自仓库一手材料，无需二手佐证；仓库内 Doc/Doc.md 为 README 同源文档）
