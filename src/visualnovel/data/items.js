/**
 * 德塔视觉小说 物品数据
 *
 * 物品定义存放在此处，剧本 event 节点通过 grantItem: '物品id' 发放。
 * PoC 阶段 icon 用 emoji 占位，后续黑机提供图片后替换为 <img :src="...">。
 *
 * 注意：纳戒是储物空间（背包）本身，不是背包里的物品。
 * 玩家获得纳戒后解锁背包功能，纳戒不作为物品出现在物品列表中。
 */

export const ITEMS = {
  rui_emblem: {
    id: 'rui_emblem',
    name: '睿帝令',
    icon: '🔶',
    description: '帝国皇帝睿赐予的信物令牌。持此令者，帝国视为友邦。令牌正面刻有帝国徽记，背面铭文"睿之信"。',
    type: 'key_item',
  },
  grassland_deed: {
    id: 'grassland_deed',
    name: '草原治属文书',
    icon: '📜',
    description: '由睿帝亲自颁布的文书，上面纹满了复杂的魔法回路。学院与帝国契约的凭据——具体条款因谈判内容而异。',
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
