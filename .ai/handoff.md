# AI 交接单

> 最后更新：2026-07-30 16:58（白机：补充火山引擎豆包Seedream API调研+选型修订为首选豆包API）
> 所在设备：白机（荣耀便携本）
> 稳定版本：`8abd416`（master）
> **当前阶段**：M-G1 引擎核心 PoC ✅ 完成 + 序章四幕全量落地 ✅ 完成 + 存档系统增强 ✅ 完成 + Seedream调研 ✅ 完成 + 院长"见"形象设计v1 ✅ 完成 + Gemini生图能力调研 ✅ 完成 + 序章文案优化+缓几天分支 ✅ 完成 + 存档管理统一入口 ✅ 完成

---

## 白机本轮产出（2026-07-30 16:12）

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

1. **院长"见"形象迭代出图** - v1-03方向正确但可优化（用Seedream继续改：换角度/换表情/换动作）
2. **院长"见"形象设计文档确认** - 院长确认后可正式定稿
3. **序章立绘注入引擎** - 法刺幸/荣/添/沐阳精选图需抠图后入 `public/visualnovel/portraits/`
4. **生图 API 验证期实测**（引入 go/no-go 门槛，首选豆包 Seedream API）- 首选 `doubao-seedream-5-0-pro-260628`（0.3元/张、国内直连、复用火山Key）：①查API文档确认参考图机制(是否分类) ②用院长立绘做图生图验证角色一致性 ③奇幻战斗prompt审核严格度。未达标降级Gemini 3 Pro Image(参考图分类更强)。详见 `prd/01-需求文档/00-调研/gemini-nano-banana-image-generation.md`

### ⛰️ uphill（探索中，方案未定）

5. **M-G2 序章完整 + 手机/消息系统** - 手机消息系统可行性需调研（Eternum式）
6. **滚轮回滚功能**（已移除，未来可复用）- 白机试做了状态快照回滚（advance/selectChoice前压栈+rollback/forward），Playwright验证逻辑正确，但用户反馈实际不可用已移除。根因是 `.dialogue-area` CSS只占底部区域导致鼠标不在对话框上时事件不触发。代码保留在git历史 commit `6a573f4`，未来若重做可考虑用快捷键（PageUp/PageDown）替代滚轮

---

## 环境状态

| 服务 | 地址 | 状态 |
|------|------|:---:|
| 前端 | localhost:4396 | ✅ 运行中 |
| API后端 | localhost:3000 | ✅ 运行中 |
| ComfyUI | localhost:8188 | ✅ 可用（黑机） |
| Seedream | seedream.pro | ✅ 可用（Google登录） |

### Seedream 账号
- 登录方式：Google
- 邮箱：zijianchen064@gmail.com
- 密码：czj136523510.

### DB 注意
- 白机 `db push` 未成功导致缺表（BUG-43），黑机已补建
- 白机接手后建议执行 `cd server && npx prisma db push` 确认schema同步

---

## 德塔踩坑记录

| 坑 | 状态 | 说明 |
|---|---|---|
| Colyseus 0.16.0 锁定 | ✅ 已知 | 0.15不兼容schema3.x，0.17下载超时 |
| Nginx proxy_pass 尾部斜杠 | ✅ 已知 | `proxy_pass http://127.0.0.1:2567/;` 必须有斜杠 |
| JWT密钥运行时读取 | ✅ 已知 | 用 `function getSecret()` 不用ESM import |
| Phaser场景切换onUnmounted | ✅ 已知 | 用 `onUnmounted -> destroyGame()` |
| Prisma db push失败不建表 | ⚠️ 新增 | BUG-43：FTS表报错导致push失败，新表不会创建。换机后必须检查 |
| Seedream纯文生图偏中国风 | ⚠️ 新增 | 必须上传同画风参考图才能保持西方奇幻油画风格 |

---

## 近期提交记录

| commit | 说明 |
|--------|------|
| `0ec5425` | [设定] 院长真名定为'见' |
| `cd599b4` | [文档] Seedream操作指南+院长形象设计v1+出图3张 |
| `7955079` | [feat] 存档系统增强+UI隐藏恢复按钮 |
| `354080a` | [fix] 封面文案A.V.115改A.V.118 |
| `b233868` | [feat] 序章prologue.js全量重写 |
