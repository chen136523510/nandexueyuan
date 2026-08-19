# AI 交接单

> 最后更新：2026-08-19 10:05（白机本轮：R-040 定位修正为独立新模块·多人 AI 派对局，不再称「德塔二次重构」，原德塔保留不动。服务器 IP 以 `docs/account-passwords.md` 为准：47.96.158.104）
> 所在设备：白机（判定依据：周三 09:53 工作日白天时段）
> 稳定版本：**v3.4.0 线上**（星河问运势模块-今日运势+星座分析+生日登记）
> **当前阶段**：M-G1 引擎核心 PoC ✅ + 序章四幕全量落地 ✅ + 存档系统 ✅ + Seedream调研 ✅ + 10角色脸模入库 ✅ + 序章6张背景图接入 ✅ + 见/幸/添立绘8张+表情差分 ✅ + 立绘舞台状态机制 ✅ + 立绘rembg重抠8/8 ✅ + 立绘位置规则(小腿中部对齐) ✅ + 序章结束场景热点交互 ✅ + 部署上线 ✅ + 存档系统优化(自动恢复+新建从头) ✅ + 热点添对话Q&A问答+主线隔离 ✅ + 世界格局地图生成+地图面板交互 ✅ + 序章旁白优化(四幕44->42句)+pro_302穿帮修正 ✅ + 图片预加载机制(首次加载+进度条) ✅ + 世界书评审+补充11条目 ✅ + 设定集v1.4过时内容修正 ✅ + 第一章大纲产出 ✅ + 社区站视觉体系统一 ✅ + 第一章编剧评审(5条改进建议待裁决) ✅ + 美术资产清理(旧版归档+rembg同步) ✅ + 班形象设计定稿+脸模入库 ✅ + image-gen SKILL生成分层流程补充 ✅ + NPC命名调子规范(六大势力+禁音译名) ✅ + 第一章编剧5条建议院长裁决落地 ✅ + 新角色宁(学院潜伏者)+饶(虚空教团二号) ✅ + 饶暗线设定(国会事变操盘/阿瓦隆交手汪神/汪神正太诅咒) ✅ + 班设定回填(世界书5.10定稿) ✅ + hallmark设计技能入库 ✅ + 第一章背景图3张生成入库 ✅ + 场景一致性重做 ✅ + 班走廊月亮CG v1(待重做) ✅ + 美术资产归档 ✅ + QuickMenu左上角竖排 ✅ + 全窗口点击推进对话 ✅ + 帝桥地图坐标修正 ✅ + 刷新失登录修复 ✅ + 背景图HMR缓存修复 ✅ + AGENTS先查文档原则 ✅ + **第一章引擎集成打通(序章->第一章跳转) ✅ + 存档恢复修复(场景/立绘跟随) ✅ + 幕间台词定稿(院长逐句过) ✅ + 帝桥设定落档(设定集§2.3.1+大纲节) ✅ + 第一幕台词定稿49句(院长逐句过) ✅ + 通行证新政设定(一人一证/基层发放/分批) ✅ + **班走廊月亮CG定稿(CG-1纵深+CG-2中景) ✅ + 丘脸模重做换五官(真人照片锁五官+气质更坚毅) ✅ + 丘游侠/总统双形态立绘入库 ✅ + 第一幕·帝桥台词代码落地(49句+核心选择①三分支+草原村口占位) ✅ + 第二幕代码落地(全章229节点) ✅ + 谈判全景×3+合同羊皮卷+睿帝令道具图入库 ✅ + **见端杯立绘+恪立绘+帝国军装设计稿入库 ✅ + 草原村口/回程/幸造访背景图入库 ✅ + 第二幕叙事流程修正(造访->寒暄->谈判三段式) ✅ + **第三幕全量定稿落地(商队段/段六判断选择/过渡段探索态/信使段死灵气息暗线) ✅ + 空间机制R-035引擎(explore节点属性+合成节点+地点图+travelTo) ✅ + 第二幕结尾迁移探索态(hall_free/corridor_free/room) ✅ + 存档spaceState扩展+迁移文件 ✅ + v3.0.0发版 ✅ + v3.0.0部署上线 ✅ + 线上完整剧情验证(序章->第一章->第二幕探索态->第三幕信使段) ✅ + 预加载优化(首页静默+按存档章节+切章增量) ✅ + BUG-58(迁移漏检)/预加载404修复 ✅ + **BUG-59空间跳转四处缺陷修复(睡觉出门/走廊无回房间/大厅有睡觉/房间无出口) ✅ + v3.0.1发版 ✅ + v3.0.1部署上线 ✅ + 线上全量验证通过(空间跳转闭环+全流程节点连通+信使段结束链路) ✅ + **R-036图片全量WebP q95压缩(41张146MB->28MB省80%)+美术资产gitignore ✅ + R-037菜单UI调研报告 ✅ + R-038地图UI调研报告 ✅ + proxy-access代理推送技能(黑机专用) ✅ + v3.0.2公告+版本号 ✅ + 美术设计规范V2.1(画风改中文语义) ✅ + 国会事变剧本初稿(完整版8场+精简版) ✅ + CG视频提示词精写(15秒事无巨细版) ✅ + 线上SSL证书配置落地(Let's Encrypt+443+强制HTTPS) ✅ + GUI测试工具集+a11y/测试钩子规范调研落档(方案待院长拍板,⛰️uphill) ✅ + 睿脸模v2(真人陈睿锁五官)+立绘入库 ✅ + 提示词工程调研(图片+视频语义提示词) ✅ + MiniMax H3 API使用指南 ✅ + image-gen SKILL更新(画风改中文语义/负面词可选/视频提示词指导) ✅ + 视频分镜与导演艺术调研(分镜格式/运镜/30秒叙事/AI视频分镜实践) ✅ + video-director AI视频导演技能(分镜/运镜/语义提示词/角色一致性/Seedance API/强制工作流) ✅ + seedance_client.py视频生成公共模块(Seedance 2.5) ✅ + AGENTS禁止事项第5条(AI生成API必须院长确认铁律) ✅ + Seedance踩坑4条(r2v限720p/真人检测/代理误判/禁止测试任务) ✅ + 丘vs睿30秒对战视频首版生成(720p/双参考图/53元) ✅ + 动作设计与武术指导调研(弓箭手7层/魔法师6层/三幕结构/施法三段式/AI动作描述6规则) ✅ + 凡人修仙传战斗设计调研(四段式层次/心理博弈/藏底牌/韩立谨慎战术流) ✅ + video-director技能更新(角色动作签名/战斗层次四段式/藏底牌/心理博弈/30秒节拍分配) ✅ + research系统化调研方法论技能(6步流程/信息源优先级/登录墙红线/交叉验证/统一落档模板/并行分治) ✅ + **GUI测试工具集+a11y规范实现(playwright e2e基建+check-a11y脚本+德塔8组件示范改造,4测试全绿) ✅ + **v3.0.2部署上线(WebP压缩生效+线上加载提速) ✅ + deploy.sh验证脚本修复(HTTPS适配) ✅ + AGENTS身份判定规则落档(白机/黑机时间段) ✅ + **a11y第2阶段(views/components层9处图标按钮补aria-label+data-testid,白名单清零) ✅ + a11y第3阶段(原生alert/confirm替换为自定义弹窗GlobalDialog+Pinia store,13处全替换) ✅ + v3.1.0发版上线(界面交互优化minor) ✅ + 线上全量测试通过(5页面×弹窗+a11y+存档恢复) ✅ + **男德通AI优化Phase1(Markdown渲染+死代码清理+快速路由+FTS5增强+前端体验) ✅ + **男德通AI优化Phase2第一批(人设切换+需求反馈页+AI提需求+黑机离线提示) ✅ + **院长信箱命名+头像文件上传 ✅ + v3.2.0发版部署上线 ✅ + BUG-61(prisma db push数据丢失事故)修复 ✅ + **男德通AI知识库四层升级(worldbookAgent/dbInfoAgent/网站信息注入) ✅ + 数据纯净重建(538915条+5372分块+FTS5索引) ✅ + LLM多通气回退(恢复纯火山引擎) ✅ + BUG-62(FTS5双列MATCH语法错误)修复 ✅ + **数据库部署上线(538915条+prod.db覆盖) ✅ + dbInfoAgent发言排行按真名合并(陈梓键11万条第一) ✅ + knowledge补做题体孝子/MICO映射 ✅ + 新增timeSearchAgent时间范围检索(自然语言转SQL日期查询) ✅ + timeSearchAgent重写(去LIMIT30+按日/月聚合+抽样消息防token爆炸) ✅ + timeSearchAgent话题块摘要按月聚合(每月最多8块,防18万字符prompt爆炸致LLM时间混乱-BUG-67) ✅ + v3.2.1发版部署上线 ✅ + **门户趣味化(首页大厅改版+晚自习深色模式+移动端适配+德塔移动端隐藏) ✅ + v3.3.0发版部署上线 ✅ + **BUG-68男德通LLM全链路修复(glm-latest被火山指向纯推理模型glm-5.2致完全不回答) ✅ + RAG检索策略调研落档 ✅ + 方案A块内抽样落地(消灭slice(0,30)失真) ✅**

> ⚠️ **网络环境**：GitHub SSH 偶发超时（8/4 晚 22:00 左右 push 超时一次，稍后恢复）。已配置 `~/.ssh/config` 让 `github.com` 自动走 `ssh.github.com:443` 备用通道。若 push 超时重试即可。服务器 SSH 22 端口也偶发超时（8/10 部署期间发生一次），重试即可恢复。

---

## 白机本轮产出（2026-08-17 16:05）

### 抽象小剧场调研（R-042，⛰️ uphill 呈院长裁决，禁码）

> 院长新点子「搞一个抽象小剧情，基于群聊记录生成剧本」，点名调研阿牛小卖部 + B 站亚文化（炫神/动物园/vtuber/电竞/MyGO）。四路子 Agent 并行调研（萌百一手词条 + B 站 API 元数据 + GitHub README），主线程交叉验证落档。

- **调研落档**：`prd/01-需求文档/00-调研/抽象小剧情设计与B站亚文化叙事调研.md`
- **核心结论**：①抽象感公式 = 庄重体裁×鸡毛蒜皮 + 预期违背 + 复读强化 + 黑话懂哥机制 ②素材四象限（事故/情绪峰值/反差/跨群联动，「过于羞耻的传播力最强」）③人设三层法+物品即人设+口头禅+追加设定带日期存档 ④结构铁律：固定场景+3 句入冲突+金句反转+「死因：XX」标注，≤300 字/集 ⑤MyGO 信息差结构（A 的话被 B 误解）比平铺冲突高级
- **⚠️ 合规红线**：GitHub 9180★项目 chatlog（聊天记录导出）2025-10 被微信官方发函下架。需做合规三件套：化名开关/「删除我的记录」出口/选题黑名单
- **⚠️ 数据现状**：白机 dev.db 当前为空（0 消息/0 分块），53 万条在线上 prod.db——开发前需从服务器拉库或线上验证
- **建议路径**：推荐「周更自动剧场」起步（全员同看一集才有弹幕共创）；男德通现有管线（检索+LLM+persona+knowledge）零新基建；**PoC = 手工跑一集剧本样品呈院长裁决**（好笑阈值/梗密度/隐私尺度），通过后再自动化
- **需求池**：R-042 已登记（P2, uphill）

---

## 白机本轮产出（2026-08-17 14:42）

### 星河问运势模块（R-041，主页新点子，卡片定名「星河问」--院长裁决）

> 院长需求「主页添加一些新点子，比如星座分析、运势分析啥的」+ 后续要求改名带「星河」二字（四方案呈报后院长自定「星河问」，改名历程：观星台 -> 星河问签 `5b2f674` -> 星河问 `945f7a2`）。两方案对比（纯前端模板生成 vs 接男德通 LLM）后选**方案 A 纯前端**：零成本秒开、梗可控，AI 版后续可换数据源升级。

- **`src/utils/fortune.js`（新增）**：FNV-1a 哈希 + mulberry32 确定性伪随机--同人同天恒定、跨天零点自动换签；12 星座数据+月日换算（**17 个边界日期 node 实测全过**，含每月最大日号拦截 2.30 类非法日期）；男德风味文案池（宜/忌/签语/幸运色取莫兰迪色系）
- **`src/components/FortuneCard.vue`（新增）**：星河问卡片，双 tab：今日运势（星级+宜忌+幸运数字/色+摸鱼/水群/财运三维条+签语）/ 星座分析（12 宫图标选择+综合指数+修仙/桃花/开黑运+梗文案）；生日登记（localStorage `nde-birth-md`，本命星座金色角标+「我的」badge）。全 token 化，深色主题适配，aria-label/reduce-motion 齐全
- **`src/views/MainView.vue`**：大厅第三行词云 12 列 -> 8 列，右侧新增星河问 4 列；1023px 断点两卡转全宽
- **`tests/e2e/fortune.spec.js`（新增）**：4 用例（运势完整性+确定性刷新一致 / 12 宫切换+生日登记+本命持久化 / 桌面 8+4 列与窄屏全宽 / 深色模式无回归）**4 passed**
- **验证**：`npm run build` ✅ + node 逻辑自测（确定性/数值边界/星座换算）✅ + e2e 4/4 ✅
- **文档**：utils 层 changelog 新建（该层此前无）+ components/views changelog + 需求池 R-041 已完成登记 + 本轮 sync-docs 回填 commit 号
- **commit**：`0bdb3a4`（功能）+ `5b2f674`（改星河问签）+ `945f7a2`（定名星河问）
- **⚠️ 未发版未部署**（部署纪律），院长过目后可随下次发版一起上线
- **踩坑**：①e2e 登录走 API 取 token 注入 localStorage（`token` 键名，非 `nde-token`），比表单登录稳；②innerText 跨行断言要用 `/[\s\S]+/` 不能 `/./`；③白机此前没装 Playwright 浏览器二进制，`npx playwright install chromium` 后 e2e 才能跑（此前只跑过 lint:a11y）

#### 待办（交接后续）

**待院长**：
- [x] ~~星河问线上过目~~ ✅ v3.4.0 已上线（2026-08-17 17:00，服务器 deploy.sh 9 步全绿+线上 e2e 4/4），文案池可随时按院长口味调整
- [ ] R-042 抽象小剧场 PoC 剧本样品裁决（手工生成一集呈报，通过后再自动化；好笑阈值/梗密度/隐私尺度）

**待院长裁决（历史遗留 ⛰️ uphill）**：
- [ ] R-040 PoC 方案（黑机交接单已列六要素，方案呈报前禁码）
- [ ] LOGO 四方案横评 V3 裁决（A德字圆章/B咸鱼学士帽/C男字养鱼/D双鱼盾徽 + 定位语四选一）
- [ ] R-037 菜单 UI / R-038 地图 UI 方案（R-040 已定位独立新模块不替代原德塔，原德塔的 UI 美化不再受其影响，可按需排期）
- [ ] 国会事变剧本逐句审 / CG 视频嵌入方案 / 饶形象设计（同上，视新形态取舍）
- [ ] 男德通 RAG 方案 B/C/D 是否继续

**男德通遗留**：
- [ ] TopicSearch FTS5 Error 偶现排查（BUG-67 遗留，error message 为空）
- [ ] glm-5.2 推理模型 token 消耗上升，关注火山引擎账单

**门户后续点子备选（R-041 备注登记）**：
- [ ] AI 每日语录（结合群聊真实语料）/ 群友签到日历 / 摸鱼段位测试
- [ ] ⚠️ R-042 开发前置：白机 dev.db 为空，需从服务器拉 prod.db（131MB，微信传或 scp）或直接线上验证

---

## 黑机本轮产出（2026-08-16 19:40）

### 多人 AI 派对局调研 + 院长裁决方向 B（R-040 登记，后定位修正为独立新模块）

> 院长起因：视觉小说形式群友不热衷，提出给 NPC 接 AI，随后升级为「可接受德塔整个重做」。三路子Agent分治调研（产品全景/玩家社区/技术架构）+ 主线程 Steam API 实测交叉验证。
>
> ⚠️ **交接白机（2026-08-17）**：R-040（多人 AI 派对局 PoC 方案）是当前主线。**白机接手后先读本调研文档**，PoC 方案呈院长裁决通过前**禁止写代码**（uphill 铁律）。原德塔（视觉小说）现有代码/剧情保留不动，线上 v3.3.0 不受影响。
>
> 📌 **2026-08-19 院长定位修正**：R-040 不再称「德塔形态二次重构」，改为**独立新模块**，与现有德塔（视觉小说）并行存在，**不替代原德塔，原德塔永久保留**。调研文档标题中的「德塔改造方向」是历史措辞，含义以本修正为准。

- **调研落档**：`prd/01-需求文档/00-调研/AI NPC游戏形态与德塔改造方向调研.md`（commit `bd50a63`）
- **核心发现**：①纯 AI 陪伴已证伪（米哈游 BSide 28天停运/AnuNeko关停/星野下载暴跌，1000-2000轮流失天花板）②VN 品类供给过剩（2024 单月 199 部上架，群友不热衷=形态与熟人社区错配）③AI 叙事冒险（AI2U 88%好评，「说服AI=通关」）和多人 AI 派对局（Death by AI 3个月2000万玩家）是唯二验证形态 ④两大差评雷区：「AI贴皮chatbot与世界分离」(431赞差评王) + 记忆断裂
- **院长裁决**：倾向**方向 B 多人 AI 派对局**（AI 主持+裁判，德塔世界观题材库，群友开短局），**硬约束：单人也能畅玩**（AI 角色补位空座位，见/幸/添/班等带人设入局，AI 兼任主持+裁判+补位玩家）
- **R-040 已登记需求池**（P1, ⛰️ uphill）：定位独立新模块与原德塔并行，立绘/背景/世界观资产全部复用为派对局演出层
- **下一步**：产出最小 PoC 方案（一个 AI 主持局：场景卡+AI判定+复用立绘演出）呈院长裁决后动手；技术底座参考 Generative Agents 三因子记忆（SQLite 自研约 200 行）+ 现有 SSE 管线 + Colyseus 房间
- **调研踩坑**：VRAM（所谓现象级AI视觉小说）经 Steam 三接口+搜索全渠道确认**不存在**，生态位由 AI2U 占据；国内网络 Google/Reddit/Wikipedia 大面积不可达，靠 Steam API+搜狗+公众号转载完成

#### 待办（交接白机，2026-08-17 起）

**R-040 多人 AI 派对局新模块（P1 主线，⛰️ uphill）**：
- [ ] 最小 PoC 方案文档：①局型设计（选一个首发局：学院审判/议会辩论/虚空教团审判局）②场景卡数据结构 ③AI 主持/裁判管线（复用男德通 orchestrator/llm.js/persona）④单人 AI 补位局流程（见/幸/添/班等角色卡）⑤Colyseus 房间改造评估 ⑥演出层复用清单（立绘/背景/打字机）——**方案呈院长裁决前禁止写代码**
- [ ] PoC 通过后：MEMORY 表设计（GA 三因子简化版）+ 判定影响游戏状态的落点设计

**待院长裁决（历史遗留 ⛰️ uphill）**：
- [ ] LOGO 四方案横评 V3 裁决（A德字圆章/B咸鱼学士帽/C男字养鱼/D双鱼盾徽 + 定位语四选一）
- [ ] R-037 菜单 UI / R-038 地图 UI 方案（R-040 已定位独立新模块不替代原德塔，原德塔的 UI 美化不再受其影响，可按需排期）
- [ ] 国会事变剧本逐句审 / CG 视频嵌入方案 / 饶形象设计（同上，视新形态取舍）
- [ ] 男德通 RAG 方案 B/C/D 是否继续

**男德通遗留**：
- [ ] TopicSearch FTS5 Error 偶现排查（BUG-67 遗留，error message 为空）
- [ ] glm-5.2 推理模型 token 消耗上升，关注火山引擎账单

---

## 黑机上轮产出（2026-08-16 18:10）

### LOGO 四方案横评 V3（院长反馈：A保留但要多灵感 + 定位语方向修正）

> 院长两点反馈：①德字圆章保留，但需要更多其他灵感 ②定位语方向错了——不是给外人看的，是给自己人看的归属感文案。

- **新增三方案**（logo-drafts/，preview.html V4 横评）：
  - **B 咸鱼学士帽**（salt-fish-grad.svg）：闭眼微笑戴学位帽躺平的咸鱼=毕业生自画像，吉祥物类，适合做辅助 IP（表情包/头像）
  - **C 男字田里养鱼**（nan-fish.svg）：「男」=田+力，小鱼游进右下田格，「用养鱼的田养摸鱼的我们」；男字同样矢量固化（nan-path.txt）
  - **D 双鱼盾徽**（dual-fish-shield.svg）：外圆内盾+学士帽+咸鱼+下弧「摸鱼摸鱼摸鱼」，大学校徽戏仿，三层戏仿叠加
- **定位语修正**：候选改为圈内归属感文案×4——「这里坐着二十条咸鱼」「本院只收自己人」「摸鱼人，认个亲」「最尊重女性之人所建」（沿用页脚）
- **踩坑**：①方案C鱼初版用暖赭填充与背景同色=隐形（像素diff仅16px发现），改白色后711px显形落格 ②方案D的dArcB引用未定义致下弧textPath渲染失败，补定义修复 ③截图fullPage只截到上半页（视口问题），方案C/D靠像素diff验证
- **待院长裁决**：①四方案选向（可组合：A主标+B吉祥物）②定位语四选一 ③通过后接favicon+TopBar ④Seedream精绘另给指令

---

## 黑机上轮产出（2026-08-16 14:50）

### LOGO 方案 V2 改稿（按院长四点反馈，待裁决）

> 院长反馈：①预览服务没连上（本轮已重启并验证）②学院 LOGO 与德塔 LOGO 分开 ③学院其实是小圈子群不是真学院 ④后续要 Seedream 精绘但先明确基础。

- **方案推翻重来**：塔月徽章降为德塔存档（badge-*.svg）；学院新方案 = **「德字圆章·心底藏鱼」**——暖赭印章+米白德字，「心」部卧钩碗内藏一条小鱼（摸鱼之心，外人看是正经德字章，自家人看到心里有鱼），印章=中国式自家人凭证，比盾徽轻
- **德字矢量化固化**：`<text>` 依赖运行时字体、CDN 失败时鱼必错位 → 改用 opentype.js 从霞鹜文楷 v1.522 TTF 提取「德」字 225 条矢量指令固化进 SVG（`de-path.txt`）。**踩坑**：`opentype.load` 已废弃且静默失败，须用 `fs.readFileSync + opentype.parse`；`getPath()` 输出已是屏幕坐标（y 向下），再做 `-y` 翻转会双重翻转、字形跑到画布外；TTF 下载 GitHub 直连超时，走 `gh-proxy.com` 镜像成功
- **像素级验证**（Playwright canvas diff）：鱼 1183px 完整落在卧钩碗内暖赭底上、与笔画零交叠，鱼中心 321/386 vs 碗中心 320/385；16/32/64px 缩小可辨；浏览器 img 对同名 svg 有缓存，验证须 fetch+blob URL 防缓存
- **产出**：seal-de-bare（基准）/seal-de-full（环排院名）/combo2-horizontal（组合标+定位语「一个正经挂名的摸鱼小团体」）/seal-de-mono（单色）+ preview.html V3；25MB TTF 与临时脚本已清理不入库
- **待院长裁决**：①德字藏鱼方向认可否 ②定位语措辞 ③通过后接 favicon+TopBar ④Seedream 精绘另给指令（届时提示词先呈报）

---

## 黑机上轮产出（2026-08-16 00:50）

### 男德学院 LOGO 设计（调研 + 草案 + 提案，待院长裁决）

> 院长需求：给学院设计一款 LOGO，先调研设计理念。

- **调研落档** `prd/01-需求文档/00-调研/LOGO设计与美术理念调研.md`：设计原则（Paul Rand/Haviv/Airey）、七大类型学、大学校徽传统（外圆内盾+环排+格言）、游戏/社区案例（TGideas/星穹铁道变体/埃菲尔塔形解法）、favicon 规范
- **提案落档** `prd/01-需求文档/05-美术设计/LOGO设计提案.md`（⛰️ uphill 待裁决）
- **SVG 草案** `prd/01-需求文档/05-美术设计/logo-drafts/`：方案A 塔月徽章（badge-full 完整版 / mark-simple favicon 版 / mark-mono 单色版）+ 方案B 组合标（combo-horizontal）+ preview.html 预览页
- **设计核心**：外圆内盾（中国校徽×西方纹章）+ 塔（德塔本体）+ 月（班走廊CG意象）+ 三星微光（德塔加护）+ 院训「修身·齐家·摸鱼·开摆」环排（早稻田式内部梗）；配色全取现有体系（深墨绿盾底 #35483A 为鼠尾草绿深变体、暖赭金描边、米白塔身）
- **已验证**（Playwright 实测，非推理）：256/64/32/16px 四档可辨、深浅底成立、环排文字方向正确且实测渲染宽度 171px/331px。视觉模型两次误读 SVG 内文字（把院训认成「治国平天下」），以源文件+DOM 实测为准
- **预览方式**：`cd prd/01-需求文档/05-美术设计/logo-drafts && python -m http.server 8923` -> `http://localhost:8923/preview.html`
- **待院长裁决**：①方案A徽章 vs B组合标 vs 双轨制（调研推荐：A 完整徽章仪式用 + A-2/B 日常用，复刻大学 seal 双轨制）②盾内四元素是否砍到塔+月双元素 ③是否要 Seedream 精绘带质感版（红线：提示词先确认）④裁决后接入 favicon 矩阵+TopBar/HomeView（小改动可插空）

---

## 黑机上轮产出（2026-08-16 00:10）

### 1. RAG 检索策略调研落档（方案对比 + 男德通改造建议）

> 背景：院长发现 BUG-68 修复后话题检索仍有信息失真--命中 5 个块 505 条消息，orchestrator 只取前 30 条给 LLM，后 4 块约 400 条完全没被利用。

- 落档 `prd/01-需求文档/00-调研/RAG检索策略与工程化调研.md`（commit `37d8053`）
- 核心结论：失真不在"取 top-k"（这是必需），而在两头压缩都是**截断式**（块 LIMIT 5 无依据、消息 slice(0,30) 无代表性依据）
- 一手来源：SQLite FTS5 官方（bm25 列权重）/ Pinecone+Cohere（两阶段 rerank）/ arXiv Lost in the Middle / LlamaIndex AutoMergingRetriever 源码（threshold=0.5）/ ES RRF 官方
- 四方案：A 块内抽样+摘要混合 / B LLM rerank 候选块 / C FTS5 列权重 / D 块间 Jaccard 去重；不建议现在上向量检索

### 2. 方案A 落地（院长裁决采用，commit `586bb0e`）

- `topicSearchAgent.js`：新增 `sampleChunkMessages()`（关键词命中优先 + 头尾各1条定边界 + 顺序补齐，每块预算 10 条）；命中块返回 formattedText（每块摘要头+抽样），orchestrator 自动走 formattedText 分支
- **效果对比**（同题"群里谁卸载三角洲次数最多"）：旧版只引用第 1 块（"查无此人，倒是睿哥卸博德3"）；新版挖出丘序明"挑战全网最快卸载"、汪煜坤"卸了装装了卸"等多块证据，370 字符完整排行，prompt 2,387 字符安全范围
- 第二题"群里讨论过考研吗"验证跨 2025-04~2026-07 多块引用正常
- 服务器已同步（git pull + pm2 restart），线上验证通过（12s，多块覆盖生效）
- 文档：R-039 已登记需求池已完成表；agents/changelog.md 已补文件级记录

### 待办

- [ ] 院长线上复测话题类问题（对比回答是否明显更全面）
- [ ] 方案 B（LLM rerank）/ C（FTS5 列权重）/ D（块间去重）待院长拍板是否继续
- [ ] TopicSearch FTS5 Error 偶现（BUG-67 遗留）待排查

---

## 黑机上轮产出（2026-08-15 23:10）

### 男德通 LLM 全链路修复（BUG-68，已部署上线）

> 院长线上反馈"提问之后完全不回答"（思考面板显示：规划异常 -> 话题检索 0 命中 -> 收到 0/1 子 Agent 数据后无任何输出）。院长精准怀疑到火山引擎模型 ID 变更，实测确认。

#### 根因（三层叠加）

1. **模型变更**：火山引擎把 `glm-latest` 别名指向新的**纯推理模型 glm-5.2**，该模型不支持 `thinking.type: disabled` 参数，而 `llm.js` 所有调用默认带此参数 -> 火山返回 `400 InvalidParameter: thinking.type disabled is not supported by this model`，规划/分析/回答全部 LLM 调用挂掉
2. **错误误判**：`llm.js` 把所有 HTTP 400 当作「内容审核拦截」抛 CONTENT_MODERATION，真实 InvalidParameter 被掩盖，排查方向被误导
3. **静默失败**：`orchestrator.js` 三处流式 catch 只把兜底文案写入 answer 变量入库，**从未 send('token') 推给前端** -> 用户端零输出

#### 修复（commit `7f516a8`，6 文件）

- `server/.env`：VOLC_MODEL `glm-latest` -> `glm-5.2`（本地+服务器都改）
- `llm.js`：删 thinking 参数；不再发 max_tokens（思考消耗输出预算会截断正文）；makeLlmError 按错误码识别审核（451/code 含 content|filter|moderation），不再 400 全判审核；超时 120s -> 180s
- `orchestrator.js`：三处流式 catch 补 send('token') 兜底文案
- 全部调用点去 maxTokens 共 12 处（orchestrator×4 / chatController NPC / statistic×3 / semantic / topicSearch）

#### 验证

- 本地直调 orchestrate：话题检索（"群里谁卸载三角洲次数最多"13s/203字符）/ 闲聊（6s）/ db_info（5s）全通
- 服务器 git pull + .env 改 + pm2 restart 后同题复测通过，线上生效
- glm-5.2 思考模型行为记录：`enable_thinking:false` 无效、无参数时思考也消耗 max_tokens、首 token 延迟约 5s

#### 待办

- [ ] 院长线上复测男德通提问（含截图同款问题"群里谁卸载三角洲次数最多"）
- [ ] glm-5.2 为推理模型，token 消耗上升，关注火山引擎账单额度
- [ ] TopicSearch FTS5 Error 日志仍偶现（BUG-67 遗留，error message 为空待排查）

---

## 黑机上轮产出（2026-08-15 11:50）

### timeSearchAgent 话题块摘要按月聚合修复（BUG-67，已部署）

> 院长线上实测反馈：问"广州游玩当灯泡事件细说"，AI 回答"2026年7月11号"，实际该事件在 2026-01-01 元旦话题块。排查发现分析阶段 prompt 长达 **184,082 字符**（18 万），LLM 处理不过来把不同时间的数据混在一起。

#### 问题与修复

- **现象**：LLM 把 2026-01-01 的"广州游玩当灯泡"事件说成"7月11号"（疑似混入了对话历史里"2022/7/11 数据库最早日期"）
- **根因**：timeSearchAgent 大范围查询（如"2026年全年"1,466 个话题块）时，把全部块的 keywords+summary 拼接塞给 LLM，18 万字符超出 LLM 有效处理能力，时间信息全混乱
- **修复**：话题块摘要按月聚合，每月只取前 8 个代表性话题块（keywords 截 100 字），每月块数标注在标题
- **效果**：2026 全年查询 prompt 从 184,082 字符降到 **7,278 字符**，1~8 月按月分布+每月话题清晰可辨
- **验证**：服务器 node 直接跑 timeSearchAgent，summary 7,278 字符、按月分布完整、每月话题块正常展示

#### 线上"广州"相关话题块实际分布（排查时查证）

2022-07-23 出行聚餐 / 2025-03-20 广州大学城闲聊 / 2026-01-01 广州游玩当灯泡（元旦）——AI 之前说的"7月11号"确实是错的

#### commit

- `8cc3f13` [fix](男德通): timeSearchAgent话题块摘要按月聚合+每月最多8块(防18万字符prompt爆炸导致LLM时间混乱)
- 已 pull 到服务器 + pm2 restart，线上生效

#### 待办

- [ ] 院长线上复测"广州游玩当灯泡事件细说"，确认日期回答正确（2026-01-01）
- [ ] TopicSearch FTS5 Error 日志仍偶现（error message 为空，待排查具体 SQL）

---

## 白机本轮产出（2026-08-13 14:58）

### 门户趣味化四项 - 首页学院大门 + 大厅动效 + 晚自习深色主题 + 移动端底部导航

> 院长需求「优化网站布局，让网站更有意思」→ 评审四方案后选定 A 首页沉浸 + B 大厅动效 + C 时辰氛围 + 移动端适配全部落地。纯前端改动，全部复用 public/ 已有素材（VN 背景图/角色立绘//man 照片），**无新出图、未动 API、未发版、未部署**。

#### 1. A 学院大门（HomeView.vue）
- 时辰问候语（早安/午安/晚上好…，登录后带昵称）
- 落地页独立主题开关悬浮按钮（无 TopBar 页面）
- ~~Hero 场景背景图+视差 / 功能卡立绘探出~~：一度接入 VN 背景图和角色立绘，院长要求删除（**德塔内容仅限德塔内使用，网站不展示**），已恢复纯莫兰迪渐变底

#### 2. B 大厅动效（MainView.vue + WordCloud.vue）
- 统计数字入场 count-up（消息总数/参与人数/排行计数，reduce-motion 直显）
- Top5 排行：头像（/man 6 位成员照片映射，其余首字色块兜底）+ 金银铜奖牌
- 示例提问改打字机轮播（4 句循环 + 光标闪烁）
- 公告未读红点 + 铃铛轻摇（localStorage `nde-ann-seen`，点「版本历史」即消）
- 词云 hover 词条显示词频悬浮提示

#### 3. C 晚自习深色主题 + 页面转场
- variables.css 新增 `:root[data-theme='dark']` 全量 token 覆写（莫兰迪暗色：青灰底+暖米白字+主色提亮+按钮深底字）
- useTheme 组合式函数：auto（18:00~7:00 自动深色）/light/dark 循环切换，localStorage `nde-theme` 持久化，跨时辰自动刷新
- ThemeToggle 接入 TopBar + 落地页；页面转场升级「推门而入」式（淡入+上浮缩放）
- 深色回归修复：AdminView/ProfileView/ProfileDialog/UserAvatar/MainView 硬编码白底 token 化

#### 4. 移动端适配
- 新增 BottomNav 底部 tab 导航（首页/男德通/师德墙/信箱 四入口），App.vue 按路由+窄屏挂载（/home /chat /wall /mailbox，沉浸页 /nde 不显示）
- `body.has-bottom-nav` 底部占位（含 iOS 安全区）
- 全动效带 reduce-motion 兜底 + 触屏降级

#### 5. 全站移动端适配深化 + 德塔移动端隐藏（院长第二轮要求）
- 修复 Login/Register：auth-card 固定 380px 改 `width:100% + max-width`，窄屏不再溢出
- 修复 Feedback/Chat/Wall 三个 100vh 布局：改 `100dvh`（iOS 地址栏）+ `body.has-bottom-nav` 时让位 64px+安全区——最后一封信/聊天输入框/动态流不再被底部导航遮住
- AdminView：移动端成员卡纵向堆叠 + 操作按钮换行；邀请码卡片硬编码白底 token 化（深色回归）
- FeedbackView 补移动端媒体查询（header 内边距/标签行换行/筛选栏换行）；HomeView 主题开关加安全区偏移
- **德塔移动端隐藏三层**（院长指示：手游和页游差距大，德塔不做移动端）：
  1. TopBar 抽屉菜单过滤德塔入口（桌面菜单保留）
  2. BottomNav 移除德塔 tab
  3. 路由守卫：窄屏（≤768px）访问 /nde 直接回大厅

#### 验证与下一步
- ✅ `npm run build` 通过
- ✅ **v3.3.0 发版部署上线**（服务器 commit `1f1068c`，deploy.sh 9 步全通过，公告 v3.3.0 已灌入）
- ✅ 线上验证：HTTPS 200 / 新构建生效 / API+游戏服务器 PM2 online / 日志无报错
- ⏳ 浏览器人工体验待院长过目（主题切换 / 排行头像 / 打字机 / 公告红点 / 底部导航）

#### 6. 部署期间修复两个阻塞（BUG-65 / BUG-66，详见 bug-log.md）
- **BUG-65**：deploy.sh 第 3 步迁移失败——8/13 黑机 `cp dev.db prod.db` 时把缺 `spaceState` 列的库带上了线（dev.db 长期 db push 管理，迁移表漂移）。修复：停 API → 备份 → `ALTER TABLE game_saves ADD COLUMN spaceState` → 3 个迁移 `migrate resolve --applied`
- **BUG-66**：deploy.sh 第 4 步 `npm install` 失败——`@colyseus/core@0.16.25` 官方发布包含 `workspace:^` 坏依赖。修复：game-server 直接依赖 + overrides 双锁定 `@colyseus/core@0.16.24`
- ⚠️ 遗留提醒：线上 prod.db 已有 `prod.db.bak.20260813_deploy` 备份；dev.db 与 _prisma_migrations 漂移问题根治方案（db push → migrate 体系对齐）待排期

---

## 黑机本轮产出（2026-08-13 13:15）

### v3.2.1 发版部署上线 - 男德通 AI 进一步升级

> 接续 08-11 凌晨的知识库升级，本轮完成数据库部署 + 多个 bug 修复 + 时间范围检索新功能 + v3.2.1 发版。SSH 通过手机热点直连服务器（宽带运营商限制 22 端口，热点可通）。

#### 1. 数据库部署上线（关键踩坑：DATABASE_URL 指向 prod.db 不是 dev.db）

- 本地 dev.db（538,915 条 + 5,372 分块 + FTS5 索引）scp 上传到服务器
- **踩坑**：服务器 `.env` 里 `DATABASE_URL=file:./prod.db`，Prisma 连的是 **prod.db** 不是 dev.db。之前 scp 上传了 dev.db 但 Prisma 根本没读它，线上一直读旧 prod.db（510,059 条，7/5 截止）
- **修复**：`cp dev.db prod.db` 覆盖 Prisma 实际读取的文件，旧 prod.db 备份为 `prod.db.bak.20260813`
- **线上验证**：538,915 条 / 2022-07-11 ~ 2026-08-10 19:21 / 5,372 分块 / FTS5 5,372 ✅

#### 2. dbInfoAgent 发言排行 + 参与人数修复

- **问题1**：发言排行用 `GROUP BY nickname`，同一个人的不同昵称没合并（饶志锐+O.o 出现两次）
- **修复**：查 Top 30 -> JS 层 `resolveName` 合并同一人 -> 重新排序取 Top 10
- **问题2**：SQL 排除 `nickname='我'`，那是微信导出时本人账号标识（=陈梓键，11 万条），导致院长发言数丢失
- **修复**：不排除 `nickname='我'`，`resolveName('我')` -> 陈梓键
- **修复后 Top 5**：陈梓键 114,723 / 丘序明 93,873 / 饶志锐 87,892 / 王乐添 63,932 / 陈睿 37,069

#### 3. knowledge.js 昵称映射补全

- `做题体孝子（暂时）` -> 丘序明（50,777 条，之前未映射）
- `MICO`（大写）-> 陈梓键（之前只映射了小写 mico）
- 院长确认的完整映射：`0.o`->陈梓键 / `O.o`->饶志锐 / `不玩游戏`->丘序明 / `优质单马`+`优质单男`->王乐添 / `失败的人生`+`🤡`->黄学远

#### 4. 新增 timeSearchAgent（时间范围检索，架构级新功能）

- **背景**：用户问"7月份聊了什么"，orchestrator 把"2026年7月"当关键词丢给 topicSearchAgent 搜 FTS5，聊天内容里不会有"2026年7月"字样所以搜不到
- **方案**：新增 `timeSearchAgent.js`，LLM 规划阶段把自然语言时间转化为 `startDate/endDate`（YYYY-MM-DD），Agent 按日期范围查 `message_chunks WHERE chunkDate BETWEEN ? AND ?`
- **支持组合查询**：`{type:"time_search", startDate, endDate, keywords}` 某段时间聊某话题
- orchestrator 四处改动：import / planner prompt（新增 time_search 类型+路由规则+示例）/ dispatchAgent switch / parseTasks 白名单

#### 5. timeSearchAgent 重写（去 LIMIT 30 + 聚合统计）

- **问题**：第一版 `LIMIT 30` 只取前 30 个话题块，大范围查询（如"2026年全年"）只拿到 1 月初的数据，LLM 误判"之后就没人说话了"
- **重写**：
  - 去掉 LIMIT，查全部话题块
  - 不返回全量原始消息（防 token 爆炸），改为**按日/月聚合统计**（≤31天按日、>31天按月）
  - 话题块摘要：每块 keywords+summary 截取，不取原始消息
  - 抽样消息：每天最多 3 条，总共最多 30 条
- **验证**：2026 年全年 148,026 条 / 1~8 月按月分布完整 / 1,466 个话题块

#### 6. v3.2.1 发版（patch）

- 版本号 3.2.0 -> 3.2.1（patch，AI 进一步升级）
- 公告：知识库四层升级 / 时间范围检索 / 数据纯净重建 / 发言排行合并 / 网站信息注入 / FTS5 修复
- 已部署上线（seedVersion 灌入 + pm2 restart）

#### 线上验证

| 验证项 | 结果 |
|--------|------|
| 消息总数 | 538,915 条 ✅ |
| 时间跨度 | 2022-07-11 ~ 2026-08-10 ✅ |
| 发言 Top 1 | 陈梓键 114,723 条 ✅ |
| 2026 年全年 | 148,026 条 / 1~8 月按月分布 ✅ |
| 7 月时间检索 | 30 话题块 / 3,002 条 ✅ |
| v3.2.1 公告 | 首页公告栏显示 ✅ |

#### 待办（交接白机/后续）

**待院长裁决（⛰️ uphill）**：
- [ ] R-037 菜单 UI 方案 / R-038 地图 UI 方案
- [ ] 国会事变剧本逐句审
- [ ] CG 视频 PoC 验收 + 嵌入方案
- [ ] 男德通 Phase 2 第二批（向量语义检索，doubao-embedding，约¥7）

**剧情（白机继续）**：
- [ ] 第四幕「东边的刀」（海盗线）过稿
- [ ] 选择③ C 选项=最优解分支情节

**男德通后续优化**：
- [ ] timeSearchAgent 线上实测（院长已验证数据正确，可继续测自然语言时间理解准确度）
- [ ] 微信导出保留 wxid 字段（当前 talker 已被替换为 nickname，无法用稳定 ID 统计）

**部署纪律备忘**：
- ⚠️ 服务器 `DATABASE_URL=file:./prod.db`，更新数据库要覆盖 **prod.db** 不是 dev.db
- ⚠️ 黑机宽带 22 端口被运营商限制，手机热点可直连服务器 SSH

---

## 黑机本轮产出（2026-08-11 00:50）

### 男德通 AI 知识库四层升级 + 数据纯净重建 + LLM 多通气回退

> 本轮延续 v3.2.0 男德通 AI 升级，完成知识库四层升级（worldbook/dbInfo/网站信息/快速路由扩展）+ 群聊数据纯净重导（排除私聊和其他群）+ LLM 多通道尝试后应院长要求回退为纯火山引擎。

#### 1. AI 知识库四层升级（commit `9659047`）

**新增两个子 Agent**：
- `worldbookAgent.js`（新建 47 行）：按需读取设定集 v1.4 全文（3 万字），用户问到德塔/世界观/角色设定/势力/历史时才触发，避免常驻上下文浪费 token
- `dbInfoAgent.js`（新建 136 行）：数据库元信息查询（不经 LLM，直接 SQL），返回消息总数/时间跨度/发言排行 Top10/年度统计/版本信息

**orchestrator 调度升级**：
- `isCasualChat` 精简：闲聊门槛 40 字 -> 10 字（真正闲聊不超 10 字），删掉"好的/收到/嗯/哦"等口语碎词（这些不该走闲聊短路）
- `matchQuickPattern` 扩展两类无成员名模板：话题搜索（"群里最近聊了什么"->topic_search）、数据库信息（"多少条消息/谁最活跃/版本"->db_info），命中跳过 LLM 规划
- 规划异常 fallback 改为信号词判断：含"群里/聊天/发言/消息/讨论"等数据信号词才 fallback topic_search，否则走闲聊直接回答（原逻辑全部塞 topic_search）
- `parseTasks` 白名单 + `dispatchAgent` 新增 worldbook/db_info 分发

**知识注入**：
- `knowledge.js` 新增 `buildSiteKnowledge()`：网站六大功能介绍注入 system prompt；补全 `0.o->陈梓键`、`O.o->饶志锐` 昵称映射
- `persona.js` BASE_TEMPLATE 追加网站信息块

**BUG-62 修复**：`topicSearchAgent.js` FTS5 双列 MATCH 语法错误--原写 `f.keywords MATCH ? OR f.summary MATCH ?`（FTS5 不支持列级 OR），改为表级 `f.message_chunks_fts MATCH ?`（搜索所有列）

#### 2. 数据纯净重建（commit `9659047`）

- `export_chat.py` 过滤仅西德+东德两个群（原 41 个群+私聊混入）
- 数据库重导：538,915 条（2022-07-11 ~ 2026-08-10 19:21），MAX(id)=2,165,813
- 分块重建：5,372 个 chunk + FTS5 索引（keywords+summary 双列 trigram）
- `buildChunks.js` 重构：修复 id 空洞问题（重导后 id 非连续，原 COUNT(*) 估算漏掉高位 id），改为基于 endId 推进

#### 3. LLM 多通气回退（本轮，未 commit）

院长要求不需要 LLM 多通道，恢复纯火山引擎：
- `llm.js`：配置常量恢复纯 `VOLC_*`；`chatCompletion`/`chatCompletionStream` 两处恢复无条件 `thinking: { type: 'disabled' }`（火山引擎支持）
- `buildChunks.js`：`generateKeywords` 删除 DeepSeek 独立 fetch 分支，恢复单一路径走 `chatCompletion`（火山引擎）

#### 数据库待白机部署

本地 dev.db 已就绪（131MB，538,915 条 + 5,372 分块 + FTS5 索引），**黑机 SSH 22 端口被阿里云安全组拦截无法连服务器**。院长通过微信将 dev.db 传递给白机，由白机执行部署：
- ⚠️ **禁止 `prisma db push`**（BUG-61 教训：FTS5 虚拟表触发连锁删表），只能直接替换 dev.db 文件
- 部署步骤：备份线上旧库 -> 上传 dev.db 覆盖 -> 重启 PM2
- **dev.db 不入 git**（131MB 超 GitHub 100MB 限制），.gitignore 的 `*.db` 规则保持不变

#### 待办（交接白机）

**数据库部署（白机执行，院长微信传 dev.db）**：
- [ ] 上传 dev.db 到服务器 `/root/projects/www.nandexueyuan.top/server/prisma/dev.db` 覆盖（先备份旧库）
- [ ] 重启 PM2（`pm2 restart nandexueyuan-api`）
- [ ] 线上验证：男德通问"群聊有多少条消息"应返回 538,915 条

**待院长裁决（⛰️ uphill）**：
- [ ] R-037 菜单 UI 方案 / R-038 地图 UI 方案
- [ ] 国会事变剧本逐句审
- [ ] CG 视频 PoC 验收 + 嵌入方案
- [ ] 男德通 Phase 2 第二批（向量语义检索，doubao-embedding，约¥7）

**剧情（白机继续）**：
- [ ] 第四幕「东边的刀」（海盗线）过稿
- [ ] 选择③ C 选项=最优解分支情节

---

## 白机本轮产出（2026-08-10 17:20）

### v3.2.0 发版 + 部署上线 + BUG-61 事故修复

#### 1. v3.2.0 发版（commit `408ff85`）
- 版本号 3.1.0 -> 3.2.0（minor，男德通 AI 全面升级）
- 公告：Markdown 渲染 / 4 套人设切换 / 院长信箱 / AI 起草信件 / 头像文件上传 / 黑机离线提示 / 同义词扩展
- seedVersion.js 新增 v3.2.0 公告

#### 2. 院长信箱命名 + 头像文件上传（commit `630c85a`）
- 反馈页路由 /feedback -> /mailbox，TopBar"反馈"->"院长信箱"，文案改世界观风格（投递信件/撤回/信箱空空如也）
- 头像上传：后端 userController 加 avatarUpload（multer 磁盘存储 uploads/avatars/ 2MB），前端 ProfileDialog URL 输入改文件选择 + 圆形预览

#### 3. 反馈类型 + AI 确认制改进（commit `ac73186`）
- Feedback type 改 4 种：BUG反馈/功能优化/功能新增/剧情设计，加 action 字段（用户具体操作）
- AI 提需求改为确认制：orchestrator 不自动入库 -> SSE 推反馈草稿 -> ChatView 展示确认卡片（类型/标题/操作/描述）-> 用户点"确认投递"才调 API 入库
- handoff 部署提醒标注"黑机无法操作服务器"

#### 4. 部署上线
- git pull + prisma db push + seedVersion + rebuildFts + deploy.sh 全流程
- 线上验证：公告 v3.2.0 ✅ / 前端 HTTPS 200 ✅ / 后端 API ✅ / 游戏服务器 ✅
- FTS5 索引重建成功（5101 条，双列 keywords+summary）

#### 5. BUG-61：prisma db push --accept-data-loss 误删全部数据表
- **事故**：FTS5 虚拟表不在 Prisma schema 中，`--accept-data-loss` 触发连锁删除，dev.db 从 131MB 缩至 36KB，仅剩 4 张表
- **恢复**：服务器 prod.db 备份完整（131MB，51 万条群聊），`cp prod.db dev.db` 恢复 + 重建 FTS5 索引
- **教训**：禁止生产环境用 `db push --accept-data-loss`；FTS5 变更手动 DROP+CREATE；部署前必须备份 dev.db
- **已登记**：`prd/.../bug-log.md` BUG-61

#### 6. 公告排序修复（commit `d5cb63b`）
- getAnnouncement 排序加 `id desc` 二级排序（同日期取最新 id），修复 v3.1.0 和 v3.2.0 同日期时返回旧版问题

#### 待办（交接后续）

**第二批（需黑机配合 + 文档解析）**：
- [ ] 2.4 网站知识库（knowledgeAgent 读取词云/版本/世界观/角色设计/美术资产文档）
- [ ] 2.5 向量语义检索（doubao-embedding-text-240715，1024维，51万条约¥7，黑机批量向量化）

**待院长裁决（⛰️ uphill）**：
- [ ] R-037 菜单 UI 方案 / R-038 地图 UI 方案
- [ ] 国会事变剧本逐句审
- [ ] CG 视频 PoC 验收 + 嵌入方案

**白机继续**：
- [ ] 第四幕「东边的刀」（海盗线）过稿
- [ ] 选择③ C 选项=最优解分支情节
- [ ] 男德通 Phase 2 第二批（网站知识库+向量检索）

**部署纪律备忘**：
- ⚠️ 禁止 `prisma db push --accept-data-loss`（BUG-61 教训），用 `prisma migrate` 或先备份
- 服务器保留 prod.db 作为定期备份

---

## 白机本轮产出（2026-08-10 16:06）

### 男德通 AI 优化 Phase 2 第一批（commit `ba91f1f`）

> 院长提出 5 个新需求，分两批实现。本轮完成第一批（轻量快速），第二批（网站知识库+向量检索）待后续。

#### 2.1 人设切换（预设 + 自定义）
- `persona.js` 新增 PERSONAS 字典（4 套预设：体委/丘比/开开/正常人）+ getPersona(id,desc) + buildCustomPersona
- BASE_TEMPLATE 模板复用：成员知识库+数据规则+话题限制共用，仅说话风格不同
- 全链路传参：chatController askChat -> orchestrate(question, history, send, personaId, customDesc) -> buildPlannerPrompt/buildAnalysisPrompt/runDirectChat 全部接收 persona
- ChatView sidebar 顶部加人设选择器（下拉 4 预设 + "自定义"输入框），localStorage 持久化

#### 2.2 需求反馈页面（独立路由 /feedback）
- Prisma 新增 Feedback model：type(bug/feature/other) + status(open/in_progress/resolved) + priority + source(manual/ai)
- `feedbackController.js`：listFeedback（全部可见）/ createFeedback / deleteFeedback（作者或admin）/ updateStatus（admin only）
- 前端 `FeedbackView.vue`：表单（类型下拉+标题+内容）+ 列表（状态筛选+admin 状态管理 select）+ AI 提交标记
- TopBar 加"反馈"菜单项，/feedback 路由
- **AI 提需求**：orchestrator 新增 matchFeedbackIntent 正则检测 + runFeedbackFlow（LLM 生成结构化反馈 JSON + 流式回答）；chatController 收到 result.feedback 自动入库（source=ai）；ChatView 处理 feedback_created SSE 事件展示"已自动提交反馈"提示+跳转链接

#### 2.3 黑机离线提示
- `dispatchAgent` 标记 `_wasHeavy`/`_degraded` 降级状态（重度任务黑机离线走本地=降级）
- `runAnalysisAndAnswer` 检测所有重度任务全降级时，发 `phase=warning` 事件提示"⚠️ 当前高性能计算节点（黑机）离线，本次查询使用降级模式（数据量受限）。如需完整查询请联系院长开启黑机。"
- ChatView warning 阶段高亮样式（金色背景+加粗）

#### 验证
| 验证项 | 结果 |
|---|---|
| `npm run build` | ✅ 通过 |
| 后端全模块加载 | ✅ orchestrator/chatController/feedbackController/api |
| Prisma Feedback model | ✅ db push 同步成功 |

#### 待办（交接后续）

**第二批（需黑机配合 + 文档解析）**：
- [ ] 2.4 网站知识库（knowledgeAgent 读取词云/版本/世界观/角色设计/美术资产文档）
- [ ] 2.5 向量语义检索（doubao-embedding-text-240715，1024维，51万条约¥7，黑机批量向量化）

**待部署（院长/白机操作，黑机无法操作服务器）**：
- [ ] `cd server && npx prisma db push` -- Feedback 表（含 action 字段）同步到生产数据库
- [ ] `cd server && node scripts/rebuildFts.js` -- FTS5 索引重建（Phase1 summary 纳入索引）

**待院长裁决（⛰️ uphill）**：
- [ ] R-037 菜单 UI 方案 / R-038 地图 UI 方案
- [ ] 国会事变剧本逐句审
- [ ] CG 视频 PoC 验收 + 嵌入方案

**白机继续**：
- [ ] 第四幕「东边的刀」（海盗线）过稿
- [ ] 选择③ C 选项=最优解分支情节
- [ ] 男德通 Phase 2 第二批（网站知识库+向量检索）

**备注**：
- 黑机无法直接操作服务器，部署相关操作（prisma db push / rebuildFts / deploy.sh）只能白机或院长执行
- FTS5 索引重建 + Feedback 表生产同步 + 线上实测待部署时一并执行
- 火山引擎 embedding API 调研完成：doubao-embedding-text-240715，OpenAI 兼容，¥0.7/百万token，51万条约¥7

---

## 白机本轮产出（2026-08-10 14:56）

### 男德通 AI 优化 Phase1（commit `d4a2fe5`）

> 院长要求针对男德通 AI 进行优化，选定方向：模型与回答质量 + 检索能力升级 + 前端体验。模型确认 GLM-5.2 已是最强不换。本轮完成 5 个子任务。

#### 1.1 前端 Markdown 渲染
- 新增 `src/utils/markdown.js`：markdown-it + dompurify 安全渲染（禁 HTML/限链接协议/DOMPurify 二次过滤）
- `ChatView.vue`：bot 回复从 `{{ }}` 纯文本改为 `v-html="renderMarkdown()"`，加完整 .markdown-body 样式（列表/表格/代码块/引用/链接）
- 人设 prompt 加「可用 **加粗** 和列表突出关键信息」提示

#### 1.2 清理死代码 + 人设统一
- 新增 `server/src/utils/persona.js`：统一 `CHAT_PERSONA`（群友风格+21人知识库注入+数据规则+Markdown提示），orchestrator 和 chatController 共用
- 删除 `chatController.js` ~340 行死代码（classifyIntent/handleStatistic/handleSemantic/handleChat/validateSql/looksLikeDataQuestion/buildContextMessages 7 个废弃函数，askChat 已改走 orchestrator）
- 移除 chatController 未使用的 import（chatCompletion/resolveName/buildMemberKnowledge）

#### 1.3 优化规划阶段（减少不必要 LLM 调用）
- `orchestrator.js` 新增 `matchQuickPattern` 快速路由：正则+成员名库（真名+外号）匹配模板化问题，命中跳过规划 LLM
  - "XX发了多少条"->直接派 person_stat；"XX说了什么"->直接派 person_messages；"如何评价XX"->派 stat+messages+mentioned
  - 10/10 测试通过（含外号匹配：睿哥->陈睿、蛋哥->陈梓键、b大哥->袁崇轩）
- 扩展 `isCasualChat`：20字->40字限制 + 12 种新闲聊模式（哈哈哈/确实/没毛/吃了吗等）

#### 1.4 FTS5 检索增强
- `message_chunks_fts` 索引从单列(keywords)改为双列(keywords+summary)：之前 LLM 生成的 summary 是检索盲区
  - 改了 `scripts/rebuildFts.js` + `scripts/buildChunks.js` 的 buildFtsIndex
  - **部署后需执行 `node scripts/rebuildFts.js` 重建索引才生效**
- `topicSearchAgent.js` 加 `expandSynonyms` 同义词扩展（一次轻量 LLM 调用，"打球"->"篮球/足球/羽毛球/运动"）
- FTS5 查询改为同时 MATCH keywords + summary 双列

#### 1.5 前端体验打磨
- **停止生成**：ChatView 加停止按钮（AbortController 中断 fetch）+ 后端 askChat 监听 req.on('close') + CLIENT_ABORTED 静默中断
- **复制回答**：bot 消息下方加复制按钮（navigator.clipboard + 2s 反馈）
- **移动端 sidebar**：改为 overlay 抽屉式（窄屏默认收起 + resize 监听 + 遮罩层点击关闭）

#### 验证
| 验证项 | 结果 |
|---|---|
| `npm run build` | ✅ 通过 |
| 后端全模块加载 | ✅ chatController/orchestrator/topicSearchAgent/persona/llm |
| matchQuickPattern 逻辑测试 | ✅ 10/10 |

#### 待办（交接后续）

**待部署（服务器执行）**：
- [ ] `cd server && node scripts/rebuildFts.js` -- FTS5 索引重建（summary 纳入索引生效）

**待院长裁决（⛰️ uphill）**：
- [ ] Phase 2 向量语义检索（需确认火山方舟 ARK 是否支持 embedding 端点 -> 黑机批量向量化 51 万条 -> sqlite-vec 或内存余弦计算）
- [ ] R-037 菜单 UI 方案 / R-038 地图 UI 方案
- [ ] 国会事变剧本逐句审
- [ ] CG 视频 PoC 验收 + 嵌入方案

**白机继续**：
- [ ] 第四幕「东边的刀」（海盗线）过稿
- [ ] 选择③ C 选项=最优解分支情节
- [ ] 男德通 Phase 2（向量检索，待 embedding API 确认）

**备注**：
- 黑机未开机，FTS5 索引重建 + 线上实测需晚上黑机开机后进行

---

## 白机本轮产出（2026-08-10 11:40）

### a11y 第 2/3 阶段 + v3.1.0 发版上线

> 继 GUI 测试工具集调研落档后，本轮完成 a11y 三阶段改造的剩余两阶段 + 发版部署 + 线上全量测试。

#### 1. a11y 第 2 阶段：views/components 层图标按钮补属性（commit `3881a5b`）
- 9 处裸符号按钮（×关闭/☰侧边栏/✕移除图片）补 `aria-label` + `data-testid`
- 文件：NdeSettingsDialog / ProfileDialog / VersionHistoryDialog / GameView(3处) / WallView / ChatView(2处)
- `.a11y-ignore` 白名单清空（第 2 阶段完成，0 待迁移项）
- 验证：`lint:a11y` 0 违规 0 白名单

#### 2. a11y 第 3 阶段：原生 alert/confirm 替换为自定义弹窗（commit `0efd183`）
- 新增 `src/stores/dialog.js`（Pinia store）：`confirm()` 返回 Promise\<boolean\> + `alert()` 返回 Promise\<void\>，支持 danger 模式/自定义按钮文案
- 新增 `src/components/GlobalDialog.vue`：莫兰迪风格弹窗（role="dialog" + aria-modal + data-testid + ESC 关闭 + 过渡动画 + z-index 用 token）
- `src/App.vue` 挂载 `<GlobalDialog />`
- 13 处调用替换：WallView(6) / AdminView(3，禁用带 danger 红色) / ChatView(1，danger) / VersionHistoryDialog(2)
- 残留原生 alert/confirm 扫描：**0 处**

#### 3. v3.1.0 发版 + 部署上线（commit `acc2b47`）
- 版本号 3.0.2 -> 3.1.0（minor，界面交互优化）
- 公告：全站弹窗升级自定义样式 / 无障碍图标按钮 / 自动化测试基建
- 服务器部署全绿（含前端 HTTPS 验证首次通过）

#### 4. 线上全量测试（5 页面 × 弹窗 + a11y + 存档恢复）

| 页面 | 测试项 | 结果 |
|------|--------|------|
| 登录 | chenzijian 登录（密码已重置 czj136523510） | ✅ |
| 师德墙 | confirm 删除动态 + 删除评论 | ✅ 弹窗正常 |
| 男德通 | confirm 删除会话 + a11y（☰/× aria-label） | ✅ |
| 德塔 | 预加载→存档恢复(ch3_leave_choice) + QuickMenu 6按钮 aria-label + 存档面板 role=dialog + getByTestId 定位 | ✅ |
| 管理后台 | confirm 禁用/重置密码/角色变更（3处） | ✅ 弹窗正常 |
| 全量 | data-testid 定位（dialog-cancel-btn / vn-save-btn / vn-saveload-close-btn） | ✅ |
| 全量 | **0 处原生浏览器弹窗** | ✅ |

### 待办（交接后续）

**待院长裁决（⛰️ uphill）**：
- [ ] R-037 菜单 UI 方案（①暗色精修/②羊皮纸/③极简文字）
- [ ] R-038 地图 UI 方案 + 字体选择
- [ ] 国会事变剧本逐句审（完整版8场+精简版）

**白机继续**：
- [ ] 第四幕「东边的刀」（海盗线）过稿
- [ ] 选择③ C 选项=最优解分支情节
- [ ] e2e 测试覆盖扩展（当前 4 示例，后续按需增加登录态/德塔游戏流程测试）

**美术（黑机）**：
- [ ] 第三幕过渡段大厅角色入画图 P1 / 第二幕自由活动大厅图 P1
- [ ] 圆桌桌面特写 P1 / 三张共和国事变照片 P2
- [ ] 信使立绘 P2（与饶形象设计同批）

**备注**：
- chenzijian 密码已重置为 `czj136523510`（Prisma 字段名 `passwordHash` 非 `password`，踩坑记录）
- a11y 三阶段全部完成，规范文档见 `prd/.../技术设计/前端可访问性与测试钩子规范.md`

---

## 白机本轮产出（2026-08-10 09:20）

### 1. v3.0.2 部署上线（WebP 压缩生效，线上加载提速）

> 院长指示："先部署吧，让线上能够快速使用游戏，每次进去加载半天很影响用户使用"。

- **部署执行**：SSH 通（服务器 22 端口本次可达），服务器 `git stash && git pull origin master && bash deploy.sh`，9 步全通过
- **服务器版本**：`dbccdcf`(v3.0.1) -> `695b765`(v3.0.2)，fast-forward 39 文件
- **核心效果**：游戏图片 146.65MB -> 28.19MB（WebP q95，省 80%），进德塔加载显著加快
- **线上验证（真实域名访问，全部通过）**：
  - HTTPS `https://www.nandexueyuan.top` -> 200 OK ✅
  - HTTP->HTTPS 跳转 -> 301 ✅
  - WebP 资源 `tower_day.webp` -> 200 OK，image/webp，453KB（旧 PNG 2.1MB）✅
  - 旧 PNG `tower_day.png` -> 404（已替换）✅
  - 版本公告 v3.0.2 正常 ✅ / 后端 API / 师德墙 / 游戏服务器 全部正常 ✅

### 2. deploy.sh 验证脚本修复（误报消除）

- **问题**：部署脚本验证报"✗ 前端异常"，但实际 HTTPS 服务正常
- **根因**：certbot 配 HTTPS 后，80 端口的 301 强制跳转是域名级（`server_name nandexueyuan.top`），验证脚本用 `http://localhost/` 检测，localhost Host 头不匹配走默认 server 返回 404
- **修复**：`deploy.sh` 前端验证从 `http_code http://localhost/`（期望 200/301/302）改为 `curl -sk https://localhost/`（期望 200）
- **提交**：`6e98c1d`，已推送

### 3. AGENTS 身份判定规则落档

- **需求**：院长要求每次交接时通过当前时间判断身份（周一至周五 09:00~19:00 = 白机，其余 = 黑机）
- **落档**：AGENTS.md「双机协作」节新增「身份判定（每次会话必做，先于一切）」子节，含时间段表 + 判定方式 + 判定后三项动作；「换机铁律」步骤改为从 0 开始（0=判定身份）
- **本轮身份**：周一 09:14 -> 白机

### 待办（交接后续）

**待院长裁决（⛰️ uphill）**：
- [ ] R-037 菜单 UI 方案（①暗色精修/②羊皮纸/③极简文字）
- [ ] R-038 地图 UI 方案 + 字体选择
- [ ] 国会事变剧本逐句审（完整版8场+精简版）

**白机继续**：
- [ ] views/components 层 a11y 渐进迁移（每完成一个删 `.a11y-ignore` 对应行）
- [ ] views 层 13 处原生 alert/confirm -> 自定义弹窗
- [ ] 第四幕「东边的刀」（海盗线）过稿
- [ ] 选择③ C 选项=最优解分支情节

**美术（黑机）**：
- [ ] 第三幕过渡段大厅角色入画图 P1 / 第二幕自由活动大厅图 P1
- [ ] 圆桌桌面特写 P1 / 三张共和国事变照片 P2
- [ ] 信使立绘 P2（与饶形象设计同批）

---

## 白机本轮产出（2026-08-10 00:59）

### GUI 测试工具集 + 前端 a11y/测试钩子规范实现（架构级）

> 院长拍板执行调研方案。三痛点（HTTPS 证书/原生弹窗/图标按钮定位）原生解决，项目从零测试基建升级为 e2e + a11y 强制扫描。

#### 1. Playwright E2E 基建（痛点1+2 解决）
- `playwright.config.js`：`ignoreHTTPSErrors=true` 全局忽略证书 + `baseURL` 环境变量切换本地/线上 + webServer 自动起 vite
- `tests/e2e/fixtures.js`：`autoAcceptDialogs` fixture 自动接受 alert/confirm/prompt
- `tests/e2e/utils.js`：`clickIconBtn`（getByTestId > getByRole > getByText）+ `uploadFiles` + `dismissNativeDialog` + `waitForVNScene`
- `tests/e2e/example.spec.js`：4 个示例测试
- `package.json`：devDeps 加 `@playwright/test`，scripts 加 `lint:a11y`/`test:e2e`/`test:e2e:ui`

#### 2. a11y 强制扫描脚本（零依赖）
- `scripts/check-a11y.mjs`：扫描 src/**/*.vue，图标按钮缺 aria-label/data-testid 报错，支持 `.a11y-ignore` 白名单
- `.a11y-ignore`：9 个 views/components 层待迁移项登记

#### 3. 德塔 visualnovel 模块示范改造（8 组件）
- QuickMenu（6 按钮 + 浮动恢复按钮）/ SettingsPanel（关闭+toggle role=switch+overlay role=dialog）/ HistoryPanel / InventoryPanel（关闭+详情关闭+overlay）/ MapPanel / SaveLoadPanel（关闭+存档/读档/删除/新建+overlay）/ HotspotLayer（热点 aria-label）/ DialogueBox（确认 testid）

#### 4. 规范文档 + CONTRIBUTING
- `prd/.../技术设计/前端可访问性与测试钩子规范.md`（核心规则+各场景细则+命名约定+定位优先级）
- `CONTRIBUTING.md` 新增「八、前端可访问性与测试钩子」章节

#### 验证（全部通过）
| 验证项 | 结果 |
|---|---|
| `npm run build` | ✅ 通过（6.05s） |
| `npm run lint:a11y` | ✅ 退出码 0（76 button，9 白名单豁免，0 违规） |
| `npx playwright test` | ✅ 4 passed（12.8s） |

#### 后续待办
- [ ] views/components 层渐进迁移（每迁移完一个文件删 .a11y-ignore 对应行，最终清空白名单）
- [ ] views 层 13 处原生 alert/confirm 替换为自定义弹窗（另一条改造线，本次未做）
- [ ] e2e 测试覆盖扩展（当前 4 示例，后续按需增加登录态/德塔游戏流程测试）

---

## 白机本轮产出（2026-08-09 21:30）

### 视频导演技能体系搭建 + Seedance API 接入 + 多轮动作设计调研

> 背景：项目计划用 AI 视频生成角色对战 CG（丘 vs 睿）。本窗口从零搭建了视频导演技能体系，接入 Seedance 2.5 API，完成多轮动作设计调研，并创建了调研方法论技能。

#### 1. 睿脸模 v2 + 基准立绘入库
- 睿脸模 v2（真人陈睿锁五官）+ 基准立绘（normal.webp 832×1216）入库 `public/visualnovel/portraits/rui/`
- 美术资产 README 登记 + 德塔 changelog 记录

#### 2. 提示词工程调研 + MiniMax API 指南
- `prd/01-需求文档/00-调研/提示词工程调研-图片与视频生成.md`（tag堆叠已过时/语义模型提示词最佳实践/各模型要点/Seedream专项/视频提示词要素清单）
- `prd/01-需求文档/00-调研/MiniMax视频生成API使用指南.md`（官方txt去重整理为md，9章节）
- image-gen SKILL 更新：画风描述改中文语义、负面词改可选、补视频提示词指导

#### 3. 视频分镜与导演艺术调研
- `prd/01-需求文档/00-调研/视频分镜与导演艺术调研.md`（分镜格式/运镜技术/动作场景设计/30秒叙事节奏/AI视频分镜实践/各模型对比）

#### 4. video-director AI 视频导演技能
- `.zcode/skills/video-director/SKILL.md`（7条纪律+7步强制工作流：分镜设计/运镜工具箱/语义提示词/角色一致性/Seedance API规范/调用脚本/存储纪律）
- 触发词：生成视频/出视频/CG视频/视频分镜/对战视频/video-director

#### 5. Seedance API 接入
- `.ai/scripts/lib/seedance_client.py`（视频生成公共模块：create_task/query_task/wait_for_task/download_video/call_seedance一键生成/连接错误保护逻辑）
- `.ai/scripts/README.md` 更新视频生成章节（能力/价格/模板/踩坑速查）
- 模型：doubao-seedance-2-5-260628 / 密钥复用 VOLC_API_KEY

#### 6. AGENTS 禁止事项第5条（铁律）
- **AI生成API调用必须院长确认**：图片/视频生成的API调用前必须展示提示词和参数，院长确认后才能执行。遇报错第一时间停止汇报，禁止擅自换方案重试

#### 7. Seedance 踩坑4条（花钱买的教训）
1. 多模态参考(r2v)模式分辨率上限720p（1080p/4k报参数错误）
2. 真人隐私检测拦截AI生成的逼真立绘（丘立绘被拦，提示词声明无效，可提工单申诉）
3. 代理ConnectionResetError不代表请求失败（服务器可能已收到请求，必须先查任务列表再决定重试）
4. 禁止为测试参数创建真实任务（查文档确认，不要花钱试）

#### 8. 丘vs睿30秒对战视频首版生成
- 首版生成成功（720p/30秒/有声/双参考图），task_id: cgt-20260809190504-27zgw
- 费用：648,900 tokens ≈ 45.4元 + 测试任务7.6元 = ≈53元
- **问题**：①丘立绘被真人检测拦截（后续重试时触发，首版走代理通过）②视频只有对视对轰，缺乏动作设计
- 视频文件：`.ai/seedream-test/video/qiu_vs_rui.mp4`（36.9MB）

#### 9. 动作设计与武术指导调研
- `prd/01-需求文档/00-调研/动作设计与武术指导调研.md`（漫威动作方法论/弓箭手近战弓术7层/魔法师施法三段式/打斗三幕结构/动作经济原则/喘息空间/AI视频动作描述六大规则）
- video-director 技能更新：角色动作签名（弓箭手7层+魔法师6层）、打斗三幕、30秒节拍分配

#### 10. 凡人修仙传战斗设计调研
- `prd/01-需求文档/00-调研/凡人修仙传战斗设计调研.md`（四段式层次：试探->升级->转折->决胜/心理博弈/藏底牌/韩立谨慎战术流/修仙元素转译表）
- video-director 技能更新：战斗层次四段式、藏底牌节奏、跑路战术、心理博弈原则

#### 11. research 系统化调研方法论技能
- `.zcode/skills/research/SKILL.md`（8条纪律：6步调研流程/信息源优先级/登录墙红线/交叉验证/统一落档模板/平台策略/并行分治/落档铁律）
- 定位为方法论层，调用 web-access/WebSearch/WebFetch 执行实际联网

#### 待办（交接后续）

1. **丘vs睿视频重跑**：等 Seedance 真人检测申诉结果（Request ID: 0217862740302538e51dc06ab515804a61f8066ae6218c1d62c84），通过后用双参考图+新版快节奏提示词重跑
2. **新版提示词已产出**：快节奏猛烈对战版（四段式：试探->升级->转折->决胜，含移动射击/翻滚闪避/光盾格挡/高处滑射），院长已确认可执行，待真人检测解决后跑
3. **调研文档体系**：00-调研目录已有6份视频相关调研文档，可复用

---

## 白机本轮产出（2026-08-09 20:09）

### 线上 SSL 证书配置落地（HTTPS 全站生效，不安全标识已消除）

> 背景：院长反馈网站地址栏显示"不安全"。排查发现：ICP 备案 ≠ SSL 证书，项目此前从未配置 HTTPS（代码层全 HTTP/WS，部署文档仅规划过 443+Let's Encrypt 未落地，交接单历史记录"443 不通"）。本次在服务器纯命令行配置完成。

#### 1. 环境确认（服务器 Ubuntu 22.04 / nginx 1.18.0）
- nginx 已正确配置：server_name 双域名（nandexueyuan.top + www.nandexueyuan.top）、root 指向 dist、/api/ 反代 3000、/ws 反代 2567、SPA fallback
- ufw 已放行 443（系统层防火墙 OK）
- certbot 未安装（本次安装）

#### 2. 操作步骤（服务器 root 执行）
1. `apt update && apt install -y certbot python3-certbot-nginx`（安装 certbot + nginx 插件）
2. `cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak.manual`（备份配置）
3. `certbot --nginx -d nandexueyuan.top -d www.nandexueyuan.top --redirect`（申请证书 + 自动配 nginx + 强制跳转）

#### 3. 配置结果（certbot 自动完成）
- 证书位置：`/etc/letsencrypt/live/nandexueyuan.top/`（fullchain.pem + privkey.pem）
- nginx 配置：certbot 自动在 `/etc/nginx/sites-available/default` 追加 443 ssl server block（`listen 443 ssl` + ssl_certificate + ssl_dhparam，均标 `# managed by Certbot`）
- 强制跳转：80 端口 server block 内 certbot 自动加 `return 301 https://$host$request_uri`
- ⚠️ certbot 把 443 server block 追加在同文件，`cat default` 只看到 80 block 是正常的，用 `nginx -T` 才能看到完整生效配置

#### 4. 验证（全部通过）
| 验证项 | 结果 |
|---|---|
| 443 监听 | ✅ `ss -tlnp` nginx 监听 0.0.0.0:443 |
| HTTPS 访问 | ✅ `curl -I https://www.nandexueyuan.top` -> 200 OK |
| 80->443 跳转 | ✅ `curl -I http://...` -> 301 Moved Permanently -> https:// |
| 自动续签定时任务 | ✅ `systemctl list-timers` -> certbot.timer 每日触发 |
| 续签模拟测试 | ✅ `certbot renew --dry-run` -> all simulated renewals succeeded |

#### 5. 历史问题关闭
- 交接单黑机 2026-08-01 记录的"443 不通（安全组/防火墙问题）"现已解决。实际 ufw 已放行 443，此前不通是**从未配置过 443 的 nginx server**（certbot 本次才创建），并非安全组问题。

#### 6. 后续注意
- Let's Encrypt 证书 90 天到期，certbot.timer 自动续签（已验证 dry-run 通过），**不要禁用该定时任务**
- 德塔多人功能上线时，Colyseus 的 `ws://` 需改 `wss://`（走 443 复用），前端 `NetworkSystem.js` 连接 URL 届时同步改。当前视觉小说单机模式不受影响
- 阿里云 ECS 安全组入方向需有 443/TCP 规则（本次 ufw 已放，如后续发现外部仍访问不了 443，检查阿里云控制台安全组）

---

## 白机本轮产出（2026-08-09 19:06）

### GUI 测试工具集 + 前端 a11y/测试钩子规范调研落档（⛰️ uphill，方案待院长拍板）

> 背景：GUI 自动化测试频繁处理 HTTPS 自签名证书、原生弹窗、图标按钮定位，测试代码高度冗余且易错。本轮做完整调研并产出成型方案，**未写任何代码**，落档供后续拍板执行。
>
> 📄 完整调研文档：`prd/01-需求文档/00-调研/GUI自动化测试与前端可访问性调研.md`（按知识库调研归档规范五段式结构：背景/重点调研对象/横向对比/总结与建议/待确认事项）

#### 三个事实校正（避免后续会话误判场景）

| 用户原始描述 | 实际现状 | 影响 |
|---|---|---|
| "复杂的 SVG 图标按钮" | src 零 `<svg>`，图标全是 emoji/符号字符（🎒💾⚙✕▶） | 规范需覆盖未来 SVG 场景；当前痛点是 emoji 按钮无语义 |
| "频繁处理 HTTPS 自签名证书" | 本地全链路纯 HTTP（vite:4396/express:3000/colyseus:2567，无证书），痛点应是测线上/staging 时遇到 | 工具集需同时覆盖 HTTP(本地)+HTTPS(线上) |
| "测试代码高度冗余" | 现有 GUI 测试技能链(node_repl+browser-client)不支持 `ignoreHTTPSErrors`（插件全代码零命中） | 根因是技能链能力缺口，需引入原生 @playwright/test 才能用原生 API 一行解决 |

#### 现状数据（实证）

- 图标按钮：`aria-label`/`data-testid`/`role` 全 src **0 个**；visualnovel 模块 16 个 button、全 src 76 个 button 全靠 CSS class 定位；15 处纯 `✕` 关闭按钮会被屏幕阅读器误读为"乘号"
- 原生弹窗：views 层（WallView/AdminView/ChatView/VersionHistoryDialog）**13 处** 原生 alert/confirm，未迁移到已有的自定义 overlay 弹窗体系
- 测试基建：**零**——无 playwright/vitest/jest 依赖、无 `playwright.config`、无测试目录、无 helper/fixture；devDeps 仅 `@vitejs/plugin-vue`+`vite`，scripts 仅 dev/build/preview；无 eslint
- 依赖已装 `lucide-vue-next`（SVG 图标库）但未启用——未来引入 SVG 时规范更要提前就位

#### 成型方案（两条线，待院长拍板后执行）

**线1：Playwright E2E 基建 + 工具集**
- `playwright.config.js`：`use.ignoreHTTPSErrors=true` 全局忽略证书 + `baseURL` 环境变量切换本地/线上 + webServer 自动起 vite
- `tests/e2e/fixtures.js`：`autoAcceptDialogs` fixture（自动接受 alert/confirm/prompt）+ `secureContext`（隔离 context）
- `tests/e2e/utils.js`：`uploadFiles`（多类型文件上传，处理 hidden input）+ `clickIconBtn`（优先 getByTestId > getByRole({name}) > getByLabel）+ `dismissNativeDialog`
- `tests/e2e/example.spec.js`：演示三类工具用法
- `package.json`：devDeps 加 `@playwright/test`，scripts 加 `test:e2e`

**线2：前端可访问性 + 测试钩子规范**
- 规范文档 `prd/.../技术设计/前端可访问性与测试钩子规范.md`：图标按钮强制 aria-label 或 data-testid + 定位优先级 + 各场景细则（纯图标/toggle/弹窗/上传/SVG）+ data-testid 命名约定
- 轻量扫描脚本 `scripts/check-a11y.mjs`（零依赖，非 eslint 全家桶）：扫描 src/**/*.vue，缺 aria-label/data-testid 的图标按钮报错，`npm run lint:a11y`
- 德塔 visualnovel 模块示范改造：16 个 button 补属性（QuickMenu 5 个 emoji + 各 Panel 关闭按钮 + HotspotLayer + SaveLoadPanel + SettingsPanel toggle）
- CONTRIBUTING.md 新增 a11y 章节

#### 待院长拍板的决策点（3 个）

1. **工具集形态**：建 e2e 基建+工具集（引入 @playwright/test，原生 API 一行解决证书/弹窗，长期价值高）vs 仅写测试模板文档（轻量无依赖，但现有技能链不支持忽略证书）
2. **规范强制手段**：轻量 check-a11y.mjs 脚本（零依赖，聚焦单一规则）vs eslint+vuejs/accessibility 全家桶（约束力强但膨胀 devDeps 且报既有噪音）
3. **改造范围**：德塔 visualnovel 模块示范（16 个 button）vs 全项目（76 个 button，含 views 层 13 处原生弹窗替换，工作量大）

> 默认推荐：线1建 e2e 基建 + 线2轻量脚本+德塔示范。院长拍板后可进入实现。

### 待办（交接后续）

**待部署**：
- [x] ~~v3.0.2（图片压缩+公告）待部署上线~~ ✅ 已部署（2026-08-10 09:15，白机）

**待院长裁决**：
- [ ] ⛰️ uphill **GUI 测试工具集方案**（见上「线1」决策点1：建 e2e 基建 vs 仅模板文档）
- [ ] ⛰️ uphill **前端 a11y/测试钩子规范方案**（见上「线2」决策点2/3：强制手段 + 改造范围）
- [ ] R-037 菜单 UI 方案（①暗色精修/②羊皮纸/③极简文字）
- [ ] R-038 地图 UI 方案 + 字体选择
- [ ] 国会事变剧本逐句审（完整版8场+精简版）
- [ ] CG 视频 PoC 验收（海螺生成版画质/画风是否达标）
- [ ] ⛰️ uphill CG 视频**嵌入方案**（院长指示先保留后续再做）。首个 PoC 视频已在：`美术资产/丘/Hailuo_Video_...mp4`（15.87MB，国会大厅场景，已 gitignore）。引擎现状无视频能力（BackgroundLayer 仅渲染静态 webp）。后续嵌入时需先决策：①呈现方式（全屏CG播放器/视频作背景层/照片查看器内嵌）②对应剧本哪几场 ③播放控制（自动/可跳过）

**剧情（白机继续）**：
- [ ] 第四幕「东边的刀」（海盗线）过稿
- [ ] 选择③ C 选项=最优解分支情节

**美术（黑机）**：
- [ ] 第三幕过渡段大厅角色入画图 P1 / 第二幕自由活动大厅图 P1
- [ ] 圆桌桌面特写 P1 / 三张共和国事变照片 P2
- [ ] 信使立绘 P2（与饶形象设计同批）

---

## 白机本轮产出（2026-08-09 16:10）

### 1. 美术设计规范 V2.1（画风改中文语义）

- `02-设计/美术设计/美术设计规范.md` V2→V2.1
- §1 画风定义：英文关键词（`thick oil painting...`）+ ComfyUI/LoRA 管线 → 完整中文语义描述（适配 Seedream/MiniMax 语义模型）
- §2.2 发色速查表/§2.3 年龄控制：英文词改中文
- §7 设计原则：去掉 LoRA 引用

### 2. 国会事变剧本初稿（已提交 `1b73905`）

- `02-设计/剧情设计/国会事变-剧本.md`：完整版 8 场（黎明前→国会大厅→结果宣布→撞击→第二架→废墟誓言→就任→尾声箭羽）+ 精简版一段话 + 饶暗线附录
- 丘身份=游侠/平民（院长修正：非议员）
- 三张照片对应：①飞机撞大楼 ②丘拦第二架 ③丘当选

### 3. CG 视频提示词精写 + 首个 PoC

- 15 秒版本提示词，事无巨细（建筑结构/飞行器/人物穿着动作/箭与晶石/光影/音效），搭配 `qiu/rogue.webp` 参考图
- 院长已用 MiniMax H3 生成首个 PoC：`美术资产/丘/hailuo-assets/asset-542758497214140425.mp4`（5.5MB，已 gitignore）
- `.gitignore` 补 `*.mp4` 忽略

### 4. v3.0.2 公告 + 版本号（已提交 `1b73905`）

- seedVersion.js 新增 v3.0.2 公告（图片压缩优化）
- package.json/server.package.json 版本号 3.0.1→3.0.2

### 待办（交接后续）

**待部署**：
- [x] ~~v3.0.2（图片压缩+公告）待部署上线~~ ✅ 已部署（2026-08-10 09:15，白机）

**待院长裁决**：
- [ ] R-037 菜单 UI 方案（①暗色精修/②羊皮纸/③极简文字）
- [ ] R-038 地图 UI 方案 + 字体选择
- [ ] 国会事变剧本逐句审（完整版8场+精简版）
- [ ] CG 视频 PoC 验收（海螺生成版画质/画风是否达标）
- [ ] ⛰️ uphill CG 视频**嵌入方案**（院长指示先保留后续再做）。首个 PoC 视频已在：`美术资产/丘/Hailuo_Video_...mp4`（15.87MB，国会大厅场景，已 gitignore）。引擎现状无视频能力（BackgroundLayer 仅渲染静态 webp）。后续嵌入时需先决策：①呈现方式（全屏CG播放器/视频作背景层/照片查看器内嵌）②对应剧本哪几场 ③播放控制（自动/可跳过）

**剧情（白机继续）**：
- [ ] 第四幕「东边的刀」（海盗线）过稿
- [ ] 选择③ C 选项=最优解分支情节

**美术（黑机）**：
- [ ] 第三幕过渡段大厅角色入画图 P1 / 第二幕自由活动大厅图 P1
- [ ] 圆桌桌面特写 P1 / 三张共和国事变照片 P2
- [ ] 信使立绘 P2（与饶形象设计同批）

---

## 白机上轮产出（2026-08-09 00:50）

### 1. R-036 图片压缩验收 + 全量 WebP 替换 + 美术资产 gitignore

- **院长需求**：线上预加载慢（背景图 2-8MB/张+地图 8.4MB），需压缩但不降画质
- **压缩对比验收**（5 张代表图 × 5 方案）：A=PNG 无损重压（省 56-68%）/ B=WebP 无损（省 11-18%）/ C=WebP q95（省 77-82%）/ D=q90 / E=q85。院长验收定 **C=WebP q95**
- **全量替换**：41 张 PNG → WebP q95（bg 24 + portraits 13 + items 2 + map 1），总体积 **146.65MB → 28.19MB（省 80.8%）**
- **代码引用**：5 文件 9 处 `.png` → `.webp`（BackgroundLayer/CharacterLayer/MapPanel/visualNovelStore/items.js）+ 注释同步（bgMaps/locations）
- **美术资产 gitignore**：`prd/.../美术资产/` 下 45 个图片 `git rm --cached`（文件保留磁盘），11 个 md 继续入库，`.gitignore` 加忽略规则
- **转换脚本**：`.ai/scripts/convert-to-webp.cjs`（已 gitignore，可复用）
- **验证**：build 通过 + dev+后端 Playwright 实测 41 张 WebP 全部 200 OK 零 404，视觉正常无画质损失

### 2. R-037 菜单 UI 调研报告 + R-038 地图 UI 调研报告

- **R-037**：`prd/.../03-调研/R-037-菜单UI调研报告.md`。三方案：①暗色奇幻精修（推荐，1-2天）②羊皮纸古卷（3-5天）③极简文字（0.5天）。核心问题是 emoji 图标与世界观割裂 + 面板无差异化
- **R-038**：`prd/.../03-调研/R-038-地图UI调研报告.md`。三方案：①纯 CSS/SVG ②AI 图片贴图 ③混合（推荐）。含花体字体选择（Cinzel/MedievalSharp）+ 地点图标 + 路标木牌方案
- 两份报告均 ⛰️ uphill，待院长裁决方案后进入实现

### 待办（交接后续）

**待院长裁决**：
- [ ] R-037 菜单 UI 方案选择（①/②/③）
- [ ] R-038 地图 UI 方案选择 + 字体选择

**剧情（白机继续）**：
- [ ] 第四幕「东边的刀」（海盗线）过稿（院长逐句）
- [ ] 选择③ C 选项=最优解分支情节（院长指示）

**美术（黑机出图，P1/P2）**：
- [ ] 第三幕过渡段大厅角色入画图 P1
- [ ] 第二幕自由活动大厅角色入画图 P1
- [ ] 圆桌桌面特写 P1 / 三张共和国事变照片 P2
- [ ] 信使立绘 P2（与饶形象设计同批）

**技术（后续）**：
- [ ] 照片查看演出实现（图出后接线）
- [ ] ⚠️ **图片替换需部署上线才能生效**（R-036 改动未部署，线上仍是旧 PNG）

---

## 黑机本轮产出（2026-08-08 00:15）

### 1. 拉取白机 25 commit + 通读第三幕剧情/演出

- `git fetch` + `git merge --ff-only origin/master` 快进 `faab341` -> `89f9bdc`（25 commit，33 文件，+2135 行）
- 通读：空间机制技术方案、locations.js 地点图、chapter1.js 第三幕节点链、演出设计文档、bug-log、CHANGELOG
- 确认白机本轮主线：空间机制 R-035 引擎（架构级）+ 第三幕「东来的信」全量落地 + v3.0.0 发版部署上线 + 预加载优化（含撤回）

### 2. 线上实测复现空间跳转缺陷（院长反馈）

- 院长账号（`czj136523510.`，注意末尾句点）登录正式环境 v3.0.0
- 存档恢复到第三幕信使段（ch3_leave_choice 下楼/再等等）
- 实测复现 4 个缺陷：
  - **缺陷1（P0）**：房间点"睡觉"-> 触发"你出了房间，走到走廊。楼下传来一阵急促的马蹄声。"出门剧情（ch_room_sleep_router 在 ch2_done=true 时直接跳 ch3_leave1，跳过睡觉动作）
  - **缺陷2（P0）**：第三幕走廊只有"下一楼"无"回房间"出口（corridor.exits 漏配，对比 corridor_free 有两个出口）
  - **缺陷3（P1）**：第三幕大厅有"回房睡觉"热点，但房间在二楼，空间逻辑错乱（旧模式迁移遗留）
  - **缺陷4（P1）**：房间 exits 为空，进房间后被困住（只能睡觉不能出去）

### 3. 修复 BUG-59（commit `4f48477` + 文档 `6b6598e`）

- **缺陷1**：ch_room_sleep_router 第三幕分支改跳 ch3_room_sleep（新节点，旁白"你躺下，沉沉睡去了。"-> ch3_room_morning end+explore room 回房间探索态）；room 新增"出门"热点 goto ch3_leave1，玩家主动出门触发信使段
- **缺陷2**：corridor.exits 补"回房间"出口（x 错开 40/60，与 corridor_free 一致）
- **缺陷3**：hall.hotspots 删除 hall_sleep，睡觉入口统一走 大厅->上二楼->走廊->回房间
- **缺陷4**：room 新增"出房间"热点 goto ch_room_exit_router（新路由节点，按 ch2_done 分流 ch2_corridor_enter/ch3_corridor_enter 走廊 onEnter 演出）
- **验证**：build 通过 + 本地 dev+后端实测全链路（大厅3按钮->上二楼->走廊3按钮->回房间->睡觉旁白->回探索态->出房间->走廊onEnter）；出房间路由双向验证（第二幕/第三幕）；旁白 mergeScript 加载正确

### 4. 发版 v3.0.1 + 部署上线 + 线上全量验证 ✅

- 版本号 3.0.0 -> 3.0.1（纯 bug 修复，patch++）；package.json/server.package.json/seedVersion.js/CHANGELOG/handoff 已更新
- 公告措辞遵循院长定的娱乐口吻+零剧透原则（"修复塔楼自由探索的跳转问题"）
- **已部署上线**（院长在服务器执行 `git stash && git pull origin master && bash deploy.sh`，服务器 master `18194d8`）
- **线上全量验证通过**：
  - v3.0.1 公告生效（首页公告栏显示）
  - 存档正常恢复（第三幕信使段）
  - 空间跳转修复真实 UI 交互验证：大厅(见/添/上二楼无睡觉) ✅ / 走廊(班/下一楼/回房间) ✅ / 房间(睡觉/出房间) ✅ / 睡觉(旁白"你躺下，沉沉睡去了"->回房间探索态) ✅ / 出房间(走廊onEnter旁白->走廊探索态) ✅
  - 全流程8关键节点连通性：序章->第一章->第二幕->第三幕探索态->章节结束，无死链 ✅
  - 信使段结束链路：contract 分支 -> ch3_act3_end(isEnded) ✅

### 待办（交接白机/后续）

**美术（黑机出图，P1/P2，白机已列待办）**：
- [ ] 第三幕过渡段大厅角色入画图（见看地图+添沙发看三张照片）P1
- [ ] 第二幕自由活动大厅角色入画图（见端详羊皮卷+添沙发若有所思）P1
- [ ] 圆桌桌面特写（照片位置留白）P1
- [ ] 三张共和国事变照片（相机胶片质感）P2
- [ ] 信使立绘（死灵傀儡，不露正脸）P2--与饶形象设计同批讨论出图
- [ ] 出发·草原路 P2 / 幸谈判态差分 P2 可选

**剧情（白机继续）**：
- [ ] 第四幕「东边的刀」（海盗线）过稿（院长逐句）
- [ ] 选择③ C 选项=最优解分支情节（院长指示）

**饶形象设计（后续讨论）**：
- [ ] ⛰️ 饶的形象设计（信使死灵傀儡形象与其同批）

**技术（后续）**：
- [ ] 照片查看演出实现（圆桌桌面+贴图+lightbox，图出后接线）
- [ ] 图片体积优化（背景 2-8MB/张，线上预加载慢，无损压缩或高画质 WebP）--黑机出图时顺手做

---

## 白机本轮产出（2026-08-07 09:00~16:50）

### 1. 第三幕「东来的信」全量定稿 + 落地

- **台词过稿（院长逐句）**：开场双版本（contract 分支）→ 商队段（三张**照片**——2026-08-07 院长修正画像→照片，载体即共和国科技展示）→ 段六讨论+判断选择（benefit_choice 变量）→ 过渡段探索态（见 Q&A 4 问/添 Q&A 4 问含照片查看占位/班 4 句定稿）→ **信使段**（2026-08-07 院长定稿：取消段九接待选择，信使扔信即走；见"死灵气息"疑点暗线；17 按 contract 分支：A/B→跟幸合作调查 / C/D→防备法刺）
- **代码落地**：86+ 节点（ch3_*），信使段房间探索态→走廊马蹄声→下楼选择→扔信（丘的信道具 qiu_letter）→死灵气息讨论
- **世界观同步**：记忆碎片（帝国传讯）/共和国照片科技/沙漠附庸史/饶死灵傀儡（世界书+设定集双向）

### 2. 空间机制 R-035 引擎（架构级）

- `explore` 节点属性（dialogue/end 均可带）→ 探索态；合成节点渲染（渲染层与剧情共用）
- LOCATIONS 地点图（bg/hotspots/exits/onEnter/unlockedBy）；store 空间状态 + enterExplore/travelTo
- 存档 spaceState 字段（前后端 + 正式迁移文件 `20260807120000_add_game_save_space_state`——⚠️ 线上 deploy.sh 走 migrate 体系，db push 无迁移文件会漏，已补）
- 第二幕结尾迁移探索态：hall_free/corridor_free/room + 班/睡觉路由分流（ch2_done 变量）
- 全量验证：引擎层 474 节点 0 错误 + 浏览器实测（探索态/交互/存档恢复/旧存档兼容）+ console 0 错误

### 3. 发版 v3.0.0 + 部署上线 + 线上完整验证 ✅

- 版本号 2.4.0 → 3.0.0（空间机制=重大架构变更）；seedVersion/CHANGELOG/handoff 已更新
- **已部署上线**（deploy.sh 全流程，服务器 master `af65726` 与仓库一致）
- **线上完整剧情验证**（院长账号真实点击）：序章全流程 → 第一章全程（幕间/帝桥/选择①/第二幕）→ 第二幕自由活动探索态（hall_free 见 Q&A/走廊班对话/room 睡觉）→ 第三幕（商队/段六/过渡段探索态）→ 信使段（台词逐句正确 + 17 分支 C/D）→ 章节结束——全通过
- **预加载优化**（上线生效）：首页（MainView）后台静默预加载 + 按存档章节预加载 + 切章增量预加载——进德塔缓存命中秒进

### 4. 预加载优化 + 部署修复（2026-08-07 傍晚，方案迭代）

- **预加载优化（最终方案）**：initGame 按存档章节预加载（有存档→接着玩的章节；无→序章）+ 进度条；切章增量预加载；抽取 `collectAssetUrls`
- ⚠️ **首页静默预加载已撤回**（commit `a663113`）：曾在 MainView 后台预加载，但几十 MB 在首页下载**拖卡网站**（院长反馈"网站卡的要死"）——回到"进德塔时按进度加载+进度条"，首页零游戏图片下载（线上验证 0 图片请求）
- **BUG-58（部署静默失败）**：deploy.sh 迁移检测 grep `"not applied"` 不匹配实际输出 `"not yet been applied"` → migrate deploy 被跳过（部署"成功"但库没变）→ 已修（`grep -cE "not (yet been )?applied"`）+ 手动补应用迁移 + 登记 bug-log
- **预加载 404**：bg/black 等 CSS 占位 key 被 collectAssetUrls 预加载 → 404 → 已修（只收集 REAL_BG_MAP 真实图，抽公共模块 `data/bgMaps.js`，BackgroundLayer + store 共用）

### 待办（交接黑机/后续）

**美术（黑机出图，P1/P2）**：
- [ ] 第三幕过渡段大厅角色入画图（见看地图+添沙发看三张照片）P1——出图后改 `locations.js hall.bg` + Q&A 节点 background 同步同一键（防背景闪切）
- [ ] 第二幕自由活动大厅角色入画图（见端详羊皮卷+添沙发若有所思）P1——改 `hall_free.bg`
- [ ] 圆桌桌面特写（照片位置留白）P1——照片查看演出
- [ ] 三张共和国事变照片（相机胶片质感）P2——同上
- [ ] 信使立绘（死灵傀儡，不露正脸）P2——**与饶形象设计同批讨论出图**（院长 2026-08-07 提出饶形象设计后续讨论），出图前无立绘兜底
- [ ] 出发·草原路 P2 / 幸谈判态差分 P2 可选

**剧情（白机继续）**：
- [ ] 第四幕「东边的刀」（海盗线）过稿（院长逐句）
- [ ] 选择③ C 选项=最优解分支情节（院长指示，占位在第四幕）

**饶形象设计（后续讨论）**：
- [ ] ⛰️ 饶的形象设计（信使死灵傀儡形象与其同批）——院长 2026-08-07 提出"后续我们讨论饶的形象设计"

**技术（后续）**：
- [ ] 照片查看演出实现（圆桌桌面+贴图+lightbox，图出后接线）
- [ ] 序章结束场景迁移探索态（pro_end 旧模式→hall，第二章规划时一并处理）
- [ ] 地图/空间机制扩展：世界级地点（R-022 travelTo/MapPanel 交互选点），数据结构已预留
- [ ] 图片体积优化（背景 2-8MB/张，无损压缩或高画质 WebP）——黑机出图时顺手做

**部署纪律备忘**：v3.0.0 已上线。下次部署先确认 `npx prisma migrate status`（防 drift），部署后验证数据库结构（BUG-58 教训）。

---

## 黑机本轮产出（2026-08-06 20:28~23:22）

> ⚠️ **9 个 commit 未 push**（GitHub SSH 超时，网络恢复后白机 `git pull` 即可获取）

### 入库清单（9 张图 + 代码接入 + 文档同步）

| 时间 | commit | 内容 |
|------|--------|------|
| 20:28 | `56e5346` | 谈判全景×3 入库（对峙/幸看玩家/见看玩家，四角色入画，REAL_BG_MAP 注册替换占位） |
| 20:58 | `c4c62b1` | 合同羊皮卷道具图入库 + 背包支持图片图标（emoji/图片并存兼容） |
| 21:01 | `379cef7` | 睿帝令道具图入库（暗银浮雕令牌+无脸半身人形徽记+黑曜石四角）+ emoji 替换为图片 |
| 21:35 | `84abb23` | 见·场景B端杯立绘入库（左手托杯垫右手捏杯耳+整体左转昂首挺胸，serious 定版差分） |
| 22:12 | `a275b78` | 恪基准立绘+帝国军装设计稿+草原村口/回程背景图入库，chapter1.js 接入恪立绘并替换背景占位 |
| 22:13 | `616f1ca` | 美术资产 README 更新 + 世界书 5.11 恪条目回填形象设计 |
| 22:41 | `c0a2001` | 第二幕叙事修正：v1~v6 改大厅立绘演出，见说"坐坐吧"后 v7 才切谈判全景（院长反馈过早放出） |
| 23:09 | `f919fc9` | 幸二次造访场景图入库（基于大厅生成，幸进门+禁卫剪影）+ v1 用造访图 v2 切大厅立绘 |
| 23:22 | `7f5c797` | sync-docs 文档同步（changelog/handoff/速查手册） |

**入库资产明细**（9 张图）：
1. 谈判全景×3：`negotiation_standoff` / `negotiation_xing_look` / `negotiation_dean_look`
2. 合同羊皮卷道具图 + 睿帝令道具图（背包物品图标从 emoji 升级为图片）
3. 见·端杯立绘 `public/visualnovel/portraits/dean/cup.png`
4. 帝国军装设计稿 `美术资产/帝国军装/imperial_uniform_v1_01.png`（二战德军参照，深灰蓝+金色，正面+背面，无人物纯服装）
5. 恪·基准立绘 `public/visualnovel/portraits/ke/normal.png`（35岁/板寸/深灰眼/帝国军装，rembg 抠图入库）
6. 草原村口 `public/visualnovel/bg/village_entrance.png` + 回程草原路 `public/visualnovel/bg/grassland_road.png`
7. 幸二次造访场景图 `public/visualnovel/bg/ch2_xing_arrival.png`

### 待办（交接白机）

**美术需求更新**（黑机已完成的划除）：
- [x] ~~谈判全景 ×3~~ ✅（56e5346）
- [x] ~~合同羊皮卷道具图~~ ✅（c4c62b1）
- [x] ~~睿帝令道具图~~ ✅（379cef7）
- [x] ~~恪形象设计+立绘~~ ✅（a275b78）
- [x] ~~草原村口背景~~ ✅（a275b78）
- [x] ~~见场景B端杯立绘~~ ✅（84abb23）
- [x] ~~幸二次造访场景图~~ ✅（f919fc9）
- [ ] ⛰️ downhill 出发·草原路（添带路）P2 —— 当前复用 grassland_morning，已有 grassland_road 可替代
- [ ] 幸谈判态/deal/warning 差分 → P2 可选（谈判段已用全景图，留待幸再访章节）
- [ ] 第三幕三张共和国事变画像 P2

**第一章台词（白机继续，黑机不动台词）**：
- [x] 第二幕台词全部定稿 ✅ + 代码落地 ✅
- [ ] ⚠️ 选择③ C选项=最优解，具体分支情节（院长指示）
- [ ] 第三幕/第四幕台词逐句过（白机）

**第二章伏笔（已埋设，待引用）**：
- [ ] 荣：战斗法师团领队，闪电战拿下教团城邦——玩家第二章去北边可碰面
- [ ] 汐/潮、饶暗线、宁、汪神正太、传送阵往返

**备注**：
- chenzijian 密码已重置为 czj136523510，写入 server/.env（LOCAL_ADMIN_PASSWORD）
- 后端服务已启动（3000端口）

---

## 白机本轮产出（2026-08-06 09:50）

### 第二幕代码落地完成（全章 229 节点）

**1. 骨架**（`chapter1.js`）：复盘段 → 判断选择（review_choice）→ 幸来访段（全景图模式）→ 帝桥回响 condition 四分支 → 核心选择②（A/B 树全分支/C/D，contract + contract_deal 变量）→ 收尾（添四句 condition）→ 衔接段（热点 ×3/班看月亮/房间）
**2. 演出（方案乙）**：谈判段三张全景图背景（占位，未出图前不列 REAL_BG_MAP）+ 立绘清空；复盘段立绘演出；收尾恢复立绘；走廊复用 CG-1
**3. 道具**：草原治属文书（grassland_deed）签约分支发放
**4. 文案**：新文件《第一章-第二幕-风从北方来.script.js》全量定稿台词
**5. 验证**：引擎层七路径重放 + 浏览器实测全通过（帝桥回响四分支/道具/热点/问见），build 通过

### 待办（交接黑机）—— ⚠️ 以下已由黑机 2026-08-06 23:20 完成，见上方黑机本轮产出节

**美术需求（黑机出图，按优先级）**：
- [x] ~~谈判全景 ×3~~ ✅（56e5346）
- [x] ~~合同羊皮卷道具图~~ ✅（c4c62b1）
- [x] ~~恪形象设计+立绘~~ ✅（a275b78）
- [x] ~~草原村口背景~~ ✅（a275b78）
- [x] ~~见场景B新立绘~~ ✅（84abb23）
- [ ] 出发·草原路（添带路）P2 —— 当前已有 grassland_road 可用
- [ ] 幸谈判态/deal/warning 差分 → P2 可选
- [ ] 第三幕三张共和国事变画像 P2

**第一章台词（白机继续，黑机不动台词）**：
- [x] 第二幕台词全部定稿 ✅ + 代码落地 ✅（本轮）
- [ ] ⚠️ 选择③ C选项=最优解，具体分支情节（院长指示）
- [ ] 第三幕/第四幕台词逐句过（白机）

**第二章伏笔（已埋设，待引用）**：
- [ ] 荣：战斗法师团领队，闪电战拿下教团城邦——玩家第二章去北边可碰面
- [ ] 汐/潮、饶暗线、宁、汪神正太（见下节）、传送阵往返（班"顶不住也不是不能送你回去"）

---

## 白机本轮产出（2026-08-06 04:30）

### 第二幕全部台词定稿 + 设定集回填 6 处

**1. 第二幕台词定稿（院长逐条过稿，commit 汇总）**
- 复盘段（含 #4.5 增补：教团城邦闪电战情报，"声音变得低沉"）
- 幸来访段前半（删 #9；幸改外交辞令风；#15.5 见"啧"；羊皮卷合同）
- 核心选择②全分支：A（接/合同工）+ B 全树（B-A-A-A 防卫协约 / B-A-A-B 底线试探 / B-A-B 庇护协约 / B-A-C 技术协约 / B-B 秩序与背书 / B-C 筹码与裂隙控制）+ C（见"虚空反噬"反击）+ D（拖三天）
- 收尾段（删"上次的答案"；添收尾四句 A靠山/B合作/C没包袱/D线人）
- 衔接段（旁白精简；见热点"问见"对话=学院只在乎裂隙；班看月亮=月亮还是那个月亮+星星不认得+传送阵伤神；"再聊两句"=打拼事业不急着回+顶不住送你回去）
- **待办**：第二幕写代码落地（骨架+文案）

**2. 设定集回填 6 处（commit `b86c94f`）**
- 5.1 学院立场 / 2.10 裂隙控制权+虚空反噬 / 2.3.1 契约（治外法权+草原治属文书）/ 3.1 双轨策略+荣（战斗法师团领队，第二章北边可遇）/ 2.11 传送阵可往返（见维持伤神）/ 2.9 教团城邦=闪电战目标

**3. 第一章剧本全面同步（commit `eb96828`）**
- 过时标注清理（状态行/开场已落地/去★待审）、班 b4 台词同步代码、见"等会"、设计说明旧引用修正、需求表完成状态

**4. 新需求记录（⛰️ uphill，方案未定）**
- 剧情脚本开发辅助模块（院长 08-06 提出，手写节点+文案分离工程量太大，先出方案禁止直接写代码）

### 待办（交接黑机）

**美术需求（黑机出图，按优先级）**：
- [ ] ⛰️ downhill **幸谈判态基准+deal+warning差分**（第二幕重头戏，选择②全分支已定稿，出图后接线）P1
- [ ] ⛰️ downhill **合同羊皮卷道具图**（有字+魔法印记，幸递出，选择②签字演出用）P1
- [ ] ⛰️ downhill **二楼走廊夜景（月光+班入画）**（衔接段班形象首秀）P1
- [ ] ⛰️ downhill 恪形象设计+立绘（第一幕已在用 speaker 无立绘）P1
- [ ] ⛰️ downhill 草原村口背景（官员身后站魔法师）P2
- [ ] ⛰️ downhill 出发·草原路（添带路）P2
- [ ] ⛰️ downhill 见场景B新立绘（端杯姿态基准+严肃差分）P1
- [ ] 第三幕三张共和国事变画像（飞机撞大楼/丘拦第二架/丘当选）P2

**第一章台词（白机继续，黑机不动台词）**：
- [x] 第二幕台词全部定稿 ✅（复盘段/幸来访/选择②全分支/收尾/衔接段）
- [ ] 第二幕写代码落地（骨架+文案，白机下一步）
- [ ] ⚠️ 选择③ C选项=最优解，具体分支情节（院长指示，黑机在逐幕打磨时处理——C 分支结构占位在第四幕）
- [ ] 第三幕/第四幕台词逐句过（白机）

**第二章伏笔（已埋设，待引用）**：
- [ ] 荣：战斗法师团领队，闪电战拿下教团城邦——玩家第二章去北边可碰面
- [ ] 汐/潮：帮助汐->获得汪神线索->汪神线入口（潮=汪神远征队成员）
- [ ] 饶暗线：解救汪神后彻底揭晓，未解救则慢慢揭晓
- [ ] 宁：丘觉察蛛丝马迹->身份安全张力
- [ ] 汪神正太(12岁)：解救后还政难题
- [ ] 传送阵往返：班"顶不住也不是不能送你回去"——漂泊者归途兑现途径

---

## 白机本轮产出（2026-08-06 03:00）

### 核心选择②选择树写回 + B 分支补充

- 院长定稿选择②选项与主干：A（接/给帝国当狗）/ B（有条件/不当走狗）/ C（不掺和世俗）/ D（考虑几天）
- **A 分支**（院长完整）：幸笑"觉悟让我钦佩"→ 见点头 → 签字 → 羊皮卷纹路发亮 → 契约已成 → 背包道具**草原治属文书**（睿帝颁布+魔法回路）
- **B 分支**（院长主干）：B-A（要承诺）→ 幸"哦？什么承诺？" → B-A-A/B-A-B/B-A-C 三条件；B-A-A 幸严肃（虚空教团控制城邦）→ 除非学院清剿 → 班插话 → B-A-A-A（接清除）/B-A-A-B（换条件）；B-A-B 幸三句（通行证=子民=庇护=军事庇护）
- **白机补充（★待院长审）**：B-A-A-A 后续（防卫协约：学院清剿/帝国情报后勤/不派兵不入城邦）、B-A-A-B 后续（武装二字拿掉+通行证缓行）、B-A-B 后续（庇护还是收编→驻军规则→塔楼百里禁地）、B-A-C 完整线（帝国堵不住裂隙→学院净化技术换晶石劳力）、B-B 后续（帝国要秩序与学院背书→汇合条件树）、B-C 后续（筹码：帝桥/通行证/商路→学院拿"学院"谈→汇合条件树）、C/D 分支回应（施压版）
- 收尾段标注双路线：签约路线（契约已成后）/未签约路线（C/D 后）
- **道具**：所有签约路线发放**草原治属文书**；关系基调按分支标注（合同工/防卫协约/底线试探/庇护协约/技术协约/独立/暧昧）

### 新需求记录（⛰️ uphill，院长 08-06 提出，方案未定）

- **剧情脚本开发辅助模块**：院长指出手写节点+文案分离工程量太大（选择②已显规模），需要开发一个写剧情脚本的模块辅助开发。白机后续调研方案（可视化编辑器/DSL/表格驱动等），**禁止直接写代码**，先出方案。

### 待办（交接黑机）

**美术需求（黑机出图，按优先级）**：
- [ ] ⛰️ downhill **合同羊皮卷道具图**（有字+周边魔法印记，第二幕幸递出，选择②签字演出用，院长 08-06 定）P1
- [ ] ⛰️ downhill 幸谈判态基准+deal+warning差分（第二幕重头戏，出图后按选择②分支接线）P1
- [ ] ⛰️ downhill 恪形象设计+立绘（第一幕已在用 speaker 无立绘，出图后接线）P1
- [ ] ⛰️ downhill 草原村口背景（村口+发文书台+排队人群，官员身后站魔法师）P2
- [ ] ⛰️ downhill 出发·草原路（添带路，第一幕出发过渡）P2
- [ ] ⛰️ downhill 见场景B新立绘（端杯姿态基准+严肃差分，幕间场景B+第二幕复盘用）P1
- [ ] 第三幕三张共和国事变画像（飞机撞大楼/丘拦第二架/丘当选，P2）

**第一章台词（白机继续，黑机不动台词）**：
- [ ] ⚠️ 第二幕台词过稿（院长逐句中）：复盘段+幸来访段前半 ✅ 过稿；**选择②选项主干 ✅ 已定，B 子分支/C/D 回应为白机补充 ★待院长审**；收尾段/衔接段（班看月亮）待院长
- [ ] ⚠️ 选择③ C选项=最优解，具体分支情节（院长指示）
- [ ] 第二幕过稿完成后 → 白机写代码落地（骨架+文案）
- [ ] 第三幕/第四幕台词逐句过（白机）

**后续章节伏笔（已埋设，待引用）**：
- [ ] 汐/潮：帮助汐->获得汪神线索->汪神线入口
- [ ] 饶暗线：解救汪神后彻底揭晓，未解救则慢慢揭晓
- [ ] 宁：丘觉察蛛丝马迹->身份安全张力
- [ ] 汪神正太(12岁)：解救后还政难题

---

## 白机本轮产出（2026-08-06 02:10）

### 第二幕台词院长过稿写回（复盘段+幸来访段前半）

- 院长逐句过稿，白机写回《第一章-三线剧变.md》第二幕：
  - **复盘段**：#1 旁白精简；判断选择改版（A没准是用来卡脖子的/B像在分化城邦/C我不好说）+ 三条分支回应重写（"毕竟帝国遥遥领先"/"城邦一盘散沙"/"睿帝不惮武力但这次太温和"）
  - **幸来访段前半**：删原#9；幸改外交辞令风（"桥边的事""向来怀柔""帝国爱好和平，但也从不惧怕战争"）；新增 #15.5 见"啧。"；#17 幸**递出羊皮卷合同**（新增美术需求 P1 道具图，需黑机出图）
  - **保留未动**：#8/#10/#19（通报/开场/禁卫旁白）、#16 帝桥回响四句（沿用 08-04 定稿，仅补"看向你"）
- **⚠️ 待院长继续推敲**：核心选择②（A接/B有条件/C不接/D拖）及分支回应（院长指示"谈判是比较长的过程"）、收尾段（#22-28）、衔接段（#29-38 热点+班看月亮）
- 代码未动（第二幕未定稿不落地），只改剧本+changelog

### 待办（交接黑机）

**美术需求（黑机出图，按优先级）**：
- [ ] ⛰️ downhill **合同羊皮卷道具图**（有字+周边魔法印记，第二幕幸递出，选择②演出用，院长 08-06 定）P1
- [ ] ⛰️ downhill 幸谈判态基准+deal+warning差分（第二幕重头戏，出图后按选择②分支接线）P1
- [ ] ⛰️ downhill 恪形象设计+立绘（第一幕已在用 speaker 无立绘，出图后接线）P1
- [ ] ⛰️ downhill 草原村口背景（村口+发文书台+排队人群，官员身后站魔法师）P2
- [ ] ⛰️ downhill 出发·草原路（添带路，第一幕出发过渡）P2
- [ ] ⛰️ downhill 见场景B新立绘（端杯姿态基准+严肃差分，幕间场景B+第二幕复盘用）P1
- [ ] 第三幕三张共和国事变画像（飞机撞大楼/丘拦第二架/丘当选，P2）

**第一章台词（白机继续，黑机不动台词）**：
- [ ] ⚠️ 第二幕台词过稿（院长逐句中）：复盘段+幸来访段前半 ✅ 已过稿写回；**选择②分支回应/收尾/衔接段（班看月亮）待院长推敲**
- [ ] ⚠️ 选择③ C选项=最优解，具体分支情节（院长指示）
- [ ] 第二幕过稿完成后 → 白机写代码落地（骨架+文案）
- [ ] 第三幕/第四幕台词逐句过（白机）

**后续章节伏笔（已埋设，待引用）**：
- [ ] 汐/潮：帮助汐->获得汪神线索->汪神线入口
- [ ] 饶暗线：解救汪神后彻底揭晓，未解救则慢慢揭晓
- [ ] 宁：丘觉察蛛丝马迹->身份安全张力
- [ ] 汪神正太(12岁)：解救后还政难题

---

## 白机本轮产出（2026-08-06 01:30）

### 第一幕·帝桥台词代码落地（49句+核心选择①三分支）

**1. 骨架落地**（`src/visualnovel/data/chapter1.js` 新增 54 节点）
- 出发过渡（3）→ 帝桥远景介绍 bridge_wide（3）→ 哨卡盘查 bridge_checkpoint（11）→ 核心选择①（3分支）→ 草原村口 village_gate（7）→ 回程（2）→ ch1_act1_end
- **幕间衔接**：ch1_hall_b14 next 改接 ch1_bridge_out_1，删除 ch1_interlude_end（end 节点）——旧存档停该节点由 resolveNodeSafe 容错回退
- **舞台跨场景重置**：出发节点用 `characters` 绝对声明（幕间班/见留在塔楼，第一幕全程只有添·左位）——实测发现 enter 增量会残留班立绘，改用绝对声明修复
- **选择①变量**：三分支入口 event 设 `bridge_choice: 'guarantee'|'help'|'watch'`，供第二幕幸来访回响

**2. 文案**（新文件 `scripts/第一章-第一幕-帝桥.script.js`）
- 49 句台词+3 选项，行首动作标注转注释，行中动作（"（摆手）下一个"）保留正文
- 恪/商贩/老人/老妇人/帝国官员全部无立绘（对话框+角色名，speaker 取色回退灰白）
- 玩家第一次开口说话（speaker: '玩家'，无立绘处理同临时角色）

**3. 背景**：远景 `bridge_wide` + 哨卡 `bridge_checkpoint`（黑机已出图）；草原村口新增 `bg/village_gate` BG_FALLBACK 占位（**不列 REAL_BG_MAP**，遵守 BUG-57 教训）

**4. 验证**（全部通过）
- 引擎层重放：四条分支从醒来→幕间→第一幕→end 无死链、无孤立文案、choice 对齐
- 浏览器实测（Playwright+dev）：四条路径（A有令牌/A无令牌/B/C）全走通到 ch1_act1_end，bridge_choice 变量正确，背景切换正确，舞台只有添，village_gate 占位渐变正常渲染，关键选择自动存档恢复正常
- `npm run build` 通过

**5. 美术资源缺口（待黑机出图，代码已用占位/无立绘兜底）**
- 草原村口背景（village_gate）P2：出图后从 BG_FALLBACK 移入 REAL_BG_MAP
- 恪形象设计+立绘 P1：出图后给恪节点加 portrait（节点已预留 speaker: '恪'）
- 出发·草原路背景 P2：暂用 grassland_morning，出图后替换 ch1_bridge_out_1~3

### 待办（交接黑机）

**美术需求（黑机出图，按优先级）**：
- [ ] ⛰️ downhill 恪形象设计+立绘（第一幕已在用 speaker 无立绘，出图后接线）P1
- [ ] ⛰️ downhill 草原村口背景（村口+发文书台+排队人群，官员身后站魔法师）P2
- [ ] ⛰️ downhill 出发·草原路（添带路，第一幕出发过渡）P2
- [ ] ⛰️ downhill 见场景B新立绘（端杯姿态基准+严肃差分，幕间场景B+第二幕复盘用）P1
- [ ] ⛰️ downhill 幸谈判态基准+deal+warning差分（第二幕重头戏）P1
- [ ] 班走廊月亮CG重做 CG-1 + 新增 CG-2（黑机优先项）→ ✅ 已定稿（CG-1纵深+CG-2中景）
- [ ] 第三幕三张共和国事变画像（飞机撞大楼/丘拦第二架/丘当选，P2）

**第一章台词（白机继续逐句过，黑机不动台词）**：
- [ ] ⚠️ 第二幕幸对话整体优化（院长指示，含幸谈判态立绘）
- [ ] ⚠️ 选择③ C选项=最优解，具体分支情节（院长指示）
- [x] 第一幕台词已定稿 → 白机写代码落地（骨架+文案）→ ✅ 本轮已完成
- [ ] 第二幕/第三幕/第四幕台词逐句过（白机）

**后续章节伏笔（已埋设，待引用）**：
- [ ] 汐/潮：帮助汐->获得汪神线索->汪神线入口
- [ ] 饶暗线：解救汪神后彻底揭晓，未解救则慢慢揭晓
- [ ] 宁：丘觉察蛛丝马迹->身份安全张力
- [ ] 汪神正太(12岁)：解救后还政难题

---

## 黑机本轮产出（2026-08-06 00:01）

### 丘脸模重做(换五官) + 游侠/总统双形态立绘入库（本轮）

**1. 丘脸模 v2（按小伙伴要求换五官）**
- 五官来源：`public/man/QiuXuming/0d5c58709647eb32cf3ce8b12655751f.jpg`（戴黑框眼镜的校服男生）
- 工艺：真人照片(锁五官) + 原 face_v1(锁服饰画风) 双参考 -> v2 换五官 -> v3 更坚毅硬朗
- 入库：`美术资产/丘/face_v2_01.png`（v3 即定版），原 `face_v1_01.png` 保留锁定
- 后续表情差分基于 face_v2

**2. 游侠形态立绘（用户选定 v3）**
- 林绿斗篷单侧披肩+深棕皮甲+箭袋红羽+长弓+卷轴筒+短刀+及膝绑带靴
- rembg 抠图 -> 832×1216 透明背景 -> `public/visualnovel/portraits/qiu/rogue.png`
- 原始带背景图留存：`美术资产/丘/qiu_rogue_v3_01.png`

**3. 总统形态立绘（v1 一次成）**
- 墨绿立领长礼服+箭羽胸针+箭羽钢笔+黑靴+左手腕露疤
- rembg 抠图 -> 832×1216 -> `public/visualnovel/portraits/qiu/president.png`
- 原始带背景图留存：`美术资产/丘/qiu_president_v1_01.png`

**4. 文档同步**
- `丘-形象设计.md` 新增「八、美术资产登记」节

**⚠️ 待用户确认**：游侠立绘 v1 出现手臂纹身（设计是箭伤疤），v2-v4 迭代中视觉模型描述雷同不可信，无法确认 v3 是否仍有纹身。若用户实际查看 rogue.png 发现纹身仍在，需局部重绘修正（不要整张重出）。

**踩坑**：①重做有问题的特征时，不能用含该特征的旧图做参考图（会锁定污染）；②提示词不要出现要去除的特征词（即使"非纹身"也会反向激活）；③视觉模型对相似图的描述会模板化缓存，四张不同图描述几乎一字不差，不可全信。

---

## 白机本轮产出（2026-08-05 11:30）

### 第一章引擎集成打通 + 存档恢复修复 + 幕间台词定稿 + 帝桥设定落档（本轮）

**1. 第一章引擎集成打通（3处断裂全修复，BUG）**
- 黑机写了第一章剧本数据（chapter1.js+script）但引擎集成 3 处断裂：序章点"上楼睡觉"→ 直接"章节完成"进不了第一章
- 修复：①`CHAPTER_LOADERS` 注册 chapter1（骨架+文案合并）；②`executeEvent` 支持 `unlockChapter` 字段；③`goToNode` 改 async，event 节点解锁新章节后 `loadChapter` + 跳转起始节点；④`getStartNode` 传参 Map 转数组（踩坑记录："getStartNode 传 Map 而非数组"复现）
- 验证：Playwright store 层实测 `goToNode('pro_to_chapter1')` → chapter=chapter1 / node=ch1_wake_1 / unlocked 含 chapter1 / isEnded=false / console 0 error

**2. 存档恢复修复（BUG）**
- 现象（院长反馈）：进入德塔自动恢复存档位置正确，但场景/立绘不跟随，下一次出现才出现
- 根因：①initGame 恢复时 `stage.value=[]` 写死清空（注释说"后端不存stage"但 getSnapshot 实际存了），延续节点无 enter 无法重建 → 立绘丢失；②initGame 固定加载 prologue，跨章节存档（chapter1）节点查不到 → 背景/文本空
- 修复：initGame 与 loadFromSlot 一致从 `data.stage` 恢复；`data.chapter` 非 prologue 时先 `loadChapter(data.chapter)`
- 验证：存档 ch1_work_a1（stage=[tian,ban] bg=workbench）→ 重新 initGame → stage/bg 全部立即恢复

**3. 班角色配置补充**
- `SPEAKER_TO_ID` 加 `'班'→ban`；`CHAR_COLORS` 加 `ban: '#8A9A5B'`（苔绿）

**4. 幕间台词定稿（院长逐句过 4 处）**
- 删 ch1_wake_2（房间介绍重复）；班 b4 → "添哥的小巧思连见哥都怕"；b10 → "……"；b11 "明天"→"等会"；b14 → "草原的风卷着草屑…" + 切新背景 `bg/grassland_morning`（清晨草原无人版，**待黑机出图**，当前 CSS 渐变占位）
- 背景图：tower_workbench.png 黑机漏复制到 public，白机补齐入库

**5. 第一幕台词定稿（院长逐句过，49句带编号已写入大纲）**
- 基于帝桥新设定重构（传送阵平台桥+通行证新政）：5/6 添介绍传送桥（跟地铁似的）、8/10 文书→通行证、24→"你最好能对后果负责"、27→"帝国为什么要给学院面子？"、40→"没事，反正我们也管不着"、43 通行证身份标识警告、50 删除
- 台词定稿存放：`第一章-三线剧变.md` 第一幕台词剧本节（编号 1-49）

**6. 帝桥设定落档（院长 2026-08-05 补充，双份记录）**
- 设定集 v1.4 §2.3.1「帝桥（睿帝得意之作）」：①魔法回路传送平台/A.V.115建成 ②睿河天险历史 ③控制力 ④便利面 ⑤通行证新政（良民证：一人一证魔法关联民本/基层发放效率低/分批发放城邦抵触）⑥学院定位 ⑦法刺盲区
- 第一章大纲新增「〇·五、帝桥设定」独立节（引用权威版）

**7. 美术需求表更新（给黑机）**
- 见场景B新立绘（端杯姿态基准+严肃差分，可复用第二幕复盘）P1
- 清晨草原无人版背景图（tower_outdoor_mist 去人物）P1
- 第一幕出发·草原路（添带路）P2
- 帝桥哨卡场景（哨卡+大河右→左+对岸望不到头+大桥横跨）P1
- 草原村口：官员身后站一位魔法师 P2

### 待办（交接黑机）→ ⚠️ 已被白机本轮接管，最新待办见上方「白机本轮产出（2026-08-06 01:30）」节内待办清单

**旧清单状态更新**：帝桥哨卡场景 ✅（bridge_checkpoint/wide/close 已入库）、清晨草原无人版 ✅（grassland_morning 已入库）、班走廊月亮CG ✅（CG-1/CG-2 已定稿）、第一幕台词落地 ✅（本轮完成）；恪立绘/草原村口/出发草原路仍在待办

---


### 背景图一致性重做 + 班走廊月亮CG + UI改进 + 两BUG修复 + 美术资产归档（本轮）

**1. 第一章背景图生成入库（3张）**
- `tower_room_night`：序章睡觉过渡（二楼房间·夜晚）
- `tower_room_morning`：第一章开场（二楼房间·晨光）
- `tower_corridor_morning`：第一章推门出走廊（二楼走廊·晨光）
- 用 Python 公共模块 `call_seedream()` 生成，画风参考 `tower_workbench`

**2. 场景一致性重做（2张）**
- `tower_room_night` v2：基于 `tower_room_morning` 作参考图生成，保证同一房间布局（同张床/同扇窗/同个凳子+煤油灯），只变光线为夜晚月光
- `tower_corridor_night` v2：基于 `tower_corridor_morning` 作参考图生成，保证同一走廊布局（拱门木门/楼梯），只变光线为冷月光
- **场景一致性原则**：同一地点日/夜版，以白天版为参考图生成夜晚版，锁布局结构仅改光线

**3. 班走廊看月亮 CG（v1，⚠️ 待重做）**
- `ban_corridor_moon.png`：走廊夜景+班脸模双参考生成，带人物的特殊背景图
- **v1 问题**（院长反馈）：班站在走廊中间（应坐走廊尽头窗边床沿），楼梯也消失了
- **重做要求**已记录到 `班-形象设计.md` CG场景需求章节：
  - CG-1 重做：班坐在走廊尽头窗边床沿看月亮，保留楼梯结构
  - CG-2 待生成：近景特写，班坐椅子靠床边，眼神忧郁，月光洒脸

**4. UI 改进**
- QuickMenu 从右上角横排 → 左上角竖排（原神/永恒世界风格，半透明毛玻璃+图标+文字）
- 全窗口点击推进对话：game-stage 层监听 click，菜单/面板/选项/热点/输入框用 `data-no-advance` 排除

**5. 帝桥地图坐标修正**
- (42%,32%) → (25%,48%)，对应像素 (450,450) / 底图 (1800×930)

**6. BUG 修复**
- **BUG-55 刷新失登录**：路由守卫 `beforeEach` 改 async，`isLoggedIn && !loaded` 时先 `await fetchMe()` 恢复 user 对象。根因：auth.user 只在 login 时赋值，刷新后 token 恢复但 user 永远 null
- **BUG-56 背景图未显示**：Vite HMR 缓存旧版 BackgroundLayer.vue 的 REAL_BG_MAP，新增映射未生效回退 CSS 渐变。修改文件触发完整重编译修复
- **BUG-54 Seedream API 400**（上轮记录）：未读已有公共模块就擅自用 Node 重写，改用 Python `call_seedream()`

**7. 美术资产归档**
- 7张游戏在用背景图归档到 `美术资产/背景图/`（room_night/morning, corridor_night/morning, workbench, hall_prologue, ban_corridor_moon）
- 班立绘抠图透明版同步到 `美术资产/班/`（full_normal_v1_01 + expr_serious_v1_01）
- README 背景图清单更新至13张 + 新增「场景一致性原则」说明

**8. AGENTS.md 新增 AI 行为准则第5条**
- 先查文档再动手（BUG-54 教训）

### git 提交推送
- 4个commit：`2f80078`(背景图+UI+坐标+AGENTS) / `c4b8b45`(刷新失登录修复) / `9a7e256`(HMR缓存修复) / `7a1e518`(背景图重做+CG+归档)
- 全部已推送 GitHub

### 待办（交接白机）→ ⚠️ 已被白机本轮接管，最新待办见上方「待办（交接黑机）」

**黑机上轮遗留（2026-08-05 00:25 版）已合并整理**：
- 班CG重做（CG-1/CG-2）、第一章台词打磨、恪/汐形象设计、第三幕画像 → 全部并入上方「美术需求（黑机出图）」和「第一章台词（白机继续）」清单
- 第二幕幸对话整体优化 / 选择③ C=最优解 → 保留在黑机待办（院长指示，待黑机处理）
- 宁/汪神正太伏笔 → 并入上方「后续章节伏笔」清单

---

## 白机上轮产出（2026-08-03 23:22）

### 第一章编剧评审 + 美术资产清理 + 班形象/脸模 + SKILL流程补充（本轮）

**1. 酒馆「德塔编剧」第一章大纲 v1.2 评审**
- 启动酒馆（本地 8000），新聊天上下文，编剧对第一章大纲 5 维度评审通过
- 5 条改进建议（**待院长裁决**，详见 `prd/01-需求文档/04-德塔/02-设计/编剧AI产出-20260802.md`）：
  - ① **合同选择前缺北方局势模糊感知**：第二幕加添嘀咕"北边信好久没来"，让玩家选择时有模糊背景
  - ② **商人丙信息太完整**：拆碎到三个商人（各说一半），由添补全说出"丘"这个人名落地
  - ③ **帝桥选择①B/C 无跨幕回响**：第二幕幸来访时按帝桥选择给带钩子回应（选择B→幸暗示帝国已知道；选择C→幸提醒别太张扬）
  - ④ **村民"屏障"术语化**：改生活化表达"海上的墙矮了/漏了"，避免NPC用设定术语
  - ⑤ **海盗线选择③四选项后果未锚定**：改在"关系/资产"维度做差异（找帝国船→得罪海盗；找海盗谈→欠人情；两边都查→时间成本）

**2. 美术资产清理（实证驱动）**
- md5 校验发现美术资产立绘全部是旧版（jimp抠图黑背景），public/ 才是 rembg 线上版，README 声称"两边一致"但实际不一致
- 旧版 10 张（院长4+幸5+添1）归档至 `.ai/_backup_portraits/美术资产旧版_20260803/`（已 gitignore）
- 用 public/ 最新版同步替换，md5 全部一致（文件略变大是 rembg 细节更丰富，正常）
- 杰/荣脸模尺寸偏大（7.6MB/6.9MB），院长指示保留原样

**3. image-gen SKILL.md 补充生成分层流程**
- 新增「纪律 1.5：生成分层流程」——形象设计→脸模→立绘三层递进（原 SKILL 只写到出脸模，缺脸模→立绘这一步）
- 强制工作流改为两阶段（出脸模/出立绘），补 rembg抠图/服饰院长过目/带背景原图留存等红线
- 辨识度矩阵新增班条目 + 黑发系四人（见/添/丘/班）撞色提示

**4. 班形象设计定稿+脸模入库**
- 新建 `美术资产/班/班-形象设计.md`：
  - 核心：坚毅果敢/对内温柔调皮对外冷酷狠辣/中分黑发黑瞳/背部虚空爪痕（兽型虚空生物所伤，隐隐作痛）/磨牙石吊坠信物（救下已失踪队友遗物）
  - 两套服装：日常装「送葬人」（立领黑夹克+灰黑内衬+深黑工装裤，全身黑灰）+ 外出装「牛仔」（暗棕长摆风衣+宽檐毡帽+腰挂左轮+短匕，西部赏金猎人感）
  - 出图顺序：先脸模（已完成）→ 日常装基准立绘+表情差分 → 外出装基准立绘
- 脸模 `face_v1_01.png` 入库（Seedream Pro 5.0，v1_02版选中，嘴角玩世不恭smirk+锐利眼神+中分黑发）
  - v1_01 弃用（太像睿，项链+高领衬衫被参考图带过来）
  - v1_02 选中（换添脸模做画风参考，强化 smirk 负面词排除项链）
- 踩坑：Seedream API `image` 参数需 data URI 格式（`data:image/jpeg;base64,...`）而非裸 base64（BUG-52）

**5. git 提交推送**
- commit `37b5f4d`（17文件：班形象+脸模、10张立绘同步、SKILL.md、changelog、bug-log、handoff、README）
- 已推送 GitHub（走 ssh.github.com:443 通道）

### 待办（交接白机后续）

**第一章（优先）**：
- [ ] 院长裁决编剧 5 条改进建议 → 逐幕打磨台词 → 产出第一章完整剧本
- [ ] 恪（帝国军官）/汐（海盗头子）形象设计（第一章另两个新 NPC）

**班立绘（黑机出图，白机不碰）**：
- [ ] 班日常装「送葬人」基准立绘 full + 表情差分（grin/serious，第一章用）→ 基于已入库脸模
- [ ] 班外出装「牛仔」基准立绘 full（后续章节用，不急）
- [ ] 班立绘 rembg 抠图 → 入库 public/visualnovel/portraits/ban/

**设定回填**：
- [ ] 班世界书 5.10 条目回填（"形象待补"→定稿摘要：两套服装/信物/伤疤/气质）
- [ ] 班加入创作速查手册 NPC 速查表

---

## 白机上轮产出（2026-08-03 12:04）

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
- 新NPC：恪（帝国军官）、汐（海盗头子）
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
1. **先 `git pull origin master`** -- 白机本轮推了 6 个 commit（53ab43f / dabbff6 / fef6e7f / 811410d / 8b6e9ef + 其他窗口的 73531c2）
2. **代码无遗留改动** -- 工作区干净，唯一未入库的是 `.zcode/skills/hallmark/`（设计审查工具技能，非项目产物）
3. **社区站视觉改造已完成** -- 如需微调颜色/字体，改 `src/styles/variables.css` 里的 token 即可全站生效，不要再逐页改硬编码
4. **TopBar 修复教训** -- 应用内导航栏用 `space-between` 是标准实践，别为了反 AI 模板再动它（BUG-51）
5. **其他窗口产出**（73531c2，非本会话）-- 第一章大纲 v1.2（开场醒来+幕间衔接+地理修正+第二章框架），已合入 master，handoff 第 50 行起的黑机产出记录是上一轮的，本次未更新

---

## 环境状态

| 服务 | 地址 | 状态 |
|------|------|:---:|
| 前端 | localhost:4396 | ❌ 未运行（`npm run dev` 启动） |
| API后端 | localhost:3000 | ❌ 未运行（`cd server && npm run dev` 启动） |
| 游戏服务器 | localhost:2567 | ❌ 未运行（`cd game-server && node src/index.js`） |
| ComfyUI | localhost:8188 | ❌ 未运行（黑机专属，白机未安装） |
| 豆包Seedream API | ark.cn-beijing.volces.com | ✅ 可用（复用ARK_API_KEY） |
| 生产环境 | https://www.nandexueyuan.top | ✅ v3.0.2 线上 + HTTPS 已生效（Let's Encrypt 证书+强制跳转） |

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
| 线上 HTTPS/443 未配置 | ✅ 已解决(2026-08-09) | 此前从未配 SSL（部署文档仅规划）。certbot --nginx 一键申请 Let's Encrypt 证书+自动配 443 server block+强制跳转。证书 90 天自动续签(certbot.timer)。详见本轮产出节 |
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
| 背景图目录不统一导致404 | 🔴 本轮新踩 | 序章背景图在 `public/visualnovel/bg/`，新增背景图误放到 `public/visualnovel/backgrounds/`。BackgroundLayer 的 getBgStyle 拼 URL 为 `/visualnovel/${fileKey}.png`，fileKey 含 `bg/` 前缀，实际路径应为 `public/visualnovel/bg/`。**新背景图必须放到 `bg/` 目录，不是 `backgrounds/`** |
| getStartNode 传 Map 而非数组 | 🔴 本轮新踩 | store 的 unlockChapter 逻辑调用 `getStartNode(currentIndex.value)`，但 currentIndex 是 Map（无 length 属性），导致取不到起始节点。改用 `currentIndex.value.keys().next().value` 直接取第一个 key |
| unlockChapter 重复点击跳过加载 | 🔴 本轮新踩 | event 节点 unlockChapter 条件判断 `!unlockedChapters.includes()` 在第二次触发时跳过整个章节加载。改为始终执行 loadChapter，仅首次解锁时 push |

---

## 近期提交记录

| commit | 说明 |
|--------|------|
| `8b6e9ef` | [docs] 下机交接-更新handoff待办/环境状态/黑机接手注意 |
| `811410d` | [docs] sync-docs同步四文档-代码目录changelog+bug-log51+德塔changelog+handoff commit号 |
| `fef6e7f` | [chore] 发版 v2.4.0 社区站视觉体系统一 |
| `dabbff6` | [docs] 同步handoff-白机社区站视觉体系统一+根目录清理+部署上线 |
| `53ab43f` | [refactor] 社区站视觉体系统一-霞鹜文楷+全站莫兰迪token化+首页重构 |
| `73531c2` | [docs] 第一章大纲v1.2-开场醒来+幕间衔接+第四幕地理修正+第二章框架（**其他窗口产出**） |
| `84dfbc7` | [chore] 清除男德通NPC设定-现行文档全部改添+旧2D文档标废弃 |
| `1d2974b` | [docs] 新增编剧世界书v1.0+第一章三线剧变大纲v1.1（含幕间舞台设计） |
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
