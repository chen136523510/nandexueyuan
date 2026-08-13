/**
 * 多 Agent 协调器（Orchestrator）v2
 *
 * 大 Agent = 男德通本人，全程持有上下文。
 *
 * 三阶段流程：
 * 1. 规划阶段：大 Agent 分析问题 -> 输出 JSON 子 Agent 任务列表
 * 2. 检索阶段：子 Agent 并行执行 -> 全量返回结构化数据
 * 3. 分析+回答阶段：大 Agent 拿到全量数据 -> 先分析推理（SSE展示）-> 再流式输出回答
 */

import { chatCompletion, chatCompletionStream } from '../utils/llm.js'
import { getPersona, CHAT_PERSONA } from '../utils/persona.js'
import { members } from '../utils/knowledge.js'
import { runPersonStatAgent } from './personStatAgent.js'
import { runPersonMessagesAgent } from './personMessagesAgent.js'
import { runMentionedAgent } from './mentionedAgent.js'
import { runTopicSearchAgent } from './topicSearchAgent.js'
import { runWorldbookAgent } from './worldbookAgent.js'
import { runDbInfoAgent } from './dbInfoAgent.js'
import { isBlackOnline, sendSearchTask } from '../searchHub.js'

// ========== 规划阶段 prompt ==========
function buildPlannerPrompt(question, history, persona) {
  const messages = [{ role: 'system', content: persona || CHAT_PERSONA }]

  // 注入对话历史（大 Agent 持有上下文）
  for (const turn of history) {
    messages.push({ role: turn.role, content: turn.content })
  }

  messages.push({
    role: 'user',
    content: `用户问题：${question}

你现在需要决定派哪些子 Agent 去检索数据来回答这个问题。

可用的子 Agent 类型：
1. person_stat - 查某人的统计数据（发言总数、活跃时段、发言长度等）。target 填人名。
2. person_messages - 查某人自己说过的话（每条带前后各5条上下文）。target 填人名。
3. mentioned - 查别人提到某人的消息（每条带前后各5条上下文）。target 填人名。
4. topic_search - 按关键词搜话题（FTS5全文检索）。keywords 填搜索词。
5. worldbook - 读取德塔世界观设定集全文。当问题涉及德塔、世界观、角色设定、虚空、势力、历史等设定时使用。
6. db_info - 查询数据库本身的统计信息（消息总数、时间跨度、参与人数、发言排行、版本信息）。当问题涉及"数据库""多少条消息""时间跨度""谁最活跃""群聊统计""版本"等关于数据本身的问题时使用。

【判断规则（非常重要）】
- 只要问题涉及某个具体的人（评价/怎么样/谁/说了什么/发了多少），就必须派子 Agent 去检索
- "如何评价XX" -> 同时派 person_stat + person_messages + mentioned
- "XX发了多少条" -> 派 person_stat
- "XX说了什么/聊了什么" -> 派 person_messages
- "XX最近活跃吗" -> 派 person_stat
- "群里谁喷人最多" -> 派 topic_search
- "大家讨论过打球吗" -> 派 topic_search
- "最近群里在聊什么" -> 派 topic_search
- "群里有没有人聊过XX" -> 派 topic_search
- "群里有什么瓜/新鲜事" -> 派 topic_search
- "德塔是什么/德塔里的XX是什么" -> 派 worldbook
- "世界观/角色设定/虚空/势力" -> 派 worldbook
- "群聊有多少条消息/跨度多长/谁最活跃/数据库统计" -> 派 db_info
- "网站版本/最新版本" -> 派 db_info
- 不确定是否需要检索时，倾向检索（宁可多查不要漏答）
- 只有纯闲聊（"你好""你是谁"）才输出 []

人名要用真名（如"丘序明"而非"丘哥"）。
输出必须是合法的 JSON 数组，不要 markdown 标记。

示例：
"如何评价丘序明" -> [{"type":"person_stat","target":"丘序明"},{"type":"person_messages","target":"丘序明"},{"type":"mentioned","target":"丘序明"}]
"陈梓键发了多少条消息" -> [{"type":"person_stat","target":"陈梓键"}]
"群里谁喷人最多" -> [{"type":"topic_search","keywords":"喷 骂 垃圾 废物"}]
"马逸杰最近聊了什么" -> [{"type":"person_messages","target":"马逸杰"}]
"你好" -> []

只输出 JSON 数组，不要其他内容。`,
  })

  return messages
}

