# AI 交接单

> 最后更新：2026-08-03 17:53（白机：社区站视觉体系统一+根目录清理+v2.4.0发版部署+文档同步，准备下机）
> 所在设备：白机（荣耀便携本）
> 稳定版本：v2.4.0 已部署上线（commit `811410d`，代码产出 commit `53ab43f`+`fef6e7f`）
> **当前阶段**：M-G1 引擎核心 PoC ✅ + 序章四幕全量落地 ✅ + 存档系统 ✅ + Seedream调研 ✅ + 9角色脸模入库 ✅ + 序章6张背景图接入 ✅ + 见/幸/添立绘8张+表情差分 ✅ + 立绘舞台状态机制 ✅ + 立绘rembg重抠8/8 ✅ + 立绘位置规则(小腿中部对齐) ✅ + 序章结束场景热点交互 ✅ + 部署上线 ✅ + 存档系统优化(自动恢复+新建从头) ✅ + 热点添对话Q&A问答+主线隔离 ✅ + 世界格局地图生成+地图面板交互 ✅ + 序章旁白优化(四幕44->42句)+pro_302穿帮修正 ✅ + 图片预加载机制(首次加载+进度条) ✅ + 世界书评审+补充11条目 ✅ + 设定集v1.4过时内容修正 ✅ + 第一章大纲产出 ✅ + **社区站视觉体系统一(hallmark audit+霞鹜文楷+全站token化) ✅**

---

## 白机本轮产出（2026-08-03 12:04）

### 社区站视觉体系统一（本轮）

**1. Hallmark audit 全站审查**
- 用 hallmark 设计技能对社区站 5 个核心页面做 anti-AI-slop 审查
- 发现 8 critical + 5 major + 3 minor，判定 ships as slop
- 根因：骨架撞模板(居中hero三件套+等高卡片网格) + 字体零配对 + token未贯穿

**2. 字体系统建立**
- 引入霞鹜文楷(LXGW WenKai) 作为 display 字体，jsDelivr CDN 加载
- 建立 `--md-font-display` / `--md-font-body` 双 token 体系

**3. 首页 HomeView 重构**
- hero 居中三件套 → 左对齐 editorial
- 等高卡片网格 → 纵向非对称
- icon 圆形独占 → 内联方形

**4. 全站 token 化推广**
- MainView/WallView/ChatView 统一字体+莫兰迪 token
- ChatView 深色 header → 浅色 + 全页 Ant 蓝硬编码 → 莫兰迪 token
- TopBar display 字体 + active 下划线；AppFooter Ft5 宣言

**5. 根目录清理**
- 删除 13 个测试截图 + dist + 临时目录
- git rm net_test.txt + ecs 安全组导出
- 增强 .gitignore

**6. 美术设计文档**
- 新增 `prd/01-需求文档/05-美术设计/design-system.md` + `changelog.md`

**7. 部署上线**
- commit `53ab43f` 推送 + SSH 部署正式环境，全部验证通过
- 发版 v2.4.0（commit `fef6e7f`）+ 二次部署，公告栏独立版本记录

### 踩坑（本轮）
- TopBar 初版过度套用 hallmark「打破 AI nav」，去掉了 `justify-content: space-between` 导致导航挤左、右侧大片空白。已修复——**应用内功能导航栏的 space-between 是标准实践，不该为反模式牺牲可用性**

---

## 黑机本轮产出（2026-08-02 15:35）

### 世界书评审 + 补充 + 设定集修正 + 第一章大纲（本轮）

**1. 世界书评审（酒馆编剧AI产出）**
- 让酒馆「德塔编剧」角色卡对世界书做5维度评价（完整性/一致性/颗粒度/结构/可用性）
- 总分：世界观基础 8/10，编剧工具 6/10
- 编剧完整产出存档：`prd/01-需求文档/04-德塔/02-设计/编剧AI产出-20260802.md`
- ⚠ 白机无法连接酒馆，该文件是唯一的编剧产出存档

**2. 世界书补充（11个新条目，已写入酒馆世界书JSON）**
- 9角色视觉关键词（见/添/幸/荣/睿/丘/杰/汪神/沐阳）
- 虚空生物视觉（形态+裂隙美学）
- 新NPC「班」（爱起哄，形象待补）
- 修正4个已有条目：净化原理（主动充能）、法刺（政变后建）、大草原（附庸关系明确）、男德学院（玩家定位补充）
- 世界书文件：`E:/ai/SillyTavern Launcher GUI/data/st_data/default-user/worlds/德塔设定集.json`（已备份原版）

**3. 6个争议剧情裁决（院长口述）**
- 魔法来源：B.V.时代就有，炮兵兵种地位，睿帝提升为阶级
- "男德学院"对外：无意义音节，当组织名
- 玩家选择信息基础：基于直觉而非知识
- 虚空教团5流派：降临派（主流）/绝望投降派/福音派/投机主义者/温和派
- 幸的立场：奉命来，绝对忠诚但有自己想法
- 院长期待：来去自由是真的，理想是拯救世界但不要求玩家

**4. 设定集v1.4过时内容修正**
- 第九章战斗与数值系统：整章标记废弃（2D游戏遗留）
- 2.10裂隙分级：HP/DEF/RES/ATK数值废弃，保留裂隙密度总览+视觉美学
- 2.11德塔据点：RPG扩张逻辑废弃，改为视觉小说场景结构（一楼大厅含传送阵/工作台/地图）
- 第十章结局框架：关闭率百分比→剧情选择驱动（高/中/低进度）
- 8.2学院颠覆性分析：修正"辐射范围"→"主动充能晶石"
- 5.1定位：修正RPG扩张语言
- 附录第24项：DEF/RES数值废弃

