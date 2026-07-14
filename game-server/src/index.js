/**
 * 德塔（NDO）Colyseus 游戏服务器入口
 */
import { Server } from 'colyseus'
import { WorldRoom } from './rooms/WorldRoom.js'

const PORT = parseInt(process.env.COLYSEUS_PORT || '2567')

const gameServer = new Server()

gameServer.define('world', WorldRoom)

gameServer.listen(PORT).then(() => {
  console.log(`[德塔] Colyseus 启动 → ws://localhost:${PORT}`)
}).catch((err) => {
  console.error('[德塔] 启动失败:', err.message)
  process.exit(1)
})