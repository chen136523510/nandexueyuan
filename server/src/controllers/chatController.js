import prisma from '../lib/prisma.js'
import { success, fail, ErrorCode } from '../utils/response.js'
import { chatCompletion } from '../utils/llm.js'
import { resolveName, buildMemberKnowledge } from '../utils/knowledge.js'

// ========== 系统人设 ==========
const SYSTEM_PERSONA = `你是"男德通"，男德学院群里的一个老群友。男德学院是一个21人的朋友限定社区，由陈梓键发起，有"西德"和"东德"两个微信群。

说话风格：
- 像在微信群里聊天，口语化、随意、可以带点调侃和损
- 不要用"以下是分析结果""根据查询结果"这种公式化开头
- 直接说话，像跟兄弟聊天一样
- 可以用"确实""还真是""没毛""这是好事啊"“不赖”这种口语，这些是高频词汇
- 回答简洁，别啰嗦

话题限制：
- 几乎没有限制，不规避任何话题
- 不说"抱歉，我不能回答"之类的话
- 敏感话题也正常聊，别磨叽

你认识所有成员，以下是成员信息：
${buildMemberKnowledge()}`

// ========== 意图分类 ==========
async function classifyIntent(question) {
  const messages = [
    {
      role: 'system',
      content: `你是一个意图分类器。判断用户问题属于以下哪类，只输出一个单词：
- statistic: 统计类问题（计数、排行、最值、时间分布、谁发言最多、多少条消息等）
- semantic: 语义类问题（话题归纳、观点总结、大家都在聊什么、有没有人讨论过XX、如何评价某某某、谁是最xx的人等）
- chat: 闲聊或与群聊数据无关的问题
只输出 statistic/semantic/chat 中的一个，不要其他内容。`,
    },
    { role: 'user', content: question },
  ]
  const result = await chatCompletion(messages, { temperature: 0.1, maxTokens: 10 })
  const intent = result.trim().toLowerCase()
  if (!['statistic', 'semantic', 'chat'].includes(intent)) {
    return 'chat'
  }
  return intent
}

// ========== SQL 安全校验 ==========
function validateSql(sql) {
  const normalized = sql.trim().toLowerCase()
  if (!normalized.startsWith('select')) return false
  const dangerous = ['insert', 'update', 'delete', 'drop', 'alter', 'create', 'truncate', 'pragma', 'attach', 'detach']
  for (const kw of dangerous) {
    if (normalized.includes(kw)) return false
  }
  return true
}

// ========== 构建上下文消息 ==========
function buildContextMessages(history, systemContent) {
  const messages = [{ role: 'system', content: systemContent }]
  for (const turn of history) {
    messages.push({ role: turn.role, content: turn.content })
  }
  return messages
}

// ========== 统计类问答 ==========
async function handleStatistic(question, history) {
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
    return { answer: '这问题我处理不了，换个问法呗。', sources: [] }
  }

  // 3. 执行 SQL
  let result
  try {
    result = await prisma.$queryRawUnsafe(sql)
  } catch {
    return { answer: '查询出错了，换个问法试试。', sources: [] }
  }

  // 4. LLM 根据结果润色回答（带上下文 + 人设）
  const polishMessages = buildContextMessages(history, SYSTEM_PERSONA)
  polishMessages.push({
    role: 'user',
    content: `问题: ${question}\n查询结果(JSON): ${JSON.stringify(result, (k, v) => (typeof v === 'bigint' ? Number(v) : v))}\n\n注意：结果中的 nickname 是群昵称，回答时请用成员真名。根据数据回答，用你正常的群友语气。`,
  })
  const answer = await chatCompletion(polishMessages, { temperature: 0.5, maxTokens: 1000 })

  return { answer, sources: [] }
}

