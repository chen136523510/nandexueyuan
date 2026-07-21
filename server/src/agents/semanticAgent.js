/**
 * 语义检索子 Agent
 *
 * 职责：提取关键词 -> FTS5 检索分块/原始消息 -> 返回相关消息上下文
 * 不做流式回答（交给主 Agent 综合输出）
 *
 * 返回格式：
 *   { ok: true, keywords, messages[], sources[] }
 *   { ok: false, error }
 */

import prisma from '../lib/prisma.js'
import { chatCompletion } from '../utils/llm.js'
import { resolveName } from '../utils/knowledge.js'

/**
 * 从问题中提取时间范围（如"2026年6月"、"2024年"、"最近"）
 * @returns {{ start: number, end: number, label: string } | null} 毫秒时间戳范围
 */
function extractTimeRange(question) {
  const now = Date.now()
  // 2026年6月 / 2024年3月
  let m = question.match(/(\d{4})年(\d{1,2})月/)
  if (m) {
    const year = parseInt(m[1])
    const month = parseInt(m[2])
    const start = new Date(year, month - 1, 1).getTime()
    const end = new Date(year, month, 1).getTime()
    return { start, end, label: `${year}年${month}月` }
  }
  // 2024年（整年）
  m = question.match(/(\d{4})年/)
  if (m && !question.match(/\d{4}年\d/)) {
    const year = parseInt(m[1])
    const start = new Date(year, 0, 1).getTime()
    const end = new Date(year + 1, 0, 1).getTime()
    return { start, end, label: `${year}年` }
  }
  return null
}

/**
 * 执行语义检索
 * @param {string} question 用户原始问题
 * @param {function} emit SSE 回调：(agent, phase, content, data) => void
 * @returns {{ ok: boolean, keywords?: string, messages?: array, sources?: array, error?: string }}
 */
