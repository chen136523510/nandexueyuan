import prisma from '../lib/prisma.js'
import { success, fail, ErrorCode } from '../utils/response.js'
import { chatCompletion } from '../utils/llm.js'

// 意图分类：判定 statistic / semantic / chat
async function classifyIntent(question) {
  const messages = [
    {
      role: 'system',
      content: `你是一个意图分类器。判断用户问题属于以下哪类，只输出一个单词：
- statistic: 统计类问题（计数、排行、最值、时间分布、谁发言最多、多少条消息等）
- semantic: 语义类问题（话题归纳、观点总结、大家都在聊什么等）
- chat: 闲聊或与群聊数据无关的问题
只输出 statistic/semantic/chat 中的一个，不要其他内容。`,
    },
    { role: 'user', content: question },
  ]
  const result = await chatCompletion(messages, { temperature: 0.1, maxTokens: 10 })
  const intent = result.trim().toLowerCase()
  if (!['statistic', 'semantic', 'chat'].includes(intent)) {
    return 'chat' // 兜底
  }
  return intent
}

// SQL 安全校验：只允许 SELECT，禁止写操作
function validateSql(sql) {
  const normalized = sql.trim().toLowerCase()
  if (!normalized.startsWith('select')) return false
  const dangerous = ['insert', 'update', 'delete', 'drop', 'alter', 'create', 'truncate', 'pragma', 'attach', 'detach']
  for (const kw of dangerous) {
    if (normalized.includes(kw)) return false
  }
  return true
}

// 统计类问答：生成 SQL → 执行 → LLM 润色
async function handleStatistic(question) {
  // 1. LLM 生成 SQL
  const sqlMessages = [
    {
      role: 'system',
      content: `你是一个 SQL 生成助手。基于以下 SQLite 表结构生成查询：

表: group_messages
字段:
- id: 主键 (整数)
- talker: 发言者标识 (字符串)
- nickname: 发言者昵称 (字符串，可空)
- content: 消息内容 (字符串)
- msgTime: 消息时间 (DateTime，格式 'YYYY-MM-DD HH:MM:SS')
- type: 消息类型 (字符串)

规则:
- nickname 可能为空，用 COALESCE(nickname, talker) 处理
- 时间用 strftime/date 函数
- 只生成 SELECT 语句
- 结果限制最多 100 行 (LIMIT 100)
- 只输出 SQL，不要 markdown 标记，不要解释`,
    },
    { role: 'user', content: question },
  ]
  const sqlRaw = await chatCompletion(sqlMessages, { temperature: 0, maxTokens: 500 })
  const sql = sqlRaw.replace(/```sql|```/g, '').trim()

  // 2. 安全校验
  if (!validateSql(sql)) {
    return { answer: '抱歉，无法处理这个问题，请换个问法。', sources: [] }
  }

  // 3. 执行 SQL
  let result
  try {
    result = await prisma.$queryRawUnsafe(sql)
  } catch {
    return { answer: '查询出错，请换个问法试试。', sources: [] }
  }

  // 4. LLM 根据结果润色回答
  const polishMessages = [
    {
      role: 'system',
      content: '你是男德学院群聊数据分析助手。根据用户问题和查询结果，用简洁的自然语言回答。如果结果为空，说明未找到相关数据。',
    },
    {
      role: 'user',
      content: `问题: ${question}\n查询结果(JSON): ${JSON.stringify(result, (k, v) => (typeof v === 'bigint' ? Number(v) : v))}\n请用自然语言回答。`,
    },
  ]
  const answer = await chatCompletion(polishMessages, { temperature: 0.3 })

  return { answer, sources: [] }
}

// 闲聊：直连 LLM
async function handleChat(question) {
  const messages = [
    {
      role: 'system',
      content: '你是男德学院群聊助手，友好地回答用户问题。男德学院是一个朋友限定社区。',
    },
    { role: 'user', content: question },
  ]
  const answer = await chatCompletion(messages, { temperature: 0.7, maxTokens: 1000 })
  return { answer, sources: [] }
}

