# 诺诺虚拟直播间 Web 3D 渲染可行性调研

> 调研时间：2026-09-23 16:40（白机）
> 调研人：AI（白机）
> 背景：男德学院（Vue3 + Express + Colyseus game-server，约 20 人社区）拟做"诺诺虚拟直播间"：网页内 3D 美少女在 3D 房间（椅子/书桌），弹幕触发回复（口型+动作），30 分钟无互动打瞌睡/看书，所有观看者共享同一只诺诺（服务器权威状态同步）。Web 形态优先，桌面 Unity 为备选。本调研核实渲染层与场景层真实可行性。
> 关联文档：`pm/需求池.md`、`.ai/handoff.md`

---

## 一、核心结论（先看这个）

1. **Web 3D 技术栈完全成熟可用**：three.js r186 + @pixiv/three-vrm 3.5.5（2026-07 仍活跃发版）加载 VRM、播 .vrma 动画、驱动表情（含 5 个音素 viseme）全是现成 API；WebGL2 浏览器支持率 96.44%，服务器零渲染负载是架构事实。
2. **审美天花板要认清**：VRM 默认 MToon 观感 ≈ VRChat/VRoid 级"干净卡通"，不是原神级；原神/NIKKE/蔚蓝档案均为 Unity + 大量定制管线与手工资产，社区复刻项目存在（700+ star 级）但都在 Unity 内。业界连 NIKKE 的角色特写都主要用 Live2D 立绘。
3. **无任何产品级"弹幕→AI→3D 动作"现成开源**，但全部零件齐备：Colyseus 状态同步（本项目已有）、Amica/TalkingHead（web 3D AI 头像全链路开源参照）、wawa-lipsync/uLipSync（口型）。链路需自研拼装。
4. **AI 主播 3D 化已有先例**：Neuro-sama 2025-11 起使用 3D 模型（VRChat 演出），B站 112 万粉——"3D + AI 主播"受众接受度已被验证。
5. **评级：Web 3D 支撑诺诺直播间 = 可行（A-）**。两个待 PoC 验证点：低配手机实测帧率、AI 全链路端到端时延。Unity 桌面端的三大矛盾点（共享诺诺/状态同步/key 不泄漏）在"服务器权威 + 后端 AI 代理"架构下全部有解，与客户端形态无关。

---

## 二、Web 3D 渲染

### 2.1 引擎/库现状（已证实，官方源）

| 库 | 当前版本 | 发布时间 | 来源 |
|---|---|---|---|
| three.js | r186 (npm 0.186.0) | 2026-09-08 | GitHub Releases / npm registry |
| Babylon.js | 9.27.1 | 2026-09-18 | GitHub Releases |
| @pixiv/three-vrm | 3.5.5 | 2026-09-07-09 | GitHub Releases / npm |
| @pixiv/three-vrm-animation | 3.5.5 | 同上 | npm |
| colyseus | 0.18.8 | 2026-09-23 | npm（本项目现用 0.16） |

- three.js 官网定位：浏览器端 WebGL/WebGPU JavaScript 3D 库，首页展示约 200 个商用案例（Cartier/Gucci/NASA/krunker.io 等）。（来源：https://threejs.org/ ，2026-09-23 抓取）
- Babylon.js 同为活跃维护的一线 web 3D 引擎（Microsoft 系生态），本调研未深入其 VRM 支持。

### 2.2 VRM 的 web 支持（已证实）

@pixiv/three-vrm（pixiv 官方维护，MIT，约 2.2k star，2899 commits，24 open issues，持续活跃）：

- 加载：`GLTFLoader` 注册 `VRMLoaderPlugin` 即可加载 VRM，自带 MToon 卡通材质实现。
- WebGPU：v3 起 `MToonNodeMaterial` 支持 three.js r167+ 的 WebGPU 渲染器。
- VRM 1.0 样例模型（含 twist 约束）直接支持；VRM 0.x 经 `@pixiv/three-vrm-v0` 包迁移支持（该包维护状态本轮未单独核验——未证实）。
- 动画：`@pixiv/three-vrm-animation` 加载播放 `.vrma`（VRM Animation）文件，与 VRM humanoid 直接重定向（README + npm 已证实）。
- 官方 examples/API 文档：https://pixiv.github.io/three-vrm/

VRM 1.0 规范表情系统（一手规范，已证实，来源：vrm-c/vrm-specification raw，2026-09-23 抓取）：

