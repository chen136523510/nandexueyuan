# Qwen3.8-27B 调研：模型核实与自部署可行性

> 调研时间：2026-08-20
> 调研人：AI（白机）
> 背景：院长听闻"Qwen3.8-27B 可以输出视频/图片，仅需 2 张 4090 就能部署"，考虑是否租 GPU 服务器或升级本服务器来自部署模型调用。需核实该说法真伪、给出对男德学院项目的选型建议。
> 关联文档：`视频生成API调研.md`、`MiniMax视频生成API使用指南.md`、`提示词工程调研-图片与视频生成.md`

---

## 一、核心结论（先看这个）

1. **Qwen3.8-27B 确实存在，2026-08-14 发布**（官方 GitHub `QwenLM/Qwen3.8` + HuggingFace `Qwen/Qwen3.8-27B` 双源确认）。名字真实，非谣传。

2. **"能输出视频/图片"是误传**。Qwen3.8-27B 是**视觉语言理解模型**（image-text-to-text），图片/视频只能作为**输入**给它"看"，它输出**只有文本**。HuggingFace model card 原文：*"a native vision-language model that understands images and videos"*，输出类型 `text-to-text`，无任何 diffusion/生成组件。把"支持视频输入理解"传成"能输出视频"属于以讹传讹。

3. **"2 张 4090 才能跑"也不准确，实际单卡 4090 即可**（4-bit 量化）。Unsloth 官方文档明确：Qwen3.8-27B 4-bit 量化版在 16-19GB 显存即可运行，**单张 RTX 4090（24GB）足够**，无需 2 张。BF16 全量加载需 ~55.6GB（约 2.5 张 4090 或 1 张 H100 80GB），但官方部署示例用 `--tensor-parallel-size 4`（4 卡）面向的是 BF16 高吞吐服务场景，非消费级自用的最低门槛。

4. **男德学院项目真正能"输出视频/图片"的开源替代是阿里 Wan2.2 系列**，且 Wan2.2-TI2V-5B 明确支持单卡 4090 跑 720P 视频生成（5 秒视频 < 9 分钟），这才是"4090 出视频"说法的合理归宿。

5. **对项目的建议**：不建议为 Qwen3.8-27B 自部署租 GPU 服务器。图片/视频**生成**仍走现有 Seedream/Seedance API；LLM 文本理解如想换开源模型自部署，Qwen3.8-27B 单卡 4090 可行但需评估是否有刚需。详见末章。

---

## 二、Qwen3.8 系列核实

### 2.1 模型确实存在（已确认）

| 核实项 | 结果 | 来源 |
|---|---|---|
| 官方仓库 | `QwenLM/Qwen3.8`（GitHub），描述 "Qwen3.8 is the large language model series developed by Qwen team, Alibaba Group" | GitHub API |
| 官方 model card | `Qwen/Qwen3.8-27B`（HuggingFace） | HF model card |
| 发布日期 | 2026-08-14 | README News |
| 同系列旗舰 | Qwen3.8-2.4T-A95B（2026-08-12 发布，超大 MoE） | README News |
| 迭代谱系 | Qwen3.5(2026-02) → Qwen3.6(2026-04) → Qwen3.8(2026-08) | README 引言 |
| 27B 参数量 | 27,781,427,952（BF16），文件总大小 ~55.6GB | HF model card |

引用原文（README）：
> "For the first time, Qwen3.8 brings a Qwen-Max-class model to open release."
> "2026-08-14: Qwen3.8-27B is now available on Hugging Face Hub and ModelScope."

### 2.2 多模态架构由来

Qwen3.5 起（2026-02-16 发布）该系列采用早期融合多模态架构：
> "Unified Vision-Language Foundation: Early fusion training on trillions of multimodal tokens achieves cross-generational parity with Qwen3 and outperforms Qwen3-VL models across reasoning, coding, agents, and visual understanding benchmarks."

**注意**："多模态"在此指**视觉理解**（看图/看视频→输出文本），**不等于**多模态生成（文本→出图/出视频）。这极可能是"能输出视频"误传的源头。

---

## 三、多模态能力：理解 ≠ 生成（关键澄清）

