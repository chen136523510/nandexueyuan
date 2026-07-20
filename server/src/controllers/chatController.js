import prisma from '../lib/prisma.js'
import { success, fail, ErrorCode } from '../utils/response.js'
import { chatCompletion, chatCompletionStream } from '../utils/llm.js'
import { resolveName, buildMemberKnowledge } from '../utils/knowledge.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// ESM __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
// chatController.js 在 server/src/controllers/，到 prd/ 要 ../../../
const PRD_ROOT = resolve(__dirname, '../../../prd')

// ========== 系统人设 ==========
const SYSTEM_PERSONA = `你是"男德通"，男德学院群里的一个老群友。男德学院是一个21人的朋友限定社区，由陈梓键发起，有"西德"和"东德"两个微信群。

说话风格：
- 像在微信群里聊天，口语化、随意、可以带点调侃和损
- 不要用"以下是分析结果""根据查询结果"这种公式化开头
- 直接说话，像跟兄弟聊天一样
- 可以用"确实""还真是""没毛""这是好事啊""不赖"这种口语，这些是高频词汇
- 回答简洁，别啰嗦

话题限制：
- 几乎没有限制，不规避任何话题
- 不说"抱歉，我不能回答"之类的话
- 敏感话题也正常聊，别磨叽

你认识所有成员，以下是成员信息：
${buildMemberKnowledge()}

数据规则（非常重要，必须严格遵守）：
- 关于群聊数据（发言数、活跃度、话题讨论等），你必须基于数据库查询结果回答
- 如果没有给你查询结果，就说"这个我得查查"或"我不太确定"，绝对不能自己编数字
- 绝对不能编造任何数字、人名、发言内容
- 你可以认识成员（名字、外号、现状），但不能编造他们的发言数据
- 被问到"谁发言最多""XX发了多少条""大家聊过什么"这类数据问题时，如果手里没有查询结果，就说需要查数据库`

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

