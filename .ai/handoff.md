# AI 交接单

> 最后更新：2026-07-23（白机，R-007 版本号规则规范化 + release-helper 发版 skill 已完成，待部署）
> 所在设备：白机
> 稳定版本：`71da456`（生产环境，已部署）+ R-007 本地完成待提交
> **当前阶段**：德塔 P0~P5 + 师德墙 v2.0.0 均已上线；R-007 版本号规则规范化 + 发版自动化 skill 已完成（本地验证通过，待部署）；下一步做 R-003 角色精灵表

---

## 当前状态：稳定版已上线

**生产环境已部署并验证通过：`71da456`（线上版本 v2.0.0）**

| 服务 | 状态 | 端口 |
|------|------|------|
| 前端（Nginx） | ✅ HTTP 200 | 80/443 |
| 后端 API（PM2: nandexueyuan-api） | ✅ online | 3000 |
| Colyseus 游戏服务器（PM2: nandexueyuan-game） | ✅ online | 2567 |
| 黑机检索 Worker（PM2: search-worker） | ✅ online（黑机 7×24） | — |

**上一轮会话（07-22 白机，已部署 `44e4975`）**：P4 角色创建系统 - skinId 后端持久化
- 数据库：User 新增 `skinId String?`（nullable，null=未选择），Prisma 迁移已应用（本地+生产）
- API：新增 `PUT /api/user/skin`，`publicUser()` 投影含 skinId
- 前端路由：**仅进 `/nde` 时检查 skinId===null 拦截到 `/character`**（首页等不受影响）
- 角色选择页：`CharacterView.vue` 横向 5 卡片（上立绘下精灵，形象 A~E 命名，暗色原神风格）
- 个人中心：`ProfileDialog.vue` 新增形象 5 宫格切换器（提示重进德塔生效）

**上一轮会话（07-22 白机，commit `c6306d3`，已部署 `44e4975`）**：德塔进入无画面 BUG（BUG-37）修复
- 根因：`PreloadScene.js` 调用 `this.anims.getAllAnims()`，Phaser 4 无此 API
- 修复：改用 `this.anims.anims.size` + `this.anims.get() !== undefined`
- 验证：Playwright 确认画面完全恢复

**最近一次会话（07-23 白机，已部署 `71da456`）**：师德墙模块 v2.0.0 + TopBar 公共组件
- **R-008 师德墙模块**（校园墙/朋友圈）：图文动态、评论、点赞、横向画展式布局
  - 数据库：新增 `Post`/`Comment`/`Like` 三表，迁移 `20260723020354_add_wall_tables`
  - API：7 个 RESTful 接口（`/api/wall/*`），含 multer 图片上传（5MB 限制）
  - 前端：`WallView.vue`（横向画展）+ `src/api/wall.js` + 导航入口（男德通与男通讯录之间）
  - 种子数据：爱因斯坦/牛顿名言 + 丘序明"低迷"，作者统一为系统管理员
- **系统管理员账号**：`_system`（status=disabled 不可登录），系统默认数据统一归属
- **TopBar 公共组件**（BUG-W04）：抽取 `src/components/TopBar.vue`，统一 MainView/AdminView/WallView 三页导航（根治"改一处漏其他"）
- **Nginx**：新增 `location ^~ /uploads/` 代理到后端 3000，服务师德墙图片（注意 `^~` 前缀优先级）
- **deploy.sh**：步骤 9 → 11，新增 seed.js / seedWall.js / seedVersion.js 执行
- 验证：浏览器全链路实测（发帖/评论/点赞/删除）+ 线上 v2.0.0 部署完成

**本轮会话（07-23 白机，R-007 本地完成待提交）**：版本号规则规范化
- **问题**：package.json 停留 `0.0.1` 死值从未更新；数据库仅 v2.0.0 一条（v1.1.0/v1.2.0 声称已记录但缺失）；createVersion API 无格式校验；无版本号 ADR
- **ADR-004**（新增 `decisions/ADR-004-版本号规则规范化.md`）：x.y.z 三段式 + v 前缀 + 递增规则 + 三者一致性约定（package.json version[不带v] = 数据库Version.version[带v] = 线上版本）
- **package.json 校准**：根 + server 的 `0.0.1` -> `2.0.0`（与线上 v2.0.0 对齐）
- **seedVersion.js 改造**：单版本写死 -> 版本数组循环幂等写入，补录 v1.1.0（07-20）/v1.2.0（07-21）
- **API 校验**：createVersion/updateVersion 新增 semver 正则校验 `^v\d+\.\d+\.\d+$`
- **deploy.sh**：第9步注释更新
- 验证：正则 10 用例全过 + seedVersion 3 条幂等写入 + npm run build 通过
- **状态**：本地完成，待提交，**未部署**（下次部署时 seedVersion 会自动补录 v1.1.0/v1.2.0 到生产库）

**本轮会话（07-23 白机，德塔战斗系统调研）**：战斗/装备/怪物/游戏性调研方案
- **背景**：德塔 MVP 功能已上线但游戏性偏轻，用户希望调研战斗/装备/怪物系统，设计让成员愿意留在德塔的留存机制
- **核心前提**（用户确认）：社交驱动 + 纯PVE + 20人小圈子优先
- **输出**：`prd/01-需求文档/04-德塔/01-需求/德塔战斗系统调研方案.md`（约 800 行）
- **推荐方案**：
  - 战斗：塔楼楼层副本（二层/三层战斗区，爬梯切换）
  - 装备：社区共建装备库（打怪掉材料→全社区合成→展示在武器架，零数值压力）
  - 怪物：每日世界BOSS（晚20-22点，3-5人合作）+ 每周主题怪（周日轮换）
  - 游戏性：三大支柱——每日仪式感/共同目标/人情记忆
