# 南得学院 - 泰拉瑞亚风格多人互动板块调研

> 调研日期：2026-07-13
> 调研目标：评估在现有 nandexueyuan 项目中新增「类泰拉瑞亚 2D 多人沙盒互动板块」的技术可行性、资源需求与落地方案。
> 关联仓库：https://github.com/chen136523510/nandexueyuan
> 线上地址：https://www.nandexueyuan.top

---

## 一、项目现状速览

| 维度 | 现状 |
|------|------|
| 项目类型 | 前后端分离 SPA（团队/学院管理平台） |
| 前端 | Vue 3.5 + Vite 6 + Pinia + Vue Router + axios |
| 后端 | Node.js + Express 4.21（端口 3000） |
| 数据库 | SQLite（Prisma ORM，含 FTS5 全文检索） |
| 进程管理 | PM2（`nandexueyuan-api`） |
| Web 服务器 | Nginx（反向代理 + 静态资源） |
| 部署 | 阿里云 ECS，直接部署（无 Docker），`deploy.sh` 一键发布 |
| 域名 | https://www.nandexueyuan.top（HTTPS） |
| 服务器规格 | 2 核 2G，40G 磁盘 |
| 已有模块 | 用户系统（含邀请码）、AI 助手（LLM + 群聊导入 + FTS5）、公告、管理后台 |

> 说明：现有项目已具备完整的用户认证体系与 Node.js 后端基础设施，新板块可复用账号系统。

---

## 二、关于 Flash 的结论

**不需要 Flash。** Adobe Flash 已于 2020 年 12 月 31 日正式停止支持，所有主流浏览器已移除 Flash 插件，现代网页无法运行 Flash 内容。

现代替代方案完全基于 HTML5 标准：

| 旧方案 | 现代替代 |
|--------|----------|
| Flash Player | HTML5 Canvas / WebGL / WebGPU |
| ActionScript | JavaScript / TypeScript |
| Flash 网络通信 | WebSocket / WebTransport |

---

## 三、技术方案对比

### 3.1 渲染层（前端游戏引擎）

| 引擎 | 类型 | 推荐度 | 关键点 |
|------|------|--------|--------|
| **Phaser.js 3/4** | 完整 2D 游戏框架 | **强烈推荐** | 内置 Canvas/WebGL 双模式、Tilemap、Matter.js 物理、动画/音频/粒子，社区生态最活跃（2296+ 官方示例） |
| melonJS | 轻量级游戏引擎 | 可考虑 | 内置 Tiled 集成，但社区规模不及 Phaser |
| PixiJS | 2D 渲染库（非框架） | 不推荐首发 | 渲染性能极致但需自行搭建物理/动画/地图等基础设施，开发量大 |

### 3.2 多人实时通信

| 方案 | 类型 | 推荐度 | 关键点 |
|------|------|--------|--------|
| **Colyseus** | 权威多人游戏服务器框架 | **强烈推荐** | Node.js/TS 原生，开箱即用：房间管理、匹配、状态同步（delta encoding + 二进制 Schema）、客户端预测 + 服务器调和，防作弊 |
| Socket.io | 通用实时通信库 | 不推荐 | 需自行实现状态同步/房间/匹配/delta encoding，相当于重写半个 Colyseus |
| 原生 WebSocket | 底层传输 | 不推荐 | 开发量过大 |

### 3.3 地图编辑器

- **Tiled Map Editor**（mapeditor.org）：通用 2D 瓦片地图编辑器，导出 JSON，Phaser 与 melonJS 均原生支持。适合泰拉瑞亚风格的方块世界编辑。

### 3.4 最终推荐技术栈

