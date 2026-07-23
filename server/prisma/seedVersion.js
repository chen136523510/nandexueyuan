import prisma from '../src/lib/prisma.js'

// v2.0.0 版本公告 - 师德墙模块上线
const versionData = {
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
}

async function main() {
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

main()
  .catch((e) => {
    console.error('版本公告写入失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