**5. 第一章「三线剧变」大纲（编剧产出）**
- 四幕结构：幕间（德塔日常）→第一幕（帝桥）→第二幕（幸再访）→第三幕（东来的信）→第四幕（海盗线）
- 3个核心选择点：帝桥帮老人/接帝国合同/海盗线切入
- 新NPC：科夫（帝国军官）、西娜（海盗头子）
- ⚠~~第四幕海盗线大纲截断~~ **已补完**：含第四幕场景三（归途收官）+尾声（塔楼之夜·北边闷响钩子）
- 完整内容见：`prd/01-需求文档/04-德塔/02-设计/编剧AI产出-20260802.md`

### ⚠ 本轮改动未commit，待push

以下文件已修改但**尚未commit**：
- `prd/01-需求文档/04-德塔/02-设计/世界观/设定集-v1.4.md`（过时内容修正）
- `prd/01-需求文档/04-德塔/02-设计/编剧AI产出-20260802.md`（新增，编剧产出存档）

### 白机待办（优先级排序）

1. **commit并push本轮改动**（设定集修正+编剧产出文件）
2. **新建独立世界书**：院长要求"新出一个用于酒馆AI的世界书，和设定集相互独立。两边进度统一，设定集包含历史记录"
3. **设定集v1.4文档同步新设定**：大草原附庸关系/法刺建立时间/虚空教团5流派/玩家定位/魔法来源/塔楼结构等，世界书已改但设定集文档部分还没同步
4. **编剧大纲已完成**：四幕+尾声完整产出，白机可直接参考
5. **部署提醒**：上一轮代码改动（预加载机制 v2.3.0）仍未部署到生产环境

---

## 黑机上轮产出（2026-08-02 03:10）

### 图片预加载机制 + deploy.sh 优化 + 旁白优化收尾

**1. 图片预加载机制**（核心产出）
- **问题**：生产环境场景图/地图"从上到下慢慢加载"（8MB地图+2MB背景图边下边渲染），本地无此问题（localhost传输太快）
- **根因**：没有预加载，浏览器每次进新场景现场下载+边下边渲染
- **方案**：`visualNovelStore.initGame()` 内新增 `preloadAssets()`，遍历所有节点收集 background+portrait 去重URL，用 `new Image()` 并发预热到浏览器缓存
- **体验**：首次进入统一加载（加载遮罩有进度条+百分比），之后场景切换瞬间显示（HTTP缓存命中），**画质完全不变（PNG原图）**
- **关键文件**：
  - `src/visualnovel/stores/visualNovelStore.js`：preloadAssets() 函数 + preloadProgress 状态
  - `src/views/NdeVisualNovelView.vue`：加载遮罩加进度条+百分比UI

**2. WebP 方案评估后撤销**
- 测试了 WebP 压缩：有损 q80 省 92%（地图8.5MB→698KB），但降画质；无损只省 18%，不够
- 院长决策：不降画质，改用预加载方案。WebP 文件已删，引用恢复 png

**3. deploy.sh 优化**
- migrate 改为检测未应用迁移才执行（`prisma migrate status`）
- seed管理员/seedWall 种子移除（首次部署已执行过）
- pm2 改为 `restart || start`（兼容首次和后续）
- 步骤 11 步精简为 9 步

**4. 序章旁白优化**（上轮产出，详见对照文档）
- 四幕旁白 44→42 句（台词零改动）
- pro_302 穿帮修正（下→上）
- 对照文档：`prd/.../序章旁白优化对照稿.md`

### ⚠️ 部署状态：未完成

院长在服务器执行 `git pull` 时遇到 `package-lock.json` 冲突（服务器 npm install 产生的本地修改），尚未解决。

**下次开机后服务器部署命令**：
```bash
cd /root/projects/www.nandexueyuan.top && git stash && git pull origin master && bash deploy.sh
```

### 本轮涉及 commits

| commit | 说明 |
|--------|------|
| `8d69b93` | v2.3.0发版-序章旁白优化+pro_302穿帮修正+版本公告 |
| `d3b04d3` | 同步文档-v2.3.0发版changelog+handoff |
| `ecd3411` | deploy.sh优化-跳过一次性初始化步骤 |
| `11a6d43` | 图片预加载机制-首次加载后场景瞬出 |

---

## 黑机上轮产出（2026-08-02 02:35）

### 序章旁白优化 + v2.3.0 发版准备

- **酒馆编剧协作**：修复 SillyTavern 启动方式（--dataRoot 参数）+ 世界书绑定（德塔编剧角色卡未挂载设定集导致幻觉）+ chat 开场白男德通残留修复
- **旁白诊断**：请德塔编剧对四幕旁白做诊断（文艺腔/替演员演戏/视点漂移/密度失衡/强行升华），提炼「镜头法则+三不原则+密度节奏」准则
- **四幕旁白优化回填**：
  - 第一幕 7 处（pro_004/009/010/012/015/018/023）
  - 第二幕 14 处（pro_102/106/110/113/115/brief_3/120/127/ask_rui_2/ask_city_2/refuse_3/depart_3/depart_5/delay_1）
  - 第三幕 4 处 + **pro_302 穿帮修正**（"下了楼"->"上了楼"，见说去二楼但原文写下楼）
  - 第四幕 3 处 + **qa_xing_2 节点删除**（prologue.js xing_1->xing_3 跳过）
  - 院长终审：pro_018/023/102/115/brief_3/ask_rui_2/ask_city_2/depart_5 按院长更克制版本；qa_home_2/4 保留原文
  - **台词零改动**，44 句旁白 -> 42 句
