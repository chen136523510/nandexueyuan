import prisma from '../lib/prisma.js'
import { success, fail, ErrorCode } from '../utils/response.js'

// GET /api/announcement — 获取公告（公开）
export async function getAnnouncement(req, res, next) {
  try {
    let ann = await prisma.announcement.findUnique({ where: { id: 1 } })
    if (!ann) {
      ann = await prisma.announcement.create({ data: { id: 1, content: '欢迎来到男德学院' } })
    }
    success(res, { content: ann.content, updatedAt: ann.updatedAt })
  } catch (err) {
    next(err)
  }
}

// PUT /api/announcement — 修改公告（admin+）
export async function updateAnnouncement(req, res, next) {
  try {
    const { content } = req.body
    if (!content || !content.trim()) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '公告内容不能为空', ErrorCode.PARAM_ERROR.httpStatus)
    }

    const ann = await prisma.announcement.upsert({
      where: { id: 1 },
      update: { content: content.trim() },
      create: { id: 1, content: content.trim() },
    })

    success(res, { content: ann.content, updatedAt: ann.updatedAt }, '公告已更新')
  } catch (err) {
    next(err)
  }
}
