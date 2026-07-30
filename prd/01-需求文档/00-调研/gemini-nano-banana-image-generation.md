# 生图能力调研（Gemini / 豆包 Seedream API / Seedream 网页版）

> 调研时间：2026-07-30
> 调研人：ZCode（AI）
> 触发原因：院长要求扩充出图工具链，先后调研了 Gemini/Nano Banana 与火山引擎豆包 Seedream API，评估三者对德塔视觉小说出图管线的适配性
> 主要来源：ai.google.dev 官方文档、seedream.pro、火山引擎方舟文档（docs.volcengine.com）、院长提供的豆包 Seedream API 硬参数
> 关联文档：`美术设计/美术设计规范.md`、`美术设计/Seedream网页生图操作指南.md`、各角色形象设计文档

---

## 一、结论（TL;DR）

**三方对比后，首选「火山引擎豆包 Seedream API（Pro 版）」** --它把项目原用的 Seedream 网页版 API 化，补上了网页版最大的短板（无 API），且单张 0.3 元、国内直连、复用现有火山引擎 Key，接入成本最低。Gemini 3 Pro Image 因参考图分类机制（角色/风格分离）更优，作为备选保留。Seedream 网页版继续做免费兜底。

接入前**必须先实测确认**：豆包 API 的参考图机制（是否分类）、角色一致性是否与网页版相当、奇幻战斗场景的审核严格度。

---

## 二、项目美术现状（决定选型的背景）

| 维度 | 现状 |
|---|---|
| 画风 | 油画厚涂（novaAnimeXL + epic_oil_painting_slider LoRA），关键词 `thick oil painting, western fantasy art` |
| 资产规格 | 立绘 832×1216 透明 PNG、背景 1920×1080、CG 1920×1080 |
| 现有工具链 | ComfyUI（批量脸模，黑机 RTX 4070）+ Seedream（剧情插画/多人同框，网页免费无API） |
| 核心痛点① | Seedream 无参考图的纯文生图**偏中国古风**，必须上传油画参考图锁风格 |
| 核心痛点② | 角色一致性靠 prompt+参考图**隐式引导**，跨图不稳，需反复抽卡 |
| 核心痛点③ | 多人同框易出**拼图感**，需强调"同一场景统一透视" |
| 角色 | 9 个形象设计文档齐全（睿/杰/丘/汪神/沐阳/法刺幸/法刺荣/添/院长见） |

痛点①② 是 Seedream 的结构性局限（参考图不分类、隐式引导），Gemini 3.x 的分类参考机制正是为此设计。

---

## 三、Gemini 生图全系能力（截至 2026-07，四档已 GA）

| 代号 | 模型名 | 定位 | 参考图机制 | 最高分辨率 | 单张成本(Standard) |
|---|---|---|---|---|---|
| Nano Banana | `gemini-2.5-flash-image` | 入门快速 | 混合，不分类 | 1K | $0.039 |
| Nano Banana 2 Lite | `gemini-3.1-flash-lite-image` | 超低延迟、高并发 | 物体10+角色4 | 1K | $0.034 |
| Nano Banana 2 | `gemini-3.1-flash-image` | 通用主力，支持视频输入 | 物体10+角色4 | 4K | 1K $0.067 / 4K $0.151 |
| **Nano Banana Pro** | `gemini-3-pro-image` | **旗舰** | **物体6+角色5+风格3** | 4K | 2K $0.134 / 4K $0.24 |

### 3.1 最关键的升级：参考图分类机制（3.x）

3.x 系列把参考图拆成三类独立通道，正是视觉小说立绘最需要的：

| 参考类型 | Nano Banana 2 (Flash) | Nano Banana Pro | 说明 |
|---|---|---|---|
| 物体参考图 | 最多 10 张 | 最多 6 张 | 需出现在最终图中的物体 |
| **角色参考图** | **最多 4 张** | **最多 5 张** | 保持角色外观一致性（立绘核心）-> 解决痛点② |
| **风格参考图** | - | **最多 3 张** | 风格参考（油画风复现核心）-> 解决痛点① |
| 合计上限 | 最多 14 张 | 最多 14 张 | 三类可组合 |

