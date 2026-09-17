# AI 交接单

> 最后更新：2026-09-15 18:20（白机：handoff 瘦身重构——历史产出节迁至 `.ai/handoff-archive.md`，本文件只留战术级当前状态 + 路径索引。历史从未删除，只是搬走）
> 所在设备：白机（判定依据：周二 15:12 工作日白天时段）
> 稳定版本：**v3.7.0 线上**（commit `50c50cf`，2026-09-15 17:20 部署上线，deploy.sh 9/9 全过 + probeModel 5/5 含视觉直识图实测）
> 数据规模：prod.db 205M —— message_chunks 5,372 块（keywords 零空缺）/ group_messages 538,915 条 / users 21 / chat_turns 148 / game_saves 1

> ⚠️ **网络环境与部署通道（动手前必查）**：
> - GitHub SSH 偶发超时（已配 `~/.ssh/config` 走 ssh.github.com:443 备用），push 超时重试即可
> - 服务器 SSH 22 偶发超时（2026-09-15 当天发生 3 次，重试/退避即恢复，非密钥问题）
> - **🔴 部署铁律**：IP/账号/密钥/路径以 `docs/account-passwords.md` 为准（正确 IP `47.96.158.104`，禁用 IP `47.96.158.95`），执行任何 ssh/scp 前先读该文档；部署前必走 release-helper（AGENTS.md 部署纪律）
> - GitHub 全断时走服务器中继推送（git bundle → scp → 服务器代 push，见归档 2026-09-15 节）

---

## 历史记录路径索引（handoff 已瘦身，详细记录去这里查）

| 想知道什么 | 去哪查 |
|---|---|
| 历史里程碑 / 发版记录 | 根 `CHANGELOG.md`（架构级+发版，倒序） |
| 已完成需求全列表 | `pm/需求池.md`「已完成」表（R-001~R-053） |
| 待开发需求与优先级 | `pm/需求池.md`「待开发」表（**唯一权威来源**，AGENTS 需求池常驻引用规则） |
| 德塔/门户模块变更明细 | `prd/01-需求文档/04-德塔/changelog.md` |
| 男德通 Agent 层变更 | `server/src/agents/changelog.md` |
| 男德通 LLM/工具层变更 | `server/src/utils/changelog.md`、`server/scripts/` |
| Bug 历史与根因 | `prd/01-需求文档/04-德塔/bug-log.md`（BUG-001~079） |
| 架构决策（ADR） | `prd/01-需求文档/00-调研/decisions/` |
| 男德通技术方案 | `prd/01-需求文档/03-男德通/`（R-053/R-056/summary 重跑等设计文档） |
| 调研报告 | `prd/01-需求文档/00-调研/` |
| 战略路线与里程碑 | `pm/ROADMAP.md` |
| 历史会话产出原话（瘦身前） | `.ai/handoff-archive.md`（2026-09-15 之前所有轮次，原样保留） |

**换机恢复上下文顺序**：①本文件（战术状态）→ ②`pm/需求池.md`（裁决权威）→ ③`pm/ROADMAP.md`（战略）。本文件**全量可读**（<200 行），无需再滚动翻历史。

---

## 遗留清账状态（2026-09-15 v2，院长 11 项裁决后；下轮以此为准）

**已关闭（7 项）**：
- ✅ BUG-79 修复（FTS5 特殊字符三层加固，**已随 v3.7.0 上线**，BUG-67 遗留同根因已覆盖）
- ✅ BUG-73 同族修复（移动端 FeedbackView/WallView 底栏让位首次生效，**已上线**）
- ✅ 7 块代填复核（6755/6757/6765/6990/7645/10522/11915）——院长黑机已确认接受
- ✅ 宝塔面板（项目不用，`.env.example` 已清注释段）
- ✅ planner 闲聊误规划成检索（低优，院长定不重要，不处理）
- ✅ uploads/chat 孤儿图片清理（量小，不做）
- ✅ dev.db / _prisma_migrations 漂移根治（低优，下一次动 schema 时一起）

