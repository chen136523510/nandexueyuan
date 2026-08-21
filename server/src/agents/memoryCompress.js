/**
 * 对话记忆压缩（痛点21）
 *
 * 超过 COMPRESS_THRESHOLD 轮的会话，把早期轮次压缩为一条摘要存 ChatSession.summary，
 * 注入 system prompt 保留早期上下文。增量式：新摘要 = 旧摘要 + 新压入的轮次。
 *
 * 前端展示：ChatView 收到 history_compressed SSE 事件时显示"更早对话已压缩"提示条，
 * 摘要原文通过会话详情接口返回（session.summary），用户可展开查看，防误操作/疑惑。
 */

import prisma from '../lib/prisma.js'
import { chatCompletion } from '../utils/llm.js'

// 触发压缩的轮次阈值（user+assistant 各算 1 turn，10 轮 = 20 turns）
export const COMPRESS_THRESHOLD = 20

// 每次压缩保留最近 N turns 不动（作为正常 history 注入）
const KEEP_RECENT_TURNS = 10

/**
 * 压缩提示词：把早期对话轮次压缩为要点摘要
 */
function buildSummaryPrompt(oldSummary, turnsText) {
  const messages = [
    {
      role: 'system',
      content: `你是对话摘要助手。把用户与AI助手的早期对话压缩为要点摘要，供后续对话时作为上下文记忆。

要求：
- 保留关键信息：聊过的话题、提到的成员人名、得出的数据结论、用户的偏好/意图
- 用简洁的要点列表，每条一行
- 总长度不超过 300 字
- 不要寒暄，不要"用户问了...AI回答了..."的流水账，只提炼信息点
${oldSummary ? `\n已有旧摘要（把新内容合并进去，重新组织）：\n${oldSummary}` : ''}`,
    },
    { role: 'user', content: `需要压缩的对话内容：\n${turnsText}` },
  ]
  return messages
}

/**
 * 检查并压缩会话的早期轮次（在 assistant turn 入库后调用）
 *
 * @param {number} sessionId 会话 id
 * @returns {Promise<{compressed: boolean, summary?: string}>} 是否执行了压缩
 */
export async function compressIfNeeded(sessionId) {
  try {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { summary: true, _count: { select: { turns: true } } },
    })
    if (!session) return { compressed: false }

    const turnCount = session._count.turns
    if (turnCount < COMPRESS_THRESHOLD) return { compressed: false }

    // 取除最近 KEEP_RECENT_TURNS 外的早期 turns（本次增量：只压上次没压过的）
    // 简化实现：每次都取"全部早期轮次"重新摘要（LLM 幂等重写，旧摘要作为输入合并）
    const earlyTurns = await prisma.chatTurn.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: turnCount - KEEP_RECENT_TURNS,
    })
    earlyTurns.reverse() // 时间正序

    if (earlyTurns.length === 0) return { compressed: false }

    const turnsText = earlyTurns
      .map((t) => `${t.role === 'user' ? '用户' : '男德通'}：${(t.content || '').slice(0, 200)}`)
      .join('\n')
      .slice(0, 8000) // 防超长

    const summary = await chatCompletion(buildSummaryPrompt(session.summary, turnsText), {
      temperature: 0,
    })

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { summary: summary.trim() },
    })

    console.log(`[MemoryCompress] 会话 ${sessionId} 已压缩：${earlyTurns.length} 早期轮次 -> ${summary.length} 字摘要`)
    return { compressed: true, summary: summary.trim() }
  } catch (err) {
    // 压缩失败不影响主流程（下次会再试）
    console.error('[MemoryCompress] 压缩失败:', err.message)
    return { compressed: false }
  }
}

/**
 * 构建带摘要的 history（供 orchestrator 使用）
 * - 注入一条 system 风格的摘要消息在 history 头部
 * - 只返回最近 KEEP_RECENT_TURNS*2 turns 作为正常 history
 *
 * @param {array} turns 全部 turns（时间正序）
 * @param {string|null} summary 会话摘要
 * @returns {array} 处理后的 history
 */
export function buildHistoryWithSummary(turns, summary) {
  if (!summary) return turns

  const summarizedCount = Math.max(0, turns.length - KEEP_RECENT_TURNS * 2)
  const summaryMsg = {
    role: 'assistant',
    content: `【早期对话摘要（系统压缩）】\n${summary}`,
  }
  const recent = turns.slice(summarizedCount)
  return [summaryMsg, ...recent]
}
