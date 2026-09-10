/**
 * 补跑脚本：重生成 message_chunks 中「空 keywords」与「LLM 失败占位 keywords」的块
 *
 * 用法（必须在 server/ 目录下运行——VOLC_API_KEY 只在 server/.env）：
 *   node scripts/repairChunks.js --dry-run      # 只列出待修块，不调 LLM
 *   node scripts/repairChunks.js --limit 1      # 金丝雀：只跑 1 个块
 *   node scripts/repairChunks.js                # 全量补跑
 *
 * 与 buildChunks.js 的分工：
 * - buildChunks.js 的断点续传是「从尾部向前推进」（getProgress = MAX(endMsgId)），
 *   只能顺序处理新消息，**无法回填中间空洞**（消息已全部分块后它会直接空转退出）
 * - 本脚本按「keywords 为空 / 占位」反向筛选待修块，逐块重生成后 UPDATE，可回填历史空洞
 *
 * 幂等：只处理 keywords IS NULL OR TRIM='' OR LIKE '%无法回答%'，跑完即无待处理块
 *
 * 根因防御（重要）：空 keywords 块的存在说明当年 LLM 是「成功返回了空字符串」入库的
 * （彻底失败的块会被 buildChunks 跳过 INSERT，根本不会存在）。这是纯推理模型思考链吃满
 * 输出预算的典型症状（fullAnalysisAgent 有同款教训）。故本脚本把空返回/占位返回一律判为
 * 失败并重试，绝不把空内容写回库。
 *
 * 跑完必须执行：node scripts/rebuildFtsV2.js （刷新线上检索用的 message_chunks_fts_v2）
 */
import 'dotenv/config'
import prisma from '../src/lib/prisma.js'
import { chatCompletion } from '../src/utils/llm.js'
import { resolveName } from '../src/utils/knowledge.js'

const CONCURRENCY = 5
const MAX_RETRIES = 3

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const limitIdx = args.indexOf('--limit')
const LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 0

let doneCount = 0
let failCount = 0
let total = 0
const failures = []

// 待修块：空 keywords 或 LLM 失败占位
async function findBrokenChunks() {
  return prisma.$queryRawUnsafe(
    `SELECT id, startMsgId, endMsgId, chunkDate, msgCount
     FROM message_chunks
     WHERE keywords IS NULL OR TRIM(keywords) = '' OR keywords LIKE '%无法回答%'
     ORDER BY id ASC`,
  )
}

// 还原该块原始消息：startMsgId 是开区间下界（存的是上一块末尾 id），必须 id > startMsgId AND id <= endMsgId
async function getChunkMessages(chunk) {
  return prisma.$queryRawUnsafe(
    `SELECT id, talker, nickname, content, msgTime FROM group_messages
     WHERE id > ? AND id <= ? ORDER BY id ASC LIMIT ?`,
    chunk.startMsgId,
    chunk.endMsgId,
    chunk.msgCount,
  )
}

// 与 buildChunks.js 完全一致的 prompt，保证补跑块与既有块同构
async function generateKeywords(messages) {
  const context = messages
    .map(m => `[${resolveName(m.nickname)} ${new Date(m.msgTime).toLocaleString('zh-CN')}] ${m.content}`)
    .join('\n')

  const result = await chatCompletion([
    {
      role: 'system',
      content: `你是一个群聊数据分析助手。分析以下群聊消息，提取关键信息。

输出格式（纯文本，每行一个字段）：
话题：<用逗号分隔的话题标签>
人物：<参与讨论的人名，逗号分隔>
关键词：<3-5个关键词，逗号分隔>
情绪：<整体情绪，一个词>
摘要：<一句话总结>`
    },
    { role: 'user', content: `以下是群聊消息（共${messages.length}条）：\n${context}` }
  ], { temperature: 0 })

  const cleaned = (result || '').trim()
  // 空返回 = 思考链吃满输出预算（正是这批空块的成因），必须判失败重试而非写回
  if (!cleaned) throw new Error('LLM 返回空内容（疑似思考链吃满输出预算）')
  // 占位文本 = 模型拒答，同样不该写回
  if (cleaned.includes('无法回答')) throw new Error('LLM 返回占位拒答文本')
  return cleaned
}

async function repairChunk(chunk, index) {
  const messages = await getChunkMessages(chunk)
  if (messages.length === 0) {
    failCount++
    failures.push(`块 ${chunk.id}（消息 ${chunk.startMsgId}~${chunk.endMsgId}）查不到原始消息，跳过`)
    console.error(`[${index}/${total}] ✗ 块 ${chunk.id} 无原始消息`)
    return
  }

  let lastErr = null
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const keywords = await generateKeywords(messages)
      await prisma.$executeRawUnsafe(
        'UPDATE message_chunks SET keywords = ? WHERE id = ?',
        keywords,
        chunk.id,
      )
      doneCount++
      console.log(`[${index}/${total}] ✓ 块 ${chunk.id}（${chunk.chunkDate}, ${messages.length}条）→ keywords ${keywords.length} 字`)
      return
    } catch (err) {
      lastErr = err
      if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 2000 * attempt))
    }
  }

  failCount++
  failures.push(`块 ${chunk.id}（${chunk.chunkDate}, 消息 ${chunk.startMsgId}~${chunk.endMsgId}）: ${lastErr?.message}`)
  console.error(`[${index}/${total}] ✗ 块 ${chunk.id} 失败: ${lastErr?.message}`)
}

// 分批并发：每批 CONCURRENCY 个块
async function runPool(items, worker) {
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map((item, j) => worker(item, i + j + 1)))
  }
}

async function main() {
  console.log('=== 话题块 keywords 补跑 ===')
  console.log(`模型: ${process.env.VOLC_MODEL || '(llm.js 默认)'} | 并发: ${CONCURRENCY} | 重试: ${MAX_RETRIES}`)
  if (LIMIT) console.log(`⚠️ 金丝雀模式：只处理前 ${LIMIT} 块`)
  console.log('')

  let broken = await findBrokenChunks()
  const brokenAll = broken.length
  if (LIMIT) broken = broken.slice(0, LIMIT)
  total = broken.length

  console.log(`待修块: ${brokenAll}${LIMIT ? `（本次只跑 ${total}）` : ''}`)
  if (total === 0) {
    console.log('✓ 无待修块，无需补跑')
    await prisma.$disconnect()
    return
  }

  if (DRY_RUN) {
    console.log('\n--dry-run：待修块明细（id / 日期 / 消息区间）')
    for (const c of broken) {
      console.log(`  块 ${c.id}  ${c.chunkDate}  消息 ${c.startMsgId}~${c.endMsgId}  ${c.msgCount} 条`)
    }
    await prisma.$disconnect()
    return
  }

  const startTime = Date.now()
  await runPool(broken, repairChunk)
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)

  console.log(`\n=== 完成：成功 ${doneCount}，失败 ${failCount}，耗时 ${elapsed}s ===`)
  if (failures.length) {
    console.log('\n失败明细（可重跑本脚本，幂等会自动重试）:')
    for (const f of failures) console.log('  ✗ ' + f)
    process.exitCode = 1
  }

  const [left] = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) c FROM message_chunks WHERE keywords IS NULL OR TRIM(keywords) = '' OR keywords LIKE '%无法回答%'`,
  )
  console.log(`\n剩余待修块: ${Number(left.c)}`)
  console.log('下一步：node scripts/rebuildFtsV2.js （刷新 message_chunks_fts_v2 索引）')

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('补跑异常终止:', e)
  await prisma.$disconnect()
  process.exit(1)
})