- **v2.3.0 发版准备**：版本号 2.1.1->2.3.0（三处统一）+ seedVersion 新增 v2.3.0 公告 + CHANGELOG 更新
- **对照文档**：`prd/.../序章旁白优化对照稿.md`（原文vs优化+院长终审意见+准则）
- **验证**：build 通过 + 游戏内 import script 数据逐条核对全通过
- **状态**：已 commit push（`8d69b93`），**未部署**（等院长在服务器执行）

### 服务器部署步骤（院长执行）

```bash
git pull origin master
cd server && npm install && npx prisma db push   # 同步表结构（本次无新表，保险起见跑一次）
node prisma/seedVersion.js                        # 灌入 v2.3.0 公告（幂等）
cd .. && bash deploy.sh                           # 构建前端+重启 PM2
```

---

## 黑机上轮产出（2026-08-01 15:15）

### 世界格局地图生成 + 地图面板交互

- **美术资产**：Seedream Pro 2K 生成世界格局地图（2816×1584），以院长草图布局为准。过程稿 v1_01→v1_02 两轮迭代。存储三处：`.ai/seedream-test/map/`（过程稿）、`prd/.../美术资产/地图/`（美术资产）、`public/visualnovel/map/`（运行时）
- **MapPanel.vue**：新建地图展示面板（纯展示模式），套用现有面板范式
- **HotspotLayer**：action 新增 `'map'` 类型分支
- **prologue.js**：`wall_map` 热点 action 从 `notice` 改为 `{type:'map'}`
- **NdeVisualNovelView**：注册 MapPanel
- **store**：activePanel 补 `'map'` 类型
- **验证**：build 通过 + Playwright DOM/图片加载验证通过
- **遗留**：地图文字（睿河缺"河"）后续按需 PS；南部绿洲已纳入沙漠绿洲城剧情位置

### 上一轮：热点场景添对话改为 Q&A 问答（commit `2f1c96b`）

- **问题**：热点场景点添是线性闲聊打完即结束，无法问问题
- **改造**：
  - 添入口：tian_1 → event 设 `qa_explore` 标记 → tian_2 → explore Q&A 菜单
  - 新建 `pro_explore_qa_choice`：7 个 info 话题复用原节点
  - 新增 `pro_qa_router` condition：话题讲完按 qa_explore 分流（explore 菜单 vs 主线菜单）
  - 7 个话题尾节点 next 从 pro_qa_choice 改为 pro_qa_router
  - 结束链：event 清标记 → farewell → 回 pro_end（不走 pro_cond_qa_end 避免误入缓几天主线）
- **关键设计**：event 设标记变量 + condition 路由，实现"话题节点复用但结束走向隔离"
- **验证**（Playwright met_tian=true 缓几天分支）：问答流程全通过，主线隔离正确

---

## 黑机上轮产出（2026-08-01 12:10）

### 存档系统优化（commit `b5077c5`）

- **需求1：进入德塔自动跟进上次进度**
  - initGame() 改为优先读自动存档 slot=0（getSave(0)），有则恢复到上次节点，无则 fallback 从头开始
  - 不复用 loadFromSlot(0)（避免重复 loadChapter），单独写恢复逻辑
- **需求2：新建存档=从头开始（非当前进度）**
  - 新增 saveSnapshotToSlot(slot, snapshot) 支持外部传入快照
  - 新增 getChapterStartNode(chapterId) 获取起始节点 id
  - handleNewSave 改为构造全新快照（pro_001+空状态）写入空槽，与"存档"按钮彻底区分
- **验证**（Playwright 3 场景全通过）：无存档->从头 / 有存档->恢复 / 新建存档->pro_001
- **状态**：已验证，未部署（纯前端改动）

---

## 黑机上轮产出（2026-08-01 01:29）

### 1. 场景图v2重出 + 热点改按钮标识（commit `7a3c693`）

- **场景图v2**：v1左下角见画崩（手部畸变），Seedream 全图重绘优化见姿态（手托腮+手握书），加强手部负向提示（deformed hands/extra fingers/fused fingers），裁剪 1424x800 入库替换
- **热点改造**：矩形透明热区 -> **圆形脉冲按钮标识**（暖金光环+icon+label）
  - 见📖(22%,68%) / 添🔧(72%,60%) / 地图🗺️(46%,18%)
  - 坐标改为按钮中心点 x/y 百分比，不再需要 w/h
  - 解决"无法自动解析人物坐标"问题，用可见按钮标识替代
- **验证**：Playwright 三按钮位置对齐人物 + 点击交互全通过（地图弹窗/见对话回环/添对话回环），npm run build 通过

### 2. 部署上线（commit `7a3c693`）

- **部署内容**：序章结束场景热点交互（纯前端，无数据库迁移）
- **部署方式**：用户手动登录服务器执行 `bash deploy.sh`（AI 这边 SSH 22 端口超时，安全组问题）
- **部署结果**：用户确认部署完成
- **网络诊断**：服务器 ping 通（26ms），80 端口通，22/443 不通（安全组/防火墙问题，用户可后续排查 443 SSL）

---

## 黑机上轮产出（2026-07-31 22:09）

### 序章结束场景热点交互（commit `cfdea5c`）

- **新场景图**：Seedream 生成「一层大厅-序幕」（见坐沙发看书+添背对工作台），入库 `bg/tower_interior_hall_prologue.png`
- **热点系统**（3 组件）：
  - `HotspotLayer.vue`（z-index:5）：百分比坐标 3 热区，hover 暖金高亮
  - `NoticePopup.vue`（z-index:45）：敬请期待弹窗，复用 overlay 模式
  - store 扩展 `currentHotspots` + `noticeMessage/showNotice/closeNotice`
