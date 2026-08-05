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

> 📌 **脸模与立绘的关系**：脸模（`face_*.png`）是角色面部特征定稿，**是立绘的源头**——生成新立绘/表情差分时，必须以脸模为参考图锁定人物特征。立绘（`full_*.png` / `expr_*.png`）是脸模+服装+表情的完整应用产物。详见 `.zcode/skills/image-gen/SKILL.md` 的生成流程。
>
> 📦 **旧版归档**：jimp 抠图时代的旧版立绘（黑背景、细节较差）已归档至 `.ai/_backup_portraits/美术资产旧版_20260803/`。2026-08-03 已用 public/ 的 rembg 重抠版同步替换美术资产，两边 md5 一致。

## 立绘 + 背景图清单（2026-07-30 入库）

### 角色立绘 + 表情差分

| 角色 | 基准全身立绘 | 表情差分 | 运行时目录 |
|------|-------------|---------|-----------|
| 见（院长） | `院长/full_v1_01.png`（calm 沉稳冷静） | gentle / serious / calm | `public/visualnovel/portraits/dean/` |
| 幸 | `幸/full_v1_01.png`（smile 职业微笑，军装制服） | smile / observe / pleased / cold | `public/visualnovel/portraits/xing/` |
| 添 | `添/full_v1_01.png`（normal） | — | `public/visualnovel/portraits/tian/` |
| 班 | `班/full_normal_v1_01.png`（normal 玩世不恭） | serious（归途报信·笑意收尽） | `public/visualnovel/portraits/ban/` |

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
| `背景图/tower_interior_hall_prologue.png` | 序章结束场景（见+添画入大厅） |
| `背景图/tower_workbench.png` | 幕间场景A：工作台特写（见+添+班三人拌嘴） |
| `背景图/tower_room_night.png` | 序章睡觉过渡：二楼房间·夜晚（v2 基于 morning 参考生成，布局一致） |
| `背景图/tower_room_morning.png` | 第一章开场：二楼房间·晨光 |
| `背景图/tower_corridor_morning.png` | 第一章开场：二楼走廊·晨光 |
| `背景图/tower_corridor_night.png` | 第二幕衔接段：二楼走廊·夜景（v2 基于 morning 参考生成，布局一致） |
| `背景图/ban_corridor_moon.png` | CG-1：班走廊看月亮（v2 重做，坐窗边床沿，保留楼梯，走廊夜景+班脸模+服装三参考） |
| `背景图/ban_closeup_moon.png` | CG-2：班近景特写（坐木椅靠床边，忧郁眼神，月光洒脸，竖图） |
| `背景图/grassland_morning.png` | 幕间结尾：清晨草原无人版（tower_outdoor_mist 同构图去人物） |
| `背景图/bridge_checkpoint.png` | 第一幕·帝桥哨卡（v2 阴天版，已被 wide/close 取代） |
| `背景图/bridge_wide.png` | 第一幕·帝桥特写远景（晴天，宏大拱门全貌，海对岸不可见） |
| `背景图/bridge_close.png` | 第一幕·哨卡近景（晴天，石砌哨卡+帝国旗帜，远景见拱门，摆立绘用） |

> 运行时目录：`public/visualnovel/bg/`。背景图为 16:9 宽屏，立绘为 832×1216 竖版。
>
> **场景一致性原则**：同一地点的日/夜版本，以白天版为参考图生成夜晚版，保证布局结构完全一致，仅改变光线。`tower_room_night` 基于 `tower_room_morning` 生成，`tower_corridor_night` 基于 `tower_corridor_morning` 生成。

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
| 班 | `班/face_v1_01.png` | 黑发中分 | 黑瞳 | 坚毅果敢、对内调皮对外狠辣 | Seedream Pro |

> 10 角色脸模图全部入库。各角色文件夹内附对应 `形象设计.md`，作为后续立绘/表情差分的硬特征来源。

## 辨识度设计

8 个角色的发色/眼色/气质经过专门区分，避免脸模撞脸：

- **发色矩阵**：金（杰）/ 纯黑（幸）/ 深蓝（荣·汪神，用发型与性别区分）/ 黑微卷（见）/ 银灰（睿）/ 白（沐阳）/ 黑短发（添）
- **眼色矩阵**：琥珀（杰）/ 深灰蓝（幸）/ 红（荣）/ 栗（见）/ 灰（睿）
- **气质反差**：杰狂傲 vs 见沉稳；睿帝王 vs 添接地气；荣冷厉 vs 幸精致

## 画风锁

所有脸模图均使用「睿帝 + 添」精选立绘作为画风参考（仅锁西方奇幻油画厚涂风，不带入人物特征），由豆包 Seedream Pro 5.0 生成。
