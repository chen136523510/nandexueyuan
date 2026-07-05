/**
 * 群聊 CSV 流式导入脚本（直接读文件，不走 HTTP）
 *
 * 用法:
 *   node scripts/importChat.js <csv路径> [--clear]
 *
 * 选项:
 *   --clear  导入前清空旧的群聊数据
 *
 * 字段要求:talker, nickname, msg_time, message, type
 */
import 'dotenv/config'
import prisma from '../src/lib/prisma.js'
import { parse } from 'csv-parse'
import fs from 'fs'

const CSV_PATH = process.argv[2]
const CLEAR = process.argv.includes('--clear')
const BATCH_SIZE = 5000

async function main() {
  if (!CSV_PATH) {
    console.error('用法: node scripts/importChat.js <csv路径> [--clear]')
    process.exit(1)
  }

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`文件不存在: ${CSV_PATH}`)
    process.exit(1)
  }

  if (CLEAR) {
    console.log('清空旧数据...')
    await prisma.groupMessage.deleteMany()
    await prisma.importBatch.deleteMany()
    console.log('已清空')
  }

  console.log(`读取: ${CSV_PATH}`)

  // 创建导入批次（importedBy=1，默认院长）
  const batch = await prisma.importBatch.create({
    data: { filename: CSV_PATH, importedBy: 1, count: 0, skipped: 0 },
  })

  // 流式读取 CSV
  const parser = fs.createReadStream(CSV_PATH).pipe(
    parse({ columns: true, skip_empty_lines: true, trim: true }),
  )

  const seen = new Set()
  let skipped = 0
  let total = 0
  const buffer = []

  for await (const record of parser) {
    const talker = record.talker?.trim()
    const content = record.message?.trim()
    const msgTimeStr = record.msg_time?.trim()
    const nickname = record.nickname?.trim() || null
    const type = record.type?.trim() || 'text'

    // 跳过系统消息和空数据
    if (type === 'system' || !talker || !content || !msgTimeStr) {
      skipped++
      continue
    }

    // 解析时间
    const msgTime = new Date(msgTimeStr)
    if (isNaN(msgTime.getTime())) {
      skipped++
      continue
    }

    // 同批次去重
    const key = `${talker}|${msgTime.getTime()}|${content}`
    if (seen.has(key)) {
      skipped++
      continue
    }
    seen.add(key)

    buffer.push({ batchId: batch.id, talker, nickname, content, msgTime, type })
    total++

    // 分批写入
    if (buffer.length >= BATCH_SIZE) {
      await prisma.groupMessage.createMany({ data: buffer })
      buffer.length = 0
      process.stdout.write(`\r已处理 ${total} 条...`)
    }
  }

  // 写入剩余
  if (buffer.length > 0) {
    await prisma.groupMessage.createMany({ data: buffer })
  }

  // 更新批次统计
  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { count: total, skipped },
  })

  console.log(`\n导入完成: ${total} 条,跳过 ${skipped} 条,批次 ID=${batch.id}`)
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('导入失败:', e)
  await prisma.$disconnect()
  process.exit(1)
})
