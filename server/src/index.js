import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json())

// 联通性测试端点
app.get('/api/hello', (req, res) => {
  res.json({ message: '后端已启动，前后端联通正常！' })
})

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
