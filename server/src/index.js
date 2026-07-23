import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import http from 'http'
import apiRouter from './routes/api.js'
import { errorHandler } from './middleware/errorHandler.js'
import { attachSearchHub, closeSearchHub } from './searchHub.js'

const app = express()
const PORT = process.env.PORT || 3000

// 中间件
app.use(cors())
app.use(express.json())

// 静态文件：男德墙图片
app.use('/uploads', express.static('uploads'))

// 路由
app.use('/api', apiRouter)

// 错误处理（必须最后注册）
app.use(errorHandler)

// HTTP 服务器 + WS Hub 挂载
const server = http.createServer(app)
attachSearchHub(server)

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
  console.log(`SearchHub listening on ws://localhost:${PORT}/search-hub`)
})

// 优雅退出
process.on('SIGTERM', () => {
  closeSearchHub()
  server.close()
})
process.on('SIGINT', () => {
  closeSearchHub()
  server.close()
})
