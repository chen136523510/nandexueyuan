import prisma from '../src/lib/prisma.js'

// 版本公告数据 -- 倒序排列（最新在最上方）
// 版本号规则见 ADR-004：vx.y.z 三段式语义化版本
// 补录历史版本使版本历史连续完整，依据根 CHANGELOG.md 还原
const versionList = [
  {
    version: 'v3.2.0',
    date: new Date('2026-08-10'),
    summary: '男德通AI全面升级',
    updates: JSON.stringify([
      '男德通AI回答支持Markdown格式渲染（加粗/列表/表格）',
      '新增4套人设切换：体委/丘比/开开/正常人，还支持自定义人设',
      '新增院长信箱，可以提交BUG反馈/功能优化/功能新增/剧情设计需求',
      '男德通AI可以帮你自动起草信件，确认后一键投递到院长信箱',
      '个人中心头像改为文件上传，不再需要填URL',
      '黑机离线时查询会提示降级模式，不会再傻等',
      '检索能力增强，话题搜索支持同义词扩展',
    ], null, 0),
    plans: JSON.stringify([
      '第一章后续章节剧情',
      '网站知识库（AI可回答词云/版本/世界观/角色相关问题）',
      '向量语义检索（规划中）',
    ], null, 0),
  },
  {
    version: 'v3.1.0',
    date: new Date('2026-08-10'),
    summary: '界面交互优化',
    updates: JSON.stringify([
      '全站弹窗升级为自定义样式，告别浏览器原生弹窗的粗糙感',
      '提升无障碍体验，图标按钮支持屏幕阅读器朗读',
      '新增自动化测试基础设施，保障后续迭代质量',
    ], null, 0),
    plans: JSON.stringify([
      '第一章后续章节剧情',
      '菜单与地图界面美化（调研中）',
      '手机/消息系统（规划中）',
    ], null, 0),
  },
  {
    version: 'v3.0.2',
    date: new Date('2026-08-09'),
    summary: '全站图片压缩优化，加载更快',
    updates: JSON.stringify([
      '德塔全部场景图、立绘、地图、道具图压缩优化，画质不变体积减少80%',
      '进入德塔和场景切换的加载速度大幅提升',
    ], null, 0),
    plans: JSON.stringify([
      '第一章后续章节剧情',
      '菜单与地图界面美化（调研中）',
      '手机/消息系统（规划中）',
    ], null, 0),
  },
  {
    version: 'v3.0.1',
    date: new Date('2026-08-08'),
    summary: '修复塔楼自由探索的跳转问题',
    updates: JSON.stringify([
      '修复在塔楼里走动时，部分楼层之间没法来回的问题',
      '修复在房间里休息时，会被莫名带出门的问题',
      '修复上楼后找不到回房间入口的问题',
      '修复进入房间后无法离开的问题',
    ], null, 0),
    plans: JSON.stringify([
      '第一章后续章节剧情',
      '第二章自由探索展开',
      '手机/消息系统（规划中）',
    ], null, 0),
  },
  {
    version: 'v3.0.0',
    date: new Date('2026-08-07'),
    summary: '第一章新增第二幕、第三幕剧情 + 塔楼自由探索',
    updates: JSON.stringify([
      '新增第一章第二幕、第三幕剧情，故事继续推进',
      '新增塔楼自由探索：可以在大厅、走廊、房间之间走动，和伙伴们聊聊天',
      '新增多张场景图与角色立绘，演出更丰富',
      '新增神秘来信等关键道具',
      '修复部分场景切换时机的演出问题',
    ], null, 0),
    plans: JSON.stringify([
      '第一章后续章节剧情',
      '第二章自由探索展开',
      '手机/消息系统（规划中）',
    ], null, 0),
  },
  {
    version: 'v2.4.0',
    date: new Date('2026-08-03'),
    summary: '社区站视觉体系统一：霞鹜文楷+莫兰迪token+首页重构',
    updates: JSON.stringify([
      '引入霞鹜文楷作为标题字体，标题与正文形成字体配对',
      '首页重构：hero改为左对齐编辑式布局，卡片改为纵向非对称排列',
      '男德通页面深色顶栏改为浅色，全页配色统一为莫兰迪体系',
      '师德墙、主界面标题字体统一，硬编码颜色全部token化',
      '清理根目录过程文件，保持仓库整洁',
    ], null, 0),
    plans: JSON.stringify([
      '第一章「三线剧变」主线剧情',
      '手机/消息系统调研',
    ], null, 0),
  },
  {
    version: 'v2.3.0',
    date: new Date('2026-08-01'),
    summary: '序章体验大升级：存档优化+热点Q&A+世界地图+旁白打磨',
    updates: JSON.stringify([
      '存档系统优化：进入德塔自动跟进上次进度，新建存档从头开始',
      '序章结束场景热点交互：点击见/添触发对话，点击地图查看世界格局',
      '热点场景添对话改为Q&A问答模式，主线流程隔离不互相干扰',
      '世界格局地图上线：Seedream生成2K世界地图，热点点击展示地图面板',
      '序章全四幕旁白优化：减密度+做白描+删升华句+删情绪标签，台词零改动',
      '修复储物发放场景上下楼方向穿帮（pro_302）',
    ], null, 0),
    plans: JSON.stringify([
      '第一章「三线剧变」主线剧情',
      '手机/消息系统调研',
    ], null, 0),
  },
  {
    version: 'v2.2.0',
    date: new Date('2026-07-29'),
    summary: '原德塔设计废弃，正处于重构中',
    updates: JSON.stringify([
      '原德塔2D游戏设计废弃，正在重构为全新方向',
      '德塔页签暂时显示"正在重构"占位页',
    ], null, 0),
    plans: JSON.stringify([
      '德塔将以全新形态回归',
    ], null, 0),
  },
  {
    version: 'v2.1.1',
    date: new Date('2026-07-27'),
    summary: '德塔大门开放可前往森林，形象3/4方向修正，体验优化',
    updates: JSON.stringify([
      '德塔大门开放：按E开门后可通行至森林战斗区，开门时触发彩蛋对话',
      '角色形象3、形象4左右朝向修正：精灵表方向行映射修正',
      '大门右墙留出缺口，移除通行障碍',
    ], null, 0),
    plans: JSON.stringify([
      '更多形象精灵表资源接入',
      '战斗系统数值平衡调优',
    ], null, 0),
  },
  {
    version: 'v2.1.0',
    date: new Date('2026-07-24'),
    summary: '角色行走精灵表全量上线，5套真实像素角色替换色块占位',
    updates: JSON.stringify([
      '新增5套角色行走精灵表（4方向×4帧动画），替换原来的色块占位',
      '角色选择页支持精灵预览，新增返回按钮',
      '多人同屏角色显示尺寸从32×32升级到64×64',
    ], null, 0),
    plans: JSON.stringify([
      '德塔战斗系统（塔外区域+怪物+装备）',
      '世界观创作（酒馆+DeepSeek）',
    ], null, 0),
  },
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
