import { verifyToken } from '../utils/jwt.js'
import { fail, ErrorCode } from '../utils/response.js'
import prisma from '../lib/prisma.js'

// JWT 鉴权中间件
export async function auth(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      return fail(res, ErrorCode.UNAUTHORIZED.code, '未登录', ErrorCode.UNAUTHORIZED.httpStatus)
    }

    const token = header.slice(7)
    let decoded
    try {
      decoded = verifyToken(token)
    } catch {
      return fail(res, ErrorCode.UNAUTHORIZED.code, '登录已过期，请重新登录', ErrorCode.UNAUTHORIZED.httpStatus)
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!user) {
      return fail(res, ErrorCode.UNAUTHORIZED.code, '用户不存在', ErrorCode.UNAUTHORIZED.httpStatus)
    }

    if (user.status === 'disabled') {
      return fail(res, ErrorCode.FORBIDDEN.code, '账号已被禁用', ErrorCode.FORBIDDEN.httpStatus)
    }

    req.user = user
    next()
  } catch (err) {
    next(err)
  }
}

// 角色守卫中间件工厂
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return fail(res, ErrorCode.FORBIDDEN.code, '无权限访问', ErrorCode.FORBIDDEN.httpStatus)
    }
    next()
  }
}
