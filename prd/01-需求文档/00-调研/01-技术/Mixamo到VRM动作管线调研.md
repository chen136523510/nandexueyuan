# Mixamo到VRM动作管线调研

> 调研时间：2026-10-03
> 调研人：AI（黑机）
> 背景：R-058 诺诺下一站=Blender 骨骼设置+动作库（2026-10-01 院长裁决），Step 0 动作管线以 Mixamo 免费动捕库为动作源（需求池 2026-09-23 五轮核实结论）。本文回答"Mixamo 动画如何进 three-vrm 渲染的诺诺并播放"，为《诺诺动作库规划》与 Step 0 实操提供依据。
> 关联文档：[诺诺Web渲染管线PoC方案](../../07-自习室/诺诺Web渲染管线PoC方案.md)、[诺诺动作库规划](../../07-自习室/诺诺动作库规划.md)、[电子宠物游戏性与AI设计调研](../03-产品与游戏设计/电子宠物游戏性与AI设计调研.md)

---

## 一、核心结论（先看这个）

1. **`.vrma`（VRM Animation）是官方动画规范，工具链已闭环**：three-vrm 官方包 `@pixiv/three-vrm-animation`（当前 3.5.5，与我们 PoC 的 three-vrm 版本一致）实现 `.vrma` 的加载与播放，API 明确（VRMAnimationLoaderPlugin / createVRMAnimationClip / VRMAnimationMixer）。**已确认**（一手：npm 包 + 官方 API 文档）
2. **Blender 侧转换工具就绪且覆盖我们的版本**：VRM Add-on for Blender（我们 5.2.2 在其支持范围 2.93~5.2 内）官方支持 VRM Animation 导入/导出并有专页教程。**已确认**（一手：官方 README + 教程站）
3. **社区主流管线 = Mixamo FBX → Blender 重定向 → 导出 .vrma → three-vrm 播放**，多源一致；已知坑集中在 A/T-pose 不匹配、骨骼映射、add-on 导出设置（有社区修复指南）。**多源交叉但未实操**（Issue #1523 实测翻车案例 + 修复指南 + Steam 指南）
4. **存在免 Blender 的运行时路线**：three-vrm 官方示例含 `loadMixamoAnimation`（浏览器内直接吃 Mixamo FBX 重定向到 VRM），第三方 `vrm-mixamo-retarget` npm 包同方向。适合 PoC 快速验证，但社区反馈有腿部 90° 等坑。**单源+待核实路径**（Issue #1176 引用官方示例代码）
5. **推荐：PoC 用路线 C（运行时直载）快速打通，动作库定版用路线 A（.vrma 外挂）**——.vrma 动画与模型分离，符合"动作库"资产化需求；内嵌式（路线 B）每加动作要重导模型，不合需求

---

## 二、路线 A：Blender 重定向 → .vrma 外挂（动作库正解）

**流程**：Mixamo 网页下载 FBX（选 Without Skin + In-place）→ Blender 导入 FBX → 用 VRM Add-on for Blender 重定向到 VRM 人骨 → 导出 `.vrma` → three-vrm 加载播放。

- **three-vrm 播放端**（官方包 README/API）：
  ```js
  import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from '@pixiv/three-vrm-animation';
  loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
  const animGltf = await loader.loadAsync('./wave.vrma');
  const clip = createVRMAnimationClip(animGltf.userData.vrmAnimations[0], vrm);
  new THREE.AnimationMixer(vrm.scene).clipAction(clip).play();
  // 每帧 vrm.update(delta) 照常调用——springBone/lookAt 在动画之后模拟
  ```
- **Blender 转换端**：VRM Add-on 官方教程页 `vrm-addon-for-blender.info/en-us/animation`（本次抓取超时未取到正文，Step 0 实操时以此页为准）
- **已知坑**（社区一致）：
  - Mixamo 骨架与 VRM 人骨命名/朝向不同——重定向是必须环节，不能直接套
  - Mixamo 默认 T-pose、VRoid 模型是 A-pose——首帧姿势不匹配会让动作"起点错位"（修复指南主题）
  - 复杂动作（如拳击）有翻车案例（Issue #1523：转换成功但 three-vrm 加载不工作，帖子关在未解决状态）——**简单上半身动作风险低，复杂全身动作需逐个验收**
