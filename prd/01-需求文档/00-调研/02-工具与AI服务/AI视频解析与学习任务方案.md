# AI 解析视频方案调研与视频学习任务设计

> 调研时间：2026-09-25
> 调研人：AI（黑机）
> 背景：院长指令——①调研"AI 解析视频"如何实现 ②若可学习，安排视频学习任务补充知识库。动机：VRoid/捏模优质教程多为视频（B站），此前调研因"AI 无法解析视频"卡住。
> 关联文档：[VRoid捏模参数手册](../04-美术/VRoid捏模参数手册.md)、[VRoid官方入门文档学习](../02-工具与AI服务/VRoid官方入门文档学习.md)

---

## 一、核心结论

1. **本会话已实测打通视频理解**：ZCode 的 Read 工具可直接读 MP4——4 秒测试视频返回逐秒采样帧，正确识别出 SMPTE 彩条、右上角帧计数器 0→3 递增、底部彩虹条滚动动画。**AI 解析视频在本机已可用，零新增成本**。
2. **原理与业界一致**：多模态模型原生视频输入 = 抽帧序列 + 音轨转写合并为输入 token。Gemini API 默认 **1fps 采样 + 音频独立转写**（与我们实测行为完全一致：4 秒→4 帧）；Qwen2.5-VL 采用动态帧率+绝对时间编码，支持小时级视频。
3. **教程视频解析的标准架构**（业界共识）：关键帧抽取（5~8 帧/场景）+ ASR 语音转写（Whisper）+ VLM 汇总成结构化笔记。
4. **黑机落地管线已具雏形**：imageio-ffmpeg（自带 ffmpeg 二进制）+ yt-dlp 已装好；缺 faster-whisper（音轨转写，二期装）。
5. **限制**：Read 视频有输入上限（长视频需切段）；1fps 对鼠标快速操作可能丢帧，必要时 ffmpeg 定点抽帧补充。

---

## 二、本机实测记录（2026-09-25 黑机）

| 步骤 | 命令/操作 | 结果 |
|---|---|---|
| ffmpeg 就位 | `pip install imageio-ffmpeg`（自带静态 ffmpeg 7.1 二进制，免管理员） | ✅ |
| 生成测试视频 | ffmpeg lavfi testsrc 4s 640×360 + 660Hz 正弦音 | ✅ testsrc.mp4 61KB |
| **AI 读视频** | Read 工具直读 testsrc.mp4 | ✅ 返回 4 帧采样（1fps），正确识别彩条图案/帧计数器递增/彩虹条滚动 |
| yt-dlp 就位 | `pip install yt-dlp` | ✅（B站下载待实测） |

测试产物：`E:\ai\video-learning\test\`（黑机本地，不入库）。

---

## 三、业界方案对比

| 路线 | 代表 | 原理 | 适用 |
|---|---|---|---|
| 多模态原生视频输入 | Gemini 1.5/2.x/3、Qwen2.5-VL | 1fps 或动态抽帧+音轨转写→token 序列 | 短中视频直接理解，最省事 |
| 关键帧+ASR 联合 | 开源工作流主流（ffmpeg+faster-whisper+VLM-7B） | 场景关键帧 5~8 张+语音转写→VLM 汇总 | **教程视频标准方案**，本地可跑 |
| 专用视频理解 API | TwelveLabs 等 | 视频专用 embedding+检索 | 视频库检索场景，本项目不需要 |

**对我们的选择**：路线 1（Read 直读）为一级管线——本会话已验证；路线 2（关键帧+Whisper）为二级增强——长视频/需要讲解词时启用。不引入付费 API。

---

## 四、视频学习任务设计（B站教程 → 知识库）

### 4.1 管线（一期，全部已就绪）

```
yt-dlp 下载B站视频（≤5分钟短片优先）
  → ffmpeg 查时长/按需切段（>10分钟切 5 分钟段）
  → Read 直读视频段（1fps 采样看操作）
  → AI 提炼：操作步骤/参数值/界面位置 → 结构化学习笔记落档 00-调研/
```

### 4.2 候选视频清单（前期调研已定位）

| 视频 | 平台 | 主题 |
|---|---|---|
| BV1g2e36gEdn | B站 | VRoid Studio 萌新教程（看一遍就会） |
| BV19L4y157aS | B站 | VRoid 从零开始二次元老婆/虚拟偶像全流程 |
| ac34391869 | AcFun | 纯新手向手把手捏 3D 小人 |

### 4.3 分期

- **一期（本轮已完成管线验证）**：短视频 Read 直读 → 学习笔记。下一步实际下载 1 个 B 站教程跑全流程。
- **二期**：`pip install faster-whisper`，4070 本地转写讲解词，与画面帧对齐（讲解是教程的主要信息载体）。
- **三期（可选）**：本地部署 Qwen2.5-VL-7B 做批量帧分析（Read 上下文不够长时）。
- **纪律**：B 站下载仅供内部学习，笔记落档时标注视频来源与 BV 号，不搬运视频本体入库。

### 4.4 与黑机工作范式的关系

本管线属范式 A 级（AI 亲手）：ffmpeg/yt-dlp/Read 均为脚本化可验证操作，产物（学习笔记）可交院长复核。建议后续沉淀为 `video-learning` 技能（对齐 image-gen/video-director 模式），待跑通 2~3 个视频后提取 SKILL.md。

---

## 来源汇总

### 一手来源（官方文档/实测）
- [Google AI for Developers - Video understanding](https://ai.google.dev)（Gemini 1fps 采样+音轨转写机制）
- [Google Cloud - Video understanding](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/capabilities/video-understanding)（FPS/裁剪/media_resolution 参数，2.5 系列质量更高）
- [Qwen 官方博客 - Qwen2.5-VL](https://qwenlm.github.io)（动态帧率+绝对时间编码+小时级视频）
- 本机实测（2026-09-25 黑机，见第二节）

### 二手来源（社区）
- [gemini-video-mcp-server](https://github.com/moe5445/gemini-video-mcp-server)（社区封装的 fps 调节参考）
- CSDN《AI视频理解：算法选型与后端服务设计》（2026-07-23，关键帧+ASR+VLM-7B 架构综述）
- 阿里云文档（Qwen2.5-VL 抽帧后按总 token 计费/计数，抽帧密度控制依据）
