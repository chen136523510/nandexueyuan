import * as Phaser from 'phaser'
import { PLAYER_SPEED, JUMP_VELOCITY } from '../../shared/constants.js'

const CLIMB_SPEED = 120  // 爬梯速度（比行走慢）

/**
 * Player - 玩家角色
 * 色块占位：32×32（1 格），body 32×32 稳定状态
 *
 * 爬梯机制：
 *   - isClimbing=true 时，关闭重力，上下键控制 Y 速度，左右键无效
 *   - 跳跃键退出爬梯（恢复重力 + 向上 velocity）
 *   - WorldScene 负责检测玩家是否在梯子区域，调用 setClimbing(true/false)
 */
export class Player {
  constructor(scene, x, y, nickname) {
    this.scene = scene

    this.sprite = scene.physics.add.sprite(x, y, 'player_default')
    this.sprite.setCollideWorldBounds(false)
    this.sprite.setBounce(0)
    this.sprite.setSize(32, 32)
    this.sprite.setDepth(10)

    // 爬梯状态
    this.isClimbing = false

    // 昵称（从外部传入）
    this.nickname = scene.add.text(x, y - 22, nickname || '学员', {
      fontSize: '10px',
      color: '#fff',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(20)
  }

  /**
   * 进入/退出爬梯状态
   * @param {boolean} climbing
   */
  setClimbing(climbing) {
    if (this.isClimbing === climbing) return
    this.isClimbing = climbing
    if (climbing) {
      // 进入爬梯：关闭重力，水平速度归零
      this.sprite.body.setAllowGravity(false)
      this.sprite.setVelocityX(0)
      console.log('[Player] 进入爬梯状态')
    } else {
      // 退出爬梯：恢复重力
      this.sprite.body.setAllowGravity(true)
      console.log('[Player] 退出爬梯状态')
    }
  }

  update(inputSystem) {
    const body = this.sprite.body

    if (this.isClimbing) {
      // === 爬梯模式 ===
      // 垂直：上下键控制
      if (inputSystem.up.isDown) {
        this.sprite.setVelocityY(-CLIMB_SPEED)
      } else if (inputSystem.down.isDown) {
        this.sprite.setVelocityY(CLIMB_SPEED)
      } else {
        this.sprite.setVelocityY(0)  // 静止悬挂
      }

      // 水平：允许缓慢横移（方便对准梯子口）
      const CLIMB_DRIFT = PLAYER_SPEED * 0.4
      if (inputSystem.left.isDown) {
        this.sprite.setVelocityX(-CLIMB_DRIFT)
      } else if (inputSystem.right.isDown) {
        this.sprite.setVelocityX(CLIMB_DRIFT)
      } else {
        this.sprite.setVelocityX(0)
      }

      // 注意：退出爬梯由 WorldScene.updateLadderState 统一管理，Player 不主动退出
      // 这样避免 Player.update 和 WorldScene 同时改状态导致刷屏
    } else {
      // === 正常模式 ===
      const onGround = body.blocked.down || body.touching.down

      // 水平移动（独立判定，不受垂直碰撞影响）
      if (inputSystem.left.isDown) {
        this.sprite.setVelocityX(-PLAYER_SPEED)
        this.sprite.setFlipX(true)
      } else if (inputSystem.right.isDown) {
        this.sprite.setVelocityX(PLAYER_SPEED)
        this.sprite.setFlipX(false)
      } else {
        this.sprite.setVelocityX(0)
      }

      // 垂直移动（独立判定，贴墙时也能跳）
      if ((inputSystem.up.isDown || inputSystem.space.isDown) && onGround) {
        this.sprite.setVelocityY(JUMP_VELOCITY)
      }
    }

    this.nickname.setPosition(this.sprite.x, this.sprite.y - 22)
  }
}
