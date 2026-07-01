import prisma from '../lib/prisma.js'
import { generateInviteCode } from '../utils/inviteCode.js'
import { success } from '../utils/response.js'

// POST /api/invite-codes — 生成邀请码
export async function createInviteCode(req, res, next) {
  try {
    // 生成唯一码（冲突重试）
    let code
    let attempts = 0
    do {
      code = generateInviteCode()
      const exists = await prisma.inviteCode.findUnique({ where: { code } })
      if (!exists) break
      attempts++
    } while (attempts < 10)

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 天后过期

    const inviteCode = await prisma.inviteCode.create({
      data: {
        code,
        createdBy: req.user.id,
        expiresAt,
        status: 'unused',
      },
    })

    success(res, {
      id: inviteCode.id,
      code: inviteCode.code,
      expiresAt: inviteCode.expiresAt,
      status: inviteCode.status,
    }, '邀请码已生成')
  } catch (err) {
    next(err)
  }
}

// GET /api/invite-codes — 邀请码列表
export async function listInviteCodes(req, res, next) {
  try {
    const where = {}
    // 管理员只能看自己生成的
    if (req.user.role === 'admin') {
      where.createdBy = req.user.id
    }

    const codes = await prisma.inviteCode.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { id: true, username: true, nickname: true } },
        user: { select: { id: true, username: true, nickname: true } },
      },
    })

    success(res, codes)
  } catch (err) {
    next(err)
  }
}
