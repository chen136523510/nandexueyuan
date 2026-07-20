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

  async connect(token, nickname, skinId) {
    const wsUrl = import.meta.env.VITE_COLYSEUS_URL || (() => {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      // 生产环境通过 Nginx /ws 代理，开发环境直连 2567
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return `${proto}//${window.location.hostname}:2567`
      }
      return `${proto}//${window.location.host}/ws`
    })()
    console.log('[NetworkSystem] 连接:', wsUrl, 'skinId:', skinId)

    this.client = new Client(wsUrl)

    try {
      this.room = await this.client.joinOrCreate('world', { token, nickname, skinId: skinId || '1' })
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

    // NPC 回复广播：所有人看到男德通头顶气泡 + Vue 聊天框收到回复
    this.room.onMessage('npc-reply', (data) => {
      // 广播文本加 @提问者： 前缀，让世界频道里能看到 NPC 在回复谁
      const broadcastText = `@${data.nickname}：${data.text}`
      // 推到 Vue 聊天框（NPC 名义）
      emit('chat-received', { nickname: '男德通', text: broadcastText })
      // NPC 头顶气泡（所有玩家都看到）
      const world = this.scene
      const npc = world?.npcs?.find(n => n.config.id === 'nandetong')
      if (npc) {
        world.showNpcBubble(npc, broadcastText)
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

    // 优先使用对应 skinId 的 spritesheet 纹理（已由 PreloadScene 加载并注册 anims）
    const skinId = String(state.skinId || '1')
    const textureKey = `player_set${skinId}`
    const hasRealTexture = this.scene.textures.exists(textureKey)
    const hasAnims = this.scene.anims.exists(`${textureKey}_idle_down`)

    // 兜底：若 spritesheet 未加载，生成 sessionId 专属色块（旧逻辑）
    let finalTextureKey = textureKey
    if (!hasRealTexture) {
      const colors = [0xFF6B6B, 0x4ECDC4, 0xFFD93D, 0xA8E6CF, 0xFF8A65]
      const color = colors[Math.abs(this.hashCode(sessionId)) % colors.length]
      finalTextureKey = `player_${sessionId}`
      const gfx = this.scene.make.graphics({ add: false })
      gfx.fillStyle(color)
      gfx.fillRect(0, 0, 32, 32)
      gfx.generateTexture(finalTextureKey, 32, 32)
      gfx.destroy()
    }

    const sprite = this.scene.add.image(state.x, state.y, finalTextureKey)
    sprite.setDepth(8)

    const nameText = this.scene.add.text(state.x, state.y - 22, state.nickname, {
      fontSize: '10px',
      color: '#fff',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(20)

    this.otherPlayers.set(sessionId, {
      sprite,
      nameText,
      state: { ...state },
      textureKey: finalTextureKey,
      isOwnTexture: !hasRealTexture,  // 标记是否是 sessionId 专属色块（需在 remove 时清理）
      currentAnimKey: null,
    })

    // 初始动画（朝右站立）
    if (hasAnims) {
      const animKey = `${textureKey}_idle_${state.facing || 'right'}`
      if (this.scene.anims.exists(animKey)) {
        sprite.anims.play(animKey, true)
        this.otherPlayers.get(sessionId).currentAnimKey = animKey
      }
    }

    console.log('[NetworkSystem] 创建其他玩家精灵:', state.nickname,
      `skinId=${skinId}`, `texture=${finalTextureKey}`, 'at', state.x, state.y)
  }

  updateOtherPlayer(sessionId, state) {
    const other = this.otherPlayers.get(sessionId)
    if (!other) return

    other.sprite.x = state.x
    other.sprite.y = state.y
    other.nameText.setPosition(state.x, state.y - 22)

    // 消费 facing + anim 字段，切换动画
    const skinId = String(state.skinId || '1')
    const expectedAnim = state.anim === 'walk' ? 'walk' : 'idle'
    const facing = state.facing || 'right'
    const animKey = `player_set${skinId}_${expectedAnim}_${facing}`
    if (animKey !== other.currentAnimKey && this.scene.anims.exists(animKey)) {
      other.sprite.anims.play(animKey, true)
      other.currentAnimKey = animKey
    }

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
    // 仅清理 sessionId 专属动态色块（player_${sessionId}），不删除 player_setN spritesheet
    if (other.isOwnTexture && other.textureKey.startsWith('player_') && !other.textureKey.startsWith('player_set')) {
      this.scene.textures.remove(other.textureKey)
    }
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

  /**
   * 发送 NPC AI 回复广播（玩家问完男德通后，AI 回复全服可见）
   */
  sendNpcReply(nickname, npcId, text) {
    if (!this.connected || !this.room) return
    this.room.send('npc-reply', { nickname, npcId, text })
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