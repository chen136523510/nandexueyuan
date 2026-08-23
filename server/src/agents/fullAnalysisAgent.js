/**
 * 全量数据分析子 Agent（map-reduce 分批摘要）
 *
 * 背景：普通检索链路多处截断（topic 每块抽 10 条 / person·mentioned 传 30/20 条 /
 * orchestrator 总闸 2 万字符），用户要求"全量分析"时 AI 只见抽样。本 Agent 把
 * 命中范围的全量消息按字符预算分批，逐批让 LLM 做查询感知摘要（map），
 * 再分层合并成一份底稿（reduce），作为 formattedText 注入现有分析流。
 *
 * 输入：{ type, full: true, ...task 原字段 }，task.question 为用户原始问题
 * 输出：{ ok, agentType: '全量分析', summary, formattedText, messages, count, coverage }
 */

// ========== 可调参数（集中管理）==========
const BATCH_CHAR_BUDGET = 24000 // 每批消息文本的字符预算（≈3.6 万 token，上下文安全）
const MAX_BATCHES = 40 // 批数上限；超出走等距抽样并明示
const MAP_CONCURRENCY = 4 // map 阶段 LLM 并发数（buildChunks 同库用 5）
const MAX_RETRIES = 3 // 单批 LLM 失败重试次数
const MSG_CHAR_LIMIT = 2000 // 单条消息超长截断
const TOPIC_CHUNK_LIMIT = 30 // 全量话题模式最多纳入的话题块数（超出的块丢弃，coverage 明示）
const REDUCE_GROUP_SIZE = 12 // 分层 reduce 每组合并的摘要份数
const DRAFT_CHAR_LIMIT = 15000 // 最终底稿上限（给 orchestrator 2 万字符总闸留余量）

import prisma from '../lib/prisma.js'
import { chatCompletion, TEMPS } from '../utils/llm.js'
import { members, resolveName } from '../utils/knowledge.js'
import { buildFtsQuery } from '../utils/tokenizer.js'

