# SillyTavern 角色卡 / 世界书制作手册

> 本手册记录 ST 1.18 的角色卡/世界书制作流程，已在「德塔世界观创作」项目中验证通过。

## 一、角色卡：必须是 PNG 格式

### 1.1 核心规则

ST 的角色列表**只扫描 `.png` 文件**（源码 `src/endpoints/characters.js:1466`）。
角色卡数据（角色名、人设、开场白等）以 base64 编码嵌在 PNG 图片的 `chara` tEXt chunk 里。
**纯 `.json` 文件会被忽略，角色列表不显示。**

这是 SillyTavern Character Card v2/v3 标准（spec: `chara_card_v2` / `chara_card_v3`）。

### 1.2 生成方法：用 ST 自带的 write 函数

ST 源码自带 `src/character-card-parser.js`，导出 `write()` / `read()` / `parse()` 三个函数。
**用 `write()` 生成角色卡是最可靠的方式**，保证与 ST 解析逻辑 100% 兼容。

```javascript
import { write, read } from 'file:///E:/ai/SillyTavern%20Launcher%20GUI/data/sillytavern/1.18.0/src/character-card-parser.js';
import fs from 'fs';

// 1. 构造角色卡 JSON（chara_card_v2 格式）
const cardData = {
  spec: 'chara_card_v2',
  spec_version: '2.0',
  data: {
    name: '角色名',
    description: '人设描述',
    personality: '性格',
    scenario: '场景',
    first_mes: '开场白',
    mes_example: '',
    creator_notes: '创作者备注',
    system_prompt: '',
    post_history_instructions: '',
    tags: ['标签1', '标签2'],
    creator: '创作者',
    character_version: '1.0',
    alternate_greetings: [],
    extensions: {}
  }
};

// 2. 读一张载体 PNG（任意 ST 角色目录下的 .png 都行）
const carrier = fs.readFileSync('载体图片.png');

// 3. 用 ST write 函数注入（自动处理 chara/ccv3 chunk + 移除旧 chunk）
const pngWithCard = write(carrier, JSON.stringify(cardData));

// 4. 写入 ST 角色目录
fs.writeFileSync('角色目录/角色名.png', pngWithCard);

// 5. 用 read 函数回读验证
const decoded = JSON.parse(read(pngWithCard));
console.log('验证: ' + decoded.data.name);
```

> `write()` 会同时生成 v2（`chara`）和 v3（`ccv3`）两个 chunk，ST 读取时 v3 优先。

### 1.3 注意事项

- **载体 PNG**：用 ST 自带的 `default_Assistant.png` 即可（一张占位图）。
- **不要手动构造 PNG chunk**：CRC32、chunk 边界容易出错，直接用 ST 的 write 函数。
- **文件名**：`角色名.png`，放在 `data/<user>/characters/` 目录下。
- **图片本身**：write 不改变载体图片的像素内容，如需自定义角色立绘，先替换载体 PNG。

---

## 二、世界书：直接用 JSON 格式

### 2.1 核心规则

ST 世界书**直接读 `.json` 文件**（源码 `src/endpoints/worldinfo.js:42-43`）。
放在 `data/<user>/worlds/` 目录下，无需任何转换。

### 2.2 JSON 结构

```json
{
  "name": "世界书名称",
  "entries": {
    "0": {
      "uid": 0,
      "key": ["关键词1", "关键词2"],
      "keysecondary": [""],
      "comment": "条目标题",
      "content": "触发后注入提示词的正文内容",
      "constant": false,
      "vectorized": false,
      "selective": true,
      "selectiveLogic": 0,
      "addMemo": true,
      "order": 100,
      "position": 0,
      "disable": false,
      "probability": 100,
      "useProbability": true,
      "depth": 4,
      "group": "",
      "groupOverride": false,
      "groupWeight": 100,
      "role": null
    },
    "1": { ... }
  }
}
```

### 2.3 关键字段说明

| 字段 | 含义 |
|------|------|
| `key` | 触发关键词数组，对话中出现这些词时注入该条目 |
| `content` | 注入到提示词的正文 |
| `constant` | true=常驻（始终注入），false=按关键词触发 |
| `selective` | 是否启用选择性触发逻辑 |
| `order` | 注入优先级（数字越小越先） |
| `position` | 注入位置（0=角色定义前，1=角色定义后） |
| `disable` | true=禁用该条目 |
| `depth` | 注入深度（从最新消息往回数第几条） |

### 2.4 注意事项

- `entries` 是**对象**（key 为数字字符串 "0"、"1"...），不是数组。
- 对比已有世界书（如 `Eldoria.json`）可确认完整字段。
- 缺少部分字段不影响加载（ST 有默认值），但 `uid`/`key`/`content` 必须有。

---

## 三、ST 配置：Custom 端点接入第三方 API

### 3.1 三处配置位置

| 位置 | 文件 | 作用 |
|------|------|------|
| 当前生效配置 | `data/<user>/settings.json` → `oai_settings` | ST 启动时实际使用的配置 |
| 可切换预设 | `data/<user>/OpenAI Settings/<预设名>.json` | UI 中可切换的预设（选中后覆盖 oai_settings） |
| API 密钥 | `data/<user>/secrets.json` → `api_key_custom` | 密钥存储（支持多条，active 的生效） |

### 3.2 Custom 端点关键参数

```json
{
  "oai_settings": {
    "chat_completion_source": "custom",
    "custom_url": "https://api.deepseek.com/v1/chat/completions",
    "custom_model": "deepseek-v4-pro",
    "openai_max_tokens": 8192
  }
}
```

> **custom_url 必须是完整请求地址**，ST 后端（`chat-completions.js:2305`）直接透传，不自动追加 `/chat/completions`。

### 3.3 secrets.json 多密钥管理

```json
{
  "api_key_custom": [
    { "value": "sk-xxx", "label": "密钥1", "active": false },
    { "value": "sk-yyy", "label": "密钥2", "active": true }
  ]
}
```

`active=true` 的那条生效。切换密钥时把旧的设 false、新的设 true。

---

## 四、ST 启动方式

### 4.1 命令行启动（必须带 dataRoot）

```bash
cd "E:/ai/SillyTavern Launcher GUI/data/sillytavern/1.18.0"
node server.js --dataRoot "E:/ai/SillyTavern Launcher GUI/data/st_data"
```

> **不加 `--dataRoot` 会用默认 `./data`，导致读取空数据目录，覆盖已有配置！**

### 4.2 config.yaml 端口问题

ST 启动日志 `Using config path: ./config.yaml`——config 路径是相对 cwd（本体目录），
不受 `--dataRoot` 影响。本体目录的 `config.yaml` 决定实际监听端口。

如需改端口，改**本体目录**的 config.yaml，不是 st_data 里的。

---

## 五、推理模型注意事项（deepseek-v4-pro 等）

### 5.1 流式输出字段差异

推理模型流式输出有两个字段：
- `delta.reasoning_content`：思考过程（ST 自动隐藏，不展示给用户）
- `delta.content`：正式回复（展示给用户）

### 5.2 max_tokens 要给足

推理模型的思考过程也算 token。max_tokens 太小会导致思考过程吃光额度、正式回复为空。
建议 `openai_max_tokens ≥ 4096`，复杂创作任务设 8192。

### 5.3 非流式调用的 token 用量

```json
{
  "completion_tokens": 118,
  "prompt_tokens_details": { "cached_tokens": 0 },
  "completion_tokens_details": { "reasoning_tokens": 87 }
}
```

`reasoning_tokens` 是思考过程的 token 数，包含在 `completion_tokens` 里。
