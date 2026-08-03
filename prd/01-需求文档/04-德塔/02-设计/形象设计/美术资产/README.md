# 角色形象设计 · 美术资产

> 本目录存放各角色已定稿的美术资产（脸模、立绘、差分等）。
> 所有图采用统一的西方奇幻油画厚涂风（thick oil painting / impasto）。

## 命名规范

| 格式 | 含义 |
|------|------|
| `face_vX_XX.png` | 脸模图（正面面部参考），版本递增 |
| `full_vX_XX.png` | 全身立绘基准图（运行时对应 `normal.png`） |
| `expr_{情绪}_vX_XX.png` | 表情差分（如 `expr_gentle_v1_01.png`） |

> ⚠️ 立绘基准图和表情差分均为**抠图后的透明背景版**（与 `public/visualnovel/portraits/` 一致）。
> 后续迭代需重出立绘时，以各角色的 `face_v1_01.png` 脸模 + `full_v1_01.png` 基准立绘作为双参考图输入 Seedream。

## 立绘 + 背景图清单（2026-07-30 入库）

### 角色立绘 + 表情差分

| 角色 | 基准全身立绘 | 表情差分 | 运行时目录 |
|------|-------------|---------|-----------|
| 见（院长） | `院长/full_v1_01.png`（calm 沉稳冷静） | gentle / serious / calm | `public/visualnovel/portraits/dean/` |
| 幸 | `幸/full_v1_01.png`（smile 职业微笑，军装制服） | smile / observe / pleased / cold | `public/visualnovel/portraits/xing/` |
| 添 | `添/full_v1_01.png`（normal） | — | `public/visualnovel/portraits/tian/` |

> 表情差分命名：`expr_{情绪}_v1_01.png`。生成方式：Seedream 脸模 + 服装双参考图，仅改表情描述词。
> 幸的军装穿搭以场景背景图 `tower_outdoor_mist` 为准（深蓝军装 + 金肩章 + 勋章 + 棕皮带）。

### 背景图

| 文件 | 场景 |
|------|------|
| `背景图/void_world.png` | 开场旁白·虚空 |
| `背景图/grassland.png` | 大草原降临 |
| `背景图/tower_day.png` | 塔楼外景·白天 |
| `背景图/tower_interior_hall.png` | 塔楼大厅·室内 |
| `背景图/tower_outdoor_mist.png` | 塔楼外景·晨雾（幸来访过场） |
| `背景图/tower_interior.png` | 塔楼内景·储物发放（一层大厅，见在墙角木箱取纳戒） |

> 运行时目录：`public/visualnovel/bg/`。背景图为 16:9 宽屏，立绘为 832×1216 竖版。

---

## 脸模图清单（2026-07-30）

| 角色 | 文件 | 发色 | 眼色 | 气质关键词 | 生成工具 |
|------|------|------|------|-----------|---------|
| 杰 | `杰/face_v1_01.png` | 金色（沙漠金） | 琥珀色 | 狂傲警惕、少年锋芒 | Seedream Pro |
| 幸 | `幸/face_v1_01.png` | 纯黑（jet black） | 深灰蓝 | 女强人、沉稳精致 | Seedream Pro |
| 荣 | `荣/face_v1_01.png` | 深蓝短发 | 红色 | 冷厉寡言、军事统帅 | Seedream Pro |
| 见（院长） | `院长/face_v1_01.png` | 黑色微卷 | 栗色 | 沉稳得体、少年老成 | Seedream Pro |
| 睿 | `睿/face_v1_01.png` | 银灰后梳 | 灰色 | 帝王威仪、内里狠辣 | Seedream Pro |
| 汪神 | `汪神/face_v1_01.png` | 深蓝短发 | — | 航海王者、肌肉张扬 | Seedream Pro |
| 沐阳 | `沐阳/face_v1_01.png` | 白发 | — | 帅爷爷、牧羊学者、温和清亮（v2 帅气版） | Seedream Pro |
| 添 | `添/face_v1_01.png` | 黑色短发 | — | 接地气大哥、络腮胡 | Seedream Pro |
| 丘 | `丘/face_v1_01.png` | 黑发 | — | 嫉恶如仇、游侠、坚毅 | Seedream Pro |

> 9 角色脸模图全部入库。各角色文件夹内附对应 `形象设计.md`，作为后续立绘/表情差分的硬特征来源。

## 辨识度设计

8 个角色的发色/眼色/气质经过专门区分，避免脸模撞脸：

- **发色矩阵**：金（杰）/ 纯黑（幸）/ 深蓝（荣·汪神，用发型与性别区分）/ 黑微卷（见）/ 银灰（睿）/ 白（沐阳）/ 黑短发（添）
- **眼色矩阵**：琥珀（杰）/ 深灰蓝（幸）/ 红（荣）/ 栗（见）/ 灰（睿）
- **气质反差**：杰狂傲 vs 见沉稳；睿帝王 vs 添接地气；荣冷厉 vs 幸精致

## 画风锁

所有脸模图均使用「睿帝 + 添」精选立绘作为画风参考（仅锁西方奇幻油画厚涂风，不带入人物特征），由豆包 Seedream Pro 5.0 生成。
