/**
 * 重建 FTS5 v2 索引（方案A：unicode61 + 预分词，支持 2 字中文词）
 *
 * 用法: cd server && node scripts/rebuildFtsV2.js
 *
 * 与旧版（trigram）区别：
 * - 旧 message_chunks_fts / group_messages_fts：tokenize='trigram'，2 字词搜不到
 * - 新 message_chunks_fts_v2 / group_messages_fts_v2：tokenize='unicode61'，
 *   列内容预分词（tokenizer.js bigram+整词），2 字词直接 MATCH 命中
 *
 * 旧表保留不删（回退用：把查询侧表名改回旧表即可），确认 v2 线上稳定后下次清理。
 */
import 'dotenv/config'
import prisma from '../src/lib/prisma.js'
import { tokenizeZh } from '../src/utils/tokenizer.js'

const BATCH = 500

console.log('重建 FTS5 v2 索引（unicode61 + 预分词）...')

// ===== 1. message_chunks_fts_v2 =====
await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS message_chunks_fts_v2')
await prisma.$executeRawUnsafe(
  "CREATE VIRTUAL TABLE message_chunks_fts_v2 USING fts5(keywords, summary, tokenize='unicode61')",
)

const [chunkTotal] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as c FROM message_chunks')
const chunkCount = Number(chunkTotal.c)
console.log(`话题块共 ${chunkCount} 条，开始分词重建...`)

let processed = 0
let lastId = 0
while (true) {
  const rows = await prisma.$queryRawUnsafe(
    'SELECT id, keywords, summary FROM message_chunks WHERE id > ? ORDER BY id ASC LIMIT ?',
    lastId, BATCH,
  )
  if (rows.length === 0) break
  const values = rows
    .map((r) => {
      const kw = tokenizeZh(r.keywords).replace(/'/g, "''")
      const sm = tokenizeZh(r.summary || '').replace(/'/g, "''")
      return `(${r.id}, '${kw}', '${sm}')`
    })
    .join(',')
  await prisma.$executeRawUnsafe(
    `INSERT INTO message_chunks_fts_v2(rowid, keywords, summary) VALUES ${values}`,
  )
  lastId = rows[rows.length - 1].id
  processed += rows.length
  if (processed % 5000 === 0 || processed === chunkCount) {
    console.log(`  话题块进度: ${processed}/${chunkCount}`)
  }
}

// ===== 2. group_messages_fts_v2 =====
await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS group_messages_fts_v2')
await prisma.$executeRawUnsafe(
  "CREATE VIRTUAL TABLE group_messages_fts_v2 USING fts5(content, tokenize='unicode61')",
)

const [msgTotal] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as c FROM group_messages')
const msgCount = Number(msgTotal.c)
console.log(`原始消息共 ${msgCount} 条，开始分词重建...`)

processed = 0
lastId = 0
while (true) {
  const rows = await prisma.$queryRawUnsafe(
    'SELECT id, content FROM group_messages WHERE id > ? ORDER BY id ASC LIMIT ?',
    lastId, BATCH,
  )
  if (rows.length === 0) break
  const values = rows
    .map((r) => `(${r.id}, '${tokenizeZh(r.content).replace(/'/g, "''")}')`)
    .join(',')
  await prisma.$executeRawUnsafe(
    `INSERT INTO group_messages_fts_v2(rowid, content) VALUES ${values}`,
  )
  lastId = rows[rows.length - 1].id
  processed += rows.length
  if (processed % 50000 === 0 || processed === msgCount) {
    console.log(`  消息进度: ${processed}/${msgCount}`)
  }
}

// ===== 3. 验证 =====
const [v1] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as c FROM message_chunks_fts_v2')
const [v2] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as c FROM group_messages_fts_v2')
console.log(`\n✓ v2 索引重建完成: chunks=${Number(v1.c)}, messages=${Number(v2.c)}`)

// 2 字词命中验证（有数据时）
try {
  const testWords = ['考研', '打球', '游戏']
  for (const w of testWords) {
    const hits = await prisma.$queryRawUnsafe(
      `SELECT c.id FROM message_chunks_fts_v2 f JOIN message_chunks c ON f.rowid = c.id
       WHERE f.message_chunks_fts_v2 MATCH ? LIMIT 3`,
      w,
    )
    console.log(`  2字词「${w}」命中 ${hits.length} 个话题块 ${hits.length > 0 ? '✓' : '（无数据属正常，线上验证）'}`)
  }
} catch (err) {
  console.log('  验证查询异常:', err.message)
}

await prisma.$disconnect()