### 3.1 HuggingFace model card 原文依据

| 能力维度 | Qwen3.8-27B | 依据 |
|---|---|---|
| 图片输入（理解） | ✅ 支持 | `image-text-to-text` 标签 + 聊天模板含 `<\|image_pad\|>` |
| 视频输入（理解） | ✅ 支持 | 聊天模板含 `<\|video_pad\|>` + 独立视频 API 示例 |
| 图片输出（生成） | ❌ 不支持 | 输出类型 `text-to-text`，无生成组件 |
| 视频输出（生成） | ❌ 不支持 | 同上，无 diffusion/视频生成组件 |

model card 原文：
> "a native vision-language model that understands images and videos"

**结论**：Qwen3.8-27B 是"看图说话"型，不是"说话生图"型。把它当 Midjourney/Seedream/Wan 用是误解。

### 3.2 与项目现有能力对照

| 项目需求 | Qwen3.8-27B 能否满足 |
|---|---|
| 立绘/背景图生成（Seedream 现做） | ❌ 不能生成图 |
| CG 视频生成（Seedance 现做） | ❌ 不能生成视频 |
| 男德通 LLM 对话（火山引擎现做） | ✅ 可替代（它是 LLM） |
| 朋友圈图片视频内容理解 | ✅ 可做（视觉理解强项） |

---

## 四、硬件需求与 2×4090 可行性

### 4.1 Qwen3.8-27B 部署硬件

| 加载方式 | 显存需求 | 4090(24GB) 张数 | 来源 |
|---|---|---|---|
| BF16 全量 | ~55.6GB | 需 3 张（4090）或 1 张 H100 80GB | 文件大小推算（HF 无官方硬件表） |
| 4-bit 量化（Unsloth） | 16-19GB | **1 张 4090 足够** | Unsloth 官方文档原文 |
| 官方 vLLM/SGLang 示例 | 4 卡 TP | 4 张（面向高吞吐服务） | README 命令 `--tensor-parallel-size 4` |

Unsloth 原文：
> "Qwen3.8-27B 4-bit quants work on 16-19GB VRAM like RTX 5080, 4090 or a Mac with 24GB RAM."

**结论**："2 张 4090 才能跑"是高估。自用体验 4-bit 量化版，**1 张 4090 即可**；2 张 4090 只在需要 BF16 高吞吐服务时才有意义。

### 4.2 项目现有服务器

- 服务器：阿里云 ECS `47.96.158.104`（来源 `docs/account-passwords.md`）
- 配置：**无 GPU** 的普通应用服务器
- 结论："升级本服务器"不现实--阿里云 ECS 无法原地加 GPU，需换 GPU 实例或租独立 GPU 服务器

---

## 五、GPU 租用市场价格（AutoDL 实测 2026-08-20）

> 数据来源：院长登录态下浏览器实测 AutoDL 算力市场（autodl.com/market/list），抓取于 2026-08-20 11:01，为一手实时数据。会员另有 9.5 折/7.5 折。

| 卡型 | 显存 | 实测时租（CNY） | 库存（空闲/总量） | 备注 |
|---|---|---|---|---|
| RTX 4090 | 24GB | **￥1.88~2.08/时**（西北B区） | **0/1807（全租完）** | 市场紧张，需蹲守释放 |
| RTX 4090D | 24GB | ~同上量级 | 3/1032 | 4090 国行版，性能略低 |
| RTX 5090 | 32GB | **￥2.78/时** | 218/2024 | 库存充足，比 4090 便宜好租 |
| vGPU-48GB | 48GB | ￥1.68/时 | 162/960 | 虚拟化 48G，跑 LLM 量化版性价比高 |
| RTX PRO 6000 | 96GB | ￥5.98/时（7.5折） | 171/1571 | 单卡可跑 BF16 全量 27B |
| RTX 6000D | 84GB | ￥5.38/时 | - | 同上定位 |

**关键发现：RTX 5090（32GB）￥2.78/时 且库存充足，仅比 4090 贵 ~0.8 元/时，跑 Qwen3.8-27B 4-bit（16-19GB）绰绰有余还留 KV cache 余量，是目前自部署的更优选**（4090 全租完反而难租）。