- **18 个预设表情**：情绪 5（happy/angry/sad/relaxed/surprised）+ **口型音素 5（aa/ih/ou/ee/oh）** + 眨眼 3 + 视线 4 + neutral。
- 每个表情绑定 `morphTargetBinds`（node + morph index + 0~1 权重）、材质色绑定、UV 变换绑定；支持 `overrideBlink/overrideMouth/overrideLookAt`（none/block/blend）——**这是"说话时不眨眼""口型与表情混合"之类细节的官方机制**。
- lookAt 分骨制/表情制两种驱动。
- 执行顺序：骨骼 → lookAt → 表情（外部输入/口型/自动眨眼）→ 约束 → spring bone。

**代码难度评估**（基于上述官方 API，属评估非实测）：加载约 10 行；播 .vrma 约 10~20 行；表情驱动是 `vrm.expressionManager.setValue('aa', w)` 级别的单行调用。难度低，主要工作量在美术资源与状态机设计。

### 2.3 模型体积与加载（多源，部分为二手实测）

- 官方文档承认 VRM 体积主要来自贴图与 BlendShape，提供 `ReduceBlendshape`/`ReduceBlendshapeClip` 缩小方案（来源：https://vrm.dev/en/univrm/export/vrm_size/ ，搜索命中，未逐字核验——标注）。
- VRoid Hub 模型页展示文件大小/面数/材质数供减重参考（官方 FAQ：https://vroid.pixiv.help/hc/en-us/articles/18849783759257 ）。
- 社区实测：VRoid 导出模型经 Blender 手工优化后 4.7MB（约省一半，VR Me Up devlog，https://vrmeup.com/devlog/devlog_8_manual_optimization_vrm_avatars_using_blender.html ）；Reddit r/VRoid 口径"12+MB 很常见"（https://www.reddit.com/r/VRoid/comments/oswpfy/ ）；WebXR 优化建议：贴图封顶 2048、材质合并、删透明网格（https://vrmeup.com/devlog/devlog_7_vrm_vroid_studio_export_optimization.html ）。
- FileExt 称多数 .vrm 为 57KB~4MB（口径偏低，可能与小模型样本有关——存疑）。

**结论**：典型 VRoid 导出约 5~20MB，深度优化可到 ~5MB 级；**默认面数的一手数字未找到（未证实）**，需在 PoC 中用具体模型实测。对 20 人社区（非匿名公网），首次加载 10~20MB 可接受，CDN/gzip 后体验尚可。

### 2.4 多人观看的服务器负载（已证实，架构事实）

- 渲染完全发生在各浏览器本地 GPU：three.js 是浏览器端渲染库（官网定位已核验），服务器不参与任何像素渲染。
- Colyseus 只做 schema 差量状态同步（join 全量 + tick 补丁，官方文档已核验），20 个观看者 = 20 条 WebSocket + 小数据量补丁广播，负载可忽略。
- **低配设备帧率：无公开权威基准（未证实）**。旁证：Amica 官方 README 声称支持 mobile/tablet/desktop；TalkingHead 声称在 Chrome/Firefox/Safari/Edge 桌面与 iPad 测试通过。MToon 规范自述基于 Lambert 扩展（非 PBR），单角色 + 简单房间的开销理论上远低于大型 web 3D 场景——仍需 PoC 实测。

### 2.5 WebGL/WebGPU 兼容性与 Unity WebGL（已证实）

- **WebGL2 全球支持率 96.44%**（caniuse，StatCounter 2026-08 数据；Chrome 56+/Safari 15+/Firefox 51+/iOS 15+）。
- **WebGPU 全球支持率 87.35%**（caniuse 2026-08；Chrome/Edge 113+，Safari 26+（iOS 26+ 完整支持），**Firefox 各版本默认关闭**）。→ 生产形态应继续以 WebGL2 为基线，WebGPU 仅作增强（three-vrm v3 已兼容两者）。
- Unity WebGL（Unity 6.6 文档版本）：
  - 空场景构建未压缩约 14MB，Brotli 压缩后 2.51MB（Unity 论坛用户实测，2021+：https://forum.unity.com/threads/empty-webgl-project-over-10mb-uncompressed.1119424/ ）；小型真实项目 Brotli 后 code 3.3MB + data 2.6MB（https://discussions.unity.com/t/webgl-build-size/772902 ）——二手实测。
  - 限制（官方 Manual "Technical limitations"）：C# 托管线程不支持（wasm 无多线程 GC）、无 System.Net/直接 socket、Web Audio 基础后端、AOT 无反射 Emit。
  - WebGPU：Unity 6.1 起公开实验（官方 discussions），**Unity 6.6 (6000.6) 起脱离实验状态**（https://discussions.unity.com/t/webgpu-out-of-experimental-in-unity-6-6/1734694 ，社区帖+报道）。
  - 移动浏览器官方支持表：本轮未核验到（页面 404）——未证实，选型 Unity WebGL 前需自查。
  - 优点：全套卡通渲染生态（URP/HDRP + 社区 shader）；缺点：包体与首载大于 three.js 路线、与现有 Vue 前端异构、线程/网络 API 受限。

