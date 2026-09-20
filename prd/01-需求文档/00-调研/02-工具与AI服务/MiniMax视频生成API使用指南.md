# MiniMax 视频生成 API 使用指南（Hailuo-03 / MiniMax-H3）

> 来源：MiniMax 开放平台官方文档（https://platform.minimaxi.com）
> 整理时间：2026-08-09
> 原始文件：`minimaxAPI使用指南.txt`（官方页面复制，含 6 次重复，已去重整理）

---

## 一、接口概览

| 项目 | 内容 |
|------|------|
| **接口** | `POST https://api.minimaxi.com/v2/video_generation` |
| **模型** | `MiniMax-H3`（Hailuo-03） |
| **认证** | `Authorization: Bearer <API_key>`（[接口密钥页面](https://platform.minimaxi.com/user-center/basic-information/interface-key)） |
| **Content-Type** | `application/json` |
| **模式** | 异步——创建成功返回 `task_id`，需轮询[查询任务](#七查询任务)接口获取结果 |
| **能力** | 文生视频 / 图生视频（首帧/尾帧/首尾帧）/ 多模态参考生视频，2K 直出 |

---

## 二、请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| `model` | string | ✅ | 模型名称，当前可用值：`MiniMax-H3` |
| `content` | array | ✅ | 多模态输入内容数组（详见第三节） |
| `resolution` | string | ✅ | 分辨率：`768P` / `2K` |
| `duration` | integer | ✅ | 视频时长（秒）：`4`~`15` |
| `ratio` | string | ❌ | 宽高比（详见第四节） |
| `callback_url` | string | ❌ | 任务状态变更回调地址（详见第六节） |
| `aigc_watermark` | boolean | ❌ | 是否添加 AIGC 水印，默认 `false` |

---

## 三、content 多模态输入数组

每个元素通过 `type` 区分类型，通过 `role` 标注用途。**每次请求必须包含一个非空 `text` 项（prompt 必填）**。

### 3.1 支持的生成场景

| 场景 | content 组合 |
|------|-------------|
| **文生视频（t2va）** | 仅一个 `text` 元素 |
| **图生视频-首帧（i2va）** | `text` + 1 张 `image_url`（`role=first_frame` 或不填） |
| **图生视频-尾帧** | `text` + 1 张 `image_url`（`role=last_frame`） |
| **图生视频-首尾帧** | `text` + 2 张 `image_url`（`first_frame` + `last_frame`） |
| **多模态参考生视频（r2va）** | `text` + 参考图片 / 参考视频 / 参考音频的组合 |

> ⚠️ **图生视频与多模态参考生视频互斥**：content 中出现 `reference_image` / `reference_video` / `reference_audio` 任一 role，就不能再出现 `first_frame` / `last_frame`（反之亦然）。

### 3.2 ContentItem 结构

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | string | `text` / `image_url` / `video_url` / `audio_url` |
| `text` | string | 文本提示词（**必填**），最多 7000 字符 |
| `image_url.url` | string | 图片地址：公网 URL / `mm_file://{file_id}` / `data:image/<格式>;base64,<Base64>` |
| `video_url.url` | string | 视频地址：公网 URL / `mm_file://{file_id}` / `data:video/mp4;base64,<Base64>` |
| `audio_url.url` | string | 音频地址：公网 URL / `mm_file://{file_id}` / `data:audio/<格式>;base64,<Base64>` |
| `role` | string | `first_frame` / `last_frame` / `reference_image` / `reference_video` / `reference_audio` |

### 3.3 输入媒体限制（请求体总大小 ≤ 64 MB，大文件请用公网 URL）

**图片 `image_url`：**

| 项 | 限制 |
|------|------|
| 格式 | JPG、JPEG、PNG、WEBP、HEIC、HEIF |
| 单文件大小 | ≤ 30 MB |
| 宽高范围 | [256, 5760] px |
| 长宽比（宽/高） | [0.4, 2.5] |
| 数量 | 首帧 ≤ 1、尾帧 ≤ 1、参考图 ≤ 9 |

**视频 `video_url`（仅多模态参考场景）：**

| 项 | 限制 |
|------|------|
| 容器/格式 | MP4（`.mp4`）、MOV（`.mov`） |
| 编码 | 视频 H.264/AVC、H.265/HEVC；音频 AAC、MP3 |
| 单文件大小 | ≤ 50 MB |
| 个数 | ≤ 3 |
| 单段时长 | [2, 15] s；总时长 ≤ 15 s |
| 宽高范围 | [256, 5760] px |
| 帧率 | [23.976, 60] |

**音频 `audio_url`（仅多模态参考场景）：**

| 项 | 限制 |
|------|------|
| 格式 | WAV、MP3 |
| 单文件大小 | ≤ 15 MB |
| 个数 | ≤ 3 |
| 单段时长 | [2, 15] s；总时长 ≤ 15 s |

---

## 四、ratio 宽高比规则

默认 `adaptive`（由输入自适应）。可用值：`adaptive`、`21:9`、`16:9`、`4:3`、`1:1`、`3:4`、`9:16`。

| 场景 | ratio 规则 |
|------|-----------|
| **文生视频（t2va）** | **必填**，且不能为 `adaptive` |
| **图生视频（i2va）** | 恒为 `adaptive`（由输入图片决定，传其他值会被忽略） |
| **多模态参考生视频（r2va）** | 可选，默认 `adaptive`，也可显式指定 |

---

## 五、请求示例

### 5.1 文生视频（t2va）

```json
{
  "model": "MiniMax-H3",
  "content": [
    {
      "type": "text",
      "text": "史诗级太空歌剧院线预告：女舰长独自站在巨大观景窗前，最后一支舰队正在集结并跃迁离去，强光爆闪、舰桥震动，她被留在原地。"
    }
  ],
  "resolution": "2K",
  "duration": 5,
  "ratio": "16:9"
}
```

### 5.2 图生视频（i2va）—— 项目核心场景（用丘立绘做首帧）

```json
{
  "model": "MiniMax-H3",
  "content": [
    {
      "type": "text",
      "text": "Pull focus to the people in the background and add more steam to the ramen bowl."
    },
    {
      "type": "image_url",
      "image_url": {
        "url": "https://cdn.example.com/your-image.png"
      },
      "role": "first_frame"
    }
  ],
  "resolution": "2K",
  "duration": 5,
  "ratio": "adaptive"
}
```

### 5.3 多模态参考生视频（r2va）

```json
{
  "model": "MiniMax-H3",
  "content": [
    {
      "type": "text",
      "text": "角色说话：Follow the wind, live free. Leave worries behind, enjoy the moment，音色参考音频1"
    },
    {
      "type": "video_url",
      "video_url": { "url": "https://cdn.example.com/reference.mp4" },
      "role": "reference_video"
    },
    {
      "type": "audio_url",
      "audio_url": { "url": "https://cdn.example.com/voice.mp3" },
      "role": "reference_audio"
    }
  ],
  "resolution": "2K",
  "duration": 5,
  "ratio": "adaptive"
}
```

---

## 六、回调通知（callback_url）

配置后 MiniMax 先发送含 `challenge` 字段的验证请求（需 3 秒内原样返回 `challenge` 完成验证），验证成功后每当任务状态变更即 POST 推送。

回调 `status` 取值：

| status | 含义 |
|--------|------|
| `queued` | 排队中 |
| `running` | 运行中 |
| `succeeded` | 成功 |
| `failed` | 失败 |
| `cancelled` | 已取消 |

---

## 七、查询任务

创建成功后返回 `task_id`，通过查询接口轮询：

**查询任务成功响应示例：**

```json
{
  "task": {
    "id": "424010985738629",
    "model": "MiniMax-H3",
    "status": "succeeded",
    "created_at": 1785125529,
    "updated_at": 1785125946,
    "content": {
      "url": "https://your-cdn.example.com/h3-generated-2k-output.mp4"
    },
    "resolution": "2K",
    "duration": 5,
    "usage": {
      "total_seconds": 5,
      "input_seconds": 0,
      "output_seconds": 5,
      "input_image_count": 0
    },
    "ratio": "16:9",
    "task_type": "generation",
    "modality": "video"
  }
}
```

创建接口的响应（仅返回 task_id）：

```json
{
  "task_id": "424010985738629"
}
```

> ⚠️ 查询任务的接口路径在原文档中引用为 `/api-reference/video-generation-v2-query`，具体 endpoint 需在平台文档确认。

---

## 八、错误码

| HTTP | 错误类型 | 内部码 | 含义 |
|------|---------|--------|------|
| 400 | `bad_request_error` | 2013 | 参数错误（如 content 缺少非空 text） |
| 401 | `authorized_error` | 1004 | 鉴权失败（未携带 API key） |
| 402 | `insufficient_balance_error` | 1008 | 余额/额度不足 |
| 422 | `unprocessable_entity_error` | 1026 | 输入涉及敏感内容 |
| 429 | `rate_limit_error` | 1002 | 触发限流 |
| 500 | `server_error` | 1000 | 服务端错误 |

错误响应结构（OpenAI 风格）：

```json
{
  "type": "error",
  "error": {
    "type": "bad_request_error",
    "message": "invalid params, content must include a non-empty text item (prompt is required) (2013)",
    "http_code": "400"
  },
  "request_id": "021785229015510a2c883cf675b9804d"
}
```

---

## 九、对项目的使用建议

项目当前用 MiniMax H3 生成国会事变 CG 视频，核心使用场景是**图生视频（i2va）**——用丘的立绘（`qiu/rogue.webp`）做 `first_frame`，提示词专注运动描述（详见 `提示词工程调研-图片与视频生成.md` 第三章）。

调用流程：
1. 准备首帧图片（公网 URL 或 base64 data URI）
2. 写中文自然语言提示词（运动描述为主，≤ 7000 字符）
3. `POST /v2/video_generation` 创建任务，拿 `task_id`
4. 轮询查询接口，`status=succeeded` 后从 `content.url` 下载视频
