/**
 * 诺诺·自习室控制器（R-058 v4.1.0 直播间形态）
 *
 * 院长 2026-09-24 裁决：去掉私人会话（"不需要新的闲聊之类的，做成类似直播间的文字互动"）——
 * 所有人共享同一条公共消息流，诺诺在流里回复，像直播聊天区。
 *
 * 架构：
 *   - nono_messages 公共流表（userId null = 诺诺发言）
 *   - GET  /api/nono/stream   EventSource 订阅（token 走 query，auth 中间件已支持）：
 *       广播事件 user_message / nono_typing / nono_token / nono_message / nono_error，25s 心跳
 *   - GET  /api/nono/messages 历史消息（before 游标向前翻）
 *   - POST /api/nono/talk      发消息进流 → 广播 → 触发诺诺回复
 *   - 回复触发：串行队列——诺诺一次只回一轮；回复期间新到的消息不各自触发，
 *     回复结束后若仍有未覆盖的新消息（lastMsgId 之后）则再来一轮（天然攒批，直播感）
 *   - L2 = 最近 30 条公共流消息；记忆按"本轮触发者"检索与固化（她认人）
 */

import prisma from '../lib/prisma.js'
import { success, fail, ErrorCode } from '../utils/response.js'
import { chatCompletionStream, TEMPS } from '../utils/llm.js'
import { buildNonoSystemPrompt, searchMemories, consolidateMemory } from '../agents/nonoAgent.js'

// ========== SSE 广播器（进程内；PM2 单进程下所有订阅者共享）==========

const subscribers = new Set()

// 心跳：全局单例 interval，防 Nginx/代理掐空闲连接
setInterval(() => {
  for (const res of subscribers) {
    try { res.write(': ping\n\n') } catch { subscribers.delete(res) }
  }
}, 25000).unref()

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const res of subscribers) {
    try { res.write(payload) } catch { subscribers.delete(res) }
  }
}

// ========== 诺诺回复队列（串行 + 待处理攒批）==========

let replying = false
let lastRepliedMsgId = 0 // 诺诺最后一轮已覆盖到的消息 id

/** 批量给消息附昵称（NonoMessage 不建 Prisma 关联，避免多余 FK 迁移；20 人规模批量查无压力） */
async function withNicknames(msgs) {
  const userIds = [...new Set(msgs.filter((m) => m.userId).map((m) => m.userId))]
  if (!userIds.length) return msgs.map((m) => ({ ...m, nickname: '诺诺' }))
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, nickname: true, username: true },
  })
  const nameMap = new Map(users.map((u) => [u.id, u.nickname || u.username || '同学']))
  return msgs.map((m) => ({ ...m, nickname: m.userId ? (nameMap.get(m.userId) || '同学') : '诺诺' }))
}

function messageText(msg) {
  return msg.userId ? `${msg.nickname}：${msg.content}` : `诺诺：${msg.content}`
}

async function runReplyCycle() {
  if (replying) return
  replying = true
  try {
    // 循环：一轮回完若又有新消息（别人在她说的时候发话），继续接一轮
    while (true) {
      const recent = await prisma.nonoMessage.findMany({
        where: { id: { gt: lastRepliedMsgId }, userId: { not: null } },
        orderBy: { id: 'asc' },
        take: 1,
      })
      if (!recent.length) break
      await replyOnce()
    }
  } catch (err) {
    console.error('[Nono] 回复循环异常:', err.message)
  } finally {
    replying = false
  }
}

