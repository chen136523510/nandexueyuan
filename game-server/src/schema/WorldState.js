import { Schema, MapSchema, defineTypes } from '@colyseus/schema'
import { PlayerState } from './PlayerState.js'

/**
 * 世界状态 Schema
 */
export class WorldState extends Schema {
  constructor() {
    super()
    this.players = new MapSchema()
  }
}

defineTypes(WorldState, {
  players: { map: PlayerState },
})