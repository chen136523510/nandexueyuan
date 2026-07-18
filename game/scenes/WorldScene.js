import * as Phaser from 'phaser'
import { TILE_SIZE } from '../config.js'
import { PLAYER_SPEED, JUMP_VELOCITY, GRAVITY, INTERACT_DISTANCE } from '../../shared/constants.js'
import { Player } from '../objects/Player.js'
import { InputSystem } from '../systems/InputSystem.js'
import { NetworkSystem } from '../systems/NetworkSystem.js'
import { NPCS, ITEMS } from '../../shared/npcs.js'
import { PORTAL_POSITION } from '../mapData.js'
import * as events from '../events.js'

/**
 * WorldScene - 主世界场景
 * 三层塔楼：底层大厅 / 中层房间 / 高层哨位
 */
export class WorldScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WorldScene' })
  }

  create() {
    // 固定世界尺寸（不随浏览器变化）
    const W = 3200
    const H = 700
    this.groundY = H - 64  // 636，固定值

    this.cameras.main.setBackgroundColor('#87CEEB')
    // 固定世界边界 + 摄像机边界
    this.physics.world.setBounds(0, 0, W, H)
    this.cameras.main.setBounds(0, 0, W, H)

    // === 世界常量 ===
    const groundH = 64
    const groundY = this.groundY
    const towerX = 200
    const towerW = 20
    const towerWpx = towerW * TILE_SIZE
    const floorH = 6

    // === 云朵装饰（固定位置） ===
    const cloudPositions = [
      { x: 80, y: 40, scale: 1.2 },
      { x: 450, y: 80, scale: 1.5 },
      { x: 900, y: 30, scale: 1.0 },
      { x: 1400, y: 60, scale: 1.3 },
      { x: 2000, y: 45, scale: 1.1 },
      { x: 2700, y: 90, scale: 1.4 },
    ]
    this.clouds = []
    for (const c of cloudPositions) {
      const cloud = this.add.image(c.x, c.y, 'tile_cloud').setAlpha(0.7).setScale(c.scale)
      this.clouds.push(cloud)
    }

    // === 地面 ===
    this.ground = this.physics.add.staticGroup()
    for (let x = 0; x < 3200; x += TILE_SIZE) {
      this.ground.create(x + 16, groundY + 16, 'tile_grass')
      this.ground.create(x + 16, groundY + 48, 'tile_dirt')
    }

    // === 德塔三层塔楼 ===
    this.buildTower(this.ground, towerX, groundY, towerW, floorH)

    // === 外部树木（固定位置） ===
    const treePositions = [
      { x: 40 }, { x: 90 }, { x: 150 },           // 塔楼左侧
      { x: towerWpx + 280 }, { x: towerWpx + 350 }, { x: towerWpx + 420 }, // 塔楼右侧
    ]
    for (const t of treePositions) {
      this.add.image(t.x, groundY - 16, 'tile_tree').setDepth(0)
    }

    // === NPC ===
    this.npcs = []
    const npcConfig = NPCS[0] || { id: 'nandetong', name: '男德通', spriteKey: 'npc_nandetong' }
    const npcX = towerX + 160
    // NPC 脚底贴草地表面（groundY），origin(0.5,1) 让 sprite 底边对齐 y
    const npcY = groundY
    const npcSprite = this.add.image(npcX, npcY, npcConfig.spriteKey || 'npc_nandetong').setDepth(5)
    // 2 格高（64×64），裁切透明边后 origin(0.5,1) 让脚底贴地
    npcSprite.setOrigin(0.5, 1)
    npcSprite.setDisplaySize(64, 64)
    // NPC 头顶名称（脚底上方 64+8=72px）
    const npcName = this.add.text(npcX, npcY - 72, npcConfig.name, {
      fontSize: '10px', color: '#FFD700', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(20)
    this.npcs.push({ sprite: npcSprite, config: npcConfig, nameText: npcName })

    // === 物品（公告牌） ===
    this.items = []
    const itemConfig = ITEMS[0] || { id: 'notice_board', name: '群公告', spriteKey: 'item_board' }
    const itemX = towerX + 480
    const itemY = groundY - 16
    const itemSprite = this.add.image(itemX, itemY, itemConfig.spriteKey || 'item_board').setDepth(5)
    const itemName = this.add.text(itemX, itemY - 22, itemConfig.name, {
      fontSize: '10px', color: '#FF5722', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(20)
    this.items.push({ sprite: itemSprite, config: itemConfig, nameText: itemName })

    // === 大门（右墙底层开门） ===
    this.door = this.add.image(towerX + towerWpx - 16, groundY - 48, 'tile_door').setDepth(5)
    const doorName = this.add.text(this.door.x, this.door.y - 40, '大门', {
      fontSize: '10px', color: '#aaa', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(20)
    this.doorNameText = doorName

    // === 传送门（大厅出生点） ===
    const portalX = PORTAL_POSITION.x
    const portalY = groundY - 24  // 传送门贴地，48px 高
    this.portal = this.add.image(portalX, portalY, 'portal').setDepth(5)
    const portalName = this.add.text(portalX, portalY - 32, '传送门', {
      fontSize: '10px', color: '#9b59ff', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(20)
    this.portalNameText = portalName

    // === 玩家 ===
    const nickname = this.registry.get('nickname') || '学员'
    const startX = towerX + 320
    const startY = groundY - 32
    this.player = new Player(this, startX, startY, nickname)
    this.inputSystem = new InputSystem(this)

    // === 碰撞 ===
    this.physics.add.collider(this.player.sprite, this.ground)

    // === 摄像机 ===
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1)
    this.cameras.main.setBounds(0, 0, 3200, H)
    // 初始缩放（让像素世界看得更清楚）
    this.cameras.main.setZoom(1.5)
    this.minZoom = 0.75  // 最远（看到更大范围）
    this.maxZoom = 3.0   // 最近（看到更多细节）

    // 滚轮缩放
    this.input.on('wheel', (pointer, over, deltaX, deltaY) => {
      const cam = this.cameras.main
      const cur = cam.zoom
      // 滚轮向上 deltaY < 0 放大，向下 deltaY > 0 缩小
      let next = cur * (deltaY > 0 ? 0.9 : 1.1)
      // 限制在 min/max 之间
      next = Phaser.Math.Clamp(next, this.minZoom, this.maxZoom)
      // 平滑过渡
      cam.zoomTo(next, 100, 'Linear', true)
    })

    // 窗口大小变化时更新相机
    this.scale.on('resize', (gameSize) => {
      this.cameras.main.setSize(gameSize.width, gameSize.height)
    })

    // === 交互提示 ===
    this.interactPrompt = this.add.text(0, 0, '', {
      fontSize: '12px', color: '#fff', backgroundColor: '#000000aa',
      padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setDepth(100).setVisible(false)

    // === 大门彩蛋气泡 ===
    this.doorBubble = this.add.text(0, 0, '', {
      fontSize: '13px', color: '#fff', backgroundColor: '#333333dd',
      padding: { x: 8, y: 5 }, wordWrap: { width: 250 },
    }).setOrigin(0.5).setDepth(100).setVisible(false)
    this.doorInteractCount = 0
    this.doorBubbleTimer = null

    // === 聊天气泡池 ===
    this.chatBubbles = []
    this.chatBubbleTimer = null

    // === 聊天状态（registry 供 Vue 读取） ===
    this.registry.set('chatOpen', false)

    // === 位置发射节流 ===
    this.lastPosEmit = 0

    // === 网络连接 ===
    const token = this.registry.get('token')
    this.network = new NetworkSystem(this)
    this.network.connect(token, nickname)

    // 场景关闭/销毁时断开网络（Vue 路由切换触发 destroyGame -> game.destroy -> shutdown）
    const cleanup = () => {
      console.log('[WorldScene] 清理网络连接')
      if (this.network) this.network.disconnect()
    }
    this.events.on('shutdown', cleanup)
    this.events.on('destroy', cleanup)

    events.emit('game-ready', {})
  }

  /**
   * 构建底层大厅（外墙 + 顶部封顶）
   * 二三层/梯子/层级标签已移除——等正式楼层切换功能再做
   */
  buildTower(ground, towerX, groundY, towerW, floorH) {
    const towerWpx = towerW * TILE_SIZE
    const floorHpx = floorH * TILE_SIZE

    // 外墙（左右两堵，只建底层高度，不再建三层）
    for (let y = 0; y < floorH; y++) {
      const wy = groundY - 16 - y * TILE_SIZE
      ground.create(towerX + 16, wy, 'tile_stone')              // 左墙
      ground.create(towerX + towerWpx - 16, wy, 'tile_stone')   // 右墙
    }

    // 顶部封顶（只盖底层大厅的天花板）
    const topY = groundY - 16 - floorH * TILE_SIZE
    for (let i = 0; i <= towerW; i++) {
      ground.create(towerX + 16 + i * TILE_SIZE, topY, 'tile_stone')
    }
  }

  update() {
    // 聊天模式不移动
    if (!this.registry.get('chatOpen')) {
      this.player.update(this.inputSystem)
    }
    this.checkInteraction()
    this.checkChatToggle()
    this.inputSystem.update()
    this.emitPosition()
    this.sendNetworkPosition()
    this.updateChatBubble()
  }

  /** Enter 键打开聊天（通过 InputSystem 检测，兼容 Phaser 4） */
  checkChatToggle() {
    if (!this.inputSystem.keyEnter.justDown) return
    if (this.registry.get('chatOpen')) return
    const cooldown = this.registry.get('chatCooldown') || 0
    if (Date.now() - cooldown < 400) return
    this.registry.set('chatOpen', true)
    events.emit('chat-open', {})
  }

  /** 聊天气泡跟随角色 */
  updateChatBubble() {
    if (!this.chatBubble || !this.chatBubble.player) return
    this.chatBubble.container.setPosition(
      this.chatBubble.player.x,
      this.chatBubble.player.y + this.chatBubble.offsetY
    )
  }

  /** 发送本地玩家位置到 Colyseus 服务器 */
  sendNetworkPosition() {
    if (!this.network || !this.player?.sprite) return
    const sprite = this.player.sprite
    const facing = sprite.flipX ? 'left' : 'right'
    const vx = sprite.body.velocity.x
    const vy = sprite.body.velocity.y
    let anim = 'idle'
    if (vy < -50) anim = 'jump'
    else if (Math.abs(vx) > 10) anim = 'walk'
    this.network.sendPosition(sprite.x, sprite.y, facing, anim)
  }

  /** 发射玩家位置给 Vue 小地图（每 100ms 节流） */
  emitPosition() {
    const now = this.time.now
    if (now - this.lastPosEmit < 100) return
    this.lastPosEmit = now
    if (this.player && this.player.sprite) {
      events.emit('player-position', {
        x: this.player.sprite.x,
        y: this.player.sprite.y,
        groundY: this.groundY,  // 传递实际地面 Y
      })
    }
  }

  /** 显示聊天气泡（由 Vue 触发）+ 箭头指向角色 + 跟随 + 渐变消失 */
  showChatBubble(nickname, text) {
    // 清除旧气泡
    this.clearChatBubble()

    const player = this.player.sprite
    const container = this.add.container(player.x, player.y - 44).setDepth(100)

    // 气泡文字
    const bubbleBg = this.add.graphics()
    const textObj = this.add.text(0, -10, text, {
      fontSize: '11px',
      color: '#fff',
      padding: { x: 6, y: 4 },
      wordWrap: { width: 200 },
      align: 'center',
    }).setOrigin(0.5, 1)

    // 气泡背景
    const tw = textObj.width + 12
    const th = textObj.height + 10
    bubbleBg.fillStyle(0x000000, 0.85)
    bubbleBg.fillRoundedRect(-tw / 2, -th - 10, tw, th, 6)
    // 箭头（三角形）
    bubbleBg.fillTriangle(0, 0, -6, -10, 6, -10)

    container.add([bubbleBg, textObj])

    this.chatBubble = {
      container,
      bubbleBg,
      textObj,
      player,
      offsetY: -44,
      alpha: 1,
    }

    // 发送到服务器，广播给其他玩家
    if (this.network) {
      this.network.sendChat(nickname, text)
    }

    // 6s 后开始渐变消失
    this.time.delayedCall(6000, () => {
      if (this.chatBubble) {
        this.tweens.add({
          targets: this.chatBubble.container,
          alpha: 0,
          duration: 2000,
          onComplete: () => this.clearChatBubble(),
        })
      }
    })
  }

  clearChatBubble() {
    if (this.chatBubble) {
      this.chatBubble.container.destroy()
      this.chatBubble = null
    }
  }

  checkInteraction() {
    const px = this.player.sprite.x
    const py = this.player.sprite.y
    let nearest = null
    let nearestDist = INTERACT_DISTANCE

    for (const npc of this.npcs) {
      const dist = Phaser.Math.Distance.Between(px, py, npc.sprite.x, npc.sprite.y)
      if (dist < nearestDist) {
        nearest = { type: 'npc', target: npc, dist }
        nearestDist = dist
      }
    }

    for (const item of this.items) {
      const dist = Phaser.Math.Distance.Between(px, py, item.sprite.x, item.sprite.y)
      if (dist < nearestDist) {
        nearest = { type: 'item', target: item, dist }
        nearestDist = dist
      }
    }

    const doorDist = Phaser.Math.Distance.Between(px, py, this.door.x, this.door.y)
    if (doorDist < INTERACT_DISTANCE) {
      nearest = { type: 'door', target: this.door, dist: doorDist }
    }

    // 传送门检测
    const portalDist = Phaser.Math.Distance.Between(px, py, this.portal.x, this.portal.y)
    if (portalDist < nearestDist) {
      nearest = { type: 'portal', target: this.portal, dist: portalDist }
    }

    if (nearest) {
      const label = nearest.type === 'npc'
        ? `按 E 与${nearest.target.config.name}对话`
        : nearest.type === 'item'
        ? `按 E 查看${nearest.target.config.name}`
        : nearest.type === 'portal'
        ? `按 E 返回男德学院`
        : `按 E 开门`

      this.interactPrompt.setText(label)
      this.interactPrompt.setPosition(nearest.target.x, nearest.target.y - 50)
      this.interactPrompt.setVisible(true)

      if (this.inputSystem.keyE.justDown) {
        this.handleInteract(nearest)
      }
    } else {
      this.interactPrompt.setVisible(false)
    }
  }

  handleInteract(nearest) {
    if (nearest.type === 'npc') {
      const npc = this.npcs.find(n => n.config.id === nearest.target.config.id)
      const greetText = nearest.target.config.greetText || '嘿！'
      this.showNpcBubble(npc, greetText)
      events.emit('npc-interact', { npcId: nearest.target.config.id })
    } else if (nearest.type === 'item') {
      events.emit('item-interact', { itemId: nearest.target.config.id })
    } else if (nearest.type === 'door') {
      this.showDoorBubble()
    } else if (nearest.type === 'portal') {
      events.emit('portal-interact', {})
    }
  }

  showDoorBubble() {
    const texts = [
      '那一天，人类终于回想起了被巨人支配的恐惧……',
      '前面的区域以后再来探索吧……',
    ]
    const text = texts[this.doorInteractCount % texts.length]
    this.doorInteractCount++

    this.doorBubble.setText(text)
    this.doorBubble.setPosition(this.door.x, this.door.y - 80)
    this.doorBubble.setVisible(true)

    if (this.doorBubbleTimer) this.doorBubbleTimer.remove()
    this.doorBubbleTimer = this.time.delayedCall(3000, () => {
      this.doorBubble.setVisible(false)
    })
  }

  /**
   * NPC 头顶打招呼气泡（按 E 触发时显示，5 秒淡隐）
   */
  showNpcBubble(npc, text) {
    if (!npc) return
    // 复用现有气泡或创建新的
    if (!npc.bubble) {
      npc.bubble = this.add.text(0, 0, '', {
        fontSize: '11px',
        color: '#fff',
        backgroundColor: '#000000cc',
        padding: { x: 8, y: 4 },
        borderRadius: 4,
      }).setOrigin(0.5, 1).setDepth(30)
    }
    npc.bubble.setText(text)
    npc.bubble.setPosition(npc.sprite.x, npc.sprite.y - 80)  // NPC 头顶上方
    npc.bubble.setVisible(true)
    npc.bubble.setAlpha(1)

    // 淡隐动画
    if (npc.bubbleTimer) npc.bubbleTimer.remove()
    npc.bubbleTimer = this.time.delayedCall(5000, () => {
      this.tweens.add({
        targets: npc.bubble,
        alpha: 0,
        duration: 500,
        onComplete: () => npc.bubble.setVisible(false)
      })
    })
  }
}