// bigint 安全序列化
function toSafe(rows) {
  return JSON.parse(JSON.stringify(rows, (k, v) => (typeof v === 'bigint' ? Number(v) : v)))
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// ========== 第一步：按任务类型构建检索范围 ==========

// 人物发言范围：nickname 精确匹配（与 personMessagesAgent.buildPersonConditions 一致）
function buildPersonCondition(target) {
  const member = members.find(
    (m) => m.name === target || m.aliases.includes(target) || m.nicknames.includes(target),
  )
  if (!member) {
    return { cond: `nickname = '${target.replace(/'/g, "''")}'`, names: [target] }
  }
  const allNames = [member.name, ...member.nicknames, ...member.aliases]
  return { cond: allNames.map((n) => `nickname = '${n.replace(/'/g, "''")}'`).join(' OR '), names: allNames }
}

// 被提及范围：content 含姓名/外号/昵称（与 mentionedAgent.buildSearchKeywords 一致）
function buildMentionKeywords(target) {
  const member = members.find(
    (m) => m.name === target || m.aliases.includes(target) || m.nicknames.includes(target),
  )
  if (!member) return [target].filter((k) => k.length >= 2)
  return [member.name, ...member.aliases, ...member.nicknames].filter((k) => k.length >= 2)
}

/**
 * 构建检索范围，返回 { whereSql, params, scopeDesc, needsMsgIds }
 * needsMsgIds 为 true 时调用方需先查出消息 id 列表再分页（IN 分页防 id 空洞）
 */
async function buildScope(task, emit) {
  const { type, target, keywords, startDate, endDate } = task

  if (type === 'person_messages' && target) {
    const { cond, names } = buildPersonCondition(target)
    return {
      whereSql: cond,
      params: [],
      scopeDesc: `${target} 的全部发言（匹配昵称：${names.slice(0, 6).join('、')}${names.length > 6 ? ' 等' : ''}）`,
      needsMsgIds: false,
    }
  }

  if (type === 'mentioned' && target) {
    const kws = buildMentionKeywords(target)
    const likeSql = kws.map((k) => `content LIKE '%${k.replace(/'/g, "''")}%'`).join(' OR ')
    return {
      whereSql: likeSql,
      params: [],
      scopeDesc: `群里提到 ${target} 的消息（关键词：${kws.slice(0, 6).join('、')}${kws.length > 6 ? ' 等' : ''}）`,
      needsMsgIds: false,
    }
  }

  if (type === 'time_search' && startDate && endDate) {
    let whereSql = 'msgTime BETWEEN ? AND ?'
    const params = [`${startDate} 00:00:00`, `${endDate} 23:59:59`]
    let scopeDesc = `${startDate} ~ ${endDate} 的全部消息`
    if (keywords) {
      const words = keywords.split(/\s+/).filter((w) => w.length >= 2)
      if (words.length > 0) {
        whereSql += ` AND (${words.map((w) => `content LIKE '%${w.replace(/'/g, "''")}%'`).join(' OR ')})`
        scopeDesc += `（含关键词：${words.join('、')}）`
      }
    }
    return { whereSql, params, scopeDesc, needsMsgIds: false }
  }

  if (type === 'topic_search' && keywords) {
    // 与 topicSearchAgent.Level1 同源：FTS5 v2 命中话题块，取块内 id 区间
    // 降级链：v2（unicode61 双列，线上/新库）-> 旧版 fts（trigram 单列，老本地库）-> LIKE
    const rawWords = keywords.split(/\s+/).filter((k) => k.length >= 2)
    if (rawWords.length === 0) throw new Error('未提取到有效关键词')

    let chunks = []
    try {
      const ftsQuery = buildFtsQuery(rawWords)
      chunks = await prisma.$queryRawUnsafe(
        `SELECT c.id, c.startMsgId, c.endMsgId, c.chunkDate, c.keywords
         FROM message_chunks_fts_v2 f
         JOIN message_chunks c ON f.rowid = c.id
         WHERE f.message_chunks_fts_v2 MATCH ?
         ORDER BY rank
         LIMIT ${TOPIC_CHUNK_LIMIT}`,
        ftsQuery,
      )
    } catch (err) {
      console.error('[FullAnalysis] 话题块 FTS5 v2 检索失败:', err.message)
      // 旧版 trigram 索引兜底（老本地库无 v2 表；trigram 天然支持子串匹配）
      try {
        const likeAny = rawWords.join(' ')
        chunks = await prisma.$queryRawUnsafe(
          `SELECT c.id, c.startMsgId, c.endMsgId, c.chunkDate, c.keywords
           FROM message_chunks_fts f
           JOIN message_chunks c ON f.rowid = c.id
           WHERE f.message_chunks_fts MATCH ?
           ORDER BY rank
           LIMIT ${TOPIC_CHUNK_LIMIT}`,
          likeAny,
        )
      } catch (err2) {
        console.error('[FullAnalysis] 话题块 FTS5 旧版兜底失败:', err2.message)
      }
    }
    // LIKE 后备（与 topicSearchAgent.Level2 一致）
    if (!chunks || chunks.length === 0) {
      const likeConditions = rawWords
        .map((w) => `(keywords LIKE '%${w.replace(/'/g, "''")}%' OR summary LIKE '%${w.replace(/'/g, "''")}%')`)
        .join(' OR ')
      if (likeConditions) {
        chunks = await prisma.$queryRawUnsafe(
          `SELECT id, startMsgId, endMsgId, chunkDate, keywords
           FROM message_chunks
           WHERE ${likeConditions}
           LIMIT ${TOPIC_CHUNK_LIMIT}`,
        )
      }
    }
    if (!chunks || chunks.length === 0) throw new Error('未找到相关话题块')

    emit('full_analysis', 'analyzing', `话题命中 ${chunks.length} 个块，正在圈定消息范围...`)

    // 每块 BETWEEN 查 id（块与块可能不重叠，逐块查再合并）
    const allRows = []
    for (const c of chunks) {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT id FROM group_messages WHERE id BETWEEN ? AND ?`,
        c.startMsgId,
        c.endMsgId,
      )
      allRows.push(...rows)
    }
    const ids = [...new Set(toSafe(allRows).map((r) => r.id))].sort((a, b) => a - b)
    return {
      whereSql: null,
      params: [],
      scopeDesc: `话题「${keywords}」命中的 ${chunks.length} 个话题块（${toSafe(chunks)[0]?.chunkDate || ''} ~ ${toSafe(chunks)[chunks.length - 1]?.chunkDate || ''}）`,
      needsMsgIds: true,
      msgIds: ids,
    }
  }

  throw new Error(`任务类型 ${type} 不支持全量分析`)
}

// ========== 第二步：分批（generateBatches 生成器实现）==========

/**
 * 批次生成器：按 id 范围（或显式 id 列表）游标推进，累计字符到预算即切批
 * @param {function} fetchRange(startId, limit) -> rows 按升序取消息
 * @param {function} fetchRangeByIds(ids) -> rows 按 id 列表取消息
 * @param {number} total 预估总数（仅用于进度展示）
 */
async function* generateBatches(scope, total, emit) {
  // 注意：scope.whereSql 含 OR 条件，与外层 AND 组合时必须括号包裹，
  // 否则 SQL 运算符优先级（AND > OR）会让 id 限制只作用于最后一个 OR 分支（BUG：BETWEEN 返回全量）
  const fetchRange = async (startId, limit) =>
    toSafe(
      await prisma.$queryRawUnsafe(
        `SELECT id, nickname, msgTime, content FROM group_messages WHERE (${scope.whereSql}) AND id >= ? ORDER BY id ASC LIMIT ${limit}`,
        ...scope.params,
        startId,
      ),
    )
  const fetchRangeByIds = async (ids) =>
    toSafe(
      await prisma.$queryRawUnsafe(
        `SELECT id, nickname, msgTime, content FROM group_messages WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY id ASC`,
        ...ids,
      ),
    )

  // 等距抽样：全量 ids 数组 -> 最多 maxCount 个 id（保首尾、等距取点）
  const sampleIds = (ids, maxCount) => {
    if (ids.length <= maxCount) return ids
    const picked = []
    const step = (ids.length - 1) / (maxCount - 1)
    for (let i = 0; i < maxCount; i++) picked.push(ids[Math.round(i * step)])
    return [...new Set(picked)]
  }

  // 采样标记在 50000 上限处已置 true（见上），此处直接使用闭包外的 sampled
  if (scope.needsMsgIds) {
    let sampled = false
    let allIds = scope.msgIds
    if (allIds.length > 50000) {
      // 超大范围：等距抽样 id（50000 条上限，再由字符预算切批）
      allIds = sampleIds(allIds, 50000)
      sampled = true
    }
    // 按真实字符分批：逐段 fetch（每段 PAGE 条），累计到预算即切批
    let cursor = 0
    let current = []
    let currentChars = 0
    const PAGE = 500
    let buffer = []
    while (cursor < allIds.length || buffer.length > 0) {
      if (buffer.length === 0 && cursor < allIds.length) {
        const page = allIds.slice(cursor, cursor + PAGE)
        buffer = await fetchRangeByIds(page)
        cursor += PAGE
      }
      while (buffer.length > 0) {
        const row = buffer.shift()
        const len = Math.min((row.content || '').length, MSG_CHAR_LIMIT) + 30
        if (currentChars + len > BATCH_CHAR_BUDGET && current.length > 0) {
          yield { ids: current.map((r) => r.id), sampled }
          current = []
          currentChars = 0
        }
        current.push(row)
        currentChars += len
      }
      if (current.length > 0 && cursor >= allIds.length && buffer.length === 0) {
        yield { ids: current.map((r) => r.id), sampled }
        current = []
        currentChars = 0
      }
    }
    return
  }

  // WHERE 条件范围：先一次性取全量 id+LENGTH(content)（轻量，避免逐页全表扫描）
  // 内存按字符预算切分批，大范围（如某成员全部发言 9 万条）也比游标分页快一个数量级
  const scopeRows = toSafe(
    await prisma.$queryRawUnsafe(
      `SELECT id, LENGTH(COALESCE(content, '')) AS len FROM group_messages WHERE (${scope.whereSql}) ORDER BY id ASC`,
      ...scope.params,
    ),
  )
  if (scopeRows.length === 0) return

  const batches = []
  let currentIds = []
  let currentChars = 0
  for (const row of scopeRows) {
    const len = Math.min(row.len, MSG_CHAR_LIMIT) + 30 // 与 fetch 后的真实 len 计算一致
    if (currentChars + len > BATCH_CHAR_BUDGET && currentIds.length > 0) {
      batches.push({ startId: currentIds[0], endId: currentIds[currentIds.length - 1], sampled: false })
      currentIds = []
      currentChars = 0
    }
    currentIds.push(row.id)
    currentChars += len
  }
  if (currentIds.length > 0) {
    batches.push({ startId: currentIds[0], endId: currentIds[currentIds.length - 1], sampled: false })
  }

  // 超过 MAX_BATCHES：跨全时段等距抽样批（保首尾）
  let sampledMode = false
  if (batches.length > MAX_BATCHES) {
    const step = (batches.length - 1) / (MAX_BATCHES - 1)
    const picked = new Set()
    for (let i = 0; i < MAX_BATCHES; i++) picked.add(Math.round(i * step))
    const sampled = [...picked].sort((a, b) => a - b).map((i) => batches[i])
    batches.length = 0
    batches.push(...sampled)
    sampledMode = true
  }

  for (const b of batches) {
    yield { ...b, sampled: sampledMode }
  }
}

// ========== 第三步：map（分批摘要）==========

function formatMsg(m) {
  const time = new Date(m.msgTime).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  return `[${resolveName(m.nickname)} ${time}] ${(m.content || '').slice(0, MSG_CHAR_LIMIT)}`
}

async function mapBatch(batchText, batchMeta, question) {
  const messages = [
    {
      role: 'system',
      content: `你是群聊数据分析师。下面是群聊记录的一个片段，请围绕用户的问题做深度摘要，这是后续全量分析的数据底料。

用户的问题：${question}

要求：
- 只依据本片段内容，不编造
- 保留与问题相关的人物（用真名）、事件、时间、次数等数据点
- 保留有代表性的原话金句（标注说话人）
- 记录本片段的时间范围和消息条数
- 输出为要点列表，500 字以内，不要客套话`,
    },
    {
      role: 'user',
      content: `【片段 ${batchMeta.index}/${batchMeta.total}】时间 ${batchMeta.range}，共 ${batchMeta.count} 条消息：\n\n${batchText}`,
    },
  ]
  const result = await chatCompletion(messages, { temperature: TEMPS.ANALYSIS })
  // glm-5.3 偶发思考链吃掉全部输出预算 -> content 为空字符串，视为失败让上层重试
  if (!result || !result.trim()) throw new Error('LLM 返回空内容')
  return result
}

// ========== 第四步：reduce（分层合并）==========

async function reduceSummaries(summaries, batchMetas, question) {
  const merge = async (texts, label) => {
    const messages = [
      {
        role: 'system',
        content: `你是群聊数据分析师。以下是群聊记录多个片段的分析摘要，请合并成一份更完整但不冗余的汇总。

用户的问题：${question}

要求：
- 合并重复信息，保留所有独立的人物/事件/数据点/金句
- 保持要点列表格式，按时间或主题组织
- 尽量压缩篇幅，只保留对回答问题有价值的信息`,
      },
      { role: 'user', content: `【${label}】共 ${texts.length} 份摘要：\n\n${texts.join('\n\n---\n\n')}` },
    ]
    const result = await chatCompletion(messages, { temperature: TEMPS.ANALYSIS })
    // 空返回视为失败（glm-5.3 偶发思考链吃掉输出预算），上层用原始摘要兜底
    if (!result || !result.trim()) throw new Error('合并返回空内容')
    return result
  }

  let current = [...summaries]
  let level = 0
  // 分层合并：每 REDUCE_GROUP_SIZE 份合一，直到只剩 1 份或体积达标
  while (current.length > 1) {
    level++
    const groups = []
    for (let i = 0; i < current.length; i += REDUCE_GROUP_SIZE) {
      groups.push(current.slice(i, i + REDUCE_GROUP_SIZE))
    }
    // 最后一组只剩 1 份且组数 > 1 时并入前一组，避免无谓的一轮
    if (groups.length > 1 && groups[groups.length - 1].length === 1) {
      const last = groups.pop()
      groups[groups.length - 1].push(...last)
    }
    const merged = []
    for (let g = 0; g < groups.length; g++) {
      if (groups[g].length === 1) {
        merged.push(groups[g][0]) // 单份无需 LLM
        continue
      }
      // 合并失败/空返回：保留该组原始摘要拼接（信息不丢，只是更长），不中断整体
      try {
        merged.push(await merge(groups[g], `第 ${level} 层合并，组 ${g + 1}/${groups.length}`))
      } catch (err) {
        console.error(`[FullAnalysis] 第 ${level} 层组 ${g + 1} 合并失败，保留原始摘要:`, err.message)
        merged.push(groups[g].join('\n\n---\n\n'))
      }
    }
    current = merged.filter((t) => t && t.trim())
    emitProgress(`汇总合并第 ${level} 层完成，剩 ${current.length} 份`)
  }
  return current[0] || '(无内容)'

  function emitProgress(content) {
    // 由外层注入（见 runFullAnalysisAgent 的 reduceEmit hack）
    if (reduceSummaries._emit) reduceSummaries._emit('full_analysis', 'reducing', content)
  }
}

// ========== 主入口 ==========

/**
 * 执行全量数据分析
 * @param {{ type: string, question: string, target?: string, keywords?: string, startDate?: string, endDate?: string }} task
 * @param {function} emit SSE 回调 (agent, phase, content, data)
 */
export async function runFullAnalysisAgent(task, emit) {
  const startTime = Date.now()
  const question = task.question || task.keywords || task.target || '全量分析'

  emit('full_analysis', 'analyzing', '正在圈定全量检索范围...')

  // 1. 构建范围
  let scope
  try {
    scope = await buildScope(task, emit)
  } catch (err) {
    emit('full_analysis', 'done', `范围构建失败：${err.message}`)
    return { ok: false, error: err.message }
  }

  // 2. COUNT 总数
  let totalCount
  if (scope.needsMsgIds) {
    totalCount = scope.msgIds.length
  } else {
    const cnt = toSafe(
      await prisma.$queryRawUnsafe(`SELECT COUNT(*) as total FROM group_messages WHERE (${scope.whereSql})`, ...scope.params),
    )
    totalCount = cnt[0]?.total || 0
  }

  if (totalCount === 0) {
    emit('full_analysis', 'done', '范围内没有消息')
    return { ok: false, error: '范围内没有消息' }
  }

  emit('full_analysis', 'analyzing', `范围：${scope.scopeDesc}，共 ${totalCount} 条消息，正在分批...`)

  // 3. 生成批次（先全部 materialize，便于做 40 批上限与等距抽样）
  const batches = []
  for await (const b of generateBatches(scope, totalCount, emit)) {
    batches.push(b)
  }

  if (batches.length === 0) {
    return { ok: false, error: '分批失败：未产生任何批次' }
  }

  // 超过 MAX_BATCHES：跨全时段等距抽样批（保首尾），coverage 明示
  let sampledMode = batches.some((b) => b.sampled)
  let droppedBatches = 0
  const originalBatchCount = batches.length
  if (batches.length > MAX_BATCHES) {
    const step = (batches.length - 1) / (MAX_BATCHES - 1)
    const picked = []
    for (let i = 0; i < MAX_BATCHES; i++) picked.push(batches[Math.round(i * step)])
    droppedBatches = originalBatchCount - new Set(picked).size
    batches.length = 0
    batches.push(...picked)
    sampledMode = true
  }

  const totalBatches = batches.length
  const estSec = Math.ceil((totalBatches / MAP_CONCURRENCY) * 40)
  emit(
    'full_analysis',
    'analyzing',
    `共 ${totalBatches} 批${sampledMode ? `（原 ${originalBatchCount} 批，等距抽样 ${droppedBatches} 批）` : ''}，预计 ${Math.floor(estSec / 60)} 分 ${estSec % 60} 秒，开始分批摘要...`,
    { total: totalBatches },
  )

  // 4. map 阶段：并发执行（信号量模式）
  const summaries = new Array(totalBatches).fill(null)
  const batchMetas = new Array(totalBatches).fill(null)
  const msgCounts = new Array(totalBatches).fill(0)
  let completed = 0
  let failed = 0

  const fetchBatchRows = async (batch) => {
    if (batch.ids) {
      return toSafe(
        await prisma.$queryRawUnsafe(
          `SELECT id, nickname, msgTime, content FROM group_messages WHERE id IN (${batch.ids.map(() => '?').join(',')}) ORDER BY id ASC`,
          ...batch.ids,
        ),
      )
    }
    return toSafe(
      await prisma.$queryRawUnsafe(
        `SELECT id, nickname, msgTime, content FROM group_messages WHERE (${scope.whereSql}) AND id BETWEEN ? AND ? ORDER BY id ASC`,
        ...scope.params,
        batch.startId,
        batch.endId,
      ),
    )
  }

  const mapOne = async (i) => {
    const batch = batches[i]
    let rows
    try {
      rows = await fetchBatchRows(batch)
    } catch (err) {
      console.error(`[FullAnalysis] 批 ${i + 1} 数据查询失败:`, err.message)
      failed++
      completed++
      return
    }
    if (rows.length === 0) {
      completed++
      return
    }
    msgCounts[i] = rows.length
    const first = new Date(rows[0].msgTime)
    const last = new Date(rows[rows.length - 1].msgTime)
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const range = `${fmt(first)} ~ ${fmt(last)}`
    batchMetas[i] = { index: i + 1, total: totalBatches, range, count: rows.length }
    const batchText = rows.map(formatMsg).join('\n')

    let retries = 0
    while (retries < MAX_RETRIES) {
      try {
        summaries[i] = await mapBatch(batchText, batchMetas[i], question)
        break
      } catch (err) {
        retries++
        if (err.message === 'CLIENT_ABORTED') throw err // 用户停止 -> 立即中断整个流程
        if (retries >= MAX_RETRIES) {
          console.error(`[FullAnalysis] 批 ${i + 1} 摘要失败（重试 ${retries} 次）:`, err.message)
        } else {
          await sleep(2000 * retries)
        }
      }
    }
    if (!summaries[i]) failed++
    completed++
    emit('full_analysis', 'mapping', `分批摘要进度：${completed}/${totalBatches} 批`, {
      current: completed,
      total: totalBatches,
    })
  }

  const queue = [...batches.keys()]
  const workers = Array.from({ length: Math.min(MAP_CONCURRENCY, queue.length) }, async () => {
    while (queue.length > 0) {
      const i = queue.shift()
      if (i === undefined) break
      await mapOne(i)
    }
  })
  await Promise.all(workers)

  const okSummaries = []
  const okMetas = []
  for (let i = 0; i < totalBatches; i++) {
    if (summaries[i]) {
      okSummaries.push(summaries[i])
      okMetas.push(batchMetas[i])
    }
  }
  if (okSummaries.length === 0) {
    return { ok: false, error: '全部分批摘要失败' }
  }

  // 5. reduce 阶段
  emit('full_analysis', 'reducing', `分批摘要完成（成功 ${okSummaries.length}/${totalBatches}，失败 ${failed}），开始汇总合并...`)
  reduceSummaries._emit = emit
  let draft
  try {
    draft = await reduceSummaries(okSummaries, okMetas, question)
  } finally {
    reduceSummaries._emit = null
  }

  // 6. 覆盖口径头 + 体裁裁剪
  const analyzedCount = okMetas.reduce((s, m) => s + (m?.count || 0), 0)
  const firstMeta = okMetas.find((m) => m)
  const lastMeta = [...okMetas].reverse().find((m) => m)
  const coverage = {
    scope: scope.scopeDesc,
    totalMessages: totalCount,
    analyzedMessages: analyzedCount,
    batches: `${okSummaries.length}/${totalBatches}`,
    failedBatches: failed,
    sampled: sampledMode || msgCounts.some((c, i) => batchMetas[i] && c < (batches[i]?.ids?.length || 0)),
    timeRange: firstMeta && lastMeta ? `${firstMeta.range.split(' ~ ')[0]} ~ ${lastMeta.range.split(' ~ ')[1]}` : '',
    elapsedSec: Math.round((Date.now() - startTime) / 1000),
  }

  let coverageHead = `【全量分析底稿】范围：${coverage.scope}；共 ${totalCount} 条消息，本底稿覆盖 ${analyzedCount} 条（${okSummaries.length}/${totalBatches} 批${failed > 0 ? `，失败 ${failed} 批` : ''}${coverage.sampled ? '，超量范围已等距抽样' : ''}）；时间 ${coverage.timeRange}；耗时 ${coverage.elapsedSec}s\n\n`
  if (coverageHead.length + draft.length > DRAFT_CHAR_LIMIT) {
    draft = draft.substring(0, DRAFT_CHAR_LIMIT - coverageHead.length - 20) + '\n...（底稿超长截断）'
  }

  emit(
    'full_analysis',
    'done',
    `全量分析完成：${totalCount} 条消息 -> ${okSummaries.length} 批摘要 -> 底稿 ${draft.length} 字符，耗时 ${coverage.elapsedSec}s`,
    coverage,
  )

  return {
    ok: true,
    agentType: '全量分析',
    summary: `全量分析：${scope.scopeDesc}，共 ${totalCount} 条（覆盖 ${analyzedCount} 条，${okSummaries.length}/${totalBatches} 批）`,
    formattedText: coverageHead + draft,
    messages: [], // 全量原文不回传（体积过大），引用来源由其他并行任务提供
    count: totalCount,
    coverage,
  }
}
