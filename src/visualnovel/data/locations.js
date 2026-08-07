/**
 * 空间地点图（R-035 空间机制）
 *
 * 地点 = 带状态的"舞台坐标"：背景/热点/出口/解锁条件。
 * 剧情（节点图=时间线）与空间（地点图=坐标）解耦：
 *   - 节点带 explore: true + location 进入探索态
 *   - 探索态热点 goto 剧情节点恢复剧情；链尾节点带 explore 回到探索态
 *   - 出口 travelTo 切换地点（可配 onEnter 进入演出链，链尾带 explore 回探索）
 *
 * 探索态渲染由 visualNovelStore 生成合成节点（type:'explore'），
 * 渲染层照旧读 currentNode，无需特殊分支。
 *
 * 坐标系：热点/出口按钮中心点百分比（同 HotspotLayer 约定）。
 */

export const LOCATIONS = {
  // ===== 塔楼内部（room 级） =====
  hall: {
    id: 'hall',
    name: '一层大厅',
    level: 'room',
    bg: 'bg/tower_interior_hall',  // 角色入画版 P1 出图后改这里即可
    desc: '暖色灯光，旧沙发，墙上的地图。三张照片摊在桌上。',
    exits: [
      // 出口：点击切到另一地点探索态
      { to: 'corridor', label: '上二楼', icon: '🪜', x: 50, y: 16, cond: null },
    ],
    hotspots: [
      // 互动点：goto 剧情节点（Q&A 等）
      // 坐标按演出设计站位：见(右·地图前) / 添(左·沙发)——角色入画图出图时按此构图
      { id: 'hall_dean', x: 74, y: 66, label: '见', icon: '📖',
        action: { type: 'goto', target: 'ch3_free_dean' } },
      { id: 'hall_tian', x: 24, y: 58, label: '添', icon: '🔧',
        action: { type: 'goto', target: 'ch3_free_tian' } },
      { id: 'hall_sleep', x: 84, y: 82, label: '回房睡觉', icon: '🛏️',
        action: { type: 'goto', target: 'ch3_sleep1' } },
    ],
    onEnter: null,       // 可选：进入演出链起始节点 id（链尾带 explore 回探索）
    unlockedBy: null,    // 解锁条件（null=初始解锁），语法同 condition 节点
  },
  corridor: {
    id: 'corridor',
    name: '二楼走廊',
    level: 'room',
    bg: 'bg/ban_corridor_moon',
    desc: '走廊尽头的窗开着，月光洒了一地。',
    exits: [
      { to: 'hall', label: '下一楼', icon: '🪜', x: 50, y: 88, cond: null },
    ],
    hotspots: [
      { id: 'cor_ban', x: 46, y: 62, label: '班', icon: '🌙',
        action: { type: 'goto', target: 'ch3_free_ban1' } },
    ],
    onEnter: 'ch3_corridor_enter',  // 进入演出：旁白（月光）+ 回到探索态
    unlockedBy: null,
  },
  room: {
    id: 'room',
    name: '房间',
    level: 'room',
    bg: 'bg/tower_room_night',
    desc: '窗外的风声一阵一阵。',
    exits: [],
    hotspots: [
      // 出门：goto 剧情节点（楼下马蹄声 → 选择下楼 → 信使段）
      { id: 'room_leave', x: 50, y: 80, label: '出门', icon: '🚪',
        action: { type: 'goto', target: 'ch3_leave1' } },
    ],
    onEnter: null,
    unlockedBy: null,
  },
}

// ===== 世界地图坐标（MapPanel 高亮用，与空间地点是两层数据） =====
// 坐标为百分比（x/y 相对于 world_map.png 图片的宽/高）。
// 底图尺寸：1800x930，帝桥在像素坐标(450,450) → 百分比(25%, 48.4%)。
// 后续 region/world 级地点可通过 mapPos 关联此处。
export const MAP_LOCATIONS = {
  '学院':   { x: 28, y: 62, label: '男德学院' },
  '帝桥':   { x: 25, y: 48, label: '帝桥（南方大桥）' },
  '帝国':   { x: 18, y: 18, label: '帝国' },
  '共和国': { x: 68, y: 20, label: '共和国' },
  '海盗国': { x: 52, y: 88, label: '海盗国' },
}
