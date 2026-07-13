import 'dotenv/config'
import prisma from '../src/lib/prisma.js'

const [k] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as c FROM message_chunks')
console.log('message_chunks:', Number(k.c), '条')

try {
  const [c] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as c FROM message_chunks_fts')
  console.log('message_chunks_fts:', Number(c.c), '条')
} catch {
  console.log('message_chunks_fts: 不存在（需构建）')
}

const [s] = await prisma.$queryRawUnsafe('SELECT keywords FROM message_chunks LIMIT 1')
console.log('\n示例提示词:')
console.log(s.keywords?.slice(0, 300))

await prisma.$disconnect()