- **关键设计**：不做PVP/数值成长/经济系统/排行榜；怪物命名契合男德学院调性（"卷王"/"Deadline怪"）；分四阶段实施（阶段1约2-3周）
- **待验证假设**：20人是否愿意每天上线打BOSS？碰撞战斗是否好玩？
- **下一步**：需求池登记 R-009 → PRD MECE 边界分析 → ADR-005（楼层切换架构决策）

**本轮会话（07-23 白机，release-helper 发版 skill）**：发版流程自动化
- **背景**：用户希望"以后发版自动更新公告并基于版本号规则迭代"。R-007 完成了规则和校验，但"这次发什么版本号、公告写什么"仍需手动，故做发版 skill 自动化这层
- **新增 skill**：`.zcode/skills/release-helper/SKILL.md`，触发词"发版"/"发布"/"release"/"版本号"
- **两种模式**：① 查看当前版本号（核对 package.json + 数据库三者一致）② 执行发版（自动算版本号 + 提炼公告 + 改 5 文件 + 确认提交）
- **发版自动化程度**：版本号递增计算 ✅、公告提炼 ✅、package.json/seedVersion/CHANGELOG/handoff 修改 ✅、格式校验 ✅、公告写入数据库 ✅（deploy.sh）、git 提交 ✅（确认后）；**部署仍需手动**（遵循部署纪律）
- **发版流程**：用户说"发版" -> skill 回溯改动 -> 展示版本号计算（ADR-004 规则）-> 确认 -> 改文件 -> 展示 diff -> 确认 -> commit+push

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
- [x] P4 角色创建系统（skinId 后端持久化 + 角色选择页 + 个人中心切换）
- [x] 师德墙模块 v2.0.0（图文动态 + 评论 + 点赞 + 横向画展布局，R-008）
- [x] 公共 TopBar 导航组件（统一三页导航，BUG-W04）
- [x] 版本号规则规范化（ADR-004 + package.json 校准 + API semver 校验，R-007，待部署）
- [x] release-helper 发版 skill（自动化版本号计算 + 公告提炼 + 文件修改，配套 R-007）

---

## 待办（按优先级）

### 高优先级

- [ ] **德塔战斗系统**（调研已完成，待进入 PRD）：调研方案见 `prd/01-需求文档/04-德塔/01-需求/德塔战斗系统调研方案.md`
  - **下一步**：需求池登记 R-009 → PRD MECE 边界分析（掉落规则/共享仓库/合成公式/楼层切换/异常分支）→ ADR-005（楼层切换架构）
  - 分阶段开发：阶段1 MVP 战斗（楼层切换+每日BOSS+碰撞战斗）约2-3周
- [ ] **R-003 玩家精灵美术资源**：ComfyUI 生成 5 套立绘 + 精灵表，替换色块占位
  - 立绘工作流 JSON：`.ai/comfyui-workflows/players/portrait_player_set{1..5}.json`
  - 精灵表需 ControlNet OpenPose（4 方向 × 4 帧 = 16 帧/套）
  - 脚本：`scripts/gen_player_portrait_workflows.py`、`scripts/portrait_to_avatar.py`
  - 模型下载：`scripts/download_models.sh`（SDXL + Pixel-Art LoRA + ControlNet，约 8GB）
  - **生成后放入 `CharacterView.vue` 立绘区 + 精灵区，替换当前字母色块占位**
  - **角色坐标系问题（见下方「关键未解决问题」#1）留待本需求一起处理**
  - **下一步黑机进行**

### 低优先级

- [ ] 三层塔楼功能扩展：房间内床/宝箱可交互、顶层宝箱奖励
- [ ] NPC AI 对话增强：私聊模式 + 每用户独立上下文（未来调研项）
- [ ] **R-007 发版流程落地**：R-007 已完成代码 + ADR + release-helper skill。下次发版直接对 AI 说"**发版**"即可触发 skill 自动执行 bump 流程（算版本号 + 提炼公告 + 改文件 + 确认提交），见 ADR-004「影响」章节和 `.zcode/skills/release-helper/`

---

## 关键未解决问题（下次接手必看）

1. **角色坐标系**（留待 R-003 角色精灵需求处理）：色块时代坐标是凑合的，换 PNG 后暴露。`origin(0.5,1)` + body offset 方案导致玩家掉虚空，已回退。下次需重新设计，建议参考 ADR-002。**用户已明确：坐标系问题与 R-003 美术资源一起处理，不单独做**
2. **ComfyUI 输出目录**：绘世启动器会覆盖 `preference.json` 的 `output_directory`。当前方案是 AI 直接读 ComfyUI 默认 output 目录，验证后手动复制
3. **男德通人设锁定**：参考 MyGo 千早爱音（粉发、眼镜、虎牙），mygo LoRA 触发词 `chihaya anon`，**人物形象只留触发词，其余靠 LoRA**
4. **图片资源 404**：`player_set*.png` 等精灵图未入 git，有 fallback 色块不影响逻辑，待 ComfyUI 生成后入库

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
| 最新 commit | `71da456`（已推送 + 已部署，线上版本 v2.0.0） |
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
| 需求池 | `prd/01-需求文档/00-基础数据/需求池.md` |
| 德塔 Changelog | `prd/01-需求文档/04-德塔/changelog.md` |
| 德塔 Bug Log | `prd/01-需求文档/04-德塔/bug-log.md` |
| ADR-004 版本号规则 | `prd/01-需求文档/00-调研/decisions/ADR-004-版本号规则规范化.md` |
| release-helper 发版 skill | `.zcode/skills/release-helper/SKILL.md` |
| ZCode 项目指令 | `AGENTS.md` |
