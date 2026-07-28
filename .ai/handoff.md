# AI 交接单

> 最后更新：2026-07-28（黑机：睿帝v2验收 + 杰v7验收 + 沐阳形象设计 + 发色速查表 + LoRA调研）
> 所在设备：黑机（台式 4070 12GB）
> 稳定版本：`9a31071`（设定集，本轮无代码改动）
> **当前阶段**：睿帝v2 + 杰v7 形象定稿验收通过，沐阳形象设计文档完成，LoRA训练搁置（数据集不足）

---

## 当前状态：睿帝 + 杰 形象定稿完成，沐阳形象设计文档完成

### 角色：睿帝 - v2 验收通过 ✅

| 项目 | 状态 |
|------|------|
| 精选图 | `.ai/comfyui-output/精选_睿/` 8张（v2全套角度） |
| 画风 | novaAnimeXL + epic_oil_painting_slider (w2.0) |
| 最终参数 | dpmpp_2m / karras / 30步 / cfg7 / 832×1216 |
| 提示词核心 | 1man, silver grey hair swept back, mature male, ivory white hooded robe, deep blue cloak |
| 画风探索 | v1~v9 共9轮，院长最终只保留 v2（纯油画厚涂风格） |

### 角色：杰 - v7 验收通过 ✅

| 项目 | 状态 |
|------|------|
| 精选图 | `.ai/comfyui-output/精选_杰/` 6张（v2两张 + v7四张） |
| 画风 | 同睿帝：novaAnimeXL + epic_oil_painting_slider (w2.0) |
| 最终参数 | IP-Adapter: v2_03参考图, weight=0.4, end_at=0.5 |
| 提示词核心 | masculine face, defined jawline + athletic muscular build, broad shoulders |
| 负面关键 | child, teenager, childish face, skinny, slender, lanky, baby face |
| 7轮调参 | v1银发错误->v2金发修正->v3-v4年龄调不动->v5 FLUX偏写实->v6偏幼->v7定稿 |

### LoRA 训练 - 搁置（数据集不足）

| 项目 | 结论 |
|------|------|
| 本机显卡 | RTX 4070 12GB |
| SDXL LoRA | ✅ 本机可训（需开 fp16+sdpa+gradient_checkpointing，约1-2.5h） |
| FLUX LoRA | ❌ 本机不可训（最低需24GB，需云端AutoDL租4090，约5-15元/次） |
| 数据集要求 | 15-30张高质量图，目前不足，待积累 |
| 工具 | kohya_ss（SDXL）/ ai-toolkit（FLUX） |

### 角色：沐阳（牧羊人）- 形象设计文档完成 ✅

| 项目 | 状态 |
|------|------|
| 设计文档 | `prd/01-需求文档/04-德塔/02-设计/形象设计/沐阳-形象设计.md` |
| 发色 | 纯白（pure white hair，70-80岁稀疏垂肩）|
| 出图 | ⏳ 待生成（排在出丘/出汪神之后）|
| 速查表 | `.ai/角色发色速查表.md`（生成图前必查发色，防杰v1银发翻车）|

### 设定集年龄体系修订

五角色年龄统一锁定（影响后续出图年龄提示词）：
| 角色 | 修订前 | 修订后 |
|------|--------|--------|
| 睿帝 | 约45岁 | 现40岁（弑君22岁）|
| 丘 | 约40岁 | 现30岁 |
| 杰 | 约24岁 | 现20岁（留学/条约年份同步调整）|
| 汪神 | 未明 | 现50岁（远征改A.V.118）|
| 牧羊人 | 未明 | 现80岁 |

---

## 关键技术经验

| 经验 | 说明 |
|------|------|
| SDXL年龄控制 | 关键词标签驱动，对年龄词极敏感，"boyish"->幼，"mature"->大叔，难精确控制 |
| FLUX年龄控制 | 自然语言直接生效，"24-year-old young adult man" 精确，但画风偏写实 |
| IP-Adapter用法 | weight=0.4 + end_at=0.5 = 只锁面部不干扰场景；weight=0.7太强会复刻构图 |
| IP-Adapter局限 | 会部分复刻参考图的服装元素（徽章、宝石等），LoRA能彻底解决 |
| 弯刀生成 | FLUX理解"curved Arabian scimitar"远优于SDXL；SDXL偶尔出直剑 |
| FLUX不理解否定词 | "NO beard"对FLUX无效，需正面描述"clean shaven" |

