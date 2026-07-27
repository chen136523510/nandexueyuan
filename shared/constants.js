/**
 * 德塔（NDO）共享常量
 * game/ 和 game-server/ 共用
 */

// 地图
export const MAP_WIDTH = 100      // 瓦片数
export const MAP_HEIGHT = 30
export const TILE_SIZE = 32       // 像素

// 物理
export const GRAVITY = 800
export const PLAYER_SPEED = 200   // 像素/秒（PRD 规格）
export const JUMP_VELOCITY = -380

// 交互
export const INTERACT_DISTANCE = 48  // 像素，≈ 1.5 格

// ============ 战斗系统数值（阶段1，权威：数值设计文档） ============
// 玩家基础数值（无装备时的本体属性）
export const PLAYER_BASE_HP = 100
export const PLAYER_BASE_MP = 200
export const PLAYER_BASE_ATK = 10
export const PLAYER_BASE_DEF = 5   // 德塔剧情加护
export const PLAYER_BASE_RES = 3   // 德塔剧情加护

// 伤害除法公式常数 K（数值文档 §2.2：伤害 = ATK × K / (K + 防御)）
export const DAMAGE_K = 15

// 玩家攻击参数（阶段1：鼠标左键近战扇形）
export const ATTACK_COOLDOWN = 500   // ms，攻击冷却（剑类武器 0.5s，数值文档 §3.1）
export const ATTACK_RANGE = 48       // px，近战攻击半径（≈1.5格，等同交互距离）
export const ATTACK_ARC_DEGREE = 120 // °，扇形判定角度（左右各60°）

// 怪物AI参数（追击型）
export const MONSTER_DETECT_RANGE = 150  // px，发现玩家距离
export const MONSTER_CHASE_SPEED = 80    // px/s，追击速度（比玩家200慢，可逃）
export const MONSTER_ATTACK_RANGE = 36   // px，怪物碰撞伤害距离（≈1格）
export const MONSTER_ATTACK_COOLDOWN = 1500  // ms，怪物攻击间隔（数值文档 §5：1.5s）

// HP回复（数值文档 §1.6）
export const HP_REGEN_DELAY = 20000  // ms，脱战多少ms后开始回血
export const HP_REGEN_PER_SEC = 1    // 每秒回复HP

// 死亡复活
export const REVIVE_X = 520  // 塔楼一层大厅出生点
export const REVIVE_Y = 600

// 森林战斗区范围（WorldScene 世界 3200×700，塔楼占 x∈[200,840]，森林区 x∈[880,3150]）
export const FOREST_X_MIN = 880
export const FOREST_X_MAX = 3150
export const FOREST_GROUND_Y = 636  // 地面 Y（= H - 64，与 WorldScene.groundY 一致）

// 网络段（原常量）
export const COLYSEUS_URL = 'ws://localhost:2567'
export const ROOM_NAME = 'world'

// 移动指令
export const MOVE_LEFT = 'move_left'
export const MOVE_RIGHT = 'move_right'
export const MOVE_JUMP = 'move_jump'
export const MOVE_STOP = 'move_stop'