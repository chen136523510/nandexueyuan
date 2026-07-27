# AI 交接单

> 最后更新：2026-07-28（黑机：睿帝形象 PoC + ComfyUI 环境修复 + 油画 LoRA 测试）
> 所在设备：黑机（台式 4070）-> **待白机接手**
> 稳定版本：`9b9b31a`（生产环境 v2.1.1，已部署上线，本轮无代码改动）
> **当前阶段**：v2.1.1 已部署，德塔形态重构方向已锁定，画风方向已决策，睿帝形象 PoC v2 完成（8/8），待开代理下载 Civitai 专业厚涂 LoRA 进一步优化

---

## 当前状态：v2.1.1 已上线 + 睿帝形象 PoC v2 完成

**生产环境 v2.1.1 已部署，线上五项验证全绿。德塔形态重构方向已锁定（横版像素 -> 等距俯视 + 分层美术），画风方向已决策（美漫厚涂立绘 + Q版精灵）。黑机完成睿帝形象 PoC 两轮迭代（v1 waiIllustrious 8张 + v2 novaAnimeXL+油画LoRA 8张），核心问题（骷髅面具/胡须/AI自由发挥）已解决，最佳组合已确定。**

### 黑机本轮工作总结（2026-07-28，睿帝形象 PoC + 环境修复）

| 事项 | 状态 |
|------|------|
| 战略规划.md 状态修正（Draft -> Accepted） | ✅ |
| monsters.js 一致性隐患记录（attackRange/attackCooldown 阶段1未生效，阶段2需切WorldRoom读取） | ✅ |
| search-worker 重启（pm2 online） | ✅ |
| ComfyUI 启动 + **spacy 崩溃根治**（argostranslate 缓存缺失 -> 手动缓存 spacy 模型 -> 30秒启动不再卡死） | ✅ |
| 睿帝 v1 PoC 8张（waiIllustrious 底模）：骷髅面具/胡须/AI自由道具问题 | ✅ |
| 三模型对比（waiIllustrious / Pony / novaAnimeXL）：novaAnimeXL 设定还原最佳 | ✅ |
| FLUX 1-dev-fp8 测试：12GB VRAM 跑不动（lowvram 模式卡死 0/12 步） | ❌ 已排除 |
| 从 hf-mirror 下载 2 个油画 slider LoRA（oil_painting + epic_oil_painting，各 8.4MB） | ✅ |
| LoRA 权重对比测试（w2.0 / w3.0）：**epic_oil_painting w2.0 最佳** | ✅ |
| 睿帝 v2 PoC 8张（novaAnimeXL + epic_oil_painting LoRA w2.0）：核心问题全部解决 | ✅ |
| 睿帝发色设定补充（银灰 -> 写入形象设计文档） | ✅ |

### 睿帝形象 PoC 结论

**最佳组合：novaAnimeXL + epic_oil_painting_slider LoRA (w2.0)**

| 指标 | v1 (waiIllustrious) | v2 (novaAnimeXL+LoRA) |
|------|---------------------|----------------------|
| 骷髅面具 | ❌ 图4/8 严重 | ✅ 完全消除 |
| 胡须 | ❌ 图2 出现 | ✅ 完全消除 |
| AI 自由道具 | ❌ 扫帚/燃烧物 | ✅ 大幅改善 |
| 设定还原 | ⭐⭐ | ⭐⭐⭐ |
| 油画厚涂感 | ⭐⭐ | ⭐⭐⭐（有提升但仍不够） |

**v2 最佳产出**：图5（王座坐姿）⭐⭐⭐⭐、图6（特写肖像）⭐⭐⭐⭐

**仍存瓶颈**：
1. 袍色偏灰（设定象牙白）—— 提示词需加强 `pure white, bright white`
2. 油画厚涂感不够强 —— slider LoRA 仅 8.4MB（概念滑块），需 Civitai 专业风格 LoRA（50-300MB）
3. 发色偶尔不稳定（图4头发变深色）—— 需加强 `silver grey hair` 权重