### 5.1 粗算：自部署 Qwen3.8-27B（4-bit）月成本（按实测价）

- RTX 5090 全天开机：2.78 × 24 × 30 ≈ **2000 元/月**
- 按需开机（日均 4 小时）：2.78 × 4 × 30 ≈ **334 元/月**
- RTX 4090 按需（日均 4 小时）：~1.98 × 4 × 30 ≈ **238 元/月**（如能租到）

### 5.2 附带发现：AutoDL 托管 MiniMax H3 视频 API 低至 4 分/秒

页面顶部广告位：**「基于 ComfyUI 的 MiniMax H3 视频模型 API 已上线，价格低至 4 分钱/秒」（autodl.art/large-model/comfyui）**。

对照项目现用渠道（详见 `视频生成API调研.md`：MiniMax 官方 H3 API 768P 0.5 元/秒、2K 0.8 元/秒；Seedance 30 秒 53 元 ≈ 1.77 元/秒），AutoDL 托管价 **0.04 元/秒比官方 API 便宜一个数量级**（30 秒视频约 1.2 元 vs Seedance 53 元）。若后续 CG 视频量产，此渠道值得单独调研验证（画质/时长限制/角色一致性待确认）。

---

## 六、真正能"出视频"的 Wan2.2（顺带核实）

院长听到的"4090 出视频"更可能指向阿里 Wan2.2-TI2V-5B，而非 Qwen3.8。

| 模型 | 任务 | 4090 可跑 | 显存 | 速度 |
|---|---|---|---|---|
| Wan2.2-TI2V-5B | T2V + I2V（文生视频+图生视频） | ✅ 单卡 4090 | 24GB | 5 秒 720P 视频 < 9 分钟 |
| Wan2.2-T2V-A14B | 文生视频（MoE 27B/激活14B） | ❌ 单卡需 80GB | 80GB | 多卡：8×GPU |
| Wan2.2-I2V-A14B | 图生视频 | ❌ 单卡需 80GB | 80GB | 多卡：8×GPU |
| Wan2.2-S2V-14B | 语音驱动视频 | ❌ 单卡需 80GB | 80GB | - |
| Wan2.2-Animate-14B | 角色动画替换 | ❌ 需多卡 | - | - |

Wan2.2 README 原文：
> "can also run on consumer-grade graphics cards like 4090"（指 TI2V-5B）
> "This command can run on a GPU with at least 24GB VRAM (e.g, RTX 4090 GPU)."（TI2V-5B 推理命令）
> "TI2V-5B can generate a 5-second 720P video in under 9 minutes on a single consumer-grade GPU."

**注意**：Wan2.2-TI2V-5B 是 5B 稠密模型，生成质量弱于 A14B MoE 系列。且开源模型需自建提示词工程、无 API 托管，产出质量上限和调试成本远高于直接用 Seedance API。

---

## 七、对男德学院项目的建议

### 7.1 各场景选型建议

| 项目场景 | 现方案 | 是否换自部署 Qwen3.8/Wan2.2 | 理由 |
|---|---|---|---|
| 立绘/背景图生成 | Seedream API 0.3 元/张 | ❌ 不建议换 | Qwen3.8 不生成图；开源图模型(FLUX等)调试成本高，0.3元/张 API 已极便宜 |
| CG 视频生成 | Seedance API 53 元/30秒 | ⚠️ 可选 Wan2.2-TI2V-5B | 单卡 4090 可跑，但质量弱于 Seedance、无角色一致性保障、需自调提示词。仅当视频量大到 API 成本敏感时才值得 |
| 男德通 LLM 对话 | 火山引擎 glm | ✅ 可考虑 Qwen3.8-27B | 如需更强的视觉理解（看朋友圈图）+ 中文 LLM，单卡 4090 自部署可行。但需评估迁移成本与现有 API 费用对比 |
| 朋友圈图片/视频内容理解 | 火山引擎（弱） | ✅ Qwen3.8 强项 | 原生多模态视觉理解是它真正的卖点，这块确实优于纯文本 LLM |

