/**
 * 视觉子 Agent（男德通多模态一期）
 *
 * 读取用户上传的图片（/uploads/chat/xx 本站路径），转 base64 data URL 后
 * 调视觉模型（doubao-seed-2-0-mini）生成中文描述，供主 Agent 作为上下文使用。
 *
 * 为什么用 base64 而非 URL：服务器无公网可访问的图片地址（线上虽有域名但
 * 走 Nginx，dev 环境是 localhost），火山 API 无法访问内网地址，base64 在
 * dev/prod 行为一致且无需额外网络配置。
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { visionChatCompletion, chatCompletionWithImages } from '../utils/llm.js'

// 服务器运行目录（server/）下的上传目录，与 wallController 的 uploads/wall 同级
const CHAT_UPLOAD_DIR = path.resolve('uploads/chat')

// mimetype -> data URL 前缀
const MIME_PREFIX = {
  'image/jpeg': 'data:image/jpeg;base64,',
  'image/png': 'data:image/png;base64,',
  'image/webp': 'data:image/webp;base64,',
  'image/gif': 'data:image/gif;base64,',
}

const EXT_MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

/**
 * 识别单张图片
 * @param {string} imageUrl 本站路径（/uploads/chat/xxx.png）
 * @param {string} question 用户提问（用于引导描述重点）
 * @returns {Promise<{ok: boolean, url: string, description: string}>}
 */
export async function describeImage(imageUrl, question) {
  // 只允许本站聊天上传目录的文件，防任意路径读取
  const filename = imageUrl.replace('/uploads/chat/', '')
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return { ok: false, url: imageUrl, description: '（非法图片路径）' }
  }

  const ext = path.extname(filename).toLowerCase()
  const mime = EXT_MIME[ext]
  if (!mime) {
    return { ok: false, url: imageUrl, description: `（不支持的图片格式 ${ext}）` }
  }

  let base64
  try {
    const buf = await readFile(path.join(CHAT_UPLOAD_DIR, filename))
    base64 = buf.toString('base64')
  } catch {
    return { ok: false, url: imageUrl, description: '（图片文件不存在或读取失败）' }
  }

  try {
    const description = await visionChatCompletion([
      {
        role: 'system',
        content: [
          {
            type: 'text',
            text: '你是图片描述助手。客观描述图片内容：画面里有什么（人物/物体/场景/动作）、可见的文字、整体风格与氛围。用中文，150字以内，不要猜测图片之外的信息，不要编造。',
          },
        ],
      },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `${MIME_PREFIX[mime]}${base64}` } },
          {
            type: 'text',
            text: question?.trim()
              ? `用户对这张图片的提问是「${question}」，请结合提问重点描述图片。`
              : '请描述这张图片的内容。',
          },
        ],
      },
    ])
    return { ok: true, url: imageUrl, description: description.trim() }
  } catch (err) {
    console.error('[VisionAgent] 图片识别失败:', imageUrl, err.message)
    return { ok: false, url: imageUrl, description: `（图片识别失败：${err.message}）` }
  }
}

/**
 * 识别多张图片（逐张识别，单张失败不影响其他）
 * @param {string[]} imageUrls
 * @param {string} question
 * @param {(msg: object) => void} emit SSE 发送函数（推送识别进度）
 * @returns {Promise<{ok: boolean, summary: string, results: Array}>}
 */
export async function runVisionAgent(imageUrls, question, emit) {
  emit({
    agent: '视觉识别',
    phase: 'start',
    content: `开始识别 ${imageUrls.length} 张图片（doubao-seed 视觉模型）...`,
  })

  const results = []
  for (let i = 0; i < imageUrls.length; i++) {
    emit({
      agent: '视觉识别',
      phase: 'progress',
      content: `识别第 ${i + 1}/${imageUrls.length} 张...`,
    })
    const r = await describeImage(imageUrls[i], question)
    results.push(r)
    emit({
      agent: '视觉识别',
      phase: 'progress',
      content: r.ok ? `第 ${i + 1} 张识别完成：${r.description.slice(0, 80)}` : `第 ${i + 1} 张识别失败`,
    })
  }

  const okCount = results.filter((r) => r.ok).length
  const summary = okCount > 0 ? `${okCount}/${results.length} 张图片识别成功` : '图片识别全部失败'

  emit({
    agent: '视觉识别',
    phase: 'done',
    content: summary,
    data: results.map((r) => ({ url: r.url, ok: r.ok })),
  })

  return { ok: okCount > 0, summary, results }
}

