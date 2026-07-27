import { Schema, defineTypes } from '@colyseus/schema'
import {
  PLAYER_BASE_HP, PLAYER_BASE_MP, PLAYER_BASE_ATK, PLAYER_BASE_DEF, PLAYER_BASE_RES,
} from '../../../shared/constants.js'

/**
 * 玩家状态 Schema
 *
 * 战斗阶段1新增字段（hp/maxHp/atk/def/res）：
 *   - 服务端权威，客户端通过 onStateChange diff 自动同步
 *   - 受击/死亡/复活均由 WorldRoom 修改这些字段驱动，客户端只读
 */
export class PlayerState extends Schema {
  constructor(data = {}) {
    super()
    this.x = data.x || 520
    this.y = data.y || 600
    this.nickname = data.nickname || '学员'
    this.facing = data.facing || 'right'
    this.anim = data.anim || 'idle'
    // 玩家形象 ID（1-5），决定使用哪一套精灵表/立绘/头像
    this.skinId = data.skinId || '1'
    // 战斗属性（阶段1：基础数值，装备系统阶段2再叠加）
    this.maxHp = data.maxHp || PLAYER_BASE_HP
    this.hp = data.hp ?? this.maxHp
    this.maxMp = data.maxMp || PLAYER_BASE_MP
    this.mp = data.mp ?? this.maxMp
    this.atk = data.atk || PLAYER_BASE_ATK
    this.def = data.def || PLAYER_BASE_DEF
    this.res = data.res || PLAYER_BASE_RES
  }
}

defineTypes(PlayerState, {
  x: 'number',
  y: 'number',
  nickname: 'string',
  facing: 'string',
  anim: 'string',
  skinId: 'string',
  // 战斗属性
  maxHp: 'number',
  hp: 'number',
  maxMp: 'number',
  mp: 'number',
  atk: 'number',
  def: 'number',
  res: 'number',
})