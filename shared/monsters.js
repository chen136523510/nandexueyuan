/**
 * 德塔（NDO）怪物定义表
 * game-server（生成怪物实例）与 game（前端预加载纹理）共用
 *
 * 数值权威：德塔战斗数值设计文档 §5
 *   普通怪 hp50/atk6/def3/res3，攻击间隔 1.5s
 *
 * 阶段1仅实装追击型（chase），behaviorType 字段预留四种行为供阶段2/3扩展：
 *   chase（追击型，阶段1）/ ranged（远程型）/ aoe（范围型）/ summon（召唤型）
 */

/**
 * 怪物定义表
 * @typedef {Object} MonsterDef
 * @property {string} id            怪物定义 ID（如 'slime'）
 * @property {string} name          显示名称
 * @property {string} behaviorType  行为模式：chase / ranged / aoe / summon
 * @property {number} hp            最大血量
 * @property {number} atk           攻击力
 * @property {number} def           护甲
 * @property {number} res           魔抗
 * @property {string} spriteKey     纹理 key（PreloadScene 生成）
 * @property {number} attackRange   攻击距离 px
 * @property {number} attackCooldown 攻击间隔 ms
 */
export const MONSTERS = [
  {
    id: 'slime',
    name: '虚空史莱姆',
    behaviorType: 'chase',
    hp: 50,
    atk: 6,
    def: 3,
    res: 3,
    spriteKey: 'monster_slime',
    attackRange: 36,         // = MONSTER_ATTACK_RANGE
    attackCooldown: 1500,    // = MONSTER_ATTACK_COOLDOWN
  },
]

/**
 * 按 id 查询怪物定义
 * @param {string} id
 * @returns {MonsterDef|undefined}
 */
export function getMonsterDef(id) {
  return MONSTERS.find(m => m.id === id)
}

/**
 * 阶段1森林区怪物刷新配置
 * - 初始生成数量
 * - 最低保持数量（少于则定时补刷）
 * - 生成区域 x 范围（FOREST_X_MIN ~ FOREST_X_MAX）
 */
export const FOREST_SPAWN_CONFIG = {
  initialCount: 4,      // 房间创建时生成 4 只
  minAlive: 3,          // 少于 3 只时补刷
  maxAlive: 6,          // 同时最多 6 只（防止同屏怪物超 15 性能约束）
  respawnDelayMs: 30000, // 怪物死亡后 30s 重生
  monsterId: 'slime',   // 阶段1只刷史莱姆
}
