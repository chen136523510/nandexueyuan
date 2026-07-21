/**
 * 上下文检索工具
 *
 * 给定一批目标消息 ID，为每条消息取前后各 N 条上下文，
 * 合并去重后返回完整上下文消息列表。
 */

import prisma from '../lib/prisma.js'
import { resolveName } from '../utils/knowledge.js'

/**
 * 为一批消息 ID 取上下文，合并去重
 * 安全限制：最多查 300 条消息，超出截断
 * @param {number[]} targetIds 目标消息 ID 数组
 * @param {number} contextSize 前后各取多少条（默认 5）
 * @returns {Promise<array>} 去重后的上下文消息列表 [{id, nickname, msgTime, content}]
 */
export async function fetchWithContext(targetIds, contextSize = 5) {
  if (!targetIds || targetIds.length === 0) return []

  // 限制目标数量，避免查询范围过大
  const limitedIds = targetIds.slice(0, 50)

  // 收集所有需要查询的 ID 范围
  const idSet = new Set()
  for (const id of limitedIds) {
    for (let i = id - contextSize; i <= id + contextSize; i++) {
      idSet.add(i)
    }
  }

  // 用 IN 查询而非 BETWEEN（避免大范围扫描）
  const allIds = Array.from(idSet).sort((a, b) => a - b)

  // 最多查 300 条（50 目标 × 11 上下文）
  const queryIds = allIds.slice(0, 300)
  const placeholders = queryIds.map(() => '?').join(',')
  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, nickname, msgTime, content FROM group_messages WHERE id IN (${placeholders}) ORDER BY id ASC`,
    ...queryIds,
  )

  // 安全序列化（bigint -> number）
  return JSON.parse(JSON.stringify(rows, (k, v) => (typeof v === 'bigint' ? Number(v) : v)))
}

/**
 * 将消息列表格式化为文本（给大 Agent 用）
 * @param {array} messages 消息列表
 * @returns {string} 格式化后的文本
 */
export function formatMessagesAsText(messages) {
  if (!messages || messages.length === 0) return '(无)'
  return messages
    .map((m) => {
      const name = resolveName(m.nickname)
      const time = new Date(m.msgTime).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      return `[${name} ${time}] ${m.content}`
    })
    .join('\n')
}