> Pro 是全系列**唯一同时支持角色参考 + 风格参考**的模型。

### 3.2 其他能力

- **文生图 / 图像编辑 / 文字渲染**：全系列延续 Gemini 2.5 优势并增强；文字渲染是该系列相对 SD 系的核心卖点（图中英文文字准确度高）
- **图像编辑**：原生支持换背景/换动作/换表情/局部重绘/整体改氛围，通过多轮对话实现（`previous_interaction_id` 串联上下文）
- **视频输入**：仅 `gemini-3.1-flash-image` 支持（YouTube URL 或本地视频作为上下文生图）
- **联网搜图**：可挂 `google_search` 工具，用网络图片作为视觉上下文
- **思考模式**：Pro/Flash 支持 `thinking_level: high`，复杂构图时开启可提升质量

### 3.3 技术参数

| 参数 | 值 |
|---|---|
| 输出张数 | 单次请求 1 张 |
| 宽高比 | 1:1、3:2、2:3、3:4、4:3、4:5、5:4、9:16、16:9、21:9（全系列统一，含 3:4 立绘、16:9 背景） |
| 水印 | SynthID 不可见水印 |
| 免费额度 | **四档全部无 free tier**，必须绑卡付费 |
| Batch API | 所有模型均有半价 Batch 层（处理可能长达 24 小时，适合非实时批产） |
| 速率限制 | 官方未公布通用 RPM/RPD，需登录 AI Studio Rate Limits 页面按账号层级查看；预览模型限制更严，Batch API 可获更高配额 |
| 网页端 | 可在 AI Studio（aistudio.google.com）、gemini.google.com 直接用 |
| GA 状态 | 四档全部 Stable / GA，无需 waitlist |

### 3.4 定价明细（Standard 层）

| 模型 | 输入（/百万 token） | 输出（按图） |
|---|---|---|
| `gemini-2.5-flash-image` | $0.30 | $0.039/张 |
| `gemini-3.1-flash-lite-image` | $0.25 | $0.0336/张（1K） |
| `gemini-3.1-flash-image` | $0.50 | 0.5K $0.045 / 1K $0.067 / 2K $0.101 / 4K $0.151 |
| `gemini-3-pro-image` | $2.00（或 $0.0011/张输入图） | 1K/2K $0.134 / 4K $0.24 |

- Batch / Flex 层均为 Standard 半价；Priority 层加价约 1.8 倍
- Vertex AI 同样提供这些模型，适合企业级配额与合规；旧 Imagen 端点已建议迁移至 `gemini-2.5-flash-image`

---

## 四、与 Seedream.pro 对比

项目当前在用 Seedream.pro（字节跳动 Seedream 系网页工具，免费、无水印、可商用，无公开 API）。

| 维度 | Seedream.pro | Gemini 3 Pro Image |
|---|---|---|
| 价格 | **免费、无水印、可商用** | 付费（无免费层），Pro 2K $0.134/张 |
| 参考图 | 最多 4 张，**混合不分类** | **6物体+5角色+3风格**，分类引导 |
| 角色一致性 | 隐式，跨图不稳，需反复抽卡 | **专用角色通道，显著更强** |
| 油画风保持 | 隐式，纯文生图偏中国风 | **专用风格通道，稳定复现** |
| 接入 | 网页手动，**无 API** | REST/SDK，**可编程集成进 ComfyUI** |
| 文字渲染 | 宣传 accurate text | 原生多模态强项 |
| 输出分辨率 | 高清，比例 1:1/9:16/16:9/4:3/21:9 | 最高 4K，10 种宽高比 |
| 内容审核 | 相对宽松 | **Google 过滤较严（待实测）** |
| 本地化/可控 | 网页手动操作为主 | 可脚本化批量生产 |

**核心互补**：Seedream 胜在免费兜底；Gemini 胜在**分类参考 + 可编程 + 4K + 文字渲染**，但需付费且审核更严。

