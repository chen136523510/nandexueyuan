import * as Phaser from 'phaser'
import { TILE_SIZE } from '../config.js'
import { PLAYER_SPEED, JUMP_VELOCITY, GRAVITY, INTERACT_DISTANCE } from '../../shared/constants.js'
import { getMonsterDef } from '../../shared/monsters.js'
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
    // 爬梯冷却变量（在 create 最开头初始化，避免 buildTower 异常时未定义）
    this.climbEnterCooldown = 0
    this.climbExitCooldown = 0
    this.ladderPositions = []
    this.doors = []
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

    // === 外部树木（固定位置） ===
    const treePositions = [
      { x: 40 }, { x: 90 }, { x: 150 },           // 塔楼左侧
      { x: towerWpx + 280 }, { x: towerWpx + 350 }, { x: towerWpx + 420 }, // 塔楼右侧
    ]
    for (const t of treePositions) {
      this.add.image(t.x, groundY - 16, 'tile_tree').setDepth(0)
    }

    // === 战斗阶段1：森林战斗区装饰（x∈[880,3150]）===
    // 加密树木形成森林感 + 灌木装饰，玩家从大门(x=824)走出即进入森林
    const forestTrees = [
      950, 1080, 1180, 1300, 1420, 1550, 1680, 1800, 1920,
      2050, 2180, 2300, 2420, 2550, 2680, 2800, 2920, 3050,
    ]
    for (const x of forestTrees) {
      // 树木在地面层之上，但深度低于玩家/怪物，避免遮挡战斗
      this.add.image(x, groundY - 16, 'tile_tree').setDepth(0)
    }
    // 灌木/石头装饰（用 tile_dirt 深色块模拟灌木，散点分布）
    const bushPositions = [
      { x: 900, y: groundY - 8 }, { x: 1150, y: groundY - 8 },
      { x: 1400, y: groundY - 8 }, { x: 1700, y: groundY - 8 },
      { x: 2000, y: groundY - 8 }, { x: 2400, y: groundY - 8 },
      { x: 2700, y: groundY - 8 }, { x: 3000, y: groundY - 8 },
    ]
    for (const b of bushPositions) {
      this.add.image(b.x, b.y, 'tile_stone').setDepth(1).setScale(0.6).setAlpha(0.8)
    }

    // === 森林边界：x=3150 处隐形墙（防玩家走出世界）===
    // 用 staticGroup 创建一个不可见的碰撞体
    const forestWall = this.ground.create(3170, groundY - 100, 'tile_stone')
    forestWall.setVisible(false)  // 隐形
    forestWall.setDisplaySize(16, 200)
    // 同样在塔楼左侧加边界（防止玩家走出左侧世界，复用现有世界边界即可，这里不重复）

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
    // 大门（塔楼入口，用 2 格高拱顶门 door_full）
    const doorX = towerX + towerWpx - 16
    const doorY = groundY - 32  // 门高 64，中心在地板上方 32
    this.door = this.add.image(doorX, doorY, 'door_full').setOrigin(0.5, 0.5).setDepth(5)
    this.doorIsOpen = false  // 大门初始关闭
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
    const skinId = this.registry.get('skinId') || '1'
    const startX = towerX + 200   // 400，远离传送门(520)和男德通NPC(360)，出生后需走几步才能交互
    const startY = groundY - 32
    this.player = new Player(this, startX, startY, nickname, skinId)
    this.inputSystem = new InputSystem(this)

    // === 碰撞 ===
    this.physics.add.collider(this.player.sprite, this.ground)

    // === 德塔三层塔楼（必须在 player 创建后调用，因为 buildTower 里注册 overlap 依赖 player）===
    this.buildTower(this.ground, towerX, groundY, towerW, floorH)

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
    this.network.connect(token, nickname, skinId)

    // 场景关闭/销毁时断开网络（Vue 路由切换触发 destroyGame -> game.destroy -> shutdown）
    const cleanup = () => {
      console.log('[WorldScene] 清理网络连接')
      if (this.network) this.network.disconnect()
    }
    this.events.on('shutdown', cleanup)
    this.events.on('destroy', cleanup)

    // === 战斗阶段1：怪物精灵管理 ===
    // monsterSprites: Map<monsterId, { sprite, hpBarBg, hpBarFill, hpText }>
    this.monsterSprites = new Map()

    // === 战斗阶段1：事件监听（NetworkSystem -> WorldScene 渲染）===
    // 注意：存引用以便 shutdown 时 off，避免内存泄漏
    this._battleHandlers = {
      'monster-added': (data) => this.createMonster(data.monsterId, data.state),
      'monster-updated': (data) => this.updateMonster(data.monsterId, data.state),
      'monster-removed': (data) => this.removeMonster(data.monsterId),
      'monster-killed': (data) => this.onMonsterKilled(data),
      'player-hp-change': (data) => this.onSelfHpChange(data),
      'player-revived': (data) => this.onPlayerRevived(data),
      'attack-hit': (data) => this.onAttackHit(data),
    }
    for (const [evt, fn] of Object.entries(this._battleHandlers)) {
      events.on(evt, fn)
    }
    // 场景销毁时移除监听
    this.events.once('shutdown', () => {
      if (this._battleHandlers) {
        for (const [evt, fn] of Object.entries(this._battleHandlers)) {
          events.off(evt, fn)
        }
      }
    })

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
    const ladderX = towerX + 16 + 8 * TS  // 梯子在塔楼中间偏左（第 8 格，对齐梯子口）

    // === 塔内背景：纯色矩形（深蓝黑，无缝衔接）===
    const towerBgHeight = 3 * floorHpx + 32
    const bg = this.add.rectangle(
      towerX + towerWpx / 2,        // 中心 X
      groundY - towerBgHeight / 2,  // 中心 Y
      towerWpx - 32,                // 宽度
      towerBgHeight,                // 高度
      0x1a1f2e                      // 深蓝黑（RGB 26,31,46）
    )
    bg.setDepth(-1)  // 在所有元素后面

    // 梯子碰撞体组（透明 zone，玩家 overlap 时触发爬梯）
    this.ladders = this.physics.add.staticGroup()
    this.climbExitCooldown = 0    // 进入爬梯后的冷却（避免立刻被着地退出）
    this.climbEnterCooldown = 0   // 退出爬梯后的冷却（避免立刻又进入）

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
        // 底层右墙在门位置留缺口（门高 2 格），让玩家可通行到森林
        if (floor === 0 && y <= 1) continue
        ground.create(towerX + towerWpx - 16, wy, wallKey)
      }

      // 楼层地板（除底层地面外，中层/顶层需要地板）
      // 底层地面已有 grass+dirt，跳过
      if (floor > 0) {
        for (let i = 1; i < towerW; i++) {
          // 梯子口位置（ladderX 对应的格子 + 左右各一格）缺地板，方便玩家爬上爬下不被卡
          if (i === 7 || i === 8 || i === 9) continue  // 梯子口（3 格宽，比梯子宽 2 格，留余量）
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
    // 记录梯子位置供 updateLadderState 距离检测用
    this.ladderPositions = []
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
      // 记录位置供距离检测
      this.ladderPositions.push({
        x: ladderX,
        centerY: ladderTopY - floorHpx / 2 + TS / 2,
        halfHeight: floorHpx / 2,
      })
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
      // 火把 ×4（贴天花板上方的墙）
      for (let i = 2; i < towerWpx / TS; i += 4) {
        this.add.image(towerX + 16 + i * TS, floorTopY - 5 * TS, 'torch_wall').setDepth(3)
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
      // 火把 ×4（贴天花板墙）
      for (let i = 2; i < towerWpx / TS; i += 4) {
        this.add.image(towerX + 16 + i * TS, floorTopY - 5 * TS, 'torch_wall').setDepth(3)
      }
      // 左房间：床 + 宝箱
      this.add.image(towerX + 3 * TS, floorTopY - TS / 2, 'bed_head').setDepth(3)
      this.add.image(towerX + 4 * TS, floorTopY - TS / 2, 'bed_foot').setDepth(3)
      this.add.image(towerX + 2 * TS, floorTopY - TS / 2, 'chest_closed').setDepth(3)
      // 右房间：书架 + 宝箱
      this.add.image(towerX + (towerWpx / TS - 4) * TS, floorTopY - TS / 2, 'shelf_1').setDepth(3)
      this.add.image(towerX + (towerWpx / TS - 3) * TS, floorTopY - TS / 2, 'shelf_2').setDepth(3)
      this.add.image(towerX + (towerWpx / TS - 5) * TS, floorTopY - TS / 2, 'chest_open').setDepth(3)
      // 门（隔断左右房间，2 格高物理障碍，按 E 切换开关）
      // floorTopY 是地板中心，门脚底要贴地板表面 = floorTopY - 16
      this.createDoor(this.ground, towerX + 6 * TS, floorTopY - 16)
      this.createDoor(this.ground, towerX + 12 * TS, floorTopY - 16)
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
  /**
   * 创建门（2 格高 64px，单张 door_full 图，独立站立不镶嵌，物理障碍可交互开关）
   * @param ground staticGroup
   * @param x 门中心 X
   * @param floorY 该层地板表面 Y（门脚底位置）
   */
  createDoor(ground, x, floorY) {
    if (!this.doors) this.doors = []
    // 视觉+物理：单张 32×64 门图，origin 0.5,0.5，中心 Y = floorY - 32
    const doorSprite = this.add.image(x, floorY - 32, 'door_full').setOrigin(0.5, 0.5).setDepth(4)
    const doorBody = ground.create(x, floorY - 32, 'door_full')
    this.doors.push({
      sprite: doorSprite,
      body: doorBody,
      isOpen: false,
      x,
      y: floorY - 32,
    })
  }

  /**
   * 更新梯子状态：
   * - 玩家在梯子区域 + 按 ↑ -> 进入爬梯
   * - 玩家不在梯子区域 + 正在爬梯 -> 退出爬梯
   * - 爬梯中走到梯子顶端地面 -> 自动退出
   *
   * 关键：用 physics.collide/overlap 实时检测，不依赖回调缓存（避免离开梯子后状态残留）
   */
  updateLadderState() {
    if (!this.ladders || !this.ladderPositions) return

    const playerSprite = this.player.sprite

    // 冷却倒计时（确保数值有效）
    this.climbEnterCooldown = Math.max(0, (this.climbEnterCooldown || 0) - 1)
    this.climbExitCooldown = Math.max(0, (this.climbExitCooldown || 0) - 1)

    // 实时检测玩家是否在梯子区域
    let isNear = false
    for (const pos of this.ladderPositions) {
      const dx = Math.abs(playerSprite.x - pos.x)
      const dy = playerSprite.y - pos.centerY
      if (dx < 24 && dy > -pos.halfHeight && dy < pos.halfHeight) {
        isNear = true
        break
      }
    }

    if (this.player.isClimbing) {
      // === 爬梯中：检查退出（冷却期内不检查）===
      if (this.climbExitCooldown === 0) {
        const body = playerSprite.body
        const grounded = body.blocked.down || body.touching.down
        // 退出条件：离开梯子区域 / 按空格跳出去 / 着地且不按上键
        const shouldExit = !isNear || this.inputSystem.space.isDown || (grounded && !this.inputSystem.up.isDown)
        if (shouldExit) {
          this.player.setClimbing(false)
          this.climbEnterCooldown = 30
          // 按空格退出时给跳跃速度
          if (this.inputSystem.space.isDown) {
            this.player.sprite.setVelocityY(-300)
          }
        }
      }
    } else {
      // === 非爬梯：检查进入（冷却期内不进入）===
      if (this.climbEnterCooldown === 0 && isNear && this.inputSystem.up.isDown) {
        this.player.setClimbing(true)
        this.climbExitCooldown = 20
      }
    }
  }

  update() {
    // 聊天模式不移动、不攻击
    if (!this.registry.get('chatOpen')) {
      this.player.update(this.inputSystem)
      this.updateLadderState()
      this.handlePlayerAttack()
    }
    this.checkInteraction()
    this.checkChatToggle()
    this.inputSystem.update()
    this.emitPosition()
    this.sendNetworkPosition()
    this.updateChatBubble()
  }

  /**
   * 玩家攻击输入处理（鼠标左键 -> 服务端权威判定）
   * - 非聊天模式 + 鼠标左键 justDown -> player.attack() -> network.sendAttack()
   * - 攻击冷却在 Player.attack() 内部判断（ATTACK_COOLDOWN=500ms）
   */
  handlePlayerAttack() {
    if (!this.inputSystem.mouseAttack.justDown) return
    if (!this.player || !this.network) return
    const mouseX = this.inputSystem.pointer.worldX
    const ok = this.player.attack(mouseX)
    if (ok) {
      // 发送朝向给服务端做扇形判定
      this.network.sendAttack(this.player.facing)
    }
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
    // 优先用 Player 内部维护的 facing（4 方向），回退到 flipX（2 方向）
    const facing = this.player.facing || (sprite.flipX ? 'left' : 'right')
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
    if (doorDist < INTERACT_DISTANCE && doorDist < nearestDist) {
      nearest = { type: 'door', target: this.door, dist: doorDist }
      nearestDist = doorDist
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
    if (portalDist < INTERACT_DISTANCE && portalDist < nearestDist) {
      nearest = { type: 'portal', target: this.portal, dist: portalDist }
      nearestDist = portalDist
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
        : nearest.type === 'door'
        ? (this.doorIsOpen ? '按 E 关门' : '按 E 开门')
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
      this.toggleDoor()
    } else if (nearest.type === 'roomDoor') {
      // 新增：房间门物理开关
      this.toggleRoomDoor(nearest.target)
    } else if (nearest.type === 'portal') {
      events.emit('portal-interact', {})
    }
  }

  /**
   * 切换房间门状态（物理障碍门）
   * 关 -> body.enable=true（挡路）+ 不透明
   * 开 -> body.enable=false（可通行）+ 半透明
   */
  toggleRoomDoor(door) {
    if (door.isOpen) {
      // 关门
      if (door.body.body) door.body.body.enable = true
      door.sprite.setAlpha(1)
      door.isOpen = false
      console.log('[Door] 关门', door.x)
    } else {
      // 开门
      if (door.body.body) door.body.body.enable = false
      door.sprite.setAlpha(0.3)
      door.isOpen = true
      console.log('[Door] 开门', door.x)
    }
  }

  /**
   * 切换大门状态（装饰门，无物理障碍，右墙已留缺口）
   * 关 -> 不透明；开 -> 半透明可通行
   * 开门时触发彩蛋气泡（致敬梗）
   */
  toggleDoor() {
    if (this.doorIsOpen) {
      // 关门：恢复不透明
      this.door.setAlpha(1)
      this.doorIsOpen = false
      console.log('[Door] 大门关闭')
      // 隐藏彩蛋气泡
      if (this.doorBubbleTimer) this.doorBubbleTimer.remove()
      this.doorBubble.setVisible(false)
    } else {
      // 开门：半透明 + 触发彩蛋
      this.door.setAlpha(0.3)
      this.doorIsOpen = true
      console.log('[Door] 大门打开')
      this.showDoorBubble()
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

  // ============ 战斗阶段1：怪物渲染 + 战斗事件 ============

  /**
   * 创建怪物精灵 + 头顶 HP 条
   * 由 NetworkSystem 'monster-added' 事件触发（state diff 检测到新怪物）
   * @param {string} monsterId 怪物实例 ID
   * @param {object} state 怪物状态快照
   */
  createMonster(monsterId, state) {
    if (this.monsterSprites.has(monsterId)) return  // 已存在，跳过
    const def = getMonsterDef(state.monsterId)
    const textureKey = def?.spriteKey || 'monster_slime'

    // 怪物精灵（32×32，depth=9 在玩家10之下，避免遮挡玩家头顶昵称）
    const sprite = this.add.image(state.x, state.y, textureKey).setDepth(9)
    // 怪物比玩家小，显示略放大到 40×40 更易点击/观察
    sprite.setDisplaySize(40, 40)
    // 根据朝向翻转
    sprite.setFlipX(state.facing === 'left')

    // 头顶 HP 条（背景红 + 前景绿，宽度按 hp/maxHp 比例）
    const barW = 36
    const barH = 4
    const hpRatio = state.maxHp > 0 ? Math.max(0, state.hp / state.maxHp) : 1
    const hpBarBg = this.add.rectangle(state.x, state.y - 26, barW, barH, 0x000000, 0.7).setDepth(11)
    const hpBarFill = this.add.rectangle(
      state.x - barW / 2 + (barW * hpRatio) / 2,
      state.y - 26,
      barW * hpRatio,
      barH,
      0x4caf50
    ).setDepth(12).setOrigin(0.5, 0.5)

    this.monsterSprites.set(monsterId, {
      sprite,
      hpBarBg,
      hpBarFill,
      lastHp: state.hp,
      maxHp: state.maxHp,
    })
    console.log('[WorldScene] 创建怪物精灵:', monsterId, 'at', Math.round(state.x), Math.round(state.y))
  }

  /**
   * 更新怪物（位置 / HP / 朝向 / 状态）
   * 由 NetworkSystem 'monster-updated' 事件触发
   * @param {string} monsterId
   * @param {object} state
   */
  updateMonster(monsterId, state) {
    const m = this.monsterSprites.get(monsterId)
    if (!m) {
      // 理论上 'monster-added' 先触发，但保险起见兜底创建
      this.createMonster(monsterId, state)
      return
    }

    // 更新位置（无插值，与现有玩家同步一致）
    m.sprite.x = state.x
    m.sprite.y = state.y
    m.sprite.setFlipX(state.facing === 'left')

    // 更新 HP 条
    const barW = 36
    const hpRatio = state.maxHp > 0 ? Math.max(0, state.hp / state.maxHp) : 1
    m.hpBarBg.setPosition(state.x, state.y - 26)
    m.hpBarFill.setPosition(
      state.x - barW / 2 + (barW * hpRatio) / 2,
      state.y - 26
    )
    m.hpBarFill.width = barW * hpRatio

    // HP 下降 -> 受击视觉反馈（红色闪烁 + 轻微缩放）
    if (state.hp < m.lastHp) {
      m.sprite.setTint(0xff4444)
      this.time.delayedCall(120, () => m.sprite.clearTint())
      // 受击抖动
      this.tweens.add({
        targets: m.sprite,
        scaleX: 1.15, scaleY: 1.15,
        duration: 60, yoyo: true,
        onComplete: () => { m.sprite.setScale(1) },
      })
    }
    m.lastHp = state.hp

    // 怪物状态指示（attack 时变橙色提示危险）
    if (state.state === 'attack') {
      m.sprite.setTint(0xffaa00)
    } else {
      m.sprite.clearTint()
    }
  }

  /**
   * 移除怪物精灵（死亡 / 超出范围）
   * 由 NetworkSystem 'monster-removed' 事件触发
   * @param {string} monsterId
   */
  removeMonster(monsterId) {
    const m = this.monsterSprites.get(monsterId)
    if (!m) return
    // 淡出动画
    this.tweens.add({
      targets: [m.sprite, m.hpBarBg, m.hpBarFill],
      alpha: 0,
      duration: 300,
      onComplete: () => {
        m.sprite.destroy()
        m.hpBarBg.destroy()
        m.hpBarFill.destroy()
      },
    })
    this.monsterSprites.delete(monsterId)
  }

  /**
   * 怪物被击杀：显示掉落提示（阶段1最简，不做物品入库）
   * 由 'monster-killed' 广播消息触发（服务端判定死亡后广播）
   * @param {object} data { monsterId, monsterDefId, x, y }
   */
  onMonsterKilled(data) {
    const def = getMonsterDef(data.monsterDefId)
    const dropText = def ? `${def.name} 倒下了` : '怪物倒下了'
    // 简单飘字提示
    const text = this.add.text(data.x, data.y - 20, dropText, {
      fontSize: '11px',
      color: '#FFD700',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(50)
    this.tweens.add({
      targets: text,
      y: data.y - 60,
      alpha: 0,
      duration: 1500,
      onComplete: () => text.destroy(),
    })
  }

  /**
   * 自身 HP 变化：触发玩家受击反馈 + 屏幕震动
   * 由 NetworkSystem 'player-hp-change' 事件触发
   * @param {object} data { hp, maxHp }
   */
  onSelfHpChange(data) {
    if (!this.player) return
    const prev = this.player._lastHp ?? data.maxHp
    // HP 下降 = 受击
    if (data.hp < prev) {
      this.player.takeHit()
      // 屏幕轻微震动（受击打击感）
      this.cameras.main.shake(100, 0.003)
    }
    this.player._lastHp = data.hp
    // HP 归零由 'player-revived' 处理，这里不处理死亡
  }

  /**
   * 玩家复活：屏幕渐黑过渡 + 提示文字
   * 由 'player-revived' 广播消息触发
   * @param {object} data { sessionId, nickname }
   */
  onPlayerRevived(data) {
    // 只处理自己的复活
    if (!this.network || data.sessionId !== this.network.room?.sessionId) return
    console.log('[WorldScene] 本玩家复活，位置重置到塔楼一层')

    // 半透明黑色遮罩渐入渐出
    const overlay = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000, 0
    ).setDepth(200).setScrollFactor(0)
    this.tweens.add({
      targets: overlay,
      alpha: 1,
      duration: 300,
      onComplete: () => {
        // 提示文字
        const reviveText = this.add.text(
          this.cameras.main.width / 2,
          this.cameras.main.height / 2,
          '你在塔楼一层苏醒...',
          { fontSize: '20px', color: '#fff', stroke: '#000', strokeThickness: 4 }
        ).setOrigin(0.5).setDepth(201).setScrollFactor(0)
        this.time.delayedCall(800, () => {
          this.tweens.add({
            targets: [overlay, reviveText],
            alpha: 0,
            duration: 500,
            onComplete: () => { overlay.destroy(); reviveText.destroy() },
          })
        })
      },
    })
  }

  /**
   * 攻击命中反馈：屏幕中央显示命中数（短提示）
   * 由 'attack-hit' 广播消息触发（仅自己）
   * @param {object} data { sessionId, hitCount, facing }
   */
  onAttackHit(data) {
    if (data.hitCount <= 0) return
    const text = this.add.text(
      this.player.sprite.x,
      this.player.sprite.y - 50,
      `命中 ×${data.hitCount}`,
      { fontSize: '12px', color: '#fff', stroke: '#000', strokeThickness: 2 }
    ).setOrigin(0.5).setDepth(50)
    this.tweens.add({
      targets: text,
      y: this.player.sprite.y - 70,
      alpha: 0,
      duration: 600,
      onComplete: () => text.destroy(),
    })
  }
}