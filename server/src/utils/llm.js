/**
 * LLM 客户端封装（火山引擎方舟 ARK，OpenAI 兼容协议）
 * 通过 fetch 调用，无需额外 SDK 依赖
 */

const BASE_URL = process.env.VOLC_BASE_URL || 'https://ark.cn-beijing.volces.com/api/coding/v3'
const API_KEY = process.env.VOLC_API_KEY
const MODEL = process.env.VOLC_MODEL || 'glm-5.2'
const TIMEOUT_MS = 180000 // 180 秒超时（glm-5.2 是纯推理模型，思考耗时长，且不限 max_tokens）

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

/**
 * 调用 LLM 对话补全
 * @param {Array<{role: string, content: string}>} messages
 * @param {{temperature?: number}} options
 * @returns {Promise<string>} 回复内容
 * @throws {Error} CONTENT_MODERATION(审核拦截) / LLM API 超时 / LLM API 错误
 */
export async function chatCompletion(messages, options = {}) {
  if (!API_KEY) {
    throw new Error('LLM API 错误: VOLC_API_KEY 未配置')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  const body = {
    model: MODEL,
    messages,
    temperature: options.temperature ?? 0.7,
    // glm-5.2 是纯推理模型：不传 thinking（disabled 会被 400 拒绝），不设 max_tokens（思考会消耗输出预算，导致正文截断/为空）
  }

  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
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
 * 流式调用 LLM 对话补全
 * @param {Array<{role: string, content: string}>} messages
 * @param {{temperature?: number}} options
 * @returns {AsyncGenerator<string>} 逐块 yield 回复内容
 */
export async function* chatCompletionStream(messages, options = {}) {
  if (!API_KEY) {
    throw new Error('LLM API 错误: VOLC_API_KEY 未配置')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  const body = {
    model: MODEL,
    messages,
    temperature: options.temperature ?? 0.7,
    stream: true,
    // glm-5.2 是纯推理模型：不传 thinking（disabled 会被 400 拒绝），不设 max_tokens（思考会消耗输出预算）
  }

  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errText = await response.text()
      throw makeLlmError(response.status, errText)
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
