import { Room } from 'colyseus'
import { WorldState } from '../schema/WorldState.js'
import { PlayerState } from '../schema/PlayerState.js'
import { MonsterState } from '../schema/MonsterState.js'
import { verifyToken } from '../lib/auth.js'
import { getMonsterDef, FOREST_SPAWN_CONFIG } from '../../../shared/monsters.js'
import {
  DAMAGE_K,
  PLAYER_BASE_HP,
  ATTACK_RANGE, ATTACK_ARC_DEGREE, ATTACK_COOLDOWN,
  MONSTER_DETECT_RANGE, MONSTER_CHASE_SPEED, MONSTER_ATTACK_RANGE, MONSTER_ATTACK_COOLDOWN,
  HP_REGEN_DELAY, HP_REGEN_PER_SEC,
  REVIVE_X, REVIVE_Y,
  FOREST_X_MIN, FOREST_X_MAX, FOREST_GROUND_Y,
} from '../../../shared/constants.js'

const TICK_MS = 50   // 20Hz 战斗 tick
const PLAYER_ATTACK_COOLDOWN_MS = ATTACK_COOLDOWN  // 500ms，与玩家侧一致

/**
 * 世界房间
 *
 * 战斗阶段1（混合权威）：
 *   - 玩家移动：客户端权威（'move' 消息直接赋值，现状不变）
 *   - 怪物 AI / HP / 攻击判定：服务端权威（setSimulationInterval tick）
 *   - 玩家攻击：客户端发 'attack' 消息 -> 服务端做扇形判定 + 伤害结算
 *
 * 调试日志规范：所有战斗关键事件打 [Battle] 前缀，便于三端联调时过滤
 */
export class WorldRoom extends Room {
  constructor() {
    super()
    this.maxClients = 100
    // 怪物实例 ID 自增计数器
    this.monsterSeq = 0
    // 玩家攻击冷却时间戳（sessionId -> 上次攻击 ms）
    this.playerAttackCooldowns = new Map()
    // 怪物攻击冷却时间戳（monsterId -> 上次攻击 ms）
    this.monsterAttackCooldowns = new Map()
    // 玩家最近受击时间戳（sessionId -> 上次受击 ms，用于脱战回血判定）
    this.playerLastHit = new Map()
    // 怪物重生定时器（monsterId -> setTimeout handle）
    this.respawnTimers = new Map()
  }

  onCreate(options) {
    console.log('[WorldRoom] 房间创建')
    this.setState(new WorldState())

    // === 玩家移动（客户端权威，现状不变）===
    this.onMessage('move', (client, data) => {
      const player = this.state.players.get(client.sessionId)
      if (!player) return
      player.x = data.x
      player.y = data.y
      player.facing = data.facing
      player.anim = data.anim
    })

    // === 玩家攻击（服务端权威判定）===
    // 客户端鼠标左键 -> sendAttack(facing) -> 服务端扇形判定 + 伤害结算
    this.onMessage('attack', (client, data) => {
      this.handlePlayerAttack(client, data)
    })

    this.onMessage('chat', (client, data) => {
      this.broadcast('chat', {
        sessionId: client.sessionId,
        nickname: data.nickname,
        text: data.text,
      })
    })

    // NPC AI 回复广播（玩家在德塔里问男德通，AI 回复全服可见）
    this.onMessage('npc-reply', (client, data) => {
      this.broadcast('npc-reply', {
        sessionId: client.sessionId,
        nickname: data.nickname,    // 提问者昵称
        npcId: data.npcId,          // NPC id（如 nandetong_game）
        text: data.text,            // NPC 的完整回复文本
      })
    })

    // === 初始生成怪物 ===
    this.spawnInitialMonsters()

    // === 战斗 tick（20Hz）===
    // 怪物 AI 追击 + 玩家脱战回血 + 怪物攻击判定
    this.setSimulationInterval((dt) => this.battleTick(dt), TICK_MS)

    // === 定时补刷怪物（每 10s 检查一次，少于 minAlive 则补）===
    this.monsterSpawnTimer = setInterval(() => this.checkRespawn(), 10000)
  }

