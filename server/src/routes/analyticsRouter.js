/**
 * 学院数据（模块访问埋点）-- 岁月史书·学院数据 tab
 *
 * 两个端点：
 * - POST /analytics/visit        前端埋点上报（进入/离开）
 * - GET  /analytics/summary      聚合查询（各模块使用频率 + 平均停留）
 *
 * 表：module_visits（进入记一条，离开回填 leftAt/durationSec）
 * 数据口径：durationSec < 3s 视为误触不计入停留；> 2h 截断为 7200s（挂机）
 */
import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { auth } from '../middleware/auth.js'

const prisma = new PrismaClient()
const router = Router()

// 模块白名单（路由 path -> 模块名），防脏数据
const MODULES = new Set(['home', 'chat', 'wall', 'mailbox', 'nde', 'history', 'character', 'admin'])

const MODULE_LABELS = {
  home: '首页·大厅',
  chat: '男德通',
  wall: '师德墙',
  mailbox: '院长信箱',
  nde: '德塔',
  history: '岁月史书',
  character: '形象选择',
  admin: '男通讯录',
}

/**
 * POST /analytics/visit
 * body: { module, action: 'enter' | 'leave', visitId?, enteredAt? }
 * - enter：创建一条记录，返回 id（前端缓存）
 * - leave：按 id 回填 leftAt/durationSec；body 带 enteredAt 兜底（页面刷新后 visitId 丢失时按 userId+module 找最近一条未关闭记录）
 */
router.post('/visit', auth, async (req, res) => {
  const { module, action, visitId, enteredAt } = req.body || {}
  const userId = req.user.id

  if (!MODULES.has(module)) {
    return res.status(400).json({ code: 1, message: `未知模块：${module}` })
  }

  try {
    if (action === 'enter') {
      // 关掉该用户同模块可能残留的未关闭记录（刷新/崩溃兜底）：按 enteredAt 推算时长回填
      await closeStaleVisits(userId, module)
      const visit = await prisma.moduleVisit.create({
        data: { userId, module, enteredAt: enteredAt ? new Date(enteredAt) : undefined },
      })
      return res.json({ code: 0, data: { visitId: visit.id } })
    }

    if (action === 'leave') {
      let visit = null
      if (visitId) {
        visit = await prisma.moduleVisit.findFirst({ where: { id: visitId, userId, leftAt: null } })
      }
      if (!visit) {
        // 兜底：最近一条同模块未关闭记录
        visit = await prisma.moduleVisit.findFirst({
          where: { userId, module, leftAt: null },
          orderBy: { enteredAt: 'desc' },
        })
      }
      if (!visit) return res.json({ code: 0 }) // 无可关闭记录，静默

      const entered = enteredAt ? new Date(enteredAt) : visit.enteredAt
      const leftAt = new Date()
      let duration = Math.floor((leftAt - entered) / 1000)
      if (duration < 0) duration = 0
      if (duration > 7200) duration = 7200 // 挂机截断 2h

      await prisma.moduleVisit.update({
        where: { id: visit.id },
        data: { leftAt, durationSec: duration },
      })
      return res.json({ code: 0 })
    }

    return res.status(400).json({ code: 1, message: 'action 须为 enter|leave' })
  } catch (err) {
    console.error('[analytics] visit 上报失败:', err.message)
    return res.status(500).json({ code: 1, message: '上报失败' })
  }
})

/** 关闭残留未关闭记录（刷新兜底）：enteredAt 距今超过 2h 按截断 7200s 回填，否则按实际时长 */
async function closeStaleVisits(userId, module) {
  const stale = await prisma.moduleVisit.findMany({
    where: { userId, module, leftAt: null },
    take: 5,
  })
  const now = new Date()
  for (const v of stale) {
    let duration = Math.floor((now - v.enteredAt) / 1000)
    if (duration > 7200) duration = 7200
    if (duration < 0) duration = 0
    await prisma.moduleVisit.update({
      where: { id: v.id },
      data: { leftAt: now, durationSec: duration },
    })
  }
}

/**
 * GET /analytics/summary?days=30
 * 聚合：各模块 访问次数（frequency）/ 总停留 / 平均停留 / 最近访问
 */
router.get('/summary', auth, async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const rows = await prisma.moduleVisit.findMany({
      where: { enteredAt: { gte: since } },
      select: { module: true, enteredAt: true, leftAt: true, durationSec: true, userId: true },
    })

    // 按模块聚合
    const agg = {}
    for (const r of rows) {
      if (!agg[r.module]) {
        agg[r.module] = { module: r.module, label: MODULE_LABELS[r.module] || r.module, visits: 0, users: new Set(), totalSec: 0, validStayCount: 0, lastVisit: null }
      }
      const a = agg[r.module]
      a.visits += 1
      a.users.add(r.userId)
      if (!a.lastVisit || r.enteredAt > a.lastVisit) a.lastVisit = r.enteredAt
      // 停留口径：已关闭且 >=3s 的记录
      if (r.leftAt && r.durationSec != null && r.durationSec >= 3) {
        a.totalSec += r.durationSec
        a.validStayCount += 1
      }
    }

    const modules = Object.values(agg)
      .map(a => ({
        module: a.module,
        label: a.label,
        visits: a.visits,
        uniqueUsers: a.users.size,
        avgSec: a.validStayCount ? Math.round(a.totalSec / a.validStayCount) : null,
        totalSec: a.totalSec,
        lastVisit: a.lastVisit,
      }))
      .sort((x, y) => y.visits - x.visits)

    return res.json({
      code: 0,
      data: {
        days,
        totalVisits: rows.length,
        modules,
        trackedModules: [...MODULES],
        moduleLabels: MODULE_LABELS,
      },
    })
  } catch (err) {
    console.error('[analytics] summary 查询失败:', err.message)
    return res.status(500).json({ code: 1, message: '查询失败' })
  }
})

export { router as analyticsRouter }
