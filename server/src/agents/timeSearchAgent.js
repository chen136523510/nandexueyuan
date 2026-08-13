/**
 * 时间范围检索子 Agent
 *
 * 输入：{ startDate: "2026-07-01", endDate: "2026-07-31", keywords?: "游戏" }
 * 逻辑：按 chunkDate 日期范围查 message_chunks，可选叠加关键词 LIKE 过滤
 * 返回：该时间段内的话题块及原始消息
 *
 * 当用户问到"7月份聊了什么""最近三个月""去年暑假"等时间范围问题时，
 * orchestrator 会派发 time_search 任务，本 Agent 将自然语言时间转化为 SQL 日期查询。
 */

import prisma from '../lib/prisma.js'
import { resolveName } from '../utils/knowledge.js'

/**
 * 执行时间范围检索
 * @param {{ startDate: string, endDate: string, keywords?: string }} task
 * @param {function} emit SSE 回调
 */
export async function runTimeSearchAgent(task, emit) {
  const { startDate, endDate, keywords } = task
  emit('time_search', 'analyzing', `正在检索 ${startDate} ~ ${endDate} 的数据...`)

  if (!startDate || !endDate) {
    emit('time_search', 'done', '未提供有效时间范围')
    return { ok: false, error: '缺少 startDate 或 endDate' }
  }

  // 1. 按日期范围查分块
  let chunks = []
  try {
    let query = `SELECT id, startMsgId, endMsgId, chunkDate, keywords, summary
                 FROM message_chunks
                 WHERE chunkDate BETWEEN ? AND ?`
    const params = [startDate, endDate]

    // 可选关键词过滤
    if (keywords && keywords.trim()) {
      const words = keywords.trim().split(/\s+/).filter((w) => w.length >= 2)
      if (words.length > 0) {
        const likeConditions = words
          .map((w) => `(keywords LIKE '%${w.replace(/'/g, "''")}%' OR summary LIKE '%${w.replace(/'/g, "''")}%')`)
          .join(' OR ')
        query += ` AND (${likeConditions})`
      }
    }

    query += ` ORDER BY chunkDate ASC LIMIT 30`

    chunks = await prisma.$queryRawUnsafe(query, ...params)
  } catch (err) {
    console.error('[TimeSearch Error]', err.message)
    emit('time_search', 'done', `检索失败: ${err.message}`)
    return { ok: false, error: err.message }
  }

  if (!chunks || chunks.length === 0) {
    emit('time_search', 'done', `${startDate} ~ ${endDate} 范围内未找到话题块`)
    return { ok: true, summary: `${startDate} ~ ${endDate} 范围内未找到相关话题`, messages: [], count: 0 }
  }

  emit('time_search', 'searching', `找到 ${chunks.length} 个话题块，提取消息中...`)

  // 2. 取完整消息（用 startMsgId/endMsgId 范围查询，避免重复）
  const ranges = chunks.map((c) => [c.startMsgId, c.endMsgId])
  // 合并重叠范围，减少查询次数
  const mergedRanges = mergeRanges(ranges)

  let allMessages = []
  for (const [from, to] of mergedRanges) {
    const msgs = await prisma.$queryRawUnsafe(
      `SELECT id, nickname, msgTime, content
       FROM group_messages
       WHERE id BETWEEN ? AND ?
       ORDER BY id ASC`,
      from, to,
    )
    allMessages.push(...msgs)
  }

  // 3. 按日期分组统计
  const safeMessages = JSON.parse(JSON.stringify(allMessages, (k, v) => (typeof v === 'bigint' ? Number(v) : v)))

  const byDate = new Map()
  for (const m of safeMessages) {
    const date = new Date(m.msgTime).toLocaleDateString('zh-CN')
    const day = byDate.get(date) || { count: 0, messages: [] }
    day.count++
    if (day.messages.length < 10) day.messages.push(m)
    byDate.set(date, day)
  }

  const dateSummary = [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, info]) => `${date}（${info.count}条）`)
    .join('\n')

  const totalMessages = safeMessages.length
  const topSamples = safeMessages.slice(0, 8).map((m) => ({
    nickname: resolveName(m.nickname),
    msgTime: m.msgTime,
    content: (m.content || '').slice(0, 80),
  }))

  const summary = `${startDate} ~ ${endDate} 共 ${totalMessages} 条消息，${chunks.length} 个话题块：
${dateSummary}

代表性消息：
${topSamples.map((s, i) => `${i + 1}. [${new Date(s.msgTime).toLocaleString('zh-CN')}] ${s.nickname}：${s.content}`).join('\n')}`

  emit('time_search', 'done', `时间检索完成（${startDate} ~ ${endDate}，${totalMessages} 条消息，${chunks.length} 个话题块）`, {
    count: totalMessages,
    chunkCount: chunks.length,
    sample: topSamples,
  })

  return {
    ok: true,
    summary,
    formattedText: summary,
    messages: safeMessages,
    count: totalMessages,
  }
}

/**
 * 合并重叠的 ID 范围
 * [[1,5],[3,8],[10,15]] -> [[1,8],[10,15]]
 */
function mergeRanges(ranges) {
  if (ranges.length === 0) return []
  const sorted = ranges.sort((a, b) => a[0] - b[0])
  const merged = [sorted[0]]
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1]
    if (sorted[i][0] <= last[1] + 1) {
      last[1] = Math.max(last[1], sorted[i][1])
    } else {
      merged.push(sorted[i])
    }
  }
  return merged
}
