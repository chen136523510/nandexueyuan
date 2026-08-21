import prisma from '../lib/prisma.js'
import { success, fail, ErrorCode } from '../utils/response.js'
import { chatCompletionStream, TEMPS } from '../utils/llm.js'
import { CHAT_PERSONA } from '../utils/persona.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { orchestrate } from '../agents/orchestrator.js'
import { queryDbStats } from '../agents/dbInfoAgent.js'
import { compressIfNeeded, buildHistoryWithSummary } from '../agents/memoryCompress.js'
import multer from 'multer'

// ESM __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
// chatController.js 在 server/src/controllers/，到 prd/ 要 ../../../
const PRD_ROOT = resolve(__dirname, '../../../prd')

// ========== 聊天图片上传（多模态一期）==========
// 与 wallController 的 uploads/wall 同级约定，静态服务 /uploads/** 已全局生效
const chatUploadDir = resolve('uploads/chat')
import { existsSync, mkdirSync } from 'node:fs'
if (!existsSync(chatUploadDir)) mkdirSync(chatUploadDir, { recursive: true })

const CHAT_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const chatImageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, chatUploadDir),
    filename: (req, file, cb) => {
      const ext = (file.originalname.match(/\.[a-zA-Z0-9]+$/) || ['.png'])[0].toLowerCase()
      cb(null, `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`)
    },
  }),
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB/张
  fileFilter: (req, file, cb) => {
    if (!CHAT_IMAGE_MIMES.includes(file.mimetype)) {
      return cb(new Error('仅支持 jpg/png/webp/gif 图片'))
    }
    cb(null, true)
  },
})

// ========== POST /api/chat/upload - 聊天图片上传（多模态一期）==========
export async function uploadChatImage(req, res, next) {
  try {
    if (!req.file) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '未收到图片文件', ErrorCode.PARAM_ERROR.httpStatus)
    }
    success(res, { url: `/uploads/chat/${req.file.filename}` })
  } catch (err) {
    next(err)
  }
}

// ========== 系统人设（统一引用 persona.js）==========
const SYSTEM_PERSONA = CHAT_PERSONA

// ========== 德塔游戏 NPC 人设（男德通游戏版）==========
function readDoc(relPath) {
  try {
    return readFileSync(resolve(PRD_ROOT, relPath), 'utf-8')
  } catch (e) {
    console.warn(`[GamePersona] 文档读取失败: ${relPath}`, e.message)
    return ''
  }
}

/**
 * 解析成员信息填写表 markdown，提取成紧凑的纯文本列表（方便 AI 检索）
 * 输出格式：1. 陈梓键 - 外号：蛋哥、mico - 院长
 */
function parseRoster(mdText) {
  const lines = mdText.split('\n')
  const result = []
  for (const line of lines) {
    // 匹配表格行：| # | 姓名 | 外号 | 现状 | ... |
    const m = line.match(/^\|\s*(\d+)\s*\|\s*([^|]+)\|([^|]*)\|([^|]*)\|/)
    if (!m) continue
    const idx = m[1].trim()
    const name = m[2].trim()
    const aliases = m[3].trim()
    const status = m[4].trim()
    if (name === '姓名' || !name) continue
    let entry = `${idx}. ${name}`
    if (aliases) entry += ` - 外号：${aliases}`
    if (status) entry += ` - ${status}`
    result.push(entry)
  }
  return result.join('\n')
}

