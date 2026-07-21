/**
 * 人物统计子 Agent
 *
 * 输入：{ target: "丘序明" }
 * 逻辑：LLM 生成 SQL 查该人的发言总数、最活跃时段、高频词等
 * 返回：{ ok: true, summary, sql, result } 或 { ok: false, error }
 */

import prisma from '../lib/prisma.js'
import { chatCompletion } from '../utils/llm.js'
import { members, resolveName } from '../utils/knowledge.js'

// SQL 安全校验
function validateSql(sql) {
  const normalized = sql.trim().toLowerCase()
  if (!normalized.startsWith('select')) return false
  const dangerous = ['insert', 'update', 'delete', 'drop', 'alter', 'create', 'truncate', 'pragma', 'attach', 'detach']
  for (const kw of dangerous) {
    if (normalized.includes(kw)) return false
  }
  return true
}

// 从姓名反查所有可能的匹配条件（talker/nickname/外号）
function buildPersonConditions(target) {
  // 在成员列表中查找匹配的人
  const member = members.find(
    (m) => m.name === target || m.aliases.includes(target) || m.nicknames.includes(target),
  )

  if (!member) {
    // 没找到精确匹配，用原始 target 做模糊匹配
    return { names: [target], likeConditions: [`nickname LIKE '%${target.replace(/'/g, "''")}%'`] }
  }

  // 收集所有可能的昵称和真名
  const allNames = [member.name, ...member.nicknames, ...member.aliases]
  const likeConditions = allNames.map((n) => `nickname LIKE '%${n.replace(/'/g, "''")}%'`)
  return { names: allNames, likeConditions }
}

/**
 * 执行人物统计检索
 * @param {{ target: string }} task 任务
 * @param {function} emit SSE 回调
 */
export async function runPersonStatAgent(task, emit) {
  const { target } = task
  emit('person_stat', 'analyzing', `正在分析 ${target} 的统计需求...`)

  const { names, likeConditions } = buildPersonConditions(target)
  const nameList = names.join("' OR nickname LIKE '%")

  // 直接执行统计 SQL（不经过 LLM，避免幻觉）
  // 1. 总发言数
  const conditionSql = likeConditions.join(' OR ')
  const totalResult = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) as total FROM group_messages WHERE ${conditionSql}`,
  ).catch(() => [{ total: 0 }])

  // 2. 按年月统计活跃度
  const monthlyResult = await prisma.$queryRawUnsafe(
    `SELECT strftime('%Y-%m', datetime(msgTime/1000, 'unixepoch', 'localtime')) AS ym, COUNT(*) as cnt
     FROM group_messages WHERE ${conditionSql}
     GROUP BY ym ORDER BY cnt DESC LIMIT 5`,
  ).catch(() => [])

  // 3. 发言内容长度统计
  const lengthResult = await prisma.$queryRawUnsafe(
    `SELECT AVG(length(content)) as avgLen, MAX(length(content)) as maxLen FROM group_messages WHERE ${conditionSql}`,
  ).catch(() => [{ avgLen: 0, maxLen: 0 }])

  const safeResult = JSON.parse(JSON.stringify(
    { total: totalResult, monthly: monthlyResult, length: lengthResult },
    (k, v) => (typeof v === 'bigint' ? Number(v) : v),
  ))

  const totalCount = safeResult.total[0]?.total || 0
  const topMonth = safeResult.monthly[0]?.ym || '未知'
  const avgLen = Math.round(safeResult.length[0]?.avgLen || 0)

  const summary = `${target}（匹配昵称：${names.join('、')}）共发言 ${totalCount} 条，最活跃月份是 ${topMonth}，平均发言长度 ${avgLen} 字符`

  emit('person_stat', 'done', summary, safeResult)

  return {
    ok: true,
    summary,
    result: safeResult,
    target,
    matchedNames: names,
  }
}
