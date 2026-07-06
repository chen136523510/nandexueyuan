/**
 * 提取群聊数据中所有不同的群昵称，用于建立 昵称→真名 映射
 *
 * 用法: node scripts/extractNicknames.js
 */
import 'dotenv/config'
import prisma from '../src/lib/prisma.js'

async function main() {
  console.log('提取群聊数据中的所有昵称...\n')

  const result = await prisma.$queryRawUnsafe(`
    SELECT nickname, talker, COUNT(*) as count
    FROM group_messages
    WHERE nickname IS NOT NULL AND nickname != ''
    GROUP BY nickname, talker
    ORDER BY count DESC
  `)

  console.log('昵称列表（按发言数排序）:')
  console.log('─'.repeat(60))
  result.forEach((r) => {
    console.log(`${String(r.nickname).padEnd(20)} | ${String(r.talker).padEnd(25)} | ${Number(r.count)} 条`)
  })

  console.log('\n' + '─'.repeat(60))
  console.log(`共 ${result.length} 个不同的昵称`)

  // 按 talker 分组，看每个人用过几个昵称
  const byTalker = {}
  result.forEach((r) => {
    if (!byTalker[r.talker]) byTalker[r.talker] = []
    byTalker[r.talker].push({ nickname: r.nickname, count: Number(r.count) })
  })

  console.log('\n按 talker 分组（每个人用过的昵称）:')
  console.log('─'.repeat(60))
  for (const [talker, nicks] of Object.entries(byTalker)) {
    console.log(`\n${talker}:`)
    nicks.forEach((n) => {
      console.log(`  ${n.nickname} (${n.count} 条)`)
    })
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('失败:', e)
  process.exit(1)
})
