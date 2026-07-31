# 火山引擎图像背景移除 API 调研

> 版本：v1 | 日期：2026-07-31 | 调研人：陈梓键（院长）+ 白机落档
> 状态：✅ go/no-go 通过（定价确认 + Key 通用确认）
> 关联：替代 jimp floodfill 手写抠图方案（见德塔踩坑记录抠图相关 6 条坑）

---

## 一、背景

当前立绘抠图用 jimp floodfill + erode + 空洞填补的手写方案，效果差且踩坑无数：

| 踩坑 | 问题 |
|------|------|
| floodfill queue.shift() 性能陷阱 | O(n) 百万级队列卡住，改栈 O(1) |
| 抠图 resize 插值破坏 alpha | resize 产生半透明像素，erode 要补两次 |
| 白底冲突白衬衫 | 空洞 65% |
| 黑底冲突黑头发 | 空洞 79% |
| 渐变背景 floodfill 撞墙 | 无法扩散，改阈值法 |
| 发丝/复杂边缘灰边 | erode 处理不够精细 |

院长找到火山引擎智能处理的**图像背景移除 API**（语义级抠图），可根治以上全部问题。

---

## 二、API 概要

| 项 | 内容 |
|---|---|
| **端点** | `POST https://mediakit.cn-beijing.volces.com/api/v1/tools-sync/remove-image-background` |
| **类型** | 同步接口（提交即返回结果 URL，无需轮询） |
| **鉴权** | `Authorization: Bearer {Access Key}`，Header 格式 |
| **输入** | `image_url`（公网 HTTP/HTTPS URL / 本地上传 `mediakit://` / 对象存储 `tos://`） |
| **输出** | 透明背景 PNG 的下载 URL（有效期 24 小时，需及时保存） |
| **支持格式** | png / jpg / heic，单张 ≤ 10MB |

### 三种抠图场景（scene 参数）

| scene | 用途 | 我们的选择 |
|-------|------|-----------|
| `general` | 通用主体抠图（不确定分类） | 备选 |
| `human` | 人像抠图（仅抠人像主体） | ✅ **立绘首选**（角色都是人像） |
| `product` | 商品抠图 | 不适用 |

### 可选增强参数

| 参数 | 作用 | 默认 | 我们用 |
|------|------|------|--------|
| `need_contour` | 主体描边 | false | 可选 true（防白底融入背景） |
| `contour_color` | 描边颜色（十六进制RGB） | #FFFFFF | - |
| `contour_size` | 描边宽度（px，1~100） | 10 | - |
| `need_crop_background` | 裁剪透明背景到刚好包裹主体 | false | false（保持原尺寸） |
| `output_format` | 输出格式 png/jpeg/webp | png | ✅ png（透明背景） |

---

## 三、定价

| 项 | 值 |
|---|---|
| 基准单价 | 0.069 元/千次 |
| 计费换算系数 | 20（图像背景移除） |
| **实际单价** | **1.38 元/千次（约 0.00138 元/次）** |

极便宜。按 9 角色 × 4 表情 = 36 张立绘计算，全部重抠仅需 **约 0.05 元**。

---

## 四、Key 确认

- Key 类型：**字节 Access Key**（非 ARK_API_KEY，但同一套火山引擎账号体系）
- 通用性：火山引擎全产品线通用（MediaKit / 方舟 / 对象存储等）
- 获取方式：火山引擎控制台 -> 账号 -> Access Key 管理
- `.env` 存储变量名建议：`VOLC_ACCESS_KEY`（与 `ARK_API_KEY` 区分，虽然值可能相同）

---

## 五、调用示例

### 人像抠图（立绘标准调用）

```bash
curl -X POST 'https://mediakit.cn-beijing.volces.com/api/v1/tools-sync/remove-image-background' \
  -H 'Authorization: Bearer {Access_Key}' \
  -H 'Content-Type: application/json' \
  -d '{
    "image_url": "https://example.com/portrait.jpg",
    "scene": "human",
    "output_format": "png"
  }'
```

### 成功响应

```json
{
  "success": true,
  "task_id": "amk-tool-remove-image-background-1716289900",
  "request_id": "20240521183140AABBCCDDEEFF778899",
  "result": {
    "image_url": "https://output.volcvideo.com/removed_bg_image.png?auth_key=...",
    "image_size": 45875,
    "image_format": "png",
    "image_width": 800,
    "image_height": 600
  }
}
```

> ⚠️ `result.image_url` 有效期 24 小时，必须及时下载保存到本地。

---

## 六、对比结论

| 维度 | jimp floodfill（现状） | 火山 API |
|------|----------------------|---------|
| 发丝/复杂边缘 | ❌ 差（灰边、空洞） | ✅ 语义级抠图，发丝级精度 |
| 白衬衫/黑头发冲突 | ❌ 需手调阈值 | ✅ 语义识别，无颜色冲突 |
| 渐变背景 | ❌ floodfill 撞墙 | ✅ 无此问题 |
| 处理流程 | 多步（floodfill→erode→空洞填补→resize补erode） | 一步（提交URL→拿结果URL→下载） |
| 成本 | 免费 | 0.0014 元/张（可忽略） |
| 依赖 | 本地 node 脚本 | 联网 API |
| 稳定性 | 低（踩坑6条） | 高（官方语义模型） |

**结论：用火山 API 替代 jimp 手写抠图，彻底退役 floodfill 方案。**

---

## 七、实施计划（交接黑机）

> ⚠️ 抠图是黑机的活（AGENTS.md 红线：白机不处理美工）。以下为交接清单。

1. **确认 Access Key 可用**：用控制台 Access Key 调一次 human 场景测试，确认返回透明 PNG
2. **写调用脚本**：参考 image-gen 技能的脚本风格，输入原图 URL → 调 API → 下载结果 PNG
3. **重抠全部立绘**：见/幸/添 7 套表情差分（dean 3 + xing 4 + tian 1），用 human 场景重抠
4. **替换正式资产**：覆盖 `public/visualnovel/portraits/{角色}/{表情}.png`
5. **对比验收**：新旧立绘对比，确认发丝/边缘/空洞问题消除
6. **退役 jimp 脚本**：floodfill 相关脚本移入 `.ai/` 归档，不再使用

### 输入图来源

当前立绘原图在黑机本地 `.ai/seedream-test/` 或 `美术资产/` 目录（纯色背景的 Seedream 出图）。
需先把原图上传到可公网访问的 URL（或用 `mediakit://` 本地上传协议）。