- **剧情**：pro_end 加 hotspots + 新增见/添探索对话节点（对话结束回 pro_end 可反复探索）
- **验证**：Playwright DOM 测三热点全通过，npm run build 通过
- **遗留**：热点坐标初步估值，可后续精调

---

## 黑机上轮产出（2026-07-31 21:26）

### 1. 立绘展示位置规则 + @error bug 修复（commit `8e19149`）

- **AGENTS.md** 新增立绘纪律第 6/7 条：
  - 第 6 条：小腿中部对齐屏幕底，脚部超出屏幕底不可见，上半身更突出
  - 第 7 条：幸立绘基准源自背景图 `bg/tower_outdoor_mist` 军装形象（非形象设计文档西装版）
- **CharacterLayer.vue**：`.char-img` 增加 `translateY(18vh)` 下移
- **@error bug 修复**（BUG-49）：原 `@error display:none` 永久隐藏立绘，增加 `@load` 恢复 block

### 2. 三角色立绘重做 + 表情差分入库（commit `3dd9c88`）

- **院长 dean**（3张）：仅脸模参考 → calm 定版(v2) + 差分 gentle/serious。解决 BUG-47（原图丢失）
- **幸 xing**（4张）：背景图形象+脸模双参考 → smile 定版(v2，自然披散发型) + 差分 observe/pleased/cold
- **添 tian**（1张）：脸模+旧全身图双参考 → normal 定版（魁梧+络腮胡+黑框眼镜+西装）
- rembg 批量抠图（8张，透明42%-67%），统一832×1216，入库 `public/visualnovel/portraits/`
- **剧情文档标注表情**（4个台词.md）：顶部「🎭 立绘与表情设计」表 + 内联 `[立绘: x→y]` 注释
- **.gitignore** 补充忽略 `.ai/_*` + `.ai/scripts/`

### 3. 验证（Playwright，调试思维非推理）

- pro_011/022/108/118 四节点 DOM 确认 8 张立绘全 loaded（naturalH=1216）
- 表情切换正确：gentle→serious→calm+smile→calm(dim)+observe(active)
- 双人同框 imgCount=2，小腿中部 top:222-246 对齐屏幕底（viewport 745）

---

## 黑机上一轮产出（2026-07-31 20:25）

### 立绘重抠：rembg 语义级抠图替代 jimp floodfill

- **背景**：jimp floodfill 方案边缘硬切、主体侵蚀、灰边残留，用户要求改语义级抠图
- **方案对比**（实测）：
  - 火山 MediaKit API：AKLT Key + Bearer 认证调通，效果优（边缘半透明3.5%），但**不支持base64输入**，本地图片需走 veImageX 上传链路，工程量大
  - rembg 本地（u2net）：效果良好（边缘半透明6.3%），本地直读零成本，CPU 0.2-0.3s/张，选此方案
- **完成项**：
  - 装 rembg + onnxruntime + imagehash（Python）
  - 批量重抠 6 张：dean/serious、xing×4(cold/observe/pleased/smile)、tian/normal
  - 替换 `public/visualnovel/portraits/` 正式资产，旧版备份至 `.ai/_backup_portraits/`
  - Playwright 浏览器实测 pro_118 双人同框正常渲染
- **遗留**（uphill，待黑机重新出图）：
  - ⚠️ **dean/calm + dean/gentle 带背景原图已丢失**（黑机本地未保存 Seedream 出图过程文件），仍为旧 jimp 版
  - 需重新用 Seedream 出这两张带背景图，再 rembg 重抠
  - `.env` 新增 `VOLC_MEDIAKIT_KEY`（AKLT 格式，已调通，留作备选方案）

### 火山 MediaKit 抠图 API 调研结论（备查）

- 端点：`POST https://mediakit.cn-beijing.volces.com/api/v1/tools-sync/remove-image-background`
- 认证：`Authorization: Bearer {API_Key}`，AKLT 格式 Access Key 可用
- scene 参数：`human`/`general`/`product`；可选 `need_contour`(描边)/`output_format`
- **限制**：image_url 只接受 `http/https/mediakit/tos/vod`，**不支持 base64**，本地图片需先上传

---

## 白机本轮产出（2026-07-31 09:46）

### 立绘演出优化：引入「舞台状态」机制

- **背景**：院长要求多人对话时立绘不要「一个出现一个消失」，位置跟着剧情走
- **根因诊断**（实证）：写脚本扫描 prologue.js 全部 156 条节点边，发现 **76 条角色突变边**。第二幕双人对话段（pro_107~pro_113）见和幸来回消失——`currentCharacters` 逐节点独立取 `node.characters`，无跨节点持久化，违反美术设计规范 §4.4 三态原则（非说话人应 dim 在场而非消失）
- **方案**：引入业界标准的「舞台状态」模型（Ren'Py 同款）——角色一旦登场，持续在场，直到显式退场

#### 1. 引擎层（`visualNovelStore.js`）
- 新增 `stage` ref 维护当前在场角色（跨节点持久化）
- 新增 `applyStageChange()` 在 goToNode 时按节点字段更新舞台
- `currentCharacters` computed 改为基于 stage + speaker 推导三态（active/dim/narrator）
- 存档快照 `getSnapshot`/`loadFromSlot` 加入 stage 字段，读档恢复
- 三种舞台字段（向后兼容）：`characters` 绝对声明（重置）、`enter` 增量登场（合并+更新表情/位置）、`exit` 增量退场；三者都没有则延续不变

#### 2. 数据层（`prologue.js`）
- 第二/三/四幕多人对话节点从「逐节点声明 characters」改为 `enter`/`exit`/延续
- 76 条突变边降到个位数（仅保留真正显式退场）
- 移除全部冗余 `active` 字段（三态已由 speaker 运行时推导）

