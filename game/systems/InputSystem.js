/**
 * InputSystem - 键盘输入管理
 * WASD / 方向键 / 空格 / E 交互
 * 使用 Phaser 4 keyboard 事件 API，不依赖 KeyCodes
 */
export class InputSystem {
  constructor(scene) {
    this._leftDown = false
    this._rightDown = false
    this._upDown = false
    this._eJustDown = false
    this._eWasDown = false
    this._enterJustDown = false
    this._enterWasDown = false

    const kbd = scene.input.keyboard

    kbd.on('keydown', (event) => {
      switch (event.key) {
        case 'a': case 'A': case 'ArrowLeft': this._leftDown = true; break
        case 'd': case 'D': case 'ArrowRight': this._rightDown = true; break
        case 'w': case 'W': case 'ArrowUp': this._upDown = true; break
        case ' ': this._upDown = true; break
        case 'e': case 'E': if (!this._eWasDown) this._eJustDown = true; this._eWasDown = true; break
        case 'Enter': if (!this._enterWasDown) this._enterJustDown = true; this._enterWasDown = true; break
      }
    })

    kbd.on('keyup', (event) => {
      switch (event.key) {
        case 'a': case 'A': case 'ArrowLeft': this._leftDown = false; break
        case 'd': case 'D': case 'ArrowRight': this._rightDown = false; break
        case 'w': case 'W': case 'ArrowUp': this._upDown = false; break
        case ' ': this._upDown = false; break
        case 'e': case 'E': this._eWasDown = false; break
        case 'Enter': this._enterWasDown = false; break
      }
    })

    // 兼容旧 API：left.isDown / right.isDown / up.isDown / space.isDown
    const self = this
    this.left = { get isDown() { return self._leftDown } }
    this.right = { get isDown() { return self._rightDown } }
    this.up = { get isDown() { return self._upDown } }
    this.space = { get isDown() { return self._upDown } }

    // 兼容 WorldScene 的 JustDown 检测
    this.keyE = { get isDown() { return self._eWasDown }, get justDown() { return self._eJustDown } }
    this.keyEnter = { get isDown() { return self._enterWasDown }, get justDown() { return self._enterJustDown } }
  }

  /** 每帧调用，重置 "justDown" 状态 */
  update() {
    this._eJustDown = false
    this._enterJustDown = false
  }
}