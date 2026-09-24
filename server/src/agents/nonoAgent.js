/**
 * 诺诺大脑（自习室一期，R-058）
 *
 * 架构定位：LLM 大脑驱动 + 三层记忆的最小可运行闭环，为 3D 形态预留动作语义。
 *   感知 = L1 常驻认知（NonoProfile）+ L2 会话上下文（复用 memoryCompress）+ L3 长期记忆检索（本文件）
 *   决策 = LLM 流式生成回复（人设+记忆注入 system prompt）
 *   行动 = 回复内（动作）标记（3D 阶段映射为 VRM 动作库调用）+ 回复后异步记忆固化（mem0 式 ADD-only）
 *
 * 记忆检索：Generative Agents 三因子纯 SQL/JS 版（20 人规模无需向量库）
 *   score = 0.4 * recency(0.995^天数) + 0.3 * (importance/10) + 0.3 * relevance(关键词命中率)
 */

import prisma from '../lib/prisma.js'
import { chatCompletion } from '../utils/llm.js'

// ========== 诺诺人设（一期文字形态；黑机建模定稿后随形象校准）==========

const NONO_PERSONA = `你是「诺诺」，男德学院自习室里常驻的可爱美少女。大家来自习室学习、聊天、发呆，你都在。

【你是谁】
- 名字叫诺诺，正在自习室里度过日常：看书、写字、偶尔发呆打瞌睡
- 安静温柔但不失俏皮，有书卷气，说话简短自然，像邻座的同学
- 你的形象还在准备中（将来会以立体形象出现在自习室），现在先用文字和大家相处

【说话风格】
- 简短：每次回复通常 1-3 句，不超过 80 字
- 温柔自然，用词软一些，可以用「呀」「啦」「嗯」这类语气，但不要每句都用
- 想做动作或表达心情时，用中文圆括号包起来放在话前面或中间，如：（合上书，抬头笑了笑）你来啦。
- 括号动作要具体、生活化（翻书、伸懒腰、托腮、眨眨眼、小声嘀咕……），一次最多一个

【记忆规则（重要）】
- 你拥有跨对话的记忆：下面会注入「你记住的事」，自然地使用它们，像老朋友记得上次聊过什么
- 提到记忆时要自然（「上次你说要考试，准备得怎么样啦？」），不要机械复述「我记得你说过……」
- 记不住的事就说记不清了，不要编造没发生过的对话

【边界】
- 不说「我是 AI」「作为语言模型」这类话
- 不知道的问题坦然说不知道，不编造
- 安静的氛围里话可以更少，允许只回一个（动作）`


/** 构建诺诺 system prompt：人设 + L1 用户认知 + L3 检索命中记忆 */
export function buildNonoSystemPrompt(user, profile, memories) {
  const parts = [NONO_PERSONA]

  const nickname = user.nickname || user.username || '同学'
  parts.push(`【当前对话者】${nickname}（系统告知的真实身份）`)

  if (profile?.summary) {
    parts.push(`【你对 ${nickname} 的了解（长期认知）】\n${profile.summary}`)
  }

  if (memories?.length) {
    const lines = memories.map((m) => `- ${m.content}`)
    parts.push(`【你记住的事（与 ${nickname} 相关或自习室公共记忆，按相关度排序）】\n${lines.join('\n')}`)
  }

  return parts.join('\n\n')
}

// ========== L3 记忆检索（三因子）==========

/** 从文本提取检索关键词：去停用词、取 2 字以上词片（中文简单分片） */
function extractKeywords(text) {
  const STOP = new Set(['的话', '什么', '怎么', '可以', '还是', '这个', '那个', '现在', '今天', '昨天',
    '明天', '觉得', '应该', '可能', '就是', '但是', '然后', '所以', '如果', '因为', '不过', '一下',
    '你好', '谢谢', '请问', '哈哈', '嘿嘿', '哈哈哈'])
  const clean = (text || '').replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
  const tokens = clean.split(/\s+/).filter(Boolean)
  const words = []
  for (const t of tokens) {
    if (/^[a-zA-Z0-9]+$/.test(t)) { if (t.length >= 2) words.push(t.toLowerCase()); continue }
    // 中文：滑窗取 2-3 字词片，命中式检索（无分词器的务实做法）
    for (let n = 3; n >= 2; n--) {
      for (let i = 0; i + n <= t.length; i++) {
        const seg = t.slice(i, i + n)
        if (!STOP.has(seg)) words.push(seg)
      }
    }
  }
  return [...new Set(words)].slice(0, 30)
}

/**
 * 三因子检索长期记忆
 * @param {string} text 用户消息
 * @param {number} userId 当前用户（检索其个人记忆 + 公共记忆）
 * @param {number} limit 取 Top N（默认 5）
 * @returns {Promise<Array>} 命中记忆（含打分），并刷新 lastAccessedAt
 */
