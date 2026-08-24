/**
 * 话题检索子 Agent
 *
 * 输入：{ keywords: "打球 游戏" }
 * 逻辑：同义词扩展 + FTS5 四级降级检索（分块FTS双列 -> 分块LIKE -> 消息FTS -> 消息LIKE）
 * 返回：{ ok: true, keywords, messages, formattedText, sources } 或 { ok: false, error }
 *
 * 命中话题块时不再全量返回块内消息：每块输出「摘要头 + 抽样消息」（关键词命中优先 + 头尾定边界），
 * formattedText 覆盖全部命中块，避免旧版 orchestrator slice(0,30) 只覆盖第一个块的信息失真（方案A）。
 */

// 每个命中话题块传给 LLM 的消息预算（条）。5 块 × 10 条 + 摘要头 ≈ 覆盖全部块且体积可控
const MSG_BUDGET_PER_CHUNK = 10

// ========== R-053 RAG 检索增强（方案 B/C/D）：块选取层精度 ==========
export const RERANK_CANDIDATES = 20   // 方案B：Level 1 召回上限（原 5），大召回保证不漏
export const RERANK_KEEP = 5          // 方案B：rerank 保留块数
export const RERANK_TRIGGER = 6       // 方案B：候选数 > 此值才触发 rerank（≤5 直接用初排，省一次 LLM）

import prisma from '../lib/prisma.js'
import { chatCompletion } from '../utils/llm.js'
import { resolveName } from '../utils/knowledge.js'
import { buildFtsQuery } from '../utils/tokenizer.js'

// ========== 同义词缓存（LRU Map，TTL 1 小时）==========
// 相同关键词重复扩展只调一次 LLM，命中缓存时延迟 3-5s -> 0ms
const synonymCache = new Map() // key: keywords, value: { expanded, ts }
const SYNONYM_CACHE_TTL = 3600000 // 1 小时
const SYNONYM_CACHE_MAX = 200 // 最多缓存 200 组

/**
 * 用 LLM 扩展同义词，提升 FTS5 召回率
 * 例如："打球" -> "打球 篮球 足球 羽毛球 运动"
 * @param {string} keywords 原始关键词
 * @returns {Promise<string>} 扩展后的关键词（含原始词）
 */
async function expandSynonyms(keywords) {
  // 命中缓存直接返回
  const cached = synonymCache.get(keywords)
  if (cached && Date.now() - cached.ts < SYNONYM_CACHE_TTL) {
    console.log('[TopicSearch] 同义词缓存命中:', keywords)
    return cached.expanded
  }

  try {
    const result = await chatCompletion([
      {
        role: 'system',
        content: `你是一个同义词扩展助手。用户给你几个搜索关键词，你扩展出相关的同义词和近义词。

规则：
- 保留原始关键词
- 补充 3-8 个相关的同义词、近义词、下位词
- 每个词至少 2 个汉字
- 只输出词语，用空格分隔
- 不要解释，不要标点

示例：
输入"打球" -> 打球 篮球 足球 羽毛球 乒乓球 运动 比赛
输入"考研" -> 考研 研究生 保研 复试 初试 上岸 学习
输入"喷人" -> 喷人 骂 吐槽 菜 垃圾 废物 离谱`,
      },
      { role: 'user', content: keywords },
    ], { temperature: 0 })
    const expanded = result.trim()

    // 写入缓存（LRU：超限时淘汰最旧）
    synonymCache.set(keywords, { expanded, ts: Date.now() })
    if (synonymCache.size > SYNONYM_CACHE_MAX) {
      const firstKey = synonymCache.keys().next().value
      synonymCache.delete(firstKey)
    }

    return expanded
  } catch (err) {
    console.log('[TopicSearch] 同义词扩展失败，用原始关键词:', err.message)
    return keywords
  }
}

/**
 * 块内消息抽样：关键词命中优先 + 头尾各1条定时间边界 + 顺序补齐
 * 解决全量捞取后 orchestrator slice(0,30) 只覆盖第一个块的信息失真（方案A，2026-08-15 调研）
 * @param {array} msgs 块内全部消息（按 id ASC）
 * @param {array} keywords 检索关键词
 * @param {number} budget 每块消息预算
 * @returns {array} 抽样消息（保持原对话顺序）
 */
function sampleChunkMessages(msgs, keywords, budget) {
  if (msgs.length <= budget) return msgs

  const kw = keywords.filter((k) => k.length >= 2)
  const scored = msgs.map((m, i) => {
    const text = m.content || ''
    let score = 0
    for (const k of kw) if (text.includes(k)) score++
    return { i, score }
  })

  const picked = new Set()
  // 1. 关键词命中的消息优先（按命中词数排序），预留头尾 2 个名额
  const hits = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score)
  for (const h of hits.slice(0, budget - 2)) picked.add(h.i)
  // 2. 头尾各 1 条，定块的时间边界
  picked.add(0)
  picked.add(msgs.length - 1)
  // 3. 不足预算时顺序补齐
  let i = 0
  while (picked.size < budget && i < msgs.length) picked.add(i++)

  return [...picked].sort((a, b) => a - b).map((idx) => msgs[idx])
}