---

## 四-B、火山引擎豆包 Seedream API（关键补充，2026-07-30 新增）

院长补充发现：火山引擎方舟平台提供 **豆包 Seedream 5.0 的 API 版本**（模型与 seedream.pro 网页同源，均为字节 Seedream 模型，但 API 化后可编程集成）。这直接改变了选型格局--它补上了 Seedream 网页版最大的短板「无 API」。

### 4B.1 两档模型与定价（院长提供，硬参数）

| 模型ID | 定位 | 价格 | IPM限制 |
|---|---|---|---|
| `doubao-seedream-5-0-pro-260628` | **Pro 版**（主力） | 输出≤236万像素：**插入图首张免费、0.02元/张，输出图 0.3元/张**；输出>236万像素：输出图 0.6元/张 | 500 |
| `doubao-seedream-5-0-260128` | 标准版 | **0.22元/张**（最高 4096×4096） | 500 |

- **自定义分辨率**：总像素范围 921,600（≈1280×720）~ 4,624,220（约460万像素）
- **API Key**：与火山引擎现有 Key 通用（项目已有火山引擎账号）
- 产品文档：https://docs.volcengine.com/docs/82379/1541523

### 4B.2 能力（官方 PDF 确认，2026-07-30 更新）

> 院长下载了火山方舟《图片生成 API》PDF（`prd/01-需求文档/00-调研/火山方舟_图片生成 API_1784604808.pdf`），关键技术参数已确认。

| 能力 | 结论 | 依据 |
|---|---|---|
| 文生图 | ✅ 支持 | 院长确认 + PDF endpoint `POST /api/v3/images/generations` |
| 图生图 | ✅ 支持 | PDF `image` 参数（string 或 string[]） |
| 角色一致性 | 🟡 与网页版同源，预期相当（项目评级5星） | 同源模型；**参考图机制确认是混合引导非分类，见下** |
| **参考图机制** | ⚠️ **混合不分类**（关键）| PDF：`image` 为 string[] 数组，无角色/物体/风格分类标注。**与网页版一致，不如 Gemini 的分类通道** |
| 参考图张数上限 | 5.0 pro 最多 **10 张**；5.0 lite/4.5/4.0 最多 **14 张** | PDF 明确 |
| 参考图格式 | jpeg/png/webp/bmp/tiff/gif/heic/heif；单张最大 30MB、≤6000×6000、宽高比[1/16,16] | PDF |
| **水印** | ⚠️ 默认加「AI生成」水印，**可 `watermark:false` 关闭**（对项目重要） | PDF |
| **交互编辑** | ✅ **5.0 pro 独有**：坐标/框选/箭头指定编辑位置，精准精修 | PDF |
| fast模式 | ✅ `optimize_prompt_options.mode=fast`（standard质量优但慢，fast更快） | PDF |
| 组图 | 5.0 pro ❌不支持；lite/4.5/4.0 ✅（`sequential_image_generation=auto`，最多15张） | PDF |
| 联网搜索 | 仅 5.0 lite 支持（`tools.type=web_search`） | PDF |
| 可编程接入 | ✅ **REST API**（解决网页版无API痛点） | endpoint + 模型ID |
| 国内直连 | ✅ **无需翻墙** | 火山引擎北京区 `ark.cn-beijing.volces.com` |
| 组图/连续生成 | 🟡 5.0 pro ❌不支持组图（只生单图）；lite/4.5/4.0 ✅组图（最多15张，参考图+生成图≤15） | PDF 修正 |
| 文字渲染 | ❓ PDF 全文未提及文字渲染能力，待实测 | docling OCR 通读 PDF 确认 |

**参考图机制的重要结论**：豆包 Seedream API 的 `image` 参数是**混合数组**（把角色图、风格图、物体图混在一起传），模型自行理解，**没有像 Gemini 那样的角色/物体/风格分类通道**。这意味着：
- 豆包 = API 化的网页版 Seedream（解决"无API"，但参考图引导方式不变）
- Gemini Pro 在参考图分类机制上**仍机制更优**（但更贵、需翻墙）
- 二者的取舍是「价格+国内直连」vs「参考图分类精度」

