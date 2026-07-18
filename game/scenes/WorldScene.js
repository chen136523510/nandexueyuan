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
  /**
   * 构建三层塔楼：底层会客厅 / 中层房间区 / 顶层哨位
   * 每层 6 格高（floorH），层间用梯子连接（带梯子口）
   */
  buildTower(ground, towerX, groundY, towerW, floorH) {
    const TS = TILE_SIZE
    const towerWpx = towerW * TS
    const floorHpx = floorH * TS
    const ladderX = towerX + 8 * TS  // 梯子在塔楼中间偏左（第 8 格）

    // === 塔内背景：石墙平铺（替换原天空背景）===
    const towerBgHeight = 3 * floorHpx + 32
    this.add.tileSprite(
      towerX + towerWpx / 2,        // 中心 X
      groundY - towerBgHeight / 2,  // 中心 Y（从地面往上 towerBgHeight）
      towerWpx - 32,                // 宽度（塔内，减去墙厚）
      towerBgHeight,                // 高度
      'wall_dark_1'                 // 深色石墙纹理
    ).setDepth(-1)  // 在所有元素后面

    // 梯子碰撞体组（透明 zone，玩家 overlap 时触发爬梯）
    this.ladders = this.physics.add.staticGroup()

    // ===== 三层外墙 + 楼层地板 =====
    for (let floor = 0; floor < 3; floor++) {
      const floorTopY = groundY - 16 - floor * floorHpx  // 该层顶部 Y
      const floorBottomY = groundY - 16 - (floor + 1) * floorHpx  // 该层底部（上层地板）Y

      // 选择该层的墙体色调
      let wallKey
      if (floor === 0) wallKey = 'wall_dark_1'       // 底层深蓝灰
      else if (floor === 1) wallKey = 'wall_brown_1' // 中层棕砖
      else wallKey = 'wall_light_1'                  // 顶层浅灰

      // 左右外墙（每层 6 格高）
      for (let y = 0; y < floorH; y++) {
        const wy = floorTopY - y * TS
        ground.create(towerX + 16, wy, wallKey)
        ground.create(towerX + towerWpx - 16, wy, wallKey)
      }

      // 楼层地板（除底层地面外，中层/顶层需要地板）
      // 底层地面已有 grass+dirt，跳过
      if (floor > 0) {
        for (let i = 1; i < towerW; i++) {
          // 梯子口位置（ladderX 对应的格子）缺一格地板
          if (i === 8) continue  // 梯子口
          ground.create(towerX + 16 + i * TS, floorTopY, 'floor_wood_1')
        }
      }

      // 装饰该层
      this.decorateFloor(floor, towerX, groundY, floorHpx, TS, towerWpx, wallKey)
    }

    // ===== 顶部封顶 =====
    const topY = groundY - 16 - 3 * floorHpx
    for (let i = 0; i <= towerW; i++) {
      ground.create(towerX + 16 + i * TS, topY, 'wall_light_1')
    }

    // ===== 梯子（每层一个，连接上下层）=====
    // 底层->中层、中层->顶层，各一个梯子（6 格高）
    for (let floor = 0; floor < 2; floor++) {
      const ladderTopY = groundY - 16 - floor * floorHpx  // 该层地面
      const ladderBottomY = ladderTopY - floorHpx          // 上层地面
      // 视觉：楼梯瓦片（6 个，从下到上）
      for (let i = 0; i < floorH; i++) {
        const sy = ladderTopY - i * TS
        this.add.image(ladderX, sy, 'stair_up').setDepth(2)
      }
      // 梯子碰撞体（透明 zone，1 格宽，6 格高）
      const ladderZone = this.add.rectangle(ladderX, ladderTopY - floorHpx / 2 + TS / 2, TS * 0.6, floorHpx, 0x000000, 0)
      this.physics.add.existing(ladderZone, true)  // static
      this.ladders.add(ladderZone)
    }

    // 注册梯子 overlap 检测（玩家进入梯子区域时切换爬梯状态）
    this.physics.add.overlap(this.player.sprite, this.ladders, (playerSprite, ladder) => {
      // 在 update 里通过 this.nearLadder 标记，不在这里直接改状态
      this.nearLadder = ladder
    })
  }

  /**
   * 装饰每层楼（家具、火把、门等）
   */
  decorateFloor(floor, towerX, groundY, floorHpx, TS, towerWpx, wallKey) {
    const floorTopY = groundY - 16 - floor * floorHpx  // 该层地面

    if (floor === 0) {
      // ===== 底层会客厅 =====
      // 火把 ×4（墙上）
      for (let i = 2; i < towerWpx / TS; i += 4) {
        this.add.image(towerX + 16 + i * TS, floorTopY - 2 * TS, 'torch_wall').setDepth(3)
      }
      // 柜台（左墙边）
      this.add.image(towerX + 3 * TS, floorTopY - TS / 2, 'counter').setDepth(3)
      // 桌椅（中央偏右）
      this.add.image(towerX + 10 * TS, floorTopY - TS / 2, 'table_tl').setDepth(3)
      this.add.image(towerX + 11 * TS, floorTopY - TS / 2, 'table_tr').setDepth(3)
      this.add.image(towerX + 10 * TS, floorTopY - TS / 2 + TS, 'table_bl').setDepth(3)
      // 木桶装饰（右墙边）
      this.add.image(towerX + (towerWpx / TS - 2) * TS, floorTopY - TS / 2, 'barrel').setDepth(3)
      // 告示牌挂右墙
      this.add.image(towerX + towerWpx - 16, floorTopY - 3 * TS, 'item_board').setDepth(3)
    } else if (floor === 1) {
      // ===== 中层房间区 =====
      // 火把 ×4
      for (let i = 2; i < towerWpx / TS; i += 4) {
        this.add.image(towerX + 16 + i * TS, floorTopY - 2 * TS, 'torch_wall').setDepth(3)
      }
      // 左房间：床 + 宝箱
      this.add.image(towerX + 3 * TS, floorTopY - TS / 2, 'bed_head').setDepth(3)
      this.add.image(towerX + 4 * TS, floorTopY - TS / 2, 'bed_foot').setDepth(3)
      this.add.image(towerX + 2 * TS, floorTopY - TS / 2, 'chest_closed').setDepth(3)
      // 右房间：书架 + 宝箱
      this.add.image(towerX + (towerWpx / TS - 4) * TS, floorTopY - TS / 2, 'shelf_1').setDepth(3)
      this.add.image(towerX + (towerWpx / TS - 3) * TS, floorTopY - TS / 2, 'shelf_2').setDepth(3)
      this.add.image(towerX + (towerWpx / TS - 5) * TS, floorTopY - TS / 2, 'chest_open').setDepth(3)
      // 门（隔断左右房间，物理障碍，阶段 5 处理交互）
      this.createDoor(ground, towerX + 6 * TS, floorTopY - TS / 2)
      this.createDoor(ground, towerX + 12 * TS, floorTopY - TS / 2)
    } else {
      // ===== 顶层哨位 =====
      // 窗户 ×4（四面墙位置）
      this.add.image(towerX + 16, floorTopY - 3 * TS, 'window').setDepth(3)
      this.add.image(towerX + towerWpx - 16, floorTopY - 3 * TS, 'window').setDepth(3)
      this.add.image(towerX + 10 * TS, floorTopY - 5 * TS, 'window').setDepth(3)
      this.add.image(towerX + 4 * TS, floorTopY - 5 * TS, 'window').setDepth(3)
      // 发光宝箱（中央，奖励宝物）
      this.add.image(towerX + (towerWpx / TS / 2) * TS, floorTopY - TS / 2, 'chest_open').setDepth(3)
      // 骷髅装饰（氛围）
      this.add.image(towerX + 3 * TS, floorTopY - TS / 2, 'skull').setDepth(3)
      this.add.image(towerX + (towerWpx / TS - 2) * TS, floorTopY - TS / 2, 'skull').setDepth(3)
    }
  }

  /**
   * 创建门（物理障碍，可交互开关）
   * 门初始加入 ground staticGroup（挡路），按 E 后 body.enable=false 可通行
   */
  createDoor(ground, x, y) {
    if (!this.doors) this.doors = []
    // 门用 3 段拼接视觉（左中右）
    const doorSprite = this.add.image(x, y, 'door_mid').setDepth(4)
    // 加入 ground 作为碰撞体
    const doorBody = ground.create(x, y, 'door_mid')
    this.doors.push({
      sprite: doorSprite,
      body: doorBody,
      isOpen: false,
      x, y,
    })
  }

  /**
   * 更新梯子状态：
   * - 玩家在梯子区域 + 按 ↑ -> 进入爬梯
   * - 玩家不在梯子区域 + 正在爬梯 -> 退出爬梯
   * - 爬梯中走到梯子顶端地面 -> 自动退出
   */
  updateLadderState() {
    if (!this.ladders) return

    const playerSprite = this.player.sprite
    const isNear = this.nearLadder != null

    if (isNear && this.inputSystem.up.isDown && !this.player.isClimbing) {
      // 进入爬梯
      this.player.setClimbing(true)
    }

    // 退出爬梯：玩家不在梯子区域了
    if (this.player.isClimbing && !isNear) {
      this.player.setClimbing(false)
    }

    // 爬梯中着地（到达上层地板）-> 自动退出
    if (this.player.isClimbing) {
      const body = playerSprite.body
      if (body.blocked.down || body.touching.down) {
        this.player.setClimbing(false)
      }
    }

    // 重置 nearLadder（每帧由 overlap 回调设置）
    this.nearLadder = null
  }

  update() {
    // 聊天模式不移动
    if (!this.registry.get('chatOpen')) {
      this.player.update(this.inputSystem)
      this.updateLadderState()
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

    // 新增：中层房间门检测（物理障碍门）
    if (this.doors) {
      for (const door of this.doors) {
        const dist = Phaser.Math.Distance.Between(px, py, door.x, door.y)
        if (dist < INTERACT_DISTANCE && dist < nearestDist) {
          nearest = { type: 'roomDoor', target: door, dist }
          nearestDist = dist
        }
      }
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
        : nearest.type === 'roomDoor'
        ? (nearest.target.isOpen ? '按 E 关门' : '按 E 开门')
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
    } else if (nearest.type === 'roomDoor') {
      // 新增：房间门物理开关
      this.toggleRoomDoor(nearest.target)
    } else if (nearest.type === 'portal') {
      events.emit('portal-interact', {})
    }
  }

  /**
   * 切换房间门状态（物理障碍门）
   * 关 -> body.enable=false（可通行）+ 换打开贴图
   * 开 -> body.enable=true（挡路）+ 换关闭贴图
   */
  toggleRoomDoor(door) {
    if (door.isOpen) {
      // 关门
      door.body.body.enable = true
      door.sprite.setTexture('door_mid')
      door.isOpen = false
      console.log('[Door] 关门', door.x)
    } else {
      // 开门
      door.body.body.enable = false
      door.sprite.setTexture('chest_open')  // 临时用打开宝箱当开门视觉（无专用开门贴图）
      door.isOpen = true
      console.log('[Door] 开门', door.x)
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