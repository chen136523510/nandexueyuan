/**
 * 序章：漂泊者降临
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
    text: '虚空降临第118年。',
    next: 'pro_002',
  },
  {
    id: 'pro_002',
    type: 'dialogue',
    background: 'bg/void_world',
    speaker: '旁白',
    text: '裂隙如旧，世界如旧。',
    next: 'pro_003',
  },
  {
    id: 'pro_003',
    type: 'dialogue',
    background: 'bg/void_world',
    speaker: '旁白',
    text: '腐化爬过帝国的城墙，渗入共和国的灯火；在大沙漠的烈日下蒸发，又在远海的盐风里凝结。',
    next: 'pro_004',
  },
  {
    id: 'pro_004',
    type: 'dialogue',
    background: 'bg/void_world',
    speaker: '旁白',
    text: '一百一十八年——足够文明习惯伤痛，足够绝望长出老茧。',
    next: 'pro_005',
  },

  // ===== 场景2：塔楼降临 =====
  {
    id: 'pro_005',
    type: 'dialogue',
    background: 'bg/grassland',
    speaker: '旁白',
    text: '直到三年前，草原上长出一座塔楼。',
    next: 'pro_006',
  },
  {
    id: 'pro_006',
    type: 'dialogue',
    background: 'bg/grassland',
    speaker: '旁白',
    text: '砖头水泥，粗糙但扎实——不像这片世界该有的造物。',
    next: 'pro_007',
  },
  {
    id: 'pro_007',
    type: 'dialogue',
    background: 'bg/grassland',
    speaker: '旁白',
    text: '塔楼立起来的那天，周围的裂隙开始收缩。一百一十八年来从未有过的事。',
    next: 'pro_008',
  },
  {
    id: 'pro_008',
    type: 'dialogue',
    background: 'bg/grassland',
    speaker: '旁白',
    text: '塔楼叫"德塔"。里面住着一群自称"男德学院"的人——从另一个位面来。',
    next: 'pro_009',
  },

  // ===== 场景3：此刻你站在塔楼门口 =====
  {
    id: 'pro_009',
    type: 'dialogue',
    background: 'bg/tower_day',
    speaker: '旁白',
    text: '此刻，你站在塔楼门口。',
    next: 'pro_010',
  },
  {
    id: 'pro_010',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    text: '宽敞的一层大厅。粗糙的水泥墙面，墙上挂着几张手绘地图，一张旧沙发，几盏暖色灯。',
    next: 'pro_011',
  },

  // ===== 院长出场 =====
  {
    id: 'pro_011',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/normal', position: 'center', active: true },
    ],
    speaker: '院长',
    text: '到了啊。路上怎么样——哦不对，传送没"路"可说。',
    next: 'pro_012',
  },
  {
    id: 'pro_012',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/normal', position: 'center', active: true },
    ],
    speaker: '旁白',
    text: '他的声音不紧不慢，像在聊天气。',
    next: 'pro_013',
  },
  {
    id: 'pro_013',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/normal', position: 'center', active: true },
    ],
    speaker: '院长',
    text: '我是第一批过来的。这边等了三年，总算把你们盼来了。',
    next: 'pro_014',
  },
  {
    id: 'pro_014',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/normal', position: 'center', active: true },
    ],
    speaker: '院长',
    text: '长话短说——三年前我们掉进这片草原，建了这座塔。后来发现个事：我们待着的地方，裂隙会自己合上。',
    next: 'pro_015',
  },
  {
    id: 'pro_015',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/normal', position: 'center', active: true },
    ],
    speaker: '院长',
    text: '不是我们做了什么。就只是——存在在这里，就行。',
    next: 'pro_016',
  },
  {
    id: 'pro_016',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/normal', position: 'center', active: true },
    ],
    speaker: '院长',
    text: '这个世界没有这样的东西。所以，我们大概算是……有点用。',
    next: 'pro_017',
  },
  {
    id: 'pro_017',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/normal', position: 'center', active: true },
    ],
    speaker: '院长',
    text: '但人太少。草原的裂隙关了，远处还有。所以才把你们叫来。',
    next: 'pro_018',
  },
  {
    id: 'pro_018',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    text: '他说得轻描淡写。但你注意到他说"把你们叫来"的时候，眼神里有一点——不是歉意，是认真。',
    next: 'pro_019',
  },
  {
    id: 'pro_019',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/normal', position: 'center', active: true },
    ],
    speaker: '院长',
    text: '先去转转，熟悉一下地方。二楼是住的地方，三楼储物间待会儿收拾一间给你。',
    next: 'pro_020',
  },
  {
    id: 'pro_020',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/normal', position: 'center', active: true },
    ],
    speaker: '院长',
    text: '对了——',
    next: 'pro_021',
  },
  {
    id: 'pro_021',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    text: '他像是突然想起什么，抬头看向门口的方向。',
    next: 'pro_022',
  },
  {
    id: 'pro_022',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    characters: [
      { id: 'dean', portrait: 'dean/normal', position: 'center', active: true },
    ],
    speaker: '院长',
    text: '今天可能有客人来。外面的人，不是塔里的。',
    next: 'pro_023',
  },
  {
    id: 'pro_023',
    type: 'dialogue',
    background: 'bg/tower_interior_hall',
    speaker: '旁白',
    text: '他没有解释更多。但那一瞬间，他脸上的表情不是"欢迎光临"，而是——准备好了。',
    next: 'pro_101',
  },

  // ================================================================
  // 第二幕：法刺来访
  // ================================================================

  // ===== 幸登场 =====
  {
    id: 'pro_101',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'dean', portrait: 'dean/normal', position: 'left', active: true },
    ],
    speaker: '院长',
    text: '嗯？来得比预计早。',
    next: 'pro_102',
  },
  {
    id: 'pro_102',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    speaker: '旁白',
    text: '院长话音刚落，一个人影从晨雾中走来。没有仪仗，没有旗帜，只有一个人。她踏着松软的草甸，步伐不急不缓，衣摆沾着露水。',
    next: 'pro_103',
  },
  {
    id: 'pro_103',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'xing', portrait: 'xing/normal', position: 'center', active: true },
      { id: 'dean', portrait: 'dean/normal', position: 'left', active: false },
    ],
    speaker: '幸',
    text: '院长阁下，久仰。帝国礼部主事，幸。睿帝陛下让我代为问候。冒昧登门，还请见谅。',
    next: 'pro_104',
  },
  {
    id: 'pro_104',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'dean', portrait: 'dean/normal', position: 'left', active: true },
      { id: 'xing', portrait: 'xing/normal', position: 'center', active: false },
    ],
    speaker: '院长',
    text: '幸大人。远道而来，不妨进来喝杯茶。',
    next: 'pro_105',
  },
  {
    id: 'pro_105',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'xing', portrait: 'xing/normal', position: 'center', active: true },
      { id: 'dean', portrait: 'dean/normal', position: 'left', active: false },
    ],
    speaker: '幸',
    text: '多谢。不过……站在这里说话，倒更能看清贵学院的——气象。',
    next: 'pro_106',
  },
  {
    id: 'pro_106',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    speaker: '旁白',
    text: '她的视线在"塔楼"二字上微微一顿，仿佛在咀嚼这个词背后的深意。',
    next: 'pro_107',
  },
  {
    id: 'pro_107',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'xing', portrait: 'xing/normal', position: 'center', active: true },
    ],
    speaker: '幸',
    text: '三年前贵学院降临以来，草原方圆百里裂隙消散大半。陛下对此……非常欣赏。',
    next: 'pro_108',
  },
  {
    id: 'pro_108',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'dean', portrait: 'dean/normal', position: 'left', active: true },
    ],
    speaker: '院长',
    text: '虚空本就不该存在于这个世界。',
    next: 'pro_109',
  },
  {
    id: 'pro_109',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'xing', portrait: 'xing/normal', position: 'center', active: true },
    ],
    speaker: '幸',
    text: '确实。正因贵学院能"正本清源"，陛下才愿派我来，而非用其他方式。',
    next: 'pro_110',
  },
  {
    id: 'pro_110',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    speaker: '旁白',
    text: '"其他方式"四个字，她说得轻飘飘，像随手拂落一粒灰尘。',
    next: 'pro_111',
  },

  // ===== 幸注意到玩家 =====
  {
    id: 'pro_111',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'xing', portrait: 'xing/normal', position: 'center', active: true },
    ],
    speaker: '幸',
    text: '听闻今日贵学院还有一位新成员抵达？真巧。适逢其会，不胜荣幸。',
    next: 'pro_112',
  },
  {
    id: 'pro_112',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'dean', portrait: 'dean/normal', position: 'left', active: true },
    ],
    speaker: '院长',
    text: '幸大人消息很灵通。',
    next: 'pro_113',
  },
  {
    id: 'pro_113',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    speaker: '旁白',
    text: '她没有回答幸，也没有介绍你——只是把空间让了出来。这种沉默本身就是一种态度：人可以看，话要自己说。',
    next: 'pro_114',
  },
  {
    id: 'pro_114',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'xing', portrait: 'xing/normal', position: 'center', active: true },
    ],
    speaker: '幸',
    text: '哦？新面孔。',
    next: 'pro_115',
  },
  {
    id: 'pro_115',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    speaker: '旁白',
    text: '她的视线在你身上停了片刻，笑容未变，但眼神里有某种东西——像在核对一份并不存在的档案。',
    next: 'pro_116',
  },
  {
    id: 'pro_116',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'xing', portrait: 'xing/normal', position: 'center', active: true },
    ],
    speaker: '幸',
    text: '让我猜猜……不是本地人。不知道裂隙怎么形成的，没听说过各国局势，甚至可能——怎么来的都不知道。对吗？',
    next: 'pro_117',
  },
  {
    id: 'pro_117',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'dean', portrait: 'dean/normal', position: 'left', active: true },
    ],
    speaker: '院长',
    text: '幸大人，她刚落地不到一小时。',
    next: 'pro_118',
  },
  {
    id: 'pro_118',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'xing', portrait: 'xing/normal', position: 'center', active: true },
    ],
    speaker: '幸',
    text: '一小时换一个世界的所有信息。很划算。那正好——新来的人，脑子还没被这片大陆的尘埃糊住。',
    next: 'pro_119',
  },
  {
    id: 'pro_119',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'xing', portrait: 'xing/normal', position: 'center', active: true },
    ],
    speaker: '幸',
    text: '我问你一个问题，你答我，比跟院长谈一百句都有用。',
    next: 'pro_120',
  },
  {
    id: 'pro_120',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    speaker: '旁白',
    text: '她这话说得客气，眼神却一点让步的意思都没有。',
    next: 'pro_121',
  },
  {
    id: 'pro_121',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'xing', portrait: 'xing/normal', position: 'center', active: true },
    ],
    speaker: '幸',
    text: '院长阁下不介意吧？',
    next: 'pro_122',
  },
  {
    id: 'pro_122',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'dean', portrait: 'dean/normal', position: 'left', active: true },
    ],
    speaker: '院长',
    text: '在这地方，每种选择都有代价。想好了再说。',
    next: 'pro_123',
  },
  {
    id: 'pro_123',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    speaker: '旁白',
    text: '他的话像一块石头沉进水面，涟漪过去，只剩下沉默。幸仍看着你，微笑，等待。',
    next: 'pro_124',
  },

  // ===== 自命名 input 节点 =====
  {
    id: 'pro_124',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'xing', portrait: 'xing/normal', position: 'center', active: true },
    ],
    speaker: '幸',
    text: '你没告诉我名字呢。',
    next: 'pro_125',
  },
  {
    id: 'pro_125',
    type: 'input',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'xing', portrait: 'xing/normal', position: 'center', active: true },
    ],
    speaker: '幸',
    text: '那么，你叫什么名字？',
    variable: 'playerName',
    placeholder: '输入你的名字',
    next: 'pro_126',
  },
  {
    id: 'pro_126',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'xing', portrait: 'xing/normal', position: 'center', active: true },
    ],
    speaker: '幸',
    text: '{playerName}。好，就叫你{playerName}。那——{playerName}。',
    next: 'pro_127',
  },
  {
    id: 'pro_127',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    speaker: '旁白',
    text: '她含笑重复，像在记住一个代号。',
    next: 'pro_128',
  },
  {
    id: 'pro_128',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'xing', portrait: 'xing/normal', position: 'center', active: true },
    ],
    speaker: '幸',
    text: '你觉得，我们该是什么关系？',
    next: 'pro_choice_1',
  },

  // ===== 核心选择：四选项（A/B critical，C/D info）=====
  {
    id: 'pro_choice_1',
    type: 'choice',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'xing', portrait: 'xing/normal', position: 'center', active: true },
    ],
    choices: [
      {
        text: '如果合作能保护城邦，我同意',
        impact: 'critical',
        next: 'pro_agree_1',
        effects: { rui: 5 },
      },
      {
        text: '我连这个世界名字都没记住，谈什么"合作"',
        impact: 'critical',
        next: 'pro_refuse_1',
        effects: { rui: 0 },
      },
      {
        text: '睿帝想要草原，为什么让他要？他是什么人',
        impact: 'info',
        next: 'pro_ask_rui_1',
      },
      {
        text: '草原的人自己怎么想',
        impact: 'info',
        next: 'pro_ask_city_1',
      },
    ],
  },

  // ----- 分支C：询问睿帝（info，回答后回到选择）-----
  {
    id: 'pro_ask_rui_1',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'xing', portrait: 'xing/normal', position: 'center', active: true },
    ],
    speaker: '幸',
    text: '睿帝陛下啊……他让一个分裂百年的帝国，重新有了秩序。"秩序"这两个字在这片土地上，比什么都值钱。',
    next: 'pro_ask_rui_2',
  },
  {
    id: 'pro_ask_rui_2',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    speaker: '旁白',
    text: '她没提"独裁"也没提"魔法师"。她用的是"秩序"。',
    next: 'pro_ask_rui_3',
  },
  {
    id: 'pro_ask_rui_3',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'xing', portrait: 'xing/normal', position: 'center', active: true },
    ],
    speaker: '幸',
    text: '怎么——你想知道他是好人还是坏人？{playerName}，在草原上，狼吃羊是坏，羊吃草也是坏吗？',
    next: 'pro_choice_1', // 回到选择
  },

  // ----- 分支D：询问城邦（info，回答后回到选择）-----
  {
    id: 'pro_ask_city_1',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'xing', portrait: 'xing/normal', position: 'center', active: true },
    ],
    speaker: '幸',
    text: '草原的人怎么想……这片草原上的城邦，名义上还是帝国的附庸。',
    next: 'pro_ask_city_2',
  },
  {
    id: 'pro_ask_city_2',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    speaker: '旁白',
    text: '她没说"他们不配做决定"，但那语气里，草原上的人似乎只是一盘散沙。',
    next: 'pro_ask_city_3',
  },
  {
    id: 'pro_ask_city_3',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'xing', portrait: 'xing/normal', position: 'center', active: true },
    ],
    speaker: '幸',
    text: '附庸是什么——就是当你犹豫的时候，别人已经替你做了决定。我不是来问他们意见的。{playerName}，我是来问你的。',
    next: 'pro_choice_1', // 回到选择
  },

  // ----- 分支A：同意（critical，获得睿帝令）-----
  {
    id: 'pro_agree_1',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'xing', portrait: 'xing/normal', position: 'center', active: true },
    ],
    speaker: '幸',
    text: '很有魄力。不愧是来自……那边的人。',
    next: 'pro_agree_2',
  },
  {
    id: 'pro_agree_2',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'xing', portrait: 'xing/normal', position: 'center', active: true },
    ],
    speaker: '幸',
    text: '那么——睿帝陛下有言：持此令者，如朕亲临。贵学院若促成此事，帝国永远记这份情。',
    next: 'pro_agree_3',
  },
  {
    id: 'pro_agree_3',
    type: 'event',
    background: 'bg/tower_outdoor_mist',
    grantItem: 'rui_emblem',
    setVariables: { agreed_to_rui: true },
    next: 'pro_depart_1',
  },

  // ----- 分支B：拒绝（critical）-----
  {
    id: 'pro_refuse_1',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'xing', portrait: 'xing/normal', position: 'center', active: true },
    ],
    speaker: '幸',
    text: '谨慎，也是一种态度。',
    next: 'pro_refuse_2',
  },
  {
    id: 'pro_refuse_2',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'xing', portrait: 'xing/normal', position: 'center', active: true },
    ],
    speaker: '幸',
    text: '不过{playerName}——这个世界上，没有人能"先搞清楚"再入局。等你搞清楚的时候，局已经定了。',
    next: 'pro_refuse_3',
  },
  {
    id: 'pro_refuse_3',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    speaker: '旁白',
    text: '她没有收回手，但那只拿着令牌的手停在了半空，极短的沉默。',
    next: 'pro_depart_1',
  },

  // ===== 幸离去（A/B 汇合）=====
  {
    id: 'pro_depart_1',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'dean', portrait: 'dean/normal', position: 'left', active: true },
    ],
    speaker: '院长',
    text: '行，话说到这就够了。幸大人，她刚来，让她喘口气。',
    next: 'pro_depart_2',
  },
  {
    id: 'pro_depart_2',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'xing', portrait: 'xing/normal', position: 'center', active: true },
    ],
    speaker: '幸',
    text: '当然。是我心急了。{playerName}，我们还会见面的。',
    next: 'pro_depart_3',
  },
  {
    id: 'pro_depart_3',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    speaker: '旁白',
    text: '她转身离去，背影重新溶入晨雾。来时一个人，走时也是一个人——但她的话像一根细针，扎在了这座塔楼平静的空气里。',
    next: 'pro_depart_4',
  },
  {
    id: 'pro_depart_4',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'dean', portrait: 'dean/normal', position: 'left', active: true },
    ],
    speaker: '院长',
    text: '你刚才的答复，我听到了。没有对错，只有后果。',
    next: 'pro_depart_5',
  },
  {
    id: 'pro_depart_5',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    speaker: '旁白',
    text: '他的语气没有评判，只是在陈述事实。但你知道，自己刚才的回答，已经在这片世界留下了一道线。而线——迟早会被踩住。',
    next: 'pro_depart_6',
  },
  {
    id: 'pro_depart_6',
    type: 'dialogue',
    background: 'bg/tower_outdoor_mist',
    characters: [
      { id: 'dean', portrait: 'dean/normal', position: 'left', active: true },
    ],
    speaker: '院长',
    text: '行了，进来，先领点东西。以后你会用得着。',
    next: 'pro_201',
  },

  // ================================================================
  // 第三幕：储物空间发放
  // ================================================================

  {
    id: 'pro_201',
    type: 'dialogue',
    background: 'bg/tower_interior',
    characters: [
      { id: 'dean', portrait: 'dean/normal', position: 'center', active: true },
    ],
    speaker: '院长',
    text: '不管你怎么选，你刚到，总得有个行装。',
    next: 'pro_202',
  },
  {
    id: 'pro_202',
    type: 'dialogue',
    background: 'bg/tower_interior',
    speaker: '旁白',
    text: '院长从墙角的木箱里取出一个不起眼的黑色金属环，走向你。',
    next: 'pro_203',
  },
  {
    id: 'pro_203',
    type: 'dialogue',
    background: 'bg/tower_interior',
    characters: [
      { id: 'dean', portrait: 'dean/normal', position: 'center', active: true },
    ],
    speaker: '院长',
    text: '给。这是纳戒。',
    next: 'pro_204',
  },
  {
    id: 'pro_204',
    type: 'dialogue',
    background: 'bg/tower_interior',
    speaker: '旁白',
    text: '他将戒指递到你手中，触感微凉，分量比看起来轻。',
    next: 'pro_205',
  },
  {
    id: 'pro_205',
    type: 'dialogue',
    background: 'bg/tower_interior',
    characters: [
      { id: 'dean', portrait: 'dean/normal', position: 'center', active: true },
    ],
    speaker: '院长',
    text: '学院造的，简单说就是一个能随身带的储物空间。你以后捡到什么东西、收到什么信件，全放这里面。',
    next: 'pro_206',
  },
  {
    id: 'pro_206',
    type: 'dialogue',
    background: 'bg/tower_interior',
    characters: [
      { id: 'dean', portrait: 'dean/normal', position: 'center', active: true },
    ],
    speaker: '院长',
    text: '怎么用……你集中精神"看"它，里面的格子自然就浮现了。',
    next: 'pro_207',
  },

  // ===== event：解锁储物空间 =====
  {
    id: 'pro_207',
    type: 'event',
    background: 'bg/tower_interior',
    setVariables: { inventory_unlocked: true },
    next: 'pro_208',
  },
  {
    id: 'pro_208',
    type: 'dialogue',
    background: 'bg/tower_interior',
    speaker: '旁白',
    text: '【储物空间已解锁 — 按 B 键打开】',
    next: 'pro_cond_emblem',
  },

  // ===== condition：是否拥有睿帝令 =====
  {
    id: 'pro_cond_emblem',
    type: 'condition',
    background: 'bg/tower_interior',
    branches: [
      {
        if: { variables: { agreed_to_rui: true } },
        next: 'pro_emblem_yes_1',
      },
      { else: true, next: 'pro_emblem_no_1' },
    ],
  },

  // ----- 有睿帝令分支 -----
  {
    id: 'pro_emblem_yes_1',
    type: 'dialogue',
    background: 'bg/tower_interior',
    characters: [
      { id: 'dean', portrait: 'dean/normal', position: 'center', active: true },
    ],
    speaker: '院长',
    text: '哦对了。那位"外交部长"走之前留下的。看来她对你还算满意。',
    next: 'pro_emblem_yes_2',
  },
  {
    id: 'pro_emblem_yes_2',
    type: 'dialogue',
    background: 'bg/tower_interior',
    characters: [
      { id: 'dean', portrait: 'dean/normal', position: 'center', active: true },
    ],
    speaker: '院长',
    text: '这东西留着吧，以后说不定能用上，至少能唬人。',
    next: 'pro_301',
  },

  // ----- 无睿帝令分支 -----
  {
    id: 'pro_emblem_no_1',
    type: 'dialogue',
    background: 'bg/tower_interior',
    characters: [
      { id: 'dean', portrait: 'dean/normal', position: 'center', active: true },
    ],
    speaker: '院长',
    text: '好了，基本的都交代完了。',
    next: 'pro_301',
  },

  // ===== 院长引导去找添 =====
  {
    id: 'pro_301',
    type: 'dialogue',
    background: 'bg/tower_interior',
    characters: [
      { id: 'dean', portrait: 'dean/normal', position: 'center', active: true },
    ],
    speaker: '院长',
    text: '去上面找添吧，他在一楼大厅窝着。你对这个世界还一无所知，那家伙是这里的包打听，什么都知道。',
    next: 'pro_302',
  },
  {
    id: 'pro_302',
    type: 'dialogue',
    background: 'bg/tower_interior',
    speaker: '旁白',
    text: '你下了楼。一层大厅里，暖色灯光下，一个魁梧的身影正蹲在地上整理箱子。',
    next: 'pro_303',
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
    text: '哟！来了啊！等你好一会儿了！',
    next: 'pro_304',
  },
  {
    id: 'pro_304',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    speaker: '旁白',
    text: '他大步流星走过来，上下打量你，眼神里带着老大哥看新兄弟的那种亲切劲儿。',
    next: 'pro_305',
  },
  {
    id: 'pro_305',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '我是添，第一批来的。院长刚才跟你说了个大概吧？行，有啥不明白的，尽管问哥。我这人没啥优点，就是来了三年，把这片地儿摸得透透的。',
    next: 'pro_306',
  },
  {
    id: 'pro_306',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    speaker: '旁白',
    text: '院里传来一阵笑声，有人在喊"添哥你又开始了"。',
    next: 'pro_307',
  },
  {
    id: 'pro_307',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '这叫好事儿啊！新兄弟想了解情况，我这老大哥不该说道说道？来，坐。咱们兄弟唠唠。你随便问，啥都行。',
    next: 'pro_qa_choice',
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
      {
        text: '这是什么地方？',
        impact: 'info',
        next: 'pro_qa_place_1',
      },
      {
        text: '我们是谁？学院是干什么的？',
        impact: 'info',
        next: 'pro_qa_who_1',
      },
      {
        text: '世界局势？有哪些势力？',
        impact: 'info',
        next: 'pro_qa_world_1',
      },
      {
        text: '刚才那个人是谁？',
        impact: 'info',
        next: 'pro_qa_xing_1',
      },
      {
        text: '裂隙是什么？我们能做什么？',
        impact: 'info',
        next: 'pro_qa_rift_1',
      },
      {
        text: '我接下来该干嘛？',
        impact: 'info',
        next: 'pro_qa_next_1',
      },
      {
        text: '了解得差不多了',
        impact: 'critical',
        next: 'pro_qa_end_1',
      },
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
    text: '嘿！那肯定不是地球啊！这儿是异世界，跟咱们那个世界隔着不知道多少个位面呢。',
    next: 'pro_qa_place_2',
  },
  {
    id: 'pro_qa_place_2',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '这片大陆叫啥名儿？说实话也没个统一叫法，各国都按自己那套来。咱们脚下这片儿，是大草原城邦的地界儿，西南边儿。',
    next: 'pro_qa_place_3',
  },
  {
    id: 'pro_qa_place_3',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: 'A.V.118——就是虚空降临第118年。反正吧，这地儿跟地球完全俩概念。你听过"穿越"吧？咱就是真穿，不是闹着玩儿的。',
    next: 'pro_qa_place_4',
  },
  {
    id: 'pro_qa_place_4',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '但别慌。这是好事儿啊——你想，地球那破班有啥好上的？来这儿，干点真格的事儿，多带劲！',
    next: 'pro_qa_choice',
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
    text: '听着像教人当保姆的是吧？名儿是院长起的，我也不知道他为啥这么起。反正，咱不是来开德训班的。',
    next: 'pro_qa_who_2',
  },
  {
    id: 'pro_qa_who_2',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '咱这二十来号人，都是从地球来的。三年前，我们第一批到的这儿，把这破塔楼盖起来了。',
    next: 'pro_qa_who_3',
  },
  {
    id: 'pro_qa_who_3',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    speaker: '旁白',
    text: '他顿了顿，难得收了收笑脸。',
    next: 'pro_qa_who_4',
  },
  {
    id: 'pro_qa_who_4',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '这事儿说出来你可能不信——咱们这些人存在的本身，就能把那些裂隙给闭合了。',
    next: 'pro_qa_who_5',
  },
  {
    id: 'pro_qa_who_5',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '怎么说呢……咱就像是这个世界的"药"。往那儿一站，裂隙自己就慢慢合上了。跟消毒似的，明白吧？',
    next: 'pro_qa_who_6',
  },
  {
    id: 'pro_qa_who_6',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '反正啊，各国花了上百年都没根治的毛病，咱一来，给治了。你说气不气人？',
    next: 'pro_qa_choice',
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
    text: '好问题！格局啊，乱得很。我给你捋捋——',
    next: 'pro_qa_world_2',
  },
  {
    id: 'pro_qa_world_2',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '西北边儿，睿意志帝国。魔法独裁，那位爷叫"睿帝"，十年前自己把自己老板给干翻了上了位。手底下养着批秘密警察，叫"法刺"，坏得很。',
    next: 'pro_qa_world_3',
  },
  {
    id: 'pro_qa_world_3',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '东北边儿，民主共和国。听着敞亮是吧？科技是厉害，但是党争严重，贫富差距大，底层过得并不咋地。最近好像还要搞大选，热闹着呢。',
    next: 'pro_qa_world_4',
  },
  {
    id: 'pro_qa_world_4',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '沙漠那边儿，巴拉巴拉部落联盟。一群原始部落，打架猛的一批。听说最近出了个年轻人，叫杰，挺有本事，在统一沙漠。',
    next: 'pro_qa_world_5',
  },
  {
    id: 'pro_qa_world_5',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '南方远海，海盗联合王国。嘿，这帮人是真·海盗。一个叫"汪神"的攒局统一了，靠一套叫"蓝网"的系统防住虚空。不过汪神两年前去南极找啥能源，失踪了，最近这帮人又开始不老实了。',
    next: 'pro_qa_world_6',
  },
  {
    id: 'pro_qa_world_6',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '咱脚下这片儿，大草原城邦，油气多，以前附庸帝国。最近形势不好，可能要出事。最后还有个——虚空教团，一帮邪教徒，到处搞恐怖袭击，信仰虚空，脑子有坑。',
    next: 'pro_qa_world_7',
  },
  {
    id: 'pro_qa_world_7',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '至于帝国……（压低声音）刚才来那女的你也见了吧？那帮人，少沾为妙。',
    next: 'pro_qa_choice',
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
    text: '哈哈哈哈！外交部长？你信哪？',
    next: 'pro_qa_xing_2',
  },
  {
    id: 'pro_qa_xing_2',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    speaker: '旁白',
    text: '他擦了擦笑出的眼泪，看你一脸不解，压低了声音。',
    next: 'pro_qa_xing_3',
  },
  {
    id: 'pro_qa_xing_3',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '老弟啊，那位女士，叫幸。她对外是帝国外交部部长，但那是层皮。她真正的身份，是法刺的二号人物。',
    next: 'pro_qa_xing_4',
  },
  {
    id: 'pro_qa_xing_4',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '法刺，我跟你提过，睿帝的秘密警察。搞情报、搞暗杀、搞颠覆的。她来干啥你心里有数了吧？——来摸咱底的。',
    next: 'pro_qa_xing_5',
  },
  {
    id: 'pro_qa_xing_5',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '哥跟你说，她跟你说啥话，都得在脑子里过三圈。她说的每句话都带着钩子。不过你也别怕，人家现在是外交访问，咱也不是她敌人，互相试探罢了。',
    next: 'pro_qa_xing_6',
  },
  {
    id: 'pro_qa_xing_6',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '我是没办法啊，这种搞情报的，咱得防着点儿。但你放心，有哥在，出不了啥大事儿。',
    next: 'pro_qa_choice',
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
    text: '你看远处那道裂缝了没？在天上，像一道黑色的疤。',
    next: 'pro_qa_rift_2',
  },
  {
    id: 'pro_qa_rift_2',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '118年前，那一天被称为"虚空降临"。另一个位面——就是"虚空位面"，跟咱们这个位面撞上了，撞出好多口子，就是裂隙。',
    next: 'pro_qa_rift_3',
  },
  {
    id: 'pro_qa_rift_3',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '裂隙这东西会往外渗"腐化"，污染土地、水源、空气。还会往外蹦怪物——就那种黑乎乎、没有理智的东西。这世界的人跟这些东西打了118年了，一直没法儿根除。',
    next: 'pro_qa_rift_4',
  },
  {
    id: 'pro_qa_rift_4',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '为啥？因为这个世界本身的魔法和科技，跟那虚空是一块儿的，"同源"的。就像用水浇地上的油，冲不干净。',
    next: 'pro_qa_rift_5',
  },
  {
    id: 'pro_qa_rift_5',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '但咱不一样。咱是第三位面来的人。咱往那儿一站，就像油锅倒进一滴水——它们的连接就断了，裂隙自个儿就闭合了。所以咱在这儿干啥？——不就是把这片地界儿给一块块清干净嘛！这是好事儿啊！',
    next: 'pro_qa_choice',
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
    text: '哈哈哈哈！老弟有干劲！我喜欢！',
    next: 'pro_qa_next_2',
  },
  {
    id: 'pro_qa_next_2',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    speaker: '旁白',
    text: '他笑着拍了拍你肩膀，结实有力。',
    next: 'pro_qa_next_3',
  },
  {
    id: 'pro_qa_next_3',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '第一件事儿——活下来。别笑，这世界可不惯着人。出了德塔那堵墙，外面啥都有可能。',
    next: 'pro_qa_next_4',
  },
  {
    id: 'pro_qa_next_4',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '第二件事儿——熟悉环境。绕着塔楼走走，认认路。回头让院长给你个储物戒指，你那些家当往里一搁就完事儿了。',
    next: 'pro_qa_next_5',
  },
  {
    id: 'pro_qa_next_5',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '第三件事儿——等着开张。咱们下一步肯定有活儿要干。这世界不太平，裂隙不会自己消失。到时候有活儿，哥来找你。',
    next: 'pro_qa_next_6',
  },
  {
    id: 'pro_qa_next_6',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '咱就是一帮探险队，来都来了，顺手帮帮难民，关关裂隙，把这黑了吧唧的世界整好一点儿。来去自由，没人逼你干。但既然来了——搭把手，干一票大的？',
    next: 'pro_qa_choice',
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
    text: '行，今天就先到这儿。你再缓缓劲儿？我就搁那儿（指了指一旁的工具箱），有事儿随时喊我。',
    next: 'pro_qa_end_2',
  },
  {
    id: 'pro_qa_end_2',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '对了，你有啥问题尽管来问。你肯定好奇我为啥啥都知道？',
    next: 'pro_qa_end_3',
  },
  {
    id: 'pro_qa_end_3',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    speaker: '旁白',
    text: '他拍了拍胸脯，眨了一下眼。',
    next: 'pro_qa_end_4',
  },
  {
    id: 'pro_qa_end_4',
    type: 'dialogue',
    background: 'bg/tower_lobby',
    characters: [
      { id: 'tian', portrait: 'tian/normal', position: 'center', active: true },
    ],
    speaker: '添',
    text: '——人在做，添在看嘛！哈哈哈哈！',
    next: 'pro_end',
  },

  // ================================================================
  // 序章结束
  // ================================================================
  {
    id: 'pro_end',
    type: 'end',
    background: 'bg/tower_lobby',
  },
]
