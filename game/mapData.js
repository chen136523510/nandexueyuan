/**
 * 德塔地图布局数据（静态）
 * 用于小地图渲染，game/ 和 Vue 共享
 * 坐标基于世界空间（像素）
 */

// 世界尺寸
export const WORLD_WIDTH = 3200
export const WORLD_HEIGHT = 700   // 近似值，用于小地图比例计算

// 地面
export const GROUND = { y: 636, height: 64 }  // groundY = WORLD_HEIGHT - 64

// 德塔塔楼
export const TOWER = {
  x: 200,
  width: 640,       // 20 格 * 32px
  floors: 3,
  floorHeight: 192, // 6 格 * 32px
}

// NPC 位置
export const NPC_POSITIONS = [
  { id: 'nandetong', x: 360, y: 620, color: '#FFD700' },
]

// 物品位置
export const ITEM_POSITIONS = [
  { id: 'notice_board', x: 680, y: 620, color: '#FF5722' },
]

// 大门位置
export const DOOR_POSITION = { x: 824, y: 588, color: '#aaa' }

// 传送门位置（大厅出生点附近）
export const PORTAL_POSITION = { x: 520, y: 620, color: '#9b59ff' }