---

## 三、二次元卡通渲染（核心审美问题）

### 3.1 MToon 能做到什么程度（一手规范，已证实）

VRMC_materials_mtoon 1.0 规范（来源：vrm-c/vrm-specification raw，2026-09-23 抓取）完整定义：

- **赛璐璐二分明暗**：shadeColor + shadeMultiplyTexture、shadingShiftFactor/Texture 控制明暗分界位置、shadingToonyFactor（默认 0.9）控制过渡软硬；
- **轮廓线**：outlineWidthMode（worldCoordinates / screenCoordinates 屏幕空间恒定粗细）+ 宽度贴图遮罩 + 轮廓光混入；
- **边缘光**：MatCap 贴图与参数化 Fresnel rim 双通道；
- 自发光、透明排序（transparentWithZWrite + renderQueueOffset，解决头发刘海透叠）、GI 均衡化、UV 滚动/旋转动画（眼睛高光流动等）。

规范自述定位："与 PBR 场景协调地加入 toon 效果"，**不是复刻手绘**。实际观感基线 = VRChat/VRoid 生态水准：干净的赛璐璐 + 边缘光 + 轮廓线，**与 2D Live2D 立绘并排时**，3D 优势在体积/动作/镜头自由，弱势在手绘笔触感与"完美脸型"（Live2D 恒定最佳角度）。

### 3.2 业界标杆与小团队可达度

引擎事实（Wikipedia infobox，已证实）：

- 原神 = Unity（miHoYo）；NIKKE = Unity（Shift Up）——且 wiki 明述 NIKKE 角色用**等身 Live2D** 而非 3D 角色呈现（3D 用于场景）；蔚蓝档案 = Unity（Nexon Games MX Studio）。
- 星穹铁道引擎本轮未单独核验（普遍认知为 Unity——未证实，不作为结论）。

NPR 标杆方法论（一手 GDC，已证实）：**Guilty Gear Xrd**（Arc System Works，GDC 2015 "GuiltyGearXrd's Art Style: The X Factor Between 2D and 3D"，GDC Vault https://www.gdcvault.com/play/1022031/ ）：顶点着色器逐顶点变形、手工调整法线控制明暗、动画减帧模拟手绘节奏、有限色板、2D 合成思维——"让 3D 模型看起来像 2D"的核心不是 shader 单点，而是资产全流程手工介入。

社区复刻证据（GitHub API 检索 2026-09-23，已证实）：仿原神卡通渲染开源项目多个且活跃——Gaolingx/GenshinCelShaderURP（768★，URP）、festivities/PrimoToon（761★）、Hoyotoon/HoyoToon（726★）、kaze-mio/UnityGenshinToonShader（377★，URP）——**全部在 Unity 管线内，无 three.js 等价物**。

**小团队 web 端可达度评估**（标注：评估非实测）：MToon 默认观感约为原神级的 6~7 成（二分明暗/rim/outline 齐但缺面部 SDF 阴影贴图、发丝手工法线等资产级功夫）；在 three.js 上自写 shader 深度定制理论上可行（three.js 材质系统完全开放），但等于把 Unity 社区踩过的坑重走一遍。对 20 人朋友圈社区，VRChat 级观感大概率够用。

### 3.3 "2D 立绘观感"的 3D 技巧

- 已证实路线：Xrd 式全资产手工 NPR（GDC 一手）；MToon 贴图通道技巧（shadeMultiplyTexture 画固定阴影 = 逼近手绘定妆阴影）。
- **"2D 脸 + 3D 身体混合"、"billboard 立绘"的 web 成熟方案：未找到任何先例（查无，明说）**。存在理论做法（脸部贴图按镜头角度切换、身体 3D），属高风险自研，不建议。

### 3.4 VTuber 受众对 3D 的接受度

