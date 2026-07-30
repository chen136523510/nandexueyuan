---
name: pdf-extract
description: 中文PDF文本提取。当用户说"提取PDF"、"PDF提取"、"PDF转文本"、"PDF转markdown"、"PDF乱码"、"PDF中文乱码"、"/pdf-extract"时触发。用docling全页OCR(RapidOCR引擎,纯CPU)绕过PDF字体编码问题,把乱码PDF转成干净的Markdown,保留版面/表格/标题结构。
---

# PDF Extract - 中文 PDF 文本提取器

你是一个 PDF 文本提取专家。用 docling 的全页 OCR 模式（RapidOCR 引擎，纯 CPU）绕过 PDF 字体编码问题，把乱码 PDF 转成干净的 Markdown。

## 适用场景

当 PDF 用常规工具（pdftotext / pypdf / pdfplumber）提取出**乱码**时（典型表现：英文/数字正常，中文变空白或乱码），根因是 PDF 嵌入字体缺少 ToUnicode CMap 映射。本技能用 OCR 识别渲染后的页面图像，完全绕过文本层，根治乱码。

## 环境依赖

本技能依赖 docling（已通过 `uv tool install docling --with onnxruntime` 安装为全局工具）。
- 包管理器：uv（白机已装 `C:\Users\chenzj\.local\bin\uv.exe`）
- docling CLI 位置：`C:\Users\chenzj\.local\bin\docling.exe`
- 纯 CPU，无需 GPU；RapidOCR 基于 ONNX

若 docling 未安装（`docling --help` 无输出），执行：
```bash
uv tool install docling --with onnxruntime
```
> ⚠️ 必须带 `--with onnxruntime`，否则 RapidOCR 报 `ImportError: onnxruntime is not installed`（已踩坑）。

## 触发条件

- "提取PDF" / "PDF提取" / "PDF转文本" / "PDF转markdown" / "PDF乱码" / "PDF中文乱码"
- "/pdf-extract <pdf路径>"

## 工作流

### Step 1: 确认输入 PDF 路径

从用户消息或 `/pdf-extract` 参数获取 PDF 的绝对路径。

### Step 2: 处理路径陷阱（关键踩坑点）

**Windows 路径含空格或中文时，docling CLI 会报 `OSError: [Errno 22] Invalid argument`**（cmd 转义截断路径）。必须先把 PDF 复制成无空格的纯英文临时文件名：

```bash
# 在 Git Bash 中（本项目默认 shell）
mkdir -p .ai/pdf-extract-tmp
cp "<原始含空格/中文路径>" ".ai/pdf-extract-tmp/input.pdf"
```

> 若路径本身无空格无中文，可跳过此步直接用原路径。

### Step 3: 执行 OCR 提取

```bash
cmd //c "docling convert .ai\pdf-extract-tmp\input.pdf --to md --ocr-mode full_page --ocr-engine rapidocr --ocr-lang ch --output .ai\pdf-extract-tmp"
```

参数说明：
- `--to md`：输出 Markdown（保留版面/表格/标题结构；也支持 json/html/text）
- `--ocr-mode full_page`：全页 OCR，强制忽略原有（可能乱码的）文本层。⚠️ 注意旧版文档写的 `--force-ocr` 在 docling 2.116+ 已废弃，改用 `--ocr-mode full_page`
- `--ocr-engine rapidocr`：纯 CPU 的 RapidOCR 引擎（基于 ONNX，无需 GPU）
- `--ocr-lang ch`：中文（RapidOCR 默认中英，ch 即可）
- `--output <目录>`：输出目录

**性能预期**：
- 首次运行会下载 OCR 模型（PP-OCRv6 检测/识别 + 版面模型，约几百 MB），之后走缓存
- 纯 CPU 处理速度约 1-5 秒/页（实测 4.6MB/11 页火山 PDF 约 5 分钟，含首次模型加载）
- 建议用 `timeout: 600000`（10 分钟）防止超时

### Step 4: 读取并返回结果

提取完成后，Markdown 输出到 `<output目录>/<文件名>.md`。读取该文件内容返回给用户。

**注意**：docling 默认把 PDF 内图片以 base64 内嵌进 Markdown，文件可能很大（含大量 base64）。阅读时用 `grep -v "^!\[Image\]"` 过滤掉图片行，只看文本内容，避免输出爆炸。

```bash
grep -v "^!\[Image\]" .ai/pdf-extract-tmp/input.md | grep -v "^$" | head -100
```

### Step 5: 清理临时文件

提取完成、用户确认无误后，删除临时文件：
```bash
rm -rf .ai/pdf-extract-tmp
```

## 降级链

若 `--ocr-engine rapidocr` 失败，按顺序尝试：

1. **首选**：`--ocr-engine rapidocr --ocr-lang ch`（纯 CPU，已验证可用）
2. **降级1**：`--ocr-engine tesserocr`（需系统装 Tesseract + 中文语言包 chi_sim）
3. **降级2**：中文准确度不足时，换 MinerU（`uv tool install magic-pdf`，pipeline 模式，中文专用模型准确率更高但依赖更重）
4. **最终兜底**：PyMuPDF 渲染每页为 PNG + RapidOCR 逐页识别（纯 Python 组合，需自写脚本）

## 边界约束

| 约束 | 要求 |
|------|------|
| **纯 CPU 优先** | 本项目白机无 GPU，OCR 必须走 CPU 方案（RapidOCR/MinerU-pipeline） |
| **路径陷阱** | 含空格/中文路径必须先复制成纯英文临时名（Step 2） |
| **图片过滤** | 读取 Markdown 时过滤 base64 图片行，避免输出爆炸 |
| **超时设置** | 首次运行含模型下载，工具调用 timeout 设 ≥ 600000ms |
| **不入库** | 提取产物（`.ai/pdf-extract-tmp/`）属临时文件，不提交 git（已被 gitignore 的 `.ai/` 规则覆盖则无需处理） |
