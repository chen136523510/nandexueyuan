/**
 * 第一章：三线剧变 -- 逻辑骨架
 *
 * ⚠️ 本文件只含逻辑（type/background/characters/next/effects/branches 等）。
 *    文案（text/choices 文案）已迁移到 data/scripts/ 下，改台词请改那里。
 *    加载时由 visualNovelStore.js 的 CHAPTER_LOADERS 调用 mergeScript() 合并。
 *
 * 当前已实现：
 *   - 开场·醒来（二楼房间 -> 走廊 -> 下楼选择 -> 幕间）
 *   - 幕间·德塔日常（工作台起哄 -> 轻选项 -> 见下楼 -> 帝桥情报+地图演出 -> 见拍板 -> 幕间结束）
 * 后续待开发：第一幕·帝桥 / 第二幕·风从北方来 / 第三幕·东来的信 / 第四幕·东边的刀
 *
 * 节点 id 前缀：ch1_
 * 剧本来源：prd/01-需求文档/04-德塔/02-设计/剧情设计/第一章-三线剧变.md
 *
 * 舞台调度（剧本第94-112行）：
 *   场景A（工作台）：班(左)  玩家(中·无立绘)  添(右·工作台侧)
 *   场景B（一层大厅）：班(左·沙发)  添(中·工作台)  见(右·楼梯口)
 */