- 初代 VTuber Kizuna AI 本身就是 3D CG 角色（2016-2022，动捕/手K 制作，Wikipedia 已证实）——3D 是 VTuber 起源形态。
- Neuro-sama 2025-11-15 起使用 3D 模型（jjinomu 制作，VRChat subathon 使用；此前为 Live2D），粉丝量 Twitch ~101 万 / B站 ~112 万 / YouTube ~91.6 万（Wikipedia，2026-09-13 版本）——AI 主播 3D 化已被头部案例验证。
- 日常直播生态以 Live2D 为主流：社区口径 "~95% Twitch VTuber 直播用 Live2D"（streamskins.net，**无一手统计支撑，弱二手**）；AnimArts 估计双形态主播约 80% 内容时长用 Live2D、3D 留给特别演出（弱二手）。**无权威行业统计（明说）**。
- 对诺诺场景的判断（评估）：受众是 20 人熟人社圈而非 VTuber 硬核圈，卖点是"她在房间里活着、回应我"的互动感，3D 恰是达成该体验的必要条件，审美折价可接受。

---

## 四、3D 虚拟直播间实际案例

### 4.1 3D VTuber 平台/案例（已证实）

| 案例 | 形态 | 技术要点 | 状态 | 来源 |
|---|---|---|---|---|
| Kizuna AI | YouTube 3D CG 虚拟偶像 | 动捕/手K，疑似 MMD 制作（官方保密） | 2016-2022 活动，2025 回归 | Wikipedia |
| VARK | 3D VTuber VR 演出平台 | 表演者去动捕棚直播，观众 HMD/手机观演 | **2024-03-04 终止服务** | virtualyoutuber.fandom + CyberAgent Capital 报道 |
| Virtual Cast | VR 元宇宙交流 | 自有 avatar + 房间 + 物品交互 | 运营中 | virtualcast.jp 官网 |
| cluster | 跨端元宇宙（手机/PC/**浏览器**/VR） | 虚拟演唱会/活动常态化 | 运营中 | cluster.mu 官网 |
| REALITY | 手机 3D avatar 直播 App | 前置摄像头面捕驱动 3D 角色 | 运营中 | reality.app 官网 |
| B站 3D 活动 | 大型 3D 虚拟演出（BW、冰火歌会等） | 具体技术栈未公开（**未证实**） | Neuro 曾参与 B站线下活动 | Wikipedia (Neuro-sama) |

### 4.2 网页端 3D 虚拟互动产品（已证实）

- **cluster**：浏览器即可参与的虚拟演出/空间——"web 端 3D 虚拟直播间"最接近的产品级先例。
- **Amica**（github.com/semperai/amica，1598★，2026-09-22 仍在推送）：浏览器 + Tauri 桌面的 **VRM 3D AI 语音对话**应用，three.js + @pixiv/three-vrm + Transformers.js + Silero VAD，LLM 后端可插拔（llama.cpp/OpenRouter/Ollama 等），带情绪引擎——**与"诺诺"产品形态最接近的开源参照**。警示：其 OpenRouter key 用 `NEXT_PUBLIC_` 前缀暴露在浏览器端（README 已核验）——诺诺绝不可这样做。
- **TalkingHead**（github.com/met4citizen/TalkingHead，1565★，MIT）：浏览器全功能 3D 说话头像——GLB + Mixamo 骨骼 + ARKit/Oculus blendshape，TTS（Azure 输出 viseme 时间戳，宣称支持 100+ 语言）+ 流式音频接口 + 弹簧骨骼物理 + 表情/手势库。中文语言模块不存在（仅英德法芬立陶宛），中文口型需走 Azure viseme 或音量法。
- **STYLY**：XR 空间平台，支持浏览器分发（WebAR 等）；VRM 支持未在其首页核验到（标注）。
- Open-LLM-VTuber-Web：仅 Live2D 的 web 前端（主项目 13.9k★）。

### 4.3 Neuro-sama 与 AI 主播 3D 化（已证实，Wikipedia）

- 原模型：Live2D 免费模型（Hiyori Momose）；第二版模型（2023-05）**运行于 Unity**（彭博报道）；第三版 Live2D（2024-12）；**3D 模型 2025-11-15 首用**（jjinomu 制作，VRChat subathon）。
- AI 栈：LLM + TTS（Vedal 自研闭源，代码未公开）。
- 结论：AI 驱动 3D 角色直播无公开技术栈，但"AI + 3D + 高人气"三要素已被同一案例验证。

### 4.4 场景搭建方式

