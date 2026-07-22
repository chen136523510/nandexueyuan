import { Router } from 'express'
import { getHello } from '../controllers/helloController.js'
import { register, login, logout, me } from '../controllers/authController.js'
import { updateProfile, updateSkin, updatePassword } from '../controllers/userController.js'
import { createInviteCode, listInviteCodes } from '../controllers/inviteCodeController.js'
import { listUsers, updateUserStatus, resetUserPassword, updateUserRole } from '../controllers/adminController.js'
import { getAnnouncement, getVersions, createVersion, updateVersion, deleteVersion } from '../controllers/announcementController.js'
import { importChatCsv, listBatches, upload } from '../controllers/chatImportController.js'
import { askChat, talkNpc, listSessions, getSession, deleteSession } from '../controllers/chatController.js'
import { auth, requireRole } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rateLimit.js'

const router = Router()

// 联通性测试
router.get('/hello', getHello)

// 公告栏 + 版本管理
router.get('/announcement', getAnnouncement)
router.get('/announcement/versions', getVersions)
router.post('/announcement/versions', auth, requireRole('admin', 'super_admin'), createVersion)
router.put('/announcement/versions/:id', auth, requireRole('admin', 'super_admin'), updateVersion)
router.delete('/announcement/versions/:id', auth, requireRole('admin', 'super_admin'), deleteVersion)

// 认证相关
router.post('/auth/register', register)
router.post('/auth/login', login)
router.post('/auth/logout', auth, logout)
router.get('/auth/me', auth, me)

// 用户相关（需登录）
router.put('/user/profile', auth, updateProfile)
router.put('/user/skin', auth, updateSkin)
router.put('/user/password', auth, updatePassword)

// 邀请码管理（admin+）
router.post('/invite-codes', auth, requireRole('admin', 'super_admin'), createInviteCode)
router.get('/invite-codes', auth, requireRole('admin', 'super_admin'), listInviteCodes)

// 成员管理
router.get('/admin/users', auth, requireRole('admin', 'super_admin'), listUsers)
router.patch('/admin/users/:id/status', auth, requireRole('admin', 'super_admin'), updateUserStatus)
router.post('/admin/users/:id/reset-password', auth, requireRole('admin', 'super_admin'), resetUserPassword)
router.patch('/admin/users/:id/role', auth, requireRole('super_admin'), updateUserRole)

// AI 助手 — 数据导入（admin+）
router.post('/admin/chat/import', auth, requireRole('admin', 'super_admin'), upload.single('file'), importChatCsv)
router.get('/admin/chat/batches', auth, requireRole('admin', 'super_admin'), listBatches)

// AI 助手 — 问答（已登录 + 限流）
router.post('/chat/ask', auth, rateLimit(10), askChat)
router.post('/chat/npc/talk', auth, rateLimit(10), talkNpc)

// AI 助手 — 会话历史（已登录）
router.get('/chat/sessions', auth, listSessions)
router.get('/chat/sessions/:id', auth, getSession)
router.delete('/chat/sessions/:id', auth, deleteSession)

export default router
