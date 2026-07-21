/**
 * 多 Agent 协调器（Orchestrator）
 *
 * 职责：
 * 1. 前置路由判断（决定需要哪些子 Agent）
 * 2. 并行调度子 Agent（statistic + semantic）
 * 3. 主 Agent 综合分析 + 流式输出最终回答
 *
 * 调用方式：
 *   const result = await orchestrate(question, history, send)
 *   // result = { answer, sources, intent }
 */

import { chatCompletion, chatCompletionStream } from '../utils/llm.js'
import { buildMemberKnowledge, resolveName } from '../utils/knowledge.js'
import { runStatisticAgent } from './statisticAgent.js'
import { runSemanticAgent } from './semanticAgent.js'

// ========== 主 Agent 系统人设 ==========
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
- 你可以认识成员（名字、外号、现状），但不能编造他们的发言数据
- 被问到"谁发言最多""XX发了多少条""大家聊过什么"这类数据问题时，如果手里没有检索结果，就说需要查数据库`

// ========== 前置路由判断 ==========
async function planRoutes(question) {
  const messages = [
    {
      role: 'system',
      content: `你是一个路由规划器。判断用户问题需要哪些检索渠道，可以多选。

statistic: 统计类（计数、排行、最值、时间分布、谁发言最多、谁喷人最多、多少条消息、谁最活跃等）
semantic: 语义类（话题归纳、观点总结、大家都在聊什么、有没有人讨论过XX、如何评价某某某、谁说了什么、某段时间在聊什么、最近聊了什么等）
none: 纯闲聊（与群聊数据完全无关，如"你好""你是谁""今天天气怎样"）

重要：只要问题涉及群聊内容、聊天记录、话题、某人说的话、某段时间的讨论，就必须选 semantic 或 statistic，不要选 none。