```
前端（浏览器）
  └─ Phaser.js 3/4
       ├─ Canvas / WebGL 渲染
       ├─ Matter.js 物理引擎（内置，支持休眠优化）
       ├─ Tilemap 地图系统（对接 Tiled Editor）
       └─ Colyseus Client SDK

后端（Node.js 服务器）
  └─ Colyseus Server（权威服务器）
       ├─ 状态同步（delta encoding + binary Schema）
       ├─ 房间管理 + 匹配
       ├─ 客户端预测 + 服务器调和
       └─ PM2 多进程管理

工具链
  ├─ Tiled Map Editor（地图编辑，导出 JSON）
  ├─ Vite（前端构建）
  ├─ TypeScript（全栈类型安全，建议）
  └─ Nginx（反向代理 + 静态资源）
```

---

## 四、服务器资源评估

### 4.1 权威参考数据

| 数据来源 | 服务器规格 | 实测并发 | CPU 峰值 |
|----------|-----------|----------|----------|
| Colyseus 官方 FAQ | 小服务器基线 | 1000-2000 CCU（简单游戏） | - |
| Phaser+Colyseus 官方模板（2026-06） | 1 核 512MB（$4/月 droplet） | 200 并发（多房间） | 88% |

### 4.2 2 核 2G 40G 服务器承载预估

| 场景复杂度 | 预估并发 | 说明 |
|-----------|----------|------|
| 简单（聊天 + 移动） | 600-800+ | 接近 Colyseus 官方基线 |
| **泰拉瑞亚风格（沙盒建造 + 战斗 + 物理）** | **300-500** | 状态复杂度中等，物理计算增加 CPU 负载 |
| 高复杂度（大量 AI 实体 + 粒子 + 复杂物理） | 150-300 | 高频同步 |

> 推理依据：$4 droplet（1 核 512MB）实测 200 并发 @ 88% CPU；2 核 2G 相当于 CPU ~2x、内存 ~4x，保守估计可承载 300-500 人（泰拉瑞亚风格）。40G 磁盘：游戏服务端代码 < 100MB，地图数据数百 MB 级，绰绰有余。

### 4.3 性能优化建议

1. 使用 **uWebSockets.js** 替代默认 WebSocket 传输（性能提升显著）
2. 启用 Matter.js 的 `enableSleeping`（休眠物体不参与物理计算，省 CPU）
3. PM2 fork 模式充分利用多核
4. 合理设置 `patchRate`（默认 50ms，复杂场景可适当调高降低同步频率）
5. **视野裁剪**：只同步玩家视野范围内的实体（关键优化）
6. 场景分块：大世界按 chunk 管理，按需加载

### 4.4 结论

**2 核 2G 40G 服务器完全可行**，可承载泰拉瑞亚风格（中等复杂度）的 2D 沙盒游戏 **300-500 人同时在线**。进一步优化后可提升至 500-800 人。

---

## 五、集成方案建议

### 5.1 与现有项目的集成方式

现有项目为 Vue 3 SPA + Express API。新游戏板块建议采用以下集成策略：

```
nandexueyuan/
├── src/                          # 现有 Vue 前端
│   ├── views/
│   │   └── GameView.vue          # 新增：游戏入口页（挂载 Phaser Canvas）
│   └── router/                   # 新增路由 /game
├── game/                         # 新增：游戏模块（独立目录）
│   ├── client/                   #   Phaser 游戏客户端代码
│   │   ├── scenes/               #     场景（Boot/Preload/World/UIScene）
│   │   ├── objects/              #     游戏对象（玩家/方块/NPC）
│   │   └── main.js               #     Phaser 入口
│   └── shared/                   #   前后端共享类型/常量
├── server/                       # 现有 Express 后端
│   └── src/
│       └── game/                 # 新增：Colyseus 房间定义
│           ├── rooms/            #     游戏房间（WorldRoom）
│           └── schema/           #     状态 Schema（Player/Tile/Entity）
└── deploy.sh                     # 更新部署脚本
```

### 5.2 关键集成点