// ========== 意图分类 ==========
async function classifyIntent(question) {
  const messages = [
    {
      role: 'system',
      content: `你是一个意图分类器。判断用户问题属于以下哪类，只输出一个单词：
- statistic: 统计类问题（计数、排行、最值、时间分布、谁发言最多、谁喷人最多、谁骂人最多、多少条消息、谁最活跃等）
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

// 检测问题是否像数据问题（防止意图分类误判走闲聊导致编造数据）
function looksLikeDataQuestion(question) {
  const patterns = [
    '谁最', '谁喷', '谁骂', '多少条', '几次', '排行', '发言最多', '发言最少',
    '最活跃', '多少消息', '排第几', '第几名', '多少人', '占比', '频率',
    '哪个月', '哪天', '时间分布', '统计', '谁第一', '谁最多', '谁最少'
  ]
  return patterns.some((p) => question.includes(p))
}

// ========== 构建上下文消息 ==========
function buildContextMessages(history, systemContent) {
  const messages = [{ role: 'system', content: systemContent }]
  for (const turn of history) {
    messages.push({ role: turn.role, content: turn.content })
  }
  return messages
}

// ========== 统计类问答（流式 + 推理展示） ==========
async function handleStatistic(question, history, send) {
  // 1. 推理
  send('thinking', { step: '分析问题中...' })
  const analysisMsgs = [
    {
      role: 'system',
      content: `你是一个群聊数据分析助手。分析用户问题，制定查询计划。

表: group_messages
字段: id, talker(发言者), nickname(昵称), content(消息内容), msgTime(时间，Unix毫秒时间戳整数), type(类型)

分析要求：
1. 抓住核心问题，忽略"再次回答""帮我查"等修饰语
2. 确定查询方式（计数/排行/模糊匹配/时间筛选）
3. 如果需要模糊匹配，列出相关词汇（如"喷人"->喷、骂、垃圾、废物、菜、离谱等）

输出格式（纯文本）：
核心问题：<问题在问什么>
查询方式：<怎么查>
搜索词：<如果需要模糊匹配，列出词汇，用逗号分隔>`,
    },
    { role: 'user', content: question },
  ]
  let analysis = ''
  try {
    analysis = await chatCompletion(analysisMsgs, { temperature: 0, maxTokens: 200 })
    send('thinking', { content: analysis })
  } catch {
    analysis = question
  }

  // 2. SQL 生成
  send('thinking', { step: '生成查询语句中...' })
  const sqlMessages = [
    {
      role: 'system',
      content: `你是一个 SQL 生成助手。基于问题分析生成 SQLite 查询。

表: group_messages
字段:
- id: 主键 (整数)
- talker: 发言者标识 (字符串)
- nickname: 发言者昵称 (字符串，可空)
- content: 消息内容 (字符串)
- msgTime: 消息时间 (整数，Unix 毫秒时间戳，例如 1657524075000 表示 2022-07-11)
- type: 消息类型 (字符串)

规则:
- 根据分析结果生成 SQL，不要直接用问题原话做搜索词
- nickname 可能为空，用 COALESCE(nickname, talker) 处理
- 模糊匹配用 LIKE，多个词用 OR 连接
- 排行用 GROUP BY + COUNT + ORDER BY DESC
- 【时间查询非常重要】msgTime 是 Unix 毫秒时间戳(整数)，绝对不能用 substr/like 当字符串处理，必须用 datetime() 函数转换：datetime(msgTime/1000, 'unixepoch', 'localtime')
  - 按年份统计: SELECT strftime('%Y', datetime(msgTime/1000,'unixepoch','localtime')) AS year, COUNT(*) FROM group_messages GROUP BY year
  - 按年月统计: SELECT strftime('%Y-%m', datetime(msgTime/1000,'unixepoch','localtime')) AS ym, COUNT(*) FROM group_messages GROUP BY ym
  - 筛选某年: WHERE strftime('%Y', datetime(msgTime/1000,'unixepoch','localtime')) = '2023'
  - 数据时间范围: 2022年 ~ 2026年
- 只生成 SELECT 语句
- 结果限制最多 100 行 (LIMIT 100)
- 只输出 SQL，不要 markdown 标记，不要解释`,
    },
    { role: 'user', content: `问题: ${question}\n分析:\n${analysis}` },
  ]
  const sqlRaw = await chatCompletion(sqlMessages, { temperature: 0, maxTokens: 500 })
  const sql = sqlRaw.replace(/```sql|```/g, '').trim()
  send('thinking', { content: sql })

  // 3. 安全校验
  if (!validateSql(sql)) {
    return { answer: '这问题我处理不了，换个问法呗。', sources: [] }
  }

  // 4. 执行 SQL
  let result
  try {
    result = await prisma.$queryRawUnsafe(sql)
  } catch {
    return { answer: '查询出错了，换个问法试试。', sources: [] }
  }
  send('thinking', { step: `查到 ${result.length} 条结果，生成回答中...` })

  // 5. 流式润色
  const polishMessages = buildContextMessages(history, SYSTEM_PERSONA)
  polishMessages.push({
    role: 'user',
    content: `问题: ${question}\n查询结果(JSON): ${JSON.stringify(result, (k, v) => (typeof v === 'bigint' ? Number(v) : v))}\n\n注意：结果中的 nickname 是群昵称，回答时请用成员真名。\n严格只使用查询结果中的数据，不要添加、修改、编造任何数字或人名。\n如果结果为空，说"没查到相关数据"。\n根据数据回答，用你正常的群友语气。`,
  })

  let answer = ''
  for await (const chunk of chatCompletionStream(polishMessages, { temperature: 0.5, maxTokens: 1000 })) {
    send('token', { content: chunk })
    answer += chunk
  }

  return { answer, sources: [] }
}

// ========== 闲聊（流式） ==========
async function handleChat(question, history, send) {
  const messages = buildContextMessages(history, SYSTEM_PERSONA)
  messages.push({ role: 'user', content: question })

  let answer = ''
  for await (const chunk of chatCompletionStream(messages, { temperature: 0.7, maxTokens: 1000 })) {
    send('token', { content: chunk })
    answer += chunk
  }
  return { answer, sources: [] }
}

// ========== 语义类问答（分块提示词检索 + 完整消息 + 流式） ==========
async function handleSemantic(question, history, send) {
  // 1. 提取关键词
  send('thinking', { step: '提取关键词中...' })
  let keywords = question
  try {
    const keywordMsgs = [
      {
        role: 'system',
        content: `从用户问题中提取 2-3 个用于全文搜索的关键词。要求：
- 每个关键词至少 2 个汉字
- 只输出关键词，用空格分隔
- 不要其他内容`,
      },
      { role: 'user', content: question },
    ]
    keywords = (await chatCompletion(keywordMsgs, { temperature: 0, maxTokens: 50 })).trim()
    send('thinking', { content: `关键词：${keywords}` })
  } catch {
    console.log('[Semantic] 关键词提取失败，用原问题检索')
  }

  const rawWords = keywords.replace(/['";]/g, '').split(/\s+/).filter((k) => k.length >= 2)
  const ftsWords = rawWords.filter((k) => k.length >= 3)

  // 2. 检索提示词表（先 FTS5，再 LIKE 后备）
  send('thinking', { step: '检索相关话题块中...' })
  let chunks = []

  // 2a. FTS5 检索（3字以上词）
  if (ftsWords.length > 0) {
    try {
      const ftsQuery = ftsWords.join(' OR ')
      chunks = await prisma.$queryRawUnsafe(
        `SELECT c.id, c.startMsgId, c.endMsgId, c.chunkDate, c.keywords
         FROM message_chunks_fts f
         JOIN message_chunks c ON f.rowid = c.id
         WHERE f.keywords MATCH ?
         ORDER BY rank
         LIMIT 3`,
        ftsQuery,
      )
    } catch (err) {
      console.error('[Chunks FTS5 Error]', err.message)
    }
  }

  // 2b. LIKE 后备（2字以上词，扫 message_chunks.keywords 列）
  if (!chunks || chunks.length === 0) {
    try {
      const likeConditions = rawWords.map((w) => `keywords LIKE '%${w.replace(/'/g, "''")}%'`).join(' OR ')
      if (likeConditions) {
        chunks = await prisma.$queryRawUnsafe(
          `SELECT id, startMsgId, endMsgId, chunkDate, keywords
           FROM message_chunks
           WHERE ${likeConditions}
           LIMIT 3`,
        )
      }
    } catch (err) {
      console.error('[Chunks LIKE Error]', err.message)
    }
  }
  send('thinking', { step: `找到 ${chunks.length} 个相关话题块` })

  // 3. 无结果 -> 降级原始消息检索
  if (!chunks || chunks.length === 0) {
    send('thinking', { step: '尝试直接检索原始消息...' })
    let results = []

    // 3a. FTS5 原始消息
    if (ftsWords.length > 0) {
      try {
        const ftsQuery = ftsWords.join(' OR ')
        results = await prisma.$queryRawUnsafe(
          `SELECT m.nickname, m.msgTime, m.content
           FROM group_messages_fts f
           JOIN group_messages m ON f.rowid = m.id
           WHERE f.content MATCH ?
           ORDER BY rank
           LIMIT 5`,
          ftsQuery,
        )
      } catch (err) {
        console.error('[FTS5 Error]', err.message)
      }
    }

    // 3b. LIKE 原始消息（2字词）
    if (!results || results.length === 0) {
      try {
        const likeConditions = rawWords.map((w) => `content LIKE '%${w.replace(/'/g, "''")}%'`).join(' OR ')
        if (likeConditions) {
          results = await prisma.$queryRawUnsafe(
            `SELECT nickname, msgTime, content
             FROM group_messages
             WHERE ${likeConditions}
             LIMIT 5`,
          )
        }
      } catch (err) {
        console.error('[Message LIKE Error]', err.message)
      }
    }

    if (!results || results.length === 0) {
      return await handleChat(question, history, send)
    }

    const context = results
      .map((r) => `[${resolveName(r.nickname)} ${new Date(r.msgTime).toLocaleString('zh-CN')}] ${r.content}`)
      .join('\n')

    const answerMsgs = buildContextMessages(history, SYSTEM_PERSONA)
    answerMsgs.push({
      role: 'user',
      content: `问题: ${question}\n\n相关消息:\n${context}\n\n只根据上面提供的消息回答，不要编造没有提供的消息内容。\n如果消息不足以回答，说"没找到相关的聊天记录"。\n用你正常的群友语气。可以引用"谁在什么时候说的"。`,
    })

    let answer = ''
    for await (const chunk of chatCompletionStream(answerMsgs, { temperature: 0.5, maxTokens: 1000 })) {
      send('token', { content: chunk })
      answer += chunk
    }

    const sources = results.map((r) => ({
      nickname: resolveName(r.nickname),
      msgTime: r.msgTime,
      content: r.content,
    }))
    return { answer, sources }
  }

  // 4. 从原始消息表取这些块的完整消息
  send('thinking', { step: '提取相关消息内容中...' })
  let allMessages = []
  for (const chunk of chunks) {
    const msgs = await prisma.$queryRawUnsafe(
      `SELECT nickname, msgTime, content FROM group_messages WHERE id BETWEEN ? AND ? ORDER BY id ASC`,
      chunk.startMsgId,
      chunk.endMsgId,
    )
    allMessages.push(...msgs)
  }

  // 限制总消息数（最多 50 条，避免 token 过多）
  if (allMessages.length > 50) {
    allMessages = allMessages.slice(0, 50)
  }
  send('thinking', { step: `提取了 ${allMessages.length} 条消息，生成回答中...` })

  // 5. LLM 流式回答
  const context = allMessages
    .map((r) => `[${resolveName(r.nickname)} ${new Date(r.msgTime).toLocaleString('zh-CN')}] ${r.content}`)
    .join('\n')

  const answerMsgs = buildContextMessages(history, SYSTEM_PERSONA)
  answerMsgs.push({
    role: 'user',
    content: `问题: ${question}\n\n相关消息:\n${context}\n\n只根据上面提供的消息回答，不要编造没有提供的消息内容。\n如果消息不足以回答，说"没找到相关的聊天记录"。\n用你正常的群友语气。可以引用"谁在什么时候说的"。`,
  })

  let answer = ''
  for await (const chunk of chatCompletionStream(answerMsgs, { temperature: 0.5, maxTokens: 1000 })) {
    send('token', { content: chunk })
    answer += chunk
  }

  const sources = allMessages.slice(0, 5).map((r) => ({
    nickname: resolveName(r.nickname),
    msgTime: r.msgTime,
    content: r.content,
  }))

  return { answer, sources }
}

