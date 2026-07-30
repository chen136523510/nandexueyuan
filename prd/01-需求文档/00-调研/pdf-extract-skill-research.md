# PDF 处理技能调研（中文乱码 PDF 提取）

> 调研时间：2026-07-30
> 调研人：ZCode（AI）
> 触发原因：火山方舟《图片生成 API》PDF 用 pdftotext 提取中文乱码，需找一个能让 AI 正确处理中文 PDF 的方案并封装为 ZCode Skill
> 关联：火山 PDF 位于 `prd/01-需求文档/00-调研/火山方舟_图片生成 API_1784604808.pdf`

---

## 一、结论（TL;DR）

**乱码根因**：火山 PDF 嵌入字体缺少 ToUnicode CMap 映射。所有走「PDF 文本层」的工具（pdftotext / pypdf / pdfplumber / pdfminer / markitdown 默认引擎）都会遇到相同乱码。**只有基于图像的 OCR 方案能绕过**——它识别的是渲染后的页面图像，不读文本层。

**首选方案**：`docling + RapidOCR`（纯 CPU，IBM 出品 64k star）。`--force-ocr` 直接绕过字体编码问题，RapidOCR 基于 ONNX 无需 GPU，CLI 一条命令出 Markdown，pip 安装轻量，天然适合封装为 Skill。

---

## 二、乱码根因分析

| 层面 | 说明 |
|---|---|
| 现象 | pdftotext 提取火山 PDF，英文/数字/参数名正常，中文变成空白或乱码 |
| 根因 | PDF 嵌入字体无 ToUnicode CMap 映射（字体子集化时丢失了字符→Unicode 的反向映射表） |
| 影响范围 | 所有「读文本层」的工具全失效：pdftotext、pypdf、pdfplumber、pdfminer.six、markitdown 默认引擎、本地已装的 `document-skills:pdf` 的 `extract.text`（走 pdfplumber） |
| 唯一出路 | OCR 方案——把 PDF 页面渲染成图像，用 OCR 识别图像上的文字，完全绕过文本层 |

---

## 三、方案对比

| 项目 | URL | Star | 中文支持 | 机制 | 纯CPU | 部署难度 | 表格/版面 | 适合做Skill |
|------|-----|------|---------|------|-------|---------|----------|-------------|
| **docling** | github.com/DS4SD/docling | 64k | ✅ 可指定chi_sim | 解析+可force-ocr | ✅ RapidOCR/Tesseract | 低 pip一条命令 | 强 HTML表格 | ⭐非常适合 CLI极简 |
| MinerU | github.com/opendatalab/MinerU | 76k | ⭐最佳(中文专用模型) | OCR+解析双引擎 | ✅ pipeline模式 | 中 依赖重 | 强 | 适合 CLI完善 |
| marker | github.com/VikParuchuri/marker | 38k | ✅ | VLM(surya) | fast模式可但走文本层对乱码无效 | 中 需PyTorch | 强 | 适合但无GPU打折 |
| PaddleOCR | github.com/PaddlePaddle/PaddleOCR | 86.5k | ⭐母语级 | OCR | ✅ | 中 | 需配合版面模型 | 需自己封装 |
| RapidOCR | github.com/RapidAI/RapidOCR | 7.3k | ✅ 中英默认 | OCR | ✅ 主打 | 低 ONNX | 无 | 仅OCR需配合渲染 |
| markitdown | github.com/microsoft/markitdown | 170k | 未明确 | 默认走文本层 | ✅ | 低 | 弱 | ❌对乱码PDF无效 |
| olmOCR | github.com/allenai/olmocr | 19.2k | 偏英文 | VLM(7B) | ❌ 强制12GB+GPU | 高 | 强 | ❌需GPU |
| 本地 document-skills:pdf | 已装 | - | CJK | extract.text走pdfplumber文本层 | ✅ | - | 强 | ❌同样会乱码 |

