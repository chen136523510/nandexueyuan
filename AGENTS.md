# AGENTS.md — 男德学院项目指令

> 本文件是 ZCode 在本仓库的统一行为指令。`.trae/rules/` 下的规则是 Trae IDE 用的原始来源，本文件为其 ZCode 适配版（精炼 + 路径修正）。

## 项目概览

**男德学院** — 朋友圈限定社区（约 20 人），核心是一个名为「德塔」的 2D 像素风虚拟世界（Phaser 4 + Colyseus 多人实时同步）。

- 线上地址：https://www.nandexueyuan.top
- 仓库：`chen136523510/nandexueyuan`（GitHub，私有）
- 开发模式：**单人双机协作**（白机白天 / 黑机晚上），详见下文「双机协作」
- 交接单：`.ai/handoff.md`（每次换机必读）

## 技术栈与启动

| 层 | 技术 | 端口 |
|---|------|------|
| 前端 | Vue 3 + Vite 6 + Pinia | 4396 |
| 游戏前端 | Phaser 4 | - |
| 游戏后端 | Colyseus 0.16 | 2567 |
| API 后端 | Express + Prisma | 3000 |
| 数据库 | SQLite | - |

```bash
# 三个终端分别启动
npm run dev                      # 前端 → localhost:4396
cd server && npm run dev         # API 后端 → localhost:3000
cd game-server && node src/index.js  # 游戏服务器 → localhost:2567
```

**包管理器**：项目 `package.json` 声明 `pnpm`，但实际脚本用 `npm`。新装依赖统一用 `npm install <pkg>`，不要混用 yarn/pnpm 命令以免锁文件冲突。

## Git 工作流（单人仓）

- **主干**：`master`，单人仓**不设主干保护**，可直接 commit + push
- **功能开发**：从 master 切 `feature/<描述>` 分支，完成后合并回 master
- **操作前必做**：静默执行 `git branch --show-current` 和 `git status`，禁止推测上下文
- **合并前必做**：`git fetch origin && git pull origin master`，避免覆盖远端

### Commit 信息规范

格式：`[类型](模块): 动作及意图`

| 标识 | 用途 |
|------|------|
| `[feat]` | 新功能（代码） |
| `[fix]` | 修复 bug（代码） |
| `[refactor]` | 重构（不改外部行为） |
| `[docs]` | 文档变更 |
| `[chore]` | 杂务/构建/依赖 |
| `[文档]` | 需求/设计文档（PRD、ADR） |

- **禁止** `update`/`fix`/`修改` 等无信息量模糊词
- 动词开头，说清改了什么、为什么
- 合并提交（`Merge branch ...`）由 git 自动生成，无需套格式

## 部署纪律（红线）

**未经用户明确指示，禁止执行任何部署到生产环境的操作。**

- 「明确指示」= 用户说出：部署到正式 / 部署到生产 / 上线 / 发布
- 开发完成后只能：本地构建验证（`npm run build`）、本地运行测试、提交代码
- **严禁**自行执行 `scp`、`rsync`、`systemctl restart`、`pm2 restart`、`ssh ... deploy.sh` 等命令
- 用户要求部署时，先确认目标环境，确认后再执行

部署参考：`bash deploy.sh`（构建前端 + 重启 Express 和 game-server PM2 进程）。

## 文档与 Changelog 纪律（强制）

**代码改了但文档没更新 = 任务未完成。**

完成任何代码修改后，必须同步更新：

| 变更类型 | 需更新的文档 |
|---------|-------------|
| 新增功能/需求 | `prd/01-需求文档/04-德塔/changelog.md` + 相关需求文档 |
| 缺陷修复 | `prd/01-需求文档/04-德塔/changelog.md` + `prd/01-需求文档/04-德塔/bug-log.md` |
| 架构变更 | 根 `CHANGELOG.md`（记录决策依据 + 替代方案 + 影响评估） |
| 接口变更 | changelog + 相关技术方案文档 |

### Changelog 层级

- **架构级** → 根 `CHANGELOG.md`（新增/删除目录层、技术栈变更、跨层重构）
- **文件级** → 各层 `changelog.md`（如 `src/api/changelog.md`、`server/src/routes/changelog.md` 等，新增层时同步创建）
- 所有 changelog **倒序排列**（最新在最上方）

### Bug 修复必须登记 bug-log

任何运行时错误登记到 `prd/01-需求文档/04-德塔/bug-log.md`，字段：发现时间、环境、现象、**根因**、修复、教训。

## 双机协作（项目核心特色）

单人开发者，白天白机（荣耀便携本），晚上黑机（RTX 4070 主力机 + ComfyUI），通过 GitHub 中央仓库协同。

**两机能力对等**：均可开发、合并、push master、部署上线。

### 换机铁律

接手第一件事：
1. `git fetch origin && git pull origin master`
2. **先合并对方遗留的 PR**（如有），再开始自己的开发
3. 阅读 `.ai/handoff.md` 恢复上下文

### 会话结束必做

1. `git push` 所有提交到 feature 分支或 master
2. 更新 `.ai/handoff.md`（当前分支、未完成事项、下一步、环境状态）

## 禁止事项

1. **禁止 TRAE SOLO 徽章注入** — 不得在 `package.json`/`vite.config.js`/`index.html` 中添加 `vite-plugin-trae-solo-badge` 或任何 TRAE 推广内容。发现立即删除。
2. **禁止自行部署** — 见上文「部署纪律」。
3. **禁止提交敏感文件** — `.env`、`askass.bat` 等已在 `.gitignore`，不得 `git add` 强制入库。
4. **禁止跳过文档更新** — 见上文「文档与 Changelog 纪律」。

## AI 行为准则

1. **每次 git 写入前**：静默执行 `git status` + `git branch --show-current`，拒绝推测上下文
2. **方案决策**：遇优先级判断或复杂决策，提供至少 2 种路径，对比业务价值与交付成本
3. **MECE 边界审查**：梳理需求时主动补全异常分支（断网、无权限、空状态、极值）
4. **检查点纪律**：完成重要输出后，总结已确认决策点、待验证假设、剩余待办
5. **暴露冲突**：规则相互矛盾时明确择一并阐明理由，禁止强行融合
6. **调试思维**：写代码遇到问题时，通过打印断点、输出日志来定位，不要单纯依靠推理

## 关键踩坑记录（必读）

完整记录见 `prd/01-需求文档/04-德塔/changelog.md` 和 `.ai/handoff.md` 的「德塔踩坑记录」表。高频坑：

- Colyseus 锁定 0.16.0（0.15 不兼容 schema 3.x，0.17 下载超时）
- Nginx `proxy_pass http://127.0.0.1:2567/;` 尾部斜杠必须（剥离 /ws 前缀）
- JWT 密钥用 `function getSecret()` 运行时读取（ESM import 提升会导致回退值）
- Phaser 场景切换用 `onUnmounted` → `destroyGame()`，不要用 `visibilitychange`
