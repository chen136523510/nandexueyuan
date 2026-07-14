import Phaser from 'phaser'
import { PLAYER_SPEED, JUMP_VELOCITY } from '../../shared/constants.js'

/**
 * Player - 玩家角色
 * 色块占位：32x32 蓝色方块
 */
export class Player {
  constructor(scene, x, y, nickname) {
    this.scene = scene

    this.sprite = scene.physics.add.sprite(x, y, 'player_default')
    this.sprite.setCollideWorldBounds(false)
    this.sprite.setBounce(0)
    this.sprite.setSize(32, 32)
    this.sprite.setDepth(10)

    // 昵称（从外部传入）
    this.nickname = scene.add.text(x, y - 22, nickname || '学员', {
      fontSize: '10px',
      color: '#fff',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5, 1).setDepth(20)
  }

  update(inputSystem) {
    const body = this.sprite.body
    const onGround = body.blocked.down

    if (inputSystem.left.isDown) {
      this.sprite.setVelocityX(-PLAYER_SPEED)
      this.sprite.setFlipX(true)
    } else if (inputSystem.right.isDown) {
      this.sprite.setVelocityX(PLAYER_SPEED)
      this.sprite.setFlipX(false)
    } else {
      this.sprite.setVelocityX(0)
    }

    if ((inputSystem.up.isDown || inputSystem.space.isDown) && onGround) {
      this.sprite.setVelocityY(JUMP_VELOCITY)
    }

    this.nickname.setPosition(this.sprite.x, this.sprite.y - 22)
  }
}