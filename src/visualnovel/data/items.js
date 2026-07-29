/**
 * 德塔视觉小说 物品数据
 *
 * 物品定义存放在此处，剧本 event 节点通过 grantItem: '物品id' 发放。
 * PoC 阶段 icon 用 emoji 占位，后续黑机提供图片后替换为 <img :src="...">。
 */

export const ITEMS = {
  rui_emblem: {
    id: 'rui_emblem',
    name: '睿帝令',
    icon: '🔶',
    description: '帝国皇帝睿赐予的信物令牌。持此令者，帝国视为友邦。令牌正面刻有帝国徽记，背面铭文"睿之信"。',
    type: 'key_item',
  },
  naje: {
    id: 'naje',
    name: '纳戒',
    icon: '💍',
    description: '学院制造的储物戒指，内含独立空间，能装不少东西。按 B 键可随时查看其中物品。',
    type: 'key_item',
  },
}

/**
 * 根据 id 获取物品数据
 * @param {string} itemId
 * @returns {object|null}
 */
export function getItem(itemId) {
  return ITEMS[itemId] || null
}
