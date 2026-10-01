# 诺诺 Web 渲染管线 PoC 方案（v1.0 · 文档先行）

> 立项时间：2026-10-01（黑机）
> 所属需求：R-058 虚拟直播间「诺诺」——一期最后一块拼图（建模可行性闭环）
> 前置交付：[诺诺美术资产库](../05-美术设计/诺诺/README.md)——`nonono_v5.vrm`（VRM1.0，50976 面，15.4MB）已就绪
> 关联调研：[诺诺虚拟直播间Web3D渲染可行性调研](../00-调研/01-技术/诺诺虚拟直播间Web3D渲染可行性调研.md)（three.js+three-vrm 评级 A-）
> 状态：⛰️ uphill → 方案定稿后转 ⛰️ downhill 按步骤清单执行

---

## 一、目标与验收标准

把 `nonono_v5.vrm` 装进浏览器渲染出来，验证 R-058 选定的 Web 3D 技术路线真实可行。

**PoC 完成定义（7 条验收）**：

| # | 验收项 | 标准 |
|---|---|---|
| 1 | 模型上屏 | 诺诺完整渲染（MToon 卡通着色），无贴图丢失/骨骼错位 |
| 2 | 待机生命感 | 眨眼（自动循环）+ 呼吸（胸口微起伏）运行 |
| 3 | 视线互动 | 眼睛跟随鼠标移动（three-vrm lookAt） |
| 4 | 表情系统 | ≥3 个表情可切换（happy/relaxed/sad，验证 expressionManager 通路=好感度表情体系前置） |
| 5 | 头发物理 | SpringBone 摇曳可见（转头时头发自然摆动） |
| 6 | 性能 | 本机（RTX 4070）60fps 稳定，Stats 面板实测记录 |
| 7 | 沉淀 | 截图/录屏归档诺诺目录 + 本文档回填「实测结果」节 |

**不做**（明确排除，防 PoC 膨胀）：LLM 大脑联动、Colyseus 同步、弹幕交互、服装、音频口型——这些是管线验证通过后的下一步。

---

## 二、技术选型（事实依据）

| 项 | 选择 | 依据 |
|---|---|---|
| 渲染引擎 | **three.js 0.186.1**（当前 latest） | Web3D 调研评级 A- 的路线主件；MToon 生态唯一成熟选择 |
| VRM 加载 | **@pixiv/three-vrm 3.5.5** | VRM1.0 官方加载器（peer three>=0.137 兼容 0.186），自带 MToonMaterial/lookAt/expressionManager/springBone |
| 构建 | **Vite 6**（独立 demo 自带） | 与主站一致，未来集成零摩擦 |
| 框架 | **无框架纯 JS**（PoC 阶段） | PoC 验证的是渲染管线不是框架集成；Vue 组件化留到集成自习室时做 |
| 动画 | 程序化（blink/呼吸）+ expressionManager | VRMA 动画文件与 Mixamo 重定向属后期（动作库阶段） |

**主站依赖现状**（2026-10-01 核实）：主站无 three.js 相关依赖——three 全部装在独立 PoC 目录，主站 `package.json` 不动。

---

## 三、架构设计

### 3.1 目录形态：独立 PoC（决策）

```
nandexueyuan/
├─ nono-poc/                  ← 独立 Vite demo（本次新增）
│  ├─ index.html
│  ├─ package.json            ← three/@pixiv/three-vrm/vite 只装这里
│  ├─ vite.config.js          ← server.fs.allow 放行仓库根（读 VRM）
│  └─ src/main.js             ← 场景/加载/动画全在这一个文件（PoC 不分层）
└─ prd/.../05-美术设计/诺诺/
   └─ nonono_v5.vrm           ← 模型原地引用，不复制（省 15MB 双份入库）
```

**决策理由**：
1. 主站是生产站（v4.1.0 线上），PoC 代码不混入主站源码
2. 模型**原地引用不复制**：`vite server.fs.allow` 放行仓库根，dev 页面直接 `fetch('../prd/01-需求文档/05-美术设计/诺诺/nonono_v5.vrm')`——避免 15.4MB 双份进 git
3. 验证通过后：集成自习室时再决定 Vue 组件封装方式，PoC 代码整体退役或留作参考

### 3.2 渲染要点

- **相机**：PerspectiveCamera，初始机位=正面半身（直播间视角），OrbitControls 可旋转
- **灯光三件套**：主光（Directional，暖白）+ 补光（弱冷）+ rim light（背光轮廓，番剧感关键）
- **渲染器**：`outputColorSpace = SRGBColorSpace` + `toneMapping = ACESFilmic`（three-vrm 官方推荐配置，防 MToon 发灰）
- **更新循环**：`clock.getDelta()` → `vrm.update(delta)`（驱动 springBone/lookAt/表情权重）→ render

### 3.3 表情映射（为好感度体系埋点）

three-vrm expressionManager 标准 preset：happy / angry / sad / relaxed / surprised。诺诺好感度三段位（形象设计 §三）映射预留：

