import { Schema, defineTypes } from '@colyseus/schema'

/**
 * 怪物状态 Schema
 *
 * 阶段1仅追击型（behaviorType='chase'），字段已预留四种行为扩展（ranged/aoe/summon）。
 * 所有字段服务端权威，客户端通过 onStateChange diff 自动同步（位置/hp/状态变化）。
 *
 * state 字段取值：
 *   'idle'    待机（无玩家在检测范围内）
 *   'chase'   追击（朝目标玩家移动）
 *   'attack'  攻击中（冷却内，停留在原地进行攻击动作）
 *   'dead'    已死亡（客户端播完淡出后销毁，服务端立即移出 Map）
 */
export class MonsterState extends Schema {
  constructor(data = {}) {
    super()
    this.id = data.id || ''              // 怪物实例唯一 ID（sessionId 维度）
    this.monsterId = data.monsterId || 'slime'  // 怪物定义 ID（对应 shared/monsters.js）
    this.x = data.x || 0
    this.y = data.y || 0
    this.hp = data.hp ?? 50
    this.maxHp = data.maxHp || 50
    this.behaviorType = data.behaviorType || 'chase'
    this.state = data.state || 'idle'
    this.facing = data.facing || 'left'  // 怪物默认面向玩家（左），追击时动态调整
    this.targetId = data.targetId || ''  // 目标玩家 sessionId（追击用）
  }
}

defineTypes(MonsterState, {
  id: 'string',
  monsterId: 'string',
  x: 'number',
  y: 'number',
  hp: 'number',
  maxHp: 'number',
  behaviorType: 'string',
  state: 'string',
  facing: 'string',
  targetId: 'string',
})