- 诺诺直播间 = **纯 3D 场景内渲染**（房间/椅子/书桌都是 3D 资产），不存在真人绿幕合成问题（绿幕属真人+虚拟背景路线，不适用）。
- 业界 3D 直播间即"引擎内搭景 + 动捕驱动"：Virtual Cast/cluster 的房间系统是产品化先例；个人 VTuber 的 3D 场景直播普遍在 Unity 系工具内实现（VirtualMotionCapture 等工具名见于检索，本轮未深核验——标注）。
- 机位：固定机位最小可行；多机位 = 引擎内多相机切换/混合（Unity 官方 Cinemachine 包为此设计——**本轮未核验其文档原文，标注**；three.js 多相机切换属框架基础用法）。

---

## 五、场景制作与"真实场景交互"

### 5.1 免费 3D 房间/家具资产（已证实部分）

| 来源 | 内容 | 许可 | 核验状态 |
|---|---|---|---|
| Kenney Furniture Kit | 140 件家具（桌/椅/床等）低多边形套件 | **CC0**（公共领域） | 已证实（kenney.nl） |
| Sketchfab | 60 万+ 免费可下载模型，全部 CC 系许可，CC0 免署名 | CC0/CC-BY/CC-BY-NC 逐模型 | 已证实（Sketchfab 官方博客） |
| Unity Asset Store | 大量免费家具/室内包 | 逐资产 EULA | **未核验具体条目**，入库前逐项核对 |
| Booth（日本） | VRM 生态房间道具最大集散地 | 卖家自定，常见禁止再分发 | **未核验**，购买前逐项确认 |
| Quixel Megascens | PBR 扫描资产 | 2024-10~12-31 曾免费领取（Epic 官方博客+cgchannel）；**窗口已过，现付费** | 已证实（对本项目已无免费价值） |
| Mixamo (Adobe) | 动捕动画库，FBX 输出 | 存在且可用（Wikipedia）；免费使用的具体许可条款**未核验原文** | 部分证实 |

### 5.2 AI 辅助 3D 生成（已证实，官网）

- **Meshy**（meshy.ai/pricing）：文字/图片生成 3D + AI PBR 贴图 + 自动绑骨；免费层每月 100 credits（输出 CC BY 4.0，需署名），Pro 1000 credits/月；输出 FBX/OBJ/USDZ/GLB/STL/blend。注意：其贴图主打写实 PBR，**二次元风格化质量官网未作承诺**。
- **Tripo**（tripo3d.ai/pricing）：text/image to 3D，免费试用档至团队档，8K 贴图、game-ready 定位；具体免费额度数字未抓到（详见定价页）。
- 对"椅子、书桌"这类硬表面道具，AI 生成可用但风格统一性存疑；更稳路线：Kenney/Sketchfab CC0 打底 + Blender 统一风格化。
- （注：AI 生成调用属项目红线——任何 API 生图/生 3D 须先报院长确认。）

### 5.3 "坐椅子/走到书桌"的实现（已证实组件 + 工作量评估）

- **Unity 侧**：官方 AI Navigation 包（com.unity.ai.navigation 2.0.x）提供 NavMesh 烘焙 + NavMeshAgent 寻路/互相避让（官方 docs 已核验）。坐姿 = NavMesh 到点 + 坐下动画 + IK/手动对齐（`anim.applyAvatarPassthrough` 级别的对齐工程，属常规做法，无专门文献——工程常识）。
- **three.js 侧**：
  - three-pathfinding（1370★，MIT）：navmesh 上 A* + funnel 寻路、多 zone、`clampStep` 约束移动；**不生成 navmesh**，需在 Blender/Recast 外部烘焙后以 OBJ/glTF 导入（README 已核验）。
  - YUKA（1671★，MIT）：引擎无关的游戏 AI 库（FSM/steering/寻路/感知），纯 JS 浏览器可用（README 已核验）。
- **工作量评估**（评估非实测）：单人房间级场景（一个房间 + 3~5 个兴趣点 + 坐/睡/看书三个状态）——烘焙 navmesh + 状态机 + 动画对齐，three.js 路线约 1~2 周量级；动画本体可用 .vrma（现有库）或 Mixamo 转制（转换工具存在但本轮未核验具体工具——标注）。

### 5.4 摄像机/运镜

- 最小可行：固定机位（正面全景），成本低、最稳。
- 进阶：2~3 个预置机位（全身/桌面特写/睡脸）随状态切换——three.js 里就是相机位置插值，工作量小；Unity 用 Cinemachine（官方包）。
- 直播间审美：VTuber 直播以固定/少切换为主流（社区共识口径，非统计）。

