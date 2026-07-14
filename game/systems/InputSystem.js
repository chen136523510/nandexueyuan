import * as Phaser from 'phaser'

/**
 * InputSystem - 键盘输入管理
 * WASD / 方向键 / 空格 / E 交互
 */
export class InputSystem {
  constructor(scene) {
    this.left = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A)
    this.right = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    this.up = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    this.space = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.keyE = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)

    // 方向键也支持
    this.arrowLeft = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)
    this.arrowRight = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
    this.arrowUp = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP)

    // 合并方向键
    this.left = new Proxy(this.left, {
      get: (target, prop) => {
        if (prop === 'isDown') return target.isDown || this.arrowLeft.isDown
        return target[prop]
      },
    })
    this.right = new Proxy(this.right, {
      get: (target, prop) => {
        if (prop === 'isDown') return target.isDown || this.arrowRight.isDown
        return target[prop]
      },
    })
    this.up = new Proxy(this.up, {
      get: (target, prop) => {
        if (prop === 'isDown') return target.isDown || this.arrowUp.isDown
        return target[prop]
      },
    })
  }
}