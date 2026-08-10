/**
 * 数据库信息子 Agent
 *
 * 查询数据库本身的元信息：消息总数、时间跨度、参与人数、活跃成员排行、版本公告。
 * 不经过 LLM，直接执行 SQL，避免幻觉。
 *
 * 当用户问到"数据库有多少条消息""群聊跨度多长""谁最活跃""版本信息"等
 * 关于数据本身的问题时，orchestrator 派发 db_info 任务。
 */

import prisma from '../lib/prisma.js'
import { resolveName } from '../utils/knowledge.js'

/**
 * 执行数据库信息查询
 */
export async function runDbInfoAgent(task, emit) {
  emit('db_info', 'analyzing', '正在查询数据库统计信息...')

  // 1. 消息总数 + 时间跨度
  const [overview] = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) as total,
            MIN(msgTime) as earliest,
            MAX(msgTime) as latest
     FROM group_messages`,
  ).catch(() => [{ total: 0, earliest: null, latest: null }])

  // 2. 参与人数（不同 nickname 数量，排除空昵称）
  const [speakerCount] = await prisma.$queryRawUnsafe(
    `SELECT COUNT(DISTINCT nickname) as cnt FROM group_messages WHERE nickname IS NOT NULL AND nickname != ''`,
  ).catch(() => [{ cnt: 0 }])

  // 3. 发言最多的 Top 10 成员
  const topMembers = await prisma.$queryRawUnsafe(
    `SELECT nickname, COUNT(*) as cnt
     FROM group_messages
     WHERE nickname IS NOT NULL AND nickname != '' AND nickname != '我'
     GROUP BY nickname
     ORDER BY cnt DESC
     LIMIT 10`,
  ).catch(() => [])

  // 4. 分块统计
  const [chunkStats] = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) as total,
            MIN(chunkDate) as earliest,
            MAX(chunkDate) as latest
     FROM message_chunks`,
  ).catch(() => [{ total: 0, earliest: null, latest: null }])

  // 5. 版本信息（最新版）
  let versionInfo = null
  try {
    versionInfo = await prisma.version.findFirst({
      orderBy: { date: 'desc' },
      select: { version: true, date: true, summary: true, updates: true, plans: true },
    })
  } catch {
    // Version 表可能不存在
  }

  // 6. 按年份统计消息数
  const yearlyStats = await prisma.$queryRawUnsafe(
    `SELECT strftime('%Y', datetime(msgTime/1000, 'unixepoch', 'localtime')) AS year, COUNT(*) as cnt
     FROM group_messages
     GROUP BY year
     ORDER BY year ASC`,
  ).catch(() => [])

  // 7. 按年份的话题分布（从 message_chunks 提取）
  const yearlyChunks = await prisma.$queryRawUnsafe(
    `SELECT substr(chunkDate, 1, 4) AS year, COUNT(*) as cnt,
            GROUP_CONCAT(DISTINCT substr(keywords, 1, 200)) as sample
     FROM message_chunks
     GROUP BY year
     ORDER BY year ASC`,
  ).catch(() => [])

  // 格式化输出
  const safe = JSON.parse(JSON.stringify(
    { overview, speakerCount, topMembers, chunkStats, yearlyStats, yearlyChunks },
    (k, v) => (typeof v === 'bigint' ? Number(v) : v),
  ))

  const total = safe.overview?.total || 0
  const earliest = safe.overview?.earliest ? new Date(safe.overview.earliest).toLocaleDateString('zh-CN') : '未知'
  const latest = safe.overview?.latest ? new Date(safe.overview.latest).toLocaleDateString('zh-CN') : '未知'
  const speakers = safe.speakerCount?.cnt || 0
  const chunkTotal = safe.chunkStats?.total || 0

  const topList = (safe.topMembers || [])
    .map((m, i) => `${i + 1}. ${resolveName(m.nickname)}：${m.cnt} 条`)
    .join('\n')

  const ver = versionInfo
    ? `${versionInfo.version}（${versionInfo.summary}）`
    : '未知'

  // 按年份统计
  const yearLines = (safe.yearlyStats || [])
    .map((y) => `${y.year}年：${Number(y.cnt).toLocaleString()} 条`)
    .join('\n')

  // 按年份话题分布（每取前200字符做样本）
  const yearTopicLines = (safe.yearlyChunks || [])
    .map((y) => {
      const sample = (y.sample || '').slice(0, 300)
      return `${y.year}年（${y.cnt}个话题块）：${sample}`
    })
    .join('\n')

  const summary = `数据库统计：
- 群聊消息总数：${total.toLocaleString()} 条
- 时间跨度：${earliest} ~ ${latest}
- 参与发言人数：${speakers} 人
- 话题分块：${chunkTotal} 个
- 当前网站版本：${ver}

发言最多的成员（Top 10）：
${topList}

按年份消息数：
${yearLines}

按年份话题分布（每取前300字）：
${yearTopicLines}`

  emit('db_info', 'done', `数据库统计完成（${total.toLocaleString()} 条消息，${earliest} ~ ${latest}）`)

  return {
    ok: true,
    summary,
    formattedText: summary,
    count: 1,
  }
}