function buildGamePersona(userNickname, rosterText) {
  const worldView = readDoc('01-需求文档/04-德塔/02-设计/德塔世界观.md')
  const interactReq = readDoc('01-需求文档/04-德塔/01-需求/德塔男德通交互需求.md')

  return `你是「男德通」本人--男德学院德塔世界里的 NPC 向导。你的外形碰巧是个美少女（参考 MyGo 千早爱音的粉发眼镜少女），性格古灵精怪、爱开玩笑、学识渊博、善良正直。

【关于身份（最重要）】
- 你就是「男德通」，这就是你的名字，也是你唯一的身份
- 绝对不要自称"美少女"，不要说"我是个美少女""作为美少女的我"之类的话
- 被问"你是谁"，回答"我是男德通呀"；被问"你是男生女生"，可以俏皮回避（如"猜猜看~"），但不要自报"美少女"
- 外形是美少女 ≠ 身份是美少女：你的言行举止可以活泼可爱撒娇，但自我认知永远是「男德通」

【当前对话者】
- 正在和你说话的玩家是「${userNickname}」，这是系统告诉你的真实身份，绝对不会错
- 只有当对话者的发言涉及自我介绍或身份时（比如"我是xx"），才需要用这个真实身份来回应或识破冒充
- 平时正常聊天就好，不要每句话都扯到对方的身份上

【说话风格】
- 俏皮可爱，爱用「~」「哦」「啦」等语气词（这就是"美少女感"的体现）
- 简短直接，每次回复不超过 50 字
- 绝对禁止换行（整段输出，不要 \\n）
- 可以开玩笑、调侃，但不损人
- **禁止在回复内容里使用 @ 符号**（@ 前缀由系统自动添加，你不需要自己写 @xxx）

【知识范围】
- 你是德塔世界的向导，了解德塔的世界观、地点、玩法
- 超出德塔范围的问题（如现实世界的事），用俏皮口吻引导回德塔话题
- 不说"我是 AI""我是语言模型"等破坏沉浸感的话

【兜底规则】
- 不知道的问题，说类似「这个我也不太清楚呢~要不你先去大厅转转？」
- 不要编造德塔里没有的功能或地点

【世界观摘要】
${worldView.slice(0, 800)}

【交互要点】
${interactReq.slice(0, 500)}

【花名册（男德学院成员，最后一项最重要）】
以下是学院全部成员名单，包含姓名、外号/绰号、现状。玩家问到任何人，你都要从这里查找并用花名册里的信息回答：
${rosterText}`
}