---

## 六、多人状态同步与弹幕

### 6.1 Colyseus 同步"同一只诺诺"（一手官方文档，已证实）

- 机制：schema 声明式状态，join 全量 + tick 差量补丁；客户端 `onAdd/onRemove/onChange` 回调；支持 StateView 按客户端裁剪可见性、`patchOnly()/fullStateOnly()`、实验性 WebTransport 不可靠通道。
- 技术边界：每 schema 63 个同步字段、16-bit 角度量化精度 ~0.0055°——对"角色状态/动作/位置"绰绰有余。
- 客户端 SDK：JS/TS 全功能；**Unity/C# 官方支持**（SetSchema/CollectionSchema 未实现，不影响本用途）；另有 Godot/C++/Lua 等。
- 版本：最新 0.18.8（2026-09-23），官方有 0.15 起的迁移指南；本项目 0.16 可平滑跟进（是否升级与本期无关）。
- **官方未公布延迟/并发基准数字（明说）**；20 人房间远低于其典型用例规模（赞助方 Bloxd/Poki 为大规模 web 游戏平台）——定性可行。
- 架构：诺诺状态（位置/朝向/当前动画/表情/说话状态）全部放 Colyseus schema，服务器权威 tick 驱动（含"30 分钟无互动→打瞌睡"计时器），观看者只读同步 + 弹幕走 message——与本项目现有 game-server 完全同构。

### 6.2 弹幕 → AI 决策 → 动作/说话链路

**无产品级现成开源（明说）**。但每一环有已核验的参照：

1. 弹幕进入：Colyseus `room.send`/message（官方）或复用现有社区弹幕通道。
2. AI 决策：Express 后端代理调用 LLM（**key 只存服务器**；Amica 的浏览器端 key 反例已核验，引以为戒）。参照 Open-LLM-VTuber（LLM→情绪→Live2D 表情驱动，13.9k★）的 prompt/情绪映射设计。
3. 状态下发：AI 结果写回 Colyseus schema（表情/动作/文本），全员同步。
4. 语音：TTS 在服务端合成音频文件/流，随状态广播音频 URL + 播放时间戳，各端对齐播放（此分发方式为设计项，非既证事实——需实现时验证同步精度；更高级的 WebRTC 分发对 20 人规模属于杀鸡用牛刀）。

端到端时延的公开数据：无（未证实）。参照 Amica/TalkingHead 均为本地/单人即时链路。**需 PoC 实测 LLM+TTS+网络的总时延**。

### 6.3 口型同步（已证实三方案）

| 方案 | 实现 | 质量 | 核验 |
|---|---|---|---|
| A. 音量→viseme | wawa-lipsync（npm，MIT，210★）：Web Audio 频率分析输出 viseme，任意语言 | 简单张合，够用 | 已核验（GitHub README） |
| B. TTS viseme 时间戳 | Azure Speech SDK 输出 viseme 时间轴，TalkingHead 以此支持 100+ 语言（含中文路线） | 口型较准 | 已核验（TalkingHead README） |
| C. 音素实时分析（Unity） | uLipSync（MIT，~1.7k★）：MFCC 音素相似度驱动 blendshape，VRM 0.x/1.0 均有官方桥接，WebGL 可用（有限制） | 较准，需校准 | 已核验（GitHub README） |

VRM 侧天然支持：规范内建 aa/ih/ou/ee/oh 五音素预设 + `overrideMouth` 混合机制（一手规范已核验）。诺诺建议：起步用方案 A，中文效果不满意升级方案 B。

---

## 七、结论与对项目的建议

### 7.1 评级：Web 3D 支撑诺诺直播间 = **可行（A-）**

| 维度 | 判定 | 依据 |
|---|---|---|
| 渲染技术 | ✅ 成熟 | three.js r186 + three-vrm 3.5.5 活跃维护，VRM/表情/动画/口型全链路现成 |
| 兼容性 | ✅ 96%+ | WebGL2 支持率 96.44%（2026-08） |
| 服务器负载 | ✅ 零渲染 | 客户端渲染 + Colyseus 差量状态同步（已有基础设施） |
| 审美 | ⚠️ 上限明确 | MToon=VRChat 级；原神级需 Unity 定制管线+手工资产，web 无等价物 |
| 性能（低配/手机） | ⚠️ 未实测 | 无公开基准；Amica/TalkingHead 声称支持移动端；**需 PoC** |
| AI 链路 | ⚠️ 需拼装 | 无产品级开源；组件（Colyseus/LLM 代理/TTS/口型）全部齐备 |
| 资产 | ✅ 充足 | Kenney CC0/Sketchfab/Booth/Meshy；房间级场景工作量 1~2 周 |