  onJoin(client, options) {
    const payload = verifyToken(options.token)
    if (!payload) {
      throw new Error('身份验证失败，请重新登录')
    }

    // 优先用客户端传来的昵称（来自 auth store），JWT 中不包含 nickname
    const nickname = options.nickname || payload.nickname || payload.username || '学员'
    // 玩家形象 ID（1-5），由客户端 auth store 传入，默认 '1'
    const skinId = options.skinId || '1'
    console.log(`[WorldRoom] ${nickname} 加入 (session: ${client.sessionId}, skinId: ${skinId})`)
    console.log(`[WorldRoom] 当前房间总人数: ${this.clients.length}`)

    const player = new PlayerState({ nickname, skinId, x: 520, y: 600 })
    console.log(`[WorldRoom] 创建玩家: ${player.nickname}, x=${player.x}, y=${player.y}, skinId=${player.skinId}, hp=${player.hp}/${player.maxHp}`)
    this.state.players.set(client.sessionId, player)
    console.log(`[WorldRoom] state.players.size = ${this.state.players.size}`)

    this.broadcast('player-joined', { sessionId: client.sessionId, nickname })
  }

  onLeave(client, consented) {
    const player = this.state.players.get(client.sessionId)
    const nickname = player?.nickname || '未知'
    console.log(`[WorldRoom] ${nickname} 离开`)
    this.state.players.delete(client.sessionId)
    this.playerAttackCooldowns.delete(client.sessionId)
    this.playerLastHit.delete(client.sessionId)
    this.broadcast('player-left', { sessionId: client.sessionId, nickname })
  }

  onDispose() {
    console.log('[WorldRoom] 房间销毁')
    // 清理所有定时器
    if (this.monsterSpawnTimer) clearInterval(this.monsterSpawnTimer)
    for (const t of this.respawnTimers.values()) clearTimeout(t)
    this.respawnTimers.clear()
  }

  // ============ 怪物生成 ============

  /**
   * 房间创建时在森林区生成初始怪物
   */
  spawnInitialMonsters() {
    const cfg = FOREST_SPAWN_CONFIG
    const def = getMonsterDef(cfg.monsterId)
    if (!def) {
      console.error('[Battle] 怪物定义不存在:', cfg.monsterId)
      return
    }
    for (let i = 0; i < cfg.initialCount; i++) {
      this.spawnMonster(def)
    }
    console.log(`[Battle] 初始生成 ${cfg.initialCount} 只 ${def.name}`)
  }

  /**
   * 生成一只怪物实例，位置在森林区随机
   * @param {object} def 怪物定义（来自 shared/monsters.js）
   * @param {number} [x] 指定 x（重生时用原位置）
   */
  spawnMonster(def, x) {
    const id = `m${++this.monsterSeq}`
    const spawnX = x ?? (FOREST_X_MIN + Math.random() * (FOREST_X_MAX - FOREST_X_MIN))
    const monster = new MonsterState({
      id,
      monsterId: def.id,
      x: spawnX,
      y: FOREST_GROUND_Y - 16,  // 怪物脚底贴地（与玩家一致：groundY-16 为精灵中心）
      hp: def.hp,
      maxHp: def.hp,
      behaviorType: def.behaviorType,
      state: 'idle',
      facing: Math.random() > 0.5 ? 'left' : 'right',
    })
    this.state.monsters.set(id, monster)
    console.log(`[Battle] 生成怪物 ${id} (${def.name}) at x=${Math.round(spawnX)}`)
  }

  /**
   * 定时检查补刷怪物（少于 minAlive 时补到 minAlive，但不超过 maxAlive）
   */
  checkRespawn() {
    const cfg = FOREST_SPAWN_CONFIG
    const alive = this.state.monsters.size
    if (alive >= cfg.minAlive) return
    if (alive >= cfg.maxAlive) return
    const def = getMonsterDef(cfg.monsterId)
    if (!def) return
    const need = Math.min(cfg.minAlive - alive, cfg.maxAlive - alive)
    for (let i = 0; i < need; i++) {
      this.spawnMonster(def)
    }
    console.log(`[Battle] 补刷 ${need} 只怪物（当前 ${alive} -> ${alive + need}）`)
  }

