import * as Phaser from 'phaser'
import { PLAYER_SPEED, JUMP_VELOCITY, ATTACK_COOLDOWN } from '../../shared/constants.js'

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
 *
 * 战斗阶段1：
 *   - attack(mouseX) 鼠标左键触发，按鼠标 X 相对玩家位置算朝向（left/right）
 *   - 冷却 ATTACK_COOLDOWN（500ms），通过返回值告知 WorldScene 是否发网络消息
 *   - 视觉反馈：精灵 tint 白色闪烁 100ms（挥砍感）
 *   - 受击反馈：takeHit() 精灵 tint 红色 200ms（被打击感）
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
    this.sprite.setOffset(16, 32)  // body 左上角偏移：(64-32)/2=16, (64-32)=32 -> 底部居中
    this.sprite.setDepth(10)

    // 当前朝向 + 动画状态（用于检测变化，避免每帧重复 play）
    this.facing = 'right'
    this.anim = 'idle'

    // 进入 idle 初始动画
    this._playAnim('idle', 'right')

    // 爬梯状态
    this.isClimbing = false

    // === 战斗状态 ===
    this.lastAttackTime = 0       // 上次攻击时间戳（ms）
    this.isAttacking = false      // 攻击动画进行中（防 tween 叠加）

    // 昵称（从外部传入）--精灵 64×64，昵称放在头顶上方
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

  /**
   * 玩家攻击（鼠标左键触发）
   * - 根据鼠标世界坐标算朝向（鼠标在玩家左侧->left，右侧->right）
   * - 冷却检查（ATTACK_COOLDOWN=500ms）
   * - 视觉反馈：精灵 tint 白色闪烁 100ms（挥砍感）
   * @param {number} mouseWorldX 鼠标世界坐标 X
   * @returns {boolean} 是否成功发起攻击（true=WorldScene 应发网络消息）
   */
  attack(mouseWorldX) {
    const now = this.scene.time.now
    if (now - this.lastAttackTime < ATTACK_COOLDOWN) return false
    this.lastAttackTime = now

    // 根据鼠标位置决定朝向（2D 横版：左右翻转）
    const newFacing = mouseWorldX < this.sprite.x ? 'left' : 'right'
    if (newFacing !== this.facing) {
      this.facing = newFacing
      this._playAnim(this.anim, newFacing)
    }

    // 攻击视觉反馈：白色闪烁 100ms（防 tween 叠加）
    if (!this.isAttacking) {
      this.isAttacking = true
      this.sprite.setTint(0xffffff)
      this.scene.time.delayedCall(100, () => {
        this.sprite.clearTint()
        this.isAttacking = false
      })
    }

    return true
  }

  /**
   * 玩家受击反馈（自身 hp 下降时触发，由 WorldScene 监听 player-hp-change 调用）
   * 视觉：精灵 tint 红色 200ms + 轻微抖动
   */
  takeHit() {
    // 红色受击闪烁（覆盖攻击的白色闪烁，优先级更高）
    this.isAttacking = false  // 取消攻击闪烁状态
    this.sprite.setTint(0xff4444)
    this.scene.time.delayedCall(200, () => {
      this.sprite.clearTint()
    })
    // 轻微抖动（受击打击感）
    this.scene.tweens.add({
      targets: this.sprite,
      x: this.sprite.x + (Math.random() > 0.5 ? 3 : -3),
      duration: 50,
      yoyo: true,
    })
  }
}
