# 德塔（NDO）ComfyUI 像素风生图工作流调研

> 调研日期：2026-07-16
> 调研目标：为黑机（RTX 4070 12GB）搭建完整的 ComfyUI 像素风生图工作流，覆盖 NPC 立绘、角色精灵表、瓦片三类资源，并评估本地部署 vs API 调用的适用性。
> 关联文档：`美术设计规范.md` §6 AI 生图工作流
> 关联 PRD：`MVP需求文档.md` §7.1 资源清单

---

## 一、硬件现状

| 维度 | 现状 |
|------|------|
| GPU | RTX 4070（12GB 显存） |
| 操作系统 | Windows |
| ComfyUI | 已部署，版本待确认 |
| SDXL 基础模型 | 已下载 |
| 像素风工作流 | **无**（待搭建） |
| 抠图方案 | **无**（待搭建） |

> 4070 12GB 跑 SDXL + LoRA + 抠图节点完全可行。SDXL 模型本身约 6.5GB 显存，加 LoRA + BiRefNet 抠图节点峰值约 9-10GB，12GB 余量充足。单张 512×512 出图约 15-30 秒（视采样步数）。

---

## 二、本地部署 vs API 调用

### 2.1 对比总览

| 维度 | 本地部署（RTX 4070 12GB） | API 调用（云端） |
|------|------|------|
| 启动成本 | 硬件已购，零额外成本 | 按量计费 |
| 单张成本 | 电费（≈0.4 元/小时满载） | 0.02-0.2 元/张（512×512） |
| 生成速度 | 15-30s/张（SDXL 20步） | 5-18s/张（受排队影响） |
| 并发能力 | 单卡串行，无并发限制 | 有速率限制（免费额度更低） |
| 模型灵活性 | 可自由切换 LoRA/ControlNet | 受服务商模型库限制 |
| 隐私 | 数据不出本地 | 图片上传至第三方 |
| 离线可用 | 是 | 否 |
| 迭代调参 | 即时调整提示词/参数 | 每次提交需等待 |
| 批量生成 | 需手动搭 Batch 节点 | 通常有批量 API |

### 2.2 本项目选用结论

**本地部署，明确不推荐 API。**

理由：

| 因素 | 分析 |
|------|------|
| 硬件已就位 | 4070 已购入，边际成本为零 |
| 生图总量小 | NPC 立绘 5 张 + 玩家精灵 20 套 + 瓦片 1 套 + 物品 10 个 = 一次性工程（约 50-100 张），不需要月度订阅 |
| 调参迭代 | 像素风对提示词敏感，需反复试 prompt 和 LoRA 权重，本地出图即时反馈远优于 API 提交-等待循环 |
| 模型定制 | 需 Pixel-Art-XL LoRA + SD_PixelArt_SpriteSheet_Generator 等特定模型，API 服务商不一定支持 |
| 离线需求 | 黑机部署在本地，网络不总是稳定 |

> 唯一例外：若未来需要大批量生成（如 100+ 套玩家外观），可考虑 API 做批量补充，但当前阶段不需要。

---

## 三、抠图方案选型

### 3.1 方案对比

项目现状：PRD 写了「ComfyUI Remove BG Node」，但黑机没有安装任何抠图节点。

截至 2026 年 7 月，ComfyUI 生态中可用的抠图方案如下：

| 方案 | 类型 | 精度 | 安装难度 | 推荐度 |
|------|------|:--:|:--:|:--:|
| **BiRefNet（内置）** | ComfyUI 原生节点 | 高（发丝级） | 零（内置） | **强烈推荐** |
| ComfyUI-Easy-Use RemBg | 自定义节点 | 中高 | 低（ComfyUI Manager） | 推荐 |
| comfyui_remove_background（rembg） | 自定义节点 | 中高 | 中（pip install） | 可选 |
| RemBG 独立 Python 脚本 | 独立工具 | 中高 | 中（额外工具链） | 不推荐 |

### 3.2 推荐方案：BiRefNet（ComfyUI 内置）

ComfyUI 从 2025 年某个版本起原生集成了 BiRefNet（Bilateral Reference Network），这是一个专门用于高质量背景移除的模型：