// 语义类问答：LLM 提取关键词 → FTS5 检索 → LLM 生成回答（附引用）
async function handleSemantic(question) {
  // 1. LLM 提取搜索关键词（trigram 要求每个 >= 3 字符）
  const keywordMsgs = [
    {
      role: 'system',
      content: `从用户问题中提取 2-3 个用于全文搜索的关键词。要求：
- 每个关键词至少 3 个汉字
- 只输出关键词，用空格分隔
- 不要其他内容`,
    },
    { role: 'user', content: question },
  ]
  const keywords = (await chatCompletion(keywordMsgs, { temperature: 0, maxTokens: 50 })).trim()

  // 2. FTS5 检索 Top-5
  let results = []
  try {
    const safeKeywords = keywords.replace(/['";]/g, '').trim()
    if (safeKeywords) {
      results = await prisma.$queryRawUnsafe(
        `SELECT m.nickname, m.msgTime, m.content
         FROM group_messages_fts f
         JOIN group_messages m ON f.rowid = m.id
         WHERE f.content MATCH ?
         ORDER BY rank
         LIMIT 5`,
        safeKeywords,
      )
    }
  } catch (err) {
    console.error('[FTS5 Error]', err.message)
  }

  // 3. 无结果 → 降级闲聊
  if (!results || results.length === 0) {
    return await handleChat(question)
  }

  // 4. LLM 根据检索片段生成回答
  const context = results
    .map((r) => `[${r.nickname} ${new Date(r.msgTime).toLocaleString('zh-CN')}] ${r.content}`)
    .join('\n')

  const answerMsgs = [
    {
      role: 'system',
      content: `你是男德学院群聊分析助手。根据检索到的群聊消息回答用户问题。
- 如果消息中有相关信息，请归纳回答，可引用"谁在什么时候说的"
- 如果信息不足，请说明未找到充分相关内容
- 回答简洁明了`,
    },
    { role: 'user', content: `问题: ${question}\n\n相关消息:\n${context}` },
  ]
  const answer = await chatCompletion(answerMsgs, { temperature: 0.3, maxTokens: 1000 })

  const sources = results.map((r) => ({
    nickname: r.nickname,
    msgTime: r.msgTime,
    content: r.content,
  }))

  return { answer, sources }
}

// POST /api/chat/ask — 提问
export async function askChat(req, res, next) {
  try {
    const { question, sessionId } = req.body

    if (!question || !question.trim()) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '问题不能为空', ErrorCode.PARAM_ERROR.httpStatus)
    }

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

    // 保存用户消息
    await prisma.chatTurn.create({
      data: { sessionId: session.id, role: 'user', content: question },
    })

    // 意图分类（失败兜底走 chat）
    let intent
    try {
      intent = await classifyIntent(question)
    } catch {
      intent = 'chat'
    }

    // 按意图路由
    let result
    if (intent === 'statistic') {
      result = await handleStatistic(question)
    } else if (intent === 'semantic') {
      result = await handleSemantic(question)
    } else {
      result = await handleChat(question)
    }

    // 保存 AI 回复
    await prisma.chatTurn.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: result.answer,
        intent,
        sources: result.sources?.length ? JSON.stringify(result.sources) : null,
      },
    })

    success(res, {
      answer: result.answer,
      intent,
      sources: result.sources,
      sessionId: session.id,
    })
  } catch (err) {
    console.error('[Chat Error]', err.message, err.cause?.message || '')
    // LLM 调用失败（API 错误或网络超时）→ 兜底文案
    if (err.message?.includes('LLM API') || err.message?.includes('fetch failed')) {
      return fail(
        res,
        ErrorCode.SERVER_ERROR.code,
        '当前网络不稳定，请重试。若仍旧无效，请联系管理员。',
        ErrorCode.SERVER_ERROR.httpStatus,
      )
    }
    next(err)
  }
}

// GET /api/chat/sessions — 会话列表
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

// GET /api/chat/sessions/:id — 会话详情
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

// DELETE /api/chat/sessions/:id — 删除会话
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