#### 3. 类型层（`types.js`）
- 补充 enter/exit/characters 舞台字段 JSDoc 语义文档

#### 4. 文档
- 美术设计规范 §4.4 新增 §4.4.1 舞台状态机制说明
- 德塔 changelog 新增本次 refactor 记录

#### 5. 验证（调试思维，非推理）
- stage 逻辑单元测试 10 例全过（含延续/enter/exit/表情更新/同帧进出等边界）
- stage 推进模拟脚本：主路径（agree 分支）89 节点，「所有说话人节点说话人都在舞台」零 BUG
- `npm run build` 通过
- Playwright 浏览器实测第二幕双人对话：见+幸始终 imgCount=2 同框，说话人切换 active/dim 正确翻转（pro_108 见说话→dean=active+xing=dim，对比改造前 xing 消失）

- commit `dba7309`

#### 6. 其他
- chenzijian 密码重置为 `nande666`（bcrypt，测试登录时发现旧密码失效）

---

## 黑机本轮产出（2026-07-31 00:50）

### 1. gitignore清理
- 角色发色速查表+comfyui工作流JSON移出git跟踪（git rm --cached + .gitignore规则）
- commit `4d45eb5`

### 2. 豆包Seedream API实测（go/no-go门槛通过）
- 火山Key复用（ARK_API_KEY），端点 `/api/v3/images/generations`
- 模型 `doubao-seedream-5-0-pro-260628`，0.3元/张，国内直连
- **实测确认不支持透明背景**（四角Alpha全255，jimp打印验证）
- 参考图压缩方案：jimp缩512px jpeg（1.4MB->139KB），避免超时
- 稳定配置：fast模式 + 1K + 单参考图 + url响应

### 3. 9角色脸模生成+入库
- 杰/幸/荣/见/睿/汪神/沐阳/添/丘 9角色脸模全部入库 `美术资产/<角色>/face_v1_01.png`
- 形象设计文档同步：杰发色金色+眼色琥珀+年龄20岁对齐设定集；丘/汪神/沐阳补发色；幸发色冲突修正jet black；院长瞳色琥珀->栗色（防撞脸）
- image-gen技能创建（.zcode/skills/image-gen/SKILL.md）：提示词精细/存储路径/成品入git/表情差分原则/辨识度矩阵/画风统一/参考图压缩/floodfill性能坑

### 4. 序章6张背景图生成+接入游戏
- void_world（虚空）/grassland（草原塔楼）/tower_day（塔楼外景）/tower_interior_hall（大厅）/tower_outdoor_mist（幸来访过场，角色入画氛围图）/tower_interior（储物内景）
- BackgroundLayer渲染修复：background简写重置repeat导致水平拼接 -> backgroundImage+内联cover/no-repeat
- REAL_BG_MAP映射：tower_lobby指向interior_hall（命名不统一，同一场景50+14处引用）
- 第二幕对话背景从户外改回一层大厅，tower_outdoor_mist仅作pro_102过场（避免背景图里的幸与立绘层幸重叠）

### 5. 见/幸/添立绘+表情差分7套
- 见(dean) 3套：gentle(和蔼微笑)/serious(认真收敛)/calm(沉稳冷静)
- 幸(xing) 4套：smile(职业微笑)/observe(审视打量)/pleased(真心满意)/cold(冷锋)
- 幸军装穿搭对齐场景背景图tower_outdoor_mist（深蓝军装+金肩章+勋章+棕皮带）
- 姿势统一"双腿并拢+双手叠前"（轮廓紧凑，抠图友好）
- 抠图链路：Seedream出图(纯色背景) -> jimp floodfill(栈优化) -> erode消灰边 -> 多轮空洞填补
- prologue.js 56处portrait按场景情绪配置表情键

### 6. 立绘三态交互系统
- speaker驱动推导三态（narrator/active/dim），不依赖数据手写active
- types.js：SPEAKER_TO_ID映射（中文名->英文id）+ CHAR_COLORS修正（补dean/xing/tian）
- store：currentCharacters按id固定排序 + speaker推导state
- CharacterLayer：占位色块->真实立绘img；绝对定位（修复flex布局位置跳动）；TransitionGroup（key固定char.id，不重建DOM）
- 第二幕position固定（xing始终right、dean始终left，28处修改）
- 三态CSS：active=上移24px+提亮1.15，narrator=正常，dim=变暗0.55
- 立绘贴底摆放（业界规范：脚底贴屏幕底边，对话框遮住膝盖以下）

### 7. 美术资产归档
- 立绘7套+背景图6张从seedream-test过程文件夹归档到美术资产正式目录
- 清理seedream-test 102MB过程稿
- README更新：立绘/背景图清单+命名规范（full_vX_XX.png基准+expr_情绪_vX_XX.png差分）

### 8. Bug修复
- BUG-46：缓几天路径第四幕死循环（pro_cond_met_tian met_tian=true改跳pro_end）
- chenzijian密码重置（dev.db passwordHash为空）
- 立绘消失/位置变化（Transition+flex根因 -> TransitionGroup+绝对定位）
- 抠图floodfill性能bug（queue.shift() O(n) -> 栈push/pop O(1)）
- 幸立绘胸口空洞（floodfill+多轮空洞填补，0.9%->0.00%）

### 9. 文档同步
- changelog多条记录（立绘/背景图/三态交互/表情差分/抠图修复等）
- bug-log BUG-46
- 美术资产README（立绘/背景图清单+命名规范）
- 美术设计规范（立绘交互规则三态系统+背景图两种用法+参考图压缩）

---

## 白机上一轮产出（2026-07-30 16:12，存档备查）

