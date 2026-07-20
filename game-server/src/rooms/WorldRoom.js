import { Room } from 'colyseus'
import { WorldState } from '../schema/WorldState.js'
import { PlayerState } from '../schema/PlayerState.js'
import { verifyToken } from '../lib/auth.js'

/**
 * 世界房间
 */
export class WorldRoom extends Room {
  constructor() {
    super()
    this.maxClients = 100
  }

  onCreate(options) {
    console.log('[WorldRoom] 房间创建')
    this.setState(new WorldState())

    this.onMessage('move', (client, data) => {
      const player = this.state.players.get(client.sessionId)
      if (!player) return
      player.x = data.x
      player.y = data.y
      player.facing = data.facing
      player.anim = data.anim
    })

    this.onMessage('chat', (client, data) => {
      this.broadcast('chat', {
        sessionId: client.sessionId,
        nickname: data.nickname,
        text: data.text,
      })
    })

    // NPC AI 回复广播（玩家在德塔里问男德通，AI 回复全服可见）
    this.onMessage('npc-reply', (client, data) => {
      this.broadcast('npc-reply', {
        sessionId: client.sessionId,
        nickname: data.nickname,    // 提问者昵称
        npcId: data.npcId,          // NPC id（如 nandetong_game）
        text: data.text,            // NPC 的完整回复文本
      })
    })
  }

  onJoin(client, options) {
    const payload = verifyToken(options.token)
    if (!payload) {
      throw new Error('身份验证失败，请重新登录')
    }

    // 优先用客户端传来的昵称（来自 auth store），JWT 中不包含 nickname
    const nickname = options.nickname || payload.nickname || payload.username || '学员'
    // 玩家形象 ID（1-5），由客户端 auth store 传入，默认 '1'
    const skinId = options.skinId || '1'
    console.log(`[WorldRoom] ${nickname} 加入 (session: ${client.sessionId}, skinId: ${skinId})`)
    console.log(`[WorldRoom] 当前房间总人数: ${this.clients.length}`)

    const player = new PlayerState({ nickname, skinId, x: 520, y: 600 })
    console.log(`[WorldRoom] 创建玩家: ${player.nickname}, x=${player.x}, y=${player.y}, skinId=${player.skinId}`)
    this.state.players.set(client.sessionId, player)
    console.log(`[WorldRoom] state.players.size = ${this.state.players.size}`)

    this.broadcast('player-joined', { sessionId: client.sessionId, nickname })
  }

  onLeave(client, consented) {
    const player = this.state.players.get(client.sessionId)
    const nickname = player?.nickname || '未知'
    console.log(`[WorldRoom] ${nickname} 离开`)
    this.state.players.delete(client.sessionId)
    this.broadcast('player-left', { sessionId: client.sessionId, nickname })
  }

  onDispose() {
    console.log('[WorldRoom] 房间销毁')
  }
}