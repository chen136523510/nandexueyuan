import 'dotenv/config'
import prisma from '../src/lib/prisma.js'

console.log('重建 FTS5 索引（keywords + summary 双列）...')

await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS message_chunks_fts')
// summary 纳入索引：之前只有 keywords 被索引，LLM 生成的 summary（一句话摘要）是检索盲区
await prisma.$executeRawUnsafe("CREATE VIRTUAL TABLE message_chunks_fts USING fts5(keywords, summary, tokenize='trigram')")
await prisma.$executeRawUnsafe('INSERT INTO message_chunks_fts(rowid, keywords, summary) SELECT id, keywords, COALESCE(summary, "") FROM message_chunks')

const [r] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as c FROM message_chunks_fts')
console.log('FTS5 索引重建完成:', Number(r.c), '条')

await prisma.$disconnect()
