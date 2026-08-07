/**
 * 背景图映射（BackgroundLayer 渲染 + store 预加载共用）
 *
 * REAL_BG_MAP：有真实图片文件的背景 key → 渲染走 url()、预加载会下载
 *   - 值 null：key 即文件名（/visualnovel/{key}.png）
 *   - 值 string：别名映射（如 bg/tower_lobby → bg/tower_interior_hall）
 *
 * 不在 REAL_BG_MAP 的 key 视为 CSS 渐变占位（BG_FALLBACK），
 * 无真实文件——预加载必须跳过，否则产生 404 请求（2026-08-07 踩坑：bg/black 预加载 404）
 */

export const REAL_BG_MAP = {
  'bg/void_world': null,
  'bg/grassland': null,
  'bg/tower_day': null,
  'bg/tower_interior_hall': null,
  'bg/tower_lobby': 'bg/tower_interior_hall', // 命名不统一，指向同一张大厅图
  'bg/tower_interior_hall_prologue': null, // 序章结束后场景（见+添画入场景）
  'bg/tower_outdoor_mist': null,
  'bg/tower_interior': null,
  'bg/tower_workbench': null,      // 幕间场景A：工作台特写
  'bg/tower_corridor_night': null,  // 第二幕衔接段：二楼走廊夜景
  'bg/tower_room_night': null,      // 序章睡觉过渡：二楼房间·夜晚（v2 基于 morning 参考生成）
  'bg/tower_room_morning': null,    // 第一章开场：二楼房间·晨光
  'bg/tower_corridor_morning': null,// 第一章开场：二楼走廊·晨光
  'bg/ban_corridor_moon': null,     // CG-1：班走廊看月亮（v2 重做，坐窗边床沿）
  'bg/ban_closeup_moon': null,     // CG-2：班近景特写（坐椅靠床边，月光洒脸）
  'bg/grassland_morning': null,     // 幕间结尾：清晨草原（tower_outdoor_mist 无人版）
  'bg/bridge_checkpoint': null,    // 第一幕·帝桥哨卡（旧版，v2 阴天）
  'bg/bridge_wide': null,          // 第一幕·帝桥特写远景（晴天全貌）
  'bg/bridge_close': null,         // 第一幕·哨卡近景（摆立绘用）
  'bg/village_entrance': null,     // 第一幕场景B·草原村口（土路+文书台+排队村民）
  'bg/grassland_road': null,       // 第一幕·回程草原路（无人物，摆立绘用）
  'bg/ch2_xing_arrival': null,     // 第二幕·幸二次造访（进门镜头，幸已画入背景）
  'bg/negotiation_standoff': null,  // 第二幕·谈判全景·对峙（四角色入画，班靠墙闭目）
  'bg/negotiation_xing_look': null, // 第二幕·谈判全景·幸看玩家
  'bg/negotiation_dean_look': null, // 第二幕·谈判全景·见看玩家
}
