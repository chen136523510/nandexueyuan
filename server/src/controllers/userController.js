import prisma from '../lib/prisma.js'
import { comparePassword, hashPassword } from '../utils/password.js'
import { success, fail, ErrorCode } from '../utils/response.js'

// PUT /api/user/profile — 修改个人信息
export async function updateProfile(req, res, next) {
  try {
    const { nickname, avatar } = req.body

    const data = {}
    if (nickname !== undefined) {
      if (nickname.length > 20) {
        return fail(res, ErrorCode.PARAM_ERROR.code, '昵称最多 20 个字符', ErrorCode.PARAM_ERROR.httpStatus)
      }
      data.nickname = nickname
    }
    if (avatar !== undefined) {
      data.avatar = avatar
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
    })

    success(res, {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      skinId: user.skinId,
      role: user.role,
    }, '个人信息已更新')
  } catch (err) {
    next(err)
  }
}

// PUT /api/user/skin — 修改玩家形象（1-5）
export async function updateSkin(req, res, next) {
  try {
    const { skinId } = req.body

    // 参数校验
    if (skinId === undefined || skinId === null) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '参数不完整', ErrorCode.PARAM_ERROR.httpStatus)
    }

    const skinStr = String(skinId)
    if (!/^[1-5]$/.test(skinStr)) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '形象 ID 必须是 1-5', ErrorCode.PARAM_ERROR.httpStatus)
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { skinId: skinStr },
    })

    success(res, {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      skinId: user.skinId,
      role: user.role,
    }, '形象已更新')
  } catch (err) {
    next(err)
  }
}

// PUT /api/user/password — 修改密码
export async function updatePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '参数不完整', ErrorCode.PARAM_ERROR.httpStatus)
    }
    if (newPassword.length < 6 || newPassword.length > 32) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '密码需 6-32 个字符', ErrorCode.PARAM_ERROR.httpStatus)
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (!comparePassword(oldPassword, user.passwordHash)) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '原密码错误', ErrorCode.PARAM_ERROR.httpStatus)
    }

    if (oldPassword === newPassword) {
      return fail(res, ErrorCode.PARAM_ERROR.code, '新密码不能与原密码相同', ErrorCode.PARAM_ERROR.httpStatus)
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: hashPassword(newPassword) },
    })

    success(res, null, '密码已修改，请重新登录')
  } catch (err) {
    next(err)
  }
}