### 4B.3 API 调用参数（docling OCR 通读 PDF 完整确认）

**端点**：`POST https://ark.cn-beijing.volces.com/api/v3/images/generations`
**鉴权**：Bearer + 火山引擎 API Key（与现有 Key 通用）
**支持模型**：Doubao Seedream 5.0 pro / 5.0 lite / 4.5 / 4.0（均同一 endpoint）

**Body 请求参数**：

| 参数 | 类型 | 说明 |
|---|---|---|
| `model` | string 必选 | 模型ID，如 `doubao-seedream-5-0-pro-260628`；或 Endpoint ID |
| `prompt` | string 必选 | 提示词，支持中英文；建议≤300汉字/600英文单词，过多会忽略细节 |
| `image` | string / string[] | 参考图，URL 或 Base64（`data:image/png;base64,<base64>`）；pro 最多10张，lite/4.5/4.0 最多14张 |
| `size` | string | 输出尺寸。方式1：分辨率档位（`1K`/`2K`/`3K`/`4K`，在prompt描述宽高比）；方式2：宽高像素（`2048x1024`）。不可混用 |
| `watermark` | bool 默认true | **水印开关**：true=右下角加「AI生成」水印；false=不加水印（**项目立绘应设false**） |
| `optimize_prompt_options.mode` | string 默认standard | `standard`（质量优但慢）/ `fast`（更快，时延敏感用） |
| `output_format` | string 默认jpeg | 输出格式：`png`/`jpeg`（仅 5.0 pro/lite 支持） |
| `response_format` | string 默认url | 返回格式：`url`（24h有效链接）/ `b64_json`（base64） |
| `sequential_image_generation` | string 默认disabled | 组图：`auto`（自动判断）/ `disabled`（仅单图）。**仅 lite/4.5/4.0 支持，pro 不支持组图** |
| `sequential_image_generation_options.max_images` | int 默认15 | 组图最大张数[1,15]，且 参考图数+生成图数≤15 |
| `stream` | bool 默认false | 流式输出（仅 lite/4.5/4.0） |
| `tools` | object[] | 工具配置，仅 5.0 lite 支持 `web_search` 联网搜索 |

**各模型能力差异（PDF 确认）**：

| 能力 | 5.0 pro | 5.0 lite | 4.5 | 4.0 |
|---|---|---|---|---|
| 文生图/单图生图/多图生图(单图输出) | ✅ | ✅ | ✅ | ✅ |
| 组图生成 | ❌ | ✅ | ✅ | ✅ |
| 交互编辑(坐标/框选/箭头精准编辑) | ✅ 独有 | - | - | - |
| 联网搜索(web_search) | ❌ | ✅ | ❌ | ❌ |
| 流式输出 | ❌ | ✅ | ✅ | ✅ |
| 参考图上限 | 10张 | 14张 | 14张 | 14张 |

**分辨率映射表（立绘比例 3:4 相关，PDF 确认）**：

项目立绘规格 832×1216 接近 3:4。各模型在 `size` 方式1（指定档位）下 3:4 比例的实际像素：

| 模型 | 档位 | 3:4 宽高像素 |
|---|---|---|
| 5.0 pro | 1K | 864×1152 |
| 5.0 pro | 2K | 1776×2368 |
| 5.0 lite / 4.5 / 4.0 | 2K | 1728×2304 |
| 5.0 lite / 4.5 | 3K | 2592×3456 |
| 5.0 lite / 4.5 / 4.0 | 4K | 3520×4704 |

> pro 只支持 1K/2K 两档；项目立绘用 pro 2K 即 1776×2368，超出现有规格 832×1216，后续抠图缩放即可。背景图 16:9 用 pro 2K = 2816×1584。

### 4B.4 价格横向对比（单张立绘，2K≈300万像素级）

