# AI动作生成与自研工作流调研

> 调研时间：2026-10-04
> 调研人：AI（黑机），三路并行子调研
> 背景：院长裁决动作来源=自研为主（Mixamo 免费库有限，筛选不构成长期方案）；院长提出三个方向——①AI 生成视频作动捕素材 ②Cascadeur 类工具 ③诺诺形象 LoRA 保体型一致——并确认需要一套基层动作体系。本文为选型依据，调研结果用于《诺诺动作库规划》的落地路线。
> 关联文档：[Mixamo到VRM动作管线调研](Mixamo到VRM动作管线调研.md)（重定向管线已打通）、[诺诺动作库规划](../../07-自习室/诺诺动作库规划.md)

---

## 一、核心结论（先看这个）

1. **AI 生成视频作动捕素材：成立且时机成熟**。Seedance 2.x/可灵/Veo 的参考图锁形象机制 2026 年已是标配（不用炼 LoRA 就能用）；但动捕模型全按真人训练，**二次元味视频基本不可用——生成视频必须走真人风格**；AI 手部崩坏是通病 → 关手指捕捉，手型后期配
2. **视频动捕主力推荐 QuickMagic**：免费 50 秒/月试用；付费 $11.9/月起 200 秒/月，**导出 Mixamo 骨骼 FBX = 直接进我们已打通的管线**，还带 MMD/二次元舞蹈 preset；备选 Rokoko Vision（$10/月 600s，Mixamo 骨，无手部）。⚠️ 免费档无商用权，商用需付费档
3. **Cascadeur 值得进工作流，但免费版不够**：Free 不能导 FBX（自嗨版）；**Indie $96/年是性价比最优解**（FBX 导出+商用授权）；其 AI Inbetweening/Unbaking（专为清理 Mixamo 烘焙数据设计）/Video Mocap（本地）正对我们的需求；重定向是 Pro 独占，但我们在 Blender 做本来就免费。4070 绰绰有余
4. **LoRA 保体型：方向对，但"参考图先行"**——动捕只提取骨骼不提取长相，形象一致性用 Seedance/可灵参考图即达；开源 Wan2.1 1.3B 视频 LoRA 12GB 可训（Wan2.2 14B 不现实），属后备。身材比例一致性用"3D 模型直出标准参考图"零成本解决
5. **Text-to-Motion 作试验项不作主力**：MotionStreamer（活跃维护+BVH 导出+流式生成，对实时主播有想象空间）4070 可跑；但纯写实风/脚滑/无手指，离清冷二次元观感远
6. **商用版权三条红线**：QuickMagic 免费档无商用权、SMPL 蒙皮模型非商业授权（走 BVH 绕开）、Mixamo 禁再配布——**自研 .vrma 动作库是规避一切版权问题的终点形态**。免费可商用补充库：Quaternius（CC0）

---

## 二、视频动捕工具对比（路线一）

