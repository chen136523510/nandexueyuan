import prisma from '../lib/prisma.js'
import { success, fail, ErrorCode } from '../utils/response.js'
import multer from 'multer'
import { parse } from 'csv-parse'

// 文件上传配置：内存存储，限制 50MB
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
})

// 必需字段头
const REQUIRED_FIELDS = ['talker', 'msg_time', 'message']
// 分批写入大小（避免单条 SQL 过长）
const BATCH_SIZE = 500

// POST /api/admin/chat/import — 导入群聊 CSV
export async function importChatCsv(req, res, next) {
  try {
    if (!req.file) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '请上传 CSV 文件', ErrorCode.PARAM_ERROR.httpStatus)
    }

    // 校验文件格式
    const isCsv =
      req.file.mimetype === 'text/csv' ||
      req.file.originalname.toLowerCase().endsWith('.csv')
    if (!isCsv) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '仅支持 CSV 格式文件', ErrorCode.PARAM_ERROR.httpStatus)
    }

    // 解析 CSV（utf-8 解码 + 去除 BOM）
    const csvContent = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, '')
    const records = await new Promise((resolve, reject) => {
      parse(csvContent, { columns: true, skip_empty_lines: true, trim: true }, (err, rows) => {
        if (err) reject(err)
        else resolve(rows)
      })
    })

    if (records.length === 0) {
      return fail(res, ErrorCode.PARAM_ERROR.code, 'CSV 文件为空', ErrorCode.PARAM_ERROR.httpStatus)
    }

    // 校验字段头
    const headers = Object.keys(records[0])
    const missing = REQUIRED_FIELDS.filter((f) => !headers.includes(f))
    if (missing.length > 0) {
      return fail(
        res,
        ErrorCode.PARAM_ERROR.code,
        'CSV 字段不合规，需包含 talker/nickname/msg_time/message/type',
        ErrorCode.PARAM_ERROR.httpStatus,
      )
    }

    // 逐行归一化 + 去重
    const seen = new Set()
    const validRecords = []
    let skipped = 0

    for (const record of records) {
      const talker = record.talker?.trim()
      const content = record.message?.trim()
      const msgTimeStr = record.msg_time?.trim()
      const nickname = record.nickname?.trim() || null
      const type = record.type?.trim() || 'text'

      // 跳过系统消息
      if (type === 'system') {
        skipped++
        continue
      }

      // 字段缺失跳过
      if (!talker || !content || !msgTimeStr) {
        skipped++
        continue
      }

      // 解析时间
      const msgTime = new Date(msgTimeStr)
      if (isNaN(msgTime.getTime())) {
        skipped++
        continue
      }

      // 同批次去重（talker + msgTime + content）
      const key = `${talker}|${msgTime.getTime()}|${content}`
      if (seen.has(key)) {
        skipped++
        continue
      }
      seen.add(key)

      validRecords.push({ talker, nickname, content, msgTime, type })
    }

    if (validRecords.length === 0) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '无有效数据可导入', ErrorCode.PARAM_ERROR.httpStatus)
    }

    // 事务：创建批次 + 分批写入消息
    const batch = await prisma.$transaction(async (tx) => {
      const batch = await tx.importBatch.create({
        data: {
          filename: req.file.originalname,
          importedBy: req.user.id,
          count: validRecords.length,
          skipped,
        },
      })

      for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
        const chunk = validRecords.slice(i, i + BATCH_SIZE)
        await tx.groupMessage.createMany({
          data: chunk.map((r) => ({
            batchId: batch.id,
            talker: r.talker,
            nickname: r.nickname,
            content: r.content,
            msgTime: r.msgTime,
            type: r.type,
          })),
        })
      }

      return batch
    })

    success(
      res,
      { batchId: batch.id, imported: validRecords.length, skipped },
      `导入完成，成功 ${validRecords.length} 条，跳过 ${skipped} 条`,
    )
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/chat/batches — 导入批次列表
export async function listBatches(req, res, next) {
  try {
    const batches = await prisma.importBatch.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, username: true, nickname: true },
        },
      },
    })

    success(res, batches)
  } catch (err) {
    next(err)
  }
}