// ========== 分析阶段 prompt ==========
function buildAnalysisPrompt(question, history, agentResults, persona) {
  const messages = [{ role: 'system', content: persona || CHAT_PERSONA }]

  // 注入对话历史
  for (const turn of history) {
    messages.push({ role: turn.role, content: turn.content })
  }

  // 构建检索结果上下文
  let dataContext = `用户问题：${question}\n\n以下是子 Agent 检索到的数据：\n`

  for (const result of agentResults) {
    if (!result.ok) {
      dataContext += `\n【${result.agentType}】检索失败：${result.error}\n`
      continue
    }

    dataContext += `\n【${result.agentType}】${result.summary || ''}\n`

    // 人物统计：只传摘要，不传原始 JSON（避免噪音）
    if (result.agentType === '人物统计' && result.result) {
      const r = result.result
      const total = r.total?.[0]?.total || 0
      const topMonths = (r.monthly || []).map((m) => `${m.ym}: ${m.cnt}条`).join('、')
      const avgLen = Math.round(r.length?.[0]?.avgLen || 0)
      dataContext += `统计：共${total}条，最活跃月份：${topMonths}，平均长度${avgLen}字符\n`
    }

    // 消息记录：传格式化文本，但限制条数避免单次请求超时
    if (result.formattedText) {
      // 限制格式化文本长度（约 2 万字符 ≈ 3 万 token）
      const maxChars = 20000
      let text = result.formattedText
      if (text.length > maxChars) {
        text = text.substring(0, maxChars) + `\n...（共 ${result.count || result.messages?.length || 0} 条，已截取前 ${maxChars} 字符）`
      }
      dataContext += `\n消息记录（${result.count || ''}条）：\n${text}\n`
    } else if (result.messages) {
      const msgs = result.messages.slice(0, 30) // 最多传 30 条
      dataContext += `\n消息记录（共${result.messages.length}条，传${msgs.length}条）：\n`
      for (const msg of msgs) {
        const time = new Date(msg.msgTime).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
        dataContext += `[${msg.nickname} ${time}] ${msg.content}\n`
      }
    }
  }

  dataContext += `\n请基于以上数据回答用户的问题。
注意：
- 严格只使用提供的检索数据，不要编造
- 结果中的 nickname 是群昵称，回答时请用成员真名
- 如果数据不足以完整回答，诚实说明
- 用你正常的群友语气回答，别啰嗦`

  messages.push({ role: 'user', content: dataContext })

  console.log('[Orchestrator] 分析阶段 prompt 总长度:', dataContext.length, '字符')

  return messages
}

// ========== 子 Agent 派发 ==========
// 重度任务：数据量大，值得外包给黑机全量检索
const HEAVY_TASKS = ['person_messages', 'mentioned']

async function dispatchAgent(task, emit) {
  const { type } = task
  const isHeavy = HEAVY_TASKS.includes(type)

  // 黑机在线 + 重度任务 -> 外包给黑机全量检索
  if (isBlackOnline() && isHeavy) {
    try {
      const result = await sendSearchTask(task, emit)
      console.log(`[Orchestrator] 黑机执行 ${type} 成功`)
      return { ...result, _wasHeavy: true, _degraded: false }
    } catch (err) {
      console.log(`[Orchestrator] 黑机失败，降级本地: ${err.message}`)
      emit(type, 'warning', `黑机离线/超时，使用本地检索（数据量受限）`)
    }
  }

  // 降级 / 轻量任务 -> 本地执行
  try {
    let result
    switch (type) {
      case 'person_stat':
        result = { agentType: '人物统计', ...await runPersonStatAgent(task, emit) }
        break
      case 'person_messages':
        result = { agentType: '人物发言', ...await runPersonMessagesAgent(task, emit) }
        break
      case 'mentioned':
        result = { agentType: '被提及', ...await runMentionedAgent(task, emit) }
        break
      case 'topic_search':
        result = { agentType: '话题检索', ...await runTopicSearchAgent(task, emit) }
        break
      case 'worldbook':
        result = { agentType: '世界书', ...await runWorldbookAgent(task, emit) }
        break
      case 'db_info':
        result = { agentType: '数据库信息', ...await runDbInfoAgent(task, emit) }
        break
      default:
        return { ok: false, error: `未知 Agent 类型: ${type}`, agentType: type }
    }
    // 标记降级状态（黑机离线时重度任务走本地=降级）
    return { ...result, _wasHeavy: isHeavy, _degraded: isHeavy && !isBlackOnline() }
  } catch (err) {
    return { ok: false, error: err.message, agentType: type, _wasHeavy: isHeavy, _degraded: isHeavy }
  }
}