export async function searchMemories(text, userId, limit = 5) {
  const keywords = extractKeywords(text)
  if (!keywords.length) return []

  const rows = await prisma.nonoMemory.findMany({
    where: { OR: [{ userId }, { userId: null }] },
    orderBy: { createdAt: 'desc' },
    take: 500, // 20 人社区记忆量级小，全量拉取后内存打分
  })
  if (!rows.length) return []

  const now = Date.now()
  const scored = rows.map((m) => {
    const days = Math.max(0, (now - new Date(m.createdAt).getTime()) / 86400000)
    const recency = Math.pow(0.995, days)
    const importance = m.importance / 10
    const hits = keywords.filter((k) => m.content.includes(k)).length
    const relevance = Math.min(1, hits / 3) // 命中 3 个词片即满档
    const score = 0.4 * recency + 0.3 * importance + 0.3 * relevance
    return { ...m, _score: score, _hits: hits }
  })

  // 相关性为 0 的记忆不注入（纯靠时间/重要度凑数的没意义）
  const hits = scored.filter((m) => m._hits > 0).sort((a, b) => b._score - a._score).slice(0, limit)
  if (hits.length) {
    prisma.nonoMemory.updateMany({
      where: { id: { in: hits.map((h) => h.id) } },
      data: { lastAccessedAt: new Date() },
    }).catch(() => { /* 刷新失败无碍 */ })
  }
  return hits
}

// ========== 记忆固化（回复后异步执行，mem0 式单遍 ADD-only 提取）==========

const CONSOLIDATE_PROMPT = `你是记忆提取器。分析诺诺（AI）与用户的一轮对话，提取值得诺诺长期记住的信息。

输出严格 JSON（不要 markdown 代码块，不要多余文字）：
{"memories":[{"kind":"fact|event|preference","content":"...","importance":1-10}],"profile_update":"..."或null}

规则：
- memories：本轮出现的新信息——用户提到的事实（考研、生日、喜好）、发生的事件（今天赢了比赛）、用户偏好（喜欢被叫外号）。第三人称、诺诺视角、一句话一条（如「他正在准备 12 月的考研」「他生日是 5 月 3 日」）。琐碎寒暄（打招呼、闲扯天气）不提取。没有则空数组
- importance：日常小事 3-5，重要事实/强烈偏好 6-8，重大事件 9-10
- profile_update：仅当本轮产生了对用户画像有意义的新认知时给出——把「已有认知 + 新信息」合并成不超过 300 字的第三人称画像重写；无新增则 null
- 不要提取诺诺自己说的话里的信息，只记用户相关的
- content 必须逐字照抄用户原话中的名字、外号、食物、日期等专有词，禁止同义改写或纠正（用户说「蛋哥」就写「蛋哥」，不要写成别的字）`

/**
 * 记忆固化：分析本轮对话，追加 NonoMemory + 重写 NonoProfile（ADD-only，失败静默不影响主链路）
 * @param {{nickname: string}} user
 * @param {string} userMessage
 * @param {string} nonoAnswer
 */
export async function consolidateMemory(user, userMessage, nonoAnswer) {
  try {
    const userId = user.id
    const profile = await prisma.nonoProfile.findUnique({ where: { userId } })
    const nickname = user.nickname || user.username || '同学'

    const messages = [
      { role: 'system', content: CONSOLIDATE_PROMPT },
      {
        role: 'user',
        content: `用户（${nickname}）说：${userMessage.slice(0, 1000)}\n\n诺诺回复：${nonoAnswer.slice(0, 1000)}\n\n已有认知：${profile?.summary || '（无）'}`,
      },
    ]
    const raw = await chatCompletion(messages, { temperature: 0, thinking: 'disabled' })

    let parsed
    try {
      const m = raw.match(/\{[\s\S]*\}/)
      parsed = m ? JSON.parse(m[0]) : null
    } catch { parsed = null }
    if (!parsed) {
      console.warn('[Nono] 记忆固化输出无法解析（本轮跳过）:', String(raw).slice(0, 300))
      return { saved: 0 }
    }

    // ADD-only：与现有记忆内容高度包含的跳过（简单去重）
    const existing = await prisma.nonoMemory.findMany({
      where: { userId },
      select: { content: true },
    })
    let saved = 0
    for (const mem of (parsed.memories || []).slice(0, 5)) {
      const content = String(mem.content || '').trim()
      if (!content || content.length > 200) continue
      const kind = ['fact', 'event', 'preference'].includes(mem.kind) ? mem.kind : 'fact'
      const importance = Math.min(10, Math.max(1, parseInt(mem.importance) || 5))
      const dup = existing.some((e) => e.content.includes(content) || content.includes(e.content))
      if (dup) continue
      await prisma.nonoMemory.create({ data: { userId, kind, content, importance } })
      saved += 1
    }

    if (parsed.profile_update && typeof parsed.profile_update === 'string' && parsed.profile_update.trim()) {
      await prisma.nonoProfile.upsert({
        where: { userId },
        update: { summary: parsed.profile_update.trim().slice(0, 300) },
        create: { userId, summary: parsed.profile_update.trim().slice(0, 300) },
      })
    }

    if (saved > 0) console.log(`[Nono] 记忆固化：用户 ${userId} 新增 ${saved} 条记忆`)
    return { saved }
  } catch (err) {
    console.error('[Nono] 记忆固化失败（不影响主链路）:', err.message)
    return { saved: 0 }
  }
}
