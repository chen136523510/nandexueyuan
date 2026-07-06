/**
 * LLM 客户端封装（火山引擎方舟 ARK，OpenAI 兼容协议）
 * 通过 fetch 调用，无需额外 SDK 依赖
 */

const BASE_URL = process.env.VOLC_BASE_URL || 'https://ark.cn-beijing.volces.com/api/coding/v3'
const API_KEY = process.env.VOLC_API_KEY
const MODEL = process.env.VOLC_MODEL || 'glm-latest'
const TIMEOUT_MS = 60000 // 60 秒超时

/**
 * 调用 LLM 对话补全
 * @param {Array<{role: string, content: string}>} messages
 * @param {{temperature?: number, maxTokens?: number}} options
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
    // 默认禁用推理模型的深度思考（节省 token，加速响应）
    ...(options.thinking !== true ? { thinking: { type: 'disabled' } } : {}),
  }
  if (options.maxTokens) {
    body.max_tokens = options.maxTokens
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
      // 内容审核拦截（火山引擎返回 400 或 451）
      if (response.status === 400 || response.status === 451) {
        const err = new Error('CONTENT_MODERATION')
        err.status = response.status
        err.detail = errText
        throw err
      }
      throw new Error(`LLM API 错误 ${response.status}: ${errText.slice(0, 200)}`)
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
