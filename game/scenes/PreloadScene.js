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
