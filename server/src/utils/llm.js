/**
 * LLM 客户端封装（火山引擎方舟 ARK，OpenAI 兼容协议）
 * 通过 fetch 调用，无需额外 SDK 依赖
 */

const BASE_URL = process.env.VOLC_BASE_URL || 'https://ark.cn-beijing.volces.com/api/coding/v3'
const API_KEY = process.env.VOLC_API_KEY
const MODEL = process.env.VOLC_MODEL || 'glm-5.3-flash'
const TIMEOUT_MS = 60000 // 60 秒超时（实测秒级返回，留足余量）

// ========== 温度常量（集中管理，各调用点引用，避免散落硬编码）==========
export const TEMPS = {
  PLANNING: 0, // 规划阶段：确定性输出 JSON 任务列表
  ANALYSIS: 0.5, // 分析阶段：基于检索数据推理回答
  CHAT: 0.7, // 纯闲聊：灵活自然的对话
  FEEDBACK: 0, // 反馈结构化生成：确定性输出 JSON
  NPC: 0.8, // 德塔 NPC 对话：俏皮多变
}

// 视觉模型走标准按量计费端点（与 coding plan 端点不同通道），2026-08-20 实测同 key 可用
const STD_BASE_URL = process.env.VOLC_STD_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3'
const VISION_MODEL = process.env.VOLC_VISION_MODEL || 'doubao-seed-2-0-mini-260428'
const VISION_API_KEY = process.env.VOLC_VISION_API_KEY || API_KEY
const VISION_TIMEOUT_MS = 60000 // 视觉模型 60 秒超时

/**
 * 构造 LLM API 错误
 * 内容审核拦截 -> CONTENT_MODERATION（上层有专门话术）
 * 其他错误 -> 带错误码的描述（曾把 InvalidParameter 400 误判成审核，掩盖真实故障 BUG-68）
 */
function makeLlmError(status, errText) {
  let code = ''
  let message = ''
  try {
    const j = JSON.parse(errText)
    code = j.error?.code || ''
    message = j.error?.message || ''
  } catch { /* 非 JSON 错误体，原样截断 */ }
  if (status === 451 || /content|filter|moderation|sensitive|censor/i.test(code)) {
    const err = new Error('CONTENT_MODERATION')
    err.status = status
    err.detail = errText
    return err
  }
  return new Error(`LLM API 错误 ${status} [${code}]: ${(message || errText).slice(0, 200)}`)
}

/** 组装请求体；thinking:'disabled' 仅混合推理模型（deepseek-v4-flash）支持，glm 系会 400 拒绝 */
function buildRequestBody(messages, options, stream) {
  const body = { model: MODEL, messages, temperature: options.temperature ?? 0.7 }
  if (stream) body.stream = true
  if (options.thinking === 'disabled') body.thinking = { type: 'disabled' }
  return body
}

/** POST /chat/completions，返回原始响应（不做 ok 判定，调用方按需降级重试） */
function postChat(body, signal) {
  return fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
    signal,
  })
}

/** 模型不支持 thinking:disabled（glm 系纯推理模型，BUG-68）导致的 400 */
function isThinkingUnsupported(err) {
  const msg = err.message || ''
  return /thinking/i.test(msg) && /InvalidParameter|not supported/i.test(msg)
}

/**
 * 调用 LLM 对话补全
 * @param {Array<{role: string, content: string}>} messages
 * @param {{temperature?: number, thinking?: 'disabled'}} options thinking:'disabled' 跳过思考链（仅确定性 JSON 输出场景使用，省算力提速）
 * @returns {Promise<string>} 回复内容
 * @throws {Error} CONTENT_MODERATION(审核拦截) / LLM API 超时 / LLM API 错误
 */
