---
name: image-gen
description: 生图纪律。当用户说"生图"、"出图"、"生成图片"、"跑脸模"、"画立绘"、"画背景"、"生成表情"、"换表情"、"image-gen" 或讨论任何 AI 图片生成任务时触发。强制提示词精细、路径规范、Git 纪律、表情差分原则，防止生图过程文件污染仓库。
---

# Image Gen — 德塔美术资产生成纪律

你是德塔项目的美术资产生成管家。每当用户要求生图（脸模、立绘、背景图、表情差分、物品图标等）时，必须遵守以下纪律。

## 触发条件

用户说以下任意一句时触发：
- "生图" / "出图" / "生成图片" / "跑脸模" / "跑立绘"
- "画立绘" / "画背景图" / "生成表情" / "换表情" / "出几张图"
- "image-gen"

---

## 纪律一：提示词务必精细（红线）

**禁止使用模糊、笼统的提示词。** 每次生图必须从形象设计文档中精确提取硬特征，逐项写入提示词。

### 正面提示词必须包含

| 维度 | 必须写明 | 示例 |
|------|---------|------|
| 人物基本 | 人数/性别/年龄/气质 | `1male, solo, 25 years old, calm reliable young leader` |
| 发色发型 | 从文档提取，写英文 tag | `short black hair, slightly curly, messy bangs` |
| 眼色 | 从文档提取（防撞脸） | `chestnut brown eyes, warm focused gaze` |
| 肤色 | 从文档提取 | `light brown tanned skin, healthy outdoor complexion` |
| 表情 | 与剧情情绪对应 | `calm composed expression, slight gentle mouth curve` |
| 服装 | 从文档提取核心单品 | `grey-white round-neck cotton t-shirt, black cord necklace` |
| 构图 | 视角/景别/背景 | `front view face portrait, head and shoulders, plain dark grey background` |
| 画风锁 | 统一画风 tag | `thick oil painting, epic oil painting, impasto brushstrokes, western fantasy art` |

### 负面提示词必须包含

```
# 通用防偏
lowres, bad anatomy, text, error, worst quality, low quality, blurry

# 防画风偏（纯文生图倾向古风，必须加）
anime flat shading, flat colors, neon, chinese style, hanfu, wuxia

# 防构图偏
profile view, side view, back view, looking away, closed eyes

# 防撞脸：列出其他角色的发色/眼色，明确排除
# 示例：见(栗色眼) 负面词要加 amber eyes, blue eyes（那是杰/幸的眼色）
```

### 踩坑记录（必须规避）

1. **纯文生图偏古风**：Seedream 无参考图时倾向中国古风。**必须上传同画风参考图**（如已定稿立绘）锁住西方奇幻油画厚涂风。参考图「仅锁画风，不锁人物」。
2. **3 张参考图并发超时**：豆包并发多张 + 多参考图易超时。稳定配置 = `fast 模式 + 1K + 单参考图`。
3. **同色系撞脸**：杰和见都是暖色系（金发琥珀眼 / 黑发栗色眼），脸模极容易撞。**出图前先查「发色/眼色矩阵」，用负面词排除近似色**。
4. **带大参考图(>1MB) + b64_json 响应 → 超时**：参考图 base64 上传 + b64 响应回传双重慢，110s 内拿不到结果。**优化方案**：① 改用 `response_format: url`（响应只返回下载链接，体积小）② 参考图压到 512px jpeg ③ 复杂场景可先用纯文生图快速出图（14s），人物硬特征靠提示词写死。
5. **背景图双 key 不统一**：prologue.js 存在 `bg/tower_interior_hall` 和 `bg/tower_lobby` 指同一大厅场景。BackgroundLayer 用 `REAL_BG_MAP` 映射，多 key 指向同一张图。**新增背景时先 grep 确认 key 是否唯一。**

---

## 纪律二：存储路径规划（红线）

| 类型 | 路径 | 说明 |
|------|------|------|
| **生图过程文件**（测试/迭代/废弃稿） | `.ai/seedream-test/<角色>/` | ❶ 已被 `.gitignore` 忽略，**绝不入库** |
| **ComfyUI 原始输出** | `.ai/comfyui-output/` | ❶ 已被忽略，**绝不入库** |
| **成品美术资源** | `prd/01-需求文档/04-德塔/02-设计/形象设计/美术资产/<角色>/` | ❶ **入库**，仅放院长确认合格的成品 |
| **游戏运行时资源** | `public/visualnovel/` | ❶ **入库**，前端直接引用的图片 |

> **原则**：白机做代码时也需要美术资源支撑，但**只允许成品入库**。生图过程文件（中间稿、测试图、废弃图）绝对不能进 git。

### 成品入库前确认清单

- [ ] 院长已明确说"合格"
- [ ] 统一命名（`face_vX_XX.png` / `full_vX_XX.png` / `expr_vX_XX.png`）
- [ ] 附 README 或清单记录元数据（发色/眼色/气质/生成工具）

---

## 纪律 2.5：背景图两种用法（重要）

背景图有两种渲染模式，**出图前必须先确认当前节点用哪种**：

### A. 纯场景背景（无角色）
- **用途**：场景转换、环境交代。人物靠 `characters` 立绘层独立叠加。
- **提示词**：只写环境，禁止写人物。负面词加 `people, character, person`。
- **示例**：`bg/void_world`（虚空）、`bg/grassland`（草原塔楼远景）

