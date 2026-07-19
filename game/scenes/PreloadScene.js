import * as Phaser from 'phaser'

/**
 * PreloadScene — 加载真实美术资源，色块作 fallback
 *
 * 资源清单：
 *   - Tiny Town 瓦片（CC0，已预切为独立 PNG）→ public/game/tilesets/sliced/
 *   - 男德通像素精灵（地图显示）            → public/game/sprites/npcs/
 *   - 男德通立绘（对话框用）                 → public/game/portraits/
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' })
  }

  preload() {
    const W = this.scale.width
    const H = this.scale.height

    const bar = this.add.rectangle(W / 2, H / 2, 0, 20, 0x6b8e6b)
    const bg = this.add.rectangle(W / 2, H / 2, 300, 20, 0x333333)
    this.load.on('progress', (v) => { bar.width = 300 * v })
    this.load.on('complete', () => { bg.destroy(); bar.destroy() })

    // === Tiny Town 真实瓦片（预切好的独立 PNG，用项目原有 key 名覆盖色块）===
    this.load.image('tile_grass', '/game/tilesets/sliced/tile_grass.png')
    this.load.image('tile_dirt', '/game/tilesets/sliced/tile_dirt.png')
    this.load.image('tile_stone', '/game/tilesets/sliced/tile_stone.png')
    this.load.image('tile_wood', '/game/tilesets/sliced/tile_wood.png')

    // === Tiny Dungeon 塔楼专用瓦片（32×32，从 16×16 放大 2 倍）===
    // 石墙（3 色调：底层深、中层棕、顶层浅）
    this.load.image('wall_dark_1', '/game/tilesets/sliced/wall_dark_1.png')
    this.load.image('wall_dark_2', '/game/tilesets/sliced/wall_dark_2.png')
    this.load.image('wall_dark_3', '/game/tilesets/sliced/wall_dark_3.png')
    // 塔内背景专用（最暗最低调，不晃眼）
    this.load.image('wall_bg_dark', '/game/tilesets/sliced/wall_bg_dark.png')
    this.load.image('wall_brown_1', '/game/tilesets/sliced/wall_brown_1.png')
    this.load.image('wall_brown_2', '/game/tilesets/sliced/wall_brown_2.png')
    this.load.image('wall_brown_3', '/game/tilesets/sliced/wall_brown_3.png')
    this.load.image('wall_light_1', '/game/tilesets/sliced/wall_light_1.png')
    this.load.image('wall_light_2', '/game/tilesets/sliced/wall_light_2.png')
    // 木地板（6 变体）
    this.load.image('floor_wood_1', '/game/tilesets/sliced/floor_wood_1.png')
    this.load.image('floor_wood_2', '/game/tilesets/sliced/floor_wood_2.png')
    this.load.image('floor_wood_3', '/game/tilesets/sliced/floor_wood_3.png')
    this.load.image('floor_wood_4', '/game/tilesets/sliced/floor_wood_4.png')
    this.load.image('floor_wood_5', '/game/tilesets/sliced/floor_wood_5.png')
    this.load.image('floor_wood_6', '/game/tilesets/sliced/floor_wood_6.png')
    // 门（3 段拼接用 + 2 格高单门）
    this.load.image('door_left', '/game/tilesets/sliced/door_left.png')
    this.load.image('door_mid', '/game/tilesets/sliced/door_mid.png')
    this.load.image('door_right', '/game/tilesets/sliced/door_right.png')
    this.load.image('door_full', '/game/tilesets/sliced/door_full.png')
    // 楼梯
    this.load.image('stair_up', '/game/tilesets/sliced/stair_up.png')
    this.load.image('stair_down', '/game/tilesets/sliced/stair_down.png')
    // 火把 + 窗户
    this.load.image('torch_wall', '/game/tilesets/sliced/torch_wall.png')
    this.load.image('torch_small', '/game/tilesets/sliced/torch_small.png')
    this.load.image('window', '/game/tilesets/sliced/window.png')
    // 家具
    this.load.image('table_tl', '/game/tilesets/sliced/table_tl.png')
    this.load.image('table_tr', '/game/tilesets/sliced/table_tr.png')
    this.load.image('table_bl', '/game/tilesets/sliced/table_bl.png')
    this.load.image('bed_head', '/game/tilesets/sliced/bed_head.png')
    this.load.image('bed_foot', '/game/tilesets/sliced/bed_foot.png')
    this.load.image('chest_closed', '/game/tilesets/sliced/chest_closed.png')
    this.load.image('chest_open', '/game/tilesets/sliced/chest_open.png')
    this.load.image('shelf_1', '/game/tilesets/sliced/shelf_1.png')
    this.load.image('shelf_2', '/game/tilesets/sliced/shelf_2.png')
    this.load.image('counter', '/game/tilesets/sliced/counter.png')
    this.load.image('barrel', '/game/tilesets/sliced/barrel.png')
    this.load.image('skull', '/game/tilesets/sliced/skull.png')
    this.load.image('floor_pattern_1', '/game/tilesets/sliced/floor_pattern_1.png')
    this.load.image('floor_pattern_2', '/game/tilesets/sliced/floor_pattern_2.png')

    // === NPC 与立绘 ===
    // 立绘（对话框用，已验证质量好）
    this.load.image('portrait_nandetong', '/game/portraits/nandetong.png')
    // NPC 像素精灵（地图显示用，32×32，AI 生成降采样）
    this.load.image('npc_nandetong', '/game/sprites/npcs/nandetong.png')

    this.load.on('loaderror', (file) => {
      console.warn('[PreloadScene] 资源加载失败，将使用占位色块:', file.key)
    })
  }

  create() {
    this.generateFallbackTextures()
    this.scene.start('WorldScene')
  }

  /**
   * 生成 fallback 色块（PNG 加载失败时才用）
   * 关键：用 this.textures.exists() 判断，不覆盖已加载的真实纹理
   */
  generateFallbackTextures() {
    const gfx = this.make.graphics({ add: false })

    // 已加载的纹理跳过；未加载的生成色块
    const fallbacks = [
      ['tile_grass', 0x4CAF50, 32, 32],
      ['tile_dirt', 0x8B6914, 32, 32],
      ['tile_stone', 0x808080, 32, 32],     // 塔楼墙
      ['tile_wood', 0x8B4513, 32, 32],      // 塔楼地板
      ['tile_sky', 0x87CEEB, 32, 32],
      ['tile_tree', 0x228B22, 32, 64],
      ['tile_cloud', 0xFFFFFF, 64, 24],
      ['tile_door', 0x654321, 32, 64],
      ['player_default', 0x2196F3, 32, 32], // 玩家色块
      ['npc_nandetong', 0xFFD700, 32, 32],  // NPC fallback
      ['item_board', 0xFF5722, 32, 32],     // 物品
    ]
    for (const [key, color, w, h] of fallbacks) {
      if (!this.textures.exists(key)) {
        gfx.clear()
        gfx.fillStyle(color)
        gfx.fillRect(0, 0, w, h)
        gfx.generateTexture(key, w, h)
      }
    }

    // 头像占位（始终生成）
    gfx.clear()
    gfx.fillStyle(0x2196F3)
    gfx.fillCircle(16, 16, 16)
    gfx.generateTexture('avatar_placeholder', 32, 32)

    // 传送门（始终生成，目前没有真实美术资源）
    gfx.clear()
    gfx.fillStyle(0x9b59ff)
    gfx.fillCircle(24, 24, 24)
    gfx.fillStyle(0x7d3c98)
    gfx.fillCircle(24, 24, 16)
    gfx.fillStyle(0xbb8fce)
    gfx.fillCircle(24, 24, 8)
    gfx.generateTexture('portal', 48, 48)

    gfx.destroy()
    console.log('[PreloadScene] 资源加载完成，可用纹理:', this.textures.getTextureKeys().length, '个')
  }
}