// ========== POST /api/chat/ask - 提问（SSE 流式） ==========
export async function askChat(req, res, next) {
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  // 客户端断开检测（用户点"停止生成"时前端 abort fetch）
  let clientAborted = false
  req.on('close', () => {
    clientAborted = true
  })

  // SSE 发送辅助函数（客户端断开后中断流式输出）
  function send(event, data) {
    if (clientAborted || res.destroyed) {
      throw new Error('CLIENT_ABORTED')
    }
    res.write(`event: ${event}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  try {
    let { question, sessionId, personaId, customDesc, images } = req.body

    // 图片校验（多模态一期）：最多 3 张，必须是本站 /uploads/chat/ 前缀（visionAgent 侧还有二次路径校验）
    if (images !== undefined) {
      if (!Array.isArray(images)) images = []
      images = images.filter((u) => typeof u === 'string' && /^\/uploads\/chat\/[\w.-]+$/.test(u)).slice(0, 3)
    }

    const hasImages = images?.length > 0
    if ((!question || !question.trim()) && !hasImages) {
      send('error', { message: '问题不能为空' })
      return res.end()
    }
    if (!question || !question.trim()) question = '[图片]' // 只发图无文字

    // 创建或复用会话
    let session = null
    if (sessionId) {
      session = await prisma.chatSession.findFirst({
        where: { id: parseInt(sessionId), userId: req.user.id },
      })
    }
    if (!session) {
      session = await prisma.chatSession.create({
        data: { userId: req.user.id, title: question.slice(0, 20) },
      })
    }

    // 保存用户消息（图片 URL 数组单独存 images 列，识别描述由 orchestrator 写回——见下方二次更新）
    await prisma.chatTurn.create({
      data: {
        sessionId: session.id,
        role: 'user',
        content: question,
        images: hasImages ? JSON.stringify(images) : null,
      },
    })

    // 读取历史对话
    const historyTurns = await prisma.chatTurn.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    historyTurns.reverse()
    const rawHistory = historyTurns
      .filter((t) => t.content !== question || t.role !== 'user')
      .slice(-19)
    // 痛点21：超10轮记忆压缩。session.summary 存在时，替换早期轮次为摘要消息
    const sessionWithSummary = await prisma.chatSession.findUnique({
      where: { id: session.id },
      select: { summary: true },
    }).catch(() => null)
    const history = buildHistoryWithSummary(rawHistory, sessionWithSummary?.summary || null)

    // 痛点22：多轮追问。取上一轮 assistant turn 的 intent，注入规划上下文
    const lastAssistantTurn = [...historyTurns].reverse().find((t) => t.role === 'assistant')
    const lastIntent = lastAssistantTurn?.intent || null

    // 多 Agent 协调器（并行检索 + 主 Agent 综合回答）
    const result = await orchestrate(question, history, send, personaId, customDesc, images, lastIntent)

    // 痛点21：回答后检查是否需要压缩（异步，不阻塞 done 事件）
    compressIfNeeded(session.id).then(({ compressed, summary: newSummary }) => {
      if (compressed && newSummary) {
        send('history_compressed', { summary: newSummary })
      }
    }).catch(() => { /* 压缩失败不阻塞 */ })

    // 把视觉识别描述追加进 user turn（历史上下文自带图片记忆，后续轮次主 Agent 仍"记得"图）
    if (hasImages && result.imageDescriptions) {
      await prisma.chatTurn.updateMany({
        where: { sessionId: session.id, role: 'user', content: question },
        data: { content: `${question}\n[图片内容：${result.imageDescriptions}]` },
      })
    }

    // AI 生成的反馈草稿（不自动入库，推给前端让用户确认后提交）
    if (result.feedback) {
      send('feedback_created', result.feedback)
    }

    // 发送引用来源
    if (result.sources?.length) {
      send('sources', result.sources)
    }

    // 保存 AI 回复
    await prisma.chatTurn.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: result.answer,
        intent: result.intent,
        sources: result.sources?.length ? JSON.stringify(result.sources) : null,
      },
    })

    // 发送完成事件
    send('done', { sessionId: session.id, intent: result.intent })
  } catch (err) {
    // 客户端主动断开（用户点"停止生成"），静默结束不报错
    if (err.message === 'CLIENT_ABORTED' || clientAborted) {
      console.log('[Chat] 客户端主动断开，流式输出已停止')
    } else {
      console.error('[Chat Error]', err.message, err.stack || '')

      if (err.message === 'CONTENT_MODERATION') {
        send('error', { message: '此话题已被火山引擎API审核拦截，莫再提及' })
      } else if (err.message?.includes('超时')) {
        send('error', { message: 'AI 思考太久了，请重试' })
      } else if (err.message?.includes('LLM API')) {
        send('error', { message: `AI 服务异常: ${err.message}` })
      } else if (err.message?.includes('fetch') || err.message?.includes('network')) {
        send('error', { message: '无法连接 AI 服务，请稍后重试' })
      } else {
        send('error', { message: `出错了: ${err.message}` })
      }
    }
  } finally {
    res.end()
  }
}

// ========== POST /api/chat/npc/talk - NPC AI 对话（SSE 流式，德塔专用）==========
export async function talkNpc(req, res, next) {
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  function send(event, data) {
    res.write(`event: ${event}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  try {
    const { npcId, question, sessionId } = req.body

    // 入参校验
    if (!question || !question.trim()) {
      send('error', { message: '问题不能为空' })
      return res.end()
    }
    if (!npcId) {
      send('error', { message: '缺少 npcId' })
      return res.end()
    }

    // 当前只支持男德通（npcId=nandetong_game）
    if (npcId !== 'nandetong_game' && npcId !== 'nandetong') {
      send('error', { message: '未知 NPC' })
      return res.end()
    }

    // 复用站外 ChatSession（intent='npc_talk' 区分），不污染站外会话历史
    let session = null
    if (sessionId) {
      session = await prisma.chatSession.findFirst({
        where: { id: parseInt(sessionId), userId: req.user.id },
      })
    }
    if (!session) {
      session = await prisma.chatSession.create({
        data: { userId: req.user.id, title: `[NPC] ${question.slice(0, 20)}` },
      })
    }

    // 保存用户消息
    await prisma.chatTurn.create({
      data: { sessionId: session.id, role: 'user', content: question },
    })

    // 读取近期历史（NPC 对话最多 10 轮）
    const historyTurns = await prisma.chatTurn.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    historyTurns.reverse()
    const history = historyTurns
      .filter((t) => t.content !== question || t.role !== 'user')
      .slice(-19)
      .map((t) => ({ role: t.role, content: t.content }))

    // 读花名册（从 PRD 成员信息表读取，解析成紧凑列表方便 AI 检索）
    const rosterRaw = readDoc('01-需求文档/00-基础数据/成员信息填写表.md')
    const rosterText = parseRoster(rosterRaw)

    // 动态构建人设（含提问者身份 + 花名册）
    const userNickname = req.user.nickname || req.user.username || '学员'
    const persona = buildGamePersona(userNickname, rosterText)

    // 直接流式调 LLM（不走三分类，NPC 只做德塔世界内的闲聊）
    const messages = [
      { role: 'system', content: persona },
      ...history,
      { role: 'user', content: question },
    ]

    let answer = ''
    try {
      for await (const chunk of chatCompletionStream(messages, { temperature: TEMPS.NPC })) {
        send('token', { content: chunk })
        answer += chunk
      }
    } catch (llmErr) {
      // API 额度/quota 错误的友好提示
      if (llmErr.message?.includes('quota') || llmErr.message?.includes('403') || llmErr.message?.includes('429')) {
        send('error', { message: '男德通暂时走神了，过两天再找我聊~' })
        return res.end()
      }
      throw llmErr
    }

    // 保存 AI 回复
    await prisma.chatTurn.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: answer,
        intent: 'npc_talk',
      },
    })

    // 发送完成事件
    send('done', { sessionId: session.id, npcId })
  } catch (err) {
    console.error('[NPC Talk Error]', err.message, err.stack || '')

    if (err.message === 'CONTENT_MODERATION') {
      send('error', { message: '这个话题男德通不太方便聊哦~' })
    } else if (err.message?.includes('超时')) {
      send('error', { message: '男德通思考太久了，再试一次~' })
    } else if (err.message?.includes('LLM API')) {
      send('error', { message: '男德通暂时连不上，稍后再试~' })
    } else {
      send('error', { message: `出错了: ${err.message}` })
    }
  } finally {
    res.end()
  }
}

