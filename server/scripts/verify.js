import prisma from '../src/lib/prisma.js'

const count = await prisma.groupMessage.count()
const top = await prisma.groupMessage.groupBy({
  by: ['nickname'],
  _count: { id: true },
  orderBy: { _count: { id: 'desc' } },
  take: 5,
})
const first = await prisma.groupMessage.findFirst({ orderBy: { msgTime: 'asc' }, select: { msgTime: true } })
const last = await prisma.groupMessage.findFirst({ orderBy: { msgTime: 'desc' }, select: { msgTime: true } })

console.log('总条数:', count)
console.log('时间范围:', first?.msgTime?.toISOString(), '~', last?.msgTime?.toISOString())
console.log('Top 5 活跃成员:')
top.forEach((t) => console.log(`  ${t.nickname}: ${t._count.id} 条`))

await prisma.$disconnect()
