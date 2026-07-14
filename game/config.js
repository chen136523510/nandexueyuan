/**
 * 德塔（NDO）Phaser 游戏配置
 */
import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene.js'
import { PreloadScene } from './scenes/PreloadScene.js'
import { WorldScene } from './scenes/WorldScene.js'

export const TILE_SIZE = 32

export function createGameConfig(parent) {
  return {
    type: Phaser.AUTO,
    parent,
    pixelArt: true,
    banner: false,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 800 },
        debug: false,
      },
    },
    // UIScene 已移除，HUD 全部由 Vue 底部面板渲染
    scene: [BootScene, PreloadScene, WorldScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: '100%',
      height: '100%',
    },
    backgroundColor: '#87CEEB',
  }
}
