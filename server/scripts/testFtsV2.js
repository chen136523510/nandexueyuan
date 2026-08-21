// 一次性验证：插入测试数据 -> 重建 v2 -> 验证 2 字词 FTS5 命中（含旧 trigram 对比）
import 'dotenv/config'
import prisma from '../src/lib/prisma.js'

// 1. 造测试数据（用 import_batches 已有记录避免外键问题）
console.log('=== 1. 插入测试消息/分块 ===')
await prisma.$executeRawUnsafe(`DELETE FROM group_messages WHERE talker = 'test_wxid'`)
await prisma.$executeRawUnsafe(`DELETE FROM message_chunks WHERE startMsgId < 0`)

const [userRow] = await prisma.$queryRawUnsafe('SELECT id FROM users LIMIT 1')
if (!userRow) {
  console.log('✗ users 表为空，无法造外键数据；改用直接创建 FTS 表绕过外键验证（只验证 FTS5 行为）')
}
// 建临时测试 batch（外键指向真实 user）
await prisma.$executeRawUnsafe(
  `INSERT INTO import_batches (filename, importedBy, count, skipped, createdAt) VALUES ('fts_v2_test', ${userRow?.id || 1}, 0, 0, datetime('now'))`
)
const [batchRow] = await prisma.$queryRawUnsafe('SELECT MAX(id) as id FROM import_batches')
const testBatchId = batchRow.id
console.log(`  使用 batchId = ${testBatchId}`)

const testMsgs = [
  ['考研', '我明年准备考研，有人一起复习吗', '2026-03-01'],
  ['打球', '周末打球去不去', '2026-03-02'],
  ['打游戏', '今晚打游戏吗，开黑缺一个', '2026-03-03'],
  ['广州游玩当灯泡', '上次广州游玩当灯泡事件真的笑死', '2026-01-01'],
  ['随便聊', '今天天气不错', '2026-03-04'],
]
for (const [nick, content, date] of testMsgs) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO group_messages (batchId, talker, nickname, content, msgTime, type, createdAt)
     VALUES (?, 'test_wxid', ?, ?, ?, 'text', datetime('now'))`,
    testBatchId, nick, content, new Date(date + 'T12:00:00').getTime(),
  )
}

await prisma.$executeRawUnsafe(`DELETE FROM message_chunks WHERE startMsgId > 2165000`)
const [maxId] = await prisma.$queryRawUnsafe('SELECT MAX(id) as m FROM group_messages')
const [minTestId] = await prisma.$queryRawUnsafe(`SELECT MIN(id) as m FROM group_messages WHERE nickname = '考研' OR content LIKE '%考研%' OR nickname = '打球' OR nickname = '打游戏' OR nickname = '广州游玩当灯泡' OR nickname = '随便聊'`)
await prisma.$executeRawUnsafe(
  `INSERT INTO message_chunks (startMsgId, endMsgId, chunkDate, keywords, summary, participants, msgCount, createdAt)
   VALUES (?, ?, '2026-01-01', '考研 复习, 打球 篮球 周末, 打游戏 开黑, 广州游玩 灯泡 尴尬', '测试块：考研打球开黑广州游玩话题', '测试', 5, datetime('now'))`,
  Number(minTestId.m), Number(maxId.m),
)
console.log('  测试数据已插入: 5 消息 + 1 分块')

// 2. 重建 v2 索引（只重建会包含测试数据）
console.log('=== 2. 重建 v2 索引 ===')
const { tokenizeZh, buildFtsQuery } = await import('../src/utils/tokenizer.js')

await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS message_chunks_fts_v2')
await prisma.$executeRawUnsafe("CREATE VIRTUAL TABLE message_chunks_fts_v2 USING fts5(keywords, summary, tokenize='unicode61')")
const chunks = await prisma.$queryRawUnsafe('SELECT id, keywords, summary FROM message_chunks')
for (const c of chunks) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO message_chunks_fts_v2(rowid, keywords, summary) VALUES (?, ?, ?)`,
    c.id, tokenizeZh(c.keywords), tokenizeZh(c.summary || ''),
  )
}

await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS group_messages_fts_v2')
await prisma.$executeRawUnsafe("CREATE VIRTUAL TABLE group_messages_fts_v2 USING fts5(content, tokenize='unicode61')")
const msgs = await prisma.$queryRawUnsafe('SELECT id, content FROM group_messages')
for (const m of msgs) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO group_messages_fts_v2(rowid, content) VALUES (?, ?)`,
    m.id, tokenizeZh(m.content),
  )
}
console.log(`  v2 索引重建: ${chunks.length} 块 + ${msgs.length} 消息`)

// 3. 验证 2 字词命中
console.log('=== 3. 验证 2 字词 FTS5 命中（旧 trigram 搜不到的场景）===')
let pass = 0, fail = 0
async function testHit(word) {
  const ftsQuery = buildFtsQuery([word])
  const hits = await prisma.$queryRawUnsafe(
    `SELECT c.id, c.keywords FROM message_chunks_fts_v2 f
     JOIN message_chunks c ON f.rowid = c.id
     WHERE f.message_chunks_fts_v2 MATCH ? LIMIT 3`,
    ftsQuery,
  )
  const ok = hits.length > 0
  ok ? pass++ : fail++
  console.log(`${ok ? '✓' : '✗'} 「${word}」(查询串: ${ftsQuery}) 命中 ${hits.length} 块${ok ? ' | ' + (hits[0].keywords || '').slice(0, 30) : ''}`)
}

await testHit('考研')      // 2 字词（旧版 FTS5 搜不到）
await testHit('打球')      // 2 字词
await testHit('开黑')      // 2 字词（只出现在消息内容里）
await testHit('灯泡')      // 2 字词（长词"广州游玩当灯泡"里的子串）
await testHit('广州游玩')  // 4 字词整词
await testHit('篮球')      // 同义词扩展场景（keywords 里有"篮球"）

// 4. 原始消息 FTS5 v2 验证
console.log('=== 4. 原始消息 FTS5 v2 验证 ===')
const msgHits = await prisma.$queryRawUnsafe(
  `SELECT m.content FROM group_messages_fts_v2 f
   JOIN group_messages m ON f.rowid = m.id
   WHERE f.content MATCH ? LIMIT 3`,
  buildFtsQuery(['开黑']),
)
console.log(`${msgHits.length > 0 ? '✓' : '✗'} 消息级「开黑」命中 ${msgHits.length} 条${msgHits.length > 0 ? ' | ' + msgHits[0].content.slice(0, 20) : ''}`)
msgHits.length > 0 ? pass++ : fail++

// 5. 分词器单元行为
console.log('=== 5. 分词器单元行为 ===')
const tk = tokenizeZh('广州游玩当灯泡')
console.log('  tokenizeZh("广州游玩当灯泡") =', tk)
console.log('  tokenizeZh("考研") =', tokenizeZh('考研'))

// 6. 清理测试数据（保持 dev.db 干净）
console.log('=== 6. 清理测试数据 ===')
await prisma.$executeRawUnsafe(`DELETE FROM group_messages WHERE talker = 'test_wxid'`)
await prisma.$executeRawUnsafe(`DELETE FROM message_chunks WHERE startMsgId > 2165000`)
console.log('  已清理')

console.log(`\n结果: ${pass} pass, ${fail} fail`)
await prisma.$disconnect()
process.exit(fail > 0 ? 1 : 0)