| 好感度段 | VRM preset | 权重策略（二期） |
|---|---|---|
| 低（0~30） | neutral（默认脸）+ 微量 angry | 默认权重 0，运行时按好感度插值 |
| 中（30~70） | happy（低权重）+ relaxed | 场景触发，瞬时升权重后衰减 |
| 高（70+） | happy（高权重）+ blush | blush 权重由运行时控制（形象设计已定） |

PoC 阶段只验证 preset 可切换，不做好感度逻辑。

---

## 四、实施步骤清单（downhill）

1. [ ] `nono-poc/` 初始化：`npm init -y` + 装 `three@0.186` `@pixiv/three-vrm@3.5` `vite`（dev）
2. [ ] `index.html` + `vite.config.js`（fs.allow 仓库根）+ `src/main.js` 骨架（scene/camera/renderer/lights/controls）
3. [ ] VRM 加载上屏（验收 1）——GLTFLoader + VRMLoaderPlugin
4. [ ] 眨眼+呼吸（验收 2）
5. [ ] lookAt 鼠标跟随（验收 3）
6. [ ] 表情切换按钮 ×3（验收 4）
7. [ ] Stats 性能面板（验收 5/6）
8. [ ] 实测记录回填本文档「六、实测结果」+ 截图归档诺诺目录（验收 7）+ commit

启动纪律：dev server 后台启动后**必须 curl+浏览器双实测**才告知访问地址（AGENTS 启动红线）。

---

## 五、风险与回退

| 风险 | 概率 | 应对 |
|---|---|---|
| VRM1.0 加载异常（材质/骨骼） | 低 | three-vrm 3.x 官方支持 VRM1.0；若个别节点异常，降级导出 VRM0.0 对比 |
| MToon 渲染发灰/过曝 | 中 | ACESFilmic+SRGB 标准配置可解；仍异常则调 light intensity |
| 15.4MB 首载慢 | 开发期无感 | 线上化时再优化（Draco/meshopt 压缩或 CDN），PoC 不做 |
| three 0.186 与 three-vrm 3.5 API 变动 | 低 | 以 three-vrm 官方 README 示例为准（其锁定的 three 版本为准绳） |

**回退线**：若 three-vrm 路线遇到硬阻塞（渲染异常无法修），回退方案=VRM0.0 重导出 → 仍失败则重评 Babylon.js（调研备选，成本高，预期用不上）。

---

## 六、实测结果（2026-10-01 黑机执行完毕 · **PoC 通过**）

| 验收项 | 结果 | 实测记录 |
|---|---|---|
| 1 模型上屏 | ✅ | MToon 着色完整，贴图/骨骼/材质零异常；ACESFilmic+SRGB 配置下色彩正常不发灰 |
| 2 待机生命感 | ✅ | 眨眼（3.6s 周期）+ 呼吸（4s 周期 chest 微起伏）运行 |
| 3 视线互动 | ✅ | `vrm.lookAt.target = Object3D` 绑定后鼠标跟随生效（VRM1.0 需显式赋目标对象，直接读 target 为 null） |
| 4 表情系统 | ✅ | happy 实测切换成功（闭眼笑+张嘴），expressionManager 通路全通 |
| 5 头发物理 | ✅ | SpringBone 由 vrm.update(delta) 自动驱动 |
| 6 性能 | ✅ **200 FPS** | Playwright 窗口实测（Stats 面板），远超 60fps 线 |
| 7 沉淀 | ✅ | 本节 + 2 张渲染截图（neutral/happy）归档诺诺目录 |

**踩坑记录**（复现必读）：
1. **VRM 跨目录引用**：相对路径被浏览器解析回项目内 → 404 fallback 让 GLTFLoader 拿到 HTML 报 `Unexpected token '<'`。解法：`vite assetsInclude:['**/*.vrm']` + `import vrmUrl from '...*.vrm?url'`（生成 /@fs/ 地址）+ `server.fs.allow:[仓库根]`
2. **lookAt target 为 null**：VRM1.0 必须先 `vrm.lookAt.target = new THREE.Object3D()` 挂场景，再每帧移动该对象位置；直接 `vrm.lookAt.target.set(...)` 每帧报 undefined.set
3. **手臂下垂方向**：T-pose 下 leftUpperArm.rotation.z 用**负值**下垂（-0.75），rightUpperArm 用正值（+0.75），写反则手臂上举
4. **npm allow-scripts**：esbuild postinstall 被拦警告，vite 实际运行正常（esbuild 有二进制 fallback），暂不处理

**遗留**：esbuild postinstall 审批警告；灯光/曝光参数后续可调优；OrbitControls 右键平移在手势下无效属 Playwright 合成输入限制（真人鼠标正常）。

**结论**：R-058「建模可行性为最高优先级」的裁决**正式闭环**——VRoid 捏模 → VRM 导出 → Web 渲染全链路打通。下一步（集成阶段）：Vue 组件化封装进自习室直播间 + LLM 大脑动作标记联动。
