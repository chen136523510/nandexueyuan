# AI 交接单

> 最后更新：2026-07-29（白机：R-026/R-027 开发 + 全文档同步审计）
> 所在设备：白机（荣耀便携本）
> 稳定版本：已 commit，最新 commit `03140f5`（master）
> **当前阶段**：M-G1 引擎核心 PoC 完成 + R-026 自我命名 + R-027 储物空间 已开发验证

---

## 白机本轮产出（2026-07-29）

### R-026 自我命名系统 + R-027 储物空间系统 ✅ 已开发验证

**代码变更**（11 文件，2 新建，commit `7643964`）：
- `engine/types.js` -- 新增 INPUT 节点类型 + ItemType 枚举
- `engine/engine.js` -- getNextNodeId 处理 input + executeEvent 支持 grantItem
- `data/items.js` -- **新建**，睿帝令物品定义（纳戒=背包本身不入物品列表）
- `stores/visualNovelStore.js` -- inventory/playerName/submitInput/hasItem/{playerName}模板替换/持久化
- `components/InventoryPanel.vue` -- **新建**，背包面板（网格+详情弹窗）
- `components/DialogueBox.vue` -- input 输入框渲染
- `components/QuickMenu.vue` -- 背包按钮
- `views/NdeVisualNovelView.vue` -- 挂载 InventoryPanel + B 键 + input 屏蔽 Enter
- `server/.../visualNovelController.js` + `schema.prisma` -- inventory 字段 + migration

**验证结果**（浏览器实测全通过）：
1. ✅ input 节点：输入框出现 -> 输入名字 -> {playerName} 替换正确
2. ✅ event grantItem：物品进入背包
3. ✅ B 键打开/关闭背包面板
4. ✅ 物品详情弹窗（图标/名称/类型/描述）
5. ✅ QuickMenu 背包按钮可用
6. ✅ 刷新页面后 inventory 持久化正常

### 地图系统设计文档 ✅ 已记录

- 新建 `剧情设计/地图系统设计.md` -- 大地图6地点+小地图区域细分+解锁条件+学院-势力关系
- 睿河大桥命名确定：帝国称「南方大桥」，草原人称「帝桥」

### 全文档同步审计 ✅ 已完成

- `00-基础数据/世界观.md` -- V4：标注指向设定集v1.3，历史方案归档
- 设定集文件重命名 `v1.0` -> `v1.3`，7 个引用链全部更新
- 三份废弃文档移入 `归档-旧版本/`（形态重构战略规划/开发路线与占位策略）
- `04-德塔/changelog.md` -- 补 R-018~R-020/R-026/R-027 + 方向废弃条目
- `README.md` -- 修复部署章节矛盾（game-server 已废弃不启动）
- `pm/需求池.md` -- R-019/R-020 从待开发移至已完成，R-026/R-027 登记已完成

### 下一步计划

1. **黑机任务**：
   - 序章剧情大纲完善（连酒馆 AI）
   - 睿/杰/丘立绘替换占位色块（路径：`/visualnovel/portraits/角色名/表情.png`）
   - 背景图替换 CSS 渐变占位（路径：`/visualnovel/bg/场景名.jpg`）
   - 大地图线稿（院长提供线稿，黑机生成）
2. **M-G2**：序章完整（R-028 剧本重写）+ 手机/消息系统（R-021）

---

## 以下为黑机上轮交接内容（保留备查）

---

## 当前状态：德塔方向废弃 + 视觉小说 重构，占位页已上线

### 德塔 视觉小说 重构（2026-07-29 院长确认）

| 项目 | 状态 |
|------|------|
| 方向决策 | 废弃 2D 游戏（Phaser/Colyseus/俯视角全部停止），改为 视觉小说（叙事驱动+立绘+背景+对话+分支） |
| 前端占位页 | `src/views/NdeRebuildingView.vue` 已创建，`/nde` 路由已切换 |
| 旧代码 | GameView.vue / game/ / game-server/ 废弃保留不删，路由已断开 |
| 公告 | v2.2.0 已新增："原德塔设计废弃，正处于重构中" |
| 文档 | 德塔README/设计README/PRD/ROADMAP/CHANGELOG/根README/AGENTS 全部同步 |
| 保留资产 | 设定集v1.3 + 5角色形象设计 + AI出图精选 + ComfyUI管线 |

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

### 角色：丘 - 双形态定稿 ✅

| 项目 | 状态 |
|------|------|
| 精选图 | `.ai/comfyui-output/精选_丘/` 6张（游侠2 + 总统4）|
| 画风 | 同睿帝/杰：novaAnimeXL + epic_oil_painting_slider (w2.0) |
| 形态 | v1游侠（森林+绿斗篷+皮甲+箭袋+长弓）+ v2总统（墨绿礼服+钢笔+议会）|
| 最终参数 | dpmpp_2m / karras / 30步 / cfg7 / 832×1216 / 纯提示词（无IP-Adapter）|
| 提示词核心 | raven black hair（不用black hair，novaAnimeXL会偏蓝）|
| 游侠精选2张 | v1_01森林正面持弓 / v1_03森林侧面 |
| 总统精选4张 | v2_01议会签署 / v2_02议会演讲 / v2_03侧面立领 / v2_04深夜批文 |
| POC归档 | `qiu_poc/v1_ranger/` + `qiu_poc/v2_president/`（含params.md）|

**胡茬实验结论（重要）**：
- 院长要求"剃过胡子有点小渣"的感觉
- 尝试5次全失败：提示词权重1.5、realistic skin texture、img2img denoise 0.35/0.55
- 根因：novaAnimeXL是动漫底模，默认光滑脸先验太强，提示词打不过
- 院长最终确认：保持光滑脸，画风统一优先
- 备选方案（未用）：找male stubble LoRA / 换写实底模（会破坏画风统一）

**丘出图关键经验**：
| 问题 | 解法 |
|------|------|
| black hair偏蓝 | 用 `raven black hair` 替代 |
| 总统vs游侠区分 | 负面提示词互斥：总统排除forest/bow/arrow/cape/hood，游侠排除议会元素 |
| ComfyUI卡死VRAM不足 | 重启ComfyUI + `--lowvram` 模式 + 一张一张提交（不批量）|

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
| 启动命令 | `cd ComfyUI && ../python/python.exe main.py --listen 127.0.0.1 --port 8188`（显存不足时加 `--lowvram`）|

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

1. **出汪神**（淡蓝发，50岁，水元素+王者气质）- 用杰v7配方 + 丘经验
2. **沐阳出图**（纯白发）- 设计文档已完成，待出图
3. **视觉小说 重构规划** - 方向已确认，待详细设计（主线剧情、分支结构、技术选型）
4. **积累数据集** - 等各角色精选图够15-30张后启动SDXL LoRA训练

---

## 图片位置索引

| 内容 | 路径 |
|------|------|
| 睿帝精选（8张） | `.ai/comfyui-output/精选_睿/` |
| 杰精选（6张） | `.ai/comfyui-output/精选_杰/` |
| 丘精选（6张） | `.ai/comfyui-output/精选_丘/` |
| 睿帝全部实验 | `.ai/comfyui-output/rui_poc/v1~v9/` |
| 杰全部实验 | `.ai/comfyui-output/jie_poc/v1~v7/` |
| 丘全部实验 | `.ai/comfyui-output/qiu_poc/v1_ranger/` + `v2_president/` |
| ComfyUI原始输出 | `E:/ai/ComfyUI-aki(1)/ComfyUI-aki-v3/ComfyUI/output/` |
| 完整管理规范 | `.ai/comfyui-output/README.md` |