### 1. 序章文案优化（第一幕）
- 开场改传送阵（玩家传送到塔楼内部传送阵），见不讲解裂隙原理（留给添Q&A），结尾改高跟鞋声切入幸来访
- commit `b51cdee`

### 2. choice新增「缓几天」分支 + 去关键标签
- pro_choice_1 新增第3选项（critical标黄）：选后添救场→见沏茶招待幸→接入添Q&A→回choice重选
- 用 `met_tian` 变量 + 2个condition控制缓几天走过Q&A后正式流程跳过重复Q&A
- 去掉选项「关键」文字标识（critical只保留标黄颜色）
- commit `fd066be`

### 3. 幸科普现状 + 修复refuse_2重复id
- 幸提问前新增 pro_brief_1~3 科普帝国/草原/学院局势
- 修复 pro_refuse_2 重复id导致文案丢失（BUG-44）
- commit `1f67f71`

### 4. 第四幕新增话题七「你有想过回去吗」+ 修复id冲突
- 新增 pro_qa_home_1~4（修复原用pro_qa_next与话题六冲突的BUG-45）
- pro_qa_choice 现为8选项
- commit `c2f49a4`

### 5. 存档管理统一入口
- 合并存档/读档为单一弹窗，每槽位同时有存档/覆盖+读档+删除。空槽位读档置灰
- QuickMenu去读档按钮，NdeView去L快捷键和第二个panel实例
- commit `3d1e983`

### 6. 滚轮回滚功能（试做后移除）
- 试做了状态快照回滚（rollbackStack + rollback/forward + 滚轮事件），Playwright验证逻辑正确
- 但用户反馈实际操作不可用，最终决定移除全部代码（commit `6a573f4`/`f7dabdb` 做了又删）
- store回滚代码本身逻辑正确（保留在git历史，未来可复用）
- commit `20b63ac`

### 7. 删除个人中心「德塔相关设置」
- UserAvatar下拉框去掉「德塔相关设置」按钮，TopBar去掉NdeSettingsDialog引用
- commit `d4f555b`

### 8. chenzijian 密码重置
- 数据库 passwordHash 重置，新密码 `nande123`（bcrypt加密）

### 9. Gemini（Nano Banana）生图能力调研落档
- **背景**：院长要求扩充出图工具链，调研 Nano Banana + Gemini 系列原生图像生成模型
- **关键发现**：Gemini 3 Pro Image（`gemini-3-pro-image`）的**参考图分类机制**（物体6+角色5+风格3）正好命中项目两大痛点：
  - 角色参考通道（最多5张）-> 解决 Seedream 跨图角色一致性不稳
  - 风格参考通道（最多3张，Pro 独有）-> 解决 Seedream 纯文生图偏中国风
  - Pro 是全系列唯一同时支持角色+风格双参考的模型
- **选型结论**：引入 `gemini-3-pro-image` 做立绘主力，Seedream 降级为草稿/背景/兜底
- **成本**：Pro 2K $0.134/张（约¥1），2.5 Flash $0.039/张；四档全部无免费额度，必须绑卡
- **两个必须实测的风险**（go/no-go 门槛）：①角色一致性是否达标 ②奇幻战斗场景是否被 Google 安全过滤拦截
- 产出文档：`prd/01-需求文档/00-调研/gemini-nano-banana-image-generation.md`

### 10. 火山引擎豆包 Seedream API 补充调研（选型修订）
- **背景**：院长在火山引擎方舟平台发现豆包 Seedream 5.0 的 **API 版本**（与 seedream.pro 网页同源），补上了网页版最大短板「无 API」
- **两档模型**：`doubao-seedream-5-0-pro-260628`（Pro，输出≤236万像素 0.3元/张，>236万 0.6元/张；插入图首张免费、0.02元/张）、`doubao-seedream-5-0-260128`（标准 0.22元/张）；均 IPM=500；自定义分辨率 92万~460万像素
- **选型修订**：**首选改为豆包 Seedream API Pro**（0.3元/张、国内直连、复用火山Key），比 Gemini Pro 2K（约0.97元）便宜3倍；Gemini Pro 因参考图分类机制更优降为备选
- **待实测确认**：①API 参考图机制（是否分类，本轮官方文档SPA抓取失败未确认）②角色一致性是否与网页版相当 ③奇幻战斗审核严格度
- 文档：调研文档已重命名标题为「生图能力调研」并新增 §四-B、修订选型 §五

### 10. 交接单时间精度规则优化
- **背景**：同日双机多轮交接时，时间只到日期无法区分先后，导致本轮调研产出被覆盖遗漏
- **规则**：handoff 的`最后更新`行与各「本轮产出」节标题一律精确到 `YYYY-MM-DD HH:MM`（本地时间）；旧记录不回填不编造
- 已同步写入 `AGENTS.md`「会话结束必做」和 `sync-docs` 技能 `SKILL.md`

---

## 黑机上一轮产出（2026-07-30，存档备查）

### 1. 序章验收 + 封面文案修复
- 院长验收序章，发现封面文案 A.V.115 应为 A.V.118
- `src/views/NdeVisualNovelView.vue` - 封面改 A.V.118 + "三年前学院降临+如今第二批漂泊者到来"描述
- commit `354080a`

### 2. 存档系统增强（院长4需求中的1/2/3）
- **需求1-新建存档**：`SaveLoadPanel.vue` 空槽位显示"新建"按钮，底部加快捷新建按钮（自动找第一个空槽位）
- **需求2-自动存档**：`visualNovelStore.js` selectChoice中critical选项触发 saveToSlot(0) 自动写入；slot=0 标记"系统自动"只读，禁止手动覆盖/删除
- **需求3-隐藏UI恢复**：`QuickMenu.vue` 隐藏UI后显示半透明圆形浮动按钮（右上角），点击恢复
- Playwright 实测全部通过
- commit `7955079`

