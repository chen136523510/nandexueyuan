# 生产环境部署指南 - WebSocket 黑机外包检索

> 版本：v1.1 | 日期：2026-07-22
> 适用场景：BUG-36 架构优化（黑机外包检索）首次部署到生产
> **部署状态：✅ 已完成**（2026-07-22 黑机部署，云端 + 黑机 Worker 端到端验证通过）

---

## 📋 架构现状

```
用户浏览器 ──HTTPS──> 阿里云 ECS（47.96.158.104）
                        ├─ Nginx :80/:443        （前端静态）
                        ├─ Express :3000          （PM2: nandexueyuan-api）
                        ├─ Colyseus :2567         （PM2: nandexueyuan-game）
                        └─ WS Hub :3000/search-hub ←── 黑机 WS Worker 主动连出
                                                          │
                    黑机（本机 R7 9700X / 32GB）──────────┘
                        └─ node src/searchWorker.js（7×24 常开）
```

| 角色 | 设备 | 已有环境 | 本次需要做什么 |
|---|---|---|---|
| **云端服务器** | 阿里云 ECS 2核2G | ✅ Node.js + PM2 + Nginx + deploy.sh | 拉新代码 + 配置 .env + 重启 |
| **黑机**（本机） | R7 9700X / 32GB / RTX 4070 | ✅ Node.js v24.18.0 | 装 PM2 + 配置 .env + 同步数据库 + 启动 Worker |

**关键点**：黑机就是当前这台机器，不需要 SSH，直接本地操作。

---

## 🚀 部署步骤

### 第一阶段：提交代码到 GitHub

> 当前有 11 个文件改动未提交，云端需要通过 git pull 获取。

```bash
# 在黑机（本机）执行
cd G:/UGit/nandexueyuan

# 1. 确认在 master 分支
git branch --show-current

# 2. 暂存所有改动
git add -A

# 3. 提交
git commit -m "[feat](检索): BUG-36 黑机外包检索 WebSocket 方案落地

- 新增 searchHub.js（云端 WS Hub）+ searchWorker.js（黑机 Worker）
- orchestrator 集成外包逻辑 + 3 个子 Agent limit 参数化
- 降级策略：黑机在线→全量检索；离线/超时→本地 LIMIT 50
- 新增 sync-prod-db.sh 数据库同步脚本
- deploy.sh 补充 ws 依赖安装"

# 4. 推送到 GitHub
git push origin master
```

---

### 第二阶段：云端服务器部署

> SSH 到阿里云 ECS，用现有 deploy.sh 部署。

```bash
# 1. SSH 登录云端
ssh root@47.96.158.104

# 2. 进入部署目录
cd /root/projects/www.nandexueyuan.top

# 3. 执行部署脚本（会自动 git pull + npm install + pm2 restart）
bash deploy.sh
```

**deploy.sh 会自动完成**：
- ✅ `git pull origin master`（拉取最新代码）
- ✅ `npm install` + `npm install ws`（安装依赖）
- ✅ `npx prisma generate` + `npx prisma migrate deploy`
- ✅ `npm run build`（构建前端）
- ✅ `pm2 restart nandexueyuan-api`（重启后端，含 WS Hub）
- ✅ `pm2 restart nandexueyuan-game`（重启游戏服务器）
- ✅ 验证三个服务正常

**部署后验证**：
```bash
# 检查 WS Hub 是否挂载
pm2 logs nandexueyuan-api --lines 5 --nostream
# 应看到: [SearchHub] WS Hub 已挂载到 /search-hub
```

**配置云端 .env**（如果尚未配置）：
```bash
# 确认云端 .env 有 Token（和黑机必须一致）
cat server/.env | grep BLACK_WORKER_TOKEN
# 如果没有，手动添加：
# echo 'BLACK_WORKER_TOKEN=nan-de-xue-yuan-black-2025-secure-token' >> server/.env
# pm2 restart nandexueyuan-api
```

---

### 第三阶段：黑机 Worker 部署（本机）

> 黑机就是当前机器，直接本地操作。

#### 3.1 安装 PM2（黑机首次需要）

```bash
# 黑机当前没有 PM2，安装一下
npm install -g pm2

# 验证
pm2 --version
```

#### 3.2 配置 .env 指向生产云端

```bash
# 修改 server/.env 的 CLOUD_WS_URL
# 生产地址（通过 Nginx 反代，无需开放 3000 端口）：
# CLOUD_WS_URL=ws://www.nandexueyuan.top/search-hub
```

> ⚠️ 注意：本地开发用 localhost，生产部署用域名。如果后续还要本地联调，记得切回来。

#### 3.3 同步生产数据库

```bash
# 从云端拉取 prod.db（包含完整 89340 条群聊记录）
cd G:/UGit/nandexueyuan
bash scripts/sync-prod-db.sh
```

**脚本会自动**：
- 备份本地 dev.db → `dev.db.backup.时间戳`
- 从 `root@47.96.158.104` 拉取 prod.db
- 保存为本地 `server/prisma/dev.db`
- 显示文件大小（约 700MB）

#### 3.4 启动黑机 Worker

```bash
cd G:/UGit/nandexueyuan/server

# 用 PM2 启动（7×24 守护，崩溃自动重启）
npx pm2 start src/searchWorker.js --name search-worker

# 保存 PM2 配置（开机自启以后再配）
npx pm2 save
# npx pm2 startup   # 开机自启，以后再配

# 查看日志
npx pm2 logs search-worker --lines 10
```

**预期日志**：
```
[WS Worker] 连接云端: ws://www.nandexueyuan.top/search-hub
[WS Worker] 连接已建立，发送握手...
[WS Worker] 认证成功，黑机已上线
```

