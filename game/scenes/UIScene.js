import * as Phaser from 'phaser'

/**
 * UIScene - HUD 层（固定在屏幕上的 UI）
 * 左下角：角色信息（头像/血条/蓝量/buff）
 * 右上角：小地图
 */
export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' })
  }

  create() {
    const W = this.scale.width
    const H = this.scale.height

    // === 左下角：角色信息面板 ===
    const panelX = 10
    const panelY = H - 90

    this.add.rectangle(panelX + 85, panelY + 35, 170, 70, 0x000000, 0.5).setOrigin(0).setScrollFactor(0).setDepth(1000)

    this.add.image(panelX + 10, panelY + 10, 'avatar_placeholder').setOrigin(0).setDisplaySize(32, 32).setScrollFactor(0).setDepth(1001)

    this.add.text(panelX + 50, panelY + 8, 'HP', { fontSize: '11px', color: '#fff', fontFamily: 'monospace' }).setScrollFactor(0).setDepth(1001)
    this.add.rectangle(panelX + 70, panelY + 12, 80, 8, 0x333333).setOrigin(0).setScrollFactor(0).setDepth(1001)
    this.add.rectangle(panelX + 70, panelY + 12, 80, 8, 0xe53935).setOrigin(0).setScrollFactor(0).setDepth(1001)

    this.add.text(panelX + 50, panelY + 22, 'MP', { fontSize: '11px', color: '#fff', fontFamily: 'monospace' }).setScrollFactor(0).setDepth(1001)
    this.add.rectangle(panelX + 70, panelY + 26, 80, 8, 0x333333).setOrigin(0).setScrollFactor(0).setDepth(1001)
    this.add.rectangle(panelX + 70, panelY + 26, 80, 8, 0x1e88e5).setOrigin(0).setScrollFactor(0).setDepth(1001)

    this.add.text(panelX + 10, panelY + 50, 'buff:', { fontSize: '9px', color: '#888', fontFamily: 'monospace' }).setScrollFactor(0).setDepth(1001)

    // === 右上角：小地图 ===
    const mapSize = 100
    const mapX = W - mapSize - 10
    const mapY = 10

    this.add.rectangle(mapX, mapY, mapSize, mapSize, 0x000000, 0.5).setOrigin(0).setScrollFactor(0).setDepth(1001)
    this.add.rectangle(mapX, mapY, mapSize, mapSize).setStrokeStyle(2, 0x6b8e6b).setOrigin(0).setScrollFactor(0).setDepth(1001)

    // 玩家位置点
    this.minimapDot = this.add.circle(mapX + mapSize / 2, mapY + mapSize / 2, 3, 0x2196F3).setScrollFactor(0).setDepth(1002)

    // NPC 点
    this.add.circle(mapX + 30, mapY + mapSize - 30, 2, 0xFFD700).setScrollFactor(0).setDepth(1002)

    // 大门点
    this.add.circle(mapX + mapSize - 15, mapY + mapSize - 30, 2, 0x654321).setScrollFactor(0).setDepth(1002)

    // 存储引用
    this.mapX = mapX
    this.mapY = mapY
    this.mapSize = mapSize

    // 窗口大小变化时更新
    this.scale.on('resize', (gameSize) => {
      // 更新小地图位置
      const newMapX = gameSize.width - mapSize - 10
      this.mapX = newMapX
      // 简单重建（MVP 阶段）
    })
  }

  update() {
    // 更新小地图上玩家位置
    const worldScene = this.scene.get('WorldScene')
    if (worldScene && worldScene.player && worldScene.player.sprite) {
      const px = worldScene.player.sprite.x
      const ratio = this.mapSize / 3200
      this.minimapDot.x = this.mapX + px * ratio
    }
  }
}