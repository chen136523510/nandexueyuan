import { Schema, defineTypes } from '@colyseus/schema'

/**
 * 玩家状态 Schema
 */
export class PlayerState extends Schema {
  constructor(data = {}) {
    super()
    this.x = data.x || 520
    this.y = data.y || 600
    this.nickname = data.nickname || '学员'
    this.facing = data.facing || 'right'
    this.anim = data.anim || 'idle'
  }
}

defineTypes(PlayerState, {
  x: 'number',
  y: 'number',
  nickname: 'string',
  facing: 'string',
  anim: 'string',
})