### ⚠️ 美工下次继续（需院长开 Clash 代理 7890 端口）

- [ ] 从 Civitai 搜索下载专业厚涂/油画风格 LoRA（SDXL，50-300MB），进一步逼近 Hades 美术风格
- [ ] Civitai 搜索关键词：`oil painting` / `impasto` / `painterly` / `Hades style`（按下载量排序）
- [ ] 用专业 LoRA 重跑睿帝 8 变体，对比 v2 效果
- [ ] 袍色偏灰修复：提示词加强 `pure ivory white, bright white robe`
- [ ] 跑通后扩展到丘/杰/汪神/牧羊人四个角色形象

### 睿帝 PoC 图片位置

- **v1（waiIllustrious）**：`.ai/comfyui-output/rui_poc/rui_0X_*.png`
- **v2（novaAnimeXL+LoRA）**：`.ai/comfyui-output/rui_poc/rui_v2_0X_*.png`
- **三模型对比**：`.ai/comfyui-output/rui_poc/rui_pony_front.png` / `rui_nova_front.png` / `rui_nova_oilpaint_*.png`
- **生成脚本**：`scripts/gen_rui_portraits.js`（v2，支持 LoRA，可复用跑其他角色）

### ComfyUI 环境关键信息（黑机）

| 项目 | 值 |
|------|-----|
| ComfyUI 路径 | `E:/ai/ComfyUI-aki(1)/ComfyUI-aki-v3/ComfyUI` |
| Python | `E:/ai/ComfyUI-aki(1)/ComfyUI-aki-v3/python/python.exe` |
| API 端口 | 8188 |
| 启动命令 | `cd ComfyUI && ../python/python.exe main.py --listen 127.0.0.1 --port 8188` |
| spacy 缓存 | `C:\Users\{user}\.local\cache\argos-translate\spacy\`（已修复，勿删） |
| ComfyUI-Manager | network_mode = offline（避免 github 下载） |

**可用底模**（ComfyUI checkpoints 目录）：
| 模型 | 类型 | 画风 | 备注 |
|------|------|------|------|
| flux1-dev-fp8 (17G) | FLUX 12B | 写实/通用 | ❌ 12GB VRAM 跑不动 |
| waiIllustriousSDXL_v160 (6.5G) | SDXL | 二次元 | v1 用，先验太强 |
| novaAnimeXL_xlV10 (6.5G) | SDXL | 二次元 | **v2 用，设定还原最佳** |
| mklanNSFWPony_mklan22 (6.5G) | SDXL Pony | 半写实/3D | 无乱发挥但偏照片 |
| anything-v5 (2.0G) | SD1.5 | 二次元 | 分辨率太低，不推荐 |
| master_proSDXLV7-inpainting (6.7G) | SDXL inpaint | 修复 | 仅用于修图 |

**可用 LoRA**（ComfyUI loras 目录）：
| LoRA | 大小 | 用途 | 最佳权重 |
|------|------|------|---------|
| epic_oil_painting_slider | 8.4M | 增加油画厚涂感 | w2.0 |
| oil_painting_slider | 8.4M | 增加油画感（不如 epic 版） | w2.0 |
| uso-flux1-dit-lora-v1 | 457M | FLUX 专用（VRAM 不够暂不可用） | - |

---

### 白机本轮工作总结（2026-07-28，画风决策 + 文档同步 + changelog 补全）

| 事项 | 状态 |
|------|------|
| 画风方向决策：分层美术方案（立绘/漫画=美漫厚涂 Hades/Jen Zee 路线，精灵=Q版/低分辨率） | ✅ commit `1b23f44` |
| 战略规划/ROADMAP/handoff 画风描述全量更新（清除"饥荒手绘暗黑童话风"） | ✅ commit `1b23f44` |
| 需求池优化：修复 pm 搬迁后路径断裂 + 精简已完成详情 + 登记 R-014~R-017 | ✅ commit `0594f96` |
| 代码级 changelog 断档补全：10 个目录 +442 行（server 4 个 + 前端 6 个） | ✅ commit `6e04585` |
| 根 README.md 更新：功能描述/技术栈/项目结构/环境变量 | ✅ commit `9b9b31a` |
| 德塔/设计 README.md 更新：文档索引补全 + 设定集版本号修正 | ✅ commit `9b9b31a` |

### ⚠️ 新增必读文件（重要）

AI 新会话接手时，**第二份必读文件**变为：
1. `.ai/handoff.md`（本文件，战术级）
2. **`pm/ROADMAP.md`（战略级路线图，新增）**

详见 AGENTS.md「换机铁律」和「山丘图标注规则」。

### 德塔形态重构方向（已锁定）

- **方向**：横版像素风 -> 等距俯视角 + 环境氛围叙事 + 分层美术方案（立绘/漫画=美漫厚涂，精灵=Q版/低分辨率）
- **决策依据**：ADR-005 预留的 2D 俯视角升级路径
- **画风原则**：画风保持一致严肃（厚涂质感托住世界分量），轻松感交给文本层。入戏玩家不被打扰，戏谑玩家也有出口
- **6个里程碑**：M-1 等距PoC(决策门) -> M-2 ADR-006+美术PoC(决策门) -> M-3 引擎重构+氛围层 -> M-4 美术迁移 -> M-5 叙事接入 -> M-6 上线v3.0.0
- **不排期**：单人娱乐项目，无工期压力，但每个节点完成记录日期
- **详细规划**：`prd/01-需求文档/04-德塔/02-设计/德塔形态重构战略规划.md`

### 白机本轮工作总结（2026-07-27，R-009 战斗系统阶段1）

**10 步计划全部完成，本地三端联调验证通过**（服务端日志 + 客户端状态双确认）：

| 步骤 | 内容 | 状态 |
|------|------|------|
| 1 | shared 层战斗常量 + 怪物定义表 | ✅ |
| 2 | 服务端 Schema（PlayerState 加血量 + 新建 MonsterState） | ✅ |
| 3 | 服务端 WorldRoom 战斗 tick + 攻击结算 + 死亡复活 | ✅ |
| 4 | PreloadScene 怪物色块纹理生成 | ✅ |
| 5 | InputSystem 鼠标左键攻击输入 | ✅ |
| 6 | Player.js attack/takeHit 方法 | ✅ |
| 7 | NetworkSystem sendAttack + 怪物 diff + WorldScene 怪物渲染 | ✅ |
| 8 | GameView.vue 玩家 HP 血条同步 + 受击反馈 | ✅ |
| 9 | 森林战斗区地图装饰 + 边界 | ✅ |
| 10 | 三端联调验证（战斗全链路通过） | ✅ |

**变更文件清单**（10 改 + 2 新增）：
- 新增：`shared/monsters.js`、`game-server/src/schema/MonsterState.js`
- 修改：`shared/constants.js`、`game-server/src/schema/PlayerState.js`、`game-server/src/schema/WorldState.js`、`game-server/src/rooms/WorldRoom.js`、`game/scenes/PreloadScene.js`、`game/systems/InputSystem.js`、`game/objects/Player.js`、`game/systems/NetworkSystem.js`、`game/scenes/WorldScene.js`、`src/views/GameView.vue`

**联调验证结果**（详见 changelog）：
- 怪物初始生成 4 只（森林区 x∈[1772,3050]）✅
- 玩家攻击伤害 8.3/次（公式 10×15/(15+3)）✅
- 怪物攻击伤害 4.5/次（公式 6×15/(15+5)）✅
- 玩家死亡复活回塔楼一层 ✅
- 怪物死亡 30s 重生 ✅
- HP 实时同步（服务端权威 -> onStateChange diff）✅
- 脱战 20s 回血 ✅

### R-009 战斗系统阶段1 已 commit 部署

R-009 战斗系统阶段1 代码已 commit `489e0e8` 并部署上线（v2.1.1），包含大门开放 + 形象3/4方向修正 + v2.1.1版本公告。

### 黑机上轮工作（2026-07-26~27，已合入 master，commit `517c1eb`）

世界观设定集 v1.0->v1.3 四轮迭代 + ADR-005 世界观承载方式决策 + 章节生成脚本（含 key 泄露修复）。详见 master 提交历史。

### ⚠️ 安全事项（已闭环）

DeepSeek key `sk-43913328...` 曾在 commit `8ab1860`/`a887467` 进入 git 历史（origin/master 可达）。**院长已吊销重新生成**，新 key 在 `.env`。git 历史清理属可选项（单人私有仓 + key 已失效）。

| 服务 | 状态 | 端口 |
|------|------|------|
| 前端（Nginx） | ✅ HTTP 200 | 80/443 |
| 后端 API（PM2: nandexueyuan-api） | ✅ online | 3000 |
| Colyseus 游戏服务器（PM2: nandexueyuan-game） | ✅ online | 2567 |
| 黑机检索 Worker（PM2: search-worker） | ✅ online（黑机 7×24） | - |
| ComfyUI（黑机本地） | ✅ 运行中 | 8188 |
| SillyTavern（黑机本地） | ✅ 已安装 | — |

### 黑机本地关键路径

| 软件 | 路径 | 说明 |
|------|------|------|
| ComfyUI | `E:/ai/ComfyUI-aki(1)/ComfyUI-aki-v3/` | 秋叶整合包 v3，API 端口 8188 |
| ComfyUI Python | `E:/ai/ComfyUI-aki(1)/ComfyUI-aki-v3/python/python.exe` | 调用脚本用 |
| SillyTavern | `E:/ai/SillyTavern Launcher GUI` | 黑机本地酒馆，用于世界观创作 |

### ⚠️ 美术资源状态（重要）

**本轮 R-003 行走精灵表 + 立绘/头像已全部入库 `public/game/`，本次提交同步到 git。**

- 立绘：`public/game/portraits/player_set{1..5}.png`（已入库）
- 头像：`public/game/sprites/avatars/player_set{1..5}.png`（已入库）
- **行走精灵表**：`public/game/sprites/players/player_set{1..5}_walk.png`（256×256，4方向×4帧，本次新增）
- 精灵表源文件：`raw/`（生成原图）+ `cutout/`（BiRefNet 抠图透明 PNG），已入库供迭代
- **前端代码已接入**：`CharacterView.vue` 4×4 网格预览、`PreloadScene.js` 加载纹理、`Player.js` 按方向播放动画

### 白机已完成并部署（07-23，commit `71da456`，线上 v2.0.0）

**师德墙模块 v2.0.0 + TopBar 公共组件**：
- 数据库：新增 `Post`/`Comment`/`Like` 三表，迁移 `20260723020354_add_wall_tables`
- API：7 个 RESTful 接口（`/api/wall/*`），含 multer 图片上传（5MB 限制）
- 前端：`WallView.vue`（横向画展）+ `src/api/wall.js` + 导航入口
- 系统管理员账号：`_system`（status=disabled 不可登录）
- TopBar 公共组件：统一 MainView/AdminView/WallView 三页导航
- Nginx：新增 `/uploads/` 代理
- deploy.sh：步骤 9→11，新增 seed 执行

**版本号规则规范化（R-007，已部署）**：
- ADR-004：x.y.z 三段式 + v 前缀 + 三者一致性约定
- package.json 校准：`0.0.1` → `2.0.0`
- seedVersion.js 改造：补录 v1.1.0/v1.2.0
- API 校验：createVersion/updateVersion 新增 semver 正则
- release-helper 发版 skill：`.zcode/skills/release-helper/SKILL.md`

**战斗系统调研 V2**：`德塔战斗系统调研方案.md`，世界观骨架 + 泰拉瑞亚战斗机制 + 4 种怪物行为

### 黑机已完成并提交（07-22~23，commit `54079b5`）

**BUG-32~36 修复**：
- BUG-32~33：个人中心/角色选择换形象保存失败（Prisma Client 未同步 + 迁移未应用）
- BUG-34：精灵图显示整张四方图（CSS background 裁切）
- BUG-35：角色选择页无返回按钮
- BUG-36：公告加载失败（Prisma Client 未同步）

---

## 已验证功能

- [x] 多人同框 + 聊天广播
- [x] E 键交互（NPC 对话 / 物品 / 大门）
- [x] 路由切换清理（无残影）
- [x] Enter 聊天
- [x] P2 NPC AI 对话（男德通，SSE 流式 + 全服广播）
- [x] 多 Agent 协作检索（v2）+ 黑机 WebSocket 外包全量检索
- [x] 三层塔楼（爬梯 + 物理门 + 精装）
- [x] 版本公告系统（R-004）
- [x] 传送门（返回首页）
- [x] 玩家精灵系统代码接入（色块 fallback，待真实美术资源）
- [x] **R-003 角色行走精灵表**（5 套 × 4 方向 × 4 帧，256×256 spritesheet，ComfyUI 生成 + BiRefNet 抠图 + Python 合成自动化流水线）
- [x] P4 角色创建系统（skinId 后端持久化 + 角色选择页 + 个人中心切换）
- [x] 师德墙模块 v2.0.0（图文动态 + 评论 + 点赞 + 横向画展布局，R-008）
- [x] 公共 TopBar 导航组件（统一三页导航，BUG-W04）
- [x] 版本号规则规范化（ADR-004 + package.json 校准 + API semver 校验，R-007，已部署）
- [x] release-helper 发版 skill（自动化版本号计算 + 公告提炼 + 文件修改，配套 R-007）
- [x] **R-009 德塔战斗系统阶段1**（追击型怪物 + 鼠标攻击 + 服务端权威 HP，已部署 v2.1.1）

---

## 待办（按优先级，标注山丘图状态）

> 山丘图说明：⛰️ uphill = 探索中，禁止直接写代码，先做PoC；⛰️ downhill = 方案已定可执行
> 完整路线图见 `pm/ROADMAP.md`

### 形态重构路线图（已锁定方向）

- [ ] ⛰️ uphill **M-1 等距俯视角 PoC**（关键决策门，失败则回退横版）
- [ ] ⛰️ uphill **M-2 ADR-006 + 美术风格 PoC**（关键决策门，依赖 M-1 通过）
- [ ] ⛰️ downhill **M-3 等距引擎重构 + 环境氛围层**（依赖 M-1+M-2 通过）
- [ ] ⛰️ downhill **M-4 美术资产迁移**（立绘厚涂+精灵Q版，黑机产能，可与 M-3 并行）
- [ ] ⛰️ downhill **M-5 世界观叙事接入**（CG演出层，依赖 M-3）
- [ ] ⛰️ downhill **M-6 正式上线 v3.0.0**

### 并行任务（非重构路线图，持续进行）

- [ ] ⛰️ downhill **R-009 战斗系统阶段2**（装备系统 + 怪物扩展，与 M-3 等距重构时适配）
- [ ] ⛰️ downhill **R-011 HP/MP 回复机制**（回复逻辑可先做）
- [ ] ⛰️ downhill **R-012 装备/背包系统**（数据模型+UI 先行）
- [ ] ⛰️ downhill **R-013 技能槽 UI**（UI 先行）

### 低优先级

- [ ] 三层塔楼功能扩展：房间内床/宝箱可交互、顶层宝箱奖励
- [ ] NPC AI 对话增强：私聊模式 + 每用户独立上下文

---

### 黑机已验证（性能调研结论）

- [x] **服务器性能调研**（2026-07-27）：2核2G 跑战斗系统（20人规模）**完全够用，不需要黑机代劳战斗逻辑**
  - Colyseus 官方基准：1vCPU+1G RAM 简单游戏可处理 1000-2000 CCU；我们是 2核2G = 2倍硬件
  - 20人 + 15怪物 + 20Hz tick 对 2核2G 是"杀鸡用牛刀"
  - **黑机代劳战斗 tick 是反模式**：双跳 RTT（家用宽带 20-80ms×2）破坏实时性、Schema 广播失效、黑机抖动=全服卡顿、家用上行带宽吃紧
  - 黑机的 7×24 价值留给**非实时任务**（现有检索/ComfyUI/SillyTavern）
  - 未来若真遇瓶颈，正确扩展路径是 Colyseus 多进程 + Redis Presence，不是黑机代劳

### 黑机下次继续（美术资源迭代）

- [x] **睿帝形象 PoC v2 完成**（novaAnimeXL + epic_oil_painting LoRA w2.0，8/8，核心问题解决）
  - 生成脚本：`scripts/gen_rui_portraits.js`（v2，支持 LoRA + 多底模切换）
  - 图片：`.ai/comfyui-output/rui_poc/rui_v2_0X_*.png`
  - 最佳产出：图5 王座坐姿 ⭐⭐⭐⭐、图6 特写肖像 ⭐⭐⭐⭐
  - **待优化**：需 Civitai 专业厚涂 LoRA（需开代理 7890）、袍色偏灰、发色偶尔不稳定
- [ ] **Civitai 专业厚涂 LoRA**（需院长开 Clash 代理 7890 端口）：搜索 `oil painting` / `impasto` / `painterly` SDXL LoRA，下载量过万优先
- [ ] **R-003 精灵表/立绘继续优化**（可选，当前已入库可用）：精灵表生成流水线已自动化，如需迭代只需修改提示词重跑脚本
  - 生成脚本：`scripts/gen_walk_sprites_api.py`（生成）→ `scripts/batch_cutout_walk.py`（抠图）→ `scripts/assemble_walk_spritesheet.py`（合成）
  - **已知遗留**：set5 side 是 Canny ControlNet 从 set4 提取轮廓生成的，角色外观与正面一致性有偏差（粉斗篷 vs 紧身衣）；如不满意可换更强 ControlNet 或用图生图（img2img）方式

---

## 关键未解决问题（下次接手必看）

1. **角色坐标系**（R-003 精灵表已入库，可处理了）：`origin(0.5,1)` + body offset 方案导致玩家掉虚空，已回退。精灵表每帧 64×64，角色脚底对齐帧底部（assemble 脚本中 `offset_y = TILE - new_h`），下次需重新设计坐标系，建议参考 ADR-002
2. **ComfyUI 输出目录**：绘世启动器会覆盖 `preference.json` 的 `output_directory`。当前方案是 AI 直接读 ComfyUI 默认 output 目录，验证后手动复制
3. **男德通人设锁定**：参考 MyGo 千早爱音（粉发、眼镜、虎牙），mygo LoRA 触发词 `chihaya anon`，**人物形象只留触发词，其余靠 LoRA**
4. **set5 侧面角色一致性偏差**：set5_side 由 Canny ControlNet 从 set4_side 提取轮廓生成，外观与正面有偏差（粉斗篷 vs 紧身衣）。当前可用，如需修正可改用 img2img 重绘
5. **ComfyUI spacy 崩溃已修复**（2026-07-28）：根因是 `argostranslate` 库每次启动检查 `~/.local/cache/argos-translate/spacy/senter/model` 路径，不存在则触发 pip install（github 被墙 -> retry 5 次 -> ERROR -> 进程退出）。已手动将 spacy 模型缓存到该路径，**勿删该缓存目录**
6. **FLUX 12GB VRAM 不可用**：flux1-dev-fp8 (17G) 在 4070 12GB 上 lowvram 模式卡死（0/12 步不动）。如需用 FLUX 需换 GGUF Q4 量化版（约 6G）或升级显存
7. **Civitai 被墙**：需 Clash 代理（7890 端口）才能访问。hf-mirror.com 可作为 HuggingFace 替代，但 Civitai 专业 LoRA 只能走代理

---

## WebSocket 黑机外包检索架构（已部署 ✅）

```
用户浏览器 -> SSE -> 云端 Express :3000
  ├─ WS Hub (:3000/search-hub) <- 黑机 WS Worker 主动连接
  ├─ orchestrator.dispatchAgent()
  │    ├─ 在线 + 重度任务(person_messages/mentioned) -> WS 下发黑机 -> 全量检索 -> 回传
  │    └─ 离线/超时/轻量任务 -> 本地 LIMIT 50
  └─ 大 Agent 分析 -> SSE 流式输出
```

- **降级策略**：黑机离线/超时 -> 本地 LIMIT 50（精度降但不宕机）；网络中断 -> Worker 5s 自动重连
- **黑机启动**：`npx pm2 start src/searchWorker.js --name search-worker`
- **环境变量**：云端 `BLACK_WORKER_TOKEN`，黑机 `CLOUD_WS_URL=ws://www.nandexueyuan.top/search-hub`

---

## 环境状态

| 项目 | 值 |
|------|-----|
| Git 分支 | `master` |
| 最新 commit | `9b9b31a`（已推送，生产环境 v2.1.1 已部署，本轮文档同步无代码改动） |
| 数据库迁移 | 本地 8 个 + 生产 8 个（已同步，最新 `add_wall_tables`） |
| 前端端口 | 4396（本地）/ 80（服务器 Nginx） |
| 后端端口 | 3000 |
| 游戏服务器端口 | 2567 |
| 数据库 | 已初始化（8 迁移 + 21 种子账号 + 系统管理员 `_system`） |
| 服务器 SSH | `ssh root@47.96.158.104` |

**服务器 PM2 进程**：
| 名称 | 启动命令 | cwd |
|------|---------|-----|
| nandexueyuan-api | `src/index.js` | `server/` |
| nandexueyuan-game | `game-server/src/index.js` | 项目根目录 |

**服务器 Nginx 关键配置**：
```nginx
# Colyseus WebSocket
location /ws {
    proxy_pass http://127.0.0.1:2567/;  # 尾部斜杠必须！剥离 /ws 前缀
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400s;
}
# SSE 必须关闭缓冲
location /api/ {
    proxy_buffering off;
    proxy_read_timeout 600s;
}
# 黑机检索 WS
location /search-hub {
    proxy_pass http://127.0.0.1:3000/search-hub;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
# 师德墙图片静态资源（注意 ^~ 前缀修饰符提升优先级，否则被 .jpg 正则 location 截获 404）
location ^~ /uploads/ {
    proxy_pass http://127.0.0.1:3000;
}
```

**预置账号**：`chenzijian/admin123456`（院长）、`testuser/test123456`（测试员）

---

## 启动命令

```bash
# 前端（本地开发）
npx vite --port 4396

# 后端 API
cd server && npm run dev

# 游戏服务器（多人同步必须）
cd game-server && node src/index.js

# 黑机检索 Worker（黑机专用）
npx pm2 start src/searchWorker.js --name search-worker

# 生产部署
ssh root@47.96.158.104
cd /root/projects/www.nandexueyuan.top
bash deploy.sh

# 前端单独构建+部署（不走 deploy.sh）
npm run build && tar -czf dist.tar.gz dist/
scp dist.tar.gz root@47.96.158.104:/root/projects/www.nandexueyuan.top/
ssh root@47.96.158.104 "cd /root/projects/www.nandexueyuan.top && tar -xzf dist.tar.gz"
```

---

## 德塔踩坑记录（必读）

| Bug | 根因 | 解决 |
|-----|------|------|
| 全屏黑边 | `Scale.FIT` 保持宽高比 | 改 `Scale.RESIZE` |
| Colyseus 版本冲突 | 0.15 不兼容 schema 3.x；0.17 依赖 uWebSockets.js | 锁定 0.16.0 |
| `type()` 不存在 | `@colyseus/schema@3.x` 无 `type()` | 改用 `defineTypes()` |
| `MapSchema.onChange` 无效 | Colyseus 0.16 回调不是属性赋值 | 改用 `room.onStateChange` + diff |
| 昵称全是"学员" | JWT 只含 `{userId, role}` | `options.nickname` 优先 |
| 地图不一致 | 云树随机生成 | 硬编码固定位置 |
| 聊天框重开 | `enableKeyboard()` 后同帧 Enter 触发 | 400ms 冷却时间戳 |
| 按 E 无效 | `inputSystem.update()` 先于 `checkInteraction()` | 调换执行顺序 |
| 多人看不到彼此 | JWT 密钥不匹配 + Nginx proxy_pass 无尾部斜杠 | Express 从 `server/` 启动 + `proxy_pass .../;` |
| JWT 密钥永远回退 | ESM import 提升，`const SECRET` 在 `dotenv.config()` 前求值 | 改为 `function getSecret()` 运行时读取 |
| 切换页签留残影 | `visibilitychange` 不适用 Vue 路由切换 | `onUnmounted` -> `destroyGame()` -> scene `shutdown`+`destroy` |
| Enter 聊天无反应 | `keydown-Enter` 在 Phaser 4 不生效 | 改用 `InputSystem.keyEnter.justDown` |
| OOM 崩溃 | 多 Agent 全量检索 51 万行 | 黑机外包 + 本地 LIMIT 50 降级 |
| **德塔进入无画面** | `this.anims.getAllAnims()` Phaser 4 不存在 | 改用 `this.anims.anims.size` + `this.anims.get() !== undefined` |

> 完整记录见：`prd/01-需求文档/04-德塔/changelog.md` 和 `bug-log.md`

---

## 文档索引

| 文档 | 路径 |
|------|------|
| MVP 需求 | `prd/01-需求文档/04-德塔/01-需求/MVP需求文档.md` |
| 德塔战斗系统调研方案 | `prd/01-需求文档/04-德塔/01-需求/德塔战斗系统调研方案.md` |
| 德塔男德通交互需求 | `prd/01-需求文档/04-德塔/01-需求/德塔男德通交互需求.md` |
| 德塔世界观 | `prd/01-需求文档/04-德塔/02-设计/德塔世界观.md` |
| 美术规范 | `prd/01-需求文档/04-德塔/02-设计/美术设计规范.md` |
| 架构设计 | `prd/01-需求文档/04-德塔/04-技术方案/架构设计.md` |
| 开发路线 | `prd/01-需求文档/04-德塔/04-技术方案/开发路线与占位策略.md` |
| Colyseus 部署方案 | `prd/01-需求文档/04-德塔/04-技术方案/Colyseus多人同步部署方案.md` |
| 师德墙 PRD | `prd/01-需求文档/06-师德墙/师德墙.md` |
| 师德墙 Changelog | `prd/01-需求文档/06-师德墙/changelog.md` |
| 师德墙 Bug Log | `prd/01-需求文档/06-师德墙/bug-log.md` |
| 需求池 | `pm/需求池.md` |
| **产品路线图** | **`pm/ROADMAP.md`**（战略级，AI接手必读） |
| 形态重构规划 | `prd/01-需求文档/04-德塔/02-设计/德塔形态重构战略规划.md` |
| 德塔 Changelog | `prd/01-需求文档/04-德塔/changelog.md` |
| 德塔 Bug Log | `prd/01-需求文档/04-德塔/bug-log.md` |
| ADR-004 版本号规则 | `prd/01-需求文档/00-调研/decisions/ADR-004-版本号规则规范化.md` |
| release-helper 发版 skill | `.zcode/skills/release-helper/SKILL.md` |
| ZCode 项目指令 | `AGENTS.md` |
