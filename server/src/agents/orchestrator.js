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
import { buildMemberKnowledge } from '../utils/knowledge.js'
import { runPersonStatAgent } from './personStatAgent.js'
import { runPersonMessagesAgent } from './personMessagesAgent.js'
import { runMentionedAgent } from './mentionedAgent.js'
import { runTopicSearchAgent } from './topicSearchAgent.js'
import { isBlackOnline, sendSearchTask } from '../searchHub.js'

// ========== 大 Agent 系统人设 ==========
const MAIN_PERSONA = `你是"男德通"，男德学院群里的一个老群友。男德学院是一个21人的朋友限定社区，由陈梓键发起，有"西德"和"东德"两个微信群。

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
- 关于群聊数据（发言数、活跃度、话题讨论等），你必须基于子检索结果回答
- 如果子检索结果为空或没有提供，就说"这个我得查查"或"我不太确定"，绝对不能自己编数字
- 绝对不能编造任何数字、人名、发言内容
- 你可以认识成员（名字、外号、现状），但不能编造他们的发言数据`

// ========== 规划阶段 prompt ==========
function buildPlannerPrompt(question, history) {
  const messages = [{ role: 'system', content: MAIN_PERSONA }]

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

【判断规则（非常重要）】
- 只要问题涉及某个具体的人（评价/怎么样/谁/说了什么/发了多少），就必须派子 Agent 去检索
- "如何评价XX" -> 同时派 person_stat + person_messages + mentioned
- "XX发了多少条" -> 派 person_stat
- "XX说了什么/聊了什么" -> 派 person_messages
- "XX最近活跃吗" -> 派 person_stat
- "群里谁喷人最多" -> 派 topic_search
- "大家讨论过打球吗" -> 派 topic_search
- 只有纯闲聊（"你好""今天天气怎样""你是谁"）才输出 []

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
function buildAnalysisPrompt(question, history, agentResults) {
  const messages = [{ role: 'system', content: MAIN_PERSONA }]

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

  // 黑机在线 + 重度任务 -> 外包给黑机全量检索
  if (isBlackOnline() && HEAVY_TASKS.includes(type)) {
    try {
      const result = await sendSearchTask(task, emit)
      console.log(`[Orchestrator] 黑机执行 ${type} 成功`)
      return result
    } catch (err) {
      console.log(`[Orchestrator] 黑机失败，降级本地: ${err.message}`)
      emit(type, 'warning', `黑机离线/超时，使用本地检索（数据量受限）`)
    }
  }

  // 降级 / 轻量任务 -> 本地执行
  try {
    switch (type) {
      case 'person_stat':
        return { agentType: '人物统计', ...await runPersonStatAgent(task, emit) }
      case 'person_messages':
        return { agentType: '人物发言', ...await runPersonMessagesAgent(task, emit) }
      case 'mentioned':
        return { agentType: '被提及', ...await runMentionedAgent(task, emit) }
      case 'topic_search':
        return { agentType: '话题检索', ...await runTopicSearchAgent(task, emit) }
      default:
        return { ok: false, error: `未知 Agent 类型: ${type}`, agentType: type }
    }
  } catch (err) {
    return { ok: false, error: err.message, agentType: type }
  }
}

// ========== 快速闲聊判断（避免简单问候也要调 LLM 规划） ==========
function isCasualChat(question) {
  const q = question.trim()
  if (q.length > 20) return false // 长问题不可能是纯闲聊
  const casualPatterns = [
    '你好', '哈喽', '嗨', 'hi', 'hello', '在吗', '在不在',
    '早上好', '中午好', '下午好', '晚上好', '晚安',
    '谢谢', '感谢', '谢了', '多谢', '辛苦了',
    '拜拜', '再见', '88', 'bye',
    '你是谁', '你叫什么', '你是什么',
    '好的', '收到', '了解', '明白', '知道', '嗯', '哦', 'ok',
  ]
  return casualPatterns.some((p) => q.toLowerCase().includes(p))
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
      (t) => t && t.type && ['person_stat', 'person_messages', 'mentioned', 'topic_search'].includes(t.type),
    )
  } catch {
    return []
  }
}

// ========== 主入口 ==========
/**
 * @param {string} question 用户问题
 * @param {array} history 对话历史 [{role, content}]
 * @param {function} send SSE 发送函数
 * @returns {{ answer: string, sources: array, intent: string }}
 */
export async function orchestrate(question, history, send) {
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
    return await runDirectChat(question, history, send)
  }

  // ========== 阶段 1：规划 ==========
  send('agent_thinking', {
    agent: 'main',
    phase: 'planning',
    content: '正在分析问题，规划检索任务...',
  })

  const plannerMessages = buildPlannerPrompt(question, history)
  let rawTasks = ''
  try {
    rawTasks = await chatCompletion(plannerMessages, { temperature: 0, maxTokens: 500 })
  } catch {
    rawTasks = '[]'
  }

  const tasks = parseTasks(rawTasks)

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
    return await runDirectChat(question, history, send)
  }

  // ========== 阶段 2：并行检索 ==========
  const taskPromises = tasks.map((task) => dispatchAgent(task, emit))
  const results = await Promise.all(taskPromises)

  // ========== 阶段 3：分析 + 回答 ==========
  return await runAnalysisAndAnswer(question, history, results, send)
}

// ========== 纯闲聊 ==========
async function runDirectChat(question, history, send) {
  send('agent_thinking', {
    agent: 'main',
    phase: 'reasoning',
    content: '直接回答中...',
  })

  const messages = [{ role: 'system', content: MAIN_PERSONA }]
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
async function runAnalysisAndAnswer(question, history, agentResults, send) {
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

  const analysisMessages = buildAnalysisPrompt(question, history, agentResults)

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
