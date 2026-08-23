import 'dotenv/config'
import prisma from '../src/lib/prisma.js'

console.log('检查/创建 nickname 联合索引 (nickname, msgTime)...')

// 先删可能存在的旧版单列 nickname 索引（同名覆盖，避免冗余）
await prisma.$executeRawUnsafe('DROP INDEX IF EXISTS idx_group_messages_nickname')

// 建联合索引：nickname 等值/IN 查询 + msgTime 排序都能走索引
await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_group_messages_nickname_msgTime ON group_messages(nickname, msgTime)')

const [idx] = await prisma.$queryRawUnsafe(
  "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_group_messages_nickname_msgTime'",
)
if (idx) {
  console.log('✅ 索引 idx_group_messages_nickname_msgTime 已就绪')
} else {
  console.log('❌ 索引创建失败')
}

await prisma.$disconnect()