// ========== GET /api/chat/sessions - 会话列表 ==========
export async function listSessions(req, res, next) {
  try {
    const sessions = await prisma.chatSession.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { turns: true } },
      },
    })
    success(res, sessions)
  } catch (err) {
    next(err)
  }
}

// ========== GET /api/chat/sessions/:id - 会话详情 ==========
export async function getSession(req, res, next) {
  try {
    const { id } = req.params
    const session = await prisma.chatSession.findFirst({
      where: { id: parseInt(id), userId: req.user.id },
      include: { turns: { orderBy: { createdAt: 'asc' } } },
    })
    if (!session) {
      return fail(res, ErrorCode.NOT_FOUND.code, '会话不存在', ErrorCode.NOT_FOUND.httpStatus)
    }
    success(res, session)
  } catch (err) {
    next(err)
  }
}

// ========== DELETE /api/chat/sessions/:id - 删除会话 ==========
export async function deleteSession(req, res, next) {
  try {
    const { id } = req.params
    const session = await prisma.chatSession.findFirst({
      where: { id: parseInt(id), userId: req.user.id },
    })
    if (!session) {
      return fail(res, ErrorCode.NOT_FOUND.code, '会话不存在', ErrorCode.NOT_FOUND.httpStatus)
    }
    await prisma.chatSession.delete({ where: { id: session.id } })
    success(res, null, '已删除')
  } catch (err) {
    next(err)
  }
}

// ========== GET /api/chat/db-info - 群聊数据库统计（首页数据看板） ==========
export async function getDbInfo(req, res, next) {
  try {
    const stats = await queryDbStats()
    // 字段裁剪：看板只需总数/跨度/人数/排行/年度分布（话题块样本过重，不返回）
    success(res, {
      overview: stats.overview,
      speakerCount: stats.speakerCount,
      topMembers: stats.topMembers,
      yearlyStats: stats.yearlyStats,
    })
  } catch (err) {
    next(err)
  }
}