// ========== 快速闲聊判断（避免简单问候也要调 LLM 规划） ==========
function isCasualChat(question) {
  const q = question.trim().toLowerCase()
  if (q.length > 10) return false // 真正的闲聊几乎不超 10 字
  const casualPatterns = [
    '你好', '哈喽', '嗨', 'hi', 'hello', '在吗', '在不在',
    '早上好', '中午好', '下午好', '晚上好', '晚安',
    '谢谢', '感谢', '谢了', '多谢', '辛苦了',
    '拜拜', '再见', '88', 'bye',
    '你是谁', '你叫什么', '你是什么', '你能做什么', '你是ai', '你是机器人',
    '哈哈哈', '呵呵', '笑死', '绝了',
    '吃了吗', '干嘛呢', '在干嘛', '睡了吗',
  ]
  return casualPatterns.some((p) => q.includes(p))
}

// ========== 构建成员名称匹配库（真名+外号） ==========
// 用 | 连接所有名称做正则 OR，长度倒序避免短名先匹配
const allNames = []
for (const m of members) {
  allNames.push(m.name)
  for (const a of m.aliases) {
    if (a.length >= 2) allNames.push(a) // 外号至少 2 字才进正则，避免误匹配
  }
}
// 去重 + 按长度倒序（优先匹配长名）
const uniqueNames = [...new Set(allNames)].sort((a, b) => b.length - a.length)
// 转义正则特殊字符
const escapedNames = uniqueNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
const namePattern = escapedNames.join('|')
const nameRegex = new RegExp(`(${namePattern})`)

/**
 * 快速路由：正则匹配模板化问题，命中则跳过规划 LLM
 * 匹配高频模板直接派发对应 Agent
 * @param {string} question 用户问题
 * @returns {array|null} 任务列表，null 表示未命中快速模板
 */
function matchQuickPattern(question) {
  const q = question.trim()

  // 提取问题中出现的成员名
  const nameMatch = q.match(nameRegex)
  const targetName = nameMatch ? nameMatch[1] : null
  const resolved = targetName
    ? members.find((m) => m.name === targetName || m.aliases.includes(targetName))
    : null

  // 话题搜索模板（不需要成员名）
  const topicTemplates = [
    {
      pattern: /群里最近聊了什么|大家在聊什么|最近有什么新鲜事|最近群里在聊/,
      tasks: [{ type: 'topic_search', keywords: q }],
    },
    {
      pattern: /讨论过(.{1,10})吗|有人聊过(.{1,10})吗|有没有人提过(.{1,10})|聊过(.{1,10})吗/,
      extract: (m) => m[1] || m[2] || m[3] || m[4],
      tasks: (kw) => [{ type: 'topic_search', keywords: kw }],
    },
  ]

  // 数据库信息模板（不需要成员名，不需要 LLM 规划）
  const dbInfoPatterns = [
    /聊天记录跨度|跨度有.*长|跨度多长|多少条消息|多少条聊天|总.*消息|数据库.*统计/,
    /群聊统计|群聊.*数据|发言.*排行|谁最活跃|最活跃/,
    /当前版本|最新版本|网站版本|版本信息/,
    /多少信息|知道多少|了解多少|有哪些信息|什么信息/,
  ]
  for (const pat of dbInfoPatterns) {
    if (pat.test(q)) {
      return [{ type: 'db_info' }]
    }
  }

  for (const tpl of topicTemplates) {
    const m = tpl.pattern.exec(q)
    if (m) {
      if (tpl.extract) {
        const kw = tpl.extract(m)
        return tpl.tasks(kw)
      }
      return tpl.tasks
    }
  }

  // 人物模板（需要命中成员名）
  if (!resolved) return null

  const templates = [
    // 统计类：XX发了多少条 / XX发了多少 / XX发言数 / XX最近活跃吗
    {
      pattern: /发了多少条|发了多少|发言多少|发言数|发了几条|活跃吗|活跃不|多少消息/,
      tasks: [{ type: 'person_stat', target: resolved.name }],
    },
    // 发言内容：XX说了什么 / XX聊了什么 / XX最近说了什么
    {
      pattern: /说了什么|聊了什么|最近说了|最近聊了|说了啥|聊了啥/,
      tasks: [{ type: 'person_messages', target: resolved.name }],
    },
    // 评价类：XX怎么样 / 如何评价XX / XX是个什么样的人
    {
      pattern: /怎么样|如何评价|什么样的人|这人咋样|靠谱吗|是个啥/,
      tasks: [
        { type: 'person_stat', target: resolved.name },
        { type: 'person_messages', target: resolved.name },
        { type: 'mentioned', target: resolved.name },
      ],
    },
  ]

  for (const tpl of templates) {
    if (tpl.pattern.test(q)) {
      return tpl.tasks
    }
  }

  return null
}