/**
 * 运行时探测：先试主模型直接识图（院长 2026-09-15 视觉链路动态路由规则）
 * 失败或返回异常 → 返回 null，让调用方 fallback 到 runVisionAgent。**兼容所有未来模型**——不需要维护 multimodal 元数据，
 * 自然由 LLM API 自身的成功/失败反馈决定路由走向。
 *
 * 与 runVisionAgent 的区别：①端点是主模型 coding 通道（不是 doubao-seed 标准视觉端点）；②一次调用所有图（不逐张）；
 * ③失败不抛错（返回 null 让上层走 visionAgent 兜底）。
 *
 * @param {string[]} imageUrls 本站路径（/uploads/chat/xxx.png 等），最多 3 张
 * @param {string} question 用户提问（用于引导描述重点）
 * @param {(msg: object) => void} emit SSE 发送函数（推送识别进度）
 * @returns {Promise<{ok: true, summary: string, results: Array}|null>}
 */
export async function tryDirectMultimodal(imageUrls, question, emit) {
  if (!imageUrls?.length) return null

  emit({
    agent: '视觉识别',
    phase: 'start',
    content: `尝试主模型直接识图（${imageUrls.length} 张，动态路由规则）...`,
  })

  // 读所有图片转 base64 data URL（与 describeImage 共用同一安全策略）
  const imagePayloads = []
  const fileMap = []
  for (const url of imageUrls) {
    const filename = url.replace('/uploads/chat/', '')
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      console.warn('[tryDirectMultimodal] 非法图片路径，跳过:', url)
      continue
    }
    const ext = path.extname(filename).toLowerCase()
    const mime = EXT_MIME[ext]
    if (!mime) {
      console.warn('[tryDirectMultimodal] 不支持的图片格式，跳过:', ext)
      continue
    }
    try {
      const buf = await readFile(path.join(CHAT_UPLOAD_DIR, filename))
      imagePayloads.push({
        type: 'image_url',
        image_url: { url: `${MIME_PREFIX[mime]}${buf.toString('base64')}` },
      })
      fileMap.push(url)
    } catch {
      console.warn('[tryDirectMultimodal] 图片读取失败，跳过:', filename)
    }
  }

  if (imagePayloads.length === 0) return null

  const userContent = [...imagePayloads]
  userContent.push({
    type: 'text',
    text: question?.trim()
      ? `用户提问：「${question}」\n\n请先逐张描述每张图片（每张 ≤150 字中文），再回答用户问题。`
      : '请逐张描述每张图片（每张 ≤150 字中文）。',
  })

  try {
    const t0 = Date.now()
    const description = await chatCompletionWithImages(
      [
        {
          role: 'system',
          content: [
            {
              type: 'text',
              text: '你是图片描述助手。客观描述每张图片：画面里有什么（人物/物体/场景/动作）、可见的文字、整体风格与氛围。每张图用「图N: ...」格式分隔。用中文，不要猜测图片之外的信息，不要编造。',
            },
          ],
        },
        { role: 'user', content: userContent },
      ],
      { temperature: 0.3 },
    )
    const ms = Date.now() - t0
    const desc = (description || '').trim()
    if (!desc) return null

    // 解析「图N: ...」为 per-image 描述（粗略切分；找不到则整段截前 150 字兜底）
    const results = fileMap.map((url, i) => {
      const m = desc.match(new RegExp(`图\\s*${i + 1}\\s*[:：]\\s*([^\\n]+)`))
      return {
        url,
        ok: true,
        description: m ? m[1].trim() : desc.slice(0, 150),
        source: 'direct-multimodal',
      }
    })

    emit({
      agent: '视觉识别',
      phase: 'done',
      content: `主模型直识图 ${ms}ms 完成（${fileMap.length}/${imageUrls.length} 张）`,
      data: results.map((r) => ({ url: r.url, ok: r.ok, source: r.source })),
    })

    return { ok: true, summary: desc, results }
  } catch (err) {
    // 任何错误（不支持多模态 / 超时 / 解析失败 / 限流 / 审核）→ 返回 null 让上层 fallback。
    // CONTENT_MODERATION 在这里也走 fallback：因为主模型识图触发审核意味着该图本身敏感，
    // 即便改走 visionAgent 大概率仍触发——这是预期行为而非 bug，logged 即可。
    console.log('[tryDirectMultimodal] 主模型直识图失败（fallback 到 visionAgent）:', err.message.slice(0, 120))
    emit({
      agent: '视觉识别',
      phase: 'fallback',
      content: `主模型直识图失败，降级到 visionAgent（${err.message.slice(0, 80)}）`,
    })
    return null
  }
}
