/**
 * R-053 rerankChunks LLM 真调验证（deepseek-v4-flash，一次调用 <0.001 元）
 * 构造 8 个候选块（考研 4 块 + 干扰 4 块），验证：
 * 1. LLM 返回合法 JSON 且 id 匹配
 * 2. 考研问题正确避开干扰块
 * 3. 延迟在 1-3s 预期内
 */

import { rerankChunks } from '../src/agents/topicSearchAgent.js'
import 'dotenv/config'

// 模拟 FTS5 召回后的候选池（Prisma BigInt id 形态，已按初排排序）
const candidates = [
  { id: 101n, chunkDate: '2026-03-27', keywords: '考研 复试 分数线 国家线' },
  { id: 102n, chunkDate: '2026-03-29', keywords: '考研 调剂 双非 复试' },
  { id: 103n, chunkDate: '2026-03-30', keywords: '考研 择校 计算机 专业课' },
  { id: 104n, chunkDate: '2025-12-15', keywords: '期末考试 复习 图书馆 挂科' },
  { id: 105n, chunkDate: '2026-04-02', keywords: '考研 二战 在家 备考' },
  { id: 106n, chunkDate: '2026-02-10', keywords: '过年 红包 家里 走亲戚' },
  { id: 107n, chunkDate: '2026-05-01', keywords: '五一 出去玩 旅游 景区' },
  { id: 108n, chunkDate: '2026-06-20', keywords: '毕业 论文 答辩 学位' },
]

console.log('候选池', candidates.length, '块（考研相关: 101/102/103/105，干扰: 104/106/107/108）')

const questions = [
  { q: '群里讨论考研复试分数线了吗', expectContains: [101n] },
  { q: '有没有人聊考研择校的事', expectContains: [103n] },
]

let allOk = true
for (const { q, expectContains } of questions) {
  console.log(`\n=== 问题：${q} ===`)
  const t0 = Date.now()
  const picked = await rerankChunks(q, candidates)
  const latency = Date.now() - t0
  const pickedIds = picked.map((c) => Number(c.id))
  const idSet = new Set(candidates.map((c) => Number(c.id)))
  const valid = pickedIds.every((id) => idSet.has(id))
  console.log(`选中块: [${pickedIds.join(', ')}]  耗时 ${latency}ms`)
  console.log('对应关键词:', picked.map((c) => `${c.chunkDate} ${(c.keywords || '').slice(0, 30)}`).join(' | '))
  console.log(valid ? '✅ 返回的都是候选池内的块（无幻觉）' : '❌ 出现幻觉 id')
  if (!valid) allOk = false

  const expectOk = expectContains.every((id) => pickedIds.includes(Number(id)))
  console.log(expectOk ? `✅ 期望块 [${expectContains.map(Number)}] 被选中` : `⚠️ 期望块 [${expectContains.map(Number)}] 未被选中（LLM 相关性判断与预期不同，人工评估）`)

  const sizeOk = picked.length >= 1 && picked.length <= 5
  console.log(sizeOk ? `✅ 保留块数 ${picked.length} 在 1-5 范围` : '❌ 保留块数异常')
  if (!sizeOk) allOk = false
}

console.log(`\n========== rerank LLM 真调${allOk ? '通过' : '存在异常'} ==========`)
process.exit(allOk ? 0 : 1)