// ========== 解析 JSON 任务列表 ==========
function parseTasks(raw) {
  // 清理 markdown 标记
  let cleaned = raw.replace(/```json|```/g, '').trim()

  // 尝试提取 JSON 数组
  const match = cleaned.match(/\[[\s\S]*\]/)
  if (match) {
    cleaned = match[0]
  }

  try {
    const tasks = JSON.parse(cleaned)
    if (!Array.isArray(tasks)) return []
    // 过滤无效任务
    return tasks.filter(
      (t) => t && t.type && ['person_stat', 'person_messages', 'mentioned', 'topic_search', 'worldbook', 'db_info'].includes(t.type),
    )
  } catch {
    return []
  }
}

// ========== 反馈意图检测（用户说"xx有bug""xx太慢""建议加xx"时自动提交反馈）==========
function matchFeedbackIntent(question) {
  const q = question.trim()
  const feedbackPatterns = [
    /(.{2,10})(有bug|黑屏|闪退|崩溃|报错|白屏|卡死|不能用|用不了|坏了|出问题)/,
    /(.{2,10})(太慢|加载慢|卡|延迟高|响应慢|性能差|很卡)/,
    /(建议|希望|能不能|可以不可以|为什么不|为啥不|应该)(.{2,30})/,
    /(新开|新增|加一个|来一个)(.{2,20})(模块|功能|页面|按钮)/,
  ]
  return feedbackPatterns.some((p) => p.test(q))
}

/**
 * 反馈流程：LLM 生成结构化反馈 -> SSE 推给前端让用户确认 -> 回答用户
 * 注意：本函数不自动入库，由前端用户确认后调 API 提交
 * @returns {{ answer, feedback: {type, title, action, content} | null }}
 */
async function runFeedbackFlow(question, history, send, persona) {
  send('agent_thinking', {
    agent: 'main',
    phase: 'planning',
    content: '检测到反馈意图，正在生成结构化反馈...',
  })

  // LLM 生成结构化反馈
  const feedbackMessages = [
    { role: 'system', content: persona || CHAT_PERSONA },
    {
      role: 'user',
      content: `用户说了以下话，请判断是否是在反馈 bug 或需求，并生成结构化反馈。

用户输入：${question}

如果是反馈/需求/bug，输出 JSON（不要 markdown）：
{"is_feedback": true, "type": "bug|optimization|new_feature|story", "title": "简短标题（15字以内）", "action": "用户具体的操作步骤，如无则填'无'", "content": "详细描述（包含用户原话关键信息）"}

类型说明：
- bug: BUG反馈（闪退/黑屏/报错等）
- optimization: 功能优化（体验不好/加载慢等）
- new_feature: 功能新增（新开模块/加功能等）
- story: 剧情设计（角色剧情/结局安排等）

如果不是反馈（比如只是随口提到），输出：
{"is_feedback": false}

只输出 JSON，不要其他内容。`,
    },
  ]

  let feedback = null
  try {
    const raw = await chatCompletion(feedbackMessages, { temperature: 0, maxTokens: 200 })
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0])
      if (parsed.is_feedback) {
        const validTypes = ['bug', 'optimization', 'new_feature', 'story']
        feedback = {
          type: validTypes.includes(parsed.type) ? parsed.type : 'other',
          title: (parsed.title || question.slice(0, 20)).trim(),
          action: (parsed.action || '无').trim(),
          content: (parsed.content || question).trim(),
        }
        send('agent_thinking', {
          agent: 'main',
          phase: 'planning',
          content: `已生成反馈：[${feedback.type}] ${feedback.title}`,
          data: feedback,
        })
      }
    }
  } catch (err) {
    console.log('[Orchestrator] 反馈意图分析失败:', err.message)
  }

  // 流式回答用户（告知已提交反馈 + 正常回复）
  send('agent_thinking', {
    agent: 'main',
    phase: 'reasoning',
    content: '回答中...',
  })

  const answerMessages = [{ role: 'system', content: persona || CHAT_PERSONA }]
  for (const turn of history) {
    answerMessages.push({ role: turn.role, content: turn.content })
  }
  const prefix = feedback
    ? `用户刚才反馈了一个问题，你已经帮他生成了结构化反馈（类型：${feedback.type}，标题：${feedback.title}），系统会自动提交。请用你的人设风格简短回复用户，告知已帮他提交反馈，后续院长会处理。回复要自然，不要提"JSON"等技术细节。\n\n用户原话：${question}\n`
    : question
  answerMessages.push({ role: 'user', content: prefix })

  let answer = ''
  try {
    for await (const chunk of chatCompletionStream(answerMessages, { temperature: 0.7, maxTokens: 500 })) {
      send('token', { content: chunk })
      answer += chunk
    }
  } catch (err) {
    console.error('[Orchestrator] 反馈流式输出异常:', err.message)
    if (!answer) answer = '回答时出错了，请稍后再试~'
  }

  return { answer, sources: [], intent: 'feedback', feedback }
}

