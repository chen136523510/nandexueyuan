import 'dotenv/config'
import prisma from '../src/lib/prisma.js'

const [r] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as c FROM message_chunks')
const [m] = await prisma.$queryRawUnsafe('SELECT MAX(endMsgId) as m FROM message_chunks')
const total = 5101
const done = Number(r.c)
console.log(`已完成: ${done}/${total} 块 (${(done/total*100).toFixed(1)}%)`)
console.log(`处理到消息ID: ${Number(m.m || 0)}/510059`)
if (done > 0) {
  console.log(`失败块: 需检查日志`)
}
await prisma.$disconnect()
