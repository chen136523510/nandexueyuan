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
import { visionChatCompletion } from '../utils/llm.js'

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
