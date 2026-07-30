/**
 * 序章：漂泊者降临 -- 逻辑骨架
 *
 * ⚠️ 本文件只含逻辑（type/background/characters/next/effects/branches 等）。
 *    文案（text/choices 文案/placeholder）已迁移到 data/scripts/ 下，改台词请改那里。
 *    加载时由 visualNovelStore.js 的 CHAPTER_LOADERS 调用 mergeScript() 合并。
 *
 * 时间线：A.V.118（三线剧变前夕），学院已扎根 3 年
 * 玩家：第二批传送来的地球成员（漂泊者），刚到，对异世界一无所知
 *
 * 四幕结构：
 *   第一幕：降临（旁白 + 院长迎接）
 *   第二幕：法刺来访（幸试探 + 自命名 + 四选项 ABCD）
 *   第三幕：储物发放（纳戒 + 睿帝令条件分支）
 *   第四幕：自由探索（添 Q&A，6 信息话题 + 1 关键结束）
 *
 * 选项 impact 设计：
 *   🟡 critical（标黄）= 推进剧情/不可逆
 *   ⚪ info（标白）= 信息补充，选完返回可继续选
 *
 * 剧本格式说明见 engine/types.js
 */

export default [
  // ================================================================
  // 第一幕：降临
  // ================================================================

  // ===== 场景1：开场旁白 =====
  {
    id: 'pro_001',
    type: 'dialogue',
    background: 'bg/void_world',
    bgm: 'music/prologue',
    speaker: '旁白',
    next: 'pro_002'
  },
  {
    id: 'pro_002',
    type: 'dialogue',
    background: 'bg/void_world',
    speaker: '旁白',
    next: 'pro_003'
  },
  {
    id: 'pro_003',
    type: 'dialogue',
    background: 'bg/void_world',
    speaker: '旁白',
    next: 'pro_004'
  },
  {
    id: 'pro_004',
    type: 'dialogue',
    background: 'bg/void_world',
    speaker: '旁白',
    next: 'pro_005'
  },

  // ===== 场景2：塔楼降临 =====
  {
    id: 'pro_005',
    type: 'dialogue',
    background: 'bg/grassland',
    speaker: '旁白',
    next: 'pro_006'
  },
  {
    id: 'pro_006',
    type: 'dialogue',
    background: 'bg/grassland',
    speaker: '旁白',
    next: 'pro_007'
  },
  {
    id: 'pro_007',
    type: 'dialogue',
    background: 'bg/grassland',
    speaker: '旁白',
    next: 'pro_008'
  },
  {
    id: 'pro_008',
    type: 'dialogue',
    background: 'bg/grassland',
    speaker: '旁白',
    next: 'pro_009'
  },

  // ===== 场景3：此刻你站在塔楼门口 =====
  {
    id: 'pro_009',
    type: 'dialogue',
    background: 'bg/tower_day',
    speaker: '旁白',
    next: 'pro_010'
  },
  {
    id: 'pro_010',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'pro_011'
  },

  // ===== 院长出场 =====
  {
    id: 'pro_011',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/gentle', position: 'center', active: true },
    ],
    speaker: '见',
    next: 'pro_012'
  },
  {
    id: 'pro_012',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/gentle', position: 'center', active: true },
    ],
    speaker: '旁白',
    next: 'pro_013'
  },
  {
    id: 'pro_013',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/gentle', position: 'center', active: true },
    ],
    speaker: '见',
    next: 'pro_014'
  },
  {
    id: 'pro_014',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/gentle', position: 'center', active: true },
    ],
    speaker: '见',
    next: 'pro_015'
  },
  {
    id: 'pro_015',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/gentle', position: 'center', active: true },
    ],
    speaker: '见',
    next: 'pro_016'
  },
  {
    id: 'pro_016',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/gentle', position: 'center', active: true },
    ],
    speaker: '见',
    next: 'pro_017'
  },
  {
    id: 'pro_017',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/gentle', position: 'center', active: true },
    ],
    speaker: '见',
    next: 'pro_018'
  },
  {
    id: 'pro_018',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'pro_019'
  },
  {
    id: 'pro_019',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/gentle', position: 'center', active: true },
    ],
    speaker: '见',
    next: 'pro_020'
  },
  {
    id: 'pro_020',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/gentle', position: 'center', active: true },
    ],
    speaker: '见',
    next: 'pro_021'
  },
  {
    id: 'pro_021',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'pro_022'
  },
  {
    id: 'pro_022',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/serious', position: 'center', active: true },
    ],
    speaker: '见',
    next: 'pro_023'
  },
  {
    id: 'pro_023',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'pro_101'
  },

  // ================================================================
  // 第二幕：法刺来访
  // ================================================================

  // ===== 幸登场 =====
  {
    id: 'pro_101',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/calm', position: 'left', active: true },
    ],
    speaker: '见',
    next: 'pro_102'
  },
  {
    id: 'pro_102',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',  // 过场：幸从晨雾中走来（角色入画氛围图，无立绘）
    speaker: '旁白',
    next: 'pro_103'
  },
  {
    id: 'pro_103',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'xing', portrait: 'xing/smile', position: 'center', active: true },
      { id: 'dean', portrait: 'dean/calm', position: 'left', active: false },
    ],
    speaker: '幸',
    next: 'pro_104'
  },
  {
    id: 'pro_104',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/calm', position: 'left', active: true },
      { id: 'xing', portrait: 'xing/smile', position: 'center', active: false },
    ],
    speaker: '见',
    next: 'pro_105'
  },
  {
    id: 'pro_105',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'xing', portrait: 'xing/smile', position: 'center', active: true },
      { id: 'dean', portrait: 'dean/calm', position: 'left', active: false },
    ],
    speaker: '幸',
    next: 'pro_106'
  },
  {
    id: 'pro_106',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'pro_107'
  },
  {
    id: 'pro_107',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'xing', portrait: 'xing/smile', position: 'center', active: true },
    ],
    speaker: '幸',
    next: 'pro_108'
  },
  {
    id: 'pro_108',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/calm', position: 'left', active: true },
    ],
    speaker: '见',
    next: 'pro_109'
  },
  {
    id: 'pro_109',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'xing', portrait: 'xing/smile', position: 'center', active: true },
    ],
    speaker: '幸',
    next: 'pro_110'
  },
  {
    id: 'pro_110',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'pro_111'
  },

  // ===== 幸注意到玩家 =====
  {
    id: 'pro_111',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'xing', portrait: 'xing/observe', position: 'center', active: true },
    ],
    speaker: '幸',
    next: 'pro_112'
  },
  {
    id: 'pro_112',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/calm', position: 'left', active: true },
    ],
    speaker: '见',
    next: 'pro_113'
  },
  {
    id: 'pro_113',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'pro_114'
  },
  {
    id: 'pro_114',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'xing', portrait: 'xing/observe', position: 'center', active: true },
    ],
    speaker: '幸',
    next: 'pro_115'
  },
  {
    id: 'pro_115',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'pro_116'
  },
  {
    id: 'pro_116',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'xing', portrait: 'xing/observe', position: 'center', active: true },
    ],
    speaker: '幸',
    next: 'pro_117'
  },
  {
    id: 'pro_117',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/calm', position: 'left', active: true },
    ],
    speaker: '见',
    next: 'pro_118'
  },
  {
    id: 'pro_118',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'xing', portrait: 'xing/observe', position: 'center', active: true },
    ],
    speaker: '幸',
    next: 'pro_brief_1'
  },

  // ===== 幸科普现状（pro_brief_1~3）=====
  {
    id: 'pro_brief_1',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'xing', portrait: 'xing/observe', position: 'center', active: true },
    ],
    speaker: '幸',
    next: 'pro_brief_2'
  },
  {
    id: 'pro_brief_2',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'xing', portrait: 'xing/observe', position: 'center', active: true },
    ],
    speaker: '幸',
    next: 'pro_brief_3'
  },
  {
    id: 'pro_brief_3',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'pro_119'
  },
  {
    id: 'pro_119',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'xing', portrait: 'xing/observe', position: 'center', active: true },
    ],
    speaker: '幸',
    next: 'pro_120'
  },
  {
    id: 'pro_120',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'pro_121'
  },
  {
    id: 'pro_121',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'xing', portrait: 'xing/observe', position: 'center', active: true },
    ],
    speaker: '幸',
    next: 'pro_122'
  },
  {
    id: 'pro_122',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/calm', position: 'left', active: true },
    ],
    speaker: '见',
    next: 'pro_123'
  },
  {
    id: 'pro_123',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'pro_124'
  },

  // ===== 自命名 input 节点 =====
  {
    id: 'pro_124',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'xing', portrait: 'xing/observe', position: 'center', active: true },
    ],
    speaker: '幸',
    next: 'pro_125'
  },
  {
    id: 'pro_125',
    type: 'input',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'xing', portrait: 'xing/observe', position: 'center', active: true },
    ],
    speaker: '幸',
    variable: 'playerName',
    next: 'pro_126'
  },
  {
    id: 'pro_126',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'xing', portrait: 'xing/observe', position: 'center', active: true },
    ],
    speaker: '幸',
    next: 'pro_127'
  },
  {
    id: 'pro_127',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'pro_128'
  },
  {
    id: 'pro_128',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'xing', portrait: 'xing/observe', position: 'center', active: true },
    ],
    speaker: '幸',
    next: 'pro_choice_1'
  },

  // ===== 核心选择：五选项（A/B/C critical，D/E info）=====
  {
    id: 'pro_choice_1',
    type: 'choice',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'xing', portrait: 'xing/observe', position: 'center', active: true },
    ],
    choices: [
      { impact: 'critical', next: 'pro_agree_1', effects: { rui: 5 } },
      { impact: 'critical', next: 'pro_refuse_1', effects: { rui: 0 } },
      { impact: 'critical', next: 'pro_delay_1' },
      { impact: 'info', next: 'pro_ask_rui_1' },
      { impact: 'info', next: 'pro_ask_city_1' },
    ],
  },

  // ----- 分支C：缓几天（critical，添救场→接入Q&A→回choice）-----
  {
    id: 'pro_delay_1',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'xing', portrait: 'xing/smile', position: 'center', active: true },
    ],
    speaker: '旁白',
    next: 'pro_delay_2'
  },
  {
    id: 'pro_delay_2',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
      { id: 'xing', portrait: 'xing/smile', position: 'right', active: false },
    ],
    speaker: '添',
    next: 'pro_delay_3'
  },
  {
    id: 'pro_delay_3',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/calm', position: 'center', active: true },
      { id: 'xing', portrait: 'xing/smile', position: 'right', active: false },
    ],
    speaker: '见',
    next: 'pro_delay_4'
  },
  {
    id: 'pro_delay_4',
    type: 'event',
    background: 'bg/tower_interior_hall',
    setVariables: { met_tian: true },
    next: 'pro_qa_choice'
  },

  // ----- 分支C：询问睿帝（info，回答后回到选择）-----
  {
    id: 'pro_ask_rui_1',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'xing', portrait: 'xing/observe', position: 'center', active: true },
    ],
    speaker: '幸',
    next: 'pro_ask_rui_2'
  },
  {
    id: 'pro_ask_rui_2',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'pro_ask_rui_3'
  },
  {
    id: 'pro_ask_rui_3',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'xing', portrait: 'xing/observe', position: 'center', active: true },
    ],
    speaker: '幸',
    next: 'pro_choice_1'
  },

  // ----- 分支D：询问城邦（info，回答后回到选择）-----
  {
    id: 'pro_ask_city_1',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'xing', portrait: 'xing/observe', position: 'center', active: true },
    ],
    speaker: '幸',
    next: 'pro_ask_city_2'
  },
  {
    id: 'pro_ask_city_2',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'pro_ask_city_3'
  },
  {
    id: 'pro_ask_city_3',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'xing', portrait: 'xing/observe', position: 'center', active: true },
    ],
    speaker: '幸',
    next: 'pro_choice_1'
  },

  // ----- 分支A：同意（critical，获得睿帝令）-----
  {
    id: 'pro_agree_1',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'xing', portrait: 'xing/pleased', position: 'center', active: true },
    ],
    speaker: '幸',
    next: 'pro_agree_2'
  },
  {
    id: 'pro_agree_2',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'xing', portrait: 'xing/pleased', position: 'center', active: true },
    ],
    speaker: '幸',
    next: 'pro_agree_3'
  },
  {
    id: 'pro_agree_3',
    type: 'event',
    background: 'bg/tower_interior_hall',
    grantItem: 'rui_emblem',
    setVariables: { agreed_to_rui: true },
    next: 'pro_depart_1'
  },

  // ----- 分支B：拒绝（critical）-----
  {
    id: 'pro_refuse_1',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'xing', portrait: 'xing/cold', position: 'center', active: true },
    ],
    speaker: '幸',
    next: 'pro_refuse_2'
  },
  {
    id: 'pro_refuse_2',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'xing', portrait: 'xing/cold', position: 'center', active: true },
    ],
    speaker: '幸',
    next: 'pro_refuse_3'
  },
  {
    id: 'pro_refuse_3',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'pro_depart_1'
  },

  // ===== 幸离去（A/B 汇合）=====
  {
    id: 'pro_depart_1',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/calm', position: 'left', active: true },
    ],
    speaker: '见',
    next: 'pro_depart_2'
  },
  {
    id: 'pro_depart_2',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'xing', portrait: 'xing/smile', position: 'center', active: true },
    ],
    speaker: '幸',
    next: 'pro_depart_3'
  },
  {
    id: 'pro_depart_3',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'pro_depart_4'
  },
  {
    id: 'pro_depart_4',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/calm', position: 'left', active: true },
    ],
    speaker: '见',
    next: 'pro_depart_5'
  },
  {
    id: 'pro_depart_5',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    next: 'pro_depart_6'
  },
  {
    id: 'pro_depart_6',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/calm', position: 'left', active: true },
    ],
    speaker: '见',
    next: 'pro_201'
  },

  // ================================================================
  // 第三幕：储物空间发放
  // ================================================================
  {
    id: 'pro_201',
    type: 'dialogue',
    background: 'bg/tower_interior',
    characters: [
      { id: 'dean', portrait: 'dean/calm', position: 'center', active: true },
    ],
    speaker: '见',
    next: 'pro_202'
  },
  {
    id: 'pro_202',
    type: 'dialogue',
    background: 'bg/tower_interior',
    speaker: '旁白',
    next: 'pro_203'
  },
  {
    id: 'pro_203',
    type: 'dialogue',
    background: 'bg/tower_interior',
    characters: [
      { id: 'dean', portrait: 'dean/calm', position: 'center', active: true },
    ],
    speaker: '见',
    next: 'pro_204'
  },
  {
    id: 'pro_204',
    type: 'dialogue',
    background: 'bg/tower_interior',
    speaker: '旁白',
    next: 'pro_205'
  },
  {
    id: 'pro_205',
    type: 'dialogue',
    background: 'bg/tower_interior',
    characters: [
      { id: 'dean', portrait: 'dean/calm', position: 'center', active: true },
    ],
    speaker: '见',
    next: 'pro_206'
  },
  {
    id: 'pro_206',
    type: 'dialogue',
    background: 'bg/tower_interior',
    characters: [
      { id: 'dean', portrait: 'dean/calm', position: 'center', active: true },
    ],
    speaker: '见',
    next: 'pro_207'
  },

  // ===== event：解锁储物空间 =====
  {
    id: 'pro_207',
    type: 'event',
    background: 'bg/tower_interior',
    setVariables: { inventory_unlocked: true },
    next: 'pro_208'
  },
  {
    id: 'pro_208',
    type: 'dialogue',
    background: 'bg/tower_interior',
    speaker: '旁白',
    next: 'pro_cond_emblem'
  },

  // ===== condition：是否拥有睿帝令 =====
  {
    id: 'pro_cond_emblem',
    type: 'condition',
    background: 'bg/tower_interior',
    branches: [
      { if: { variables: { agreed_to_rui: true } }, next: 'pro_emblem_yes_1' },
      { else: true, next: 'pro_emblem_no_1' },
    ],
  },

  // ----- 有睿帝令分支 -----
  {
    id: 'pro_emblem_yes_1',
    type: 'dialogue',
    background: 'bg/tower_interior',
    characters: [
      { id: 'dean', portrait: 'dean/calm', position: 'center', active: true },
    ],
    speaker: '见',
    next: 'pro_emblem_yes_2'
  },
  {
    id: 'pro_emblem_yes_2',
    type: 'dialogue',
    background: 'bg/tower_interior',
    characters: [
      { id: 'dean', portrait: 'dean/calm', position: 'center', active: true },
    ],
    speaker: '见',
    next: 'pro_301'
  },

  // ----- 无睿帝令分支 -----
  {
    id: 'pro_emblem_no_1',
    type: 'dialogue',
    background: 'bg/tower_interior',
    characters: [
      { id: 'dean', portrait: 'dean/calm', position: 'center', active: true },
    ],
    speaker: '见',
    next: 'pro_301'
  },

  // ===== 院长引导去找添 =====
  {
    id: 'pro_301',
    type: 'dialogue',
    background: 'bg/tower_interior',
    characters: [
      { id: 'dean', portrait: 'dean/calm', position: 'center', active: true },
    ],
    speaker: '见',
    next: 'pro_302'
  },
  {
    id: 'pro_302',
    type: 'dialogue',
    background: 'bg/tower_interior',
    speaker: '旁白',
    next: 'pro_cond_met_tian'
  },

  // ===== condition：是否已和添聊过（缓几天分支提前Q&A过）=====
  // met_tian=true 表示缓几天分支已聊过添 -> 直接序章结束
  // met_tian=undefined 表示正常A/B路径 -> 进入第四幕添Q&A
  {
    id: 'pro_cond_met_tian',
    type: 'condition',
    branches: [
      { if: { variables: { met_tian: true } }, next: 'pro_end' },
      { else: true, next: 'pro_303' },
    ],
  },

  // ================================================================
  // 第四幕：自由探索（添 Q&A）
  // ================================================================
  {
    id: 'pro_303',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_304'
  },
  {
    id: 'pro_304',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    speaker: '旁白',
    next: 'pro_305'
  },
  {
    id: 'pro_305',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_306'
  },
  {
    id: 'pro_306',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    speaker: '旁白',
    next: 'pro_307'
  },
  {
    id: 'pro_307',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_choice'
  },

  // ===== Q&A 选择话题（6 info + 1 critical 结束）=====
  {
    id: 'pro_qa_choice',
    type: 'choice',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    choices: [
      { impact: 'info', next: 'pro_qa_place_1' },
      { impact: 'info', next: 'pro_qa_who_1' },
      { impact: 'info', next: 'pro_qa_world_1' },
      { impact: 'info', next: 'pro_qa_xing_1' },
      { impact: 'info', next: 'pro_qa_rift_1' },
      { impact: 'info', next: 'pro_qa_next_1' },
      { impact: 'info', next: 'pro_qa_home_1' },
      { impact: 'critical', next: 'pro_qa_end_1' },
    ],
  },

  // ----- 话题一：这是什么地方 -----
  {
    id: 'pro_qa_place_1',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_place_2'
  },
  {
    id: 'pro_qa_place_2',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_place_3'
  },
  {
    id: 'pro_qa_place_3',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_place_4'
  },
  {
    id: 'pro_qa_place_4',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_choice'
  },

  // ----- 话题二：我们是谁 -----
  {
    id: 'pro_qa_who_1',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_who_2'
  },
  {
    id: 'pro_qa_who_2',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_who_3'
  },
  {
    id: 'pro_qa_who_3',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    speaker: '旁白',
    next: 'pro_qa_who_4'
  },
  {
    id: 'pro_qa_who_4',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_who_5'
  },
  {
    id: 'pro_qa_who_5',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_who_6'
  },
  {
    id: 'pro_qa_who_6',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_choice'
  },

  // ----- 话题三：世界局势 -----
  {
    id: 'pro_qa_world_1',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_world_2'
  },
  {
    id: 'pro_qa_world_2',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_world_3'
  },
  {
    id: 'pro_qa_world_3',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_world_4'
  },
  {
    id: 'pro_qa_world_4',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_world_5'
  },
  {
    id: 'pro_qa_world_5',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_world_6'
  },
  {
    id: 'pro_qa_world_6',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_world_7'
  },
  {
    id: 'pro_qa_world_7',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_choice'
  },

  // ----- 话题四：刚才那个人是谁 -----
  {
    id: 'pro_qa_xing_1',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_xing_2'
  },
  {
    id: 'pro_qa_xing_2',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    speaker: '旁白',
    next: 'pro_qa_xing_3'
  },
  {
    id: 'pro_qa_xing_3',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_xing_4'
  },
  {
    id: 'pro_qa_xing_4',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_xing_5'
  },
  {
    id: 'pro_qa_xing_5',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_xing_6'
  },
  {
    id: 'pro_qa_xing_6',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_choice'
  },

  // ----- 话题五：裂隙是什么 -----
  {
    id: 'pro_qa_rift_1',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_rift_2'
  },
  {
    id: 'pro_qa_rift_2',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_rift_3'
  },
  {
    id: 'pro_qa_rift_3',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_rift_4'
  },
  {
    id: 'pro_qa_rift_4',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_rift_5'
  },
  {
    id: 'pro_qa_rift_5',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_choice'
  },

  // ----- 话题六：我接下来该干嘛 -----
  {
    id: 'pro_qa_next_1',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_next_2'
  },
  {
    id: 'pro_qa_next_2',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    speaker: '旁白',
    next: 'pro_qa_next_3'
  },
  {
    id: 'pro_qa_next_3',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_next_4'
  },
  {
    id: 'pro_qa_next_4',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_next_5'
  },
  {
    id: 'pro_qa_next_5',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_next_6'
  },
  {
    id: 'pro_qa_next_6',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_choice'
  },

  // ----- 话题七：你有想过回去吗？-----
  {
    id: 'pro_qa_home_1',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_home_2'
  },
  {
    id: 'pro_qa_home_2',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    speaker: '旁白',
    next: 'pro_qa_home_3'
  },
  {
    id: 'pro_qa_home_3',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_home_4'
  },
  {
    id: 'pro_qa_home_4',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    speaker: '旁白',
    next: 'pro_qa_choice'
  },

  // ----- 结束话题 -----
  {
    id: 'pro_qa_end_1',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_end_2'
  },
  {
    id: 'pro_qa_end_2',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_qa_end_3'
  },
  {
    id: 'pro_qa_end_3',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    speaker: '旁白',
    next: 'pro_qa_end_4'
  },
  {
    id: 'pro_qa_end_4',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_cond_qa_end'
  },

  // ===== condition：Q&A结束后去向（缓几天→回choice答复，正常→结束）=====
  {
    id: 'pro_cond_qa_end',
    type: 'condition',
    branches: [
      { if: { variables: { met_tian: true } }, next: 'pro_delay_back_1' },
      { else: true, next: 'pro_end' },
    ],
  },

  // ----- 缓几天：Q&A走完，添送玩家下楼答复幸 -----
  {
    id: 'pro_delay_back_1',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    next: 'pro_choice_1'
  },

  // ================================================================
  // 序章结束
  // ================================================================
  {
    id: 'pro_end',
    type: 'end',
    background: 'bg/tower_lobby'
  }
]