  // ============ 战斗 tick ============

  /**
   * 20Hz 战斗主循环
   * @param {number} deltaMs 自上次 tick 以来的毫秒数（Colyseus setSimulationInterval 传入）
   */
  battleTick(deltaMs) {
    const now = Date.now()
    const dt = deltaMs / 1000  // 秒

    // 1. 玩家脱战回血（数值文档 §1.6：脱战20s后每秒回1HP）
    for (const [sessionId, player] of this.state.players) {
      if (player.hp <= 0) continue
      const lastHit = this.playerLastHit.get(sessionId) || 0
      if (now - lastHit >= HP_REGEN_DELAY && player.hp < player.maxHp) {
        const regen = HP_REGEN_PER_SEC * dt
        player.hp = Math.min(player.maxHp, player.hp + regen)
      }
    }

    // 2. 怪物 AI（追击型）
    for (const [monsterId, monster] of this.state.monsters) {
      if (monster.hp <= 0) continue
      this.updateMonsterAI(monster, monsterId, now, dt)
    }
  }

  /**
   * 怪物 AI 更新（阶段1：仅追击型）
   * 行为：
   *   idle   -> 检测最近玩家距离 < DETECT_RANGE -> 切 chase
   *   chase  -> 朝目标移动 -> 距离 < ATTACK_RANGE -> 切 attack + 造成伤害
   *   attack -> 攻击冷却中，停留 -> 冷却结束切回 chase
   */
  updateMonsterAI(monster, monsterId, now, dt) {
    const def = getMonsterDef(monster.monsterId)
    if (!def) return

    // 找最近玩家
    const target = this.findNearestPlayer(monster)

    if (monster.behaviorType === 'chase') {
      if (target) {
        const dist = Math.abs(target.player.x - monster.x)
        // 朝向玩家
        monster.facing = target.player.x < monster.x ? 'left' : 'right'

        if (dist <= MONSTER_ATTACK_RANGE) {
          // === 攻击范围内：尝试攻击 ===
          monster.state = 'attack'
          monster.targetId = target.sessionId
          const lastAtk = this.monsterAttackCooldowns.get(monsterId) || 0
          if (now - lastAtk >= MONSTER_ATTACK_COOLDOWN) {
            this.monsterAttackCooldowns.set(monsterId, now)
            // 伤害结算：物理伤害 = ATK × K / (K + 玩家DEF)
            const dmg = Math.max(1, def.atk * DAMAGE_K / (DAMAGE_K + target.player.def))
            target.player.hp = Math.max(0, target.player.hp - dmg)
            this.playerLastHit.set(target.sessionId, now)
            console.log(`[Battle] 怪物 ${monsterId} 攻击 ${target.player.nickname}，造成 ${dmg.toFixed(1)} 伤害（hp=${target.player.hp.toFixed(0)}/${target.player.maxHp}）`)
            // 玩家死亡判定
            if (target.player.hp <= 0) {
              this.handlePlayerDeath(target.sessionId, target.player)
            }
          }
        } else if (dist < MONSTER_DETECT_RANGE) {
          // === 检测范围内：追击 ===
          monster.state = 'chase'
          monster.targetId = target.sessionId
          const dir = target.player.x < monster.x ? -1 : 1
          monster.x += dir * MONSTER_CHASE_SPEED * dt
          // 限制在森林区内
          monster.x = Math.max(FOREST_X_MIN, Math.min(FOREST_X_MAX, monster.x))
        } else {
          // === 超出检测范围：待机 ===
          monster.state = 'idle'
          monster.targetId = ''
        }
      } else {
        monster.state = 'idle'
        monster.targetId = ''
      }
    }
  }

  /**
   * 找距离怪物最近的存活玩家
   * @returns {{sessionId: string, player: PlayerState}|null}
   */
  findNearestPlayer(monster) {
    let nearest = null
    let minDist = MONSTER_DETECT_RANGE  // 只考虑检测范围内的玩家
    for (const [sessionId, player] of this.state.players) {
      if (player.hp <= 0) continue
      const dist = Math.abs(player.x - monster.x)
      if (dist < minDist) {
        minDist = dist
        nearest = { sessionId, player }
      }
    }
    return nearest
  }

