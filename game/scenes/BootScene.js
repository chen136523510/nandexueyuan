import Phaser from 'phaser'

/**
 * BootScene — 初始化，跳转 Preload
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  create() {
    this.scene.start('PreloadScene')
  }
}