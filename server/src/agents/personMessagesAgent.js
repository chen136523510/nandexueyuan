/**
 * 人物发言子 Agent
 *
 * 输入：{ target: "丘序明" }
 * 逻辑：反查 talker/nickname/外号 -> 查该人全部发言 -> 每条带前后各5条上下文
 * 返回：{ ok: true, messages, count } 或 { ok: false, error }
 */

import prisma from '../lib/prisma.js'
import { members, resolveName } from '../utils/knowledge.js'
import { fetchWithContext, formatMessagesAsText } from './contextSearch.js'

// 从姓名反查所有可能的匹配条件
function buildPersonConditions(target) {
  const member = members.find(
    (m) => m.name === target || m.aliases.includes(target) || m.nicknames.includes(target),
  )

  if (!member) {
    return { names: [target], likeConditions: [`nickname LIKE '%${target.replace(/'/g, "''")}%'`] }
  }

  // 精确匹配（痛点13修正）：只查该人自己发的消息，LIKE 会把别人提到该人的消息也计入
  const allNames = [member.name, ...member.nicknames, ...member.aliases]
  const likeConditions = allNames.map((n) => `nickname = '${n.replace(/'/g, "''")}'`)
  return { names: allNames, likeConditions }
}

/**
 * 执行人物发言检索
 * @param {{ target: string }} task 任务
 * @param {function} emit SSE 回调
 * @param {{ limit?: number|null }} options 可选参数（limit=null 表示全量，黑机用）
 */
export async function runPersonMessagesAgent(task, emit, options = {}) {
  const { target } = task
  // limit 语义：undefined=默认 50；数字=显式条数；null=黑机全量模式
  // BUG-74 修复：原 `limit ?? 50` 在 null 时也取默认值，黑机全量名不副实（实际仍 50 条）
  const limit = options.limit !== undefined ? options.limit : 50
  const limitSql = limit === null ? '' : `LIMIT ${limit}`
  // 全量模式（null）传给大 Agent 的条数上限（有界，防 OOM；真·全量走 fullAnalysisAgent 分批管线）
  const msgSlice = limit === null ? 300 : limit
  const ctxSlice = limit === null ? 1500 : limit ?? 200
  emit('person_messages', 'analyzing', `正在查找 ${target} 的发言...`)

  const { names, likeConditions } = buildPersonConditions(target)
  const conditionSql = likeConditions.join(' OR ')

  // 查该人的发言（限制最多 50 条，按时间倒序取最近的）
  emit('person_messages', 'searching', `正在检索 ${target} 的发言（匹配：${names.join('、')}）...`)

  const userMessages = await prisma.$queryRawUnsafe(
    `SELECT id, nickname, msgTime, content FROM group_messages WHERE ${conditionSql} ORDER BY msgTime DESC ${limitSql}`,
  ).catch((err) => {
    console.error('[PersonMessages] 查询失败:', err.message)
    return []
  })

  // 同时查总数（用 COUNT，不返回全量数据）
  const countResult = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) as total FROM group_messages WHERE ${conditionSql}`,
  ).catch(() => [{ total: 0 }])
  const totalCount = JSON.parse(JSON.stringify(countResult, (k, v) => (typeof v === 'bigint' ? Number(v) : v)))[0]?.total || 0

  const safeMessages = JSON.parse(JSON.stringify(userMessages, (k, v) => (typeof v === 'bigint' ? Number(v) : v)))

  if (safeMessages.length === 0) {
    emit('person_messages', 'done', `未找到 ${target} 的发言记录`)
    return { ok: false, error: `未找到 ${target} 的发言` }
  }

  emit('person_messages', 'searching', `${target} 共 ${totalCount} 条发言，取最近 ${safeMessages.length} 条，获取上下文中...`)

  // 取上下文（前后各5条）
  const targetIds = safeMessages.map((m) => m.id)
  const contextMessages = await fetchWithContext(targetIds, 5)

  // 构建上下文索引（按 id 映射）
  const contextMap = new Map()
  for (const msg of contextMessages) {
    contextMap.set(msg.id, msg)
  }

  // 为每条发言标注上下文
  const messagesWithContext = safeMessages.map((msg) => {
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

  emit('person_messages', 'done', `${target} 共 ${totalCount} 条发言，取最近 ${safeMessages.length} 条（含上下文 ${contextMessages.length} 条）`, {
    count: totalCount,
    sample: messagesWithContext.slice(0, 3).map((m) => ({ nickname: m.nickname, content: (m.content || '').slice(0, 60) })),
  })

  // 只传前 N 条发言 + 上下文给大 Agent（避免文本过大导致服务器 OOM）
  const limitedMessages = messagesWithContext.slice(0, msgSlice)
  const flatList = limitedMessages
    .flatMap((m) => [m, ...m.context])
    .filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
    .slice(0, ctxSlice)
  const limitedText = formatMessagesAsText(flatList)

  return {
    ok: true,
    messages: limitedMessages,
    count: totalCount,
    target,
    matchedNames: names,
    formattedText: limitedText,
    flatMessages: flatList, // 供 orchestrator 跨 Agent 按 id 去重（person/mentioned 上下文高度重叠）
  }
}
