# 诺诺动作管线 PoC 方案

> 立项：2026-10-03 黑机，院长批准规划（"可以，开始规划然后输出文档"）。
> 前置依据：[Mixamo到VRM动作管线调研](../00-调研/01-技术/Mixamo到VRM动作管线调研.md)（三路线对比）+ [诺诺动作库规划](诺诺动作库规划.md)（动作清单草案）。
> 模式：沿用《诺诺Web渲染管线PoC方案》——验收标准先行、方案先行，院长复验驱动迭代。
> 范围：**只做动作管线 PoC**（动画能播、不散架、与现有机制兼容）；动作库资产化（路线 A 沉淀）在 PoC 验收后启动；直播间集成仍按 10-01 裁决推后。

---

## 一、目标与验收标准（7 项）

| # | 验收项 | 标准 |
|---|---|---|
| 1 | 上屏 | `?anim=<fbx地址>` 加载 Mixamo 动画并驱动诺诺播放 |
| 2 | 骨架健康 | 播放中肢体无 90° 异常翻转、无散架（腿部 90° 坑的验收口径） |
| 3 | SpringBone 共存 | 动画播放中头发/裙摆物理持续摆动（vrm.update 次序正确） |
| 4 | 表情共存 | 动画播放中表情按钮可用（morph 通道与骨骼动画独立叠加） |
| 5 | 呼吸让位 | 动画激活时 PoC 呼吸脚本自动停用（无叠加抖动），动画停止恢复呼吸 |
| 6 | 多动作切换 | ≥2 个动作可切换（HUD 按钮或 ?anim 参数），切换无残姿 |
| 7 | 性能 | RTX 4070 黑机 FPS ≥ 60（Stats 面板） |

## 二、技术路线（定稿）

**PoC 走路线 C（浏览器运行时直载 Mixamo FBX），动作库定版走路线 A（Blender 重定向→.vrma 外挂）**，理由与证据见调研文档。一句话版：

- **C 的价值**：零 Blender 中转——Mixamo 下载的 FBX 直接喂浏览器（FBXLoader + three-vrm 官方示例 `loadMixamoAnimation` 辅助函数），验收链路最短，适合快速试大量动作筛选风格
- **A 的定位**：筛选定版的动作在 Blender 重定向导出 `.vrma` 入资产库（与模型分离、可版本管理、桌面端复用），属于 PoC 验收后的第二阶段

## 三、实操步骤清单

### Step 1：Mixamo 测试资产获取（院长浏览器操作，约 10 分钟）

1. mixamo.com 用 Adobe 账号登录（**账号可用性本身是 Step 0 硬前置**）
2. 上传角色可跳过（只下动画：选动画 → Download）
3. 下载规格（四项都照做）：
   - Format: **FBX Binary(.fbx)**
   - Pose: **T-pose**（动画文件选 Without Skin 时此项无 Body）
   - Skin: **Without Skin**（纯动画，文件小）
   - Frames per Second: **30**；走/跑类勾 **In Place**
4. 候选动画（P0 验收集，按草案默认执行、验收时院长可换）：`Waving`、`Agree`、`Thinking`（再备一个 `Disagree`）
5. 落盘：`prd/01-需求文档/05-美术设计/诺诺/motions/mixamo_raw/`（.gitignore 候选——Mixamo 动画再配布条款需核对，先本地不入库；定版 .vrma 才入库）

⚖️ 注：P0 动作选取/wave 幅度/命名等裁决项见《诺诺动作库规划》第五节——**不阻塞本 PoC**（管线验证用任意动画成立即可）。

### Step 2：nono-poc 代码预埋（AI 执行）✅ 已完成（2026-10-04 黑机，盲测通过）

