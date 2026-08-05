# 视频生成 API 调研

> 版本：v5 | 日期：2026-08-05 | 调研人：陈梓键（院长）+ 白机落档
> 状态：📝 调研完成，待决策（是否将视频纳入视觉小说路线图）
> 关联：ADR-005（德塔世界观承载方式，2D 时期视频候选工具表，已随方向转换搁置）
> 信息来源：火山方舟《创建视频生成任务》PDF（17页）+ 各厂商官方文档/SDK/第三方聚合平台交叉验证 + HuggingFace/ComfyUI/GitHub Issues 实测数据 + 项目美术设计规范（画风定义）+ MiniMax MCP 官方文档全文 + MiniMax H3 V2 API OpenAPI 原文（6接口）

---

## 一、背景

德塔模块从 2D 游戏转为视觉小说方向后，当前视觉表达走 AI **出图**（Seedream/Gemini 图像生成）路线，视频生成未进入路线图。ADR-005（2026-07-27）曾调研视频候选工具，但建立在已废弃的 2D 游戏架构上，从未落地。

本次调研全面梳理各家视频生成 API 能力，重点深挖字节跳动火山方舟 Seedance 系列（项目已有 `VOLC_API_KEY`，集成成本最低），为后续"是否将视频纳入视觉小说增强"的决策提供弹药。

### 项目现状

| 维度 | 现状 |
|------|------|
| 代码 | 零落地--无 `<video>` 组件、无视频路由、无视频处理依赖 |
| 依赖 | `package.json` 无 ffmpeg/video 相关库（仅 sharp 图像处理） |
| 路由 | `server/src/routes/api.js` 无 video/media 路由 |
| 密钥 | `.env.example` 仅有 `VOLC_API_KEY`（火山引擎方舟，用于 Seedream **图像**生成），无视频密钥 |
| 路线图 | 四个里程碑（M-G1~M-G4）均为立绘+背景+纯文本驱动，无视频 |

---

## 二、字节跳动 · 火山方舟 Seedance（重点）

> 来源：火山方舟《创建视频生成任务》PDF（17页，WeasyPrint 生成，文本层完好，PyMuPDF 直接提取）

### 2.1 接口总览

| 项 | 内容 |
|---|---|
| **端点** | `POST https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks` |
| **类型** | **异步接口**。POST 创建任务返回 `id` -> 轮询「查询任务 API」获取 `video_url` |
| **鉴权** | API Key（Bearer Token），与项目现有 `VOLC_API_KEY` 同体系 |
| **回调** | 支持 `callback_url`，任务状态变化时方舟主动 POST（queued -> running -> succeeded/failed/expired） |
| **任务 ID 保留期** | 7 天（从 `created_at` 开始计算） |

### 2.2 模型矩阵