| 工具 | 免费额度 | 付费 | 导出格式 | 骨骼体系 | 手指 | 备注 |
|---|---|---|---|---|---|---|
| **QuickMagic** | 50 V Coins（≈50s） | $11.9/月 200s | FBX（免费）/BVH/VMD（付费） | **Mixamo/UE5/MetaHuman 预设** | 支持（质量看画面） | 单视频付费档最长 120s；有 MMD/二次元舞蹈 preset；**免费档无商用权** |
| Rokoko Vision | 30s/月 FBX | $10/月 600s+BVH | FBX/BVH | UE5/HIK/**Mixamo** | ✗（官方建议买手套） | Vision 3.0 后仅单机位 |
| DeepMotion | 60s/月（手部每秒+0.5 credit） | 未公开列出 | FBX/BVH/GLB | 自有 | 加钱 | 社区口碑一般（"awful"级抱怨） |
| Move One (Move.ai) | 有免费档 | ~$15/月+按分钟 | FBX/USD | 自有 | ✓ | iPhone 单机位；"8 分钟 $35"的按分钟口碑偏贵 |
| Cascadeur Video Mocap | Free 档含（本地运行） | — | 需付费版导 FBX | 自有 | — | 应用内转动画，见 §四 |
| GVHMR（开源本地） | 无限（自部署） | — | SMPL npz→BVH（二跳） | SMPL | ✗（可接 HaMeR） | 开源第一梯队；4070 12GB 可跑；部署中高难度 |

**关键事实**：动捕模型（SMPL 系）全按真人训练——2D 动漫原片基本不可用，**真人表演或 AI 生成真人风视频才是有效素材**；单机位无绿幕是 2026 年标配。

## 三、AI 生成视频作动捕素材（院长方向①）

- **参考图锁形象已成行业标配**（多源交叉验证）：Seedance 2.x/即梦"参考生视频"支持参考图+首尾帧；可灵 Elements 元素库；Veo Ingredients-to-Video；Runway References。**我们立绘纪律的"脸模+服装双参考"机制可直接平移到视频**
- **LoRA 显存账**（院长方向③）：Wan2.1 1.3B LoRA 训练 12GB 可行（musubi-tuner 低显存路径）；Wan2.2 14B 双模型 12GB 不现实（TI2V-5B 推理 8GB 即可，训练属极限操作）；HunyuanVideo LoRA 官方推荐 12GB（musubi-tuner）。**结论：参考图先行（零成本），Wan2.1 1.3B LoRA 作后备**
- **手部崩坏**：AI 视频手指粘连/形变是公认通病 → 动捕时**关闭手指捕捉**（开=把崩坏固化进数据），身体大关节通常可用；手型/手势由 VRM 表情层与基元系统后配
- **风格要求**：生成视频必须真人风格（动捕模型吃真人）；提取到骨骼后套诺诺，二次元观感由 3D 模型自己保证——**LoRA/参考图的正确用途是锁"身材比例"（重定向更准）而非锁画风**

## 四、Cascadeur 与 AI 辅助关键帧（路线三，院长方向②）

**当前版本 2026.2**，正对我们的 AI 能力：
- **AutoPosing**：摆几个关键控制器，AI 补全全身姿势
- **AutoPhysics**：物理模拟修正——重心/动量/脚部接地，**穿模清理也在这层**
- **AI Inbetweening**（2025.1+ 大幅增强）：自动补间
- **Animation Unbaking**（2025.2）：**专为清理 Mixamo/动捕烘焙数据设计**——我们的 FBX 初稿修帧主场
- **Video Mocap**（本地运行）：应用内视频转动画
- Root Motion Tool（2026.1，扩散模型生成运动轨迹）

**定价**（官方 plans 页）：Free $0 仅非商用+只能导 .casc（不能导 FBX=没法进管线）；**Indie $19/月 或 $96/年**（FBX/DAE/GLTF/USD 导出+商用，年收入<$100k）；Pro $49/月或 $396/年（+软件内重定向/四足 AutoPosing；中国区 ¥329/月）。**重定向是 Pro 独占，但我们在 Blender 免费做，Indie 即够**。
**系统需求**：官方最低 GTX 550 Ti——4070 绰绰有余。**学习曲线**：1-2 周入门，中文资源有（B站入门教程/朱峰社区/翼虎付费课）。
**管线衔接**：Blender(VRM→FBX)→Cascadeur 修帧→FBX→Blender VRM 插件导出 .vrma。可直接导入 Mixamo FBX 修改（Unbaking 即为此设计）。

**竞品**：MotionBuilder $1,950/年（行业标准但杀鸡用牛刀）；iClone 8 $599+AccuFace $299（表情/面捕强，但 VRM 需过 Unity 中转）；**Blender 生态免费底座**（VRM Add-on 官方支持到 Blender 5.2 + Rokoko 重定向插件免费）。
**新工具**：Autodesk Flow Studio（原 Wonder Studio，视频转 3D 动画，免费档+Lite $10/月）——云端 SaaS，可出初稿需大量清理。

## 五、Text-to-Motion 本地（路线二，试验项）

- **MotionStreamer**（zju3dv，ICCV 2025）：活跃维护（2026-09 仍在提交）、官方 BVH 导出、**逐帧流式生成**（对虚拟主播实时性有想象空间）；文本编码器 SentenceT5-XXL ~4.8B 偏紧但 4070 可跑（编码器可 CPU/int8）
- MoMask：资料最多但 2024-09 停更；推理 8-12GB 无压力
- **共同短板**：22 关节无手指；脚滑是公认通病（SIGGRAPH Asia 2024 有专文）；训练集全真人=风格纯写实；二次元风格化无成熟方案
- **商用坑**：SMPL 身体模型是 MPI 非商业研究授权——**走"关节→BVH→Blender 重定向"绕开 SMPL 蒙皮**
- 定位：量产初稿草稿机/试验项，风格收敛靠人

## 六、免费动作库补充

- **Quaternius**：**CC0**（商用/再分发/免署名），Universal Animation Library 覆盖大量常用动作，FBX/GLB/Blend，自定义人骨（Blender 重定向解决）——**基层动作的免费补充源**
- Kenney：CC0 但每包仅 3-17 个动作、方块卡通风
- **VRM .vrma 无集中官方库**：VRoid 官方 BOOTH 仅 7 个免费 vrma（待机/行走类）——**主流做法就是自建库**（Mixamo/Quaternius/自研→重定向→vrma），与我们路线 A 一致；自建工具 vrma-lab（浏览器内编辑转换）可关注
- ActorCore：无免费库（$10-60/包）

## 七、推荐组合（个人开发者+4070 单机+VRM 主播）

```
素材层：真人摄像头表演（零成本）
        或 AI 生成真人风视频（Seedance/可灵参考图锁诺诺比例；后备 Wan2.1 LoRA）
动作层：QuickMagic 付费档（Mixamo 骨 FBX，进现有管线）
        或 GVHMR 本地（零订阅兜底，SMPL→BVH）
精修层：Cascadeur Indie $96/年（Unbaking 清数据/AI 补间/物理清理/穿模修帧）
入库层：Blender 重定向 → .vrma 自建库（CC0 素材与自研动作，无版权包袱）
试验层：MotionStreamer text-to-motion（流式生成观察项）
```

**成本合计**：QuickMagic $11.9/月（可选）+ Cascadeur $96/年 ≈ **¥1500/年内**，全部能力齐备；纯免费组合（摄像头+免费额度+GVHMR+Blender）也可起步但额度紧。

## 来源汇总

### 一手来源（官网/官方文档/GitHub）
- [QuickMagic 官网与定价](https://www.quickmagic.ai/) / [DeepMotion 定价](https://www.deepmotion.com/pricing-animate3d) / [Rokoko Vision](https://www.rokoko.com/products/vision) / [Cascadeur plans](https://cascadeur.com/plans)（及 [系统需求](https://cascadeur.com/help/installation/system_requirements)、[2026.1 博客](https://cascadeur.com/blog/view/cascadeur-2026-1-new-renderer-ue-live-link)、[2025.2 AI Inbetweening/Unbaking](https://cascadeur.com/blog/view/cascadeur-2025-2-brings-massive-ai-inbetweening-workflow-upgrades)）
- [zju3dv/GVHMR](https://github.com/zju3dv/GVHMR) / [sameer-khanna/wham](https://github.com/sameer-khanna/wham) / [zju3dv/MotionStreamer](https://github.com/zju3dv/MotionStreamer) / [EricGuo5513/momask-codes](https://github.com/EricGuo5513/momask-codes) / [softcat477/SMPL-to-FBX](https://github.com/softcat477/SMPL-to-FBX) / [pandako/vrm-mixamo-retarget](https://github.com/pandako/vrm-mixamo-retarget) / [liubo8118/vrma-lab](https://github.com/liubo8118/vrma-lab)
- [kohya-ss/musubi-tuner](https://github.com/kohya-ss/musubi-tuner)（Wan/HunyuanVideo LoRA 12GB 路径） / [SMPL 模型授权](https://smpl.is.tue.mpg.de/modellicense)
- [Quaternius](https://quaternius.com) / [Kenney](https://kenney.nl/assets/animated-characters-1) / [VRoid 官方 vrma](https://vroid.com/en/news/6HozzBIV0KkcKf9dc1fZGW) / [VRM Animation 规范](https://vrm.dev/en/vrma) / [Reallusion](https://www.reallusion.com)

### 二手来源（社区口碑，已标注性质）
- r/gamedev、r/mocap 对 AI 动捕质量的抱怨（jitter/脚滑/缺重量感）、r/mikumikudance 的 QuickMagic 使用讨论
- B站 Cascadeur 入门教程、朱峰社区免费系列（中文学习资源）
- Autodesk Flow Studio 定价变动报道（CGChannel 等）

> 时效性：截至 2026-10-04。定价与额度以各家官网实时为准；付费前再核一次（尤其 QuickMagic 商用条款）。
