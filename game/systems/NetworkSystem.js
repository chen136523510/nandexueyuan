import { Client } from 'colyseus.js'
import { emit } from '../events.js'

/**
 * NetworkSystem - Colyseus 客户端
 * 使用 onStateChange 追踪玩家进出和位置变化
 */
export class NetworkSystem {
  constructor(scene) {
    this.scene = scene
    this.client = null
    this.room = null
    this.otherPlayers = new Map()
    this.connected = false
    this.stateReady = false
    this.knownPlayers = new Set()  // 已知的 sessionId 集合，用于 diff
    this.lastSend = 0
    this.sendInterval = 50
  }

  async connect(token, nickname) {
    const wsUrl = import.meta.env.VITE_COLYSEUS_URL || (() => {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      // 生产环境通过 Nginx /ws 代理，开发环境直连 2567
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return `${proto}//${window.location.hostname}:2567`
      }
      return `${proto}//${window.location.host}/ws`
    })()
    console.log('[NetworkSystem] 连接:', wsUrl)

    this.client = new Client(wsUrl)

    try {
      this.room = await this.client.joinOrCreate('world', { token, nickname })
      this.connected = true
      console.log('[NetworkSystem] 连接成功, sessionId:', this.room.sessionId, 'roomId:', this.room.roomId)

      this.setupMessageListeners()
      this.waitForState()
    } catch (err) {
      console.error('[NetworkSystem] 连接失败:', err.message)
      this.connected = false
    }
  }

  /**
   * 等待 state 同步后，使用 onStateChange 追踪所有变化
   */
  waitForState() {
    const check = () => {
      if (this.room.state?.players) {
        this.stateReady = true
        console.log('[NetworkSystem] 状态同步完成, 当前玩家数:', this.room.state.players.size)

        // 初始化已知玩家列表
        this.room.state.players.forEach((p, sid) => {
          this.knownPlayers.add(sid)
          if (sid !== this.room.sessionId) {
            this.createOtherPlayer(sid, p)
          }
        })

        // 监听后续状态变化
        this.room.onStateChange((state) => {
          this.onStateUpdated(state)
        })
      } else {
        setTimeout(check, 100)
      }
    }
    check()
  }

  /**
   * 状态更新时 diff 玩家列表
   */
  onStateUpdated(state) {
    const currentPlayers = new Set()
    state.players.forEach((playerState, sessionId) => {
      currentPlayers.add(sessionId)

      if (sessionId === this.room.sessionId) return

      if (!this.knownPlayers.has(sessionId)) {
        // 新玩家加入
        console.log('[NetworkSystem] 新玩家加入:', playerState.nickname, sessionId)
        this.createOtherPlayer(sessionId, playerState)
      } else {
        // 更新已有玩家位置
        this.updateOtherPlayer(sessionId, playerState)
      }
    })

    // 检查离开的玩家
    for (const sid of this.knownPlayers) {
      if (sid === this.room.sessionId) continue
      if (!currentPlayers.has(sid)) {
        console.log('[NetworkSystem] 玩家离开:', sid)
        this.removeOtherPlayer(sid)
      }
    }

    this.knownPlayers = currentPlayers
  }

  setupMessageListeners() {
    this.room.onMessage('chat', (data) => {
      // 广播给 Vue 聊天框（所有人可见）
      emit('chat-received', { nickname: data.nickname, text: data.text })
      // 他人消息显示气泡
      if (data.sessionId !== this.room.sessionId) {
        const other = this.otherPlayers.get(data.sessionId)
        if (other) {
          this.showOtherChatBubble(other, data.text)
        }
      }
    })

    this.room.onMessage('player-joined', (data) => {
      if (data.sessionId === this.room.sessionId) return
      console.log('[NetworkSystem] 广播:玩家加入', data.nickname)
    })

    this.room.onMessage('player-left', (data) => {
      console.log('[NetworkSystem] 广播:玩家离开', data.nickname)
    })
  }

  createOtherPlayer(sessionId, state) {
    if (this.otherPlayers.has(sessionId)) return

    const colors = [0xFF6B6B, 0x4ECDC4, 0xFFD93D, 0xA8E6CF, 0xFF8A65]
    const color = colors[Math.abs(this.hashCode(sessionId)) % colors.length]

    const textureKey = `player_${sessionId}`
    const gfx = this.scene.make.graphics({ add: false })
    gfx.fillStyle(color)
    gfx.fillRect(0, 0, 32, 32)
    gfx.generateTexture(textureKey, 32, 32)
    gfx.destroy()

    const sprite = this.scene.add.image(state.x, state.y, textureKey)
    sprite.setDepth(8)

    const nameText = this.scene.add.text(state.x, state.y - 22, state.nickname, {
      fontSize: '10px',
      color: '#fff',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(20)

    this.otherPlayers.set(sessionId, { sprite, nameText, state: { ...state }, textureKey })
    console.log('[NetworkSystem] 创建其他玩家精灵:', state.nickname, 'at', state.x, state.y)
  }

  updateOtherPlayer(sessionId, state) {
    const other = this.otherPlayers.get(sessionId)
    if (!other) return

    other.sprite.x = state.x
    other.sprite.y = state.y
    other.nameText.setPosition(state.x, state.y - 22)
    other.state = { ...state }

    if (other.bubble) {
      other.bubble.setPosition(state.x, state.y - 44)
    }
  }

  removeOtherPlayer(sessionId) {
    const other = this.otherPlayers.get(sessionId)
    if (!other) return

    other.sprite.destroy()
    other.nameText.destroy()
    if (other.bubble) other.bubble.destroy()
    this.scene.textures.remove(other.textureKey)
    this.otherPlayers.delete(sessionId)
  }

  sendPosition(x, y, facing, anim) {
    if (!this.connected || !this.room) return
    const now = Date.now()
    if (now - this.lastSend < this.sendInterval) return
    this.lastSend = now
    this.room.send('move', { x, y, facing, anim })
  }

  sendChat(nickname, text) {
    if (!this.connected || !this.room) return
    this.room.send('chat', { nickname, text })
  }

  showOtherChatBubble(other, text) {
    if (other.bubbleTimer) other.bubbleTimer.remove()
    if (other.bubble) other.bubble.destroy()

    const sprite = other.sprite
    const container = this.scene.add.container(sprite.x, sprite.y - 44).setDepth(100)

    const bubbleBg = this.scene.add.graphics()
    const textObj = this.scene.add.text(0, -10, text, {
      fontSize: '11px',
      color: '#fff',
      padding: { x: 6, y: 4 },
      wordWrap: { width: 200 },
      align: 'center',
    }).setOrigin(0.5, 1)

    const tw = textObj.width + 12
    const th = textObj.height + 10
    bubbleBg.fillStyle(0x000000, 0.85)
    bubbleBg.fillRoundedRect(-tw / 2, -th - 10, tw, th, 6)
    bubbleBg.fillTriangle(0, 0, -6, -10, 6, -10)

    container.add([bubbleBg, textObj])

    other.bubble = container

    other.bubbleTimer = this.scene.time.delayedCall(6000, () => {
      if (other.bubble) {
        this.scene.tweens.add({
          targets: other.bubble,
          alpha: 0,
          duration: 2000,
          onComplete: () => {
            if (other.bubble) {
              other.bubble.destroy()
              other.bubble = null
            }
          },
        })
      }
    })
  }

  disconnect() {
    if (this.room) {
      this.room.leave()
      this.room = null
    }
    for (const [sessionId] of this.otherPlayers) {
      this.removeOtherPlayer(sessionId)
    }
    this.knownPlayers.clear()
    this.stateReady = false
    this.connected = false
  }

  hashCode(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i)
      hash |= 0
    }
    return hash
  }
}