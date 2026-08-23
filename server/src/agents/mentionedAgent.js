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
 * @param {{ limit?: number|null }} options 可选参数（limit=null 表示全量，黑机用）
 */
export async function runMentionedAgent(task, emit, options = {}) {
  const { target } = task
  // limit 语义：undefined=默认 30；数字=显式条数；null=黑机全量模式
  // BUG-74 修复：原 `limit ?? 30` 在 null 时也取默认值，黑机全量名不副实（实际仍 30 条）
  const limit = options.limit !== undefined ? options.limit : 30
  const limitSql = limit === null ? '' : `LIMIT ${limit}`
  // 全量模式（null）传给大 Agent 的条数上限（有界，防 OOM；真·全量走 fullAnalysisAgent 分批管线）
  const msgSlice = limit === null ? 200 : limit
  const ctxSlice = limit === null ? 1000 : limit ?? 150
  emit('mentioned', 'analyzing', `正在分析 ${target} 被提及的搜索词...`)

  const keywords = buildSearchKeywords(target)

  if (keywords.length === 0) {
    emit('mentioned', 'done', `未找到 ${target} 的可搜索关键词`)
    return { ok: false, error: `未找到 ${target} 的搜索关键词` }
  }

  emit('mentioned', 'searching', `搜索关键词：${keywords.join('、')}`)

  // 构建 LIKE 条件
  const likeConditions = keywords.map((k) => `content LIKE '%${k.replace(/'/g, "''")}%'`).join(' OR ')

  // 先尝试 FTS5 v2（unicode61 + 预分词，2 字人名也能命中，如"丘哥"）
  // mentioned 职责是搜"别人提到该人"的消息，content LIKE 是对的但 FTS5 v2 更快
  let results = []

  if (keywords.length > 0) {
    try {
      const { buildFtsQuery } = await import('../utils/tokenizer.js')
      const ftsQuery = buildFtsQuery(keywords)
      results = await prisma.$queryRawUnsafe(
        `SELECT m.id, m.nickname, m.msgTime, m.content
         FROM group_messages_fts_v2 f
         JOIN group_messages m ON f.rowid = m.id
         WHERE f.content MATCH ?
         ORDER BY rank
         ${limitSql}`,
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
        `SELECT id, nickname, msgTime, content FROM group_messages WHERE ${likeConditions} ORDER BY msgTime DESC ${limitSql}`,
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

  // 只传前 N 条 + 上下文给大 Agent（避免文本过大导致服务器 OOM）
  const limitedMessages = messagesWithContext.slice(0, msgSlice)
  const flatList = limitedMessages
    .flatMap((m) => [m, ...m.context])
    .filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
    .slice(0, ctxSlice)
  const limitedText = formatMessagesAsText(flatList)

  return {
    ok: true,
    messages: limitedMessages,
    count: safeResults.length,
    target,
    keywords,
    formattedText: limitedText,
    flatMessages: flatList, // 供 orchestrator 跨 Agent 按 id 去重（person/mentioned 上下文高度重叠）
  }
}