| 集成点 | 方案 |
|--------|------|
| 用户认证复用 | 游戏房间加入时校验现有 JWT Token，复用 nandexueyuan 用户体系 |
| 前端路由 | Vue Router 新增 `/game` 路由，GameView.vue 挂载 Phaser Canvas |
| 后端服务 | Colyseus Server 可作为独立进程（PM2 管理），或挂载到现有 Express 实例 |
| Nginx 配置 | 新增 WebSocket 反向代理规则（`/ws` -> Colyseus Server） |
| 数据库 | 游戏世界持久化数据可继续用 SQLite，或独立为游戏专用库 |

### 5.3 部署架构演进

```
现状：
  浏览器 -> Nginx -> 静态资源 (dist/)
                -> 反向代理 -> PM2 (nandexueyuan-api) -> Express:3000 -> SQLite

演进后：
  浏览器 -> Nginx -> 静态资源 (dist/)
                -> /api -> PM2 (nandexueyuan-api) -> Express:3000 -> SQLite
                -> /ws  -> PM2 (nandexueyuan-game) -> Colyseus:2567 -> 游戏状态
```

---

## 六、风险与注意事项

### 6.1 技术风险

| 风险 | 影响 | 应对 |
|------|------|------|
| 物理引擎 CPU 占用高 | 服务器卡顿 | Matter.js 休眠优化 + 限制单房间实体数量 |
| 状态同步带宽消耗 | 网络拥堵 | 视野裁剪 + delta encoding + 合理 patchRate |
| 内存占用增长 | OOM | 监控 PM2 内存，限制单房间人数，定期重启 |
| 作弊防护 | 数据篡改 | Colyseus 权威服务器模式，客户端只发输入 |

### 6.2 资源冲突风险

现有服务已占用部分资源（Express API + SQLite + Nginx）。新增游戏服务后需关注：

- **内存**：2G 总内存需同时跑 Express + Colyseus + Nginx，建议监控峰值
- **CPU**：物理计算与 API 请求竞争 CPU，建议 PM2 分配独立进程
- **建议**：上线前做一次负载测试，观察峰值下整体表现

### 6.3 开发工作量提示

泰拉瑞亚风格游戏的核心系统较多，建议分阶段交付：

1. **MVP**：角色移动 + 瓦片地图 + 多人可见
2. **V1**：方块挖掘/放置 + 简单物理 + 聊天
3. **V2**：战斗系统 + 物品/背包 + 世界持久化
4. **V3**：NPC/敌人 + 任务系统 + 进阶玩法

---

## 七、需要准备的事项清单

### 7.1 必备准备

- [ ] 确认游戏玩法范围（MVP 边界）
- [ ] 注册/准备游戏美术资源（像素风瓦片图、角色精灵图）
- [ ] 安装 Tiled Map Editor 并制作初始地图
- [ ] 服务器资源评估：确认当前 Express + SQLite 实际内存占用基线
- [ ] Nginx 配置 WebSocket 反向代理（`/ws` 路径）

### 7.2 技术选型确认

- [ ] 前端引擎：Phaser.js 3（稳定）或 4（新）
- [ ] 后端框架：Colyseus（最新版）
- [ ] 是否引入 TypeScript（强烈建议，游戏逻辑复杂度高）
- [ ] 物理引擎：Matter.js（Phaser 内置）vs Arcade（简单）

### 7.3 参考资源

| 资源 | 用途 |
|------|------|
| Phaser 官方文档 | https://phaser.io/learn |
| Colyseus 官方文档 | https://docs.colyseus.io/ |
| Tiled Map Editor | https://www.mapeditor.org/ |
| Phaser+Colyseus+React 模板 | phaser.io/news/2026/06（含客户端预测实现，实测 200 并发） |
| Colyseus 官方 FAQ | docs.colyseus.io（含 CCU 承载参考） |

---

## 八、一句话结论

**不需要 Flash**；推荐 **Phaser.js + Colyseus + Tiled** 技术栈；2 核 2G 40G 服务器可承载 300-500 人同时在线；与现有 Vue + Express 项目可通过路由挂载 + 独立游戏进程的方式平滑集成。