- **节点名**：`Remove Background (BiRefNet)`（子图内包含 `RemoveBackground` 节点）
- **输出**：RGBA 透明背景图像 + 前景遮罩
- **模型**：`birefnet.safetensors`（≈150MB），放入 `ComfyUI/models/background_removal/`
- **优势**：
  - 原生支持，无需安装任何自定义节点
  - 发丝、毛发、复杂边缘检测精度高
  - 对像素风硬边完全够用
  - 输出 RGBA，直接可存为透明 PNG
- **模型下载**：[HuggingFace - Comfy-Org/BiRefNet](https://huggingface.co/Comfy-Org/BiRefNet)

### 3.3 为什么不选 RemBG

| 对比维度 | BiRefNet（内置） | RemBG（独立库） |
|----------|------|------|
| 安装 | ComfyUI 内置 | 需额外 `pip install rembg` |
| 工作流集成 | 无缝，拖拽节点即可 | 需自己写脚本串联 |
| 维护 | 随 ComfyUI 更新 | 独立维护依赖 |
| 像素风效果 | 足够 | 足够（优势无法体现） |

结论：**BiRefNet 是最优解**，不需要 RemBG。PRD §6.3 中「ComfyUI Remove BG Node」的描述应更新为 BiRefNet。

---

## 四、工作流落地方案

### 4.1 场景贴图资源清单与抠图需求

#### 4.1.1 瓦片类（满铺，不需要抠图）

| 资源名称 | 规格 | 透明背景 | 命名 |
|----------|------|:--------:|------|
| 草地瓦片 | 32x32 px ≤16色 | 否 | `tile_grass_00.png` |
| 泥土瓦片 | 32x32 px ≤16色 | 否 | `tile_dirt_00.png` |
| 石墙瓦片 | 32x32 px ≤16色 | 否 | `tile_stone_wall_01.png` |
| 木板瓦片 | 32x32 px ≤16色 | 否 | `tile_wood_00.png` |
| 天空瓦片 | 32x32 px ≤16色 | 否 | `tile_sky_00.png` |

> 瓦片是满铺在地图上的矩形，不需要透明通道。直接保存为 PNG 即可。

#### 4.1.2 物件类（浮在地图上方，需要抠图）

| 资源名称 | 规格 | 透明背景 | 命名 |
|----------|------|:--------:|------|
| 树木 | 32x64 px ≤16色 | **是** | `tile_tree_00.png` |
| 云朵 | 64x24 px ≤16色 | **是** | `tile_cloud_00.png` |
| 大门 | 32x64 px ≤16色 | **是** | `tile_door_00.png` |

> 树木/云朵/大门是独立物件，浮在地图背景上方，边缘必须透明。

#### 4.1.3 物品类（需要抠图）

| 资源名称 | 规格 | 透明背景 | 命名 |
|----------|------|:--------:|------|
| 群公告牌 | 32x32 px ≤16色 | **是** | `item_board_notice.png` |
| 日程板 | 32x32 px ≤16色 | **是** | `item_schedule.png` |
| 打卡点 | 32x32 px ≤16色 | **是** | `item_checkin.png` |

> 物品浮在地图上，需要透明背景。

---

### 4.2 工作流一：场景贴图生成（像素风，单张出图）

**适用资源**：瓦片（草地/泥土/石墙/木板/天空）、物件（树木/云朵/大门）、物品（公告牌等）

**核心逻辑**：SDXL + Pixel-Art-XL LoRA 直出，瓦片类直接保存，物件类接 BiRefNet 抠图。

#### 4.2.1 节点链路

```
┌──────────────────────────────────────────────────────────────────┐
│  CheckpointLoaderSimple                                          │
│  加载模型：sd_xl_base_1.0.safetensors                            │
│  ├─ MODEL ── LoraLoader (pixel-art-xl, weight=0.8) ── MODEL     │
│  ├─ CLIP  ── LoraLoader (pixel-art-xl, weight=0.8) ── CLIP      │
│  │                                                               │
│  ├─ CLIPTextEncode (positive) ── CONDITIONING ──┐               │
│  ├─ CLIPTextEncode (negative) ── CONDITIONING ──┤               │
│  │                                               │               │
│  ├─ EmptyLatentImage ── LATENT ──┐              │               │
│  │                                │              │               │
│  │  ┌─────────── KSampler ───────┘              │               │
│  │  │  steps=20, cfg=5-7, sampler=dpmpp_2m,     │               │
│  │  │  scheduler=karras, denoise=1.0            │               │
│  │  │  width=512, height=512                    │               │
│  │  └── LATENT ── VAEDecode ── IMAGE            │               │
│  │                                                │               │
│  │  ┌─ 瓦片类（草地/泥土/石墙/木板/天空）──── 直接 SaveImage ──┐ │
│  │  │                                                           │ │
│  │  └─ 物件类（树木/云朵/大门/物品） ── BiRefNet ── SaveImage ──┘ │
│  └──────────────────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────────────┘
```

#### 4.2.2 提示词模板

**瓦片（草地）**：
```
正向：pixel art, grass ground tile, 32x32, SNES 16-bit style,
       seamless, tileable, no borders, flat shading,
       top-down view, warm green, game asset
负向：realistic, 3D, gradient, shadow, blur, HD, photo, grass blades
```

**瓦片（石墙）**：
```
正向：pixel art, stone wall tile, 32x32, SNES 16-bit style,
       medieval castle, gray stone bricks, seamless, tileable,
       no outline, flat shading, game asset
负向：realistic, 3D, gradient, shadow, blur, HD, photo, mortar lines
```

**物件（树木）**：
```
正向：pixel art, tree, 32x64, SNES 16-bit style, simple green canopy,
       brown trunk, game asset, transparent background, solid color
负向：realistic, 3D, gradient, shadow, blur, HD, photo, background
```

**物件（云朵）**：
```
正向：pixel art, cloud, 64x24, SNES 16-bit style, white, fluffy,
       simple shape, game asset, transparent background
负向：realistic, 3D, gradient, shadow, HD, photo, storm cloud
```

#### 4.2.3 参数建议

| 参数 | 瓦片类 | 物件类 | 说明 |
|------|:--:|:--:|------|
| LoRA 权重 | 0.8 | 0.8 | 强像素风 |
| CFG | 5 | 7 | 瓦片降 CFG 避免过度锐化 |
| Steps | 20 | 25 | |
| 分辨率 | 512×512 | 512×512 | 生成后裁剪到目标尺寸 |
| 抠图 | 不需要 | BiRefNet | 物件类必须接抠图节点 |

#### 4.2.4 操作流程

```
1. 修改提示词中的 [资源类型] 描述
2. 调整 KSampler 的 width/height 匹配目标尺寸
3. 跑 5-10 个种子，选最佳
4. 瓦片类：直接 SaveImage → 放入 public/game/tilesets/
5. 物件类：接 BiRefNet → SaveImage → 放入 public/game/sprites/ 对应目录
6. 在 PreloadScene.js 中将对应 key 改为 this.load.image() 加载
```

---

### 4.3 工作流二：角色精灵表生成（ControlNet OpenPose 完整方案）

**目标**：定制角色外观，生成四方向行走精灵表（每方向 4 帧，32×64 px，透明背景，≤16 色）。

**核心方案**：SDXL + Pixel-Art-XL LoRA + ControlNet OpenPose 约束姿势，逐帧生成保持角色一致性。

#### 4.3.1 需要额外下载的模型/节点

| 项目 | 名称 | 来源 | 存放位置 |
|------|------|------|------|
| ControlNet 模型 | `control_lora_rank128_v2p_sdxl_openpose.safetensors`（SDXL 专用） | [HuggingFace](https://huggingface.co/stabilityai/control-lora/resolve/main/control-LoRAs-rank128/control-lora-rank128-openpose-sdxl.safetensors) | `models/controlnet/` |
| 自定义节点 | `comfyui_controlnet_aux`（提供 OpenPose Preprocessor） | ComfyUI Manager → Install Missing Nodes | `custom_nodes/` |
| BiRefNet | 抠图 | （同前） | `models/background_removal/` |

> SDXL 的 ControlNet 使用了 Control-LoRA 形式，文件名含 `control-lora`，与 SD1.5 的 ControlNet 不同。务必下载 SDXL 专用版本。

#### 4.3.2 准备骨骼参考图

生成 4 帧行走循环的骨骼图（每帧一张）：

```
帧1：双脚并拢（中立位）
帧2：左脚前 / 右脚后（迈步）
帧3：双脚并拢（与帧1可共用）
帧4：右脚前 / 左脚后（迈步）
```

**获取骨骼图的方式**：
- **方式 A**：从网上找像素行走 spritesheet，用 OpenPose Preprocessor 提取骨骼
- **方式 B**：用 [PoseMy.Art](https://posemy.art/) 或 [3D OpenPose](https://zhuyu1997.github.io/3D-OpenPose/) 在线工具导出骨骼图
- **方式 C**：在 ComfyUI 中拖入任意行走参考图 → OpenPose Preprocessor 自动提取

#### 4.3.3 节点链路（单帧生成）

```
┌──────────────────────────────────────────────────────────────────┐
│  ┌─ LoadImage (骨骼参考图) ──┐                                   │
│  │  └─ OpenPosePreprocessor ──┐                                   │
│  │                            │                                   │
│  │  ┌─ LoadControlNetModel ──┐│                                   │
│  │  │  control_lora_rank128_v2p_sdxl_openpose.safetensors        │
│  │  │                         ││                                  │
│  │  │  ┌─ Apply ControlNet ──┘┘                                  │
│  │  │  │  strength=0.8, start=0.0, end=0.8                      │
│  │  │  │                                                          │
│  │  │  │  CONDITIONING ──┐                                       │
│  │  │  │                  │                                       │
│  │  │  │                  │                                       │
│  │  │  │  ┌───────────────┘                                       │
│  │  │  │  │                                                       │
│  CheckpointLoaderSimple (sd_xl_base_1.0)                         │
│  ├─ LoraLoader (pixel-art-xl, 0.7) ── MODEL ──┐                 │
│  ├─ LoraLoader (pixel-art-xl, 0.7) ── CLIP ──┤                  │
│  │                                             │                  │
│  │  CLIPTextEncode (positive) ── CONDITIONING ─┤                  │
│  │  CLIPTextEncode (negative) ── CONDITIONING ─┤                  │
│  │  EmptyLatentImage (width=64, height=64) ────┤                  │
│  │                                             │                  │
│  │  ┌──────────────── KSampler ────────────────┘                  │
│  │  │  steps=25, cfg=7, sampler=euler_ancestral,                 │
│  │  │  width=64, height=64, denoise=1.0                          │
│  │  └── LATENT ── VAEDecode ── IMAGE                             │
│  │                            │                                   │
│  │  ┌── Remove Background (BiRefNet) ────────────────────────────┘ │
│  │  │  output: RGBA 透明 PNG                                       │
│  │  └── SaveImage (命名：frame_{帧号}_{方向}.png)                  │
│  └──────────────────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────────────┘
```

#### 4.3.4 逐帧生成流程

```
Step 1: 先生成一张满意的角色站立图（正面，无 ControlNet）
        -> 确认角色外观（服装、配色）符合预期
        -> 将这张图的配置（种子、提示词前半部分）作为基准

Step 2: 准备 4 张骨骼参考图（行走循环 4 帧）
        -> 姿势不同，但骨骼图本身不影响角色外观

Step 3: 用同一套提示词 + 同一个种子，逐帧生成：
        帧1_down：骨骼图1 + 提示词 + seed
        帧2_down：骨骼图2 + 提示词 + seed
        帧3_down：骨骼图3 + 提示词 + seed
        帧4_down：骨骼图4 + 提示词 + seed
        -> 固定 seed 保证角色外观一致

Step 4: 每帧接 BiRefNet 抠图 → 保存为透明 PNG

Step 5: 在 Phaser 中加载 4 帧，配置 8fps 动画循环播放
```

#### 4.3.5 提示词模板

```
正向：
pixel art, 32x64 character sprite, side view, SNES 16-bit style,
simple design, solid colors, flat shading,
[角色描述：boy, blue shirt, brown hair, backpack],
walking pose, game asset, no background

负向：
realistic, 3D, photo, gradient, shadow, HD, complex background,
blurry, watermark, text, signature, multiple characters
```

#### 4.3.6 关键参数

| 参数 | 值 | 说明 |
|------|------|------|
| ControlNet strength | 0.8 | 骨骼约束强度 |
| ControlNet end_percent | 0.8 | 最后 20% 不约束，让细节自然生成 |
| 生成分辨率 | 64×64 | 后续裁剪到 32×64 |
| LoRA weight | 0.7 | 像素风强度 |
| seed | **固定不变** | 同一角色所有帧必须用同一个 seed |

#### 4.3.7 缩放与裁剪

ControlNet 生成的最小分辨率建议为 64×64（SDXL 本身对过小的分辨率不稳定）。生成后需要：
1. 裁剪到 32×64（精确目标尺寸）
2. 或使用 ImageResize 节点缩放到 32×64

---

### 4.4 工作流三：二次元美少女立绘生成（512×512 透明 PNG）

**目标**：生成正常二次元画风的美少女 NPC 半身像，不是像素风。透明背景，用于对话框立绘。

**核心方案**：使用 Illustrious XL（SDXL 的动漫微调模型）直出，Booru Tags 提示词，接 BiRefNet 抠图。

#### 4.4.1 推荐模型

| 模型 | 通称 | 风格 | 下载 | 存放位置 |
|------|------|------|------|------|
| `divingIllustriousAnime_v11.safetensors` | Illustrious XL | 二次元动漫 | [Tensor.Art](https://tensor.art/models/858535093042441156) 或 CivitAI | `models/checkpoints/` |
| `animagineXL_v40.safetensors` | Animagine XL 4.0 | 日系插画 | [HuggingFace](https://huggingface.co/cagliostrolab/animagine-xl-4.0) | `models/checkpoints/` |

> 二选一即可。Illustrious XL 角色识别能力更强（能识别 Danbooru 角色名），Animagine XL 4.0 画风更稳定。本项目推荐 **Illustrious XL**。

**为什么不用 SDXL Base + LoRA？**
- Illustrious XL 本身就是用海量 Danbooru 动漫图训练过的 SDXL 微调版，二次元画风是内置的
- 不需要额外加载 LoRA，减少显存占用
- Booru Tags 提示词比自然语言更精准控制角色特征

#### 4.4.2 节点链路

```
┌──────────────────────────────────────────────────────────────────┐
│  CheckpointLoaderSimple                                          │
│  加载模型：divingIllustriousAnime_v11.safetensors                │
│  ├─ MODEL ──┐                                                    │
│  ├─ CLIP  ──┤                                                    │
│  │          │                                                     │
│  │  CLIPTextEncode (positive) ── CONDITIONING ──┐               │
│  │  CLIPTextEncode (negative) ── CONDITIONING ──┤               │
│  │                                               │               │
│  │  EmptyLatentImage ── LATENT ──┐              │               │
│  │                                │              │               │
│  │  ┌─────────── KSampler ───────┘              │               │
│  │  │  steps=28, cfg=7, sampler=dpmpp_2m,       │               │
│  │  │  scheduler=karras, denoise=1.0            │               │
│  │  │  width=512, height=512                    │               │
│  │  └── LATENT ── VAEDecode ── IMAGE            │               │
│  │                                                │               │
│  │  ┌── Remove Background (BiRefNet) ────────────────────────────┘ │
│  │  │  output: RGBA 透明 PNG                                       │
│  │  └── SaveImage (命名：portrait_{npc_id}.png)                    │
│  └──────────────────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────────────┘
```

#### 4.4.3 提示词（Booru Tags 风格）

**注意**：Illustrious XL 使用 Danbooru 标签系统，提示词用逗号分隔的标签，不是自然语言。

```
正向（通用美少女）：
1girl, portrait, half body, school uniform, blue skirt,
looking at viewer, smile, gentle expression,
simple background, white background, soft lighting,
masterpiece, best quality, highres, absurdres,
detailed eyes, beautiful detailed hair

负向（通用）：
lowres, worst quality, bad anatomy, bad hands,
extra fingers, missing fingers, fused fingers,
bad proportions, disfigured, ugly, watermark,
text, signature, artist name, censored, mosaic
```

**角色定制提示词追加**：

| 角色特征 | 追加标签 |
|----------|------|
| 头发颜色 | `silver hair` / `black hair` / `brown hair` / `pink hair` |
| 发型 | `long hair` / `short hair` / `ponytail` / `twin tails` |
| 眼睛颜色 | `blue eyes` / `red eyes` / `green eyes` / `purple eyes` |
| 眼镜 | `glasses` |
| 表情 | `smile` / `gentle smile` / `serious` / `embarrassed` |
| 胸围 | `flat chest` / `medium breasts` / `large breasts` |

#### 4.4.4 参数建议

| 参数 | 值 | 说明 |
|------|------|------|
| 模型 | Illustrious XL | 二次元专用 |
| 分辨率 | 512×512 | 匹配项目美术规范 |
| Steps | 28 | DPM++ 2M Karras 下 28 步稳定 |
| CFG | 7 | 标准值 |
| 采样器 | dpmpp_2m + karras | 二次元画风推荐 |

#### 4.4.5 显示名称注入

对于立绘，需要在提示词中加入 Danbooru 角色名以利用 Illustrious 的字符识别能力：

| NPC | 提示词追加 |
|------|------|
| 男德通 | `male focus, 1boy, black hair, glasses, gentle smile, butler uniform` |
| 院长 | `1girl, silver hair, long hair, red eyes, white dress, elegant` |

> 如果生成了不想要的暴露内容，在负向提示词中加 `nsfw, nude, bikini, lingerie`。

---

### 4.5 模型下载清单（汇总）

| 模型 | 用途 | 工作流 | 存放位置 |
|------|------|:--:|------|
| SDXL 1.0 Base | 基础生成 | 一、二 | `models/checkpoints/` |
| Pixel-Art-XL LoRA | 像素风风格化 | 一、二 | `models/loras/` |
| Control-LoRA OpenPose（SDXL） | 角色姿势约束 | 二 | `models/controlnet/` |
| BiRefNet | 背景移除 | 一、二、三 | `models/background_removal/` |
| Illustrious XL | 二次元立绘 | 三 | `models/checkpoints/` |

### 4.6 自定义节点安装清单

| 节点包 | 用途 | 工作流 |
|------|------|:--:|
| `comfyui_controlnet_aux` | OpenPose Preprocessor | 二 |

### 4.7 美术资源目录映射

```
public/game/
├── tilesets/              ← 工作流一：瓦片（草地/泥土/石墙/木板/天空）
├── sprites/
│   ├── objects/           ← 工作流一：物件（树木/云朵/大门）
│   ├── items/             ← 工作流一：物品（公告牌/日程板/打卡点）
│   ├── players/           ← 工作流二：玩家角色精灵表
│   └── npcs/              ← 工作流二：NPC 角色精灵表
├── portraits/             ← 工作流三：NPC 立绘（二次元半身像）
├── audio/                 ← （暂不涉及）
├── maps/                  ← 地图数据（JSON，非美术资源）
└── ui/                    ← UI 元素（暂不涉及）
```

**命名规范**：

| 目录 | 命名模板 | 示例 |
|------|------|------|
| `tilesets/` | `tile_{类型}_{编号}.png` | `tile_grass_00.png` |
| `sprites/objects/` | `obj_{名称}.png` | `obj_tree_00.png` |
| `sprites/items/` | `item_{名称}.png` | `item_board_notice.png` |
| `sprites/players/` | `player_{方向}_{帧号}.png` | `player_down_01.png` |
| `sprites/npcs/` | `npc_{名称}_{方向}_{帧号}.png` | `npc_nandetong_down_01.png` |
| `portraits/` | `portrait_{npc_id}.png` | `portrait_nandetong.png` |

---

## 五、黑机环境搭建步骤

### 5.1 确认 ComfyUI 版本

黑机 ComfyUI 是**整合包**（Windows 便携版，直接解压使用），不是通过 git clone 安装的。

**确认版本**：启动 ComfyUI 后，在网页界面左下角或菜单 → Settings 中查看版本号。BiRefNet 节点需要 2025 年后的版本。

**版本过旧时的处理方式**：直接重新下载最新整合包覆盖即可，不需要 `git pull`。下载地址：[ComfyUI Releases](https://github.com/comfyanonymous/ComfyUI/releases)

> 整合包覆盖时注意保留已有的 `models/` 目录和 `output/` 目录，避免重新下载模型。

### 5.2 下载所需模型

```powershell
# 1. SDXL Base（如已有可跳过）
# 放入 ComfyUI/models/checkpoints/

# 2. Pixel-Art-XL LoRA
# 下载地址：https://civitai.com/models/120096
# 放入 ComfyUI/models/loras/

# 3. SD_PixelArt_SpriteSheet_Generator
# 在 CivitAI 搜索下载
# 放入 ComfyUI/models/loras/

# 4. BiRefNet 模型
# 下载地址：https://huggingface.co/Comfy-Org/BiRefNet/resolve/main/background_removal/birefnet.safetensors
# 放入 ComfyUI/models/background_removal/
```

### 5.3 验证 BiRefNet 节点

启动 ComfyUI 后，在节点面板搜索 `RemoveBackground` 或 `BiRefNet`，确认节点存在。

---

## 六、工作流搭建与存储方案

### 6.1 核心原理

**ComfyUI 工作流本质是一个 JSON 文件**。所有节点、连线、参数配置都存储在 JSON 中。AI 不需要直接操作 ComfyUI 网页界面，而是直接生成这个 JSON 文件，用户在 ComfyUI 中拖入加载即可。

### 6.2 混合搭建模式

| 步骤 | 谁做 | 做什么 |
|------|------|------|
| 1 | 用户 | 在 ComfyUI 界面建一个最简工作流（加载模型 → KSampler → SaveImage），导出 JSON |
| 2 | AI | 读取用户导出的 JSON，理解当前 ComfyUI 版本的节点命名和结构 |
| 3 | AI | 基于读取的 JSON 扩展生成完整工作流（加 LoRA、加 ControlNet、加 BiRefNet） |
| 4 | 用户 | 将 AI 生成的 JSON 拖入 ComfyUI 界面加载，微调提示词后运行 |

**为什么需要步骤 1-2？** ComfyUI 不同版本/自定义节点包的节点命名可能不同，AI 需要基于用户实际环境来生成，避免节点名拼错。

### 6.3 存储方案

工作流 JSON 存放在项目内但 gitignore（黑机专用，不污染仓库）。使用**项目相对路径**而非绝对路径（两机路径可能不同）：

```
<项目根>/.ai/comfyui-workflows/
├── scene_tiles.json              # 工作流一：场景贴图（像素风）
├── character_sprite.json         # 工作流二：角色精灵表（ControlNet）
├── portrait_anime.json           # 工作流三：二次元美少女立绘
└── base_empty.json               # 用户导出的空工作流（AI 参考用）
```

存放路径选择 `.ai/comfyui-workflows/` 的理由：
- `.ai/` 目录本身就是 AI 专用，不会与项目源码混淆
- 路径位于项目根，AI 读取方便
- `.gitignore` 加一行 `/.ai/comfyui-workflows/` 即可

### 6.4 传输方式

黑机生成的工作流 JSON 通过 git 提交 -> GitHub -> 白机 pull，两机同步。`.gitignore` 确保 JSON 不入库。如需要跨设备传递，可用 U 盘或微信文件传输助手。

### 6.5 ComfyUI 目录不迁移

ComfyUI 是黑机本地的独立工具，不需要迁移到项目目录。JSON 文件就是 AI 与 ComfyUI 之间的唯一桥梁：

```
黑机项目目录                          黑机 ComfyUI 目录（独立安装，不迁移）
d:\product\nande\                    d:\ComfyUI_windows_portable\
  .ai\comfyui-workflows\               (独立安装，不迁移)
    base_empty.json  ←── AI 读取 ──->  ComfyUI 界面导出
    scene_tiles.json ←── AI 生成 ──->  拖入 ComfyUI 加载
```

---

## 七、美术资源部署方案

### 7.1 网络约束

黑机因网络问题**无法直连服务器**，只能通过 GitHub 提交代码，服务器拉取 GitHub 实现部署。因此美术资源必须走 GitHub 链路，不能走 SFTP/SCP 直传。

### 7.2 方案选型

| 方式 | 是否适用 | 理由 |
|------|:--:|------|
| **Git** | **是** | PNG 随代码一起 push 到 GitHub，服务器 pull 即可获取 |
| Git LFS | 否 | 总量仅 1-2MB，不值得引入 LFS 的额外复杂度 |
| SFTP/SCP | 否 | 黑机无法直连服务器 |

### 7.3 资源体积评估

| 资源类型 | 数量 | 单张大小 | 小计 |
|----------|:----:|----------|:----:|
| 瓦片（32×32） | ~5 张 | 1-3 KB | ~10 KB |
| 物件（32×64） | ~3 张 | 2-5 KB | ~15 KB |
| 物品（32×32） | ~3 张 | 1-3 KB | ~10 KB |
| 角色精灵表（32×64） | ~20 帧 | 2-5 KB | ~80 KB |
| 立绘（512×512） | ~5 张 | 100-300 KB | ~1 MB |
| **合计** | | | **约 1-2 MB** |

总量极小，直接入库不会导致仓库膨胀。美术资源是一次性工程，不会频繁修改，Git 历史不会有大量二进制 diff。

### 7.4 部署链路

```
黑机 ComfyUI 出图
    ↓
放入 public/game/ 对应目录
    ↓
git add + commit + push（PNG 随代码一起入库）
    ↓
服务器 git pull（代码 + 图片一起拉下来）
    ↓
完成
```

### 7.5 gitignore 配置

`.gitignore` 中**不忽略** `public/game/` 下的 PNG 文件，让其正常入库。目录结构通过 `.gitkeep` 保证空目录存在（已有），PNG 文件直接 `git add` 提交。

### 7.6 黑机如何知道目录结构

**不需要额外通知。** 目录结构通过 `.gitkeep` 文件入库，黑机 `git pull` 后自动获得完整的空目录结构。调研文档 §4.7 中已明确每个目录放什么资源、命名规范是什么。黑机 AI 读取交接单和调研文档即可知道往哪个目录放什么文件。

---

## 八、关键决策记录

| 决策 | 结论 | 核心理由 |
|------|------|------|
| 本地 vs API | 本地 | 4070 已购，12GB 足够跑 SDXL，总量小，需频繁调参 |
| 抠图方案 | BiRefNet（内置） | 原生支持，零安装，像素风够用 |
| 是否用 RemBG | 否 | BiRefNet 已覆盖需求，不引入额外依赖 |
| 工作流存储 | 导出 JSON 入仓库 | 双机协作需要版本同步 |
| 精灵表方案 | **ControlNet OpenPose 逐帧生成** | 需定制角色外观 + 零美术功底，ControlNet 保证一致性 |
| 立绘画风 | **Illustrious XL 二次元画风** | 需求明确：立绘不走像素风 |
| 场景贴图抠图 | **瓦片类不抠，物件/物品类必抠** | 瓦片满铺无需透明，物件浮在背景上需要透明 |
| 图片版本管理 | **Git 入库，随代码一起部署** | 黑机无法直连服务器，必须走 GitHub 链路；总量仅 1-2MB |
| Git LFS | **不需要** | 单文件最大 200KB，不值得引入额外复杂度 |
| ComfyUI 迁移 | **不迁移** | 独立工具，JSON 文件就是桥梁 |
| AI 搭建工作流 | **混合模式** | 用户导出空 JSON → AI 扩展 → 用户拖入加载 |

---

## 九、待办事项

- [ ] 黑机确认 ComfyUI 版本，升级到支持 BiRefNet 的版本
- [ ] 下载 BiRefNet 模型到 `models/background_removal/`
- [ ] 下载 Pixel-Art-XL LoRA 到 `models/loras/`
- [ ] 下载 Illustrious XL 到 `models/checkpoints/`
- [ ] 下载 Control-LoRA OpenPose（SDXL 版）到 `models/controlnet/`
- [ ] 安装 `comfyui_controlnet_aux` 自定义节点
- [ ] 搭建工作流一（场景贴图），逐个生成瓦片和物件，导出 JSON
- [ ] 搭建工作流二（角色精灵表），调试 ControlNet 流程，导出 JSON
- [ ] 搭建工作流三（二次元立绘），调试 Illustrious XL，导出 JSON
- [ ] 更新 `美术设计规范.md`：§6.3 抠图改为 BiRefNet；立绘画风改为二次元