1. `?anim=` 调试参数：`builtin`=内置"点头"测试 clip（不依赖 Mixamo 资产，先行验证管线）；逗号分隔 FBX 地址列表=逐个加载生成按钮；`stop`=仅显示停动作按钮；不带参数=旧行为完全不变
2. `FBXLoader` 引入（`three/addons/loaders/FBXLoader.js`，three 自带 fflate 依赖，**零新增 npm 包**）
3. 官方示例 `loadMixamoAnimation` + `mixamoVRMRigMap` 已移植入库：`nono-poc/src/mixamoAnimation.js`（抓自 pixiv/three-vrm dev 分支 humanoidAnimation 示例，仅加 hips 节点缺失防御；GitHub 网络靠 API+raw 绕过，见调研文档）
4. AnimationMixer 生命周期：单 mixer 复用，切动作 `stopAllAction()` 防残姿；停止时 `resetNormalizedPose()` + 恢复直播间静息臂姿；动画播放中呼吸强制 0（验收 5）
5. HUD 新增"动作"按钮组（index.html `#animHud` 容器动态生成）；模型切换按钮改为保留全部 URL 参数（此前会丢 anim/breath/blink）
6. **盲测结果（builtin 路径全过，2026-10-04）**：动作播放（head 位移实测）/呼吸让位（chest 恒 0）/表情共存（angry=1 且动画不断）/眨眼共存（实测 max 0.67——注意遮挡节流下 rAF≈1fps，短窗采样会假阴性，见 bug-log BUG-087）/停止恢复（head 冻结+呼吸复活）/旧参数回归（无 anim 行为不变）。验收 1/4/5/6 的 builtin 部分通过；2/3（骨架健康/SpringBone）与真实 FBX 相关，待 Step 1 资产到位后验收

### Step 3：已知坑对策（按调研文档落实战术）

| 坑 | 对策 |
|---|---|
| 腿部 90° 翻转（Issue #1176） | Mixamo 骨骼朝向与 VRM 不同是根因；loadMixamoAnimation 内含补偿，若仍复现→对照官方 example 最新版逐行 diff 补丁 |
| T-pose/A-pose 首帧错位 | 动画首帧对齐：播放前把 VRM 摆到动画首帧姿势再起播（社区修复指南同思路） |
| FBX 坐标系（cm/m、Z-up） | loadMixamoAnimation 已处理 scale/rotation；若整体大小/朝向异常先查这里 |
| 复杂动作散架（Issue #1523） | PoC 只用简单上半身动作；复杂动作验收失败不追（留路线 A 在 Blender 里处理） |

### Step 4：验收矩阵（院长复验）

- 动作 × {正面机位、侧面机位} × {默认脸、生气、低落}
- 每格看：骨架健康/SpringBone/表情/呼吸让位/切换干净
- 回归项：不动动画时呼吸眨眼照旧（?anim 不带=完全旧行为）

### Step 5：.vrma 沉淀（PoC 验收后启动，本文只立框架）

筛选定版动作 → Blender VRM Add-on 重定向导出 `.vrma` → `诺诺/motions/` 入库 + 美术资产 README 登记 → main.js 支持 .vrma 直接加载（VRMAnimationLoaderPlugin 已在依赖内）→ 桌面端离线版复用。

## 四、与现有代码的整合点（main.js 改动面预估）

| 现有机制 | 动画播放时 | 冲突风险 |
|---|---|---|
| 呼吸（chest.rotation.x） | 强制停用 | 高——叠加即抖动，必须处理 |
| 眨眼（blink morph） | 保留 | 无（morph 通道独立） |
| 表情（happy/angry/…） | 保留 | 无；shy 类"动作+表情组合"是动作库阶段的事 |
| lookAt 视线跟随 | 保留 | 低——动画一般不含眼睛数据；若含以动画为准 |
| driveEyes（v6 封存版） | 不处理 | 仅在 v5/v7 验证；v6 若复活再评估 |
| 眉毛压刘海画法（renderOrder） | 无关 | 无 |

## 五、风险清单

1. **Mixamo 账号不可用/下载被墙** → 硬前置失败；备选：社区 .vrma 共享库、其他免费动捕源（quaternius 等）——先记录不展开，届时院长裁决
2. **官方示例与本地版本偏差** → 同代版本（3.5.5）风险低；真踩坑以官方 example 最新源码为准逐行对齐
3. **Mixamo 动画再配布条款** → 原始 FBX 暂不入库（本地资产），入库的只有自产 .vrma——规避版权风险
4. **今晚 GitHub 网络不稳** → Step 2 取示例源码时可能要重试/走代理（proxy-access 技能备选）

## 六、产出物清单

- 代码：main.js `?anim=` 支持 + 动作按钮组（Step 2）
- 资产：`motions/mixamo_raw/` 本地测试 FBX（不入库）→ 定版 `.vrma`（二期入库）
- 文档：本方案 + 调研文档 + 动作库规划（已落档）；验收后 changelog/bug-log 登记