async function replyOnce() {
  // 触发者 = 未回复的用户消息里最新一条的作者（直播感：她在回应最近说话的人）
  const pendingUserMsgs = await prisma.nonoMessage.findMany({
    where: { id: { gt: lastRepliedMsgId }, userId: { not: null } },
    orderBy: { id: 'asc' },
  })
  if (!pendingUserMsgs.length) return
  const triggerMsg = pendingUserMsgs[pendingUserMsgs.length - 1]
  lastRepliedMsgId = triggerMsg.id

  // L2：最近 30 条公共流（含诺诺自己的话）
  const flow = await withNicknames(await prisma.nonoMessage.findMany({
    orderBy: { id: 'desc' },
    take: 30,
  }))
  flow.reverse()
  const flowText = flow.map(messageText).join('\n')

  // L1 + L3：按触发者检索记忆
  const [user, profile, memories] = await Promise.all([
    prisma.user.findUnique({ where: { id: triggerMsg.userId } }),
    prisma.nonoProfile.findUnique({ where: { userId: triggerMsg.userId } }),
    searchMemories(pendingUserMsgs.map((m) => m.content).join(' '), triggerMsg.userId),
  ])
  if (!user) return
  const nickname = user.nickname || user.username || '同学'

  const messages = [
    {
      role: 'system',
      content: buildNonoSystemPrompt(user, profile, memories)
        + `\n\n【直播间规则】\n- 这是自习室的公共聊天流，下面是多人的聊天记录（每行"昵称：内容"）\n- 你主要回应最近说话的人（${nickname}），但其他人插话也要自然顾及\n- 你的回复是发进直播流的一条消息，简短（通常 1-3 句），像在自习室里小声说话，不打扰别人\n\n【最近的直播流】\n${flowText}`,
    },
    { role: 'user', content: `${nickname}：${triggerMsg.content}` },
  ]

  broadcast('nono_typing', {})
  let answer = ''
  try {
    for await (const chunk of chatCompletionStream(messages, { temperature: TEMPS.NPC })) {
      broadcast('nono_token', { content: chunk })
      answer += chunk
    }
  } catch (err) {
    console.error('[Nono] 回复生成失败:', err.message)
    answer = answer || '（揉了揉眼睛）抱歉，刚刚走神了……再说一次好吗？'
  }
  if (!answer.trim()) answer = '（眨眨眼）……'

  // 落库 + 记忆固化（按触发者）
  const saved = await prisma.nonoMessage.create({ data: { userId: null, content: answer } })
  const { saved: memoriesSaved } = await consolidateMemory(user, pendingUserMsgs.map((m) => m.content).join('\n'), answer).catch(() => ({ saved: 0 }))

  broadcast('nono_message', { id: saved.id, content: answer, memoriesSaved })
}

// ========== GET /api/nono/stream - 直播流订阅（EventSource）==========
export async function streamNono(req, res, next) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  // 给新订阅者立刻回执（前端据此确认连接建立）
  res.write(`event: connected\ndata: ${JSON.stringify({ replying })}\n\n`)
  subscribers.add(res)

  req.on('close', () => {
    subscribers.delete(res)
    res.end()
  })
}

// ========== GET /api/nono/messages - 历史消息（before 游标）==========
export async function listNonoMessages(req, res, next) {
  try {
    const before = parseInt(req.query.before) || null
    const limit = Math.min(parseInt(req.query.limit) || 50, 100)
    const msgs = await prisma.nonoMessage.findMany({
      where: before ? { id: { lt: before } } : {},
      orderBy: { id: 'desc' },
      take: limit,
    })
    msgs.reverse()
    const withNames = await withNicknames(msgs)
    success(res, {
      messages: withNames.map((m) => ({
        id: m.id,
        role: m.userId ? 'user' : 'nono',
        nickname: m.nickname,
        content: m.content,
        createdAt: m.createdAt,
      })),
      hasMore: msgs.length === limit,
    })
  } catch (err) { next(err) }
}

// ========== POST /api/nono/talk - 发消息进直播流 ==========
export async function talkNono(req, res, next) {
  try {
    const { content } = req.body
    const text = (content || '').trim()
    if (!text) return fail(res, ErrorCode.PARAM_ERROR.code, '想说点什么再发送哦', ErrorCode.PARAM_ERROR.httpStatus)
    if (text.length > 500) return fail(res, ErrorCode.PARAM_ERROR.code, '一条最多 500 字', ErrorCode.PARAM_ERROR.httpStatus)

    const msg = await prisma.nonoMessage.create({
      data: { userId: req.user.id, content: text },
    })
    const nickname = req.user.nickname || req.user.username || '同学'

    broadcast('user_message', {
      id: msg.id,
      nickname,
      content: msg.content,
      createdAt: msg.createdAt,
    })

    // 触发诺诺（串行队列内部自带攒批）
    runReplyCycle().catch(() => {})

    success(res, { messageId: msg.id })
  } catch (err) { next(err) }
}

// ========== GET /api/nono/memories - 诺诺的记忆（开发阶段可视化；开放后收敛后台，院长 2026-09-24 裁决）==========
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

// ========== DELETE /api/nono/memories/:id - 删除一条记忆（同上，开发阶段工具）==========
export async function deleteNonoMemory(req, res, next) {
  try {
    const { id } = req.params
    const memory = await prisma.nonoMemory.findFirst({
      where: { id: parseInt(id), OR: [{ userId: req.user.id }, { userId: null }] },
    })
    if (!memory) return fail(res, ErrorCode.NOT_FOUND.code, '记忆不存在', ErrorCode.NOT_FOUND.httpStatus)
    await prisma.nonoMemory.delete({ where: { id: memory.id } })
    success(res, null, '已删除')
  } catch (err) { next(err) }
}