// ========== 主入口 ==========
/**
 * @param {string} question 用户问题
 * @param {array} history 对话历史 [{role, content}]
 * @param {function} send SSE 发送函数
 * @returns {{ answer: string, sources: array, intent: string }}
 */
export async function orchestrate(question, history, send, personaId, customDesc) {
  // 解析人设（默认 tiwei）
  const persona = getPersona(personaId, customDesc)
  const emit = (agent, phase, content, data) => {
    send('agent_thinking', { agent, phase, content, data: data || null })
  }

  // ========== 快速闲聊判断（跳过规划阶段，省一次 LLM 调用） ==========
  if (isCasualChat(question)) {
    send('agent_thinking', {
      agent: 'main',
      phase: 'planning',
      content: '这个问题不需要检索数据，直接回答',
    })
    return await runDirectChat(question, history, send, persona)
  }

  // ========== 快速路由（模板化问题跳过规划 LLM，省一次调用 + 响应快 2-3 秒）==========
  const quickTasks = matchQuickPattern(question)
  if (quickTasks) {
    send('agent_thinking', {
      agent: 'main',
      phase: 'planning',
      content: `快速匹配任务：${quickTasks.map((t) => `${t.type}(${t.target})`).join('、')}`,
      data: quickTasks,
    })

    const taskPromises = quickTasks.map((task) => dispatchAgent(task, emit))
    const results = await Promise.all(taskPromises)

    return await runAnalysisAndAnswer(question, history, results, send, persona)
  }

  // ========== 反馈意图检测（用户说"xx有bug""xx太慢"时自动提交反馈）==========
  if (matchFeedbackIntent(question)) {
    const result = await runFeedbackFlow(question, history, send, persona)
    // 如果 LLM 确认是反馈，通过 SSE 通知前端
    if (result.feedback) {
      send('feedback_created', result.feedback)
    }
    return result
  }

  // ========== 阶段 1：规划 ==========
  send('agent_thinking', {
    agent: 'main',
    phase: 'planning',
    content: '正在分析问题，规划检索任务...',
  })

  const plannerMessages = buildPlannerPrompt(question, history, persona)
  let rawTasks = ''
  let planningFailed = false
  try {
    rawTasks = await chatCompletion(plannerMessages, { temperature: 0, maxTokens: 500 })
  } catch (err) {
    console.error('[Orchestrator] 规划 LLM 异常:', err.message)
    planningFailed = true
    rawTasks = '[]'
  }

  const tasks = parseTasks(rawTasks)

  // 规划异常或返回空时的 fallback 策略：
  // - 只有问题包含群聊/数据相关信号词时，才 fallback 到 topic_search
  // - 否则走闲聊（system prompt 里的网站信息/世界知识足够回答）
  if (planningFailed || tasks.length === 0) {
    const dataSignals = /群里|群聊|聊天|发言|消息|谁|讨论|聊过|活跃|统计|数据|信息/
    if (dataSignals.test(question)) {
      console.log('[Orchestrator] 规划无任务，fallback 到 topic_search:', question)
      const fallbackTasks = [{ type: 'topic_search', keywords: question }]
      send('agent_thinking', {
        agent: 'main',
        phase: 'planning',
        content: planningFailed ? '规划异常，尝试搜索...' : `尝试搜索：${question}`,
        data: fallbackTasks,
      })

      const taskPromises = fallbackTasks.map((task) => dispatchAgent(task, emit))
      const results = await Promise.all(taskPromises)
      return await runAnalysisAndAnswer(question, history, results, send, persona)
    }
    // 不含数据信号 -> 走闲聊（system prompt 已注入网站信息+成员知识）
    send('agent_thinking', {
      agent: 'main',
      phase: 'planning',
      content: '这个问题不需要检索数据，直接回答',
    })
    return await runDirectChat(question, history, send, persona)
  }

  send('agent_thinking', {
    agent: 'main',
    phase: 'planning',
    content: tasks.length > 0
      ? `规划了 ${tasks.length} 个检索任务：${tasks.map((t) => `${t.type}(${t.target || t.keywords || ''})`).join('、')}`
      : '这个问题不需要检索数据，直接回答',
    data: tasks,
  })

  // 无任务 -> 纯闲聊
  if (tasks.length === 0) {
    return await runDirectChat(question, history, send, persona)
  }

  // ========== 阶段 2：并行检索 ==========
  const taskPromises = tasks.map((task) => dispatchAgent(task, emit))
  const results = await Promise.all(taskPromises)

  // ========== 阶段 3：分析 + 回答 ==========
  return await runAnalysisAndAnswer(question, history, results, send, persona)
}

