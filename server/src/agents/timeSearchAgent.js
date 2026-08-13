/**
 * 时间范围检索子 Agent
 *
 * 输入：{ startDate: "2026-07-01", endDate: "2026-07-31", keywords?: "游戏" }
 * 逻辑：按 chunkDate 日期范围查 message_chunks，返回聚合统计 + 抽样消息
 * 返回：该时间段内的按日/按周统计 + 代表性话题块摘要
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

  // 1. 统计该范围内消息总数（从 group_messages 直接按日期统计，不依赖分块）
  let dailyStats = []
  try {
    dailyStats = await prisma.$queryRawUnsafe(
      `SELECT strftime('%Y-%m-%d', datetime(msgTime/1000, 'unixepoch', 'localtime')) AS date,
              COUNT(*) as cnt
       FROM group_messages
       WHERE msgTime >= ? AND msgTime <= ?
       GROUP BY date
       ORDER BY date ASC`,
      new Date(startDate).getTime(),
      new Date(endDate).getTime() + 86400000, // endDate 含当天全天
    )
  } catch (err) {
    console.error('[TimeSearch dailyStats Error]', err.message)
  }

  const safeDaily = JSON.parse(JSON.stringify(dailyStats, (k, v) => (typeof v === 'bigint' ? Number(v) : v)))
  const totalMessages = safeDaily.reduce((sum, d) => sum + d.cnt, 0)

  if (totalMessages === 0) {
    emit('time_search', 'done', `${startDate} ~ ${endDate} 范围内未找到消息`)
    return { ok: true, summary: `${startDate} ~ ${endDate} 范围内未找到相关消息`, count: 0 }
  }

  // 2. 查话题块（全部，不限 30）
  let chunks = []
  try {
    let query = `SELECT id, startMsgId, endMsgId, chunkDate, keywords, summary
                 FROM message_chunks
                 WHERE chunkDate BETWEEN ? AND ?`
    const params = [startDate, endDate]

    if (keywords && keywords.trim()) {
      const words = keywords.trim().split(/\s+/).filter((w) => w.length >= 2)
      if (words.length > 0) {
        const likeConditions = words
          .map((w) => `(keywords LIKE '%${w.replace(/'/g, "''")}%' OR summary LIKE '%${w.replace(/'/g, "''")}%')`)
          .join(' OR ')
        query += ` AND (${likeConditions})`
      }
    }

    query += ` ORDER BY chunkDate ASC`

    chunks = await prisma.$queryRawUnsafe(query, ...params)
  } catch (err) {
    console.error('[TimeSearch chunks Error]', err.message)
  }

  const safeChunks = JSON.parse(JSON.stringify(chunks, (k, v) => (typeof v === 'bigint' ? Number(v) : v)))

  emit('time_search', 'searching', `共 ${totalMessages} 条消息，${safeChunks.length} 个话题块，正在生成摘要...`)

  // 3. 按月/周聚合统计（大范围时压缩，小范围时按日展示）
  const rangeMs = new Date(endDate).getTime() - new Date(startDate).getTime()
  const rangeDays = Math.ceil(rangeMs / 86400000)

  let aggregateSummary
  if (rangeDays <= 31) {
    // 31 天以内：按日统计
    aggregateSummary = safeDaily.map((d) => `${d.date}：${d.cnt} 条`).join('\n')
  } else {
    // 超过 31 天：按月统计
    const monthlyMap = new Map()
    for (const d of safeDaily) {
      const month = d.date.slice(0, 7) // YYYY-MM
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + d.cnt)
    }
    aggregateSummary = [...monthlyMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, cnt]) => `${month}：${cnt} 条`)
      .join('\n')
  }

  // 4. 话题块摘要（全部块的 keywords+summary，每块截取前 150 字，不取原始消息）
  const chunkSummaries = safeChunks.map((c, i) => {
    const kw = (c.keywords || '').slice(0, 150)
    const sm = (c.summary || '').slice(0, 100)
    return `${i + 1}. [${c.chunkDate}] ${kw}${sm ? ' | 摘要: ' + sm : ''}`
  }).join('\n')

  // 5. 取少量抽样消息（每天最多 3 条，总共最多 30 条，避免爆 token）
  const sampleMessages = []
  const sampleByDate = new Map()
  for (const d of safeDaily) {
    if (d.cnt > 0) {
      const msgs = await prisma.$queryRawUnsafe(
        `SELECT id, nickname, msgTime, content
         FROM group_messages
         WHERE msgTime >= ? AND msgTime < ?
         ORDER BY msgTime ASC
         LIMIT 3`,
        new Date(d.date).getTime(),
        new Date(d.date).getTime() + 86400000,
      )
      const safeMsgs = JSON.parse(JSON.stringify(msgs, (k, v) => (typeof v === 'bigint' ? Number(v) : v)))
      sampleByDate.set(d.date, safeMsgs)
      sampleMessages.push(...safeMsgs)
      if (sampleMessages.length >= 30) break
    }
  }

  const sampleText = sampleMessages.slice(0, 30).map((m) => {
    const date = new Date(m.msgTime).toLocaleString('zh-CN')
    return `[${date}] ${resolveName(m.nickname)}：${(m.content || '').slice(0, 80)}`
  }).join('\n')

  const summary = `${startDate} ~ ${endDate} 共 ${totalMessages} 条消息，${safeChunks.length} 个话题块。

消息分布（${rangeDays <= 31 ? '按日' : '按月'}）：
${aggregateSummary}

话题块摘要（共 ${safeChunks.length} 块）：
${chunkSummaries}

抽样消息（每天最多3条，共 ${sampleMessages.length} 条）：
${sampleText}`

  emit('time_search', 'done', `时间检索完成（${startDate} ~ ${endDate}，${totalMessages} 条消息，${safeChunks.length} 个话题块）`, {
    count: totalMessages,
    chunkCount: safeChunks.length,
  })

  return {
    ok: true,
    summary,
    formattedText: summary,
    count: totalMessages,
  }
}
