# AI 交接单

> 最后更新：2026-10-02 01:55（黑机：**诺诺眼球总成 v1 落地 + PoC 动态上屏**——Blender 精细化管线打通；全部已推送至最新 commit）
> 所在设备：黑机（判定依据：本会话为黑机 2026-09-30 19:48 会话延续至 2026-10-01 17:34，全程同一台 RTX 4070 主力机产出；17:34 虽落入白机时段，但设备未换，如实记黑机）
> 稳定版本：**v4.1.0 线上**（commit `bd6e238`；**本地 594bcff 缓存结构优化未部署**——攒至下轮功能改动一起发）
> 数据规模：prod.db —— message_chunks 5,372 块 / group_messages 538,915 条 / users 21（1 super_admin + 1 admin + 19 member）+ nono 两表 + feedbacks 表（BUG-080 补建）

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
| 调研报告 | `prd/01-需求文档/00-调研/` 分类子目录（`01-技术`/`02-工具与AI服务`/`03-产品与游戏设计`/`04-美术`，2026-09-20 起归类，规则见该目录 README.md） |
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

## 最近一轮产出摘要（黑机 2026-10-02 01:55·诺诺眼球总成 v1 + PoC 动态上屏）

- **眼球总成 v1 落地**（bbab12b 方案 → dee5c07/3d44e21 落库）：Blender 5.2.2 + VRM 插件 4.7.2 兼容实测通过（headless 全程脚本化）；贴片眼改 3D 眼（巩膜椭球/虹膜/瞳孔/同侧高光/眼窝衬底，10 部件直挂 head 骨），v6 VRM 往返导出验证；验收图 3 张 + 参数化重建脚本 build_eyes_v1.py 入库诺诺目录
- **PoC 动态上屏**（d91e984）：v6 接入 nono-poc（?model=v5 对照），运行时绕球心旋转=lookAt、眨眼沿 -N 后移 5mm 规避悬浮盘；眨眼/视线跟随实测生效，200FPS，HUD 加模型切换按钮
- **三坑入档**（详见诺诺 README）：①VRM 导出器把嵌套在骨骼父级空物体下的子物体双重烘焙→改扁平结构 ②眼部件被头部投影罩黑（PBR 无环境光）→关投影+补 HemisphereLight ③ACES 下 PBR 虹膜发灰（v2 调色或改 MToon）
- **待院长验收**：localhost:5175 动态眨眼/视线跟随/v5-v6 对比；dev server 随关机停止，下次 cd nono-poc 后 npm run dev 重启
- **下一步**：①按院长反馈调色+lookAt 手感 ②Step 0 动作管线（Mixamo 4 动作→Blender 重定向→.vrma→PoC，院长已登录 Mixamo）③v2 眼部精修（眼睑重贴合/虹膜贴图/球面盖/眼窝内衬）
- **⚠️ 本轮事故记录**：会话收尾时 node -e 脚本内反引号被 bash 命令替换执行，交接单内容被当 shell 跑（无真实 SSH/部署动作发生，仅本地 command not found）；产生杂散文件已清理；npx 缓存混入 capcut-cli（无害）；教训=含反引号/特殊字符的长脚本禁止内联 bash 传递，走文件或 Edit 工具。.blend 有院长未提交的手动保存，下轮问明意图后提交或还原

---

## 上一轮摘要（黑机 2026-10-01 18:05·诺诺渲染管线 PoC 通过 + 方向裁决）

- **PoC 7 项验收全过**（`ec59236` 方案 → `cbcb69a` 实现）：`nono-poc/`（three 0.186+three-vrm 3.5.5）加载 nonono_v5.vrm——上屏/眨眼呼吸/lookAt/表情切换/SpringBone/**200FPS**，2 张渲染截图归档诺诺目录；**VRoid→VRM→Web 全链路打通，R-058 建模可行性闭环**
- **方案文档**：`07-自习室/诺诺Web渲染管线PoC方案.md`（7 验收标准+实测回填+4 坑：VRM 跨目录 404 用 assetsInclude+?url、lookAt target 需显式赋值、手臂方向 T-pose 收拢符号、lookAt 上下反转已修）
- **🎯 院长方向裁决（2026-10-01）**：下一阶段=**①精细化建模（二期贴图层）+②Blender 骨骼设置（动作库前置）**——直播间集成推后不作为下一站
- **捏模一期**（`a248e8f`→`14860dd`）：指导单 11 步全通，v1~v5+vrm+验收图全入库 `05-美术设计/诺诺/`（院长指定归档目录，README 登记参数/差异/二期清单）
- **Computer Use 首战经验**：接管 VRoid 全程实操；CUA 须 ZCode 重启生效；Unity 视口合成输入免疫需硬件鼠标；中文剪贴板须 PowerShell EncodedCommand
- **下一步（AI 侧）**：写「精细化建模+Blender 骨骼」方案文档（文档先行），方案含二期贴图层清单与 Mixamo→VRM 骨骼路径；**院长侧**：nono-poc 可本地跑（`cd nono-poc && npm run dev` → localhost:5175，鼠标跟随+表情按钮）

---

## 超龄摘要（迁入归档）

- 2026-09-30 黑机（诺诺形象定稿+知识库三件套+AI 视频解析）摘要已迁 `.ai/handoff-archive.md`（2026-10-01 黑机迁出）；此前 09-24/09-23 两轮亦在归档

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
| Computer Use 接管桌面应用 | ZCode **重启后才生效**（CUA 服务须先于 ZCode 启动，socket 变量才注入）；Unity 应用（VRoid）3D 视口对合成输入免疫（滚轮/拖拽/双击需硬件鼠标），UI 面板与数值框可全自动；中文经 Git Bash `printf|clip` 乱码，须 PowerShell EncodedCommand 写剪贴板 |

---

## 瘦身纪律（2026-09-15 定，写给未来的 AI 会话）

1. **本文件不堆历史**：每轮产出的详细记录进各层 changelog/bug-log，本文件只留「最近一轮产出摘要」（≤10 行，含 commit 号与验证结论）
2. **超龄即归档**：超过 2 轮的产出摘要移入 `.ai/handoff-archive.md`（追加到归档头部，标注迁出日期）
3. **「当前阶段」不复活**：历史里程碑查根 CHANGELOG 与需求池已完成表，本文件不维护长串 ✅ 列表
4. **新会话起手顺序**：身份判定 → git pull → 读本文件（全量）→ 读需求池 → 读 ROADMAP
