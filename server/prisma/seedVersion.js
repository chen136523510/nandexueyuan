import prisma from '../src/lib/prisma.js'

// 版本公告数据 -- 倒序排列（最新在最上方）
// 版本号规则见 ADR-004：vx.y.z 三段式语义化版本
// 补录历史版本使版本历史连续完整，依据根 CHANGELOG.md 还原
const versionList = [
  {
    version: 'v2.0.0',
    date: new Date('2026-07-23'),
    summary: '新增师德墙模块，横向画展式浏览，支持图文动态、评论、点赞',
    updates: JSON.stringify([
      '新增师德墙模块：发布图文动态、评论、点赞，横向画展式布局浏览',
      '新增系统管理员账号，系统默认数据（种子动态等）统一归属',
      '导航栏新增师德墙入口（男德通与男通讯录之间）',
    ], null, 0),
    plans: JSON.stringify([
      '版本号规则规范化（R-007）',
      '角色精灵表生成（R-003）',
    ], null, 0),
  },
  {
    // R-005 黑机外包检索算力，BUG-36 架构优化
    version: 'v1.2.0',
    date: new Date('2026-07-21'),
    summary: '黑机外包检索算力，WebSocket 长连接方案解决云端 OOM',
    updates: JSON.stringify([
      '新增黑机 WebSocket Worker，重度检索任务外包给黑机全量执行',
      '降级策略：黑机离线/超时自动降级本地 LIMIT 50，不宕机',
      '云端 Express 升级为 http.createServer + WS Hub 挂载',
    ], null, 0),
    plans: JSON.stringify([
      '数据增量同步机制优化（当前首量 scp）',
      'NPC AI 对话增强调研',
    ], null, 0),
  },
  {
    // NPC 精灵 + 男德通检索优化 + 版本公告系统（R-004）
    version: 'v1.1.0',
    date: new Date('2026-07-20'),
    summary: '德塔 NPC 精灵接入 + 男德通检索逻辑优化 + 版本公告系统上线',
    updates: JSON.stringify([
      '新增德塔 NPC 精灵（男德通）及立绘展示',
      '优化男德学院男德通模块的检索逻辑',
      '新增版本公告系统（版本管理 + 变更日志 + 未来规划）',
      '新增传送门交互（按 E 确认离开德塔）',
    ], null, 0),
    plans: JSON.stringify([
      '预期在德塔接入怪物系统和战斗系统',
      '男德学院新增导师墙',
    ], null, 0),
  },
]

async function main() {
  for (const versionData of versionList) {
    // 幂等：已存在则更新，不存在则创建
    const existing = await prisma.version.findUnique({ where: { version: versionData.version } })
    if (existing) {
      await prisma.version.update({
        where: { version: versionData.version },
        data: versionData,
      })
      console.log(`版本 ${versionData.version} 已存在，已更新`)
    } else {
      await prisma.version.create({ data: versionData })
      console.log(`版本 ${versionData.version} 已创建`)
    }
  }
  console.log(`共处理 ${versionList.length} 条版本记录`)
}

main()
  .catch((e) => {
    console.error('版本公告写入失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
