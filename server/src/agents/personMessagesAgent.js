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

  const allNames = [member.name, ...member.nicknames, ...member.aliases]
  const likeConditions = allNames.map((n) => `nickname LIKE '%${n.replace(/'/g, "''")}%'`)
  return { names: allNames, likeConditions }
}

/**
 * 执行人物发言检索
 * @param {{ target: string }} task 任务
 * @param {function} emit SSE 回调
 */
export async function runPersonMessagesAgent(task, emit) {
  const { target } = task
  emit('person_messages', 'analyzing', `正在查找 ${target} 的发言...`)

  const { names, likeConditions } = buildPersonConditions(target)
  const conditionSql = likeConditions.join(' OR ')

  // 查该人的全部发言（按时间排序）
  emit('person_messages', 'searching', `正在检索 ${target} 的全部发言（匹配：${names.join('、')}）...`)

  const userMessages = await prisma.$queryRawUnsafe(
    `SELECT id, nickname, msgTime, content FROM group_messages WHERE ${conditionSql} ORDER BY msgTime ASC`,
  ).catch((err) => {
    console.error('[PersonMessages] 查询失败:', err.message)
    return []
  })

  const safeMessages = JSON.parse(JSON.stringify(userMessages, (k, v) => (typeof v === 'bigint' ? Number(v) : v)))

  if (safeMessages.length === 0) {
    emit('person_messages', 'done', `未找到 ${target} 的发言记录`)
    return { ok: false, error: `未找到 ${target} 的发言` }
  }

  emit('person_messages', 'searching', `找到 ${safeMessages.length} 条发言，正在获取上下文...`)

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

  emit('person_messages', 'done', `找到 ${safeMessages.length} 条发言（含上下文 ${contextMessages.length} 条）`, {
    count: safeMessages.length,
    sample: messagesWithContext.slice(0, 3).map((m) => ({ nickname: m.nickname, content: (m.content || '').slice(0, 60) })),
  })

  return {
    ok: true,
    messages: messagesWithContext,
    count: safeMessages.length,
    target,
    matchedNames: names,
    // 给大 Agent 用的格式化文本
    formattedText: formatMessagesAsText(contextMessages),
  }
}