  // ============ 玩家攻击结算 ============

  /**
   * 处理玩家攻击请求（服务端权威扇形判定）
   * @param {object} client Colyseus client
   * @param {object} data { facing: 'left'|'right' }
   */
  handlePlayerAttack(client, data) {
    const player = this.state.players.get(client.sessionId)
    if (!player || player.hp <= 0) return

    // 攻击冷却检查
    const now = Date.now()
    const lastAtk = this.playerAttackCooldowns.get(client.sessionId) || 0
    if (now - lastAtk < PLAYER_ATTACK_COOLDOWN_MS) return
    this.playerAttackCooldowns.set(client.sessionId, now)

    const facing = data?.facing || player.facing || 'right'
    // 玩家朝向方向（左=-1，右=1）
    const dirX = facing === 'left' ? -1 : 1

    // 扇形判定：在攻击距离内 + 朝向一致（玩家朝向±60°内）
    // 阶段1简化：怪物 x 在玩家朝向方向 0~ATTACK_RANGE 内即命中
    let hitCount = 0
    for (const [monsterId, monster] of this.state.monsters) {
      if (monster.hp <= 0) continue
      const dx = monster.x - player.x
      const dist = Math.abs(dx)
      if (dist > ATTACK_RANGE) continue
      // 朝向判定：怪物在玩家朝向的同侧（dx 与 dirX 同号，或正好在脚下 dx=0）
      if (dx * dirX < 0) continue  // 怪物在玩家背后，跳过

      // 命中！伤害结算：物理伤害 = 玩家ATK × K / (K + 怪物DEF)
      const def = getMonsterDef(monster.monsterId)
      const monsterDef = def?.def || 0
      const dmg = Math.max(1, player.atk * DAMAGE_K / (DAMAGE_K + monsterDef))
      monster.hp = Math.max(0, monster.hp - dmg)
      hitCount++
      console.log(`[Battle] 玩家 ${player.nickname} 攻击怪物 ${monsterId}，造成 ${dmg.toFixed(1)} 伤害（hp=${monster.hp.toFixed(0)}/${monster.maxHp}）`)

      // 怪物死亡判定
      if (monster.hp <= 0) {
        this.handleMonsterDeath(monsterId, monster)
      }
    }

    if (hitCount > 0) {
      // 广播攻击命中事件（客户端播受击特效，阶段1最简：只通知命中数量）
      this.broadcast('attack-hit', { sessionId: client.sessionId, hitCount, facing })
    }
  }

  // ============ 死亡处理 ============

  /**
   * 怪物死亡：移出 Map + 广播 + 设定重生定时器
   */
  handleMonsterDeath(monsterId, monster) {
    console.log(`[Battle] 怪物 ${monsterId} 死亡 at x=${Math.round(monster.x)}`)
    this.broadcast('monster-killed', {
      monsterId,
      monsterDefId: monster.monsterId,
      x: monster.x,
      y: monster.y,
    })
    this.state.monsters.delete(monsterId)
    this.monsterAttackCooldowns.delete(monsterId)

    // 设定重生定时器（30s 后在原区域随机位置重生）
    const cfg = FOREST_SPAWN_CONFIG
    const def = getMonsterDef(cfg.monsterId)
    if (def && !this.respawnTimers.has(monsterId)) {
      const timer = setTimeout(() => {
        this.respawnTimers.delete(monsterId)
        if (this.state.monsters.size < cfg.maxAlive) {
          this.spawnMonster(def)
        }
      }, cfg.respawnDelayMs)
      this.respawnTimers.set(monsterId, timer)
    }
  }

  /**
   * 玩家死亡：复活回塔楼一层 + 满血 + 广播
   */
  handlePlayerDeath(sessionId, player) {
    console.log(`[Battle] 玩家 ${player.nickname} 死亡，复活回塔楼一层`)
    player.hp = player.maxHp
    player.mp = player.maxMp
    player.x = REVIVE_X
    player.y = REVIVE_Y
    this.playerLastHit.delete(sessionId)
    this.broadcast('player-revived', { sessionId, nickname: player.nickname })
  }
}
