/**
 * 预处理脚本：分块 + LLM 生成提示词 + FTS5 索引
 *
 * 用法: node scripts/buildChunks.js
 *
 * 特性：
 * - 断点续传：已处理的块跳过
 * - 5 并发
 * - 失败重试 3 次
 * - 实时进度显示
 */
import 'dotenv/config'
import prisma from '../src/lib/prisma.js'
import { chatCompletion } from '../src/utils/llm.js'
import { resolveName } from '../src/utils/knowledge.js'

const CHUNK_SIZE = 100
const CONCURRENCY = 5
const MAX_RETRIES = 3

// 建表
async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "message_chunks" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "startMsgId" INTEGER NOT NULL,
      "endMsgId" INTEGER NOT NULL,
      "chunkDate" TEXT,
      "keywords" TEXT NOT NULL,
      "summary" TEXT,
      "participants" TEXT,
      "msgCount" INTEGER NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "idx_message_chunks_chunkDate" ON "message_chunks"("chunkDate")`)
  console.log('✓ message_chunks 表就绪')
}

// 获取总消息数
async function getTotalMessages() {
  const [row] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM group_messages')
  return Number(row.count)
}

// 获取已处理的进度
async function getProgress() {
  const [row] = await prisma.$queryRawUnsafe('SELECT MAX(endMsgId) as maxId FROM message_chunks')
  return row.maxId ? Number(row.maxId) : 0
}

// 读取一个块的消息
async function getChunk(startId) {
  const messages = await prisma.$queryRawUnsafe(
    `SELECT id, talker, nickname, content, msgTime FROM group_messages WHERE id > ? ORDER BY id ASC LIMIT ?`,
    startId,
    CHUNK_SIZE
  )
  return messages
}

// 调 LLM 生成提示词
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
  ], { temperature: 0, maxTokens: 200 })

  return result.trim()
}

// 全局进度追踪
let completedCount = 0
let failedCount = 0
let totalCount = 0
let startTime = 0

function printProgress() {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
  const percent = totalCount > 0 ? ((completedCount / totalCount) * 100).toFixed(1) : 0
  const avgTime = completedCount > 0 ? (Number(elapsed) / completedCount).toFixed(1) : 0
  const remaining = completedCount > 0 ? Math.round((totalCount - completedCount) * Number(avgTime)) : 0
  const remMin = Math.floor(remaining / 60)
  const remSec = remaining % 60

  process.stdout.write(`\r进度: ${completedCount}/${totalCount} (${percent}%) | 失败: ${failedCount} | 已用: ${elapsed}s | 预计剩余: ${remMin}m${remSec}s   `)
}

// 处理一个块
async function processChunk(startId, chunkIndex) {
  const messages = await getChunk(startId)
  if (messages.length === 0) return

  const endId = messages[messages.length - 1].id
  const chunkDate = new Date(messages[0].msgTime).toISOString().slice(0, 10)

  let retries = 0
  while (retries < MAX_RETRIES) {
    try {
      const keywords = await generateKeywords(messages)

      await prisma.$executeRawUnsafe(
        `INSERT INTO message_chunks (startMsgId, endMsgId, chunkDate, keywords, msgCount) VALUES (?, ?, ?, ?, ?)`,
        startId, endId, chunkDate, keywords, messages.length
      )

      completedCount++
      printProgress()
      return
    } catch (err) {
      retries++
      if (retries >= MAX_RETRIES) {
        failedCount++
        completedCount++
        console.error(`\n块 ${chunkIndex} 失败 (ID ${startId}-${endId}): ${err.message}`)
        printProgress()
        return
      }
      await new Promise(r => setTimeout(r, 2000 * retries))
    }
  }
}

// 并发处理
async function processConcurrent(tasks, concurrency) {
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency)
    await Promise.all(batch.map(t => t()))
  }
}

// 建 FTS5 索引
async function buildFtsIndex() {
  console.log('\n\n创建 FTS5 索引...')
  try {
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS message_chunks_fts')
    await prisma.$executeRawUnsafe(
      `CREATE VIRTUAL TABLE message_chunks_fts USING fts5(keywords, tokenize='trigram')`
    )
    await prisma.$executeRawUnsafe(
      `INSERT INTO message_chunks_fts(rowid, keywords) SELECT id, keywords FROM message_chunks`
    )
    console.log('✓ FTS5 索引就绪')
  } catch (err) {
    console.error('FTS5 创建失败:', err.message)
  }
}

async function main() {
  console.log('=== 群聊消息分块 + 提示词生成 ===\n')

  await ensureTable()

  const total = await getTotalMessages()
  const lastEndId = await getProgress()
  const startFrom = lastEndId
  totalCount = Math.ceil((total - startFrom) / CHUNK_SIZE)

  console.log(`总消息: ${total}`)
  console.log(`已处理到 ID: ${startFrom}`)
  console.log(`待处理: ${totalCount} 块`)
  console.log(`并发: ${CONCURRENCY}`)
  console.log('')

  if (totalCount === 0) {
    console.log('没有待处理的块')
    await buildFtsIndex()
    await prisma.$disconnect()
    return
  }

  // 生成任务
  const tasks = []
  let currentId = startFrom
  let chunkIndex = 1
  while (currentId < total) {
    const startId = currentId
    const idx = chunkIndex
    tasks.push(() => processChunk(startId, idx))
    currentId += CHUNK_SIZE
    chunkIndex++
  }

  startTime = Date.now()
  console.log('开始处理...\n')

  await processConcurrent(tasks, CONCURRENCY)

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
  console.log(`\n\n处理完成！成功: ${completedCount - failedCount}, 失败: ${failedCount}, 耗时: ${elapsed}s`)

  await buildFtsIndex()

  // 验证
  const [countRow] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM message_chunks')
  console.log(`\nmessage_chunks 表: ${Number(countRow.count)} 条记录`)

  await prisma.$disconnect()
}

main().catch(e => {
  console.error('失败:', e)
  process.exit(1)
})