// ========== 方案 D：块间 Jaccard 去重 ==========
// 同一天同一话题被切成相邻块的冗余，可能占满全部 5 个名额
// 相似度 > 0.7 视为同质块，保留 rank 靠前的
export function dedupChunks(chunks) {
  if (chunks.length <= 1) return chunks
  const kept = []
  for (const c of chunks) {
    const wordsC = new Set((c.keywords || '').split(/\s+/).filter(Boolean))
    const isDup = kept.some((k) => {
      const wordsK = new Set((k.keywords || '').split(/\s+/).filter(Boolean))
      const inter = [...wordsC].filter((w) => wordsK.has(w)).length
      const union = new Set([...wordsC, ...wordsK]).size
      return union > 0 && inter / union > 0.7
    })
    if (!isDup) kept.push(c)
  }
  return kept
}

// ========== 方案 B：LLM Rerank 候选块 ==========
// 用 LLM 做精排，替代 Pinecone/Cohere 的 cross-encoder rerank
// 确定性 JSON 场景：temperature=0 + thinking:disabled，与 planner/feedback 同策略
export async function rerankChunks(question, chunks) {
  if (!chunks.length) return chunks

  const lines = chunks.map((c, i) => `${i + 1}. id=${Number(c.id)} ${c.chunkDate} 关键词：${(c.keywords || '').slice(0, 100)}`)
  const prompt = `你是检索结果重排序器。根据用户问题，从候选话题块中选出最相关的块。
规则：
- 只依据块的日期和关键词判断相关性
- 保留 ${RERANK_KEEP} 个最相关块，按相关性降序
- 只输出 JSON 数组（块 id），不要其他内容

【用户问题】${question}

【候选块】
${lines.join('\n')}`

  // 初排前 5 兜底：LLM 失败 / 输出非法 / id 全幻觉时降级，与旧行为一致
  const fallback = () => {
    console.log('[TopicSearch] rerank 失败，降级取初排前 5')
    return chunks.slice(0, RERANK_KEEP)
  }

  try {
    const raw = await chatCompletion([{ role: 'user', content: prompt }], {
      temperature: 0,
      thinking: 'disabled',
    })
    // 剥 ```json ... ``` 围栏，兼容少数模型带围栏输出
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
    const match = cleaned.match(/\[[\d,\s]+\]/)
    if (!match) return fallback()
    // 注意：chunk.id 经 Prisma 返回可能是 BigInt（1n !== 1），须 Number 归一后再匹配
    const ids = JSON.parse(match[0]).map(Number)
    if (!Array.isArray(ids) || ids.length === 0) return fallback()
    const idToChunk = new Map(chunks.map((c) => [Number(c.id), c]))
    const picked = ids.slice(0, RERANK_KEEP).map((id) => idToChunk.get(id)).filter(Boolean)
    if (picked.length === 0) return fallback()
    return picked // 按 LLM 给出的相关性降序
  } catch (err) {
    console.log('[TopicSearch] rerank 失败，降级取初排前 5:', err.message)
    return chunks.slice(0, RERANK_KEEP)
  }
}

// ========== 检索结果缓存（P1-4：相同关键词 10 分钟内复用完整结果）==========
// 同义词扩展已有 1h LRU，这里再补数据库+格式化层：同关键词重复提问（群友常用）
// 命中时 0 次查询 0 次格式化直接返回。只缓存成功结果，失败不缓存
const resultCache = new Map()
const RESULT_CACHE_TTL = 600000 // 10 分钟
const RESULT_CACHE_MAX = 50

/**
 * 执行话题检索
 * @param {{ keywords: string }} task 任务
 * @param {function} emit SSE 回调
 * @param {string} question 用户原问题（R-053 rerank 用；黑机 WS 通道不传，为空时跳过 rerank 走初排）
 */
