/**
 * 人工填写回写脚本：把「审核块人工处理.md」填写区的内容写回 message_chunks
 *
 * 用法（必须在 server/ 目录下运行）：
 *   node scripts/applyManualChunks.js --dry-run     # 只校验，不写库（建议先跑）
 *   node scripts/applyManualChunks.js               # 校验通过后写库
 *   node scripts/applyManualChunks.js --file <路径>  # 指定其它文档（默认 .ai/repair/审核块人工处理.md）
 *
 * 文档填写格式（每块末尾）：
 *   ### 填写区（块 12345）
 *   >>>BEGIN
 *   话题：...
 *   人物：...
 *   关键词：...
 *   情绪：...
 *   摘要：...
 *   <<<END
 *
 * 校验规则：五行齐全、非空、不是模板占位符（<...>）；关键词 1-8 个。
 * 写库后必须执行：node scripts/rebuildFtsV2.js（刷新检索索引），否则改动不进检索。
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import prisma from '../src/lib/prisma.js'

const FIELDS = ['话题', '人物', '关键词', '情绪', '摘要']
const BEGIN = '>>>BEGIN'
const END = '<<<END'

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const fileIdx = args.indexOf('--file')
const FILE = fileIdx >= 0
  ? path.resolve(process.cwd(), args[fileIdx + 1])
  : path.resolve(process.cwd(), '../.ai/repair/审核块人工处理.md')

function isPlaceholder(v) {
  return /^<.*>$/.test(v.trim())
}

function parseDoc(text) {
  const lines = text.split(/\r?\n/)
  const entries = []
  let cur = null // { id, fields: {} }
  let inFill = false

  for (const line of lines) {
    const m = line.match(/^###\s*填写区（块\s*(\d+)）/)
    if (m) {
      if (cur) entries.push(cur)
      cur = { id: Number(m[1]), fields: {} }
      inFill = false
      continue
    }
    if (!cur) continue

    if (line.trim() === BEGIN) { inFill = true; continue }
    if (line.trim() === END) { inFill = false; continue }
    if (!inFill) continue

    for (const f of FIELDS) {
      const prefix = f + '：'
      if (line.startsWith(prefix)) {
        cur.fields[f] = line.slice(prefix.length).trim()
        break
      }
    }
  }
  if (cur) entries.push(cur)
  return entries
}

function validate(entry) {
  const errs = []
  for (const f of FIELDS) {
    const v = entry.fields[f]
    if (v === undefined) errs.push(`缺字段「${f}」`)
    else if (v === '') errs.push(`字段「${f}」为空`)
    else if (isPlaceholder(v)) errs.push(`字段「${f}」仍是模板占位符未填`)
  }
  const kw = entry.fields['关键词']
  if (kw && !isPlaceholder(kw)) {
    const n = kw.split(/[,，]/).map(s => s.trim()).filter(Boolean).length
    if (n === 0) errs.push('关键词解析为空')
    else if (n > 8) errs.push(`关键词 ${n} 个偏多（建议 3-5 个）`)
  }
  return errs
}

function buildKeywords(fields) {
  return FIELDS.map(f => f + '：' + fields[f]).join('\n')
}

async function main() {
  console.log('=== 人工 keywords 回写 ===')
  console.log('文档: ' + FILE)
  if (!fs.existsSync(FILE)) {
    console.error('✗ 文档不存在')
    process.exit(1)
  }

  const entries = parseDoc(fs.readFileSync(FILE, 'utf8'))
  console.log(`解析到 ${entries.length} 个填写区` + (DRY_RUN ? '（--dry-run 不写库）' : ''))
  console.log('')

  let ok = 0
  let bad = 0
  const ready = []

  for (const e of entries) {
    const errs = validate(e)
    if (errs.length) {
      bad++
      console.log(`✗ 块 ${e.id}: ${errs.join('；')}`)
      continue
    }
    const [row] = await prisma.$queryRawUnsafe(
      'SELECT id, chunkDate, keywords FROM message_chunks WHERE id = ?', e.id,
    )
    if (!row) {
      bad++
      console.log(`✗ 块 ${e.id}: 库中不存在该块`)
      continue
    }
    const cur = (row.keywords || '').trim()
    const wasBroken = cur === '' || cur.includes('无法回答')
    if (!wasBroken) {
      console.log(`⚠️ 块 ${e.id}: 当前 keywords 非空，本次将覆盖（原 ${cur.length} 字 → 新 ${buildKeywords(e.fields).length} 字）`)
    }
    const kwCount = e.fields['关键词'].split(/[,，]/).map(s => s.trim()).filter(Boolean).length
    console.log(`✓ 块 ${e.id}（${row.chunkDate}）: 关键词 ${kwCount} 个${wasBroken ? '' : ' [覆盖]'}`)
    ok++
    ready.push(e)
  }

  console.log('')
  if (ready.length === 0) {
    console.log(`=== 无可写块（不可写 ${bad}）===`)
    console.log('请补齐上述字段后重跑（未写库）')
    await prisma.$disconnect()
    process.exitCode = 1
    return
  }
  if (bad > 0) {
    console.log(`⚠️ 有 ${bad} 块未填完整，本次跳过（已填的 ${ok} 块照常写入）`)
  }

  if (DRY_RUN) {
    console.log(`=== --dry-run 校验通过 ${ok}/${entries.length}，未写库 ===`)
    console.log('确认无误后去掉 --dry-run 重跑即可写库')
    await prisma.$disconnect()
    return
  }

  for (const e of ready) {
    await prisma.$executeRawUnsafe(
      'UPDATE message_chunks SET keywords = ? WHERE id = ?',
      buildKeywords(e.fields), e.id,
    )
  }
  console.log(`=== 已写入 ${ready.length} 个块${bad > 0 ? `，跳过 ${bad} 个未填完整` : ''} ===`)
  if (bad > 0) process.exitCode = 1

  const [left] = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) c FROM message_chunks WHERE keywords IS NULL OR TRIM(keywords) = '' OR keywords LIKE '%无法回答%'`,
  )
  console.log(`剩余待修块: ${Number(left.c)}`)
  console.log('下一步：node scripts/rebuildFtsV2.js （刷新 message_chunks_fts_v2 索引，否则改动不进检索）')

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('回写异常终止:', e)
  await prisma.$disconnect()
  process.exit(1)
})