**已实施已上线（2 项，v3.7.0）**：
- ✅ R-055 方案①（rerank 兜底前 5→8，考公块 10522 案受益）
- ✅ 视觉链路动态路由（先试主模型直识图→失败 fallback visionAgent→再失败降级文本；**探针实测 glm-5.3-flash 6.3s 识别正确**）

**已落档未实施（1 项）**：
- 📄 summary 列重跑——材料见 `prd/01-需求文档/03-男德通/summary列重跑材料.md`（院长定"记录，近期不做"）

**已定性暂缓（3 项）**：
- glm 全量分析并发超时（只记录不安排，v3.7.0 上线后看 PM2 日志）
- 需求池 R-xxx 全量裁决项（保持现状，见 AGENTS「需求池常驻引用」）
- R-056 rerank 重试设计（设计已落档 `prd/01-需求文档/03-男德通/R-056-rerank重试设计.md`，待院长排期）

**待院长（0 项）**：当前无待裁决项

---

## 最近一轮产出摘要（白机 2026-09-15，详情查 changelog×2/bug-log/根 CHANGELOG v3.7.0 节）

- **遗留清账**：BUG-79 + BUG-73 同族修复（commit `3d7b72b`，内存库/Playwright 实测全过）
- **11 项裁决归档**（commit `e35faa4`）：AGENTS.md 加「需求池常驻引用」+「部署前必走 release-helper」两条默认规则
- **R-055 方案①**（commit `0859277`）：`RERANK_FALLBACK_KEEP=8`
- **R-056 设计落档**（commit `734806d`）+ **summary 列重跑材料落档**（commit `c3e4c16`）
- **视觉链路动态路由实施**（commit `7697289`）：llm.js `chatCompletionWithImages` + visionAgent `tryDirectMultimodal` + orchestrator 三层 fallback + probeModel ⑤ 视觉子项
- **v3.7.0 发版部署**（commit `7869c12` + `50c50cf`）：deploy.sh 9/9 全过 + 公告 v3.7.0 写入 prod.db + probeModel 5/5 含视觉直识图（glm-5.3-flash 多模态能力实测确认）

---

## 环境事实速查（散落要点集中，避免重新踩坑）

| 事实 | 说明 |
|---|---|
| 白机 dev.db 无群聊数据 | `group_messages=0`（数据在黑机 dev.db 与线上 prod.db），数据级验证走服务器直查或内存库 |
| SSH 22 偶发超时 | 服务器与 GitHub 都会发生，重试/退避即恢复，当天多次属正常 |
| search-worker 黑机重启需手动 | `cd server && npx pm2 start src/searchWorker.js --name search-worker`，无开机自启 |
| 线上模型 | 主模型 `glm-5.3-flash`（coding 端点）+ 视觉 fallback `doubao-seed-2-0-mini`（标准端点）；thinking:disabled 自动降级已内建 |
| Git Bash curl 中文乱码 | 白机终端 GBK 编码，线上测中文接口用服务器 node 直跑或浏览器（BUG-73 排查教训） |
| WAL 模式备份 | prod.db 备份必须 `sqlite3 .backup` 而非 cp（活跃写入时 cp 会损坏） |
| dev.db/prod.db 双库陷阱 | `DATABASE_URL` 指哪个 sqlite3 命令行就操作哪个（BUG-61/65/70 同族） |
| 发布流程 | 发版必走 release-helper SKILL（ADR-004 版本号 + seedVersion 公告 + CHANGELOG + 本文件「稳定版本」行） |

---

## 瘦身纪律（2026-09-15 定，写给未来的 AI 会话）

1. **本文件不堆历史**：每轮产出的详细记录进各层 changelog/bug-log，本文件只留「最近一轮产出摘要」（≤10 行，含 commit 号与验证结论）
2. **超龄即归档**：超过 2 轮的产出摘要移入 `.ai/handoff-archive.md`（追加到归档头部，标注迁出日期）
3. **「当前阶段」不复活**：历史里程碑查根 CHANGELOG 与需求池已完成表，本文件不维护长串 ✅ 列表
4. **新会话起手顺序**：身份判定 → git pull → 读本文件（全量）→ 读需求池 → 读 ROADMAP