- 适用：动作库资产化（.vrma 与模型分离、可独立增删）、干净可版本管理

## 三、路线 B：动画内嵌 VRM（仅记录，不推荐）

Blender 里重定向后直接随 VRM 导出（glTF animation clips 内嵌），three.js 标准 AnimationMixer 即可播放。
**否决理由**：每新增/修改一个动作都要重新导出整个 VRM 模型（15MB 级）+ 击穿缓存，动作库场景下资产管理是灾难。PoC 临时验证可用。

## 四、路线 C：浏览器运行时直载 Mixamo（PoC 快速通道）

three-vrm 官方示例含 `loadMixamoAnimation`：FBXLoader 加载 Mixamo FBX → 运行时重定向到已加载的 VRM 直接播。另有第三方 npm 包 `vrm-mixamo-retarget` 同方向（骨骼映射+坐标系转换，单一来源未交叉验证）。
- 优点：**零 Blender 中转**，Mixamo 下载的 FBX 直接喂给浏览器，PoC 验收链路最短
- 已知坑：Issue #1176 报告腿部 90° 旋转（官方示例代码的已知问题，有讨论）；Mixamo FBX 带 skin 时文件大
- 适用：Step 0 首次打通 + 动作风格筛选（快速试大量 Mixamo 动画）；定版动作再沉淀成 .vrma 走路线 A

## 五、对项目的建议（Step 0 实操顺序）

1. **Mixamo 账号确认**（需浏览器交互，院长操作）：Adobe 账号登录 mixamo.com 能否下载——这是 Step 0 的硬前置
2. **路线 C 打通**：nono-poc 加 `?anim=<url>` 调试参数，FBXLoader + loadMixamoAnimation 播放一个 Mixamo wave 动作——验收标准：诺诺挥手不散架、SpringBone 头发照常摆、lookAt/表情不冲突
3. **注意与现有驱动的冲突**：动画接管 humanoid 后，PoC 里的呼吸 chest 旋转脚本必须停用（否则叠加抖动）；眨眼/表情不受影响；v7 贴片眼无眼球驱动冲突，v6 封存版的 driveEyes 需要评估
4. **路线 A 沉淀**：筛选好的动作在 Blender 重定向导出 .vrma 入 `诺诺/motions/` 目录资产化，README 登记
5. 动作清单与触发语义见《诺诺动作库规划》

---

## 来源汇总

### 一手来源（官方文档/源码）
- [@pixiv/three-vrm-animation（npm 官方包，VRM Animation 实现，v3.5.5）](https://www.npmjs.com/package/@pixiv/three-vrm-animation)
- [three-vrm-animation 源码与示例（GitHub）](https://github.com/pixiv/three-vrm/tree/dev/packages/three-vrm-animation)
- [VRM Add-on for Blender（官方仓库，支持 Blender 2.93~5.2）](https://github.com/saturday06/VRM_Addon_for_Blender)
- [VRM Add-on 官方教程站·VRM Animation 页](https://vrm-addon-for-blender.info/en-us/animation)（正文抓取超时，Step 0 实操核对）

### 二手来源（社区讨论）
- [three-vrm Issue #1523：How to export/load custom VRMA（Mixamo FBX→VRM Add-on→.vrma 实测案例，含翻车）](https://github.com/pixiv/three-vrm/issues/1523)
- [three-vrm Issue #1176：Loading Mixamo animation rotates the legs by 90deg（官方示例 loadMixamoAnimation 已知坑）](https://github.com/pixiv/three-vrm/issues/1176)
- [VRMA Animations Export: procedure explained and fixed!（社区修复指南，itch.io）](https://meringue-rouge.itch.io/)
- [RPG Developer Bakin 的 VRM+Mixamo 重定向全流程指南（Steam 社区）](https://steamcommunity.com)
- [vrm-mixamo-retarget（第三方 npm 运行时转换库，单源未交叉验证）](https://www.jsdelivr.com/package/npm/vrm-mixamo-retarget)

> 时效性：以上结论截至 2026-10-03。GitHub 今夜网络不稳，部分页面靠搜索摘要+多源交叉定性，确切 API 签名/菜单路径在 Step 0 实操时以官方页为准。
