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
    this._downDown = false  // 新增：向下（爬梯用）
    this._eJustDown = false
    this._eWasDown = false
    this._enterJustDown = false
    this._enterWasDown = false

    // === 战斗阶段1：鼠标攻击输入 ===
    // 鼠标左键单击 -> mouseAttackJustDown（每帧 update 重置，同 keyE 模式）
    // 鼠标位置 -> 实时存 worldX/worldY（供 Player 算朝向，扇形判定服务端做）
    this._mouseAttackJustDown = false
    this._mouseWorldX = 0
    this._mouseWorldY = 0

    const kbd = scene.input.keyboard

    kbd.on('keydown', (event) => {
      switch (event.key) {
        case 'a': case 'A': case 'ArrowLeft': this._leftDown = true; break
        case 'd': case 'D': case 'ArrowRight': this._rightDown = true; break
        case 'w': case 'W': case 'ArrowUp': this._upDown = true; break
        case 's': case 'S': case 'ArrowDown': this._downDown = true; break  // 新增
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
        case 's': case 'S': case 'ArrowDown': this._downDown = false; break  // 新增
        case ' ': this._upDown = false; break
        case 'e': case 'E': this._eWasDown = false; break
        case 'Enter': this._enterWasDown = false; break
      }
    })

    // === 鼠标事件（战斗阶段1）===
    // pointerdown 只响应左键（event.button === 0）；移动端 touch 也会触发 pointerdown
    scene.input.on('pointerdown', (pointer) => {
      if (pointer.leftButtonDown && !this._mouseAttackJustDown) {
        this._mouseAttackJustDown = true
        this._mouseWorldX = pointer.worldX
        this._mouseWorldY = pointer.worldY
      }
    })
    // 实时追踪鼠标世界坐标（攻击未触发时也要知道朝向来源）
    scene.input.on('pointermove', (pointer) => {
      this._mouseWorldX = pointer.worldX
      this._mouseWorldY = pointer.worldY
    })

    // 兼容旧 API：left.isDown / right.isDown / up.isDown / space.isDown
    const self = this
    this.left = { get isDown() { return self._leftDown } }
    this.right = { get isDown() { return self._rightDown } }
    this.up = { get isDown() { return self._upDown } }
    this.down = { get isDown() { return self._downDown } }  // 新增
    this.space = { get isDown() { return self._upDown } }

    // 兼容 WorldScene 的 JustDown 检测
    this.keyE = { get isDown() { return self._eWasDown }, get justDown() { return self._eJustDown } }
    this.keyEnter = { get isDown() { return self._enterWasDown }, get justDown() { return self._enterJustDown } }

    // 战斗：鼠标左键攻击（justDown 模式）+ 鼠标世界坐标
    this.mouseAttack = { get justDown() { return self._mouseAttackJustDown } }
    this.pointer = {
      get worldX() { return self._mouseWorldX },
      get worldY() { return self._mouseWorldY },
    }
  }

  /** 每帧调用，重置 "justDown" 状态 */
  update() {
    this._eJustDown = false
    this._enterJustDown = false
    this._mouseAttackJustDown = false
  }
}