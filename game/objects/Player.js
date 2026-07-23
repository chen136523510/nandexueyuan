import * as Phaser from 'phaser'
import { PLAYER_SPEED, JUMP_VELOCITY } from '../../shared/constants.js'

const CLIMB_SPEED = 120  // 爬梯速度（比行走慢）

/**
 * Player - 玩家角色
 * 支持 5 套形象（skinId 1-5）+ 四方向行走动画
 *   - 纹理 key：player_set{skinId}（128×128 spritesheet，4×4 网格）
 *   - anim key：player_set{skinId}_{state}_{direction}
 *     state: idle / walk
 *     direction: down / up / left / right
 *   - 32×32 body（与男德通 NPC 同尺寸）
 *
 * 爬梯机制：
 *   - isClimbing=true 时，关闭重力，上下键控制 Y 速度，左右键缓慢横移
 *   - 爬梯 facing 跟随上下键（up/down），横移时切到 left/right
 *   - WorldScene 负责检测玩家是否在梯子区域，调用 setClimbing(true/false)
 */
export class Player {
  constructor(scene, x, y, nickname, skinId = '1') {
    this.scene = scene
    this.skinId = String(skinId || '1')

    // 加载 spritesheet 纹理（PreloadScene 已注册 fallback）
    const textureKey = `player_set${this.skinId}`
    this.sprite = scene.physics.add.sprite(x, y, textureKey)
    this.sprite.setCollideWorldBounds(false)
    this.sprite.setBounce(0)
    // 精灵显示 64×64（占 2 格），物理碰撞体保持 32×32（1 格）在脚下居中
    this.sprite.setSize(32, 32)
    this.sprite.setOffset(16, 32)  // body 左上角偏移：(64-32)/2=16, (64-32)=32 → 底部居中
    this.sprite.setDepth(10)

    // 当前朝向 + 动画状态（用于检测变化，避免每帧重复 play）
    this.facing = 'right'
    this.anim = 'idle'

    // 进入 idle 初始动画
    this._playAnim('idle', 'right')

    // 爬梯状态
    this.isClimbing = false

    // 昵称（从外部传入）——精灵 64×64，昵称放在头顶上方
    this.nickname = scene.add.text(x, y - 38, nickname || '学员', {
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

  /**
   * 播放对应方向 + 状态的动画
   * 若纹理 fallback（无 anim 注册）则静默失败，sprite 保持当前帧
   */
  _playAnim(state, facing) {
    const animKey = `player_set${this.skinId}_${state}_${facing}`
    if (this.scene.anims.exists(animKey)) {
      this.sprite.anims.play(animKey, true)
    } else {
      // 兜底：尝试同 state 的 down 方向（fallback 色块场景）
      const fallbackKey = `player_set${this.skinId}_${state}_down`
      if (this.scene.anims.exists(fallbackKey) && !this.sprite.anims.isPlaying) {
        this.sprite.anims.play(fallbackKey, true)
      }
      // 实在没有 anim，sprite 就保持静态色块（不影响移动逻辑）
    }
  }

  update(inputSystem) {
    const body = this.sprite.body

    let newFacing = this.facing
    let newAnim = 'idle'

    if (this.isClimbing) {
      // === 爬梯模式 ===
      // 垂直：上下键控制
      if (inputSystem.up.isDown) {
        this.sprite.setVelocityY(-CLIMB_SPEED)
        newFacing = 'up'
        newAnim = 'walk'
      } else if (inputSystem.down.isDown) {
        this.sprite.setVelocityY(CLIMB_SPEED)
        newFacing = 'down'
        newAnim = 'walk'
      } else {
        this.sprite.setVelocityY(0)  // 静止悬挂
        newAnim = 'idle'
      }

      // 水平：允许缓慢横移（方便对准梯子口），横移时切到 left/right facing
      const CLIMB_DRIFT = PLAYER_SPEED * 0.4
      if (inputSystem.left.isDown) {
        this.sprite.setVelocityX(-CLIMB_DRIFT)
        newFacing = 'left'
        newAnim = 'walk'
      } else if (inputSystem.right.isDown) {
        this.sprite.setVelocityX(CLIMB_DRIFT)
        newFacing = 'right'
        newAnim = 'walk'
      } else {
        this.sprite.setVelocityX(0)
      }

      // 注意：退出爬梯由 WorldScene.updateLadderState 统一管理，Player 不主动退出
    } else {
      // === 正常模式 ===
      const onGround = body.blocked.down || body.touching.down

      // 水平移动（独立判定，不受垂直碰撞影响）
      let moving = false
      if (inputSystem.left.isDown) {
        this.sprite.setVelocityX(-PLAYER_SPEED)
        newFacing = 'left'
        moving = true
      } else if (inputSystem.right.isDown) {
        this.sprite.setVelocityX(PLAYER_SPEED)
        newFacing = 'right'
        moving = true
      } else {
        this.sprite.setVelocityX(0)
      }

      // 垂直移动（独立判定，贴墙时也能跳）
      const jumping = (inputSystem.up.isDown || inputSystem.space.isDown) && onGround
      if (jumping) {
        this.sprite.setVelocityY(JUMP_VELOCITY)
      }

      // 动画状态判定（schema 只有 idle/walk，jump 暂归到 walk）
      if (body.velocity.y < -50) {
        newAnim = 'walk'  // 跳跃中用 walk 动画（暂时）
      } else if (moving) {
        newAnim = 'walk'
      } else {
        newAnim = 'idle'
      }
    }

    // 仅在 facing/anim 变化时切换动画（避免每帧重复 play 抖动）
    if (newFacing !== this.facing || newAnim !== this.anim) {
      this.facing = newFacing
      this.anim = newAnim
      this._playAnim(newAnim, newFacing)
    }

    this.nickname.setPosition(this.sprite.x, this.sprite.y - 38)
  }
}
