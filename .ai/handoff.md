# AI 交接单

> 最后更新：2026-07-23（黑机，P4 立绘原神卡风格重做 + 4 项体验修复 + 迁移修复）
> 所在设备：黑机
> 稳定版本：`eb4e00a`（最新提交，含本次代码+文档+脚本，未含美术资源）
> **当前阶段**：德塔 P0~P5 基础功能全部上线，P4 美术资源待黑机下次继续优化

---

## 当前状态：代码+文档+脚本已提交，美术资源待黑机下次继续优化

**生产环境稳定版：`44e4975`（已部署）**

| 服务 | 状态 | 端口 |
|------|------|------|
| 前端（Nginx） | ✅ HTTP 200 | 80/443 |
| 后端 API（PM2: nandexueyuan-api） | ✅ online | 3000 |
| Colyseus 游戏服务器（PM2: nandexueyuan-game） | ✅ online | 2567 |
| 黑机检索 Worker（PM2: search-worker） | ✅ online（黑机 7×24） | - |
| ComfyUI（黑机本地） | ✅ 运行中 | 8188 |

### ⚠️ 美术资源状态（重要）

**美术资源（立绘/头像/精灵图）本次未提交 git，留在黑机本地待继续优化。**

原因：首轮原神卡风格立绘仍有多处需要优化的地方（构图/一致性/背景细节等），用户要求黑机下次继续打磨，达标后再入库提交。

- 立绘/头像/精灵图文件位于黑机 `public/game/` 下，**未入 git**
- 工作流 JSON 已提交（`.ai/comfyui-workflows/players/`），黑机下次直接在此基础上迭代
- 生成脚本已提交（`scripts/gen_player_portraits_api.py`、`scripts/portrait_to_spritesheet.py`）
- **前端代码不依赖美术资源**：`CharacterView.vue` 有 fallback 色块，缺图时显示字母色块不影响功能

### 本轮会话（07-22~23 黑机）已完成并提交的内容

**代码修复**：
- BUG-32~33：个人中心/角色选择 换形象"保存失败" → 根因有两个：
  1. 旧后端进程未加载 skin 路由（返回 404）→ 重启修复
  2. Prisma Client 未同步 + 数据库 3 个迁移未应用 → `prisma generate` + `migrate deploy` 修复
- BUG-34：精灵图显示整张四方图 → CSS background 只显示第一帧
- BUG-35：角色选择页无返回 → 左上角新增返回按钮
- BUG-36：公告"加载失败" → 同 Prisma Client 未同步根因，一并修复

**脚本提交**：
- `scripts/gen_player_portraits_api.py`：ComfyUI API 调用脚本
- `scripts/portrait_to_spritesheet.py`：立绘转精灵图脚本

**立绘重做（美术资源未提交）**：
- 提示词改为原神卡风格（半身胸像 + 渐变单色背景）
- 已在黑机生成 5 套新立绘+头像+精灵图，但**用户认为仍需优化**
- 工作流 JSON 已提交，黑机下次在此基础上继续迭代

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

---

## 待办（按优先级）

### 黑机下次继续（美术资源优化）

- [ ] **R-003 立绘继续优化**：当前原神卡风格立绘仍需打磨（构图/一致性/背景细节），用户要求达标后再入库提交
  - 工作流 JSON：`.ai/comfyui-workflows/players/portrait_player_set{1..5}.json`（已提交，在此基础上迭代）
  - 脚本：`scripts/gen_player_portraits_api.py`（已提交）
  - 优化方向：参考 `tmp/立绘参考.png`（原神角色卡牌风格），确保半身胸像 + 干净渐变背景 + 角色居中
  - **达标后入库 `public/game/portraits/` + `public/game/sprites/` 并提交 git**

### 已完成（本轮）
- [x] **R-003 立绘+头像+精灵图生成**：ComfyUI 生成 5 套（原神卡风格，待继续优化）
  - 立绘工作流 JSON：`.ai/comfyui-workflows/players/portrait_player_set{1..5}.json`
  - 提示词已重写为半身胸像风格（bust shot + 渐变单色背景）
  - 精灵图采用程序化生成 4×4 网格（暂未用 ControlNet）
  - 脚本：`scripts/gen_player_portraits_api.py`、`scripts/portrait_to_avatar.py`、`scripts/portrait_to_spritesheet.py`
  - **美术资源未提交 git（留黑机待优化），工作流 JSON + 脚本已提交**

### 中优先级

- [ ] 三层塔楼功能扩展：房间内床/宝箱可交互、顶层宝箱奖励
- [ ] NPC AI 对话增强：私聊模式 + 每用户独立上下文（未来调研项）

---

## 关键未解决问题（下次接手必看）

1. **角色坐标系**：色块时代坐标是凑合的，换 PNG 后暴露。`origin(0.5,1)` + body offset 方案导致玩家掉虚空，已回退。下次需重新设计，建议参考 ADR-002
2. **ComfyUI 输出目录**：绘世启动器会覆盖 `preference.json` 的 `output_directory`。当前方案是 AI 直接读 ComfyUI 默认 output 目录，验证后手动复制
3. **男德通人设锁定**：参考 MyGo 千早爱音（粉发、眼镜、虎牙），mygo LoRA 触发词 `chihaya anon`，**人物形象只留触发词，其余靠 LoRA**
4. **立绘风格稳定性**：提示词已改为原神卡风格（半身胸像 + 渐变背景），但首轮结果用户认为仍需优化，**美术资源未提交 git**，黑机下次继续打磨

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
| 最新 commit | `44e4975`（已推送 + 已部署） |
| 数据库迁移 | 本地 5 个 + 生产 5 个（已同步） |
| 前端端口 | 4396（本地）/ 80（服务器 Nginx） |
| 后端端口 | 3000 |
| 游戏服务器端口 | 2567 |
| 数据库 | 已初始化（4 迁移 + 21 种子账号） |
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
| 德塔男德通交互需求 | `prd/01-需求文档/04-德塔/01-需求/德塔男德通交互需求.md` |
| 德塔世界观 | `prd/01-需求文档/04-德塔/02-设计/德塔世界观.md` |
| 美术规范 | `prd/01-需求文档/04-德塔/02-设计/美术设计规范.md` |
| 架构设计 | `prd/01-需求文档/04-德塔/04-技术方案/架构设计.md` |
| 开发路线 | `prd/01-需求文档/04-德塔/04-技术方案/开发路线与占位策略.md` |
| Colyseus 部署方案 | `prd/01-需求文档/04-德塔/04-技术方案/Colyseus多人同步部署方案.md` |
| 需求池 | `prd/01-需求文档/00-基础数据/需求池.md` |
| Changelog | `prd/01-需求文档/04-德塔/changelog.md` |
| Bug Log | `prd/01-需求文档/04-德塔/bug-log.md` |
| ZCode 项目指令 | `AGENTS.md` |