| 方案 | 单张成本 | 可编程 | 国内直连 |
|---|---|---|---|
| Seedream 网页版 | 免费 | ❌ 无API | ✅ |
| **豆包 Seedream API (Pro)** | **0.3元/张**（≤236万像素）| ✅ | ✅ |
| 豆包 Seedream API (标准) | 0.22元/张 | ✅ | ✅ |
| Gemini 2.5 Flash | $0.039（≈0.28元）| ✅ | ❌ 需翻墙 |
| Gemini 3 Pro Image (2K) | $0.134（≈0.97元）| ✅ | ❌ 需翻墙 |

**价格结论**：豆包 Seedream API Pro（0.3元/张）比 Gemini Pro 2K（约0.97元）便宜约 3 倍，且国内直连、复用现有火山引擎 Key，接入成本最低。

---

## 五、选型建议与落地路径

### 5.1 选型（2026-07-30 修订：豆包 Seedream API 加入后格局变化）

经对比，**首选方案调整为「豆包 Seedream API（Pro 版）」**，而非原定的 Gemini Pro。理由：

| 决策因素 | 豆包 Seedream API Pro | Gemini 3 Pro Image |
|---|---|---|
| 单张成本 | **0.3元/张**（≤236万像素） | 约0.97元/张（2K），贵3倍 |
| 国内直连 | ✅ 火山引擎，无需翻墙 | ❌ 需翻墙 |
| 可编程接入 | ✅ REST API | ✅ REST API |
| 现有账号 | ✅ **复用火山引擎 Key** | 需新开 Google 账号绑卡 |
| 角色一致性 | 🟡 同源网页版已验证5星，API 预期相当 | ✅ 专用角色通道（机制更优） |
| 油画风保持 | 🟡 图生图传参考图锁风格（已验证可行） | ✅ 专用风格通道（机制更优） |
| 参考图分类 | ⚠️ **混合不分类**（image 数组，pro 最多10张）| ✅ 角色/物体/风格三类（最多14张）|

**关键判断**：豆包 Seedream API 在**价格、接入成本、国内直连**上全面占优；参考图机制确认是**混合不分类**（`image` 数组，pro 最多10张），不如 Gemini 的角色/物体/风格分类通道。鉴于项目已在网页版 Seedream 上验证过角色一致性和油画风（需传参考图）的可用性，且 API 版同源、混合引导方式与网页版一致，**先用豆包 Seedream API 做验证**最经济。Gemini Pro 作为参考图分类机制更优的备选方案保留。

### 5.2 落地三阶段（修订）

**第一阶段（验证，豆包 Seedream API Pro，成本可控）**--写最小脚本调 API，不接 ComfyUI：
- 用 1 张院长立绘做图生图参考 + 文本 prompt 描述换动作/表情
- 验证 3 点：①API 版角色一致性是否与网页版相当 ②油画风是否稳定（传油画参考图）③奇幻战斗 prompt 是否触发审核
- 调用参数：模型 `doubao-seedream-5-0-pro-260628`，分辨率建议 ≈236万像素以内（如 1280×1840 立绘比例，单张0.3元）
- go/no-go 门槛；同时记录参考图机制细节（是否分类）

**第二阶段（接入 ComfyUI）**：验证通过后，写 ComfyUI 自定义节点接火山引擎 REST API，输入端「参考图 + prompt」，输出端接现有抠图/处理链。

**第三阶段（工作流分工）**：
- 立绘（角色一致性要求高）-> **豆包 Seedream API Pro**（首选）/ Gemini 3 Pro Image（备选，参考图分类更强）
- 背景图（风格一致、无特定角色）-> Seedream 网页版免费，或豆包 Seedream API 标准版（0.22元/张）
- 文字渲染（UI/标题）-> Gemini（文字强项，待实测豆包文字能力）
- 批量产非关键图 -> Seedream 网页版兜底省成本

### 5.3 降级方案