输出格式（只输出关键词，用空格分隔）：
- 如果需要统计检索，输出 statistic
- 如果需要语义检索，输出 semantic
- 如果两个都需要，输出 statistic semantic
- 如果是纯闲聊（不需要检索），输出 none
只输出上述关键词，不要其他内容。`,
    },
    { role: 'user', content: question },
  ]

  try {
    const result = await chatCompletion(messages, { temperature: 0, maxTokens: 20 })
    const trimmed = result.trim().toLowerCase()

    const needStatistic = trimmed.includes('statistic')
    const needSemantic = trimmed.includes('semantic')
    const isNone = trimmed.includes('none') || (!needStatistic && !needSemantic)

    return {
      statistic: needStatistic && !isNone,
      semantic: needSemantic && !isNone,
      none: isNone,
    }
  } catch {
    // 降级：不确定就走两个
    return { statistic: true, semantic: true, none: false }
  }
}

// 防止路由误判（类似原 looksLikeDataQuestion）
function shouldForceStatistic(question) {
  const patterns = [
    '谁最', '谁喷', '谁骂', '多少条', '几次', '排行', '发言最多', '发言最少',
    '最活跃', '多少消息', '排第几', '第几名', '多少人', '占比', '频率',
    '哪个月', '哪天', '时间分布', '统计', '谁第一', '谁最多', '谁最少',
  ]
  return patterns.some((p) => question.includes(p))
}

// 语义检索补丁：看起来像在问聊天内容/话题，强制走 semantic
function shouldForceSemantic(question) {
  const patterns = [
    '聊什么', '聊了什么', '在聊', '聊过', '说过什么', '说了什么',
    '讨论', '话题', '评价', '怎么看', '怎么说的', '谁说',
    '最近聊', '都在聊', '有没有人', '聊到了', '提到',
    '某年', '某月', '几月',
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

// ========== 格式化检索结果给主 Agent ==========
function formatAgentContext(question, statResult, semaResult) {
  let context = `用户问题: ${question}\n`

  // 统计结果
  if (statResult?.ok) {
    context += `\n【数据统计结果】\n`
    context += `分析: ${statResult.analysis}\n`
    context += `SQL: ${statResult.sql}\n`
    context += `结果(JSON): ${JSON.stringify(statResult.result)}\n`
    context += `摘要: ${statResult.summary}\n`
    context += `\n注意：结果中的 nickname 是群昵称，回答时请用成员真名。严格只使用查询结果中的数据，不要添加、修改、编造任何数字或人名。\n`
  } else if (statResult && !statResult.ok) {
    context += `\n【数据统计结果】检索失败：${statResult.error}\n`
  }

  // 语义检索结果
  if (semaResult?.ok && semaResult.messages?.length > 0) {
    const msgContext = semaResult.messages
      .map((r) => `[${resolveName(r.nickname)} ${new Date(r.msgTime).toLocaleString('zh-CN')}] ${r.content}`)
      .join('\n')

    context += `\n【相关聊天记录】\n`
    context += `关键词: ${semaResult.keywords}\n`
    context += `消息内容:\n${msgContext}\n`
    context += `\n注意：只根据上面提供的消息回答，不要编造没有提供的消息内容。如果消息不足以回答，就说"没找到相关的聊天记录"。用你正常的群友语气。可以引用"谁在什么时候说的"。\n`
  } else if (semaResult && !semaResult.ok) {
    context += `\n【相关聊天记录】${semaResult.error}\n`
  }

  return context
}

// ========== 主入口：多 Agent 协调 ==========
/**
 * @param {string} question 用户问题
 * @param {array} history 对话历史 [{role, content}]
 * @param {function} send SSE 发送函数：(event, data) => void
 * @returns {{ answer: string, sources: array, intent: string }}
 */
export async function orchestrate(question, history, send) {
  // 1. 前置路由判断
  send('agent_thinking', {
    agent: 'router',
    phase: 'analyzing',
    content: '正在分析需要哪些检索渠道...',
  })

  const routes = await planRoutes(question)

  // 路由补丁：看起来像数据问题但没选 statistic，强制加上
  if (!routes.statistic && shouldForceStatistic(question)) {
    routes.statistic = true
    routes.none = false
  }

  // 路由补丁：看起来像在问聊天内容/话题但没选 semantic，强制加上
  if (!routes.semantic && shouldForceSemantic(question)) {
    routes.semantic = true
    routes.none = false
  }

  const channels = []
  if (routes.statistic) channels.push('📊统计')
  if (routes.semantic) channels.push('🔍语义')
  if (routes.none) channels.push('💬闲聊')

  send('agent_thinking', {
    agent: 'router',
    phase: 'done',
    content: `检索路由：${channels.join(' + ')}`,
  })

  // 2. 纯闲聊 -> 直接主 Agent 回答
  if (routes.none) {
    return await runMainAgent(question, history, null, null, send)
  }

  // 3. 并行调度子 Agent（allSettled，单个失败不影响另一个）
  const emit = (agent, phase, content, data) => {
    send('agent_thinking', { agent, phase, content, data: data || null })
  }

  const tasks = []
  if (routes.statistic) {
    tasks.push(
      runStatisticAgent(question, emit)
        .then((result) => ({ type: 'statistic', result }))
        .catch((err) => ({ type: 'statistic', result: { ok: false, error: err.message } })),
    )
  }
  if (routes.semantic) {
    tasks.push(
      runSemanticAgent(question, emit)
        .then((result) => ({ type: 'semantic', result }))
        .catch((err) => ({ type: 'semantic', result: { ok: false, error: err.message } })),
    )
  }

  const settled = await Promise.all(tasks)

  const statResult = settled.find((s) => s.type === 'statistic')?.result || null
  const semaResult = settled.find((s) => s.type === 'semantic')?.result || null

  // 4. 主 Agent 综合回答
  return await runMainAgent(question, history, statResult, semaResult, send)
}

// ========== 主 Agent 综合分析 + 流式输出 ==========
async function runMainAgent(question, history, statResult, semaResult, send) {
  // 构建主 Agent 的消息
  const messages = buildContextMessages(history, MAIN_PERSONA)

  // 如果有检索结果，注入到 user message
  if (statResult || semaResult) {
    const context = formatAgentContext(question, statResult, semaResult)
    messages.push({ role: 'user', content: context })
  } else {
    // 纯闲聊
    messages.push({ role: 'user', content: question })
  }

  // 主 Agent 推理提示
  send('agent_thinking', {
    agent: 'main',
    phase: 'reasoning',
    content: '综合检索结果，生成回答中...',
    data: {
      statistic: statResult?.ok ? { summary: statResult.summary, count: statResult.result?.length } : null,
      semantic: semaResult?.ok ? { keywords: semaResult.keywords, count: semaResult.messages?.length } : null,
    },
  })

  // 流式输出
  let answer = ''
  const temperature = statResult || semaResult ? 0.5 : 0.7
  for await (const chunk of chatCompletionStream(messages, { temperature, maxTokens: 1000 })) {
    send('token', { content: chunk })
    answer += chunk
  }

  // 汇总引用来源（取语义检索的 sources）
  const sources = semaResult?.sources || []

  // 确定 intent 标签
  let intent = 'chat'
  if (statResult?.ok && semaResult?.ok) intent = 'multi' // 多 agent 综合
  else if (statResult?.ok) intent = 'statistic'
  else if (semaResult?.ok) intent = 'semantic'

  return { answer, sources, intent }
}
