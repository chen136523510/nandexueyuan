/**
 * 德塔视觉小说 剧本节点类型定义
 *
 * 剧本由若干「节点」组成，引擎按节点 ID 跳转推进。
 * 每个节点有一个唯一 id，引擎根据 type 决定如何渲染。
 */

// 节点类型枚举
export const NodeType = {
  DIALOGUE: 'dialogue',     // 对话/旁白节点（最常见）
  CHOICE: 'choice',          // 选项分支节点
  CONDITION: 'condition',    // 条件分支节点（基于好感度/变量）
  EVENT: 'event',            // 事件节点（触发特效/解锁CG/发放物品等，无UI，自动跳转）
  INPUT: 'input',            // 输入节点（玩家命名等文本输入）
  END: 'end',                // 章节/结局结束节点
}

// 立绘位置
export const CharPosition = {
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
}

// 角色色彩配置（UI 标签颜色，与设定集角色绑定）
export const CHAR_COLORS = {
  rui: '#C0C0D0',        // 睿帝：银灰
  qiu: '#7A9E72',        // 丘：林绿
  jie: '#D4A574',        // 杰：金沙
  wang: '#7EC8E3',       // 汪神：淡蓝
  muren: '#E8E8F0',      // 牧羊人：纯白
  faci: '#A04040',       // 法刺：暗红（帝国密探）
  narrator: '#B0B0C0',   // 旁白：灰
  member: '#94B48C',     // 学院成员：莫兰迪绿
}

// 物品类型枚举
export const ItemType = {
  KEY_ITEM: 'key_item',      // 关键道具（剧情相关，不可丢弃）
  CONSUMABLE: 'consumable',   // 消耗品
  MATERIAL: 'material',       // 材料
}

// 条件比较运算符
export const ConditionOp = {
  GTE: '>=',
  LTE: '<=',
  GT: '>',
  LT: '<',
  EQ: '==',
  NEQ: '!=',
}
