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

// 网络
export const COLYSEUS_URL = 'ws://localhost:2567'
export const ROOM_NAME = 'world'

// 移动指令
export const MOVE_LEFT = 'move_left'
export const MOVE_RIGHT = 'move_right'
export const MOVE_JUMP = 'move_jump'
export const MOVE_STOP = 'move_stop'