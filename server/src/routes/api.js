import { Router } from 'express'
import { getHello } from '../controllers/helloController.js'

const router = Router()

// 联通性测试
router.get('/hello', getHello)

export default router