### 3. Bug修复：VN存档表缺失（BUG-43）
- **现象**：点"开始故事"后500错误，`game_progress` 表不存在
- **根因**：白机写了Prisma schema但 `db push` 因FTS表报错未执行，DB中缺两张表
- **修复**：`prisma db execute --file` 直接SQL建表
- 教训：换机后第一次跑服务前应执行 `npx prisma db push` 确认schema同步

### 4. Seedream AI 网页生图调研（院长需求4）
- 网址：https://seedream.pro/zh/ai-photo-editor（Google账号登录）
- 3轮实测：
  - 法刺幸换动作（站立->伏案批阅）✅ 一致性完美
  - 法刺幸+荣多人同框 ✅（需强调"同一场景统一透视"避免拼图感）
  - 院长文生图 ❌纯文生图偏中国风 → 用睿帝立绘做参考图修改特征 ✅成功
- **关键发现**：Seedream纯文生图（无参考图）倾向中国风，**必须上传一张同画风参考图**才能保持西方奇幻油画风格
- 产出文档：`prd/.../美术设计/Seedream网页生图操作指南.md`
- 测试图：`.ai/seedream-test/`（6张）

### 5. 院长"见"形象设计 + 出图
- 院长真名定为「见」，25岁英俊男性魔法师
- 设计：黑色短发微卷+琥珀色眼+小麦色皮肤+炭黑色旧黑袍+灰白T恤+工装裤+户外靴+虚空晶石项链
- 出图3张，v1-03成功（`.ai/seedream-test/院长/dean_v1_03.jpg`）
- 文档：`prd/.../形象设计/院长-形象设计.md`

---

## 待办（交接给黑机）

### ⛰️ downhill（方案已定，可直接执行）

1. **~~火山引擎抠图API替换jimp方案~~** - ✅ 已完成（rembg 本地方案替代，8张立绘已 rembg 重抠入库）
2. **其他角色立绘** - 序章已出见/幸/添3角色立绘+表情差分8张；其他角色（睿/荣/丘/杰/汪神/沐阳）立绘待按出场顺序出图
3. **~~rembg语义抠图替换~~** - ✅ 已完成（8/8 立绘全部 rembg 重抠入库）
4. **立绘表情差分扩展** - 见目前只有3套(gentle/serious/calm)，可扩展"施法态""对内搞怪态"；幸4套已覆盖序章，后续章节可扩展
5. **~~序章结束场景热点交互~~** - ✅ 已完成（HotspotLayer+NoticePopup，见/添对话+地图敬请期待，commit cfdea5c）
6. **地图系统** - 序章热点已预留地图入口（弹"敬请期待"），后续实现地图界面（地点查看/解锁/传送）
7. **热点坐标精调** - 当前热点为初步估值，可后续按实际画面像素精调对齐人物/地图

### ⛰️ uphill（探索中，方案未定）

4. **M-G2 序章完整 + 手机/消息系统** - 手机消息系统可行性需调研（Eternum式）
5. **滚轮回滚功能**（已移除，未来可复用）- 白机试做了状态快照回滚（advance/selectChoice前压栈+rollback/forward），Playwright验证逻辑正确，但用户反馈实际不可用已移除。根因是 `.dialogue-area` CSS只占底部区域导致鼠标不在对话框上时事件不触发。代码保留在git历史 commit `6a573f4`，未来若重做可考虑用快捷键（PageUp/PageDown）替代滚轮

### ✅ 本轮已完成（白机 2026-08-03）
- ~~社区站视觉体系统一~~ - Hallmark audit + 霞鹜文楷 display 字体 + 全站莫兰迪 token 化 + 首页重构（v2.4.0，commit `53ab43f`+`fef6e7f`）
- ~~根目录清理~~ - 13 截图 + dist + 过程文件清理，.gitignore 增强
- ~~美术设计文档体系建立~~ - `prd/05-美术设计/` design-system.md + changelog.md
- ~~v2.4.0 发版+部署上线~~ - 公告栏独立版本记录，线上 v2.4.0

### 黑机接手注意
1. **先 `git pull origin master`** -- 白机本轮推了 4 个 commit（53ab43f / dabbff6 / fef6e7f / 811410d）
2. **代码无遗留改动** -- 工作区干净，唯一未入库的是 `.zcode/skills/hallmark/`（设计审查工具技能，非项目产物）
3. **社区站视觉改造已完成** -- 如需微调颜色/字体，改 `src/styles/variables.css` 里的 token 即可全站生效，不要再逐页改硬编码
4. **TopBar 修复教训** -- 应用内导航栏用 `space-between` 是标准实践，别为了反 AI 模板再动它（BUG-51）

---

## 环境状态

| 服务 | 地址 | 状态 |
|------|------|:---:|
| 前端 | localhost:4396 | ❌ 未运行（`npm run dev` 启动） |
| API后端 | localhost:3000 | ❌ 未运行（`cd server && npm run dev` 启动） |
| 游戏服务器 | localhost:2567 | ❌ 未运行（`cd game-server && node src/index.js`） |
| ComfyUI | localhost:8188 | ❌ 未运行（黑机专属，白机未安装） |
| 豆包Seedream API | ark.cn-beijing.volces.com | ✅ 可用（复用ARK_API_KEY） |
| 生产环境 | https://www.nandexueyuan.top | ✅ v2.4.0 已部署 |

### 豆包 Seedream API
- 端点：`POST https://ark.cn-beijing.volces.com/api/v3/images/generations`
- 模型：`doubao-seedream-5-0-pro-260628`（0.3元/张，国内直连）
- Key：`.env` 里 `ARK_API_KEY`（复用火山引擎方舟Key）
- **不支持透明背景**（实测确认，需额外抠图）
- 稳定配置：fast模式 + 1K + jimp压缩参考图 + url响应

