import prisma from '../lib/prisma.js'
import { hashPassword, comparePassword } from '../utils/password.js'
import { signToken } from '../utils/jwt.js'
import { success, fail, ErrorCode } from '../utils/response.js'

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    avatar: user.avatar,
    role: user.role,
  }
}

// POST /api/auth/register — 邀请码注册
export async function register(req, res, next) {
  try {
    const { username, password, inviteCode } = req.body

    // 参数校验
    if (!username || !password || !inviteCode) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '参数不完整', ErrorCode.PARAM_ERROR.httpStatus)
    }
    if (username.length < 2 || username.length > 20) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '用户名需 2-20 个字符', ErrorCode.PARAM_ERROR.httpStatus)
    }
    if (password.length < 6 || password.length > 32) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '密码需 6-32 个字符', ErrorCode.PARAM_ERROR.httpStatus)
    }

    // 校验邀请码
    const code = await prisma.inviteCode.findUnique({ where: { code: inviteCode } })
    if (!code || code.status !== 'unused' || code.expiresAt < new Date()) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '邀请码无效或已失效', ErrorCode.PARAM_ERROR.httpStatus)
    }

    // 校验用户名唯一
    const exists = await prisma.user.findUnique({ where: { username } })
    if (exists) {
      return fail(res, ErrorCode.CONFLICT.code, '用户名已被占用', ErrorCode.CONFLICT.httpStatus)
    }

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: hashPassword(password),
        role: 'member',
        status: 'active',
      },
    })

    // 标记邀请码已使用
    await prisma.inviteCode.update({
      where: { id: code.id },
      data: { status: 'used', usedBy: user.id },
    })

    // 签发 JWT
    const token = signToken({ userId: user.id, role: user.role })
    success(res, { token, user: publicUser(user) }, '注册成功')
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/login — 用户名登录
export async function login(req, res, next) {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '参数不完整', ErrorCode.PARAM_ERROR.httpStatus)
    }

    const user = await prisma.user.findUnique({ where: { username } })

    // 不区分账号不存在/密码错误，防枚举
    if (!user || !comparePassword(password, user.passwordHash)) {
      return fail(res, ErrorCode.UNAUTHORIZED.code, '用户名或密码错误', ErrorCode.UNAUTHORIZED.httpStatus)
    }

    if (user.status === 'disabled') {
      return fail(res, ErrorCode.FORBIDDEN.code, '账号已被禁用，请联系管理员', ErrorCode.FORBIDDEN.httpStatus)
    }

    const token = signToken({ userId: user.id, role: user.role })
    success(res, { token, user: publicUser(user) }, '登录成功')
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/logout — 登出
export function logout(req, res, next) {
  // JWT 无状态，前端清除 token 即可
  success(res, null, '已登出')
}

// GET /api/auth/me — 获取当前用户信息
export async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!user) {
      return fail(res, ErrorCode.NOT_FOUND.code, '用户不存在', ErrorCode.NOT_FOUND.httpStatus)
    }
    success(res, publicUser(user))
  } catch (err) {
    next(err)
  }
}
