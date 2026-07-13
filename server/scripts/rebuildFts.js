import 'dotenv/config'
import prisma from '../src/lib/prisma.js'

console.log('重建 FTS5 索引...')

await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS message_chunks_fts')
await prisma.$executeRawUnsafe("CREATE VIRTUAL TABLE message_chunks_fts USING fts5(keywords, tokenize='trigram')")
await prisma.$executeRawUnsafe('INSERT INTO message_chunks_fts(rowid, keywords) SELECT id, keywords FROM message_chunks')

const [r] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as c FROM message_chunks_fts')
console.log('FTS5 索引重建完成:', Number(r.c), '条')

await prisma.$disconnect()