### 关于「Claude Skill 形式 PDF 工具」专项结论
GitHub 上的 `book-to-skill`、`graphify` 等项目本质是「把 PDF 内容转成 Claude 可用知识索引」，**底层提取仍依赖 pdftotext/pypdf/docling**，无法解决字体编码乱码。它们解决的是「提取后如何组织」，而非「如何正确提取」。因此需自行引入 OCR 引擎再封装。

---

## 四、环境约束（关键）

白机环境探测结果：
- ❌ 无系统 Python（python / python3 / py launcher 均不存在）
- ❌ 无 conda
- ✅ **已装 `uv`**（`C:\Users\chenzj\.local\bin\uv.exe`，现代化 Python 包管理器，能自动管理 Python 解释器）

→ 用 `uv` 安装最优：`uv` 自动下载独立 Python 解释器 + 依赖，不污染系统环境，无需手动装 Python。

---

## 五、落地设计：封装 pdf-extract Skill

### 5.1 安装（基于 uv，纯 CPU）

```bash
# uv 自动管理 Python 解释器，用 uv tool 安装 docling 为全局工具
uv tool install docling
# RapidOCR 引擎（纯 CPU ONNX，docling 调用）
uv pip install rapidocr_onnxruntime
```

验证：
```bash
docling test.pdf --force-ocr --ocr-engine rapidocr --ocr-lang chi_sim,eng --to md
```

### 5.2 Skill 目录结构

```
.zcode/skills/pdf-extract/
├── SKILL.md          # 技能定义（触发条件+调用流程）
```

### 5.3 SKILL.md 触发词
- "提取PDF" / "PDF提取" / "PDF转文本" / "PDF转markdown"
- "PDF乱码" / "PDF中文乱码"
- "/pdf-extract <pdf路径>"

### 5.4 核心命令
```bash
docling "<PDF路径>" --force-ocr --ocr-engine rapidocr --ocr-lang chi_sim,eng --to md --output "<输出目录>"
```
- `--force-ocr`：强制 OCR，忽略原有乱码文本层
- `--ocr-engine rapidocr`：纯 CPU
- `--ocr-lang chi_sim,eng`：中文简体+英文
- `--to md`：输出 Markdown（保留版面/表格/标题结构）

### 5.5 降级链（Skill 内容逻辑）
1. 首选：`docling --force-ocr --ocr-engine rapidocr`
2. 降级1：`docling --force-ocr --ocr-engine tesseract`（需系统 tesseract + 中文语言包）
3. 降级2：PyMuPDF 渲染页面为图 + RapidOCR 识别（纯 Python 组合，需自写脚本）
4. 中文准确度不足时：换 MinerU pipeline 模式（中文专用模型）

---

## 六、关键设计决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 提取引擎 | docling | CLI 最简，force-ocr 根治乱码，pip 一条命令 |
| OCR 引擎 | RapidOCR | 纯 CPU ONNX，无需 GPU，中英默认 |
| 输出格式 | Markdown | 保留版面/表格/标题，适合 AI 后续处理 |
| 包管理器 | uv | 白机无 Python，uv 自动管理解释器不污染系统 |
| 不用 MinerU | 备选 | 依赖更重（PaddleOCR全家桶），docling 更轻量；中文不够理想再切 |
| 不用 markitdown | 排除 | 默认走文本层，对乱码 PDF 无效；OCR 需接云端 LLM 不符离线需求 |
| 不用 olmOCR | 排除 | 强制 12GB+ GPU |
| 不用本地 document-skills:pdf 的 extract.text | 排除 | 走 pdfplumber 文本层，同样会乱码 |

---

## 七、待验证项

1. **docling 在纯 CPU 下的中文识别准确率**：火山 PDF 含大量中文说明 + 表格，需实测 force-ocr 效果。若不足则切 MinerU。
2. **首次模型下载体积**：RapidOCR/OCR 模型约几十~上百 MB，首次运行下载。
3. **处理速度**：纯 CPU 约 1-5 秒/页，对单份 API 文档可接受。
