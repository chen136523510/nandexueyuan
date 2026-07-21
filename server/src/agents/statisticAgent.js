/**
 * 数据统计子 Agent
 *
 * 职责：分析问题 -> 生成 SQL -> 执行查询 -> 返回结构化结果
 * 不做流式回答（交给主 Agent 综合输出）
 *
 * 返回格式：
 *   { ok: true, sql, result, analysis, summary }
 *   { ok: false, error }
 */

import prisma from '../lib/prisma.js'
import { chatCompletion } from '../utils/llm.js'

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

/**
 * 执行数据统计检索
 * @param {string} question 用户原始问题
 * @param {function} emit SSE 回调：(agent, phase, content, data) => void
 * @returns {{ ok: boolean, sql?: string, result?: array, analysis?: string, summary?: string, error?: string }}
 */
export async function runStatisticAgent(question, emit) {
  // 1. 分析问题
  emit('statistic', 'analyzing', '正在分析数据统计需求...')
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
    emit('statistic', 'analyzing', analysis)
  } catch {
    analysis = question
  }

  // 2. 生成 SQL
  emit('statistic', 'searching', '正在生成查询语句...')
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
- msgTime: 发言时间 (整数，Unix 毫秒时间戳，例如 1657524075000 表示 2022-07-11)
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
  emit('statistic', 'searching', `SQL: ${sql}`)

  // 3. 安全校验
  if (!validateSql(sql)) {
    emit('statistic', 'done', 'SQL 校验未通过，跳过统计检索')
    return { ok: false, error: 'SQL 校验未通过' }
  }

  // 4. 执行 SQL
  let result
  try {
    result = await prisma.$queryRawUnsafe(sql)
  } catch (err) {
    emit('statistic', 'done', `SQL 执行失败: ${err.message}`)
    return { ok: false, error: `SQL 执行失败: ${err.message}` }
  }

  const safeResult = JSON.parse(JSON.stringify(result, (k, v) => (typeof v === 'bigint' ? Number(v) : v)))
  emit('statistic', 'done', `查到 ${safeResult.length} 条统计结果`, safeResult)

  // 5. 生成摘要（给主 Agent 用，不流式）
  let summary = ''
  try {
    const summaryMsgs = [
      {
        role: 'system',
        content: `你是一个数据摘要助手。把 SQL 查询结果用 1-2 句话概括，只提取关键数字和结论，不要多余解释。`,
      },
      { role: 'user', content: `问题: ${question}\nSQL: ${sql}\n结果: ${JSON.stringify(safeResult)}` },
    ]
    summary = await chatCompletion(summaryMsgs, { temperature: 0, maxTokens: 150 })
  } catch {
    summary = `查到 ${safeResult.length} 条结果`
  }

  return {
    ok: true,
    sql,
    result: safeResult,
    analysis,
    summary,
  }
}
