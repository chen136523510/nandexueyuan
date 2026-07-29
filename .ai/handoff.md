# AI 交接单

> 最后更新：2026-07-29（黑机：世界书同步+3角色卡+序章台词+汪神沐阳出图+法刺形象设计+出图）
> 所在设备：黑机（RTX 4070 主力机）
> 稳定版本：尚未 commit（本轮产出待白机验收后提交）
> **当前阶段**：M-G1 引擎核心 PoC 完成 + 序章台词初稿完成 + 汪神/沐阳/法刺幸/法刺荣出图完成

---

## 黑机本轮产出（2026-07-29 晚）

### 1. 世界书同步（德塔设定集.json）
- 删除 6 条旧 2D 战斗条目（UID 5-10：战斗系统/数值/武器/防具/技能/怪物）
- 更新 5 条旧语言条目（UID 0-4/11：塔楼/塔外/裂隙/学院/男德通/核心基调 -> 视觉小说方向）
- 新增 9 条视觉小说设定（序章核心/法刺幸/法刺荣/睿帝令/纳戒/三线剧变节奏/地图系统/男德通Q&A/视觉小说形态）
- 同步后 51 -> 54 条，备份 `德塔设定集.bak.vn_sync_20260729_200934.json`
- 路径：`E:/ai/SillyTavern Launcher GUI/data/st_data/default-user/worlds/德塔设定集.json`

### 2. 三个新角色卡注入酒馆
| 角色 | 定位 | 路径 |
|------|------|------|
| 德塔编剧 | 台词与对话创作 | `characters/德塔编剧.png` |
| 德塔导演 | 剧情节奏与叙事结构 | `characters/德塔导演.png` |
| 德塔造型师 | 角色形象设计+AI出图提示词 | `characters/德塔造型师.png` |
- 用 ST 自带 character-card-parser.js 的 write() 注入 PNG（chara+ccv3 chunk）
- 载体 PNG 用 Pillow 生成的纯色图（棕/蓝/紫代表色）

### 3. 序章四幕台词创作（德塔编剧角色卡 + DeepSeek API）
| 幕 | 文件 | 要点 |
|----|------|------|
| 第一幕·降临 | `剧情设计/序章-第一幕-降临-台词.md` | 旁白黑深残基调+院长沉稳务实+"今天有客人来"钩子 |
| 第二幕·法刺来访 | `剧情设计/序章-第二幕-法刺来访-台词.md` | 幸的潜台词设计+自我命名+四选择支+试探性回答 |
| 第三四幕·储物与探索 | `剧情设计/序章-第三四幕-储物与探索-台词.md` | 纳戒发放+男德通六话题Q&A（嘴上不正经手上靠得住） |
- 创作脚本：`.ai/comfyui-workflows/tavern_chat.py`（角色卡+世界书->DeepSeek API）
- DeepSeek API（deepseek-chat模型）链路验证通过

### 4. ComfyUI 环境修复 + 批量出图
**修复**：管道模式下 tqdm 写 stderr 报 OSError [Errno 22]
- 根因：ComfyUI logger.py 的 LogInterceptor + ComfyUI-Manager prestartup_script.py 双重拦截 stderr，管道模式写入失败
- 修复：logger.py `write()` 加 try-except + Manager `write_stderr` 加安全包装
- 文件：`ComfyUI/app/logger.py` + `ComfyUI/custom_nodes/ComfyUI-Manager/prestartup_script.py`

**出图**（全部成功，novaAnimeXL + epic_oil_painting_slider）：
| 角色 | 张数 | 路径 | 状态 |
|------|:----:|------|:----:|
| 汪神 | 4 | `.ai/comfyui-output/wang_poc/v1/` | ✅ 传奇标准像/接见/航海/重现剪影 |
| 沐阳 | 4 | `.ai/comfyui-output/muyang_poc/v1/` | ✅ 牧羊/观察草/举杖远眺/夜营刻杖 |
| 法刺·幸 | 2 | `.ai/comfyui-output/faci_xing_poc/v1/` | ✅ 外交官标准像/试探微笑特写 |
| 法刺·荣 | 2 | `.ai/comfyui-output/faci_rong_poc/v1/` | ✅ 暗处站姿/拔刃战斗 |
- 出图脚本：`.ai/comfyui-workflows/gen_portrait.py` + `gen_wang_mu.py`

### 5. 法刺·幸 + 法刺·荣 形象设计文档
| 文档 | 路径 | 设计主轴 |
|------|------|----------|
| 法刺幸-形象设计.md | `形象设计/` | 精致体面是壳，锐利试探是魂。深靛蓝+珍珠白，芯核胸针 |
| 法刺荣-形象设计.md | `形象设计/` | 帝国之刃。哑黑半甲+刺刃，高马尾无碎发，不对称甲片 |
- 由德塔造型师角色卡 + DeepSeek API 生成，8段标准结构 + ComfyUI提示词
- 状态：**初稿，待院长验收**

