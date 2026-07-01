import prisma from '../lib/prisma.js'
import { hashPassword } from '../utils/password.js'
import { success, fail, ErrorCode } from '../utils/response.js'
import crypto from 'crypto'

// GET /api/admin/users — 成员列表
export async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        nickname: true,
        avatar: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { id: 'asc' },
    })

    success(res, users)
  } catch (err) {
    next(err)
  }
}

// PATCH /api/admin/users/:id/status — 禁用/启用成员
export async function updateUserStatus(req, res, next) {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!['active', 'disabled'].includes(status)) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '状态值无效', ErrorCode.PARAM_ERROR.httpStatus)
    }

    const targetId = parseInt(id)
    const target = await prisma.user.findUnique({ where: { id: targetId } })
    if (!target) {
      return fail(res, ErrorCode.NOT_FOUND.code, '用户不存在', ErrorCode.NOT_FOUND.httpStatus)
    }

    // 不可禁用自己
    if (targetId === req.user.id) {
      return fail(res, ErrorCode.FORBIDDEN.code, '不能禁用自己的账号', ErrorCode.FORBIDDEN.httpStatus)
    }

    // 管理员不可操作 admin/super_admin
    if (req.user.role === 'admin' && target.role !== 'member') {
      return fail(res, ErrorCode.FORBIDDEN.code, '无权操作该用户', ErrorCode.FORBIDDEN.httpStatus)
    }

    await prisma.user.update({
      where: { id: targetId },
      data: { status },
    })

    success(res, null, status === 'disabled' ? '已禁用' : '已启用')
  } catch (err) {
    next(err)
  }
}

// POST /api/admin/users/:id/reset-password — 重置成员密码
export async function resetUserPassword(req, res, next) {
  try {
    const { id } = req.params
    const targetId = parseInt(id)

    const target = await prisma.user.findUnique({ where: { id: targetId } })
    if (!target) {
      return fail(res, ErrorCode.NOT_FOUND.code, '用户不存在', ErrorCode.NOT_FOUND.httpStatus)
    }

    // 管理员不可重置 admin/super_admin
    if (req.user.role === 'admin' && target.role !== 'member') {
      return fail(res, ErrorCode.FORBIDDEN.code, '无权操作该用户', ErrorCode.FORBIDDEN.httpStatus)
    }

    // 生成随机 8 位临时密码
    const tempPassword = crypto.randomBytes(4).toString('hex')

    await prisma.user.update({
      where: { id: targetId },
      data: { passwordHash: hashPassword(tempPassword) },
    })

    success(res, { tempPassword }, '密码已重置')
  } catch (err) {
    next(err)
  }
}

// PATCH /api/admin/users/:id/role — 变更角色（仅院长）
export async function updateUserRole(req, res, next) {
  try {
    const { id } = req.params
    const { role } = req.body

    if (!['admin', 'member'].includes(role)) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '角色值无效', ErrorCode.PARAM_ERROR.httpStatus)
    }

    const targetId = parseInt(id)

    // 不可操作自己
    if (targetId === req.user.id) {
      return fail(res, ErrorCode.FORBIDDEN.code, '不能修改自己的角色', ErrorCode.FORBIDDEN.httpStatus)
    }

    const target = await prisma.user.findUnique({ where: { id: targetId } })
    if (!target) {
      return fail(res, ErrorCode.NOT_FOUND.code, '用户不存在', ErrorCode.NOT_FOUND.httpStatus)
    }

    // 不可降级院长
    if (target.role === 'super_admin') {
      return fail(res, ErrorCode.FORBIDDEN.code, '院长的角色不可变更', ErrorCode.FORBIDDEN.httpStatus)
    }

    await prisma.user.update({
      where: { id: targetId },
      data: { role },
    })

    success(res, null, '角色已更新')
  } catch (err) {
    next(err)
  }
}
