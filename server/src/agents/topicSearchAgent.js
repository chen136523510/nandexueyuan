/**
 * 话题检索子 Agent
 *
 * 输入：{ keywords: "打球 游戏" }
 * 逻辑：同义词扩展 + FTS5 四级降级检索（分块FTS双列 -> 分块LIKE -> 消息FTS -> 消息LIKE）
 * 返回：{ ok: true, keywords, messages, sources } 或 { ok: false, error }
 */

import prisma from '../lib/prisma.js'
import { chatCompletion } from '../utils/llm.js'
import { resolveName } from '../utils/knowledge.js'

/**
 * 用 LLM 扩展同义词，提升 FTS5 召回率
 * 例如："打球" -> "打球 篮球 足球 羽毛球 运动"
 * @param {string} keywords 原始关键词
 * @returns {Promise<string>} 扩展后的关键词（含原始词）
 */
async function expandSynonyms(keywords) {
  try {
    const result = await chatCompletion([
      {
        role: 'system',
        content: `你是一个同义词扩展助手。用户给你几个搜索关键词，你扩展出相关的同义词和近义词。

规则：
- 保留原始关键词
- 补充 3-8 个相关的同义词、近义词、下位词
- 每个词至少 2 个汉字
- 只输出词语，用空格分隔
- 不要解释，不要标点

示例：
输入"打球" -> 打球 篮球 足球 羽毛球 乒乓球 运动 比赛
输入"考研" -> 考研 研究生 保研 复试 初试 上岸 学习
输入"喷人" -> 喷人 骂 吐槽 菜 垃圾 废物 离谱`,
      },
      { role: 'user', content: keywords },
    ], { temperature: 0, maxTokens: 80 })
    return result.trim()
  } catch (err) {
    console.log('[TopicSearch] 同义词扩展失败，用原始关键词:', err.message)
    return keywords
  }
}

/**
 * 执行话题检索
 * @param {{ keywords: string }} task 任务
 * @param {function} emit SSE 回调
 */
export async function runTopicSearchAgent(task, emit) {
  const keywords = task.keywords || ''
  emit('topic_search', 'analyzing', `正在提取搜索关键词...`)

  // 同义词扩展：一次轻量 LLM 调用，显著提升召回率
  const expandedKeywords = await expandSynonyms(keywords)
  emit('topic_search', 'analyzing', `关键词扩展：${keywords} -> ${expandedKeywords}`)

  const rawWords = expandedKeywords.replace(/['";]/g, '').split(/\s+/).filter((k) => k.length >= 2)
  const ftsWords = rawWords.filter((k) => k.length >= 3)

  if (rawWords.length === 0) {
    emit('topic_search', 'done', '未提取到有效关键词')
    return { ok: false, error: '未提取到有效关键词' }
  }

  emit('topic_search', 'searching', `关键词：${rawWords.join('、')}`)

  // Level 1: 分块 FTS5（同时搜索 keywords + summary 两列）
  let chunks = []
  if (ftsWords.length > 0) {
    try {
      const ftsQuery = ftsWords.join(' OR ')
      chunks = await prisma.$queryRawUnsafe(
        `SELECT c.id, c.startMsgId, c.endMsgId, c.chunkDate, c.keywords
         FROM message_chunks_fts f
         JOIN message_chunks c ON f.rowid = c.id
         WHERE f.keywords MATCH ? OR f.summary MATCH ?
         ORDER BY rank
         LIMIT 5`,
        ftsQuery,
        ftsQuery,
      )
    } catch (err) {
      console.error('[TopicSearch FTS5 Error]', err.message)
    }
  }

  // Level 2: 分块 LIKE（keywords + summary）
  if (!chunks || chunks.length === 0) {
    try {
      const likeConditions = rawWords
        .map((w) => `(keywords LIKE '%${w.replace(/'/g, "''")}%' OR summary LIKE '%${w.replace(/'/g, "''")}%')`)
        .join(' OR ')
      if (likeConditions) {
        chunks = await prisma.$queryRawUnsafe(
          `SELECT id, startMsgId, endMsgId, chunkDate, keywords
           FROM message_chunks
           WHERE ${likeConditions}
           LIMIT 5`,
        )
      }
    } catch (err) {
      console.error('[TopicSearch LIKE Error]', err.message)
    }
  }

  // 命中分块 -> 取完整消息
  if (chunks && chunks.length > 0) {
    emit('topic_search', 'searching', `找到 ${chunks.length} 个相关话题块，提取消息中...`)
    let allMessages = []
    for (const chunk of chunks) {
      const msgs = await prisma.$queryRawUnsafe(
        `SELECT id, nickname, msgTime, content FROM group_messages WHERE id BETWEEN ? AND ? ORDER BY id ASC`,
        chunk.startMsgId,
        chunk.endMsgId,
      )
      allMessages.push(...msgs)
    }

    const safeMessages = JSON.parse(JSON.stringify(allMessages, (k, v) => (typeof v === 'bigint' ? Number(v) : v)))
    const sources = safeMessages.slice(0, 5).map((r) => ({
      nickname: resolveName(r.nickname),
      msgTime: r.msgTime,
      content: r.content,
    }))

    emit('topic_search', 'done', `提取了 ${safeMessages.length} 条相关消息`, {
      count: safeMessages.length,
      sample: sources.map((s) => ({ nickname: s.nickname, content: (s.content || '').slice(0, 60) })),
    })

    return { ok: true, keywords: rawWords.join(' '), messages: safeMessages, sources }
  }

  // Level 3: 原始消息 FTS5
  emit('topic_search', 'searching', '未命中话题块，尝试直接检索原始消息...')
  let results = []

  if (ftsWords.length > 0) {
    try {
      const ftsQuery = ftsWords.join(' OR ')
      results = await prisma.$queryRawUnsafe(
        `SELECT m.id, m.nickname, m.msgTime, m.content
         FROM group_messages_fts f
         JOIN group_messages m ON f.rowid = m.id
         WHERE f.content MATCH ?
         ORDER BY rank
         LIMIT 50`,
        ftsQuery,
      )
    } catch (err) {
      console.error('[TopicSearch FTS5 Error]', err.message)
    }
  }

  // Level 4: 原始消息 LIKE
  if (!results || results.length === 0) {
    try {
      const likeConditions = rawWords.map((w) => `content LIKE '%${w.replace(/'/g, "''")}%'`).join(' OR ')
      if (likeConditions) {
        results = await prisma.$queryRawUnsafe(
          `SELECT id, nickname, msgTime, content FROM group_messages WHERE ${likeConditions} ORDER BY msgTime ASC LIMIT 50`,
        )
      }
    } catch (err) {
      console.error('[TopicSearch LIKE Error]', err.message)
    }
  }

  if (!results || results.length === 0) {
    emit('topic_search', 'done', '未找到相关消息')
    return { ok: false, error: '未找到相关消息' }
  }

  const safeResults = JSON.parse(JSON.stringify(results, (k, v) => (typeof v === 'bigint' ? Number(v) : v)))
  const sources = safeResults.slice(0, 5).map((r) => ({
    nickname: resolveName(r.nickname),
    msgTime: r.msgTime,
    content: r.content,
  }))

  emit('topic_search', 'done', `找到 ${safeResults.length} 条相关消息`, {
    count: safeResults.length,
    sample: sources.map((s) => ({ nickname: s.nickname, content: (s.content || '').slice(0, 60) })),
  })

  return { ok: true, keywords: rawWords.join(' '), messages: safeResults, sources }
}