export default [
  // ================================================================
  // 开场·醒来（二楼）
  // ================================================================

  // ===== 场景A：玩家房间·晨（无立绘，镜头即玩家视角） =====
  {
    id: 'ch1_wake_1',
    type: 'dialogue',
    background: 'bg/tower_room_morning',  // 需生成：二楼房间·晨光
    speaker: '旁白',
    next: 'ch1_wake_2'
  },
  {
    id: 'ch1_wake_2',
    type: 'dialogue',
    background: 'bg/tower_room_morning',
    speaker: '旁白',
    next: 'ch1_wake_3'
  },
  {
    id: 'ch1_wake_3',
    type: 'dialogue',
    background: 'bg/tower_room_morning',
    speaker: '旁白',
    next: 'ch1_wake_choice'
  },

  // ===== 开场选择（两路汇合） =====
  {
    id: 'ch1_wake_choice',
    type: 'choice',
    background: 'bg/tower_room_morning',
    choices: [
      { impact: 'critical', next: 'ch1_hallway_1' },   // A. 下楼看看
      { impact: 'critical', next: 'ch1_wake_delay_1' }, // B. 再躺会儿
    ],
  },
  // -- 分支B：再躺会儿（幽默分支，不自动跳走廊，给"下楼查看"选项） --
  {
    id: 'ch1_wake_delay_1',
    type: 'dialogue',
    background: 'bg/tower_room_morning',
    speaker: '旁白',
    next: 'ch1_wake_delay_choice'
  },
  {
    id: 'ch1_wake_delay_choice',
    type: 'choice',
    background: 'bg/tower_room_morning',
    choices: [
      { impact: 'critical', next: 'ch1_hallway_1' },  // 下楼查看
    ],
  },

  // ===== 场景B：二楼走廊·晨光 =====
  {
    id: 'ch1_hallway_1',
    type: 'dialogue',
    background: 'bg/tower_corridor_morning',  // 需生成：二楼走廊·晨光（不是夜景）
    speaker: '旁白',
    next: 'ch1_hallway_2'
  },
  {
    id: 'ch1_hallway_2',
    type: 'dialogue',
    background: 'bg/tower_corridor_morning',
    speaker: '旁白',
    next: 'ch1_work_a1'
  },

  // ================================================================
  // 幕间·德塔日常
  // ================================================================

  // ===== 场景A：工作台 -- 班+添起哄日常 =====
  // 旁白描述添蹲工作台、班靠扶手，两人登场
  {
    id: 'ch1_work_a1',
    type: 'dialogue',
    background: 'bg/tower_workbench',
    enter: [
      { id: 'tian', portrait: 'tian/normal', position: 'right' },
      { id: 'ban', portrait: 'ban/normal', position: 'left' },
    ],
    speaker: '旁白',
    next: 'ch1_work_a2'
  },
  {
    id: 'ch1_work_a2',
    type: 'dialogue',
    background: 'bg/tower_workbench',
    speaker: '班',
    next: 'ch1_work_a3'
  },
  {
    id: 'ch1_work_a3',
    type: 'dialogue',
    background: 'bg/tower_workbench',
    speaker: '添',
    next: 'ch1_work_a4'
  },
  {
    id: 'ch1_work_a4',
    type: 'dialogue',
    background: 'bg/tower_workbench',
    speaker: '班',
    next: 'ch1_work_a5'
  },
  {
    id: 'ch1_work_a5',
    type: 'dialogue',
    background: 'bg/tower_workbench',
    speaker: '添',
    next: 'ch1_work_a6'
  },
  {
    id: 'ch1_work_a6',
    type: 'dialogue',
    background: 'bg/tower_workbench',
    speaker: '旁白',
    next: 'ch1_work_a7'
  },
  {
    id: 'ch1_work_a7',
    type: 'dialogue',
    background: 'bg/tower_workbench',
    speaker: '班',
    next: 'ch1_work_choice'
  },

  // ===== 轻选项（不影响主线，三路汇合） =====
  {
    id: 'ch1_work_choice',
    type: 'choice',
    background: 'bg/tower_workbench',
    choices: [
      { impact: 'critical', next: 'ch1_work_a8a' },  // A. 我赌添哥这次能成
      { impact: 'critical', next: 'ch1_work_a8b' },  // B. 三天确实有点久了
      { impact: 'critical', next: 'ch1_work_a8c' },  // C. 啥玩意儿？我看看
    ],
  },
  // -- 分支A --
  {
    id: 'ch1_work_a8a',
    type: 'dialogue',
    background: 'bg/tower_workbench',
    speaker: '添',
    next: 'ch1_work_a9a'
  },
  {
    id: 'ch1_work_a9a',
    type: 'dialogue',
    background: 'bg/tower_workbench',
    speaker: '班',
    next: 'ch1_hall_b1'  // 汇合进入场景B
  },
  // -- 分支B --
  {
    id: 'ch1_work_a8b',
    type: 'dialogue',
    background: 'bg/tower_workbench',
    speaker: '添',
    next: 'ch1_work_a9b'
  },
  {
    id: 'ch1_work_a9b',
    type: 'dialogue',
    background: 'bg/tower_workbench',
    speaker: '班',
    next: 'ch1_hall_b1'
  },
  // -- 分支C --
  {
    id: 'ch1_work_a8c',
    type: 'dialogue',
    background: 'bg/tower_workbench',
    speaker: '添',
    next: 'ch1_work_a9c'
  },
  {
    id: 'ch1_work_a9c',
    type: 'dialogue',
    background: 'bg/tower_workbench',
    speaker: '班',
    next: 'ch1_hall_b1'
  },

  // ===== 场景B：见下楼（切背景到一层大厅） =====
  // 剧本第104-109行：见从二楼下来站右侧楼梯口；添移回工作台位(中)；班退到沙发旁(左)
  {
    id: 'ch1_hall_b1',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    enter: [
      { id: 'tian', portrait: 'tian/normal', position: 'center' },
      { id: 'dean', portrait: 'dean/calm', position: 'right' },
    ],
    speaker: '旁白',
    next: 'ch1_hall_b2'
  },
  {
    id: 'ch1_hall_b2',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch1_hall_b3'
  },
  {
    id: 'ch1_hall_b3',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '添',
    next: 'ch1_hall_b4'
  },
  // 班凑近玩家嘀咕（剧本第160行：班在左·沙发）
  {
    id: 'ch1_hall_b4',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    enter: [{ id: 'ban', portrait: 'ban/normal', position: 'left' }],
    speaker: '班',
    next: 'ch1_hall_b5'
  },
  {
    id: 'ch1_hall_b5',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch1_hall_b6'
  },
  {
    id: 'ch1_hall_b6',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '添',
    next: 'ch1_map_show'
  },

  // ===== 地图展开演出：帝桥高亮 =====
  // 剧本第170-172行：添说到"帝桥"时界面展开世界地图，帝桥位置圈注高亮
  {
    id: 'ch1_map_show',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    mapHighlight: '帝桥',
    speaker: '添',
    next: 'ch1_hall_b7'
  },
  {
    id: 'ch1_hall_b7',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    mapHighlight: '帝桥',
    speaker: '添',
    next: 'ch1_hall_b8'
  },
  // 地图收起（剧本第190行）
  {
    id: 'ch1_hall_b8',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '班',
    next: 'ch1_hall_b9'
  },
  {
    id: 'ch1_hall_b9',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch1_hall_b10'
  },
  {
    id: 'ch1_hall_b10',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'ch1_hall_b11'
  },
  {
    id: 'ch1_hall_b11',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch1_hall_b12'
  },
  {
    id: 'ch1_hall_b12',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '添',
    next: 'ch1_hall_b13'
  },
  {
    id: 'ch1_hall_b13',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch1_hall_b14'
  },
  {
    id: 'ch1_hall_b14',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'ch1_interlude_end'
  },

  // ===== 幕间结束（衔接第一幕·帝桥） =====
  {
    id: 'ch1_interlude_end',
    type: 'end',
    background: 'bg/tower_interior_hall',
  },
]
