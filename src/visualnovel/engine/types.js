/**
 * 德塔视觉小说 剧本节点类型定义
 *
 * 剧本由若干「节点」组成，引擎按节点 ID 跳转推进。
 * 每个节点有一个唯一 id，引擎根据 type 决定如何渲染。
 *
 * ===== 舞台字段（立绘演出，三者可共存于同一节点）=====
 * 节点可用以下字段控制「舞台状态」（当前在场角色，跨节点持久化）：
 *
 *   characters: [{ id, portrait, position }]   绝对声明（重置舞台为该集合）
 *     - 旧格式兼容。首次出场/换场景重声明时用。
 *     - 空数组 [] 显式清空舞台（纯旁白节点需要清场时用）。
 *
 *   enter: [{ id, portrait, position }]        增量登场（合并入舞台）
 *     - 角色首次上场、或已在场角色切换表情/位置时用。
 *     - 已在场角色会被覆盖（更新 portrait/position），不会重复添加。
 *
 *   exit: ['xing', 'dean']                     增量退场（从舞台移除）
 *     - 角色真正离开场景时用，触发退场动画。
 *
 *   三者都没有 → 舞台延续上一节点不变（多人对话切说话人时用，避免来回消失）。
 *
 * 处理优先级：exit 先于 enter，避免同帧进出不同角色时闪烁。
 * active 字段已废弃（三态由 speaker 运行时推导，见 visualNovelStore.currentCharacters）。
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

/**
 * 选项类型枚举（choice 节点中每个 choice 的 impact 字段）
 * - CRITICAL: 选了会推进剧情/产生不可逆后果，标黄高亮
 * - INFO: 选了只补充信息，选完返回继续选，标白常规
 */
export const ChoiceImpact = {
  CRITICAL: 'critical',   // 推进剧情（标黄）
  INFO: 'info',           // 信息补充（标白，可重复选）
}

// 立绘位置
export const CharPosition = {
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
}

// 角色色彩配置（UI 标签颜色，与设定集角色绑定）
export const CHAR_COLORS = {
  // 序章实际使用
  dean: '#C8B070',        // 见（院长）：暖金栗
  xing: '#7A9EC8',        // 幸：冷蓝
  tian: '#D4A574',        // 添：大地金
  narrator: '#B0B0C0',    // 旁白：灰
  // 其他角色（预留）
  rui: '#C0C0D0',         // 睿帝：银灰
  qiu: '#7A9E72',         // 丘：林绿
  jie: '#D4A574',         // 杰：金沙
  wang: '#7EC8E3',        // 汪神：淡蓝
  rong: '#A04040',        // 荣：暗红
  ban: '#8A9A5B',         // 班：苔绿（坚毅果敢/送葬人气质）
  muren: '#E8E8F0',       // 牧阳：纯白
  muyang: '#E8E8F0',      // 沐阳：纯白（别名）
  wangshen: '#7EC8E3',    // 汪神别名
  member: '#94B48C',      // 学院成员：莫兰迪绿
}

// speaker中文名 → 角色英文id 映射（用于运行时推导说话人立绘状态）
export const SPEAKER_TO_ID = {
  '见': 'dean',
  '院长': 'dean',
  '幸': 'xing',
  '添': 'tian',
  '睿帝': 'rui',
  '丘': 'qiu',
  '杰': 'jie',
  '汪神': 'wangshen',
  '荣': 'rong',
  '班': 'ban',
  '沐阳': 'muyang',
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
