/**
 * 德塔（NDO）NPC 配置
 * 定义 NPC 的位置、交互类型、对话内容
 */

export const NPCS = [
  {
    id: 'nandetong',
    name: '男德通',
    x: 1000,             // 地图坐标（像素）
    y: 800,
    spriteKey: 'npc_nandetong',
    portraitKey: 'portrait_nandetong',
    interactType: 'ai_chat',  // 打开 AI 对话窗口
    greetText: '嘿，有什么事要问我？',
  },
  // 以下待添加更多 NPC
  // {
  //   id: 'dean',
  //   name: '院长',
  //   x: 500,
  //   y: 800,
  //   spriteKey: 'npc_dean',
  //   portraitKey: 'portrait_dean',
  //   interactType: 'dialog',
  //   dialog: ['欢迎来到德塔！', '这里是一个像素世界，尽情探索吧。'],
  // },
]

/** 可交互物品 */
export const ITEMS = [
  {
    id: 'notice_board',
    name: '群公告',
    x: 1400,
    y: 800,
    spriteKey: 'item_board_notice',
    interactType: 'announcement',  // 打开群公告面板
  },
]