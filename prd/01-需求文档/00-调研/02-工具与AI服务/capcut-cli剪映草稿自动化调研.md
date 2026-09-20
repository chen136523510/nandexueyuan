# capcut-cli（剪映草稿自动化）调研

> 调研时间：2026-09-20 10:34
> 调研人：AI（黑机）
> 背景：院长要求阅读学习 GitHub 项目 renezander030/capcut-cli（643 star / 75 fork，MIT，v0.25.0，TypeScript 约 25k 行）。要回答的问题：它是怎么做到「不开 API 就自动化剪映项目」的，实现原理是什么，男德的视频生成链路（video-director / Seedance）能借鉴什么。
> 关联文档：`../01-技术/提示词工程调研-图片与视频生成.md`、`MiniMax视频生成API使用指南.md`
> 调研方式：`git clone --depth 1` 到临时目录直读源码（一手来源），未运行。

---

## 一、核心结论（先看这个）

1. **剪映/CapCut 的"工程文件"就是本地明文 JSON**（草稿目录下的 `draft_content.json` / `draft_info.json`），结构为 `tracks[] + materials{}` 双中心模型——capcut-cli 的全部魔法就是直接读写这个 JSON，"JSON in, JSON out"，不需要任何 API/上传/守护进程。生成的项目在剪映里打开后**所有轨道可继续编辑**（不是扁平导出的 mp4）。
2. **时间轴单位是微秒**（`duration: 10000000` = 10 秒），fps 默认 30；所有写操作要量化到帧边界，且正时长不允许塌缩为 0 帧（`src/time.ts`）。
3. **剪映国内版 6.0+ 把草稿 AES 加密了**——这是本项目若要走这条路**最大的坑**。capcut-cli 的官方应对：①锁定剪映 5.9.x 并删 update.exe 阻止自动更新；②改用 CapCut 国际版（完全不加密，只有国内剪映加密）。它明确"只检测、不解密"，理由是法律姿态 + 算法随小版本漂移（docs/jianying-encryption.md 有完整决策记录，写法本身就是很好的 ADR 范例）。
4. **中文字幕断句有行业规范数值可直接抄**：简中 16 字/行、9 字/秒；日语 13/4；韩语 16/12；判定规则是"一行 ≥50% 可见字符属 CJK 才按 CJK 规范"（`src/script.ts` 的 `CJK_SCRIPT_LIMITS`）。
5. 它不只是 CLI，同一核心有**四种分发形态**：CLI（npm 全局装）、TS 库（`loadDraft/saveDraft` 可编程调用）、`capcut serve`（stdin 读 JSONL 任务队列，接 n8n/Make/Coze）、Wasm 沙箱（只读 MCP 工具，零文件/网络能力）。另有 `npx skills add renezander030/capcut-cli` 一键把 capcut-edit 技能装进 Claude Code/Cursor 等 Agent。

---

## 二、实现原理：剪映草稿的本质

一个剪映/CapCut 工程在磁盘上是一个目录（来源：`docs/draft-schema/00-overview.md`）：

```
<draft-id>/
├── draft_content.json   ← Windows CapCut 的正主文件
├── draft_info.json      ← macOS CapCut + 剪映 的正主文件
├── draft_meta_info.json   元数据（名称/封面/时间戳）
├── assets/video|audio|image/   所有导入素材的本地拷贝
└── （其余 sidecar：动画缓存/功能开关/用户设置等，可忽略）
```

**30 秒心智模型**（draft_content.json 顶层）：

```jsonc
{
  "id": "uuid", "name": "项目名",
  "duration": 10000000,        // 微秒！总时间轴长
  "fps": 30,
  "canvas_config": { "width": 1080, "height": 1920, "ratio": "9:16" },
  "platform": { "app_source": "cc" },  // cc=CapCut国际版, lv=剪映
  "tracks": [ /* 轨道数组，数组顺序 = z 序，首元素在最底层 */ ],
  "materials": { "videos": [], "audios": [], "texts": [], ... }
}
```

