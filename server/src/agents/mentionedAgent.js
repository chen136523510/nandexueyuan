/**
 * 被提及子 Agent
 *
 * 输入：{ target: "丘序明" }
 * 逻辑：用姓名+外号做关键词搜索别人消息中提到该人的，每条带前后各5条上下文
 * 返回：{ ok: true, messages, count } 或 { ok: false, error }
 */

import prisma from '../lib/prisma.js'
import { members, resolveName } from '../utils/knowledge.js'
import { fetchWithContext, formatMessagesAsText } from './contextSearch.js'

// 从姓名反查所有搜索关键词（姓名+外号+昵称）
function buildSearchKeywords(target) {
  const member = members.find(
    (m) => m.name === target || m.aliases.includes(target) || m.nicknames.includes(target),
  )

  if (!member) {
    return [target]
  }

  // 收集所有可能被提及的名称（真名 + 外号 + 昵称）
  const keywords = [member.name, ...member.aliases, ...member.nicknames]
  // 过滤掉太短的（至少2字）和纯英文的太长昵称
  return keywords.filter((k) => k.length >= 2)
}

/**
 * 执行被提及检索
 * @param {{ target: string }} task 任务
 * @param {function} emit SSE 回调
 */
export async function runMentionedAgent(task, emit) {
  const { target } = task
  emit('mentioned', 'analyzing', `正在分析 ${target} 被提及的搜索词...`)

  const keywords = buildSearchKeywords(target)

  if (keywords.length === 0) {
    emit('mentioned', 'done', `未找到 ${target} 的可搜索关键词`)
    return { ok: false, error: `未找到 ${target} 的搜索关键词` }
  }

  emit('mentioned', 'searching', `搜索关键词：${keywords.join('、')}`)

  // 构建 LIKE 条件
  const likeConditions = keywords.map((k) => `content LIKE '%${k.replace(/'/g, "''")}%'`).join(' OR ')

  // 先尝试 FTS5（3字以上的词）
  const ftsWords = keywords.filter((k) => k.length >= 3)
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
         LIMIT 500`,
        ftsQuery,
      )
    } catch (err) {
      console.error('[Mentioned FTS5 Error]', err.message)
    }
  }

  // FTS5 无结果 -> LIKE 后备
  if (!results || results.length === 0) {
    try {
      results = await prisma.$queryRawUnsafe(
        `SELECT id, nickname, msgTime, content FROM group_messages WHERE ${likeConditions} ORDER BY msgTime ASC LIMIT 500`,
      )
    } catch (err) {
      console.error('[Mentioned LIKE Error]', err.message)
    }
  }

  const safeResults = JSON.parse(JSON.stringify(results, (k, v) => (typeof v === 'bigint' ? Number(v) : v)))

  if (safeResults.length === 0) {
    emit('mentioned', 'done', `未找到提到 ${target} 的消息`)
    return { ok: false, error: `未找到提到 ${target} 的消息` }
  }

  emit('mentioned', 'searching', `找到 ${safeResults.length} 条提及，正在获取上下文...`)

  // 取上下文
  const targetIds = safeResults.map((m) => m.id)
  const contextMessages = await fetchWithContext(targetIds, 5)

  // 构建上下文索引
  const contextMap = new Map()
  for (const msg of contextMessages) {
    contextMap.set(msg.id, msg)
  }

  // 为每条提及标注上下文
  const messagesWithContext = safeResults.map((msg) => {
    const context = []
    for (let i = msg.id - 5; i <= msg.id + 5; i++) {
      if (i !== msg.id && contextMap.has(i)) {
        context.push(contextMap.get(i))
      }
    }
    return {
      ...msg,
      nickname: resolveName(msg.nickname),
      context: context.map((c) => ({ ...c, nickname: resolveName(c.nickname) })),
    }
  })

  emit('mentioned', 'done', `找到 ${safeResults.length} 条提及（含上下文 ${contextMessages.length} 条）`, {
    count: safeResults.length,
    sample: messagesWithContext.slice(0, 3).map((m) => ({ nickname: m.nickname, content: (m.content || '').slice(0, 60) })),
  })

  return {
    ok: true,
    messages: messagesWithContext,
    count: safeResults.length,
    target,
    keywords,
    formattedText: formatMessagesAsText(contextMessages),
  }
}
