/**
 * 关键词补丁应用：把一处修好的 keywords 同步到另一个库（典型：本地 dev.db → 线上 prod.db）
 *
 * 为什么不用整库覆盖：prod.db 除群聊静态数据外还有运行期数据（users/posts/chat_turns/
 * feedbacks/module_visits/game_saves 等），整库覆盖会抹掉线上产生的数据。本工具只 UPDATE
 * message_chunks.keywords 一个字段，零风险面。
 *
 * 用法（在 server/ 目录下运行）：
 *   node scripts/applyKeywordsPatch.js <patch.json> --dry-run   # 校验，不写库（建议先跑）
 *   node scripts/applyKeywordsPatch.js <patch.json>             # 应用
 *   node scripts/applyKeywordsPatch.js <patch.json> --force     # 允许覆盖已有非空 keywords
 *
 * patch.json 格式：
 *   [{"id":6755,"startMsgId":1636198,"endMsgId":1636298,"keywords":"话题：...\n人物：..."}]
 *
 * 安全校验（逐条）：id 必须存在，且 startMsgId / endMsgId 与库中完全一致（三重校验，防两个库
 * 分块不一致导致改错块）；当前 keywords 非空且与补丁不同时默认跳过，需 --force 才覆盖。
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import prisma from '../src/lib/prisma.js'

const args = process.argv.slice(2)
const fileArg = args.find(a => !a.startsWith('--'))
const DRY_RUN = args.includes('--dry-run')
const FORCE = args.includes('--force')

async function main() {
  if (!fileArg) {
    console.error('用法: node scripts/applyKeywordsPatch.js <patch.json> [--dry-run] [--force]')
    process.exit(1)
  }
  const FILE = path.resolve(process.cwd(), fileArg)
  if (!fs.existsSync(FILE)) {
    console.error('✗ 补丁文件不存在: ' + FILE)
    process.exit(1)
  }

  const patch = JSON.parse(fs.readFileSync(FILE, 'utf8'))
  if (!Array.isArray(patch)) {
    console.error('✗ 补丁格式错误：应为数组')
    process.exit(1)
  }

  console.log('=== keywords 补丁应用 ===')
  console.log('补丁文件: ' + FILE)
  console.log('目标库: ' + (process.env.DATABASE_URL || '(默认)'))
  console.log('补丁条数: ' + patch.length + (DRY_RUN ? '（--dry-run 不写库）' : ''))
  console.log('')

  let skipped = 0
  const errors = []
  const ready = []

  for (const item of patch) {
    if (item == null || item.id == null || !item.keywords) {
      errors.push('补丁项缺 id/keywords: ' + JSON.stringify(item).slice(0, 80))
      continue
    }
    const [row] = await prisma.$queryRawUnsafe(
      'SELECT id, startMsgId, endMsgId, chunkDate, keywords FROM message_chunks WHERE id = ?',
      item.id,
    )
    if (!row) {
      errors.push(`块 ${item.id}: 目标库不存在该 id`)
      continue
    }
    if (Number(row.startMsgId) !== Number(item.startMsgId) || Number(row.endMsgId) !== Number(item.endMsgId)) {
      errors.push(
        `块 ${item.id}: 消息区间不一致（库 ${row.startMsgId}~${row.endMsgId} vs 补丁 ${item.startMsgId}~${item.endMsgId}），拒绝写入`,
      )
      continue
    }
    const cur = (row.keywords || '').trim()
    if (cur === item.keywords || (cur !== '' && !FORCE)) {
      skipped++
      continue
    }
    ready.push(item)
  }

  console.log('')
  if (errors.length) {
    console.log(`✗ 校验失败 ${errors.length} 条：`)
    for (const e of errors.slice(0, 20)) console.log('  ✗ ' + e)
    if (errors.length > 20) console.log(`  ...（其余 ${errors.length - 20} 条略）`)
    console.log('')
    console.log('存在校验失败项，已中止，未写库（区间不一致通常意味着两个库分块不同，禁止强行应用）')
    process.exitCode = 1
    return
  }

  if (DRY_RUN) {
    console.log(`=== --dry-run 校验通过：可写 ${ready.length}，跳过 ${skipped}（已一致/非空），未写库 ===`)
    return
  }

  let applied = 0
  for (const item of ready) {
    await prisma.$executeRawUnsafe(
      'UPDATE message_chunks SET keywords = ? WHERE id = ?',
      item.keywords,
      item.id,
    )
    applied++
  }
  console.log(`=== 已写入 ${applied} 条，跳过 ${skipped} 条 ===`)

  const [left] = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) c FROM message_chunks WHERE keywords IS NULL OR TRIM(keywords) = '' OR keywords LIKE '%无法回答%'`,
  )
  console.log('剩余空/占位块: ' + Number(left.c))
  console.log('下一步：node scripts/rebuildFtsV2.js （刷新 message_chunks_fts_v2 索引，否则改动不进检索）')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('补丁应用异常终止:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
