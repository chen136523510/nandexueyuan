# AI 交接单

> 最后更新：2026-07-29（白机：Galgame 引擎核心 PoC 完成 + 全文档同步）
> 所在设备：白机（荣耀便携本）
> 稳定版本：本轮代码未 commit（待院长确认后提交）
> **当前阶段**：德塔 Galgame M-G1 引擎核心 PoC 已完成验证，7 项验收全通过

---

## 白机本轮产出（2026-07-29）

### M-G1：Galgame 引擎核心 PoC ✅ 已完成

院长确认方向后，白机完成了完整的 Galgame 引擎核心 PoC，浏览器实测 7 项验收标准全部通过。

**前端新增**（`src/galgame/`）：
- `engine/engine.js` -- 剧本引擎核心（节点解析/跳转/条件判断/好感度效果）
- `engine/types.js` -- 节点类型定义 + 角色色彩配置
- `stores/galgameStore.js` -- Pinia store（状态管理 + 存档/进度 API 对接）
- `components/` -- 8 个 Vue 组件：DialogueBox/CharacterLayer/ChoiceMenu/QuickMenu/SaveLoadPanel/HistoryPanel/SettingsPanel/BackgroundLayer
- `data/prologue.js` -- 序章"学院降临"剧本（22 节点，含选项分支+好感度）
- `views/NdeGalgameView.vue` -- Galgame 主视图（替换占位页）
- `api/galgame.js` -- 存档/进度 API 封装

**后端新增**：
- `server/prisma/schema.prisma` -- 新增 GameSave + GameProgress 两张表
- `server/src/controllers/galgameController.js` -- 存档/进度 controller（6 个 API）
- `server/src/routes/api.js` -- 挂载 `/api/galgame/*` 路由

**路由变更**：`/nde` 从 `NdeRebuildingView.vue`（占位页）切换到 `NdeGalgameView.vue`

**文档新增/更新**：
- 新建 `prd/01-需求文档/04-德塔/02-设计/德塔Galgame重构规划.md`
- 新建 `prd/01-需求文档/00-调研/decisions/ADR-006-德塔Galgame引擎选型.md`
- 更新 `pm/ROADMAP.md` -- M-G1 标记 done，新增 M-G1~M-G4 里程碑
- 更新 `pm/需求池.md` -- R-009~R-017 标记废弃，R-018~R-023 新增

### PoC 验收结果（浏览器实测全通过）

1. ✅ 进入 `/nde` 看到 Galgame 主界面（深色主题 + 开始界面）
2. ✅ 点击/空格/Enter 推进对话，打字机效果正常
3. ✅ 立绘随说话者切换，非说话者 dim，角色名标签颜色正确
4. ✅ 选项菜单弹出，选择后跳转正确分支，好感度变更
5. ✅ 存档到服务端（槽位1），读档恢复到存档节点
6. ✅ 快捷栏打开存档/读档/回看/设置面板
7. ✅ 章节结束画面"- 章节结束 -"正常显示

### 下一步计划

1. **commit 代码** -- 本轮代码尚未提交，待院长确认后 commit + push
2. **黑机任务**：
   - 序章剧情大纲完善（连酒馆 AI）
   - 睿/杰/丘立绘替换占位色块（路径：`/galgame/portraits/角色名/表情.png`）
   - 背景图替换 CSS 渐变占位（路径：`/galgame/bg/场景名.jpg`）
3. **M-G2**：序章完整 + 手机/消息系统

---

## 以下为黑机上轮交接内容（保留备查）

---

## 当前状态：德塔方向废弃 + Galgame 重构，占位页已上线

### 德塔 Galgame 重构（2026-07-29 院长确认）

| 项目 | 状态 |
|------|------|
| 方向决策 | 废弃 2D 游戏（Phaser/Colyseus/俯视角全部停止），改为 Galgame（叙事驱动+立绘+背景+对话+分支） |
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
3. **Galgame 重构规划** - 方向已确认，待详细设计（主线剧情、分支结构、技术选型）
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