// ========== 纯闲聊 ==========
async function runDirectChat(question, history, send, persona) {
  send('agent_thinking', {
    agent: 'main',
    phase: 'reasoning',
    content: '直接回答中...',
  })

  const messages = [{ role: 'system', content: persona || CHAT_PERSONA }]
  for (const turn of history) {
    messages.push({ role: turn.role, content: turn.content })
  }
  messages.push({ role: 'user', content: question })

  let answer = ''
  try {
    for await (const chunk of chatCompletionStream(messages, { temperature: 0.7, maxTokens: 1000 })) {
      send('token', { content: chunk })
      answer += chunk
    }
  } catch (err) {
    console.error('[Orchestrator] 闲聊流式输出异常:', err.message)
    if (!answer) {
      answer = '回答时出错了，请稍后再试~'
    }
  }

  return { answer, sources: [], intent: 'chat' }
}

// ========== 分析 + 回答 ==========
async function runAnalysisAndAnswer(question, history, agentResults, send, persona) {
  // 黑机离线降级检测：重度任务全部降级时给用户提示
  const heavyResults = agentResults.filter((r) => r._wasHeavy)
  const heavyDegraded = heavyResults.filter((r) => r._degraded)
  if (heavyResults.length > 0 && heavyDegraded.length === heavyResults.length) {
    send('agent_thinking', {
      agent: 'main',
      phase: 'warning',
      content: '⚠️ 当前高性能计算节点（黑机）离线，本次查询使用降级模式（数据量受限）。如需完整查询请联系院长开启黑机。',
    })
  }

  // 分析阶段：大 Agent 先做分析推理
  send('agent_thinking', {
    agent: 'main',
    phase: 'analysis',
    content: `收到 ${agentResults.filter((r) => r.ok).length}/${agentResults.length} 个子 Agent 的数据，正在分析...`,
    data: agentResults.map((r) => ({
      type: r.agentType,
      ok: r.ok,
      summary: r.summary || r.error,
      count: r.count || r.messages?.length || 0,
    })),
  })

  const analysisMessages = buildAnalysisPrompt(question, history, agentResults, persona)

  // 流式输出最终回答（加 try-catch 捕获网络中断/超时/LLM 异常）
  let answer = ''
  try {
    for await (const chunk of chatCompletionStream(analysisMessages, { temperature: 0.5, maxTokens: 2000 })) {
      send('token', { content: chunk })
      answer += chunk
    }
  } catch (err) {
    console.error('[Orchestrator] 流式输出异常:', err.message)
    // 降级：发一条错误提示给前端，但返回部分答案（如果已有）
    if (!answer) {
      answer = '回答时出错了，请稍后再试~'
    }
  }

  // 汇总引用来源
  const sources = []
  for (const result of agentResults) {
    if (result.ok && result.messages) {
      for (const msg of result.messages.slice(0, 3)) {
        sources.push({
          nickname: msg.nickname,
          msgTime: msg.msgTime,
          content: msg.content,
        })
      }
    }
  }

  // 确定 intent
  const types = [...new Set(agentResults.map((r) => r.agentType))]
  const intent = types.length > 1 ? 'multi' : (types[0] || 'chat')

  return { answer, sources: sources.slice(0, 5), intent }
}