扣分项即两个 PoC 点：**① 低配手机帧率实测；② 弹幕→LLM→TTS→动作端到端时延实测**。两者通过即升 A。

### 7.2 推荐架构（Web 形态）

```
Vue3 页面 (three.js + three-vrm + wawa-lipsync + Colyseus JS SDK)
  ↕ WebSocket (Colyseus game-server, 新增 NononRoom：状态权威 + 30min 闲置计时)
  ↕ HTTP (Express：弹幕入队 → LLM 代理（key 仅服务端）→ TTS → 结果写回 room + 音频 URL)
```

- 诺诺状态 schema：`pos/rot/state(idle|walk|sit|sleep|read)/anim/expression/speaking/audioUrl/playAt`。
- 观看者纯只读；说话音频用"URL+播放时间戳"对齐。

### 7.3 若走 Unity 桌面端：三大矛盾点评估（均有解）

1. **20 人共享同一只诺诺**：桌面客户端仍连 Colyseus——官方 Unity/C# SDK 已核验支持，状态权威在服务器，与客户端形态无关。有解。
2. **状态同步**：同上，Colyseus schema 同步对 C# 客户端为官方一等公民。有解。
3. **API key 不泄漏**：桌面端**永不内置任何 AI key**，所有 LLM/TTS 调用一律走 Express 后端代理（与 web 同一原则；Amica 的 `NEXT_PUBLIC_` 浏览器暴露 key 是反面教材）。有解。

额外成本（这是桌面端真正的代价）：安装包分发 + 自动更新（butler/自建更新器——未核验具体工具，标注）、20 人都要装客户端的意愿摩擦、失去"点链接即看"的社区传播性。**中间态 Unity WebGL 也可选**（空场景 Brotli ~2.5MB、小项目 ~6MB，加载可接受），但相比 three.js 路线无决定性收益，反而割裂 Vue 前端。

**建议**：Unity 桌面端仅在两种情况启用——① PoC 证明 web 端在目标设备帧率不可接受；② 院长对渲染品质的要求超出 MToon 可达上限且不愿妥协。渲染差距的主因是美术资产与着色器定制投入，不是引擎本身；为 20 人社区预支 Unity 工程成本不划算。

### 7.4 下一步（PoC 清单）

1. 取一个 VRoid 模型（或委托黑机出诺诺 3D 设定）→ three-vrm 加载 + 表情/口型 demo（1~2 天）。
2. Kenney 家具搭房间 + three-pathfinding 走位 + 坐姿状态机（2~3 天）。
3. Colyseus NononRoom 原型：状态权威 + 20 标签页同开验证同步（1 天）。
4. Express 接一个 LLM + TTS，实测弹幕→说话端到端时延（1 天）。
5. 低配手机（如荣耀便携本集显 + 一台中端手机）实测帧率（0.5 天）。

---

## 来源汇总

