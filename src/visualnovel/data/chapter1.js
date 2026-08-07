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
 *   - 第一幕·帝桥（出发过渡 -> 帝桥哨卡盘查 -> 核心选择①三分支 -> 草原村口 -> 回程）
 * 后续待开发：第二幕·风从北方来 / 第三幕·东来的信 / 第四幕·东边的刀
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
    background: 'bg/grassland_morning',  // 清晨草原（tower_outdoor_mist 无人版，黑机已出图）
    speaker: '旁白',
    next: 'ch1_bridge_out_1'  // 无缝衔接第一幕·帝桥
  },

  // ================================================================
  // 第一幕·帝桥（剧本第240-419行）
  // ================================================================
  //
  // 舞台调度（剧本第245-259行）：
  //   场景A·帝桥边境：添(左·玩家同行)  老人·孙子(中·被拦)  恪(右·哨卡前)，玩家视角(中)
  //   场景B·草原村口：添·玩家(左·旁观位)  老妇人(中·接文书)  帝国官员(右·文书台)
  //   恪/商贩/老人/老妇人/帝国官员 全部无立绘（对话框+角色名），恪立绘 P1 待黑机出图
  //   添全程同行（第一幕唯一在场立绘角色）

  // ===== 出发过渡（清晨草原，正式背景「出发·草原路」P2 待出图，暂用 grassland_morning） =====
  {
    id: 'ch1_bridge_out_1',
    type: 'dialogue',
    background: 'bg/grassland_morning',
    // 跨场景：绝对声明重置舞台（幕间班/见留在塔楼，第一幕只有添同行）
    characters: [{ id: 'tian', portrait: 'tian/normal', position: 'left' }],
    speaker: '旁白',
    next: 'ch1_bridge_out_2'
  },
  {
    id: 'ch1_bridge_out_2',
    type: 'dialogue',
    background: 'bg/grassland_morning',
    speaker: '添',
    next: 'ch1_bridge_out_3'
  },
  {
    id: 'ch1_bridge_out_3',
    type: 'dialogue',
    background: 'bg/grassland_morning',
    speaker: '旁白',
    next: 'ch1_bridge_a1'
  },

  // ===== 场景A·帝桥边境（远景：bridge_wide，介绍大桥） =====
  {
    id: 'ch1_bridge_a1',
    type: 'dialogue',
    background: 'bg/bridge_wide',  // 帝桥远景特写（晴天全貌）
    speaker: '旁白',
    next: 'ch1_bridge_a2'
  },
  {
    id: 'ch1_bridge_a2',
    type: 'dialogue',
    background: 'bg/bridge_wide',
    speaker: '添',
    next: 'ch1_bridge_a3'
  },
  {
    id: 'ch1_bridge_a3',
    type: 'dialogue',
    background: 'bg/bridge_wide',
    speaker: '添',
    next: 'ch1_bridge_a4'
  },

  // ===== 场景A·帝桥哨卡（近景：bridge_checkpoint，盘查开始） =====
  {
    id: 'ch1_bridge_a4',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',  // 帝桥哨卡：哨卡+大河+大桥
    // 哨卡段舞台：添(左·同行) + 恪(右·哨卡对立位)
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'left' },
      { id: 'ke', portrait: 'ke/normal', position: 'right' },
    ],
    speaker: '旁白',
    next: 'ch1_bridge_a5'
  },
  {
    id: 'ch1_bridge_a5',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '恪',
    next: 'ch1_bridge_a6'
  },
  {
    id: 'ch1_bridge_a6',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '商贩',
    next: 'ch1_bridge_a7'
  },
  {
    id: 'ch1_bridge_a7',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '恪',
    next: 'ch1_bridge_a8'
  },
  {
    id: 'ch1_bridge_a8',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '添',
    next: 'ch1_bridge_a9'
  },
  {
    id: 'ch1_bridge_a9',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '旁白',
    next: 'ch1_bridge_a10'
  },
  {
    id: 'ch1_bridge_a10',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '恪',
    next: 'ch1_bridge_a11'
  },
  {
    id: 'ch1_bridge_a11',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '老人',
    next: 'ch1_bridge_a12'
  },
  {
    id: 'ch1_bridge_a12',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '恪',
    next: 'ch1_bridge_a13'
  },
  {
    id: 'ch1_bridge_a13',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '旁白',
    next: 'ch1_bridge_a14'
  },
  {
    id: 'ch1_bridge_a14',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '添',
    next: 'ch1_bridge_choice'
  },

  // ===== 核心选择①（三分支，先记录选择再走分支） =====
  // 变量 bridge_choice: 'guarantee'|'help'|'watch'，第二幕幸来访按此回响（剧本第557行）
  {
    id: 'ch1_bridge_choice',
    type: 'choice',
    background: 'bg/bridge_checkpoint',
    choices: [
      { impact: 'critical', next: 'ch1_bridge_g_set' },  // A. 我担保他，出了事算学院的！
      { impact: 'critical', next: 'ch1_bridge_h_set' },  // B. 军爷，孩子病着，通融通融呗
      { impact: 'critical', next: 'ch1_bridge_w_set' },  // C. （站着不动，看事态）
    ],
  },
  // -- 分支入口：记录选择变量 --
  {
    id: 'ch1_bridge_g_set',
    type: 'event',
    background: 'bg/bridge_checkpoint',
    setVariables: { bridge_choice: 'guarantee' },
    next: 'ch1_bridge_g_cond'
  },
  {
    id: 'ch1_bridge_h_set',
    type: 'event',
    background: 'bg/bridge_checkpoint',
    setVariables: { bridge_choice: 'help' },
    next: 'ch1_bridge_h1'
  },
  {
    id: 'ch1_bridge_w_set',
    type: 'event',
    background: 'bg/bridge_checkpoint',
    setVariables: { bridge_choice: 'watch' },
    next: 'ch1_bridge_w1'
  },

  // ----- 分支A：担保（按是否持有睿帝令走 condition） -----
  {
    id: 'ch1_bridge_g_cond',
    type: 'condition',
    background: 'bg/bridge_checkpoint',
    branches: [
      { if: { variables: { agreed_to_rui: true } }, next: 'ch1_bridge_g_yes_1' },  // 有令牌：亮令牌放行
      { else: true, next: 'ch1_bridge_g_no_1' },  // 无令牌：被拒但被记住
    ],
  },
  // -- 有令牌（台词18-24） --
  {
    id: 'ch1_bridge_g_yes_1',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '玩家',
    next: 'ch1_bridge_g_yes_2'
  },
  {
    id: 'ch1_bridge_g_yes_2',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '恪',
    next: 'ch1_bridge_g_yes_3'
  },
  {
    id: 'ch1_bridge_g_yes_3',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '旁白',
    next: 'ch1_bridge_g_yes_4'
  },
  {
    id: 'ch1_bridge_g_yes_4',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '恪',
    next: 'ch1_bridge_g_yes_5'
  },
  {
    id: 'ch1_bridge_g_yes_5',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '旁白',
    next: 'ch1_bridge_g_yes_6'
  },
  {
    id: 'ch1_bridge_g_yes_6',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '添',
    next: 'ch1_bridge_g_yes_7'
  },
  {
    id: 'ch1_bridge_g_yes_7',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '恪',
    next: 'ch1_village_b1'
  },
  // -- 无令牌（台词25-31） --
  {
    id: 'ch1_bridge_g_no_1',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '玩家',
    next: 'ch1_bridge_g_no_2'
  },
  {
    id: 'ch1_bridge_g_no_2',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '恪',
    next: 'ch1_bridge_g_no_3'
  },
  {
    id: 'ch1_bridge_g_no_3',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '恪',
    next: 'ch1_bridge_g_no_4'
  },
  {
    id: 'ch1_bridge_g_no_4',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '添',
    next: 'ch1_bridge_g_no_5'
  },
  {
    id: 'ch1_bridge_g_no_5',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '恪',
    next: 'ch1_bridge_g_no_6'
  },
  {
    id: 'ch1_bridge_g_no_6',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '旁白',
    next: 'ch1_bridge_g_no_7'
  },
  {
    id: 'ch1_bridge_g_no_7',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '添',
    next: 'ch1_village_b1'
  },

  // ----- 分支B：帮说话（台词32-36） -----
  {
    id: 'ch1_bridge_h1',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '玩家',
    next: 'ch1_bridge_h2'
  },
  {
    id: 'ch1_bridge_h2',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '恪',
    next: 'ch1_bridge_h3'
  },
  {
    id: 'ch1_bridge_h3',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '添',
    next: 'ch1_bridge_h4'
  },
  {
    id: 'ch1_bridge_h4',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '旁白',
    next: 'ch1_bridge_h5'
  },
  {
    id: 'ch1_bridge_h5',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '添',
    next: 'ch1_village_b1'
  },

  // ----- 分支C：不动（台词37-40） -----
  {
    id: 'ch1_bridge_w1',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '旁白',
    next: 'ch1_bridge_w2'
  },
  {
    id: 'ch1_bridge_w2',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '恪',
    next: 'ch1_bridge_w3'
  },
  {
    id: 'ch1_bridge_w3',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '旁白',
    next: 'ch1_bridge_w4'
  },
  {
    id: 'ch1_bridge_w4',
    type: 'dialogue',
    background: 'bg/bridge_checkpoint',
    speaker: '添',
    next: 'ch1_village_b1'
  },

  // ===== 三路汇合 → 场景B·草原村口 =====
  // 草原村口（正式背景 village_entrance 已出图入库）
  {
    id: 'ch1_village_b1',
    type: 'dialogue',
    background: 'bg/village_entrance',
    // 场景切换：恪退场，只留添（草原村口段无立绘角色）
    characters: [{ id: 'tian', portrait: 'tian/normal', position: 'left' }],
    speaker: '旁白',
    next: 'ch1_village_b2'
  },
  {
    id: 'ch1_village_b2',
    type: 'dialogue',
    background: 'bg/village_entrance',
    speaker: '老妇人',
    next: 'ch1_village_b3'
  },
  {
    id: 'ch1_village_b3',
    type: 'dialogue',
    background: 'bg/village_entrance',
    speaker: '帝国官员',
    next: 'ch1_village_b4'
  },
  {
    id: 'ch1_village_b4',
    type: 'dialogue',
    background: 'bg/village_entrance',
    speaker: '老妇人',
    next: 'ch1_village_b5'
  },
  {
    id: 'ch1_village_b5',
    type: 'dialogue',
    background: 'bg/village_entrance',
    speaker: '添',
    next: 'ch1_village_b6'
  },
  {
    id: 'ch1_village_b6',
    type: 'dialogue',
    background: 'bg/village_entrance',
    speaker: '旁白',
    next: 'ch1_village_b7'
  },
  {
    id: 'ch1_village_b7',
    type: 'dialogue',
    background: 'bg/village_entrance',
    speaker: '添',
    next: 'ch1_village_b8'
  },

  // ===== 回程（草原路） =====
  {
    id: 'ch1_village_b8',
    type: 'dialogue',
    background: 'bg/grassland_road',
    speaker: '旁白',
    next: 'ch1_village_b9'
  },
  {
    id: 'ch1_village_b9',
    type: 'dialogue',
    background: 'bg/grassland_road',
    speaker: '添',
    next: 'ch2_r1'  // 无缝衔接第二幕·风从北方来（回塔楼当晚）
  },

  // ================================================================
  // 第二幕·风从北方来（剧本第421-838行，台词2026-08-06全部定稿）
  // ================================================================
  //
  // 演出（演出设计-第一章-第二幕.md，方案乙 修订版）：
  //   复盘段：大厅+立绘（见右 serious/calm + 添左 normal）
  //   幸来访段前半（v1~v6 门口寒暄）：大厅+立绘（见左 serious + 幸右 smile）
  //   谈判段（v7 正式落谈→选择②→收尾前）：三张谈判全景图（对峙/幸看玩家/见看玩家），立绘层关闭
  //   收尾：幸离去后恢复立绘层（见+添）
  //   衔接段：自由活动热点（见/添/上二楼）→ 走廊班看月亮（CG-1）→ 房间

  // ===== 复盘段（一层大厅·夜） =====
  {
    id: 'ch2_r1',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/serious', position: 'right' },
      { id: 'tian', portrait: 'tian/normal', position: 'left' },
    ],
    speaker: '旁白',
    next: 'ch2_r2'
  },
  {
    id: 'ch2_r2',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch2_r3'
  },
  {
    id: 'ch2_r3',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '添',
    next: 'ch2_r4'
  },
  {
    id: 'ch2_r4',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '添',
    next: 'ch2_r5'
  },
  {
    id: 'ch2_r5',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '添',
    next: 'ch2_r6'
  },
  {
    id: 'ch2_r6',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch2_r7'
  },
  {
    id: 'ch2_r7',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '添',
    next: 'ch2_r8'
  },
  {
    id: 'ch2_r8',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch2_review_choice'
  },

  // ===== 判断选择（无推进后果，仅记录 review_choice，见微调后续信息释放） =====
  {
    id: 'ch2_review_choice',
    type: 'choice',
    background: 'bg/tower_interior_hall',
    choices: [
      { impact: 'critical', next: 'ch2_review_a_set' },  // A. 没准是用来卡脖子的
      { impact: 'critical', next: 'ch2_review_b_set' },  // B. 像在分化城邦
      { impact: 'critical', next: 'ch2_review_c_set' },  // C. 我不好说
    ],
  },
  {
    id: 'ch2_review_a_set',
    type: 'event',
    background: 'bg/tower_interior_hall',
    setVariables: { review_choice: 'a' },
    next: 'ch2_review_a'
  },
  {
    id: 'ch2_review_a',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch2_v1'
  },
  {
    id: 'ch2_review_b_set',
    type: 'event',
    background: 'bg/tower_interior_hall',
    setVariables: { review_choice: 'b' },
    next: 'ch2_review_b'
  },
  {
    id: 'ch2_review_b',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch2_v1'
  },
  {
    id: 'ch2_review_c_set',
    type: 'event',
    background: 'bg/tower_interior_hall',
    setVariables: { review_choice: 'c' },
    next: 'ch2_review_c'
  },
  {
    id: 'ch2_review_c',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch2_v1'
  },

  // ===== 幸来访段前半（v1 门口造访 → v2~v6 大厅寒暄） =====
  // v1：旁白通报 + 幸进门（造访图）。v7 起正式坐谈，切谈判全景（立绘关闭）
  {
    id: 'ch2_v1',
    type: 'dialogue',
    background: 'bg/ch2_xing_arrival',  // 幸二次造访·进门镜头
    // v1 用造访图（幸已画入背景），暂不开立绘层
    characters: [],
    speaker: '旁白',
    next: 'ch2_v2'
  },
  {
    id: 'ch2_v2',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',  // 切回大厅，立绘演出
    // 舞台切换：见 left serious，幸 right smile（门口寒暄）
    characters: [
      { id: 'dean', portrait: 'dean/serious', position: 'left' },
      { id: 'xing', portrait: 'xing/smile', position: 'right' },
    ],
    speaker: '幸',
    next: 'ch2_v3'
  },
  {
    id: 'ch2_v3',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch2_v4'
  },
  {
    id: 'ch2_v4',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '幸',
    next: 'ch2_v5'
  },
  {
    id: 'ch2_v5',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '幸',
    next: 'ch2_v6'
  },
  {
    id: 'ch2_v6',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch2_v7'
  },

  // ===== v7 起：正式落座谈判（切谈判全景图，立绘层关闭） =====
  {
    id: 'ch2_v7',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',  // 谈判全景·对峙（幸/见/添/班全部画入全景图）
    characters: [],  // 立绘层关闭
    speaker: '幸',
    next: 'ch2_v8'
  },
  {
    id: 'ch2_v8',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '见',
    next: 'ch2_echo_cond'
  },
  // 帝桥回响：幸看向玩家（四分支节点均切「幸看玩家」全景）
  {
    id: 'ch2_echo_cond',
    type: 'condition',
    background: 'bg/negotiation_xing_look',  // 谈判全景·幸看玩家
    branches: [
      { if: { variables: { bridge_choice: 'guarantee', agreed_to_rui: true } }, next: 'ch2_echo_emblem' },   // ①A-令牌
      { if: { variables: { bridge_choice: 'guarantee', agreed_to_rui: false } }, next: 'ch2_echo_noemblem' }, // ①A-无令牌
      { if: { variables: { bridge_choice: 'help' } }, next: 'ch2_echo_help' },                                 // ①B
      { else: true, next: 'ch2_echo_watch' },                                                                 // ①C（含未走过帝桥分支的兜底）
    ],
  },
  {
    id: 'ch2_echo_emblem',
    type: 'dialogue',
    background: 'bg/negotiation_xing_look',
    speaker: '幸',
    next: 'ch2_v10'
  },
  {
    id: 'ch2_echo_noemblem',
    type: 'dialogue',
    background: 'bg/negotiation_xing_look',
    speaker: '幸',
    next: 'ch2_v10'
  },
  {
    id: 'ch2_echo_help',
    type: 'dialogue',
    background: 'bg/negotiation_xing_look',
    speaker: '幸',
    next: 'ch2_v10'
  },
  {
    id: 'ch2_echo_watch',
    type: 'dialogue',
    background: 'bg/negotiation_xing_look',
    speaker: '幸',
    next: 'ch2_v10'
  },
  {
    id: 'ch2_v10',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_v11'
  },
  {
    id: 'ch2_v11',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_v12'
  },
  {
    id: 'ch2_v12',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '旁白',
    next: 'ch2_v13'
  },
  {
    id: 'ch2_v13',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '添',
    next: 'ch2_v14'
  },
  // 见看向玩家 → 切「见看玩家」全景（把选择权交给玩家）
  {
    id: 'ch2_v14',
    type: 'dialogue',
    background: 'bg/negotiation_dean_look',  // 谈判全景·见看玩家
    speaker: '见',
    next: 'ch2_choice'
  },

  // ===== 核心选择②（契约变量 contract: full|conditional|none|delay） =====
  {
    id: 'ch2_choice',
    type: 'choice',
    background: 'bg/negotiation_standoff',
    choices: [
      { impact: 'critical', next: 'ch2_choice_a_set' },  // A. 接！给帝国当狗是我的荣幸。
      { impact: 'critical', next: 'ch2_choice_b_set' },  // B. 我有条件。学院可不当帝国的走狗。
      { impact: 'critical', next: 'ch2_choice_c_set' },  // C. 不接，学院不掺和世俗。让上帝的归上帝，让凯撒的归凯撒。
      { impact: 'critical', next: 'ch2_choice_d_set' },  // D. 先不急，我们这边考虑几天。
    ],
  },

  // ----- 分支A：接（帝国合同工） -----
  {
    id: 'ch2_choice_a_set',
    type: 'event',
    background: 'bg/negotiation_standoff',
    setVariables: { contract: 'full' },
    next: 'ch2_a1'
  },
  {
    id: 'ch2_a1',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_a2'
  },
  {
    id: 'ch2_a2',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '见',
    next: 'ch2_a3'
  },
  {
    id: 'ch2_a3',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '旁白',
    next: 'ch2_a4'
  },
  {
    id: 'ch2_a4',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '旁白',
    next: 'ch2_a5'
  },
  {
    id: 'ch2_a5',
    type: 'event',
    background: 'bg/negotiation_standoff',
    grantItem: 'grassland_deed',  // 草原治属文书
    setVariables: { contract_deal: 'full' },
    next: 'ch2_a6'
  },
  {
    id: 'ch2_a6',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_end1'
  },

  // ----- 分支B：有条件（谈判树） -----
  {
    id: 'ch2_choice_b_set',
    type: 'event',
    background: 'bg/negotiation_standoff',
    setVariables: { contract: 'conditional' },
    next: 'ch2_b0'
  },
  {
    id: 'ch2_b0',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_b_choice'
  },
  {
    id: 'ch2_b_choice',
    type: 'choice',
    background: 'bg/negotiation_standoff',
    choices: [
      { impact: 'critical', next: 'ch2_ba0' },  // B-A. 学院可以为和平做出努力，但我需要帝国的承诺。
      { impact: 'critical', next: 'ch2_bb1' },  // B-B. 我想知道帝国具体想要什么？权力、地位、还是财富？
      { impact: 'critical', next: 'ch2_bc1' },  // B-C. 帝国是打算拿什么谈？
    ],
  },
  // -- B-A：要承诺 --
  {
    id: 'ch2_ba0',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_b_cond_choice'
  },
  // -- B-B：问帝国要什么（摸底后汇合条件选项） --
  {
    id: 'ch2_bb1',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_bb2'
  },
  {
    id: 'ch2_bb2',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_bb3'
  },
  {
    id: 'ch2_bb3',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_bb4'
  },
  {
    id: 'ch2_bb4',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '见',
    next: 'ch2_bb5'
  },
  {
    id: 'ch2_bb5',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_bb6'
  },
  {
    id: 'ch2_bb6',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_b_cond_choice'
  },
  // -- B-C：拿什么谈（摸底后汇合条件选项） --
  {
    id: 'ch2_bc1',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_bc2'
  },
  {
    id: 'ch2_bc2',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_bc3'
  },
  {
    id: 'ch2_bc3',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_bc4'
  },
  {
    id: 'ch2_bc4',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '见',
    next: 'ch2_bc5'
  },
  {
    id: 'ch2_bc5',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '见',
    next: 'ch2_bc6'
  },
  {
    id: 'ch2_bc6',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_bc7'
  },
  {
    id: 'ch2_bc7',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_b_cond_choice'
  },
  // -- 条件选项（B-A 直接进 / B-B、B-C 汇合进） --
  {
    id: 'ch2_b_cond_choice',
    type: 'choice',
    background: 'bg/negotiation_standoff',
    choices: [
      { impact: 'critical', next: 'ch2_baaa1' },  // B-A-A. 帝国不能武装进入城邦，不干涉城邦的内政。
      { impact: 'critical', next: 'ch2_bab1' },   // B-A-B. 帝国需要为草原人民的生存负责。
      { impact: 'critical', next: 'ch2_bac1' },   // B-A-C. 帝国需要为草原上的虚空裂隙负责。
    ],
  },
  // ---- B-A-A：不武装入城邦（教团城邦线） ----
  {
    id: 'ch2_baaa1',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_baaa2'
  },
  {
    id: 'ch2_baaa2',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_baaa3'
  },
  {
    id: 'ch2_baaa3',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_baaa3_ask'
  },
  {
    id: 'ch2_baaa3_ask',  // 玩家追问
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '玩家',
    next: 'ch2_baaa4'
  },
  {
    id: 'ch2_baaa4',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_baaa5'
  },
  {
    id: 'ch2_baaa5',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '班',
    next: 'ch2_baaa6'
  },
  {
    id: 'ch2_baaa6',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_baaa_choice'
  },
  {
    id: 'ch2_baaa_choice',
    type: 'choice',
    background: 'bg/negotiation_standoff',
    choices: [
      { impact: 'critical', next: 'ch2_baaaa1' },  // B-A-A-A. 接了，我们尽快清除。
      { impact: 'critical', next: 'ch2_baaab1' },  // B-A-A-B. 我们讨论别的条件吧。
    ],
  },
  // B-A-A-A：接清除（防卫协约）
  {
    id: 'ch2_baaaa1',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_baaaa2'
  },
  {
    id: 'ch2_baaaa2',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '见',
    next: 'ch2_baaaa3'
  },
  {
    id: 'ch2_baaaa3',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_baaaa4'
  },
  {
    id: 'ch2_baaaa4',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '添',
    next: 'ch2_baaaa5'
  },
  {
    id: 'ch2_baaaa5',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '见',
    next: 'ch2_baaaa6'
  },
  {
    id: 'ch2_baaaa6',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '添',
    next: 'ch2_baaaa7'
  },
  {
    id: 'ch2_baaaa7',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '旁白',
    next: 'ch2_baaaa8'
  },
  {
    id: 'ch2_baaaa8',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '旁白',
    next: 'ch2_baaaa9'
  },
  {
    id: 'ch2_baaaa9',
    type: 'event',
    background: 'bg/negotiation_standoff',
    grantItem: 'grassland_deed',
    setVariables: { contract_deal: 'defense' },
    next: 'ch2_baaaa10'
  },
  {
    id: 'ch2_baaaa10',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_end1'
  },
  // B-A-A-B：换条件（底线试探）
  {
    id: 'ch2_baaab1',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '见',
    next: 'ch2_baaab2'
  },
  {
    id: 'ch2_baaab2',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_baaab3'
  },
  {
    id: 'ch2_baaab3',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '见',
    next: 'ch2_baaab4'
  },
  {
    id: 'ch2_baaab4',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_baaab5'
  },
  {
    id: 'ch2_baaab5',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '见',
    next: 'ch2_baaab6'
  },
  {
    id: 'ch2_baaab6',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_baaab7'
  },
  {
    id: 'ch2_baaab7',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '见',
    next: 'ch2_baaab8'
  },
  {
    id: 'ch2_baaab8',
    type: 'event',
    background: 'bg/negotiation_standoff',
    grantItem: 'grassland_deed',
    setVariables: { contract_deal: 'baseline' },
    next: 'ch2_baaab9'
  },
  {
    id: 'ch2_baaab9',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_end1'
  },
  // ---- B-A-B：生存负责（庇护协约） ----
  {
    id: 'ch2_bab1',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_bab2'
  },
  {
    id: 'ch2_bab2',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_bab3'
  },
  {
    id: 'ch2_bab3',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_bab4'
  },
  {
    id: 'ch2_bab4',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '见',
    next: 'ch2_bab5'
  },
  {
    id: 'ch2_bab5',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_bab6'
  },
  {
    id: 'ch2_bab6',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '见',
    next: 'ch2_bab7'
  },
  {
    id: 'ch2_bab7',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_bab8'
  },
  {
    id: 'ch2_bab8',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '见',
    next: 'ch2_bab9'
  },
  {
    id: 'ch2_bab9',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_bab10'
  },
  {
    id: 'ch2_bab10',
    type: 'event',
    background: 'bg/negotiation_standoff',
    grantItem: 'grassland_deed',
    setVariables: { contract_deal: 'asylum' },
    next: 'ch2_bab11'
  },
  {
    id: 'ch2_bab11',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_end1'
  },
  // ---- B-A-C：虚空裂隙负责（技术协约） ----
  {
    id: 'ch2_bac1',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_bac2'
  },
  {
    id: 'ch2_bac2',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_bac3'
  },
  {
    id: 'ch2_bac3',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_bac4'
  },
  {
    id: 'ch2_bac4',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '见',
    next: 'ch2_bac5'
  },
  {
    id: 'ch2_bac5',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_bac6'
  },
  {
    id: 'ch2_bac6',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '见',
    next: 'ch2_bac7'
  },
  {
    id: 'ch2_bac7',
    type: 'event',
    background: 'bg/negotiation_standoff',
    grantItem: 'grassland_deed',
    setVariables: { contract_deal: 'tech' },
    next: 'ch2_bac8'
  },
  {
    id: 'ch2_bac8',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_end1'
  },

  // ----- 分支C：不接（保持独立） -----
  {
    id: 'ch2_choice_c_set',
    type: 'event',
    background: 'bg/negotiation_standoff',
    setVariables: { contract: 'none' },
    next: 'ch2_c1'
  },
  {
    id: 'ch2_c1',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_c2'
  },
  {
    id: 'ch2_c2',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_c3'
  },
  {
    id: 'ch2_c3',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '见',
    next: 'ch2_end1'
  },

  // ----- 分支D：拖（暧昧） -----
  {
    id: 'ch2_choice_d_set',
    type: 'event',
    background: 'bg/negotiation_standoff',
    setVariables: { contract: 'delay' },
    next: 'ch2_d1'
  },
  {
    id: 'ch2_d1',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_d2'
  },
  {
    id: 'ch2_d2',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_end1'
  },

  // ===== 收尾（幸离去，恢复立绘层） =====
  {
    id: 'ch2_end1',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    characters: [],  // 幸起身说话，仍画在全景图中，立绘层保持关闭
    speaker: '幸',
    next: 'ch2_end2'
  },
  {
    id: 'ch2_end2',
    type: 'dialogue',
    background: 'bg/negotiation_standoff',
    speaker: '幸',
    next: 'ch2_end3'
  },
  {
    id: 'ch2_end3',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',  // 幸离去，切回大厅实景
    characters: [
      { id: 'dean', portrait: 'dean/calm', position: 'right' },
      { id: 'tian', portrait: 'tian/normal', position: 'left' },
    ],  // 幸离场后恢复立绘层（见+添回到大厅）
    speaker: '旁白',
    next: 'ch2_end4_cond'
  },
  // 添收尾按选择②分支四选一（幸已离去，大厅实景+见/添立绘）
  {
    id: 'ch2_end4_cond',
    type: 'condition',
    background: 'bg/tower_interior_hall',
    branches: [
      { if: { variables: { contract: 'full' } }, next: 'ch2_end4_full' },
      { if: { variables: { contract: 'conditional' } }, next: 'ch2_end4_conditional' },
      { if: { variables: { contract: 'none' } }, next: 'ch2_end4_none' },
      { else: true, next: 'ch2_end4_delay' },  // delay 及兜底
    ],
  },
  {
    id: 'ch2_end4_full',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '添',
    next: 'ch2_end5'
  },
  {
    id: 'ch2_end4_conditional',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '添',
    next: 'ch2_end5'
  },
  {
    id: 'ch2_end4_none',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '添',
    next: 'ch2_end5'
  },
  {
    id: 'ch2_end4_delay',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '添',
    next: 'ch2_end5'
  },
  {
    id: 'ch2_end5',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'ch2_free1'
  },

  // ===== 衔接段·自由活动（热点） =====
  {
    id: 'ch2_free1',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'ch2_free_end'
  },
  {
    id: 'ch2_free_end',
    type: 'end',
    background: 'bg/tower_interior_hall',
    hotspots: [
      { id: 'free_dean', x: 22, y: 68, label: '见', icon: '📖',
        action: { type: 'goto', target: 'ch2_free_dean1' } },
      { id: 'free_tian', x: 72, y: 60, label: '添', icon: '🔧',
        action: { type: 'goto', target: 'ch2_free_tian1' } },
      { id: 'go_upstairs', x: 50, y: 20, label: '上二楼', icon: '🪜',
        action: { type: 'goto', target: 'ch2_moon1' } },
    ]
  },
  // -- 见热点：为什么让我做这么大的选择（学院立场） --
  {
    id: 'ch2_free_dean1',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch2_free_dean_choice'
  },
  {
    id: 'ch2_free_dean_choice',
    type: 'choice',
    background: 'bg/tower_interior_hall',
    choices: [
      { impact: 'critical', next: 'ch2_free_dean_qa1' },  // 为什么让我来做这么大的选择？
      { impact: 'critical', next: 'ch2_free_end' },       // （不再追问）
    ],
  },
  {
    id: 'ch2_free_dean_qa1',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch2_free_dean_qa2'
  },
  {
    id: 'ch2_free_dean_qa2',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch2_free_end'
  },
  // -- 添热点 --
  {
    id: 'ch2_free_tian1',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '添',
    next: 'ch2_free_end'
  },

  // ===== 衔接段·二楼走廊·夜（班看月亮，CG-1 复用） =====
  {
    id: 'ch2_moon1',
    type: 'dialogue',
    background: 'bg/ban_corridor_moon',  // CG-1 定稿：走廊尽头拱窗+班窗边（已出图）
    characters: [],  // 班画入背景，无立绘
    speaker: '旁白',
    next: 'ch2_moon2'
  },
  {
    id: 'ch2_moon2',
    type: 'dialogue',
    background: 'bg/ban_corridor_moon',
    speaker: '班',
    next: 'ch2_moon3'
  },
  {
    id: 'ch2_moon3',
    type: 'dialogue',
    background: 'bg/ban_corridor_moon',
    speaker: '班',
    next: 'ch2_moon4'
  },
  {
    id: 'ch2_moon4',
    type: 'dialogue',
    background: 'bg/ban_corridor_moon',
    speaker: '班',
    next: 'ch2_moon5'
  },
  {
    id: 'ch2_moon5',
    type: 'dialogue',
    background: 'bg/ban_corridor_moon',
    speaker: '班',
    next: 'ch2_moon6'
  },
  {
    id: 'ch2_moon6',
    type: 'dialogue',
    background: 'bg/ban_corridor_moon',
    speaker: '班',
    next: 'ch2_moon_choice'
  },
  {
    id: 'ch2_moon_choice',
    type: 'choice',
    background: 'bg/ban_corridor_moon',
    choices: [
      { impact: 'critical', next: 'ch2_room1' },   // 回房间休息（进入第三幕过渡）
      { impact: 'critical', next: 'ch2_moon_talk1' },  // 再聊两句（班多回一两句，仍回到选择）
    ],
  },
  {
    id: 'ch2_moon_talk1',
    type: 'dialogue',
    background: 'bg/ban_corridor_moon',
    speaker: '班',
    next: 'ch2_moon_talk2'
  },
  {
    id: 'ch2_moon_talk2',
    type: 'dialogue',
    background: 'bg/ban_corridor_moon',
    speaker: '班',
    next: 'ch2_moon_choice'
  },

  // ===== 衔接段·房间·夜 =====
  {
    id: 'ch2_room1',
    type: 'dialogue',
    background: 'bg/tower_room_night',
    speaker: '旁白',
    next: 'ch2_act2_end'
  },
  {
    id: 'ch2_act2_end',
    type: 'dialogue',  // 无文本过渡节点：第二幕收尾 → 第三幕开场（点击即推进）
    background: 'bg/tower_room_night',
    next: 'ch3_v_cond',  // 无缝衔接第三幕·东来的信（时间跳跃由第三幕开场旁白承接）
  },

  // ================================================================
  // 第三幕·东来的信（共和国事变·传闻）—— 段七前（R-035 空间机制实验段）
  // ================================================================
  //
  // 演出（演出设计-第一章-第三幕.md）：
  //   商队段/段六：大厅立绘演出（见右 serious→calm + 添左 normal），商人无立绘
  //   过渡段：进入大厅探索态（角色入画背景图，立绘层关闭）——见/添 Q&A + 上二楼（班）+ 回房睡觉
  //   段七起：信使段（台词未定稿，ch3_morning1 占位结束）
  //
  // 舞台位置全幕统一"见右添左"（院长 2026-08-07 定）。
  // 空间机制：explore 节点属性（end/dialogue 均可带）→ 探索态；LOCATIONS 地点图驱动。

  // ===== 开场（contract 双版本旁白：选择② 选 D 拖三天 → 回响） =====
  {
    id: 'ch3_v_cond',
    type: 'condition',
    background: 'bg/tower_interior_hall',
    branches: [
      { if: { variables: { contract: 'delay' } }, next: 'ch3_v_delay' },   // 选 D：没等到幸的造访
      { else: true, next: 'ch3_v_nodelay' },                               // 未选 D：帝桥的风声
    ],
  },
  {
    id: 'ch3_v_nodelay',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'ch3_m1',
  },
  {
    id: 'ch3_v_delay',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'ch3_m1',
  },

  // ===== 商队段（商人甲乙丙无立绘，见/添立绘演出） =====
  {
    id: 'ch3_m1',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    location: 'hall',  // 信息性：剧情发生地（空间状态同步）
    characters: [
      { id: 'dean', portrait: 'dean/serious', position: 'right' },
      { id: 'tian', portrait: 'tian/normal', position: 'left' },
    ],
    speaker: '商人甲',
    next: 'ch3_m2',
  },
  {
    id: 'ch3_m2',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch3_m3',
  },
  {
    id: 'ch3_m3',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '商人甲',
    next: 'ch3_m4',
  },
  {
    id: 'ch3_m4',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'ch3_m5',
  },
  {
    id: 'ch3_m5',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '商人乙',
    next: 'ch3_m6',
  },
  {
    id: 'ch3_m6',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'ch3_m7',
  },
  {
    id: 'ch3_m7',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '商人丙',
    next: 'ch3_m8',
  },
  {
    id: 'ch3_m8',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'ch3_m9',
  },
  {
    id: 'ch3_m9',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '添',
    next: 'ch3_m10',
  },
  {
    id: 'ch3_m10',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch3_m11',
  },
  {
    id: 'ch3_m11',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '商人乙',
    next: 'ch3_m12',
  },
  {
    id: 'ch3_m12',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '添',
    next: 'ch3_m13',
  },
  {
    id: 'ch3_m13',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch3_m14',
  },
  {
    id: 'ch3_m14',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'ch3_d1',
  },

  // ===== 段六·见与添定调对话 + 判断选择（benefit_choice） =====
  {
    id: 'ch3_d1',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '添',
    next: 'ch3_d2',
  },
  {
    id: 'ch3_d2',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch3_d3',
  },
  {
    id: 'ch3_d3',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '添',
    next: 'ch3_d4',
  },
  {
    id: 'ch3_d4',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '添',
    next: 'ch3_d5',
  },
  {
    id: 'ch3_d5',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch3_d6',
  },
  {
    id: 'ch3_d6',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '添',
    next: 'ch3_d7',
  },
  {
    id: 'ch3_d7',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch3_d8',
  },
  {
    id: 'ch3_d8',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch3_d9',
  },
  {
    id: 'ch3_d9',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '添',
    next: 'ch3_d10',
  },
  {
    id: 'ch3_d10',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '添',
    next: 'ch3_d11',
  },
  {
    id: 'ch3_d11',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch3_benefit_choice',
  },
  // 判断选择（记录 benefit_choice，同 review_choice 模式，无推进后果）
  {
    id: 'ch3_benefit_choice',
    type: 'choice',
    background: 'bg/tower_interior_hall',
    choices: [
      { impact: 'critical', next: 'ch3_benefit_set_a' },  // A. 帝国，timing 抓太准了吧
      { impact: 'critical', next: 'ch3_benefit_set_b' },  // B. 丘，他成总统了
      { impact: 'critical', next: 'ch3_benefit_set_c' },  // C. 杰，他打算为沙漠报仇
      { impact: 'critical', next: 'ch3_benefit_set_d' },  // D. 虚空教团，格局更混乱了
    ],
  },
  {
    id: 'ch3_benefit_set_a',
    type: 'event',
    background: 'bg/tower_interior_hall',
    setVariables: { benefit_choice: 'empire' },
    next: 'ch3_d12',
  },
  {
    id: 'ch3_benefit_set_b',
    type: 'event',
    background: 'bg/tower_interior_hall',
    setVariables: { benefit_choice: 'qiu' },
    next: 'ch3_d12',
  },
  {
    id: 'ch3_benefit_set_c',
    type: 'event',
    background: 'bg/tower_interior_hall',
    setVariables: { benefit_choice: 'jie' },
    next: 'ch3_d12',
  },
  {
    id: 'ch3_benefit_set_d',
    type: 'event',
    background: 'bg/tower_interior_hall',
    setVariables: { benefit_choice: 'cult' },
    next: 'ch3_d12',
  },
  {
    id: 'ch3_d12',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch3_d13',
  },
  {
    id: 'ch3_d13',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'ch3_free1',
  },

  // ===== 过渡段：进入大厅探索态（R-035 空间机制实验） =====
  // end 节点带 explore → 段落终结进入探索态（不结束章节）
  {
    id: 'ch3_free1',
    type: 'end',
    background: 'bg/tower_interior_hall',
    explore: true,
    location: 'hall',
  },

  // ===== 见 Q&A（循环，选 D 回探索态） =====
  {
    id: 'ch3_free_dean',
    type: 'choice',
    background: 'bg/tower_interior_hall',
    choices: [
      { impact: 'critical', next: 'ch3_fd_a1' },  // A. 丘是什么人？
      { impact: 'critical', next: 'ch3_fd_b1' },  // B. 沙漠那帮人跟共和国具体啥关系？
      { impact: 'critical', next: 'ch3_fd_c1' },  // C. 虚空教团也能搞出飞机吗？
      { impact: 'critical', next: 'ch3_free1' },  // D. 没事了（回探索态）
    ],
  },
  {
    id: 'ch3_fd_a1',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch3_fd_a2',
  },
  {
    id: 'ch3_fd_a2',
    type: 'choice',
    background: 'bg/tower_interior_hall',
    choices: [
      { impact: 'critical', next: 'ch3_fd_a3' },   // 追问：那他怎么还能当总统的？
      { impact: 'critical', next: 'ch3_free_dean' },  // 回菜单
    ],
  },
  {
    id: 'ch3_fd_a3',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch3_free_dean',
  },
  {
    id: 'ch3_fd_b1',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch3_fd_b2',
  },
  {
    id: 'ch3_fd_b2',
    type: 'choice',
    background: 'bg/tower_interior_hall',
    choices: [
      { impact: 'critical', next: 'ch3_fd_b3' },   // B+. 杰是什么人？
      { impact: 'critical', next: 'ch3_free_dean' },  // 回菜单
    ],
  },
  {
    id: 'ch3_fd_b3',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch3_free_dean',
  },
  {
    id: 'ch3_fd_c1',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '见',
    next: 'ch3_free_dean',
  },

  // ===== 添 Q&A（循环，选 D 回探索态；B 照片查看占位） =====
  {
    id: 'ch3_free_tian',
    type: 'choice',
    background: 'bg/tower_interior_hall',
    choices: [
      { impact: 'critical', next: 'ch3_ft_a1' },  // A. 丘是什么人？
      { impact: 'critical', next: 'ch3_ft_b1' },  // B. 让我也看看照片
      { impact: 'critical', next: 'ch3_ft_c1' },  // C. 照片谁拍的？
      { impact: 'critical', next: 'ch3_free1' },  // D. 没事了（回探索态）
    ],
  },
  {
    id: 'ch3_ft_a1',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '添',
    next: 'ch3_ft_a2',
  },
  {
    id: 'ch3_ft_a2',
    type: 'choice',
    background: 'bg/tower_interior_hall',
    choices: [
      { impact: 'critical', next: 'ch3_ft_a3' },   // 追问：那他怎么还能当总统的？
      { impact: 'critical', next: 'ch3_free_tian' },  // 回菜单
    ],
  },
  {
    id: 'ch3_ft_a3',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '添',
    next: 'ch3_free_tian',
  },
  {
    id: 'ch3_ft_b1',  // TODO: 照片查看演出（圆桌桌面场景图 P1 未出，先文字占位）
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'ch3_ft_b2',
  },
  {
    id: 'ch3_ft_b2',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '添',
    next: 'ch3_free_tian',
  },
  {
    id: 'ch3_ft_c1',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '添',
    next: 'ch3_ft_c2',
  },
  {
    id: 'ch3_ft_c2',
    type: 'choice',
    background: 'bg/tower_interior_hall',
    choices: [
      { impact: 'critical', next: 'ch3_ft_c3' },   // 追问：我们的人？
      { impact: 'critical', next: 'ch3_free_tian' },  // 回菜单
    ],
  },
  {
    id: 'ch3_ft_c3',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '添',
    next: 'ch3_free_tian',
  },

  // ===== 二楼走廊·班（corridor 探索态：onEnter 演出 → 探索） =====
  {
    id: 'ch3_corridor_enter',  // 地点 onEnter 演出链起始（travelTo 触发）
    type: 'dialogue',
    background: 'bg/ban_corridor_moon',
    speaker: '旁白',
    next: 'ch3_corridor_enter2',
  },
  {
    id: 'ch3_corridor_enter2',  // 链尾：回到走廊探索态
    type: 'end',
    background: 'bg/ban_corridor_moon',
    explore: true,
    location: 'corridor',
  },
  {
    id: 'ch3_free_ban1',
    type: 'dialogue',
    background: 'bg/ban_corridor_moon',
    speaker: '班',
    next: 'ch3_free_ban2',
  },
  {
    id: 'ch3_free_ban2',
    type: 'dialogue',
    background: 'bg/ban_corridor_moon',
    speaker: '班',
    next: 'ch3_free_ban3',
  },
  {
    id: 'ch3_free_ban3',
    type: 'dialogue',
    background: 'bg/ban_corridor_moon',
    speaker: '班',
    next: 'ch3_free_ban4',
  },
  {
    id: 'ch3_free_ban4',
    type: 'dialogue',
    background: 'bg/ban_corridor_moon',
    speaker: '班',
    next: 'ch3_free_ban_end',
  },
  {
    id: 'ch3_free_ban_end',  // 对话结束回走廊探索态
    type: 'end',
    background: 'bg/ban_corridor_moon',
    explore: true,
    location: 'corridor',
  },

  // ===== 回房睡觉 → 段七衔接（信使段台词未定稿，占位） =====
  {
    id: 'ch3_sleep1',
    type: 'dialogue',
    background: 'bg/tower_room_night',
    speaker: '旁白',
    next: 'ch3_morning1',
  },
  {
    id: 'ch3_morning1',  // 段七占位：清早下楼撞见信使（台词定稿后接线）
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'ch3_act3_end',
  },
  {
    id: 'ch3_act3_end',
    type: 'end',
    background: 'bg/tower_interior_hall',
  },
]
