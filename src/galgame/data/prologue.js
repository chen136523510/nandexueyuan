/**
 * 序章：学院降临
 *
 * 时间线：A.V.115（学院降临）-> A.V.118（三线剧变前夕）
 * 剧情：旁白介绍虚空世界 -> 学院降临大草原建立塔楼 -> 帝国法刺侦察 ->
 *       第一次选择（对法刺态度）-> 小队内部讨论 -> 时间跳转铺垫三线剧变
 *
 * 剧本格式说明见 engine/types.js
 * 白机/黑机均可编辑此文件，用 JSON 结构编写剧情。
 */

export default [
  // ===== 场景1：开场旁白 =====
  {
    id: 'pro_001',
    type: 'dialogue',
    background: 'bg/void_world',
    bgm: 'music/prologue',
    speaker: '旁白',
    text: '虚空降临的第115年。世界满目疮痍，裂隙如同大地的伤口，不断渗出异界的腐化。',
    next: 'pro_002',
  },
  {
    id: 'pro_002',
    type: 'dialogue',
    background: 'bg/void_world',
    speaker: '旁白',
    text: '魔法封不住，科技灭不净。一百一十八年来，没有任何力量能真正关闭裂隙。',
    next: 'pro_003',
  },
  {
    id: 'pro_003',
    type: 'dialogue',
    background: 'bg/void_world',
    speaker: '旁白',
    text: '直到那一天——来自另一个位面的存在，降临在大草原上空。',
    next: 'pro_004',
  },

  // ===== 场景2：学院降临 =====
  {
    id: 'pro_004',
    type: 'dialogue',
    background: 'bg/grassland',
    speaker: '旁白',
    text: '一座塔楼拔地而起。约二十名自称"男德学院"的冒险者，就这么凭空出现在了全大陆裂隙最密集的区域。',
    next: 'pro_005',
  },
  {
    id: 'pro_005',
    type: 'dialogue',
    background: 'bg/grassland',
    characters: [
      { id: 'member', portrait: 'member/normal', position: 'center', active: true },
    ],
    speaker: '冒险者',
    text: '哇，这地方的天空……颜色不太对劲啊。你们看那些裂缝，在发光。',
    next: 'pro_006',
  },
  {
    id: 'pro_006',
    type: 'dialogue',
    background: 'bg/grassland',
    characters: [
      { id: 'member', portrait: 'member/normal', position: 'center', active: true },
    ],
    speaker: '冒险者',
    text: '塔楼已经建好了，先把据点弄稳固。来都来了，干一票再说。',
    next: 'pro_007',
  },
  {
    id: 'pro_007',
    type: 'dialogue',
    background: 'bg/tower_night',
    speaker: '旁白',
    text: '塔楼被命名为"德塔"。学院成员发现，只要他们存在于裂隙附近，裂隙就会缓慢闭合——这是本世界118年来从未发生过的现象。',
    next: 'pro_008',
  },

  // ===== 场景3：初遇法刺 =====
  {
    id: 'pro_008',
    type: 'dialogue',
    background: 'bg/empire_border',
    speaker: '旁白',
    text: '三天后。塔楼周边的净化现象引起了北方帝国的注意。睿意志帝国的法刺——皇帝亲自豢养的密探——悄无声息地出现在了塔楼外围。',
    next: 'pro_009',
  },
  {
    id: 'pro_009',
    type: 'dialogue',
    background: 'bg/empire_border',
    characters: [
      { id: 'faci', portrait: 'faci/normal', position: 'center', active: true },
    ],
    speaker: '法刺',
    text: '……你们是什么人？这片草原三日前还遍布裂隙，如今竟干净得像帝都内城。',
    next: 'pro_010',
  },
  {
    id: 'pro_010',
    type: 'dialogue',
    background: 'bg/empire_border',
    characters: [
      { id: 'faci', portrait: 'faci/normal', position: 'center', active: true },
    ],
    speaker: '法刺',
    text: '皇帝陛下对一切异象皆有耳闻。我奉命前来——确认你们，是敌，还是友。',
    next: 'pro_011',
  },

  // ===== 场景4：第一次选择 =====
  {
    id: 'pro_011',
    type: 'choice',
    background: 'bg/empire_border',
    characters: [
      { id: 'faci', portrait: 'faci/normal', position: 'center', active: true },
    ],
    choices: [
      {
        text: '行礼致意，表示愿与帝国和平共处',
        next: 'pro_012',
        effects: { rui: 5 },
      },
      {
        text: '保持警惕，只说不参与政治',
        next: 'pro_013',
        effects: { rui: 0 },
      },
      {
        text: '不予理会，转身回塔楼',
        next: 'pro_014',
        effects: { rui: -3 },
      },
    ],
  },

  // ===== 选项A：行礼（好感+5）=====
  {
    id: 'pro_012',
    type: 'dialogue',
    background: 'bg/empire_border',
    characters: [
      { id: 'faci', portrait: 'faci/normal', position: 'center', active: true },
    ],
    speaker: '法刺',
    text: '……明智的选择。皇帝陛下欣赏识时务者。我会如实禀报——你们暂且无害。',
    effects: { rui: 3 },
    next: 'pro_015',
  },

  // ===== 选项B：警惕（好感+0）=====
  {
    id: 'pro_013',
    type: 'dialogue',
    background: 'bg/empire_border',
    characters: [
      { id: 'faci', portrait: 'faci/normal', position: 'center', active: true },
    ],
    speaker: '法刺',
    text: '不参与政治？哼。在这片大陆上，没有人能置身事外。我会记住你们的态度。',
    next: 'pro_015',
  },

  // ===== 选项C：无视（好感-3）=====
  {
    id: 'pro_014',
    type: 'dialogue',
    background: 'bg/empire_border',
    characters: [
      { id: 'faci', portrait: 'faci/normal', position: 'center', active: true },
    ],
    speaker: '法刺',
    text: '……无礼。但皇帝陛下说过，能力越大者越值得关注。你们会有后悔的时候。',
    next: 'pro_015',
  },

  // ===== 场景5：法刺离去 =====
  {
    id: 'pro_015',
    type: 'dialogue',
    background: 'bg/empire_border',
    speaker: '旁白',
    text: '法刺的身影消融在晨雾中，如同从未出现过。但所有人都知道，帝国的目光已经锁定了德塔。',
    next: 'pro_016',
  },

  // ===== 场景6：小队内部讨论 =====
  {
    id: 'pro_016',
    type: 'dialogue',
    background: 'bg/tower_night',
    characters: [
      { id: 'member', portrait: 'member/normal', position: 'center', active: true },
    ],
    speaker: '冒险者',
    text: '那家伙的眼神……像刀子一样。帝国的皇帝养这种暗探，看来不是善茬。',
    next: 'pro_017',
  },
  {
    id: 'pro_017',
    type: 'dialogue',
    background: 'bg/tower_night',
    characters: [
      { id: 'member', portrait: 'member/normal', position: 'center', active: true },
    ],
    speaker: '冒险者',
    text: '不过管他呢。我们来这里是净化裂隙、拯救难民的，又不是来搞政治的。',
    next: 'pro_018',
  },
  {
    id: 'pro_018',
    type: 'dialogue',
    background: 'bg/tower_night',
    speaker: '旁白',
    text: '学院的决定很明确——不参与政治，专注净化。但命运从不因意愿而改变方向。',
    next: 'pro_019',
  },

  // ===== 场景7：时间跳转，铺垫三线剧变 =====
  {
    id: 'pro_019',
    type: 'dialogue',
    background: 'bg/black',
    speaker: '旁白',
    text: '三年后。A.V.118。',
    next: 'pro_020',
  },
  {
    id: 'pro_020',
    type: 'dialogue',
    background: 'bg/black',
    speaker: '旁白',
    text: '这一年，三件大事几乎同时爆发：共和国国会遭虚空教团空袭，一位名叫丘的草根英雄意外掌权；帝国皇帝睿发动闪电战吞并大草原；海盗联合王国因贸易断崖陷入内乱。',
    next: 'pro_021',
  },
  {
    id: 'pro_021',
    type: 'dialogue',
    background: 'bg/black',
    speaker: '旁白',
    text: '德塔，这座本想远离纷争的塔楼，忽然发现自己站在了四线交汇的风暴中心。',
    next: 'pro_022',
  },

  // ===== 序章结束 =====
  {
    id: 'pro_022',
    type: 'dialogue',
    background: 'bg/tower_night',
    speaker: '旁白',
    text: '故事，才刚刚开始。',
    next: 'pro_end',
  },
  {
    id: 'pro_end',
    type: 'end',
    background: 'bg/black',
  },
]