### 一手来源（官方文档/规范/registry）
- [three.js GitHub Releases（r186, 2026-09-08）](https://github.com/mrdoob/three.js/releases) ／ [threejs.org](https://threejs.org/)
- [Babylon.js Releases（9.27.1, 2026-09-18）](https://github.com/BabylonJS/Babylon.js/releases)
- [@pixiv/three-vrm](https://github.com/pixiv/three-vrm) ／ npm `@pixiv/three-vrm@3.5.5`（2026-09-23 查询）
- [VRM 1.0 规范 expressions.md / VRMC_materials_mtoon 1.0](https://github.com/vrm-c/vrm-specification)（raw 抓取 2026-09-23）
- [vrm.dev 官方站](https://vrm.dev/en/)
- [caniuse WebGPU（87.35%, 2026-08）](https://caniuse.com/webgpu) ／ [caniuse WebGL2（96.44%, 2026-08）](https://caniuse.com/webgl2)
- [Colyseus 官方文档（state/schema）](https://docs.colyseus.io/state/schema/) ／ npm `colyseus@0.18.8`
- [Unity Manual：Web 技术限制](https://docs.unity3d.com/Manual/webgl-technical-overview.html) ／ [Web 构建产物](https://docs.unity3d.com/Manual/webgl-building.html) ／ [AI Navigation 包](https://docs.unity3d.com/Packages/com.unity.ai.navigation@2.0/manual/NavMeshAgent.html)
- [Unity 6.6 WebGPU 脱离实验（官方 discussions）](https://discussions.unity.com/t/webgpu-out-of-experimental-in-unity-6-6/1734694)
- [GDC Vault：GuiltyGearXrd's Art Style（GDC 2015）](https://www.gdcvault.com/play/1022031/GuiltyGearXrd-s-Art-Style-The)
- [Kenney Furniture Kit（CC0）](https://kenney.nl/assets/furniture-kit)
- [Sketchfab 官方博客：60 万免费模型与 CC 许可](https://blog.sketchfab.com/)（检索命中）
- [Meshy 定价](https://www.meshy.ai/pricing) ／ [Tripo 定价](https://www.tripo3d.ai/pricing)
- [cluster 官网](https://cluster.mu/) ／ [Virtual Cast 官网](https://virtualcast.jp/) ／ [REALITY 官网](https://reality.app/) ／ [STYLY 官网](https://styly.cc/)
- [wawa-lipsync](https://github.com/wass08/wawa-lipsync) ／ [uLipSync](https://github.com/hecomi/uLipSync) ／ [three-pathfinding](https://github.com/donmccurdy/three-pathfinding) ／ [YUKA](https://github.com/Mugen87/yuka)（均为 GitHub README 核验）
- [Epic 官方博客：Fab 上线与 Megascans 免费窗口](https://www.unrealengine.com/en-US/blog/fab-content-marketplace-launches-in-october-publishing-portal-opens-today)

### 二手来源（媒体/社区/百科）
- [Wikipedia：Neuro-sama](https://en.wikipedia.org/wiki/Neuro-sama)（2026-09-13 版本）／ [Kizuna AI](https://en.wikipedia.org/wiki/Kizuna_AI) ／ [Genshin Impact（引擎 Unity）](https://en.wikipedia.org/wiki/Genshin_Impact) ／ [Goddess of Victory: Nikke（Unity）](https://en.wikipedia.org/wiki/Goddess_of_Victory:_Nikke) ／ [Blue Archive（Unity）](https://en.wikipedia.org/wiki/Blue_Archive)
- [Amica](https://github.com/semperai/amica) ／ [TalkingHead](https://github.com/met4citizen/TalkingHead) ／ [Open-LLM-VTuber](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber)
- [Unity 论坛：空场景 WebGL 14MB/Brotli 2.5MB](https://forum.unity.com/threads/empty-webgl-project-over-10mb-uncompressed.1119424/) ／ [小项目 Brotli 3.3+2.6MB](https://discussions.unity.com/t/webgl-build-size/772902)
- [VR Me Up：VRM 优化实测 4.7MB](https://vrmeup.com/devlog/devlog_8_manual_optimization_vrm_avatars_using_blender.html)
- [cgchannel：Megascans 免费窗口报道](https://cgchannel.com/2024/10/epic-games-has-made-megascans-free-to-all-but-only-until-the-end-of-2024/)
- [VARK 终止服务（VTuber Wiki）](https://virtualyoutuber.fandom.com/wiki/VARK) ／ [CyberAgent Capital 报道](https://www.cyberagentcapital.com/insight/mpweeklynews_vark/)
- [streamskins：~95% Twitch VTuber 用 Live2D（弱二手，无一手统计）](https://streamskins.net/vtuber-modeling-ultimate-guide/) ／ [AnimArts：80% 时长估计（弱二手）](https://animarts.studio/blog/3d-vs-2d-vtuber-models-comparison)
- GitHub API 检索（2026-09-23）：GenshinCelShaderURP 768★ / PrimoToon 761★ / HoyoToon 726★ / kaze-mio 377★

### 明示未证实/查无
- VRoid 默认模型面数一手数字：查无。
- 低配设备帧率公开基准：查无（需 PoC）。
- Colyseus 官方延迟/并发基准：官方未公布。
- "2D 脸+3D 身体"混合渲染的 web 先例：查无。
- B站 3D 主播内部技术栈：未公开，未核验。
- Unity WebGL 移动端浏览器官方支持表：本轮 404 未核验。
- VTuber 3D/2D 占比权威统计：查无（仅弱二手口径）。
- Mixamo 免费使用许可原文：未核验（helpx 403）。
- Booth 家具条目许可：未核验（需逐项）。
- Cinemachine 文档原文：未核验（搜索限流）。
