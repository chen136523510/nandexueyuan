/**
 * 德塔（NDO）Colyseus 游戏服务器入口
 */
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { Server } from 'colyseus'
import { WorldRoom } from './rooms/WorldRoom.js'

// 加载 server/.env（复用 Express 的 JWT_SECRET）
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '../../server/.env') })

const PORT = parseInt(process.env.COLYSEUS_PORT || '2567')

const gameServer = new Server()

gameServer.define('world', WorldRoom)

gameServer.listen(PORT).then(() => {
  console.log(`[德塔] Colyseus 启动 -> ws://localhost:${PORT}`)
  console.log(`[德塔] JWT_SECRET: ${process.env.JWT_SECRET ? '已加载' : '使用默认值'}`)
}).catch((err) => {
  console.error('[德塔] 启动失败:', err.message)
  process.exit(1)
})