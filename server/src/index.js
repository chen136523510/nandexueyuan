import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import apiRouter from './routes/api.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()
const PORT = process.env.PORT || 3000

// 中间件
app.use(cors())
app.use(express.json())

// 路由
app.use('/api', apiRouter)

// 错误处理（必须最后注册）
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