### 7.2 综合建议

**不建议为"Qwen3.8 出视频图片"这个误传去租 GPU 服务器**--前提就是错的。

**如果真想自部署，分两种情况**：
1. **只为图/视频生成** → 别用 Qwen3.8（它不会生成），改看 Wan2.2-TI2V-5B（单卡 4090 可跑 720P 视频）。但产出质量和角色一致性远不如 Seedance API + 立绘参考图方案，调试成本高，项目当前 Seedance 方案已验证可用（丘vs睿 30 秒视频 53 元产出），**短期无 ROI**。
2. **为 LLM + 视觉理解**（男德通升级、朋友圈图片理解）→ Qwen3.8-27B 4-bit 单卡 4090 自部署**技术可行**。按实测 AutoDL 价格：按需开机（日均 4h）约 238~334 元/月，全天约 1440~2000 元/月（4090/5090 档）。但需评估：现有火山引擎 API 费用是否已高到此数？视觉理解是否有刚需场景？目前 handoff 未记录 LLM API 成本痛点，**建议先量化现有 API 月支出再决定**。另注：实测时 4090 全租完（0/1807），5090 库存充足且仅贵 0.8 元/时，实际选卡建议直接 5090。

### 7.3 下一步可选动作（待院长裁决）

- [ ] 若男德通 LLM 成本是痛点：拉取火山引擎 API 月账单，对比自部署 Qwen3.8-27B 成本（约 240-1440 元/月）
- [ ] 若朋友圈图片/视频内容理解是刚需：Qwen3.8-27B 的视觉理解能力值得 PoC（可先在本地 4090 跑 4-bit 量化版试）
- [ ] 若视频生成量大：评估 Wan2.2-TI2V-5B 替代 Seedance 的质量与成本，但需先出样片对比
- [ ] 禁止红线：任何 AI 生成 API 调用前，提示词和参数须院长确认（AGENTS 第 5 条）

---

## 来源汇总

### 一手来源（官方文档/源码/model card）

- [QwenLM/Qwen3.8 GitHub 仓库](https://github.com/QwenLM/Qwen3.8) -- 官方 README（发布信息、模型矩阵、部署命令）
- [Qwen/Qwen3.8-27B HuggingFace model card](https://huggingface.co/Qwen/Qwen3.8-27B) -- 参数量、文件大小、输入输出类型、视觉理解定位
- [Unsloth Qwen3.8 文档](https://unsloth.ai/docs/models/qwen3.8) -- 4-bit 量化显存需求 16-19GB、单卡 4090 可跑
- [Wan-Video/Wan2.2 GitHub 仓库](https://github.com/Wan-Video/Wan2.2) -- TI2V-5B 单卡 4090 跑 720P 视频、A14B 需 80GB
- [QwenLM/Qwen3 GitHub 仓库](https://github.com/QwenLM/Qwen3) -- 对照：Qwen3 纯文本系列，无 Qwen3.8/27B 型号（已废弃被 3.5+ 取代）
- [QwenLM/Qwen3-VL GitHub 仓库](https://github.com/QwenLM/Qwen3-VL) -- 对照：Qwen3-VL 视觉理解模型（2B/4B/8B/32B/30B-A3B/235B-A22B），无 27B，仅理解不生成

### 二手来源（搜索摘要/社区）

- Bing 搜索 "Qwen3.8 27B 视频生成 4090" -- 摘要未找到"能输出视频"的官方背书，该说法无一手来源支撑（**误传判定依据**）
- AutoDL 算力市场（autodl.com/market/list）-- 2026-08-20 11:01 院长登录态浏览器实测抓取（4090/5090/vGPU-48GB/PRO 6000 实时价格与库存），一手实时数据，价格随供需波动

### 未交叉验证项

- ~~GPU 租用价格区间~~ → 已于 2026-08-20 用 AutoDL 登录态实测回填（第五章），不再是经验估算
- AutoDL 托管 MiniMax H3「4 分/秒」仅为页面广告位文案，**画质/时长/角色一致性限制未验证**，若考虑采用需单独调研（autodl.art/large-model/comfyui）