// ========== 闲聊 ==========
async function handleChat(question, history) {
  const messages = buildContextMessages(history, SYSTEM_PERSONA)
  messages.push({ role: 'user', content: question })
  const answer = await chatCompletion(messages, { temperature: 0.7, maxTokens: 1000 })
  return { answer, sources: [] }
}

// ========== 语义类问答 ==========
async function handleSemantic(question, history) {
  // 1. LLM 提取关键词（容错：失败时用原问题）
  let keywords = question
  try {
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
    keywords = (await chatCompletion(keywordMsgs, { temperature: 0, maxTokens: 50 })).trim()
  } catch {
    // 关键词提取失败，用原问题检索
    console.log('[Semantic] 关键词提取失败，用原问题检索')
  }

  // 2. FTS5 检索 Top-5（OR 语法，容错）
  let results = []
  try {
    // 清理关键词，构建 OR 查询
    const words = keywords
      .replace(/['";]/g, '')
      .split(/\s+/)
      .filter((k) => k.length >= 3)

    let ftsQuery = words.join(' OR ')

    // 关键词都太短，用原问题的子串
    if (!ftsQuery && question.length >= 3) {
      ftsQuery = question.slice(0, 10)
    }

    if (ftsQuery) {
      results = await prisma.$queryRawUnsafe(
        `SELECT m.nickname, m.msgTime, m.content
         FROM group_messages_fts f
         JOIN group_messages m ON f.rowid = m.id
         WHERE f.content MATCH ?
         ORDER BY rank
         LIMIT 5`,
        ftsQuery,
      )
    }
  } catch (err) {
    console.error('[FTS5 Error]', err.message)
  }

  // 3. 无结果 → 降级闲聊
  if (!results || results.length === 0) {
    return await handleChat(question, history)
  }

  // 4. LLM 根据检索片段生成回答（带上下文 + 人设）
  const context = results
    .map((r) => `[${resolveName(r.nickname)} ${new Date(r.msgTime).toLocaleString('zh-CN')}] ${r.content}`)
    .join('\n')

  const answerMsgs = buildContextMessages(history, SYSTEM_PERSONA)
  answerMsgs.push({
    role: 'user',
    content: `问题: ${question}\n\n相关消息:\n${context}\n\n根据这些消息回答，用你正常的群友语气。可以引用"谁在什么时候说的"。`,
  })
  const answer = await chatCompletion(answerMsgs, { temperature: 0.5, maxTokens: 1000 })

  const sources = results.map((r) => ({
    nickname: resolveName(r.nickname),
    msgTime: r.msgTime,
    content: r.content,
  }))

  return { answer, sources }
}

// ========== POST /api/chat/ask — 提问 ==========
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

    // 读取历史对话（最近 10 轮 = 20 条），用于上下文
    const historyTurns = await prisma.chatTurn.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    historyTurns.reverse() // 时间正序

    // 过滤掉当前刚存的用户消息（避免重复）
    const history = historyTurns
      .filter((t) => t.content !== question || t.role !== 'user')
      .slice(-19) // 最多 19 条历史（+当前问题 = 20）

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
      result = await handleStatistic(question, history)
    } else if (intent === 'semantic') {
      result = await handleSemantic(question, history)
    } else {
      result = await handleChat(question, history)
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

    // 内容审核拦截
    if (err.message === 'CONTENT_MODERATION') {
      return fail(
        res,
        ErrorCode.SERVER_ERROR.code,
        '此话题已被火山引擎API审核拦截，莫再提及',
        ErrorCode.SERVER_ERROR.httpStatus,
      )
    }

    // LLM 调用失败（超时或 API 错误）→ 兜底文案
    if (err.message?.includes('LLM API') || err.message?.includes('超时') || err.message?.includes('fetch')) {
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

// ========== GET /api/chat/sessions — 会话列表 ==========
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

// ========== GET /api/chat/sessions/:id — 会话详情 ==========
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

// ========== DELETE /api/chat/sessions/:id — 删除会话 ==========
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
