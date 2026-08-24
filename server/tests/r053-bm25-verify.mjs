/**
 * R-053 bm25 列权重真调验证（node:sqlite 内存库 + 真实 tokenizer）
 * 复刻生产环境：unicode61 + tokenizeZh 预分词 + buildFtsQuery 查询
 */

import { DatabaseSync } from 'node:sqlite'
import { tokenizeZh, buildFtsQuery } from '../src/utils/tokenizer.js'

const db = new DatabaseSync(':memory:')
console.log('SQLite 版本:', db.prepare('SELECT sqlite_version() AS v').get().v)

// 生产实际建表语句（scripts/rebuildFtsV2.js）
db.exec(`CREATE VIRTUAL TABLE message_chunks_fts_v2 USING fts5(keywords, summary, tokenize='unicode61')`)
db.exec(`CREATE TABLE message_chunks (id INTEGER PRIMARY KEY, chunkDate TEXT)`)

// 测试数据：块1 正命中 / 块2 顺带提及 / 块3 双命中 / 块4 无关
// 插入时用 tokenizeZh 预分词（与生产一致）
const rows = [
  { id: 1, kw: '考研 复试 分数线', su: '大家讨论期末考试安排' },
  { id: 2, kw: '期末 复习 图书馆', su: '有人提到考研的报名流程' },
  { id: 3, kw: '考研 保研 上岸', su: '聊考研择校和复习计划' },
  { id: 4, kw: '打球 篮球 比赛', su: '周末约球' },
]
const insFts = db.prepare('INSERT INTO message_chunks_fts_v2 (rowid, keywords, summary) VALUES (?, ?, ?)')
const insC = db.prepare('INSERT INTO message_chunks (id, chunkDate) VALUES (?, ?)')
for (const r of rows) {
  insFts.run(r.id, tokenizeZh(r.kw), tokenizeZh(r.su))
  insC.run(r.id, '2026-03-27')
}
console.log('预分词后：')
for (const r of rows) console.log(`  块${r.id} kw="${tokenizeZh(r.kw)}" su="${tokenizeZh(r.su)}"`)

console.log('\n=== 1. buildFtsQuery 产物 ===')
const ftsQuery = buildFtsQuery(['考研'])
console.log('查询"考研" -> FTS5 MATCH:', ftsQuery)

console.log('\n=== 2. bm25 三参语法 + 命中 ===')
try {
  const q = db.prepare(
    `SELECT rowid, bm25(message_chunks_fts_v2, 3.0, 1.0) AS score
     FROM message_chunks_fts_v2 WHERE message_chunks_fts_v2 MATCH ?
     ORDER BY score LIMIT 20`,
  )
  const results = q.all(ftsQuery)
  console.log('✅ trigram + bm25 可用，命中', results.length, '行:')
  for (const r of results) console.log(`   rowid=${r.rowid} score=${r.score}`)
} catch (e) {
  console.error('❌ bm25 失败:', e.message)
  process.exit(1)
}

console.log('\n=== 3. 权重生效验证（keywords 3x vs summary 1x）===')
// 期望（加权后）：
// 块3（keywords+summary 双命中）最前
// 块1（keywords 正命中）次之
// 块2（仅 summary 顺带提及）最后
const weighted = db.prepare(
  `SELECT rowid, bm25(message_chunks_fts_v2, 3.0, 1.0) AS score
   FROM message_chunks_fts_v2 WHERE message_chunks_fts_v2 MATCH ?
   ORDER BY score`,
).all(ftsQuery)
const order = weighted.map((r) => r.rowid)
console.log('加权排序（3.0, 1.0）:', order.join(' -> '))

// 对比：默认 rank（等权重）
const defaultRank = db.prepare(
  `SELECT rowid, rank FROM message_chunks_fts_v2 WHERE message_chunks_fts_v2 MATCH ? ORDER BY rank`,
).all(ftsQuery)
console.log('默认 rank 排序:', defaultRank.map((r) => `rowid=${r.rowid}(${r.rank.toFixed(4)})`).join(' -> '))
console.log('加权 bm25 排序:', weighted.map((r) => `rowid=${r.rowid}(${r.score.toFixed(4)})`).join(' -> '))

if (order[0] === 3) {
  console.log('✅ 块3(双命中) 排第一，权重生效')
} else {
  console.log('❌ 块3 未排第一')
}
// 检查块1 是否在块2 之前（keywords 正命中应优先于 summary 顺带提及）
const pos1 = order.indexOf(1)
const pos2 = order.indexOf(2)
if (pos1 >= 0 && pos2 >= 0 && pos1 < pos2) {
  console.log('✅ 块1(keywords正命中) 排在 块2(summary顺带) 之前，列权重生效')
} else if (pos1 >= 0 && pos2 >= 0) {
  console.log(`⚠️ 块1(pos=${pos1}) vs 块2(pos=${pos2}) 顺序需人工确认`)
}

console.log('\n=== 4. JOIN 形态（生产完整 SQL）===')
try {
  const joined = db.prepare(
    `SELECT c.id, c.chunkDate
     FROM message_chunks_fts_v2 f JOIN message_chunks c ON f.rowid = c.id
     WHERE f.message_chunks_fts_v2 MATCH ?
     ORDER BY bm25(message_chunks_fts_v2, 3.0, 1.0) LIMIT 20`,
  ).all(ftsQuery)
  console.log('✅ 生产 JOIN 可用，命中 id:', joined.map((r) => r.id).join(', '))
} catch (e) {
  console.error('❌ JOIN 失败:', e.message)
  process.exit(1)
}

console.log('\n=== 5. LIMIT 20 召回上限 ===')
// 插入 25 个块看是否只取 20
db.exec('DELETE FROM message_chunks_fts_v2')
db.exec('DELETE FROM message_chunks')
for (let i = 1; i <= 25; i++) {
  insFts.run(i, tokenizeZh(`考研 话题${i}`), tokenizeZh(`讨论考研相关内容${i}`))
  insC.run(i, '2026-03-27')
}
const limited = db.prepare(
  `SELECT c.id FROM message_chunks_fts_v2 f JOIN message_chunks c ON f.rowid = c.id
   WHERE f.message_chunks_fts_v2 MATCH ? ORDER BY bm25(message_chunks_fts_v2, 3.0, 1.0) LIMIT 20`,
).all(buildFtsQuery(['考研']))
console.log('25 块中召回:', limited.length, '个（期望 20）', limited.length === 20 ? '✅' : '❌')

console.log('\n========== bm25 真调验证完成 ==========')
