/**
 * 创建 FTS5 全文索引（trigram tokenizer，支持中文）
 *
 * 用法: node scripts/buildFtsIndex.js
 */
import 'dotenv/config'
import prisma from '../src/lib/prisma.js'

async function main() {
  // 1. 检查 SQLite 版本
  const [versionRow] = await prisma.$queryRawUnsafe('SELECT sqlite_version() as v')
  console.log('SQLite 版本:', versionRow.v)

  // 2. 创建 FTS5 虚拟表
  console.log('创建 FTS5 索引(trigram tokenizer)...')
  try {
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS group_messages_fts')
    await prisma.$executeRawUnsafe(
      `CREATE VIRTUAL TABLE group_messages_fts USING fts5(content, tokenize='trigram')`,
    )
    console.log('✓ FTS5 表创建成功')
  } catch (err) {
    console.error('✗ FTS5 创建失败:', err.message)
    console.error('  可能 SQLite 版本不支持 FTS5 或 trigram tokenizer')
    process.exit(1)
  }

  // 3. 填充索引
  console.log('填充索引(51万条)...')
  const start = Date.now()
  await prisma.$executeRawUnsafe(
    `INSERT INTO group_messages_fts(rowid, content) SELECT id, content FROM group_messages`,
  )
  console.log(`✓ 索引填充完成,耗时 ${((Date.now() - start) / 1000).toFixed(1)}s`)

  // 4. 测试检索
  console.log('\n测试检索 "打球":')
  const results = await prisma.$queryRawUnsafe(`
    SELECT m.nickname, m.msgTime, substr(m.content, 1, 50) as preview
    FROM group_messages_fts f
    JOIN group_messages m ON f.rowid = m.id
    WHERE f.content MATCH '打球'
    ORDER BY rank
    LIMIT 5
  `)
  results.forEach((r) => {
    console.log(`  [${r.nickname}] ${r.preview}...`)
  })

  console.log('\nFTS5 索引就绪')
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('失败:', e)
  process.exit(1)
})