### B. 氛围背景（角色画在图里）
- **用途**：过场/转场/特定情绪节点，给玩家身临其境感。角色直接画死在背景里，**该节点应禁用立绘层**（或立绘层不显示该角色），避免双角色重叠。
- **提示词结构**：先写 `BACKGROUND:`（环境），再写 `IN THE FOREGROUND CENTER:`（人物站位+角色硬特征），最后画风锁。
- **示例**：`bg/tower_outdoor_mist`（幸站在雾中外交场景）
- **判断依据**：看 prologue.js 该节点是否需要换表情--需要换表情用 A，不需要用 B。

---

## 纪律三：表情差分原则（核心）

**禁止「一张立绘摆到底」。** 角色立绘必须根据剧情情绪拆分多套表情差分。

### 拆分原则

1. **按情绪转折点拆分**，不按字数拆。台词情绪变了才换表情，没变不换。
2. **主表情 = 出场默认态**。差分表情 = 剧情中的情绪变化点。
3. **同一套服装**：表情差分只换表情/动作，不换衣服（除非剧情需要换装）。
4. **差分命名**：`expr_<情绪键>_v1_01.png`，情绪键用英文（如 `gentle` / `serious` / `cold`）。

### 差分键映射到 prologue.js

```
// prologue.js 节点里：
characters: [{ id: 'dean', portrait: 'dean/gentle' }]  // ← 情绪键

// 对应文件：
// public/visualnovel/portraits/dean/gentle.png
```

### 示例：见（院长）的情绪拆分

| 表情键 | 触发节点 | 情绪 |
|--------|---------|------|
| `gentle` | 第一幕迎接玩家 | 和蔼亲切、温柔微笑 |
| `serious` | 提到"有客人来" | 笑容收敛、眼神沉静 |
| `calm` | 第二幕幸来访全程 | 沉稳冷静、对外得体 |

---

## 纪律四：辨识度设计（防撞脸）

**出图前必须先查「发色/眼色矩阵」**，确保新角色与已有角色拉开差距。近似色系用负面词排除。

### 当前发色/眼色矩阵（持续维护）

| 角色 | 发色 | 眼色 | 气质关键词 |
|------|------|------|-----------|
| 杰 | 沙漠金 | 琥珀 | 狂傲警惕 |
| 幸 | 纯黑(jet black) | 深灰蓝 | 女强人精致 |
| 荣 | 深蓝短发 | 红 | 冷厉寡言 |
| 见（院长） | 黑微卷 | 栗色 | 沉稳得体 |
| 睿 | 银灰后梳 | 灰 | 帝王狠辣 |
| 汪神 | 深蓝短发 | — | 航海王者 |
| 沐阳 | 白发 | — | 牧羊学者 |
| 添 | 黑短发 | — | 接地气大哥 |
| 丘 | 黑发 | — | 嫉恶如仇 |

> 当新增角色时，先查此表，确保不与现有角色撞色。改色后同步更新此表 + 形象设计文档。

---

## 纪律五：画风统一

所有美术资源统一 **西方奇幻油画厚涂风**（`thick oil painting / epic oil painting / impasto brushstrokes / western fantasy art`）。

- **画风参考图**：用「睿 + 添」已定稿立绘作画风参考（仅锁画风，不带入人物特征）
- **绝对不用近似角色作参考**：如见（黑发）不要用杰（金发）作参考，会把发色带偏

---

## 纪律六：参考图压缩（防超时）

**大参考图(>500KB)直接上传易导致 API 超时。** 参考图作用是"锁特征"，不需要高分辨率。

### 压缩脚本（jimp v1）

```js
const { Jimp } = require('jimp');  // npm install jimp --no-save

const img = await Jimp.read('原图路径.png');
await img.resize({ w: 512 });                       // 缩到512宽
const buf = await img.getBuffer('image/jpeg', { quality: 85 });  // jpeg q85
// base64后通常 <150KB, 不再超时
```

| 原图大小 | 压缩后(base64) | API响应 |
|---------|--------------|---------|
| 1.4MB png | 139KB jpeg | 28s ✅ |
| 1.9MB png | —（不压缩） | 110s+ 超时 ❌ |

### 氛围背景图（角色入画）专用流程

1. **压缩角色精选图**作参考（锁人物形象+服装，不只是画风）
2. 提示词结构：`BACKGROUND:` 写纯场景 → `CHARACTER CENTER FOREGROUND:` 写人物站位+硬特征 → 画风锁
3. `response_format: 'url'`（响应只返回下载链接，比 b64_json 快）
4. 背景多余元素用负面词排除：`building, ruins, monument, city, wall, fence, table, chairs, furniture`

---

## 强制工作流

### Step 1：读文档，提取硬特征

从角色形象设计 `.md` 提取：发色、眼色、肤色、五官、服装、气质。**禁止凭印象写提示词。**

### Step 2：查辨识度矩阵

确认新角色发色/眼色不与已有角色撞色。撞了就提出方案让院长定夺。

### Step 3：写精细提示词

正面词逐项写明硬特征 + 画风锁。负面词排除撞脸色 + 古风偏移。

### Step 4：选参考图（锁画风）

上传已定稿立绘作画风参考（仅锁画风）。确认参考图与新角色发色差异大（防带偏）。

### Step 5：生图 → 存过程文件

存到 `.ai/seedream-test/<角色>/`（不入库）。命名 `face_v1_01.png`。

### Step 6：院长确认合格

展示图片，逐项核对硬特征命中情况。**院长说"合格"才整理入库。**

### Step 7：成品入库

复制到 `prd/.../美术资产/<角色>/`，同步更新 README 清单，提交 git。
