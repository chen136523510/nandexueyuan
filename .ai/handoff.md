# AI 交接单

> 最后更新：2026-07-30（黑机：序章验收+存档系统增强+UI隐藏恢复+Seedream调研+院长形象设计）
> 所在设备：黑机（RTX 4070 主力机）
> 稳定版本：`0ec5425`（master）
> **当前阶段**：M-G1 引擎核心 PoC ✅ 完成 + 序章四幕全量落地 ✅ 完成 + 存档系统增强 ✅ 完成 + Seedream调研 ✅ 完成 + 院长"见"形象设计v1 ✅ 完成

---

## 黑机本轮产出（2026-07-30）

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

## 待办（交接给白机）

### ⛰️ downhill（方案已定，可直接执行）

1. **院长"见"形象迭代出图** - v1-03方向正确但可优化（用Seedream继续改：换角度/换表情/换动作）
2. **院长"见"形象设计文档确认** - 院长确认后可正式定稿
3. **序章立绘注入引擎** - 法刺幸/荣/添/沐阳精选图需抠图后入 `public/visualnovel/portraits/`

### ⛰️ uphill（探索中，方案未定）

4. **M-G2 序章完整 + 手机/消息系统** - 手机消息系统可行性需调研（Eternum式）
5. **院长"见"的序章台词** - 序章第一幕院长台词目前是占位，需用编剧角色卡打磨

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