export async function runTopicSearchAgent(task, emit, question) {
  const keywords = task.keywords || ''

  // 命中缓存：直接复用（新消息延迟 10 分钟可见，对群聊问答可接受）
  const cacheKey = keywords.trim().toLowerCase()
  const cached = resultCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < RESULT_CACHE_TTL) {
    emit('topic_search', 'analyzing', `命中检索缓存（10 分钟内同关键词）...`)
    emit('topic_search', 'done', cached.doneContent, cached.doneData)
    return cached.result
  }
  if (cached) resultCache.delete(cacheKey) // 过期清除

  emit('topic_search', 'analyzing', `正在提取搜索关键词...`)

  // 同义词扩展：一次轻量 LLM 调用，显著提升召回率
  const expandedKeywords = await expandSynonyms(keywords)
  emit('topic_search', 'analyzing', `关键词扩展：${keywords} -> ${expandedKeywords}`)

  const rawWords = expandedKeywords.replace(/['";]/g, '').split(/\s+/).filter((k) => k.length >= 2)
  const ftsWords = rawWords.filter((k) => k.length >= 3)

  if (rawWords.length === 0) {
    emit('topic_search', 'done', '未提取到有效关键词')
    return { ok: false, error: '未提取到有效关键词' }
  }

  emit('topic_search', 'searching', `关键词：${rawWords.join('、')}`)

  // Level 1: 分块 FTS5 v2（unicode61 + 预分词，支持 2 字中文词，同时搜 keywords + summary 两列）
  let chunks = []
  if (rawWords.length > 0) {
    // BUG-75 修复：ftsQuery 提到 try 外声明。原 catch 里引用 try 块内的 const ftsQuery，
    // 块级作用域隔离导致 FTS5 出错时 catch 自己抛 ReferenceError，吞掉真实错误（如缺 v2 表）
    const ftsQuery = buildFtsQuery(rawWords)
    try {
      // 方案C：bm25 列权重，keywords（LLM 提炼的主题词，正命中）3 倍于 summary（流水摘要，顺带提及）
      // 方案B：LIMIT 5 -> 20，大召回保证不漏，精排交给后续 rerank
      // bm25() 返回负值（越小越相关），ORDER BY 升序语义不变
      chunks = await prisma.$queryRawUnsafe(
        `SELECT c.id, c.startMsgId, c.endMsgId, c.chunkDate, c.keywords
         FROM message_chunks_fts_v2 f
         JOIN message_chunks c ON f.rowid = c.id
         WHERE f.message_chunks_fts_v2 MATCH ?
         ORDER BY bm25(message_chunks_fts_v2, 3.0, 1.0)
         LIMIT ${RERANK_CANDIDATES}`,
        ftsQuery,
      )
    } catch (err) {
      console.error('[TopicSearch FTS5 Error]', JSON.stringify({ message: err.message, stack: (err.stack || '').slice(0, 500), ftsQuery, rawWords }))
    }
  }

  // Level 2: 分块 LIKE（keywords + summary）
  if (!chunks || chunks.length === 0) {
    try {
      const likeConditions = rawWords
        .map((w) => `(keywords LIKE '%${w.replace(/'/g, "''")}%' OR summary LIKE '%${w.replace(/'/g, "''")}%')`)
        .join(' OR ')
      if (likeConditions) {
        chunks = await prisma.$queryRawUnsafe(
          `SELECT id, startMsgId, endMsgId, chunkDate, keywords
           FROM message_chunks
           WHERE ${likeConditions}
           LIMIT ${RERANK_CANDIDATES}`,
        )
      }
    } catch (err) {
      console.error('[TopicSearch LIKE Error]', JSON.stringify({ message: err.message, rawWords }))
    }
  }

  // ========== R-053 块选取层精排：方案 D 去重 -> 方案 B rerank（Level 1 已用方案 C 列权重初排）==========
  if (chunks && chunks.length > 0) {
    const beforeDedup = chunks.length
    chunks = dedupChunks(chunks)
    if (beforeDedup !== chunks.length) {
      emit('topic_search', 'searching', `候选去重：${beforeDedup} -> ${chunks.length} 块（合并同质块）`)
    }

    if (question && chunks.length > RERANK_TRIGGER) {
      emit('topic_search', 'searching', `LLM 重排 ${chunks.length} 个候选块...`)
      chunks = await rerankChunks(question, chunks)
    } else if (chunks.length > RERANK_KEEP) {
      // 无 question（黑机 WS 通道）或候选不足触发线：走初排前 5，与旧行为一致
      chunks = chunks.slice(0, RERANK_KEEP)
    }
  }

  // 命中分块 -> 块头摘要 + 块内抽样消息（每块预算 MSG_BUDGET_PER_CHUNK，不再全量捞取）
  if (chunks && chunks.length > 0) {
    emit('topic_search', 'searching', `找到 ${chunks.length} 个相关话题块，提取消息中...`)
    let allMessages = [] // 全部命中块的总消息（供 count 统计）
    const formattedBlocks = []
    for (const chunk of chunks) {
      const msgs = await prisma.$queryRawUnsafe(
        `SELECT id, nickname, msgTime, content FROM group_messages WHERE id BETWEEN ? AND ? ORDER BY id ASC`,
        chunk.startMsgId,
        chunk.endMsgId,
      )
      allMessages.push(...msgs)

      // 每块：摘要头（日期/关键词/规模）+ 抽样消息（命中优先+头尾边界）
      const sampled = sampleChunkMessages(msgs, rawWords, MSG_BUDGET_PER_CHUNK)
      const blockLines = sampled.map((m) => {
        const time = new Date(m.msgTime).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
        return `[${resolveName(m.nickname)} ${time}] ${(m.content || '').slice(0, 200)}`
      })
      formattedBlocks.push(
        `【话题块 ${chunk.chunkDate}】关键词：${(chunk.keywords || '').slice(0, 100)}（块内共 ${msgs.length} 条，抽样 ${sampled.length} 条）\n${blockLines.join('\n')}`,
      )
    }

    const safeMessages = JSON.parse(JSON.stringify(allMessages, (k, v) => (typeof v === 'bigint' ? Number(v) : v)))
    const formattedText = formattedBlocks.join('\n\n')
    const sources = safeMessages.slice(0, 5).map((r) => ({
      nickname: resolveName(r.nickname),
      msgTime: r.msgTime,
      content: r.content,
    }))

    emit('topic_search', 'done', `提取了 ${safeMessages.length} 条相关消息（${chunks.length} 个话题块，每块抽样呈现）`, {
      count: safeMessages.length,
      sample: sources.map((s) => ({ nickname: s.nickname, content: (s.content || '').slice(0, 60) })),
    })

    // formattedText：每块摘要+抽样，覆盖全部命中块（替代旧版全量 messages 由 orchestrator slice(0,30) 截断）
    // 写入结果缓存（P1-4）
    const doneContent = `提取了 ${safeMessages.length} 条相关消息（${chunks.length} 个话题块，每块抽样呈现，缓存 10 分钟）`
    const doneData = {
      count: safeMessages.length,
      sample: sources.map((s) => ({ nickname: s.nickname, content: (s.content || '').slice(0, 60) })),
    }
    if (resultCache.size >= RESULT_CACHE_MAX) {
      const firstKey = resultCache.keys().next().value
      resultCache.delete(firstKey)
    }
    resultCache.set(cacheKey, {
      result: { ok: true, keywords: rawWords.join(' '), messages: safeMessages, formattedText, sources },
      doneContent,
      doneData,
      ts: Date.now(),
    })
    return { ok: true, keywords: rawWords.join(' '), messages: safeMessages, formattedText, sources }
  }

  // Level 3: 原始消息 FTS5
  emit('topic_search', 'searching', '未命中话题块，尝试直接检索原始消息...')
  let results = []

  if (ftsWords.length > 0) {
    // BUG-75：同 Level 1，ftsQuery 提到 try 外防 catch 自身 ReferenceError
    const ftsQuery = buildFtsQuery(rawWords)
    try {
      results = await prisma.$queryRawUnsafe(
        `SELECT m.id, m.nickname, m.msgTime, m.content
         FROM group_messages_fts_v2 f
         JOIN group_messages m ON f.rowid = m.id
         WHERE f.content MATCH ?
         ORDER BY rank
         LIMIT 50`,
        ftsQuery,
      )
    } catch (err) {
      console.error('[TopicSearch FTS5 Error]', JSON.stringify({ message: err.message, stack: (err.stack || '').slice(0, 500), ftsQuery, rawWords }))
    }
  }

  // Level 4: 原始消息 LIKE
  if (!results || results.length === 0) {
    try {
      const likeConditions = rawWords.map((w) => `content LIKE '%${w.replace(/'/g, "''")}%'`).join(' OR ')
      if (likeConditions) {
        results = await prisma.$queryRawUnsafe(
          `SELECT id, nickname, msgTime, content FROM group_messages WHERE ${likeConditions} ORDER BY msgTime ASC LIMIT 50`,
        )
      }
    } catch (err) {
      console.error('[TopicSearch LIKE Error]', JSON.stringify({ message: err.message, rawWords }))
    }
  }

  if (!results || results.length === 0) {
    emit('topic_search', 'done', '未找到相关消息')
    return { ok: false, error: '未找到相关消息' }
  }

  const safeResults = JSON.parse(JSON.stringify(results, (k, v) => (typeof v === 'bigint' ? Number(v) : v)))
  const sources = safeResults.slice(0, 5).map((r) => ({
    nickname: resolveName(r.nickname),
    msgTime: r.msgTime,
    content: r.content,
  }))

  emit('topic_search', 'done', `找到 ${safeResults.length} 条相关消息`, {
    count: safeResults.length,
    sample: sources.map((s) => ({ nickname: s.nickname, content: (s.content || '').slice(0, 60) })),
  })

  return { ok: true, keywords: rawWords.join(' '), messages: safeResults, sources }
}