各平台草稿根目录（来源：`src/store.ts:623-631` + schema 文档）：
- Windows CapCut：`%LOCALAPPDATA%\CapCut\User Data\Projects\com.lveditor.draft\<id>\`
- macOS CapCut：`~/Movies/CapCut/User Data/Projects/com.lveditor.draft/<id>/`
- macOS 剪映：`~/Movies/JianyingPro/User Data/Projects/com.lveditor.draft/<id>/`
- （Windows 剪映在国内是主流，本调研未在源码中单独列出其路径，实操时需实测确认）

## 三、轨道与片段模型（`docs/draft-schema/01`）

**轨道类型**：`video`（视频+图片都放这）、`audio`、`text`（每个文本 segment 恰好挂一个 text material）、`sticker`、`effect`、`filter` 等。`import-srt` 默认走 `text` 轨道而非 `subtitle` 轨道。

**Segment 是统一形状**（`src/draft.ts:38`）：
- `target_timerange {start, duration}` —— 在时间轴上的位置（微秒）
- `source_timerange` —— 素材内部的裁剪窗口（做 trim 就是改它）
- `material_id` —— 指向 materials 里对应素材
- `speed / volume / visible / clip{alpha,rotation,scale,transform}`
- `extra_material_refs[]` —— 挂动画/转场等附加 material

**两个工程细节值得学**：
1. `makeTrack()` 注释明说 **key 顺序是 load-bearing**——草稿比对是字节级的，插入字段必须按剪映自己写出的顺序（`src/draft.ts:57`）。
2. 写入安全三件套（`src/store.ts`）：写前检测剪映进程是否在运行（`editorProcesses`）、多候选文件 `timelineHash` 比对发现 diverged、write_guard 三级（ok/warn/refuse）。原子写用 temp+rename+fsync。

## 四、创建草稿的完整流程（`src/factory.ts`）

`capcut init` → `seedDraftSkeleton()`：不是从零拼 JSON，而是**从内置模板播种**（templates/ 目录），保证字段集合和剪映原生一致；→ `copyAssetDeduped()` 把素材按内容 hash 去重拷入 `assets/`；→ `registerDraftInIndex()` 把新草稿**注册进草稿根目录的索引文件**——这一步是"让剪映在项目列表里看到它"的关键，不注册则剪映不显示（Windows 与 macOS 的索引目标不同，有 `planDraftRegistration/applyDraftRegistration` 两段式设计）。

## 五、命令面（40+ 命令，按组）

- 检查：`info / tracks / materials / lint`（lint 对草稿做结构校验，1470 行的 lint.ts）
- 创建：`init / quickstart / compile`
- 添加：`add-video / add-audio / add-text`
- 编辑：`trim / speed / volume / transitions / masks / 动画`
- 字幕：`caption / import-srt / export-srt / translate`（caption 可 shell-out 调 Whisper 拿词级时间戳，`--script` 传入已知文稿时保留 Whisper 计时、采用文稿措辞——align.ts 做对齐）
- 长转短：`cut / detect-scenes / detect-silence / detect-retakes`
- 自动化：`serve / migrate / doctor / sync-timelines`

默认输出 JSON（可管道给 jq），`-H` 人类可读，`--jianying` 切换剪映枚举命名空间。

## 六、中文（CJK）字幕断句规范（v0.24/v0.25 亮点）

来源：`src/script.ts:19-45`。原文理由：拉丁字母默认 42 字符/行、20 字符/秒；CJK 一个字承载一个音节/词，三分之一长度已满、三分之一速度已快，数值来自流媒体字幕规范：

| 文种 | 每行最大字数 | 每秒最大字数 |
|---|---|---|
| 简体中文 | 16 | 9 |
| 日语 | 13 | 4 |
| 韩语 | 16 | 12 |

v0.25.0 进一步把 CJK 从"按词断句"改为**按字符断句**。文种判定：可见字符中 CJK 占比 ≥50% 才按 CJK 规范（混一行拉丁+一个中文名仍按拉丁算）。

## 七、剪映 6.0+ 加密问题（决策文档精读）

来源：`docs/jianying-encryption.zh-CN.md`（一手）。要点：
- 现象：剪映 6.0+ 的 `draft_content.json` 是 AES 加密二进制，不是明文 JSON。**CapCut 国际版不加密，只有国内剪映加密**。
- 检测方法：文件不以 `{` 开头且不可 JSON.parse → 判加密；以 `{` 开头但解析失败 → 判损坏（两种失败严格区分）。
- 决策：不内置解密器。理由三条：①法律姿态（破解厂商加密 vs 读明文格式是完全不同的风险等级）；②算法在小版本间漂移（pyJianYingDraft #142/#169/#174），解密器是移动靶；③仓库定位是"本地、确定性、可被 Agent 驱动"，脆弱灰产件与之冲突。
- 应对优先级：**锁剪映 5.9.x + 删 update.exe/VEDetector.exe 阻止自动更新 > 改用 CapCut 国际版 > 已加密草稿参考社区方案（不背书）**。
- 该文档还写了"重新评估的绊线"（稳定算法跨两个版本 + 法律清晰 + 有人承诺维护，三者齐备才重议）——这是有条件决策的范本写法。

## 八、工程化做法（值得偷的招）

| 做法 | 说明 |
|---|---|
| 零原生依赖 | 全部 node 内建模块（fs/crypto/child_process），Node ≥18 即跑 |
| 字节级一致性 | key 顺序、BOM 处理（bom.ts）、`-0` 帧修正都有专门处理 |
| fixture 机制 | `capcut fixture` 生成脱敏时间线样本用于回归测试 |
| 安全公告 | README 明示 ≤0.17.0 有命令注入已修复，劝升级 |
| 双语 README | 中文 README 是访问量最高页面之一 |
| Agent 分发 | skills/capcut-edit 目录 + `npx skills add` 一键装进各家 Agent |
| WASM 沙箱 | 只读检查类命令编译成 Wasm Component 经 MCP 暴露，零文件/网络能力 |

---

## 九、对男德项目的建议

结合 video-director 技能（Seedance/MiniMax 出片段）与德塔剧情演出需求：

1. **可行的高价值链路**：`AI 生视频片段 + TTS 音频 + 字幕文本 → capcut-cli 组装成剪映草稿 → 院长在剪映里精修`。这条链路里 AI 只负责素材生产，精剪权留在人手里，与项目"AI 出素材、院长终审"的分工一致。`capcut quickstart <name> --video clip.mp4 --srt captions.srt` 一条命令即可出带字幕的初剪草稿。
2. **前置阻断项——剪映版本**：若院长本机剪映是 6.0+（国内现状大概率是），草稿已是加密格式，此路不通。动手前先跑 `npx capcut-cli doctor` 实测。若要走此路：锁 5.9.x 或改装 CapCut 国际版（需院长裁决，涉及换软件/关自动更新）。
3. **字幕断句数值直接复用**：video-director 技能里若做字幕时长校验，抄 `16字/行、9字/秒` 即可（含 ≥50% CJK 判定），这是流媒体行业规范而非该作者拍脑袋。
4. **不建议引依赖**：男德是 Vue+Express 技术栈，引入 capcut-cli 作为 npm 库（`loadDraft/saveDraft`）在 server 侧调用是可行的，但当前没有"自动组装剪映项目"的已登记需求，**建议先不动手**，若院长裁决要做（可作为需求池新条目），PoC 从 `npx capcut-cli quickstart` 手动跑通开始，验证院长本机剪映版本兼容性后再谈代码集成。
5. **决策文档写法可借鉴**：`docs/jianying-encryption.zh-CN.md` 的"决定+为什么+现状够用的理由+重评绊线"结构，与本项目 ADR-004 一脉相承，可作 ADR 范例参考。

---

## 来源汇总

### 一手来源（官方文档/源码）
- [renezander030/capcut-cli 仓库](https://github.com/renezander030/capcut-cli)（clone 至本地直读源码，2026-09-20，v0.25.0）
- 仓库内文档：`README.zh-CN.md`、`docs/draft-schema/00-05`、`docs/jianying-encryption.zh-CN.md`、`src/time.ts`、`src/store.ts`、`src/draft.ts`、`src/factory.ts`、`src/script.ts`、`src/decrypt.ts`

### 二手来源（社区讨论，仅加密问题背景）
- pyJianYingDraft issues #142/#169/#174（剪映加密算法漂移记录，capcut-cli 决策文档内引用）