export async function runSemanticAgent(question, emit) {
  // 1. 提取关键词
  emit('semantic', 'analyzing', '正在提取搜索关键词...')
  let keywords = question
  try {
    const keywordMsgs = [
      {
        role: 'system',
        content: `从用户问题中提取 2-3 个用于全文搜索的关键词。要求：
- 每个关键词至少 2 个汉字
- 只输出关键词，用空格分隔
- 不要其他内容`,
      },
      { role: 'user', content: question },
    ]
    keywords = (await chatCompletion(keywordMsgs, { temperature: 0, maxTokens: 50 })).trim()
    emit('semantic', 'analyzing', `关键词：${keywords}`)
  } catch {
    console.log('[Semantic] 关键词提取失败，用原问题检索')
  }

  const rawWords = keywords.replace(/['";]/g, '').split(/\s+/).filter((k) => k.length >= 2)
  const ftsWords = rawWords.filter((k) => k.length >= 3)

  // 1.5 检测时间范围（如"2026年6月聊什么"没有内容关键词，但有时间范围）
  const timeRange = extractTimeRange(question)
  if (timeRange) {
    emit('semantic', 'analyzing', `检测到时间范围：${timeRange.label}`)
  }

  // 1.6 时间范围 + 无具体内容关键词 -> 直接按时间取消息
  if (timeRange && ftsWords.length === 0) {
    emit('semantic', 'searching', `按时间范围 ${timeRange.label} 检索消息...`)
    try {
      // 先查分块表（chunkDate 格式 YYYY-MM-DD）
      let timeChunks = []
      if (timeRange.label.includes('月')) {
        // 按月查
        const [year, month] = timeRange.label.match(/(\d{4})年(\d{1,2})月/).slice(1)
        const monthPrefix = `${year}-${month.padStart(2, '0')}`
        timeChunks = await prisma.$queryRawUnsafe(
          `SELECT id, startMsgId, endMsgId, chunkDate, keywords
           FROM message_chunks
           WHERE chunkDate LIKE ?
           LIMIT 10`,
          `${monthPrefix}%`,
        )
      } else {
        // 按年查
        timeChunks = await prisma.$queryRawUnsafe(
          `SELECT id, startMsgId, endMsgId, chunkDate, keywords
           FROM message_chunks
           WHERE chunkDate LIKE ?
           LIMIT 20`,
          `${timeRange.label.replace('年', '')}-%`,
        )
      }

      if (timeChunks.length > 0) {
        emit('semantic', 'searching', `找到 ${timeChunks.length} 个话题块，提取消息中...`)
        let allMessages = []
        for (const chunk of timeChunks) {
          const msgs = await prisma.$queryRawUnsafe(
            `SELECT nickname, msgTime, content FROM group_messages WHERE id BETWEEN ? AND ? ORDER BY id ASC`,
            chunk.startMsgId,
            chunk.endMsgId,
          )
          allMessages.push(...msgs)
        }
        // 按时间排序，取最新的 30 条
        allMessages.sort((a, b) => (a.msgTime > b.msgTime ? -1 : 1))
        if (allMessages.length > 30) allMessages = allMessages.slice(0, 30)

        const safeMessages = JSON.parse(JSON.stringify(allMessages, (k, v) => (typeof v === 'bigint' ? Number(v) : v)))
        const sources = safeMessages.slice(0, 5).map((r) => ({
          nickname: resolveName(r.nickname),
          msgTime: r.msgTime,
          content: r.content,
        }))

        emit('semantic', 'done', `提取了 ${safeMessages.length} 条 ${timeRange.label} 的消息`, sources)
        return { ok: true, keywords: `${timeRange.label} 聊天记录`, messages: safeMessages, sources }
      }

      // 分块表没有，直接查原始消息表
      const timeMessages = await prisma.$queryRawUnsafe(
        `SELECT nickname, msgTime, content FROM group_messages WHERE msgTime >= ? AND msgTime < ? ORDER BY msgTime DESC LIMIT 30`,
        timeRange.start,
        timeRange.end,
      )

      if (timeMessages.length > 0) {
        const safeMessages = JSON.parse(JSON.stringify(timeMessages, (k, v) => (typeof v === 'bigint' ? Number(v) : v)))
        const sources = safeMessages.slice(0, 5).map((r) => ({
          nickname: resolveName(r.nickname),
          msgTime: r.msgTime,
          content: r.content,
        }))
        emit('semantic', 'done', `找到 ${safeMessages.length} 条 ${timeRange.label} 的消息`, sources)
        return { ok: true, keywords: `${timeRange.label} 聊天记录`, messages: safeMessages, sources }
      }

      emit('semantic', 'done', `${timeRange.label} 没有聊天记录`)
      return { ok: false, error: `${timeRange.label} 没有聊天记录` }
    } catch (err) {
      console.error('[Semantic TimeRange Error]', err.message)
    }
  }

  // 2. 检索话题分块（先 FTS5，再 LIKE 后备）
  emit('semantic', 'searching', '正在检索相关话题块...')
  let chunks = []

  // 2a. FTS5 检索（3字以上词）
  if (ftsWords.length > 0) {
    try {
      const ftsQuery = ftsWords.join(' OR ')
      chunks = await prisma.$queryRawUnsafe(
        `SELECT c.id, c.startMsgId, c.endMsgId, c.chunkDate, c.keywords
         FROM message_chunks_fts f
         JOIN message_chunks c ON f.rowid = c.id
         WHERE f.keywords MATCH ?
         ORDER BY rank
         LIMIT 3`,
        ftsQuery,
      )
    } catch (err) {
      console.error('[Chunks FTS5 Error]', err.message)
    }
  }

  // 2b. LIKE 后备（2字以上词）
  if (!chunks || chunks.length === 0) {
    try {
      const likeConditions = rawWords.map((w) => `keywords LIKE '%${w.replace(/'/g, "''")}%'`).join(' OR ')
      if (likeConditions) {
        chunks = await prisma.$queryRawUnsafe(
          `SELECT id, startMsgId, endMsgId, chunkDate, keywords
           FROM message_chunks
           WHERE ${likeConditions}
           LIMIT 3`,
        )
      }
    } catch (err) {
      console.error('[Chunks LIKE Error]', err.message)
    }
  }
  emit('semantic', 'searching', `找到 ${chunks?.length || 0} 个相关话题块`)

  // 3. 命中分块 -> 取完整消息
  if (chunks && chunks.length > 0) {
    emit('semantic', 'searching', '正在提取话题块中的完整消息...')
    let allMessages = []
    for (const chunk of chunks) {
      const msgs = await prisma.$queryRawUnsafe(
        `SELECT nickname, msgTime, content FROM group_messages WHERE id BETWEEN ? AND ? ORDER BY id ASC`,
        chunk.startMsgId,
        chunk.endMsgId,
      )
      allMessages.push(...msgs)
    }

    // 限制总消息数
    if (allMessages.length > 50) {
      allMessages = allMessages.slice(0, 50)
    }

    const safeMessages = JSON.parse(JSON.stringify(allMessages, (k, v) => (typeof v === 'bigint' ? Number(v) : v)))
    const sources = safeMessages.slice(0, 5).map((r) => ({
      nickname: resolveName(r.nickname),
      msgTime: r.msgTime,
      content: r.content,
    }))

    emit('semantic', 'done', `提取了 ${safeMessages.length} 条相关消息`, sources)
    return { ok: true, keywords, messages: safeMessages, sources }
  }

  // 4. 无分块 -> 降级原始消息检索
  emit('semantic', 'searching', '未命中话题块，尝试直接检索原始消息...')
  let results = []

  // 4a. FTS5 原始消息
  if (ftsWords.length > 0) {
    try {
      const ftsQuery = ftsWords.join(' OR ')
      results = await prisma.$queryRawUnsafe(
        `SELECT m.nickname, m.msgTime, m.content
         FROM group_messages_fts f
         JOIN group_messages m ON f.rowid = m.id
         WHERE f.content MATCH ?
         ORDER BY rank
         LIMIT 5`,
        ftsQuery,
      )
    } catch (err) {
      console.error('[FTS5 Error]', err.message)
    }
  }

  // 4b. LIKE 原始消息
  if (!results || results.length === 0) {
    try {
      const likeConditions = rawWords.map((w) => `content LIKE '%${w.replace(/'/g, "''")}%'`).join(' OR ')
      if (likeConditions) {
        results = await prisma.$queryRawUnsafe(
          `SELECT nickname, msgTime, content
           FROM group_messages
           WHERE ${likeConditions}
           LIMIT 5`,
        )
      }
    } catch (err) {
      console.error('[Message LIKE Error]', err.message)
    }
  }

  if (!results || results.length === 0) {
    emit('semantic', 'done', '未找到相关聊天记录')
    return { ok: false, error: '未找到相关消息' }
  }

  const safeResults = JSON.parse(JSON.stringify(results, (k, v) => (typeof v === 'bigint' ? Number(v) : v)))
  const sources = safeResults.map((r) => ({
    nickname: resolveName(r.nickname),
    msgTime: r.msgTime,
    content: r.content,
  }))

  emit('semantic', 'done', `找到 ${safeResults.length} 条相关消息`, sources)
  return { ok: true, keywords, messages: safeResults, sources }
}