---

## 环境状态

| 服务 | 端口 | 状态 |
|------|:----:|:----:|
| 酒馆 SillyTavern 1.18.0 | 8000 | ✅ 运行中（--dataRoot 已配置） |
| ComfyUI 0.9.2 | 8188 | ✅ 运行中（--lowvram，logger.py已修复） |
| DeepSeek API | - | ✅ deepseek-chat 可用（sk-e608...） |

**酒馆新增角色卡**（4个）：德塔世界观架构师(旧) + 德塔编剧 + 德塔导演 + 德塔造型师
**世界书**：54条（已同步视觉小说方向）
**ComfyUI 代码修改**：logger.py + Manager prestartup_script.py（管道模式 OSError 修复，不影响正常使用）

---

## 以下为白机上轮交接内容（保留备查）

---

## 白机本轮产出（2026-07-29，全天汇总）

### 1. Galgame -> 视觉小说 全局重命名（commit `44f5587`）
- 代码/文档/数据库公告全量替换，29 文件，Playwright 验证通过

### 2. 序章「漂泊者降临」剧本设计 + ADR-007 音频管线（commit `9553f5a`）
- 序章四幕结构：降临 -> 法刺幸来访 -> 储物发放 -> 自由探索
- 法刺设定补充：幸（二号/外交）+ 荣（头号/刺杀）
- ADR-007 音频管线：生成层(Suno/TTS) -> 处理层(FFmpeg) -> 运行层(<audio>)，低优先级

### 3. 地图系统设计 + 睿河大桥命名（commit `083bca2` `03140f5`）
- 大地图 6 地点 + 小地图区域细分 + 学院-势力关系
- 睿河大桥：帝国称「南方大桥」，草原人称「帝桥」

### 4. R-026 自我命名 + R-027 储物空间 开发（commit `7643964`）
- INPUT 节点类型 + {playerName} 模板替换
- 纳戒=背包本身（不入物品列表），B 键快捷，网格+详情弹窗
- 后端 GameProgress/GameSave 加 inventory 字段 + migration
- 浏览器实测全部通过

### 5. 全文档同步审计（commit `d903f2b`）
- 世界观.md V4：标注指向设定集 v1.3
- 设定集文件重命名 v1.0 -> v1.3，7 个引用链更新
- 三份废弃文档移入归档-旧版本/
- 德塔/changelog.md 补 R-018~R-020/R-026/R-027 + 方向废弃条目
- README.md 修复部署章节矛盾
- 需求池 R-019/R-020 去重，R-026/R-027 登记已完成

### 6. 02-设计目录重构（commit `d5203bd`）
- 10 个文件平铺 -> 7 个子目录（世界观/剧情设计/形象设计/美术设计/音频设计/技术设计/归档）
- 20 个文件引用链同步更新

### 7. 创作速查手册 + sync-docs 技能优化（commit `72fbea7` `700f60a` `9b5c8ed`）
- AI交接单.md -> 创作速查手册.md（区分换机交接与创作参考）
- 创作速查手册全量重写（视觉小说方向 + 法刺幸/荣 + 序章 + 地图 + 待黑机事项）
- sync-docs 技能：补全文档层级 + 引用链检查 + 路径修正

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

### 黑机任务（优先级排序）

1. **序章台词打磨** -- 四幕各场景台词 + 男德通 Q&A 内容，与酒馆 AI 协作。设计文档在 `02-设计/剧情设计/序章-漂泊者降临.md`
2. **第一章三线剧变** -- 情报循序渐进的节奏设计。情报顺序记录在序章设计文档 §二
3. **院长形象设计** -- 第一批先行者领袖 NPC，需形象设计文档
4. **法刺·幸形象设计** -- 法刺二号，女性，外交官气质
5. **法刺·荣形象设计** -- 法刺头号，女性，禁卫队队长气质
6. **立绘替换占位** -- 睿/杰/丘立绘替换色块占位（路径：`public/visualnovel/portraits/`）
7. **背景图替换** -- 替换 CSS 渐变占位（路径：`public/visualnovel/bg/`）
8. **大地图线稿** -- 院长提供线稿，黑机生成最终美术

### 白机下一步

1. **M-G2**：序章完整（R-028 剧本重写，等黑机台词）+ 手机/消息系统（R-021）
2. **M-G3**：第一章 + 地图系统（R-022，等黑机剧本+美术）

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
