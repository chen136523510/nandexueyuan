import prisma from '../lib/prisma.js'
import { comparePassword, hashPassword } from '../utils/password.js'
import { success, fail, ErrorCode } from '../utils/response.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

// ===== 头像上传配置（磁盘存储）=====
const avatarDir = path.resolve('uploads/avatars')
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true })
}

export const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, avatarDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
      cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`)
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|webp|gif)$/
    if (allowed.test(path.extname(file.originalname).toLowerCase())) {
      cb(null, true)
    } else {
      cb(new Error('仅支持 jpg/png/webp/gif 格式'))
    }
  },
})

// PUT /api/user/profile - 修改个人信息（multipart/form-data，支持头像文件上传）
export async function updateProfile(req, res, next) {
  try {
    const { nickname } = req.body

    const data = {}
    if (nickname !== undefined) {
      if (nickname.length > 20) {
        return fail(res, ErrorCode.PARAM_ERROR.code, '昵称最多 20 个字符', ErrorCode.PARAM_ERROR.httpStatus)
      }
      data.nickname = nickname
    }
    // 头像文件上传
    if (req.file) {
      // 删除旧头像文件（如果是本地上传的）
      const oldUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { avatar: true } })
      if (oldUser?.avatar?.startsWith('/uploads/avatars/')) {
        const oldPath = path.resolve('.' + oldUser.avatar)
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
      }
      data.avatar = `/uploads/avatars/${req.file.filename}`
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
