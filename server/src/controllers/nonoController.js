/**
 * 诺诺·自习室控制器（R-058 一期 agent 形态）
 *
 * 模式参照 talkNpc（人设驱动 SSE 流式 + 复用 ChatSession/ChatTurn），
 * 差异点：
 *   - 会话隔离：title 以「[自习室] 」为前缀，intent='nono'，不污染男德通会话列表
 *   - 三层记忆：L2 复用 compressIfNeeded/buildHistoryWithSummary；L1/L3 走 nonoAgent
 *   - 记忆固化：回复完成后异步 consolidateMemory，完成事件里推送本次新增记忆数
 *   - 权限：灰度期仅 admin（routes 侧 requireRole）
 */

import prisma from '../lib/prisma.js'
import { success, fail, ErrorCode } from '../utils/response.js'
import { chatCompletionStream, TEMPS } from '../utils/llm.js'
import { compressIfNeeded, buildHistoryWithSummary } from '../agents/memoryCompress.js'
import { buildNonoSystemPrompt, searchMemories, consolidateMemory } from '../agents/nonoAgent.js'

const SESSION_PREFIX = '[自习室] '

/** 仅取本用户的自习室会话 */
function nonoSessionWhere(userId) {
  return { userId, title: { startsWith: SESSION_PREFIX } }
}

// ========== POST /api/nono/talk - 和诺诺聊天（SSE 流式）==========
export async function talkNono(req, res, next) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  let clientAborted = false
  req.on('close', () => { clientAborted = true })

  function send(event, data) {
    if (clientAborted || res.destroyed) throw new Error('CLIENT_ABORTED')
    res.write(`event: ${event}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  try {
    const { question, sessionId } = req.body
    if (!question || !question.trim()) {
      send('error', { message: '想说点什么再发送哦' })
      return res.end()
    }

    // 创建或复用自习室会话
    let session = null
    if (sessionId) {
      session = await prisma.chatSession.findFirst({
        where: { id: parseInt(sessionId), ...nonoSessionWhere(req.user.id) },
      })
    }
    if (!session) {
      session = await prisma.chatSession.create({
        data: { userId: req.user.id, title: `${SESSION_PREFIX}${question.slice(0, 20)}` },
      })
    }

    await prisma.chatTurn.create({
      data: { sessionId: session.id, role: 'user', content: question },
    })

    // L2：近期轮次 + 早期摘要
    const historyTurns = await prisma.chatTurn.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    historyTurns.reverse()
    const rawHistory = historyTurns
      .filter((t) => t.content !== question || t.role !== 'user')
      .slice(-19)
      .map((t) => ({ role: t.role, content: t.content }))
    const history = buildHistoryWithSummary(rawHistory, session.summary || null)

    // L1 + L3：诺诺认知与长期记忆检索
    const [profile, memories] = await Promise.all([
      prisma.nonoProfile.findUnique({ where: { userId: req.user.id } }),
      searchMemories(question, req.user.id),
    ])

    const messages = [
      { role: 'system', content: buildNonoSystemPrompt(req.user, profile, memories) },
      ...history,
      { role: 'user', content: question },
    ]

    // L2 压缩检查（异步）
    compressIfNeeded(session.id).catch(() => { /* 失败不阻塞 */ })

    // 流式回复
    let answer = ''
    for await (const chunk of chatCompletionStream(messages, { temperature: TEMPS.NPC })) {
      send('token', { content: chunk })
      answer += chunk
    }

    await prisma.chatTurn.create({
      data: { sessionId: session.id, role: 'assistant', content: answer, intent: 'nono' },
    })

    // 记忆固化（异步等待，完成后随 done 事件告知前端——让"她记住了"可感知）
    const { saved } = await consolidateMemory(req.user, question, answer)

    send('done', { sessionId: session.id, memoriesSaved: saved })
  } catch (err) {
    if (err.message === 'CLIENT_ABORTED' || clientAborted) {
      console.log('[Nono] 客户端主动断开，流式输出已停止')
    } else {
      console.error('[Nono Talk Error]', err.message, err.stack || '')
      const friendly = err.message === 'CONTENT_MODERATION' ? '这个话题诺诺不太方便聊哦'
        : err.message?.includes('超时') ? '诺诺想得太入神了，再叫她一次'
        : err.message?.includes('LLM API') ? '诺诺暂时连不上，稍后再试'
        : `出错了: ${err.message}`
      try { send('error', { message: friendly }) } catch { /* 连接已断 */ }
    }
  } finally {
    res.end()
  }
}

// ========== GET /api/nono/sessions - 自习室会话列表 ==========
export async function listNonoSessions(req, res, next) {
  try {
    const sessions = await prisma.chatSession.findMany({
      where: nonoSessionWhere(req.user.id),
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, createdAt: true, updatedAt: true, _count: { select: { turns: true } } },
    })
    success(res, sessions)
  } catch (err) { next(err) }
}

// ========== GET /api/nono/sessions/:id - 会话详情 ==========
export async function getNonoSession(req, res, next) {
  try {
    const { id } = req.params
    const session = await prisma.chatSession.findFirst({
      where: { id: parseInt(id), ...nonoSessionWhere(req.user.id) },
      include: { turns: { orderBy: { createdAt: 'asc' } } },
    })
    if (!session) return fail(res, ErrorCode.NOT_FOUND.code, '会话不存在', ErrorCode.NOT_FOUND.httpStatus)
    success(res, session)
  } catch (err) { next(err) }
}

// ========== DELETE /api/nono/sessions/:id - 删除会话 ==========
export async function deleteNonoSession(req, res, next) {
  try {
    const { id } = req.params
    const session = await prisma.chatSession.findFirst({
      where: { id: parseInt(id), ...nonoSessionWhere(req.user.id) },
    })
    if (!session) return fail(res, ErrorCode.NOT_FOUND.code, '会话不存在', ErrorCode.NOT_FOUND.httpStatus)
    await prisma.chatSession.delete({ where: { id: session.id } })
    success(res, null, '已删除')
  } catch (err) { next(err) }
}

// ========== GET /api/nono/memories - 诺诺的记忆（透明化：她记住了什么）==========
export async function getNonoMemories(req, res, next) {
  try {
    const [profile, memories] = await Promise.all([
      prisma.nonoProfile.findUnique({ where: { userId: req.user.id } }),
      prisma.nonoMemory.findMany({
        where: { OR: [{ userId: req.user.id }, { userId: null }] },
        orderBy: [{ importance: 'desc' }, { createdAt: 'desc' }],
        take: 100,
      }),
    ])
    success(res, {
      profile: profile?.summary || '',
      memories: memories.map((m) => ({
        id: m.id,
        kind: m.kind,
        content: m.content,
        importance: m.importance,
        shared: m.userId === null,
        createdAt: m.createdAt,
      })),
    })
  } catch (err) { next(err) }
}

// ========== DELETE /api/nono/memories/:id - 删除一条记忆（用户可控权）==========
export async function deleteNonoMemory(req, res, next) {
  try {
    const { id } = req.params
    // 只能删自己的记忆或公共记忆（公共记忆 admin 都可删，routes 已限 admin）
    const memory = await prisma.nonoMemory.findFirst({
      where: { id: parseInt(id), OR: [{ userId: req.user.id }, { userId: null }] },
    })
    if (!memory) return fail(res, ErrorCode.NOT_FOUND.code, '记忆不存在', ErrorCode.NOT_FOUND.httpStatus)
    await prisma.nonoMemory.delete({ where: { id: memory.id } })
    success(res, null, '已删除')
  } catch (err) { next(err) }
}
