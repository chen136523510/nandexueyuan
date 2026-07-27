import { Schema, MapSchema, defineTypes } from '@colyseus/schema'
import { PlayerState } from './PlayerState.js'
import { MonsterState } from './MonsterState.js'

/**
 * 世界状态 Schema
 *
 * 战斗阶段1新增 monsters MapSchema：
 *   - 服务端权威（WorldRoom 生成/AI/死亡管理）
 *   - 客户端通过 onStateChange diff 自动同步（复用现有 players 同步链路）
 */
export class WorldState extends Schema {
  constructor() {
    super()
    this.players = new MapSchema()
    this.monsters = new MapSchema()
  }
}

defineTypes(WorldState, {
  players: { map: PlayerState },
  monsters: { map: MonsterState },
})