- 若豆包 Seedream API 角色一致性不达标 -> 升级到 Gemini 3 Pro Image（专用角色+风格参考通道）
- 若 Google/Gemini 安全过滤严重影响奇幻战斗场景 -> 该类图改走豆包 Seedream API / ComfyUI 本地 SD 管线

---

## 六、待验证风险与信息可信度

### 6.1 必须实测确认的风险（不宜直接铺代码）

1. **豆包 Seedream API 参考图机制已确认（✅ 已解决）**：官方 PDF 确认 `image` 参数为混合 string[] 数组，不分类；5.0 pro 最多10张、lite/4.5/4.0 最多14张。与网页版同源，混合引导非 Gemini 式分类。
2. **豆包 Seedream API 角色一致性**（待实测）：同源网页版已验证5星，但 API 版实际效果需调 API 实测。
3. **内容审核**：Google 全系列图像生成默认走安全过滤，对刀剑/施法/受伤的奇幻战斗场景**可能误判拒图**（基于 Google 通用安全策略的推断，未获实测确认）；豆包火山引擎的审核严格度同样待实测。
4. **速率限制**：Gemini 官方未公布通用 RPM/RPD，需登录 AI Studio 按账号层级查看；豆包标注 IPM=500（每分钟图片数），相对明确。
5. **文字渲染**：火山 PDF 全文（docling OCR 提取）未提及文字渲染能力，待实测豆包 API 实际效果。

### 6.2 信息可信度分级

- **高可信**（官方/院长直接确认）：Gemini 四档产品线/模型名/定价/参考图分类/分辨率阶梯；豆包两档模型ID/定价/分辨率范围/IPM=500。
- **中可信**（机制推断）：豆包 API 角色一致性/油画风保持预期与网页版相当（同源模型）；内容审核对奇幻战斗偏严（通用策略推断）。
- **未确认**：豆包文字渲染能力（PDF 未提及）；豆包角色一致性实际效果（待 API 实测）；Gemini 具体 RPM/RPD；社区实测优缺点与已知 bug（本轮社区源抓取超时或被验证拦截，未取到一手社区帖）。

---

## 七、文档修订记录

| 日期 | 修订 |
|---|---|
| 2026-07-30 | 初版：Gemini 全系调研 + Seedream 网页版对比，选型 Gemini 3 Pro Image |
| 2026-07-30 | **修订**：新增火山引擎豆包 Seedream API（§四-B），首选方案改为豆包 Seedream API Pro（更便宜/国内直连/复用火山Key），Gemini Pro 降为备选。选型与落地路径同步更新 |
| 2026-07-30 | **补充**：读官方 PDF 确认豆包参考图机制为混合 `image` 数组（不分类，pro 最多10张），补 §4B.2/4B.3 API 参数；选型表参考图分类项从 ❓ 改为 ⚠️ 确认混合不分类；待验证风险 #1 标记已解决 |
| 2026-07-30 | **完整读取**：用 docling OCR 全文提取火山 PDF（pdftotext 中文乱码，改用 docling 全页 OCR 成功），补全水印可关/交互编辑/fast模式/组图限制/各模型能力差异表/完整请求参数表/分辨率映射表 |

## 附录：API 请求体示例（REST）

端点：`POST https://generativelanguage.googleapis.com/v1beta/interactions`

```json
{
  "model": "gemini-3-pro-image",
  "input": [
    {"type": "text", "text": "西方奇幻油画风，精灵法师站姿立绘，手持法杖"},
    {"type": "image", "mime_type": "image/png", "data": "<角色参考图 base64>"},
    {"type": "image", "mime_type": "image/png", "data": "<风格参考图 base64>"}
  ],
  "response_format": {
    "type": "image",
    "aspect_ratio": "3:4",
    "image_size": "2K"
  },
  "generation_config": {"thinking_level": "high"}
}
```

> 注意：`image_size` 必须用大写 K（`"2K"` 而非 `"2k"`）。参考图的角色/物体/风格分类在 SDK 层通过标注实现，REST 层在 input 中按顺序传入。多轮编辑用 `previous_interaction_id` 串联上下文。