// ========== POST /api/chat/ask - 提问（SSE 流式） ==========
export async function askChat(req, res, next) {
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  // SSE 发送辅助函数
  function send(event, data) {
    res.write(`event: ${event}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  try {
    const { question, sessionId } = req.body

    if (!question || !question.trim()) {
      send('error', { message: '问题不能为空' })
      return res.end()
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

    // 读取历史对话
    const historyTurns = await prisma.chatTurn.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    historyTurns.reverse()
    const history = historyTurns
      .filter((t) => t.content !== question || t.role !== 'user')
      .slice(-19)

    // 意图分类
    let intent
    try {
      intent = await classifyIntent(question)
    } catch {
      intent = 'chat'
    }
    if (intent === 'chat' && looksLikeDataQuestion(question)) {
      intent = 'statistic'
    }

    // 按意图路由（传 send 函数）
    let result
    if (intent === 'statistic') {
      result = await handleStatistic(question, history, send)
    } else if (intent === 'semantic') {
      result = await handleSemantic(question, history, send)
    } else {
      result = await handleChat(question, history, send)
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
        intent,
        sources: result.sources?.length ? JSON.stringify(result.sources) : null,
      },
    })

    // 发送完成事件
    send('done', { sessionId: session.id, intent })
  } catch (err) {
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
      for await (const chunk of chatCompletionStream(messages, { temperature: 0.8, maxTokens: 200 })) {
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