export async function chatCompletion(messages, options = {}) {
  if (!API_KEY) {
    throw new Error('LLM API 错误: VOLC_API_KEY 未配置')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    let response = await postChat(buildRequestBody(messages, options, false), controller.signal)
    if (!response.ok) {
      const err = makeLlmError(response.status, await response.text())
      if (options.thinking === 'disabled' && isThinkingUnsupported(err)) {
        // 切到 glm 系模型即触发（与 BUG-68 同因）：降级重试一次，不让换模型打断 planner/feedback
        console.warn('[llm] 模型不支持 thinking:disabled，已降级为默认思考链:', err.message.slice(0, 120))
        response = await postChat(buildRequestBody(messages, { ...options, thinking: undefined }, false), controller.signal)
        if (!response.ok) throw makeLlmError(response.status, await response.text())
      } else {
        throw err
      }
    }

    const data = await response.json()
    return data.choices[0].message.content
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('LLM API 超时')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 流式调用 LLM 对话补全
 * @param {Array<{role: string, content: string}>} messages
 * @param {{temperature?: number, thinking?: 'disabled'}} options thinking:'disabled' 跳过思考链（仅确定性 JSON 输出场景使用）
 * @returns {AsyncGenerator<string>} 逐块 yield 回复内容
 */
export async function* chatCompletionStream(messages, options = {}) {
  if (!API_KEY) {
    throw new Error('LLM API 错误: VOLC_API_KEY 未配置')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    let response = await postChat(buildRequestBody(messages, options, true), controller.signal)
    if (!response.ok) {
      const err = makeLlmError(response.status, await response.text())
      if (options.thinking === 'disabled' && isThinkingUnsupported(err)) {
        console.warn('[llm] 模型不支持 thinking:disabled，流式降级为默认思考链:', err.message.slice(0, 120))
        response = await postChat(buildRequestBody(messages, { ...options, thinking: undefined }, true), controller.signal)
        if (!response.ok) throw makeLlmError(response.status, await response.text())
      } else {
        throw err
      }
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') return
        try {
          const json = JSON.parse(data)
          const content = json.choices?.[0]?.delta?.content
          if (content) yield content
        } catch {
          // 忽略解析错误
        }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('LLM API 超时')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 视觉模型调用（OpenAI 兼容多模态，用于图片理解）
 * @param {Array<{role: string, content: Array<{type: string, text?: string, image_url?: {url: string}}>}>} messages
 * @returns {Promise<string>} 识别描述文本
 * @throws {Error} CONTENT_MODERATION / 超时 / API 错误
 */
export async function visionChatCompletion(messages) {
  if (!VISION_API_KEY) {
    throw new Error('LLM API 错误: VOLC_VISION_KEY 未配置')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), VISION_TIMEOUT_MS)

  const body = {
    model: VISION_MODEL,
    messages,
    // 视觉描述不需要思考链，直接出结果省时省 token（2026-08-20 实测 thinking disabled 可正常返回）
    thinking: { type: 'disabled' },
  }

  try {
    const response = await fetch(`${STD_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${VISION_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errText = await response.text()
      throw makeLlmError(response.status, errText)
    }

    const data = await response.json()
    return data.choices[0].message.content
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('LLM API 超时')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 多模态对话补全（调用主模型直接识图）
 * 与 visionChatCompletion 的区别：端点是 BASE_URL（coding）+ 模型是 MODEL（主模型如 glm-5.3-flash）
 * 用于「先试主模型直接识图」的运行时探测路径——若主模型支持多模态则跳过 visionAgent 省一次调用；
 * 不支持时调用方负责 try-catch 后 fallback 到 visionChatCompletion。院长 2026-09-15 定视觉链路动态路由规则。
 *
 * messages 形态：content 是 array，可含 {type:'text', text} 与 {type:'image_url', image_url:{url}}（base64 data URL 或公网 URL）
 * @param {Array<{role: string, content: Array<{type: string, text?: string, image_url?: {url: string}}>}>} messages
 * @param {{temperature?: number, thinking?: 'disabled'}} options
 * @returns {Promise<string>} 模型回复文本
 * @throws {Error} CONTENT_MODERATION / 超时 / API 错误（与 chatCompletion 一致）
 */
export async function chatCompletionWithImages(messages, options = {}) {
  if (!API_KEY) {
    throw new Error('LLM API 错误: VOLC_API_KEY 未配置')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    let response = await postChat(buildRequestBody(messages, options, false), controller.signal)
    if (!response.ok) {
      const err = makeLlmError(response.status, await response.text())
      if (options.thinking === 'disabled' && isThinkingUnsupported(err)) {
        // 主模型不支持 thinking:disabled（glm 系纯推理，BUG-68）：降级重试一次
        console.warn('[llm] 多模态主模型不支持 thinking:disabled，已降级为默认思考链:', err.message.slice(0, 120))
        response = await postChat(buildRequestBody(messages, { ...options, thinking: undefined }, false), controller.signal)
        if (!response.ok) throw makeLlmError(response.status, await response.text())
      } else {
        throw err
      }
    }

    const data = await response.json()
    return data.choices[0].message.content
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('LLM API 超时')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}
