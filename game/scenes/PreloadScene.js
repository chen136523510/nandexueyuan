import Phaser from 'phaser'

/**
 * PreloadScene — 生成占位纹理（色块）
 * 美术资源就绪后替换为真实加载
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
  }

  create() {
    this.generatePlaceholderTextures()
    this.scene.start('WorldScene')
  }

  generatePlaceholderTextures() {
    const gfx = this.make.graphics({ add: false })

    const tiles = [
      ['tile_grass', 0x4CAF50, 32, 32],
      ['tile_dirt', 0x8B6914, 32, 32],
      ['tile_stone', 0x808080, 32, 32],
      ['tile_wood', 0x8B4513, 32, 32],
      ['tile_sky', 0x87CEEB, 32, 32],
      ['tile_tree', 0x228B22, 32, 64],
      ['tile_cloud', 0xFFFFFF, 64, 24],
      ['tile_door', 0x654321, 32, 64],
    ]
    for (const [key, color, w, h] of tiles) {
      gfx.clear()
      gfx.fillStyle(color)
      gfx.fillRect(0, 0, w, h)
      gfx.generateTexture(key, w, h)
    }

    // 玩家角色（蓝色方块 32x32）
    gfx.clear()
    gfx.fillStyle(0x2196F3)
    gfx.fillRect(0, 0, 32, 32)
    gfx.generateTexture('player_default', 32, 32)

    // NPC 色块
    gfx.clear()
    gfx.fillStyle(0xFFD700)
    gfx.fillRect(0, 0, 32, 32)
    gfx.generateTexture('npc_nandetong', 32, 32)

    // 物品
    gfx.clear()
    gfx.fillStyle(0xFF5722)
    gfx.fillRect(0, 0, 32, 32)
    gfx.generateTexture('item_board', 32, 32)

    // 头像占位
    gfx.clear()
    gfx.fillStyle(0x2196F3)
    gfx.fillCircle(16, 16, 16)
    gfx.generateTexture('avatar_placeholder', 32, 32)

    gfx.destroy()
  }
}