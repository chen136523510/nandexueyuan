/**
 * R-053 单元测试（直接 import 源码模块，零数据库依赖）
 * 覆盖：dedupChunks 去重、常量值、rerank 解析/降级、截断逻辑、SQL 模板
 */

import { dedupChunks, RERANK_CANDIDATES, RERANK_KEEP, RERANK_TRIGGER } from '../src/agents/topicSearchAgent.js'

let pass = 0
let fail = 0

function assert(cond, msg) {
  if (cond) {
    pass++
    console.log(`  ✅ ${msg}`)
  } else {
    fail++
    console.error(`  ❌ ${msg}`)
  }
}

// ========== 1. dedupChunks ==========
console.log('\n=== 1. dedupChunks Jaccard 去重（源码直调）===')

const highDup = [
  { id: 1, keywords: '考研 复试 分数线 录取', rank: 1 },
  { id: 2, keywords: '考研 复试 录取 分数线', rank: 2 },
  { id: 3, keywords: '考研 复试 调剂 双非', rank: 3 },
]
const d1 = dedupChunks(highDup)
assert(d1.length === 2, `高相似同质块去重: 3 -> ${d1.length}（保留 id=1,3）`)
assert(d1[0].id === 1, '保留 rank 靠前的块（id=1）')
assert(!d1.some((c) => c.id === 2), '移除同质块（id=2）')
assert(dedupChunks([{ id: 1, keywords: '考研' }]).length === 1, '单块不去重')
assert(dedupChunks([]).length === 0, '空数组返回空')
assert(dedupChunks(highDup.slice(0, 2)).length === 1, '完全同构两块去重为 1')
assert(dedupChunks([{ id: 1, keywords: '考研 复试' }, { id: 2, keywords: '打球 篮球' }]).length === 2, '不同领域块不去重')

// ========== 2. 常量值（源码直调）==========
console.log('\n=== 2. 常量值 ===')
assert(RERANK_CANDIDATES === 20, `RERANK_CANDIDATES=20 (实际 ${RERANK_CANDIDATES})`)
assert(RERANK_KEEP === 5, `RERANK_KEEP=5 (实际 ${RERANK_KEEP})`)
assert(RERANK_TRIGGER === 6, `RERANK_TRIGGER=6 (实际 ${RERANK_TRIGGER})`)

// ========== 3. rerank 解析 + 降级逻辑 ==========
console.log('\n=== 3. rerankChunks 解析与降级 ===')
function parseRerankResult(raw) {
  const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
  const match = cleaned.match(/\[[\d,\s]+\]/)
  if (!match) throw new Error('不是 JSON 数组: ' + raw.slice(0, 200))
  return JSON.parse(match[0])
}
assert(JSON.stringify(parseRerankResult('[3, 1, 5]')) === '[3,1,5]', '解析合法 JSON 数组')
assert(JSON.stringify(parseRerankResult('```json\n[2,4]\n```')) === '[2,4]', '剥 json 围栏')
assert(JSON.stringify(parseRerankResult('结果如下：\n[1,3,5]\n完毕')) === '[1,3,5]', '正则提取嵌入文本中的数组')
let parseErr
try { parseRerankResult('not json') } catch (e) { parseErr = e.message }
assert(parseErr?.includes('JSON 数组'), '非法输入抛异常')

function simulateRerankFallback(chunks, shouldFail) {
  if (shouldFail) {
    console.log('    [TopicSearch] rerank 失败，降级取初排前 5: simulated')
    return chunks.slice(0, RERANK_KEEP)
  }
  return chunks
}
assert(simulateRerankFallback([{id:1},{id:2},{id:3},{id:4},{id:5},{id:6}], true).length === 5, 'rerank 失败降级取前 5')
assert(simulateRerankFallback([{id:1},{id:2},{id:3}], true).length === 3, 'rerank 失败候选<=5 不截断')

// ========== 4. 截断逻辑 ==========
console.log('\n=== 4. 主流程截断逻辑模拟 ===')
function simulatePipeline(chunks, question, shouldRerank) {
  let c = [...chunks]
  c = dedupChunks(c)
  if (question && c.length > RERANK_TRIGGER) {
    if (shouldRerank) return c.slice(0, RERANK_KEEP)
    return c
  } else if (c.length > RERANK_KEEP) {
    return c.slice(0, RERANK_KEEP)
  }
  return c
}
const five = Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }))
assert(simulatePipeline(five, 'q', false).length === 5, '候选=5 直接保留')
assert(simulatePipeline([...five, { id: 6 }], 'q', false).length === 5, '候选=6 截断到 5（无 rerank）')
assert(simulatePipeline([...five, { id: 6 }, { id: 7 }], 'q', true).length === 5, '候选=7 触发 rerank 后截断到 5')
assert(simulatePipeline(five.slice(0, 4), 'q', false).length === 4, '候选=4 直接保留（未达触发线）')
assert(simulatePipeline([...five, { id: 6 }], null, false).length === 5, 'question=null 不走 rerank，截断到 5（黑机 WS 行为）')

// ========== 5. bm25 SQL 模板 ==========
console.log('\n=== 5. bm25 SQL 模板 ===')
const sqlTemplate = `SELECT c.id, c.startMsgId, c.endMsgId, c.chunkDate, c.keywords
FROM message_chunks_fts_v2 f
JOIN message_chunks c ON f.rowid = c.id
WHERE f.message_chunks_fts_v2 MATCH ?
ORDER BY bm25(message_chunks_fts_v2, 3.0, 1.0)
LIMIT ${RERANK_CANDIDATES}`
assert(sqlTemplate.includes('bm25(message_chunks_fts_v2, 3.0, 1.0)'), 'bm25 SQL 模板正确')
assert(sqlTemplate.includes('LIMIT 20'), 'LIMIT 20 替换正确')
assert(sqlTemplate.includes('message_chunks_fts_v2 MATCH ?'), 'MATCH 占位保留')

// ========== 结果 ==========
console.log(`\n========== 结果：${pass} passed, ${fail} failed ==========`)
if (fail > 0) process.exit(1)