### DB 注意
- chenzijian密码已重置为 `nande666`（bcrypt加密，原passwordHash为空）
- 白机接手后建议执行 `cd server && npx prisma db push` 确认schema同步

---

## 德塔踩坑记录

| 坑 | 状态 | 说明 |
|---|---|---|
| Colyseus 0.16.0 锁定 | ✅ 已知 | 0.15不兼容schema3.x，0.17下载超时 |
| Nginx proxy_pass 尾部斜杠 | ✅ 已知 | `proxy_pass http://127.0.0.1:2567/;` 必须有斜杠 |
| JWT密钥运行时读取 | ✅ 已知 | 用 `function getSecret()` 不用ESM import |
| Phaser场景切换onUnmounted | ✅ 已知 | 用 `onUnmounted -> destroyGame()` |
| Prisma db push失败不建表 | ✅ 已知 | BUG-43：FTS表报错导致push失败，新表不会创建。换机后必须检查 |
| Seedream纯文生图偏中国风 | ✅ 已知 | 必须上传同画风参考图才能保持西方奇幻油画风格 |
| Seedream API不支持透明背景 | ⚠️ 黑机新增 | 实测四角Alpha全255，需额外抠图（jimp floodfill+erode+空洞填补） |
| floodfill用queue.shift()性能陷阱 | ⚠️ 黑机新增 | O(n)导致百万级队列卡住(仅抠0.4%)，改栈push/pop(O(1))恢复65-80% |
| Vue Transition+flex立绘位置跳动 | ⚠️ 黑机新增 | Transition mode=out-in + 角色数组顺序变化导致key抖动->DOM重建。改TransitionGroup+绝对定位+position固定 |
| 抠图resize插值破坏alpha | ⚠️ 黑机新增 | resize缩放产生半透明像素，erode要在resize后补一次 |
| 白底/黑底背景抠图不可行 | ⚠️ 黑机新增 | 白底冲突白衬衫(空洞65%)，黑底冲突黑头发(空洞79%)，灰底+floodfill(阈值80)+空洞填补可行 |
| 背景图background简写重置repeat | ⚠️ 黑机新增 | CSS background简写会重置background-repeat为默认repeat，改用backgroundImage+内联cover/no-repeat |
| 双bgKey命名不统一 | ⚠️ 黑机新增 | tower_interior_hall(14处)和tower_lobby(50处)指同一大厅，用REAL_BG_MAP映射 |
| 逐节点声明characters导致多人对话来回消失 | ⚠️ 白机新增 | currentCharacters无跨节点持久化，76条角色突变边。改「舞台状态」stage机制（enter/exit/延续），Ren'Py同款模型 |

---

## 近期提交记录

| commit | 说明 |
|--------|------|
| `dba7309` | [refactor] 立绘演出优化-引入舞台状态机制(角色持续在场不再一个出现一个消失) |
| `9d16d0f` | [docs] 同步handoff交接单-黑机本轮产出9项+待办更新+踩坑记录7条+提交记录21条 |
| `f8c459a` | [fix] 修复幸smile立绘胸口空洞(floodfill+多轮空洞填补) |
| `cce3d0f` | [fix] 修复幸smile立绘胸口被抠空(阈值法误删白色衬衫) |
| `b16d4b9` | [fix] 幸立绘重出v3(背景图形象参考)+smile阈值法抠图 |
| `0c446c8` | [fix] 幸立绘重出v2(双手叠前+得体表情)+位置跳动修复(绝对定位) |
| `eb97cb7` | [docs] 美术资产归档-立绘7套+背景图6张+清理seedream-test 102MB |
| `37c50d1` | [feat] 立绘表情差分7套+三态交互重构(修复角色消失/提亮变淡出/抠图灰边) |
| `4f49561` | [fix] 幸立绘穿搭改为军装制服(与tower_outdoor_mist来访场景一致) |
| `c2d15ea` | [feat] 幸立绘接入+pos-center塌缩修复(双人同框) |
| `3976430` | [fix] 立绘悬浮修正为贴底摆放(业界规范) |
| `d0cdd84` | [feat] 见+添立绘接入+立绘三态交互系统(旁白对齐/说话人上移提亮) |
| `09b5175` | [fix] 缓几天路径第四幕死循环(pro_cond_met_tian改跳pro_end) |
| `0714022` | [feat] 第三幕储物发放场景背景图bg/tower_interior接入 |
| `02b9bf8` | [feat] 序章5张背景图接入游戏+背景层铺满修复+技能补充 |
| `9527566` | [fix] 重出幸来访背景图v2(精选图锁人物+纯草原晨雾)+技能补jimp压缩 |
| `f7c3198` | [fix] 幸来访第二幕对话切回一层大厅+tower_outdoor_mist仅作pro_102过场 |
| `4aafcb6` | [设定] 生图技能+丘脸模+沐阳v2帅气版+9角色形象设计入库 |
| `a34bf7b` | [设定] 8角色脸模图首批入库(杰/幸/荣/见/睿/汪神/沐阳/添) |
| `ae3b1d7` | [docs] 院长瞳色琥珀色->栗色(与杰琥珀眼区分防撞脸) |
| `9949408` | [docs] 幸发色冲突修正(深棕->jet black对齐院长修订) |
| `71ab993` | [docs] 杰/丘/汪神/沐阳形象设计补发色+杰补眼色+杰年龄对齐设定集20岁 |
| `4d45eb5` | [chore] 角色发色速查表+comfyui工作流JSON移出git跟踪并加入忽略 |