---

## ComfyUI 环境关键信息

| 项目 | 值 |
|------|-----|
| ComfyUI 路径 | `E:/ai/ComfyUI-aki(1)/ComfyUI-aki-v3/ComfyUI` |
| Python | `E:/ai/ComfyUI-aki(1)/ComfyUI-aki-v3/python/python.exe` |
| API 端口 | 8188 |
| 启动命令 | `cd ComfyUI && ../python/python.exe main.py --listen 127.0.0.1 --port 8188` |

**可用底模**：
| 模型 | 类型 | 画风 | 备注 |
|------|------|------|------|
| flux1-dev-fp8 (17G) | FLUX 12B | 写实/通用 | ✅ 可跑（euler/simple/cfg1-3.5） |
| Qpipi.com_novaAnimeXL_xlV10 (6.5G) | SDXL | 动漫/厚涂 | ✅ 当前主力底模 |
| waiIllustriousSDXL_v160 (6.5G) | SDXL | 二次元 | 先验太强，已弃用 |

**可用LoRA**：
| LoRA | 用途 |
|------|------|
| epic_oil_painting_slider.safetensors | 油画厚涂质感（w2.0） |
| oil_painting_slider.safetensors | 油画质感（备选） |
| impasto_virtuoso.safetensors | 厚涂笔触 |
| ClassipeintXL21.safetensors | 古典油画 |

**IP-Adapter**：
| 模型 | 路径 |
|------|------|
| ip-adapter-plus_sdxl_vit-h.safetensors | `models/ipadapter/` |
| CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors | `models/clip_vision/` |

**ComfyUI 插件**：
- ComfyUI_IPAdapter_plus（IP-Adapter面部参考）
- ComfyUI-GGUF（FLUX量化版加载）
- ComfyUI_UltimateSDUpscale（放大）
- rgthree-comfy

---

## 杰 v7 最终配方（可用于后续角色）

```javascript
// IP-Adapter工作流关键参数
IPAdapterModelLoader: "ip-adapter-plus_sdxl_vit-h.safetensors"
CLIPVisionLoader: "CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors"
IPAdapterAdvanced: weight=0.4, weight_type="linear", end_at=0.5, embeds_scaling="V only"
// clip_vision直接接CLIPVisionLoader输出，不要接CLIPVisionEncode（类型不匹配）

// 提示词模板
正面: 1boy, solo, handsome young man, 24 years old, masculine face, defined jawline,
      masculine facial features, clean shaven, [发色+发型], [服装], [场景],
      athletic muscular build, broad shoulders, strong frame, tall,
      thick oil painting, epic oil painting, impasto brushstrokes,
      western fantasy art, dramatic lighting, masterpiece, best quality, highly detailed
负面: lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit,
      fewer digits, cropped, worst quality, low quality, jpeg artifacts, signature,
      watermark, blurry, old man, middle aged, child, teenager, childish face,
      skinny, slender, lanky, thin frame, round face, baby face

// 采样器
KSampler: dpmpp_2m / karras / 30步 / cfg7 / 832×1216
```

---

## 下一步计划

1. **出丘**（黑发）- 用杰v7配方（IP-Adapter + 成年提示词），需先出一张好图做参考
2. **出汪神**（淡蓝发）- 同上
3. **沐阳出图**（纯白发）- 设计文档已完成，待出图
4. **积累数据集** - 等各角色精选图够15-30张后启动SDXL LoRA训练

---

## 图片位置索引

| 内容 | 路径 |
|------|------|
| 睿帝精选（8张） | `.ai/comfyui-output/精选_睿/` |
| 杰精选（6张） | `.ai/comfyui-output/精选_杰/` |
| 睿帝全部实验 | `.ai/comfyui-output/rui_poc/v1~v9/` |
| 杰全部实验 | `.ai/comfyui-output/jie_poc/v1~v7/` |
| ComfyUI原始输出 | `E:/ai/ComfyUI-aki(1)/ComfyUI-aki-v3/ComfyUI/output/` |
| 完整管理规范 | `.ai/comfyui-output/README.md` |