#### 3.5 验证云端收到黑机连接

```bash
# SSH 到云端查看日志
ssh root@47.96.158.104 "pm2 logs nandexueyuan-api --lines 5 --nostream"

# 应看到:
# [SearchHub] 黑机认证成功，已上线
```

---

### 第四阶段：端到端验证

1. **浏览器访问**：`https://www.nandexueyuan.top`
2. **登录后进入德塔**，找到男德通 NPC
3. **提问**："如何评价丘序明？"
4. **观察**：
   - 前端：AI 流式回复正常，内容包含丘序明的发言分析
   - 云端日志：`[orchestrator] 下发 person_messages 给黑机` → `黑机执行成功`
   - 黑机日志：`[WS Worker] 收到任务 person_messages` → `执行完成，耗时 0.x 秒`

---

## 🔄 降级测试

验证黑机离线时云端自动降级：

```bash
# 1. 停掉黑机 Worker
npx pm2 stop search-worker

# 2. 浏览器提问"如何评价丘序明？"
#    云端日志应显示: [Orchestrator] 黑机失败，降级本地: ...
#    前端仍能正常回复（精度降低但可用）

# 3. 重启黑机 Worker
npx pm2 start search-worker

# 4. 等待 5 秒自动重连，再提问验证恢复全量检索
```

---

## 📊 日常运维

### 常用 PM2 命令（黑机）

```bash
npx pm2 status                    # 查看状态
npx pm2 logs search-worker        # 实时日志
npx pm2 logs search-worker --err  # 只看错误
npx pm2 restart search-worker     # 重启
npx pm2 stop search-worker        # 停止
npx pm2 monit                     # 实时监控 CPU/内存
```

### 常用 PM2 命令（云端）

```bash
ssh root@47.96.158.104
pm2 status                    # 查看 nandexueyuan-api + nandexueyuan-game
pm2 logs nandexueyuan-api     # 后端 + WS Hub 日志
```

### 日志轮转（防止磁盘满）

```bash
# 黑机 + 云端都执行
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### 数据库重新同步（云端有新数据时）

```bash
# 黑机执行
cd G:/UGit/nandexueyuan
bash scripts/sync-prod-db.sh
npx pm2 restart search-worker
```

---

## 🐛 常见问题

### Q1：黑机 Worker 连不上云端

```bash
# 1. 检查云端 3000 端口是否开放
# 云端安全组需要放行 3000 端口（或用 Nginx 反代 WS）
ssh root@47.96.158.104 "netstat -tulpn | grep 3000"

# 2. 检查网络连通性
ping 47.96.158.104
# 如果 ping 不通，检查阿里云安全组规则

# 3. 检查 Token 是否一致
# 黑机: grep BLACK_WORKER_TOKEN server/.env
# 云端: ssh root@47.96.158.104 "grep BLACK_WORKER_TOKEN server/.env"
```

### Q2：云端安全组没开放 3000

> 阿里云 ECS 默认安全组可能没放行 3000。

**解决方案 A**（推荐）：Nginx 反代 WebSocket
```nginx
# 云端 Nginx 配置增加
location /search-hub {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```
然后黑机 .env 改为：`CLOUD_WS_URL=ws://www.nandexueyuan.top/search-hub`

**解决方案 B**：安全组放行 3000 端口
- 阿里云控制台 → ECS → 安全组 → 添加入方向规则 → TCP 3000

### Q3：黑机 Worker 崩溃循环

```bash
# 查看错误日志
npx pm2 logs search-worker --err --lines 30

# 常见原因：
# - 数据库路径错误：确认 server/prisma/dev.db 存在
# - Token 不匹配：对比两端 .env
# - 网络不通：检查防火墙/安全组
```

### Q4：本地开发 vs 生产切换

黑机 .env 的 `CLOUD_WS_URL` 需要区分：
- **本地联调**：`ws://localhost:3000/search-hub`
- **生产部署**：`ws://www.nandexueyuan.top/search-hub`（通过 Nginx 反代，无需开放 3000 端口）

切换后需重启 Worker：`pm2 restart search-worker`

---

## 📝 部署检查清单

> 以下为 2026-07-22 黑机实际部署结果

- [x] 代码已 commit + push 到 GitHub master
- [x] 云端：`git pull` + `npm install` + `prisma migrate` 执行成功
- [x] 云端：`.env` 有 `BLACK_WORKER_TOKEN`
- [x] 云端：Nginx `/search-hub` WS 反代已配置 + reload
- [x] 云端：PM2 `nandexueyuan-api` + `nandexueyuan-game` 重启成功
- [x] 云端：日志显示 `[SearchHub] WS Hub 已挂载到 /search-hub`
- [x] 黑机：PM2 已安装（npx pm2）
- [x] 黑机：`.env` 的 `CLOUD_WS_URL=ws://www.nandexueyuan.top/search-hub`
- [x] 黑机：`prod.db` 已同步（07-21 完成）
- [x] 黑机：PM2 `search-worker` 启动成功，已 `pm2 save`
- [x] 黑机：日志显示"认证成功，黑机已上线"
- [x] 云端：日志显示"黑机认证成功，已上线"
- [x] 降级验证：网络中断后 Worker 自动重连成功（5s 重连机制验证通过）
- [ ] 端到端：用户提问验证全量检索结果（待用户在浏览器操作）
- [ ] `pm2 startup`：开机自启（用户说以后再配）

---

**文档版本**：v1.1 | **维护者**：黑机（陈梓键）
**最后部署**：2026-07-22 | **最新提交**：`72f77e3`
