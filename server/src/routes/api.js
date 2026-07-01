import { Router } from 'express'
import { getHello } from '../controllers/helloController.js'
import { register, login, logout, me } from '../controllers/authController.js'
import { updateProfile, updatePassword } from '../controllers/userController.js'
import { createInviteCode, listInviteCodes } from '../controllers/inviteCodeController.js'
import { listUsers, updateUserStatus, resetUserPassword, updateUserRole } from '../controllers/adminController.js'
import { getAnnouncement, updateAnnouncement } from '../controllers/announcementController.js'
import { auth, requireRole } from '../middleware/auth.js'

const router = Router()

// 联通性测试
router.get('/hello', getHello)

// 公告栏
router.get('/announcement', getAnnouncement)
router.put('/announcement', auth, requireRole('admin', 'super_admin'), updateAnnouncement)

// 认证相关
router.post('/auth/register', register)
router.post('/auth/login', login)
router.post('/auth/logout', auth, logout)
router.get('/auth/me', auth, me)

// 用户相关（需登录）
router.put('/user/profile', auth, updateProfile)
router.put('/user/password', auth, updatePassword)

// 邀请码管理（admin+）
router.post('/invite-codes', auth, requireRole('admin', 'super_admin'), createInviteCode)
router.get('/invite-codes', auth, requireRole('admin', 'super_admin'), listInviteCodes)

// 成员管理
router.get('/admin/users', auth, requireRole('admin', 'super_admin'), listUsers)
router.patch('/admin/users/:id/status', auth, requireRole('admin', 'super_admin'), updateUserStatus)
router.post('/admin/users/:id/reset-password', auth, requireRole('admin', 'super_admin'), resetUserPassword)
router.patch('/admin/users/:id/role', auth, requireRole('super_admin'), updateUserRole)

export default router