| 模型 | 能力 | 时长 | 分辨率 | 备注 |
|------|------|------|--------|------|
| **Seedance 2.5** | 最新 | - | - | 模型信息已公开，在线体验与 API 调用**即将上线，暂不可用** |
| **Seedance 2.0** | 多模态参考生视频 / 首尾帧 / 首帧 / 文生视频 / 有声视频 / 视频延长 / 视频编辑 | 4-15秒 | 480p/720p/1080p/**4k**(10bit) | 旗舰款。支持联网搜索、执行优先级、自适应宽高比 |
| Seedance 2.0 Fast | 同 2.0 但精简 | 4-15秒 | 480p/720p | 不支持 1080p/4k |
| Seedance 2.0 Mini | 同 2.0 但精简 | 4-15秒 | 480p/720p | 轻量版 |
| **Seedance 1.5 Pro** | 首尾帧 / 首帧 / 文生视频 / 有声视频 / 样片模式 | 4-12秒 | 480p/720p/1080p | 性价比款，支持 draft 样片预览（480p，省 token） |
| Seedance 1.0 Pro | 首尾帧 / 首帧 / 文生视频 | 2-12秒 | 480p/720p/1080p | 旧款 |
| Seedance 1.0 Pro Fast | 首帧 / 文生视频 | 2-12秒 | 480p/720p/1080p | 旧款快速版 |

**开通条件（2.0 系列）**：满足任一 -- 账户余额 > 200 元，或已购买 Seedance 2.0 资源包且有可用余量。

### 2.3 模型能力详解

**Seedance 2.0 系列**（有声视频 / 无声视频）：
- **多模态参考生视频**：输入参考图片（0-9）+ 参考视频（0-3）+ 参考音频（0-3）+ 文本提示词（可选）生成 1 个目标视频。不可单独输入音频，至少包含 1 个参考视频或图片。支持生成全新视频、编辑视频、延长视频。
- **图生视频-首尾帧**：输入首帧图片 + 尾帧图片 + 文本提示词（可选）。
- **图生视频-首帧**：输入首帧图片 + 文本提示词（可选）。
- **文生视频**：输入文本提示词。

**Seedance 1.5 Pro**：支持图生视频-首尾帧、图生视频-首帧、文生视频。有声视频 + 样片模式。

**Seedance 1.0 Pro / 1.0 Pro Fast**：首尾帧 / 首帧 / 文生视频（Fast 不支持首尾帧）。

> ⚠️ **三种图生视频场景互斥**：首帧 / 首尾帧 / 多模态参考生视频不可混用。多模态参考可通过提示词指定参考图作为首帧/尾帧，间接实现「首尾帧 + 多模态参考」效果。

### 2.4 核心请求参数

```jsonc
{
  "model": "doubao-seedance-1-5-Pro-251215",  // 模型 ID（开通后查询）
  "content": [
    { "type": "text", "text": "小猫对着镜头打哈欠" },
    { "type": "image_url", "image_url": { "url": "https://..." }, "role": "first_frame" }
  ],
  "resolution": "720p",        // 480p/720p/1080p/4k
  "ratio": "16:9",             // 16:9/4:3/1:1/3:4/9:16/21:9/adaptive
  "duration": 5,               // 秒（2.0: 4-15, 1.5: 4-12, 1.0: 2-12），-1=自适应
  "frames": 57,                // 帧数（仅1.0系列，25+4n格式，[29,289]），优先级高于duration
  "seed": 11,                  // 随机种子，-1=随机
  "camera_fixed": false,       // 固定摄像头
  "watermark": true,           // AI生成水印
  "generate_audio": true,      // 1.5+/2.0：有声视频（自动生成人声/音效/BGM）
  "return_last_frame": false,  // 返回尾帧图（可链式连续生成多段视频）
  "callback_url": "https://...",  // 回调地址
  "service_tier": "default",   // default=在线 / flex=离线(半价, 2.0不支持)
  "priority": 0,               // 0-9，插队优先级（仅2.0）
  "draft": false,              // 样片模式（仅1.5 Pro，480p预览，省token）
  "safety_identifier": "user_hash",  // 终端用户标识（可选）
  "execution_expires_after": 172800  // 任务超时阈值（秒），默认48小时，[3600,259200]
}
```

**参数传入有两种方式**：
1. **常规方式（推荐）**：request body 直传，强校验
2. **弱校验方式**：提示词后追加 `--rs 720p --rt 16:9 --dur 5 --seed 11 --cf false --wm true`

### 2.5 多模态参考生视频（2.0 系列独有，角色一致性关键能力）

```
content[] 可混合传入：
  - 参考图片 0-9 张  (role: reference_image)
  - 参考视频 0-3 个  (role: reference_video, 单个 2-15s, 总 ≤ 15s)
  - 参考音频 0-3 段  (role: reference_audio, 单个 2-15s, 总 ≤ 15s)
  - 文本提示词（可选）
```

这是**角色一致性**的关键能力：传入角色立绘作为参考图，可锁定角色外观。

> ⚠️ **人脸限制**：Seedance 2.0 **不支持直接上传含真人人脸**的参考图/视频。需使用预置虚拟人像、已授权真人素材、或本账号近30天内生成的含人脸产物。对项目角色立绘（二次元/动漫风）不受影响。

### 2.6 输入素材规格

**图片**：
- 格式：jpeg/png/webp/bmp/tiff/gif（2.0/1.5 额外支持 heic/heif）
- 宽高比（宽/高）：[0.4, 2.5]，像素 [300, 6000]，单张 < 30MB
- 来源：图片 URL / Base64 编码 / 素材 ID（`asset://<ASSET_ID>`）

**视频**（2.0 参考生视频）：
- 格式：mp4/mov（H.264/H.265 + AAC/MP3）
- 分辨率：480p/720p/1080p/4k
- 单个时长 [2, 15]s，最多 3 个，总时长 ≤ 15s
- 宽高比 [0.4, 2.5]，像素 [300, 6000]，单文件 ≤ 200MB
- 帧率 [24, 60] FPS

**音频**（2.0 参考生视频）：
- 格式：wav/mp3
- 单个时长 [2, 15]s，最多 3 段，总时长 ≤ 15s，单文件 ≤ 15MB

### 2.7 输出视频格式（分辨率 × 宽高比像素值）

| 分辨率 | 宽高比 | 2.0 系列 | 1.5 Pro | 1.0 系列 |
|--------|--------|----------|---------|----------|
| 480p | 16:9 | 864×496 | 864×496 | 864×480 |
| 480p | 4:3 | 752×560 | 752×560 | 736×544 |
| 480p | 1:1 | 640×640 | 640×640 | 640×640 |
| 480p | 9:16 | 496×864 | 496×864 | 480×864 |
| 480p | 21:9 | 992×432 | 992×432 | 960×416 |
| 720p | 16:9 | 1280×720 | 1280×720 | 1248×704 |
| 720p | 1:1 | 960×960 | 960×960 | 960×960 |
| 720p | 9:16 | 720×1280 | 720×1280 | 704×1248 |
| 1080p | 16:9 | 1920×1080 | 1920×1080 | 1920×1088 |
| 1080p | 9:16 | 1080×1920 | 1080×1920 | 1088×1920 |
| **4k** | 16:9 | 3840×2160 | - | - |
| 4k | 1:1 | 2880×2880 | - | - |
| 4k | 9:16 | 2160×3840 | - | - |

> 4K 视频采用 10bit 位深 + H.265 编码，少数播放环境可能不兼容，建议用 VLC/MPV/QuickTime 查看。
> 2.0 系列默认 `ratio=adaptive`（自动适配宽高比）；1.0 文生视频默认 16:9，图生视频默认 adaptive。

### 2.8 有声视频

`generate_audio`（默认 true，仅 1.5 Pro / 2.0 系列）：
- 模型基于文本提示词与视觉内容自动生成匹配的**人声、音效及背景音乐**
- 建议对话部分置于双引号内优化音频效果，如：`男人叫住女人说："你记住，以后不可以用手指指月亮。"`
- 输出为**单声道**（与传入音频声道数无关）

### 2.9 样片模式（Draft）

`draft=true`（仅 1.5 Pro）：
- 生成 480p 预览视频，快速验证场景结构、镜头调度、主体动作与 Prompt 意图
- 消耗 token 更少，成本更低
- 不支持返回尾帧、不支持离线推理
- 使用流程：Step 1 调本接口生成 Draft -> Step 2 确认后基于 Draft 任务 ID 调本接口生成正式视频

### 2.10 尾帧链式拼接

`return_last_frame=true`：返回生成视频的尾帧图像（PNG，无水印，宽高与视频一致）。
用途：上一个视频的尾帧作为下一个视频任务的首帧，**链式生成多个连续视频实现长剧情**。

### 2.11 与项目的契合度

| 契合点 | 说明 |
|--------|------|
| ✅ 同一密钥体系 | 项目已有 `VOLC_API_KEY`，**无需新增服务商**，直接复用 |
| ✅ OpenAI 兼容 | 方舟 API 兼容 OpenAI SDK 调用模式 |
| ✅ 图生视频 | 可用项目现有 Seedream 生成的立绘/背景图作为首帧 |
| ✅ 多模态参考 | 2.0 系列可传角色立绘锁定角色（对视觉小说角色一致性关键） |
| ✅ 有声视频 | 1.5 Pro/2.0 自动生成人声+音效+BGM |
| ✅ 尾帧链式 | `return_last_frame` 可拼接多段视频实现长剧情 |
| ⚠️ 时长上限 | 单段最长 15 秒（2.0），需分段拼接做长视频 |
| ⚠️ 动漫风 | 无内置 `style=anime` 参数，靠 prompt 控制 |
| ⚠️ 开通门槛 | 2.0 系列需充值 200 元（1.5 Pro 是否同条件待确认） |

---

## 三、其他主流厂商横向对比

### 3.1 总览表

| 厂商 | 模型 | 调用方式 | 最长时长 | 分辨率 | 免费额度 | 角色一致性 | 动漫风 | 国内访问 |
|------|------|----------|----------|--------|----------|-----------|--------|----------|
| **字节 Seedance** | 2.0/1.5Pro/1.0 | 异步+回调 | 15s | 480p-4k | 无（需充值200元） | ✅ 多模态参考(0-9图) | ❌ 靠prompt | ✅ |
| **智谱** | cogvideox-flash | 异步轮询 | 5s(固定) | 最高4K | ✅ **完全免费** | ❌ | ❌ 靠prompt | ✅ |
| **快手可灵** | v1.6/v2.1/v3.0 | 异步轮询 | 10s | 720p/1080p | 少量积分 | ✅ v1.5+参考图 | ✅ 有动漫变体 | ✅ |
| **生数Vidu** | viduq1/q2/q3 | 异步+回调 | 16s | 540p-1080p | ✅ 免费积分+错峰 | ✅✅ **最多7张主体图** | ✅✅ **style=anime** | ✅ |
| **通义万相** | wan2.7 | 异步/SDK同步 | 15s | 720p/1080p | 少量 | ⚠️ 参考生视频 | ❌ 靠prompt | ✅ |
| **Runway** | Gen4/Gen4.5 | 异步轮询 | 10s | 多宽高比 | ✅ 125积分永久 | ✅✅ Characters系统 | ❌ 靠prompt | ❌ 需翻墙 |
| **Luma** | Ray3.2/3.14 | 异步+回调 | 9s | 540p-4k | 不明确 | ⚠️ 首尾帧间接 | ❌ 靠prompt | ❌ 需翻墙 |
| **MiniMax** | hailuo-02/2.3 | 异步轮询 | 10s | 512p-1080p | 试用额度 | ❌ | ✅ **live2d专用模型** | ✅ |
| **腾讯混元** | HunyuanVideo | 异步 | 5s | 540p/720p | ✅ **开源免费** | ⚠️ HunyuanCustom | ❌ 靠prompt | ✅ |

### 3.2 各厂商要点

**智谱 AI CogVideoX**
- 端点：`POST /videos/generations` + `GET /async-result/{id}`
- `cogvideox-flash` **完全免费**，但固定 5 秒/37fps，无角色一致性、无动漫参数
- `cogvideox-2` 支持 4K、时长可配
- 适合：免费 PoC 验证、原型开发

**快手可灵（Kling）**
- 异步轮询，5秒/10秒两档，720p/1080p
- v1.5+ 支持参考图/角色锁定，有动漫风格模型变体
- 支持视频延长（extend_video）
- 适合：角色一致性 + 动漫风备选

**生数科技 Vidu**
- 端点：`POST https://api.vidu.com/ent/v2/text2video`（及 image2video、reference2video、start-end2video）
- **角色一致性最强**：多主体参考，最多 7 张主体图 + 主体库
- **动漫风最强**：`style=anime` 内置参数（仅 viduq1 生效）
- 时长最长 16 秒（viduq3-pro），分辨率 540p/720p/1080p
- 支持首尾帧、错峰模式（`off_peak=true`，48小时内生成，消耗更少积分）
- 适合：**Seedance 动漫风效果不理想时的最佳备选**

**阿里通义万相（Wan）**
- 端点：`POST https://{WorkspaceId}.cn-beijing.maic.../api/v1/services/aigc/video-generation/video-synthesis`
- 异步（`X-DashScope-Async: enable` 请求头），SDK 支持同步封装
- 时长 2-15 秒，720p/1080p，宽高比 16:9/9:16/1:1/4:3/3:4
- 按秒计费，720P 约 0.9 元/秒、1080P 约 1.2-1.6 元/秒
- 适合：时长上限最高、调用方式最灵活

**Runway（Gen-3/Gen-4）**
- 异步轮询，5秒/10秒，宽高比丰富（含 21:9）
- **角色一致性最成熟**：Characters 系统 + Custom Avatars
- 125 积分永久免费（不过期）
- Gen4 Turbo 支持首尾帧（`tail_image_url`）
- 需翻墙

**Luma Dream Machine**
- 端点：`POST https://api.lumalabs.ai/dream-machine/v1/generations/video`
- keyframes 首尾帧功能最完善（frame0 + frame1，支持视频延展）
- 分辨率最丰富（540p-4k），时长 5秒/9秒
- 需翻墙

**MiniMax 海螺**
- 端点：`POST https://api.minimaxi.com/v1/video_generation`
- `video-01-live2d` 专用 Live2D 动漫模型
- 6秒/10秒，768p/1080p
- 转售价最低（512p 约 $0.017/次）
- 适合：动漫风 + 低成本
- **注**：MiniMax 于 2026-07-31 开源了新一代 H3 模型（本地部署），详见第六章

**腾讯混元**
- 完全开源（130 亿参数，开源最大），可本地免费部署
- HunyuanCustom 支持角色定制
- 写实风为主，无内置动漫参数
- 白机无 GPU，本地部署不可行

### 3.3 针对视觉小说场景排名

**角色一致性**（对角色立绘锁定最关键）：
1. Vidu - 多主体参考最多7张图 + 主体库，**最强**
2. Runway - Characters 系统 + Custom Avatars
3. 字节 Seedance 2.0 - 多模态参考0-9图+0-3视频
4. 可灵 - v1.5+ 参考图

**动漫风格**：
1. Vidu - `style=anime` 内置参数（仅 viduq1）
2. MiniMax - `video-01-live2d` 专用模型
3. 可灵 - 有动漫变体
4. 其余靠 prompt 文本控制

**免费/低成本**：
1. 智谱 cogvideox-flash - 完全免费（但固定5秒、无一致性、无动漫参数）
2. 腾讯混元 - 开源免费本地部署（需 GPU，白机不可行）
3. Runway - 125积分永久免费
4. Vidu - 免费积分+错峰模式

### 3.4 项目画风（油画厚涂）对选型的影响 -- 重要修正

> 来源：`prd/01-需求文档/04-德塔/02-设计/美术设计/美术设计规范.md` -- 画风 = 油画厚涂（novaAnimeXL 底模 + epic_oil_painting_slider LoRA）

项目画风关键词：`thick oil painting, epic oil painting, impasto brushstrokes, western fantasy art, dramatic lighting`。**不是纯动漫/二次元，而是动漫底子 + 油画笔触 + 西幻氛围的混合风格**（黑深残世界基调，角色立绘温暖有质感）。

这对上文 3.3 「动漫风格」排名是个**重要修正**：项目需要的不是 `style=anime`（纯二次元/日漫预设），而是"用参考图引导出油画厚涂风"。两者的选型逻辑完全不同。

| 模型 | 油画厚涂风适配 | 说明 |
|------|---------------|------|
| **字节 Seedance 2.0** | ✅ **最契合** | 多模态参考（0-9 图）直接传项目现有立绘/CG 当参考图，模型自然学习画风，无需依赖预设 |
| H3 Ref2VA | ✅ 契合 | 全模态参考同理（图+视频+音频），但本地部署受限 |
| Vidu `style=anime` | ⚠️ 反而不合适 | anime 预设是纯二次元/日漫，与油画厚涂冲突。Vidu 关闭 anime 参数后仍可用多主体参考引导，但卖点被削弱 |
| MiniMax live2d | ❌ **完全不适合** | live2d 是纯日漫平面动画风，与项目画风直接冲突 |
| 可灵动漫变体 | ⚠️ 待验证 | 有动漫变体但同样是日漫取向 |

**结论修正**：项目画风不属于任何视频模型的"内置预设风格"。选型逻辑应从"找有 anime 模式的模型"转向"**多模态参考能力最强、最能从参考图继承画风的模型**"。这使得：

- **Seedance 2.0**（0-9 图参考，复用项目已有 `VOLC_API_KEY`）成为最契合的方案
- H3 Ref2VA 能力对标但本地硬件跑不动，走 API 时 Seedance 的集成成本更低
- 3.3 中 Vidu「动漫风格排名第1」的结论**降级** -- 其 `style=anime` 对本项目反而是负资产，真正的价值在多主体参考

---

## 四、总结与建议

### 字节 Seedance 的优势（项目首选理由）

1. **零集成成本**：项目已有 `VOLC_API_KEY` 和火山引擎方舟调用基础设施（图像生成已在用），视频 API 是同一平台同一密钥，**只需换 model 名和 endpoint**
2. **能力最全**：多模态参考生视频（0-9图+0-3视频+0-3音频）是角色一致性最强方案之一，且有有声视频、尾帧链式拼接、样片预览、4K输出
3. **时长领先**：单段最长15秒（2.0系列），配合尾帧链式可达更长
4. **国内直连**：无需翻墙，延迟低

### 潜在短板

- 无内置画风预设参数（项目是油画厚涂风，非纯动漫），**靠多模态参考图引导画风**（见 3.4 画风分析，这反而是正确路线）
- 2.0 系列需充值 200 元开通（1.5 Pro 是否同条件待确认）
- 含真人人脸参考图受限（虚拟角色/立绘不受影响，对项目反而是利好）

### 备选方案

项目画风是油画厚涂（非纯动漫），选型逻辑应看"多模态参考能力"而非"anime 预设"：

- **首选 Seedance 2.0**：多模态参考 0-9 图，直接传项目现有立绘继承画风，复用 `VOLC_API_KEY`，集成成本最低
- **次选 Vidu**：多主体参考（7 张图）能力也强，但 `style=anime` 对本项目是负资产（需关闭），价值在参考图引导
- **H3（走 API）**：Ref2VA 能力对标，但需另开 MiniMax 服务，不如 Seedance 集成成本低；本地部署受 32G 内存硬限（见第六章）

### 调用流程示意（以 Seedance 2.0 图生视频为例）

```
1. 准备首帧图片（Seedream 生成的立绘/背景图 URL）
2. POST 创建任务
   -> 返回 { "id": "task_xxx" }
3. 轮询查询任务（或等 callback_url 回调）
   -> status: queued -> running -> succeeded
4. 任务成功，获取 video_url 下载 MP4
5. （可选）return_last_frame=true 获取尾帧，作为下一段视频的首帧
```

---

## 五、MiniMax H3 开源模型（本地部署专题）

> 来源：HuggingFace 模型卡 + ComfyUI 官方博客 + GitHub Issues 实测 + Wan2GP 低显存框架 + NGA 实测帖
> 背景：MiniMax 于 2026-07-31 开源 H3，中文社区流传"8G 显存可跑"。院长黑机配置 RTX 4070 12G 显存 + 32G 内存，评估本地部署可行性。

### 5.1 核心结论（先看这个）

**"8G 显存可跑"是营销话术，严重省略前提。** 黑机（4070 12G + 32G）能勉强跑量化版 480p，但**体验差，32G 内存是硬瓶颈**。

"8G 可跑"的出处是低显存优化项目 Wan2GP（`github.com/deepbeepmeep/Wan2GP`），前提是全部满足：用最激进量化 + 模型卸载到系统内存 + 只跑 480p 低分辨率短视频。原版 BF16 根本不可能（DiT 权重就 61GB）。

### 5.2 模型基本信息

| 项 | 值 |
|---|---|
| 准确命名 | **MiniMax H3**（HuggingFace: `MiniMaxAI/MiniMax-H3`）。"Hailuo H3" 是民间叫法。**不是** MiniMax-01 / H3-T2V |
| 参数量 | **33B**（33,122,992,896），其中约 13B 在 AdaLN 分支（推理时可预计算缓存） |
| 架构 | H3-Omni-Transformer：单流密集 DiT，packed-token 布局 `[text|cond/ref|audio|video]`；3D MM-RoPE。**当前开源版仅 full attention 推理**（训练时支持稀疏注意力） |
| 文本/视觉编码器 | 内置 **Qwen3-VL-32B**（取前 50 层）-- 这是模型"大"的主因之一，低显存跑必须量化它 |
| 开源时间 | 2026-07-31 官方博客发布 + 权重开放；HF 最后更新 2026-08-04（非常新） |
| 技术报告 | **尚未发布**，官方称 "soon" |
| 开源协议 | **MiniMax H3 Community License**：允许商用，但年收入超 2000 万美元需单独授权；商用 UI 必须标注 "MiniMax H3"。非 MIT/Apache，属受限商用许可 |

### 5.3 能力

| 能力 | 支持 | 细节 |
|------|------|------|
| 文生视频 | ✅ | FL2VA 模式零图输入 |
| 图生视频 / 首尾帧 | ✅ | FL2VA，支持 0/1/2 张图；2张=首尾帧 |
| 视频生视频 | ✅ | V2V 运动转换 |
| **全模态参考生视频** | ✅（特色） | Ref2VA：≤9图 + ≤3视频(2-15s) + ≤3音频，总文件≤12 |
| 分辨率 | 开源版**原生 768p**（短边768） | 2K 需闭源 H3-Regenerate-2K |
| 时长 | 4-15 秒 | |
| 帧率 | 24 FPS | |
| **有声视频** | ✅（原生立体声 32kHz） | H3-AudioVAE 压缩为 40Hz latent，与多数开源视频模型的差异点 |
| 宽高比 | 21:9 / 16:9 / 4:3 / 1:1 / 3:4 / 9:16 | |
| 语言 | 11 种稳定（含**中文、日语、韩语**） | 对动漫/视觉小说项目重要 |
| 动漫风格 | ⚠️ 官方未明确专门支持 | 支持日语，Ref2VA 可注入动漫参考图，但无 live2d/动漫专用模型的开源证据 |

### 5.4 硬件需求真相（重点验证）

**原版 BF16 显存需求**：完整模型总内存占用 **123.6 GB**；ComfyUI 官方优化后最小变体仍需 **42.5 GB**。

**GitHub Issues 真实用户实测（铁证）**：
- `deepbeepmeep/Wan2GP #2065`：**RTX 3090(24GB) + 96GB RAM**，跑最小量化版，5 秒 **480p** 用了 **18.7GB 显存 + 67GB 内存**。720p 直接 OOM
- `griptape-ai/...diffusers #35`：开发者直言原版 BF16 全量推理需 **80GB+ VRAM**
- `intel/llm-scaler #585`（中文 issue）：显存到 **30G 左右就 OOM**，要求支持 1080P
- ComfyUI 官方 SGLang 部署示例用 **`--num-gpus 4`**（4 卡）

**量化版本权重大小**（FL2VA 模式，仅 DiT，不含文本编码器/VAE）：

| 版本 | DiT 大小 | 说明 |
|------|----------|------|
| BF16 原版 | 61.73 GB | 官方满血 |
| pruned-FP8 | 19.52 GB | 剪枝（AdaLN 预计算）+ FP8 |
| INT8-ConvRot | 31.70 GB | 完整版 INT8 |
| pruned-INT8-ConvRot | 19.53 GB | 剪枝版 INT8 |
| **GGUF Q3_K_M** | **14.50 GB** | 最低（黑机可选） |
| GGUF Q4_K_M | 18.50 GB | 主流低显存选择 |
| GGUF Q5_K_M | 22.25 GB | 质量较好 |
| NVFP4-awq | ~17 GB | 仅 Blackwell/40系支持 |

文本编码器 Qwen3-VL-32B 同样需要量化：BF16=47.97GB / INT8=25.28GB / GGUF Q4_K_M=13.58GB。

### 5.5 黑机可行性评估（RTX 4070 12G + 32G 内存）

| 维度 | 评估 | 说明 |
|------|------|------|
| **12G 显存** | 勉强够（量化版） | 必须用 GGUF Q3/Q4 或 pruned-FP8，且**必须开 CPU 卸载**（DiT 权重 14-18GB 本身超 12G） |
| **32G 内存** | ❌ **不够（硬瓶颈）** | Wan2GP 实测 480p 就要 67GB 内存。32G 极可能 OOM 或频繁换页卡死 |
| 跑哪个版本 | GGUF Q3_K_M(14.5GB) 或 pruned-FP8(19.5GB) | 走 Wan2GP LowVRAM 模式或 ComfyUI 动态卸载 |
| 分辨率 | 只能 480p | 768p 大概率 OOM（官方原生 768p） |
| 时长 | 建议 4-5秒 | 别碰 15秒 |
| 推理时长 | 单条 5秒 480p 预计 **10-20 分钟以上** | 对比 NGA 实测 4070Ti 16G 纯显存模式 960x544/5秒 要 5 分钟，12G 靠卸载会慢数倍 |

**NGA 真实实测**（`bbs.nga.cn` tid=47306216）：4070Ti(16GB) + 32GB RAM，960x544 的 5秒视频约 5 分钟，10秒约 15 分钟。这是 16G 显存的数据，12G 还要更慢。

#### 5.5.1 虚拟内存（页面文件）能补齐内存短板吗 -- 不能（纸上能跑，实际不能用）

**原理**：系统内存不够时，Windows 把不活跃内存页换到磁盘页面文件（pagefile）。理论上把虚拟内存设到 100GB+，32G 物理内存也能"不报 OOM"。

**实际代价**：

| 问题 | 原因 |
|------|------|
| **慢到不可用** | 内存↔显存搬运已慢，再加磁盘↔内存换页，是磁盘 IO（SSD ~2-3 GB/s）vs 内存（DDR4 ~30-50 GB/s）的差距，慢 10-20 倍 |
| 实际推理时长 | 本来 12G 靠卸载 5秒 480p 就要 10-20 分钟，上虚拟内存后预计 **30-60 分钟甚至更久**，全程磁盘狂转 |
| SSD 寿命损耗 | 大量换页 = 几十 GB 来回擦写 |
| 不稳定 | 换页高峰期易假死/卡死，可能跑一半失败白等 |

**结论**：虚拟内存 ≈ 纸上不报错，但无生产价值。验证"能不能跑通"可以设大 pagefile；做正式素材则不可行。

#### 5.5.2 加物理内存的可行性

升级到 64G 物理内存（DDR4 32G×2）能让 H3 在 480p 有可用的生产体验。但 **2026 年内存价格高涨，64G DDR4 套条约需近万元**，单为跑 H3 投入产出比极低。短期不值得为视频模型升级硬件。

### 5.7 开源版 vs 闭源 API 的区别

| 模块 | 开源？ | 能力 |
|------|--------|------|
| H3-Context-IR | ❌ 仅 API | 预处理与编排（多镜头编排、prompt 增强） |
| **H3-Base** | ✅ **开源** | 768p 原生音视频生成（FL2VA / Ref2VA） |
| H3-Regenerate-2K | ❌ 仅 API | 2K 重生成 |

**开源版能力缩水点**：无 2K、无多镜头编排系统、原生 1080p 目前 OOM。但核心生成能力（768p + 原声 + 全模态参考）完整保留。API 版的 video-01-live2d 类动漫专用能力**未在开源权重中体现**。

### 5.6 闭源 API 定价（2026-08-05 官方确认）

> 来源：院长从 MiniMax 官方定价页确认

**视频生成-输出价格**：

| 模型 | 分辨率 | 刊例价 |
|------|--------|--------|
| MiniMax-H3 | 2K | **0.80 元/秒** |
| MiniMax-H3 | 768P | **0.50 元/秒** |

**视频生成-输入素材价格**：

| 素材类型 | 计费规则 |
|----------|----------|
| 音频 | **免费** |
| 图片 | **5 张以内免费**，超出部分 0.20 元/张 |
| 视频（参考） | 按输入视频时长 × 生成分辨率：2K 0.80 元/秒，768P 0.50 元/秒 |

**视频再生成（768P -> 2K）**：

| 项目 | 价格 |
|------|------|
| 输出（768P→2K） | **0.30 元/秒** |
| 输入素材重新计费 | 音频免费；图片超 5 张 0.15 元/张；视频 0.30 元/秒 |

**视觉小说场景成本估算**（油画厚涂风，多模态参考传立绘）：

| 场景 | 计算方式 | 单价 |
|------|----------|------|
| 图生视频 5秒 768P（1张首帧图，免费） | 5 × 0.50 | **2.5 元** |
| 多模态参考 5秒 768P（3张立绘参考图，免费） | 5 × 0.50 | **2.5 元** |
| 多模态参考 5秒 768P（6张图，超1张） | 5 × 0.50 + 1 × 0.20 | **2.7 元** |
| 图生视频 10秒 768P | 10 × 0.50 | **5.0 元** |
| 直接 2K 5秒 | 5 × 0.80 | **4.0 元** |
| 先 768P 5秒 再升 2K 5秒 | 2.5 + 5×0.30 | **4.0 元**（与直接2K持平） |

**对项目的利好**：图片输入 5 张以内免费，视觉小说角色通常 1-3 张参考图就够（首帧 + 1-2 张角色参考），**输入成本为零**，只付输出秒数。一段 5 秒 768P 视频仅 2.5 元。

**与其他厂商横向对比**：

| 厂商/模型 | 分辨率 | 单价 | 充值门槛 |
|-----------|--------|------|----------|
| **MiniMax H3** | 768P | 0.50 元/秒 | 无 |
| **MiniMax H3** | 2K | 0.80 元/秒 | 无 |
| 通义万相 | 720P | ~0.9 元/秒 | 少量免费额度 |
| 通义万相 | 1080P | ~1.2-1.6 元/秒 | 少量免费额度 |
| 字节 Seedance 2.0 | 720p-4k | 待确认 | **充值 200 元** |

> H3 768P 0.50 元/秒是已确认价格中最便宜的国内厂商，且无充值门槛。Seedance 2.0 具体单价待登录控制台确认，但有 200 元充值门槛。两者取舍：H3 价格透明无门槛，Seedance 复用现有 Key 集成成本更低。

### 5.8 部署方式（黑机主力是 ComfyUI）

- **ComfyUI 原生支持**：PR `Comfy-Org/ComfyUI#15224` 已合并，节点 `EmptyMiniMaxH3LatentAV` / `MiniMaxH3ImageToVideo` / `MiniMaxH3ReferenceToVideo` 等，需 2026-08-03 之后的 ComfyUI 版本
- **官方 ComfyUI 量化版 + 工作流模板**：`huggingface.co/Comfy-Org/MiniMax-H3`
- **GGUF（最热门，84k 下载）**：`huggingface.co/Abiray/MiniMax-H3-GGUF`
- **低显存优化框架**：`github.com/deepbeepmeep/Wan2GP`（"8G可跑"说法出处）
- 第三方加速节点：`lihaoyun6/ComfyUI-MiniMaxH3-Cache`、`xmarre/ComfyUI-Spectrum-MiniMax-H3`、`HELIMIADICE/TE-Speed-MiniMaxH3-OSS`
- 其他部署框架：SGLang（官方推荐）、vLLM-omni、diffusers（PR 进行中）

### 5.9 与竞品对比（开源视频模型）

| 维度 | **MiniMax H3** | 腾讯 HunyuanVideo | 智谱 CogVideoX |
|------|----------------|-------------------|----------------|
| 参数量 | **33B**（开源最大之一） | 13B | 5B |
| 显存（BF16原版） | ~80GB+ | 45-60GB（720p/129帧） | 较低 |
| 单卡生成时间（720p） | 慢（33B最大） | 1卡 31.7分钟，8卡 5.6分钟 | 较快 |
| 原生音频 | **✅ 立体声** | ❌ | ❌ |
| 全模态参考 | **✅（图+视频+音频）** | ❌ | ❌ |
| 时长 | 4-15s | 129帧 | 6s/10s |
| 定位 | **开源能力最全（音视频+全参考），但最重** | 开源质量标杆 | 轻量入门 |

### 5.10 给视觉小说项目的建议

针对 RTX 4070 12G + 32G 黑机：

1. **短期走闭源 API，不本地跑 H3** -- 32G 内存是硬伤，虚拟内存方案纸上能跑实际不能用（见 6.5.1），64G 内存近万元不划算（见 6.5.2）
2. **优先用 MiniMax 官方 API**（H3 已上线 `hub.minimax.io`，768p 价格据称"不到主流 720p 的一半"），或直接用项目已有的 Seedance 2.0 API（见第四章，多模态参考对油画厚涂画风最契合）
3. 本地 ComfyUI 留给已有的生图工作流，不为视频模型分心
4. 动漫/lora 生态：H3 模型才发布 5 天（截至 2026-08-05），无油画厚涂风相关生态，需长期观察社区；日语支持是加分项

### 5.11 关键 URL

| 资源 | 地址 |
|------|------|
| 官方模型卡 | `huggingface.co/MiniMaxAI/MiniMax-H3` |
| 官方博客 | `minimax.io/blog/minimax-h3` |
| ComfyUI 官方博客 | `blog.comfy.org/p/minimax-h3-day-0-support-in-comfyui` |
| ComfyUI 原生支持 PR | `github.com/Comfy-Org/ComfyUI/pull/15224` |
| Comfy-Org 量化版+工作流 | `huggingface.co/Comfy-Org/MiniMax-H3` |
| GGUF（最热门） | `huggingface.co/Abiray/MiniMax-H3-GGUF` |
| 低显存框架（8G可跑出处） | `github.com/deepbeepmeep/Wan2GP` |
| awesome 汇总 | `github.com/wildminder/awesome-minimax-H3` |
| 真实显存反馈 issue | `github.com/deepbeepmeep/Wan2GP/issues/2065`（18.7GB VRAM+67GB RAM 跑 480p） |

---

## 六、MiniMax MCP（模型上下文协议接入）

> 来源：MiniMax 开放平台官方文档 `platform.minimaxi.com/docs/guides/mcp-guide`（2026-08-05 读取，28KB 全文）

### 6.1 MCP 是什么

MiniMax 提供官方的 **MCP server**（Python 版 + JS 版），让 Claude Desktop / Cursor / Windsurf / Cherry Studio / OpenAI Agents 等 AI 客户端**直接调用 MiniMax 的多模态能力，无需自己写 API 调用代码**。MCP（Model Context Protocol）是标准化"AI 应用访问工具"的开放协议，类比"AI 领域的 USB-C 接口"。

> ⚠️ 官方文档顶部 Tip：**「推荐使用 MiniMax CLI 替代 MCP，配置更简单、使用更高效」**。MiniMax 正在引导用户从 MCP 迁移到 CLI（`platform.minimaxi.com/docs/token-plan/minimax-cli`）。

### 6.2 10 个工具清单

| 工具 | 能力 | 备注 |
|------|------|------|
| `text_to_audio` | 文本合成语音（TTS） | speech-02-hd 等模型，支持情绪/语速/音调 |
| `list_voices` | 查询可用音色 | 系统/克隆/生成/音乐 全类型 |
| `voice_clone` | 克隆音色 | 传音频文件复刻声音 |
| `voice_design` | 文生音色 | 传描述词生成新音色 |
| `play_audio` | 播放音频文件 | |
| `music_generation` | 生成音乐（含人声） | prompt 风格 + lyrics 歌词 |
| **`generate_video`** | **文/图生视频** | ⚠️ 见 7.3，**不支持 H3** |
| **`image_to_video`** | **首帧图生视频**（仅 JS 版） | ⚠️ 不支持 H3 |
| `query_video_generation` | 查询异步视频任务状态 | |
| `text_to_image` | 文生图片 | image-01 / image-01-live |

### 6.3 关键发现：MCP 不支持 H3 ⚠️

`generate_video` 工具的 `model` 参数可选值：

```
MiniMax-Hailuo-02, T2V-01-Director, I2V-01-Director, S2V-01, I2V-01-live, I2V-01, T2V-01
```

**没有 H3**。H3 走的是独立的 **V2 REST API**（`/api-reference/video-generation-v2-create`），支持多模态 content 数组（文本/图片/视频/音频）、2K 直出、多模态参考生视频。这些 V2 能力**不在 MCP 工具覆盖范围内**。

**结论**：如果要用 H3 的多模态参考/2K/有声等核心能力，MCP 不是正确的接入路径，必须直接调 V2 REST API。

### 6.4 MCP 视频工具参数（generate_video）

虽不支持 H3，但旧模型仍可用，记录备用：

| 参数 | 含义 | 说明 |
|------|------|------|
| `prompt` | 视频描述 | 最大 2000 字符，与 first_frame_image 至少有一个 |
| `model` | 模型 | 默认 T2V-01，最强 MiniMax-Hailuo-02 |
| `first_frame_image` | 首帧图 | Base64 或 URL |
| `duration` | 时长（秒） | 01 系列固定 6；02 系列 512P/768P 可选 6/10，1080P 仅 6 |
| `resolution` | 分辨率 | 01 系列不支持设置；02 系列 6s 时 512P/768P/1080P，10s 时 512P/768P |
| `async_mode` | 异步模式 | true 返回 task_id，配合 query_video_generation 查询 |

### 6.5 接入方式

**Python 版**（`github.com/MiniMax-AI/MiniMax-MCP`）：
- 通过 `uvx minimax-mcp` 启动
- 传输方式：stdio（默认，本地）/ SSE（云端推送）

**JS 版**（`github.com/MiniMax-AI/MiniMax-MCP-JS`）：
- 通过 `npx minimax-mcp-js` 启动
- 传输方式：stdio / REST / SSE

**客户端配置**（以 Claude Desktop 为例）：
```jsonc
{
  "mcpServers": {
    "MiniMax": {
      "command": "uvx",
      "args": ["minimax-mcp"],
      "env": {
        "MINIMAX_API_KEY": "<你的 API Key>",
        "MINIMAX_MCP_BASE_PATH": "<本地输出目录>",
        "MINIMAX_API_HOST": "https://api.minimaxi.com",
        "MINIMAX_API_RESOURCE_MODE": "url"  // url|local
      }
    }
  }
}
```
Cursor / Cherry Studio / Windsurf 配置结构相同。

### 6.6 对项目的价值评估

| 维度 | 评估 |
|------|------|
| **视频生成（H3）** | ❌ MCP 不支持 H3，必须用 V2 REST API |
| **视频生成（旧模型）** | ⚠️ MCP 只支持到 Hailuo-02，能力弱于 H3 |
| **语音合成 / 音色克隆** | ✅ MCP 覆盖完整，对项目 R-024 配音系统有潜在价值 |
| **音乐生成** | ✅ 可为视觉小说生成 BGM |
| **图片生成** | ⚠️ image-01，项目已有 Seedream/Gemini 更强方案 |
| 接入成本 | 低（一套 API Key + 客户端配置，无代码） |
| 官方趋势 | 正被 MiniMax CLI 替代 |

**结论**：MCP 对视频生成（尤其 H3）无帮助；但其**语音和音乐工具**对项目 R-024（配音+配乐系统）可能有独立价值，值得在推进音频需求时单独评估。当前视频调研不依赖 MCP。

---

---

## 七、MiniMax H3 V2 API 完整规格（OpenAPI 原文整理）

> 来源：院长 2026-08-05 逐页复制官方 OpenAPI 规格（5 个文件、6 个接口），白机整理落档
> Base URL：`https://api.minimaxi.com` | 鉴权：`Authorization: Bearer <API_key>`
> 错误格式：OpenAI 风格（`type:error` + `error.type/message/http_code` + `request_id`）
> 任务记录窗口：7 天（UTC `[T-7天, T)`），过期返回 `invalid task_id`，视频下载链接有时效需及时转存

### 7.1 六个接口清单

| # | 接口 | 方法 / 路径 | 作用 |
|---|------|-------------|------|
| 1 | 创建视频生成任务 | `POST /v2/video_generation` | H3 核心：t2va / i2va(首帧/尾帧/首尾帧) / r2va(多模态参考) |
| 2 | 查询任务 | `GET /v2/query/video_generation/{task_id}` | 单任务状态与结果 |
| 3 | 查询任务列表 | `GET /v2/query/video_generation` | 分页 + 过滤（状态/任务ID/模型/类型） |
| 4 | 取消或删除任务 | `DELETE /v2/video_generation/{task_id}` | queued->取消(不扣费)；succeeded/failed->删记录；running/cancelled->不可操作 |
| 5 | 创建 H3-Context-IR 任务 | `POST /v2/h3_context_ir` | **只增强 prompt，不生成视频** |
| 6 | 创建视频再生成任务 | `POST /v2/video_regeneration` | 768P->2K 升级（两种模式） |

### 7.2 核心工作流：Full 2K-Workflow（三段链式）

H3 不是单接口，而是一条**导演级工作流**。完整链路：

```
H3-Context-IR（增强 prompt）  ->  视频生成（768P）  ->  视频再生成（768P->2K）
   POST /v2/h3_context_ir       POST /v2/video_generation   POST /v2/video_regeneration
```

**第一段 · H3-Context-IR**（接口5）：输入简单描述，输出**结构化导演脚本**--带分镜（[Shot 1] [Shot 2]）、运镜（slow push in / medium close-up）、音效（overall_soundscape）、配乐（non_diegetic_music）。文档明确"复杂系统，暂不提供开源实现"。此接口**只返回增强 prompt，不创建视频任务**，需拿到 `content.prompt` 后手动传给视频生成接口。

**第二段 · 视频生成**（接口1）：吃增强后的 prompt + 参考素材，产出 768P 视频（最便宜，0.50元/秒）。

**第三段 · 视频再生成**（接口6）：把 768P 升级到 2K（+0.30元/秒）。

> **对项目的意义**：H3-Context-IR 是被低估的利器。视觉小说的剧本片段（如"幸在塔顶对峙"）扔进去，出来的是带分镜+音效+配乐的完整视频脚本，对做剧情过场动画非常合适。

### 7.3 创建视频生成任务参数（接口1）

```jsonc
{
  "model": "MiniMax-H3",              // 必填，当前唯一值
  "content": [                         // 必填，多模态输入数组
    { "type": "text", "text": "..." },           // 必须有1个非空text(prompt)，≤7000字符
    { "type": "image_url", "image_url": {"url": "..."}, "role": "first_frame" },
    { "type": "image_url", "image_url": {"url": "..."}, "role": "last_frame" },
    { "type": "image_url", "image_url": {"url": "..."}, "role": "reference_image" },
    { "type": "video_url",  "video_url":  {"url": "..."}, "role": "reference_video" },
    { "type": "audio_url",  "audio_url":  {"url": "..."}, "role": "reference_audio" }
  ],
  "resolution": "768P",    // 必填，枚举：768P / 2K（无1080P）
  "duration": 5,           // 必填，枚举：4~15（每秒一档，共12档）
  "ratio": "16:9",         // 可选，默认adaptive。t2va必填且不能adaptive；i2va恒adaptive
  "callback_url": "https://...",   // 可选，回调(有challenge验证机制)
  "aigc_watermark": false           // 可选，默认false
}
```

**ratio 可选值**：`adaptive`(默认) / `21:9` / `16:9` / `4:3` / `1:1` / `3:4` / `9:16`

**互斥规则**：图生视频（first_frame / last_frame）与多模态参考（reference_image / reference_video / reference_audio）**不能混用**。

**五种生成场景**：

| 场景 | content 组合 | ratio |
|------|-------------|-------|
| 文生视频 t2va | 仅1个 text | 必填具体值，不能 adaptive |
| 图生-首帧 i2va | text + 1张图(first_frame或不填role) | 恒 adaptive |
| 图生-尾帧 | text + 1张图(last_frame) | 恒 adaptive |
| 图生-首尾帧 | text + 2张图(first_frame + last_frame) | 恒 adaptive |
| 多模态参考 r2va | text + reference_image(≤9) + reference_video(≤3) + reference_audio(≤3) | 可选，默认 adaptive |

**URL 资源引用 3 种方式**：
- 公网 URL
- `mm_file://{file_id}`（引用平台已有文件/历史产物）
- `data:<类型>/<格式>;base64,<Base64>` data URI（注意请求体总大小 ≤64MB，Base64 放大约33%，大文件勿用）

### 7.4 输入媒体限制

| 类型 | 格式 | 单文件 | 尺寸/数量限制 |
|------|------|--------|---------------|
| 图片 | JPG/JPEG/PNG/WEBP/HEIC/HEIF | ≤30MB | 宽高[256,5760]px，长宽比[0.4,2.5]，首帧≤1/尾帧≤1/参考图≤9 |
| 视频 | MP4/MOV（H.264/H.265+AAC/MP3） | ≤50MB | ≤3个，单段[2,15]s总≤15s，宽高[256,5760]px，帧率[23.976,60] |
| 音频 | WAV/MP3 | ≤15MB | ≤3个，单段[2,15]s总≤15s |

> 请求体总大小 ≤64MB，大文件用公网 URL 或 `mm_file://`，勿用 Base64。

### 7.5 查询任务（接口2）

`GET /v2/query/video_generation/{task_id}`

**任务状态**：`queued`(排队) -> `running`(运行) -> `succeeded`(成功) / `failed`(失败) / `cancelled`(已取消)

**成功响应**（视频生成）：
```jsonc
{
  "task": {
    "id": "424010985738629",
    "model": "MiniMax-H3",
    "status": "succeeded",
    "created_at": 1785125529,       // Unix秒
    "updated_at": 1785125946,
    "content": { "url": "https://...mp4" },  // 限时下载URL，需及时转存
    "resolution": "2K",
    "duration": 5,
    "ratio": "16:9",
    "usage": { "total_seconds": 5, "input_seconds": 0, "output_seconds": 5, "input_image_count": 0 },
    "task_type": "generation",      // generation / h3_context_ir / regeneration
    "modality": "video"             // video / text
  }
}
```

**失败响应**含 `error: { code: "1026", message: "video description contains sensitive content" }`。

**H3-Context-IR 成功响应**不同点：`content.prompt`（增强提示词文本）、`task_type: "h3_context_ir"`、`modality: "text"`、`usage` 为 token 计量（total_tokens/prompt_tokens/completion_tokens）。

### 7.6 查询任务列表（接口3）

`GET /v2/query/video_generation?page_num=1&page_size=20`

**过滤参数**（均可选）：
- `filter.status`：queued / running / succeeded / failed / cancelled
- `filter.task_ids`：按任务ID过滤（可多个）
- `filter.model`：如 `MiniMax-H3`
- `filter.task_type`：generation / h3_context_ir / regeneration

返回 `{ items: [...], total: 476 }`，items 中每个元素结构同查询任务接口。

### 7.7 取消或删除任务（接口4）

`DELETE /v2/video_generation/{task_id}`

| 任务状态 | 执行操作 | 说明 |
|----------|----------|------|
| `queued` | `cancelled` | 取消，尚未处理，无扣费 |
| `succeeded` / `failed` | `deleted` | 删除任务记录 |
| `running` | - | 不可操作，返回错误 |
| `cancelled` | - | 不可操作，返回错误 |

### 7.8 H3-Context-IR（接口5，prompt 增强器）

`POST /v2/h3_context_ir`

**请求参数**：`model` + `content`（同视频生成，多模态输入）+ `duration`（必填）+ `ratio`（可选）+ `callback_url`（可选）。**无 resolution 参数**（不生成视频）。

**输出**：`content.prompt`--一段结构化文本，包含：
- `integrated_multimodal_description`：分镜描述（[Shot 1] [Shot 2]...，含运镜、角色动作、场景细节）
- `overall_soundscape`：音效设计
- `non_diegetic_music`：配乐设计

**示例**（输入"史诗级太空歌剧院线预告：女舰长独自站在巨大观景窗前..."，输出节选）：
```
integrated_multimodal_description: [Shot 1] Cinematic, wide shot with a slow push in 
on a female captain standing center frame with her back to the camera. She has a slender 
build and short, swept-back silver hair, wearing a crisp, dark navy-blue futuristic 
military uniform... [Shot 2] At 00:02.800, the camera cuts to a medium close-up...
overall_soundscape: Deep, resonant low-frequency thrumming of ship engines, overlaid 
with rhythmic, high-pitched electronic beeps...
non_diegetic_music: Symphonic orchestral score, beginning with a slow, rising brass 
and string crescendo that abruptly cuts off...
```

**计费**：按 token（示例：total_tokens=9090, prompt_tokens=5664, completion_tokens=3426）

### 7.9 视频再生成（接口6，768P->2K）

`POST /v2/video_regeneration`

**两种模式（二选一）**：

| 模式 | 参数 | 说明 |
|------|------|------|
| 按任务ID | `source_task_id` | 传已有成功任务的 task_id，需开通白名单，源任务须属于当前账号+succeeded+7天内 |
| 按源视频 | `content` + `base_video` | content 中含1个 `role=base_video` 的视频项，**且必须原样附上生成768P时的最终prompt+所有素材** |

**base_video 硬约束**：
- 只能升级**自己生成的 H3 768P 视频**，不是任意视频通用处理
- 必须含音轨、24fps、宽高能被32整除、面积≤768×1344=1,032,192像素
- 总帧数 107-362 帧，每档递增 17 帧（约 4-15 秒）

> **成本策略**：先 768P 生成（0.50元/秒）再升 2K（0.30元/秒），合计 0.80元/秒，与直接 2K 生成（0.80元/秒）持平。但两段式可以先在 768P 验收效果，不满意不升 2K，省成本。

### 7.10 与 Seedance 的 V2 级对比

| 维度 | MiniMax H3 V2 | 字节 Seedance 2.0 |
|------|---------------|-------------------|
| Base URL | `api.minimaxi.com` | `ark.cn-beijing.volces.com/api/v3` |
| 鉴权 | Bearer API_key（MiniMax 平台） | API Key（火山引擎，项目已有） |
| 分辨率 | 768P / 2K（无1080P） | 480p/720p/1080p/4k |
| 时长 | 4-15秒（每秒一档） | 4-15秒（2.0）/ 4-12秒（1.5） |
| 多模态参考 | 图≤9 + 视频≤3 + 音频≤3 | 图0-9 + 视频0-3 + 音频0-3（相同） |
| **prompt 增强器** | ✅ H3-Context-IR（分镜+音效+配乐脚本） | ❌ 无 |
| 有声视频 | ✅ 原生立体声 | ✅ generate_audio |
| 尾帧链式 | ❌ 未提及 | ✅ return_last_frame |
| 样片预览 | ❌ 无 | ✅ draft 模式（1.5 Pro） |
| 价格 | 768P 0.50元/秒，2K 0.80元/秒 | 待确认（充值200元门槛） |
| 开通门槛 | 无 | 充值200元 |
| 联网搜索 | ❌ | ✅ web_search 工具（2.0） |
| 项目集成成本 | 需新增 MiniMax 服务 + API Key | 复用现有 VOLC_API_KEY |

**选型判断**：
- **要 prompt 增强（AI导演）** -> H3（Context-IR 独有能力）
- **要最低集成成本** -> Seedance（复用现有 Key）
- **要最高分辨率** -> Seedance（4K）
- **要最低价格+无门槛** -> H3（768P 0.50元/秒，无充值门槛）

---

## 八、待确认事项

| 事项 | 说明 |
|------|------|
| Seedance 1.5 Pro 开通条件 | 是否也需充值 200 元，还是仅 2.0 系列有此门槛 |
| 具体定价 | Seedance 2.0 单价待登录控制台确认。对比已确认的 H3（768P 0.50元/秒，无门槛），Seedance 有 200 元充值门槛，单价是否更优待查 |
| 动漫风效果验证 | Seedance 无 `style=anime`，需实际 PoC 验证 prompt + 多模态参考（传立绘）控制油画厚涂风的效果 |
| Seedance 2.5 上线时间 | PDF 标注"即将上线"，需关注官方动态 |
| 视频是否纳入路线图 | 本次为纯调研，是否将视频作为视觉小说 P1 增强需院长决策 |
| H3 黑机本地实测 | 32G 内存硬瓶颈，虚拟内存方案不可用（见 6.5.1），64G 内存近万元不划算（见 6.5.2）。短期走闭源 API，本地实测暂搁置 |
| H3 动漫/lora 生态 | 模型发布仅 5 天（截至 2026-08-05），无动漫专用模型/LoRA，需观察社区发展 |
| MiniMax API 定价 | ✅ 已确认（6.7节）。768P 0.50元/秒，2K 0.80元/秒，图片5张内免费，无充值门槛 |
| MiniMax MCP vs V2 API | MCP 不支持 H3（仅到 Hailuo-02），H3 必须走 V2 REST API。MCP 的语音/音乐工具对 R-024 配音系统有独立价值，待推进音频需求时评估 |
| MiniMax CLI | 官方推荐用 CLI 替代 MCP（`platform.minimaxi.com/docs/token-plan/minimax-cli`），待评估 CLI 是否覆盖 H3 |
