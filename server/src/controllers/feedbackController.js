import prisma from '../lib/prisma.js'
import { success, fail, ErrorCode } from '../utils/response.js'

// ========== GET /api/feedback - 反馈列表 ==========
export async function listFeedback(req, res, next) {
  try {
    const { status, type } = req.query
    const where = {}
    if (status) where.status = status
    if (type) where.type = type

    const feedbacks = await prisma.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, nickname: true, username: true, role: true },
        },
      },
    })

    success(res, feedbacks)
  } catch (err) {
    next(err)
  }
}

// ========== POST /api/feedback - 创建反馈 ==========
export async function createFeedback(req, res, next) {
  try {
    const { type, title, content, source } = req.body

    if (!title || !title.trim()) {
      return fail(res, ErrorCode.VALIDATION_ERROR.code, '标题不能为空', ErrorCode.VALIDATION_ERROR.httpStatus)
    }

    const validTypes = ['bug', 'feature', 'other']
    const feedback = await prisma.feedback.create({
      data: {
        authorId: req.user.id,
        type: validTypes.includes(type) ? type : 'other',
        title: title.trim(),
        content: (content || '').trim(),
        source: source === 'ai' ? 'ai' : 'manual',
      },
      include: {
        author: {
          select: { id: true, nickname: true, username: true, role: true },
        },
      },
    })

    success(res, feedback, '反馈已提交', 201)
  } catch (err) {
    next(err)
  }
}

// ========== DELETE /api/feedback/:id - 删除反馈 ==========
export async function deleteFeedback(req, res, next) {
  try {
    const { id } = req.params
    const feedback = await prisma.feedback.findFirst({
      where: { id: parseInt(id) },
    })

    if (!feedback) {
      return fail(res, ErrorCode.NOT_FOUND.code, '反馈不存在', ErrorCode.NOT_FOUND.httpStatus)
    }

    // 作者本人或管理员可删
    const isOwner = feedback.authorId === req.user.id
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin'
    if (!isOwner && !isAdmin) {
      return fail(res, ErrorCode.FORBIDDEN.code, '无权删除此反馈', ErrorCode.FORBIDDEN.httpStatus)
    }

    await prisma.feedback.delete({ where: { id: feedback.id } })
    success(res, null, '已删除')
  } catch (err) {
    next(err)
  }
}

// ========== PATCH /api/feedback/:id/status - 更新状态（admin only）==========
export async function updateStatus(req, res, next) {
  try {
    const { id } = req.params
    const { status, priority } = req.body

    // 仅管理员可改状态
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin'
    if (!isAdmin) {
      return fail(res, ErrorCode.FORBIDDEN.code, '仅管理员可更新状态', ErrorCode.FORBIDDEN.httpStatus)
    }

    const validStatuses = ['open', 'in_progress', 'resolved']
    const validPriorities = ['low', 'medium', 'high']

    const data = {}
    if (status && validStatuses.includes(status)) data.status = status
    if (priority && validPriorities.includes(priority)) data.priority = priority

    if (Object.keys(data).length === 0) {
      return fail(res, ErrorCode.VALIDATION_ERROR.code, '无有效更新字段', ErrorCode.VALIDATION_ERROR.httpStatus)
    }

    const feedback = await prisma.feedback.update({
      where: { id: parseInt(id) },
      data,
      include: {
        author: {
          select: { id: true, nickname: true, username: true, role: true },
        },
      },
    })

    success(res, feedback, '已更新')
  } catch (err) {
    next(err)
  }
}
