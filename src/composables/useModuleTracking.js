/**
 * 模块访问埋点（岁月史书·学院数据）
 *
 * 用法：main.js 调一次 initModuleTracking()。
 * 机制：
 * - 路由进入白名单模块 -> POST enter（拿 visitId 存 sessionStorage）
 * - 路由离开（切页/刷新/关标签）-> POST leave 回填时长
 * - 刷新兜底：visitId 存 sessionStorage，刷新后新 enter 前不补报 leave（后端 closeStaleVisits 兜底关闭）
 * - sendBeacon 保底：beforeunload 时 fetch 可能被杀，用 sendBeacon 发 leave
 */
import { useAuthStore } from '../stores/auth'
import { reportVisit } from '../api/analytics'

// 模块白名单：路由 name -> 埋点 module 名（与后端 MODULES 一致）
const ROUTE_MODULE = {
  home: 'home',
  chat: 'chat',
  wall: 'wall',
  mailbox: 'mailbox',
  nde: 'nde',
  history: 'history',
  character: 'character',
  admin: 'admin',
}

const SESSION_KEY = 'nde-visit-tracks'
// 运行时跟踪态：{ [module]: { visitId, enteredAt } }（同模块理论同时只有一条）
let tracks = {}
let routerInstance = null

/** 读 sessionStorage 恢复（刷新场景下 leave 补报用 visitId） */
function loadTracks() {
  try {
    tracks = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}')
  } catch {
    tracks = {}
  }
}

function saveTracks() {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(tracks))
  } catch { /* 隐私模式等场景静默 */ }
}

async function sendEnter(module) {
  const auth = useAuthStore()
  if (!auth.isLoggedIn) return
  try {
    const res = await reportVisit({ module, action: 'enter' })
    // 拦截器已剥一层：res = { code, message, data: { visitId } }
    const visitId = res?.data?.visitId
    if (visitId) {
      tracks[module] = { visitId, enteredAt: new Date().toISOString() }
      saveTracks()
    }
  } catch { /* 埋点失败不影响业务 */ }
}

function sendLeave(module, useBeacon = false) {
  const auth = useAuthStore()
  const t = tracks[module]
  if (!auth.isLoggedIn || !t) return
  delete tracks[module]
  saveTracks()

  const payload = JSON.stringify({ module, action: 'leave', visitId: t.visitId, enteredAt: t.enteredAt })
  if (useBeacon && navigator.sendBeacon) {
    // sendBeacon 只能发 Blob，Content-Type 走 JSON；token 放 body（后端 leave 走 auth——见下方 query 补偿）
    navigator.sendBeacon(
      `/api/analytics/visit?token=${encodeURIComponent(auth.token || '')}`,
      new Blob([payload], { type: 'application/json' })
    )
    return
  }
  reportVisit({ module, action: 'leave', visitId: t.visitId, enteredAt: t.enteredAt }).catch(() => {})
}

/** main.js 调用：挂路由监听 */
export function initModuleTracking(router) {
  routerInstance = router
  loadTracks()

  router.afterEach((to) => {
    const nextModule = ROUTE_MODULE[to.name]
    // 离开旧模块（tracks 里所有 != nextModule 的）
    for (const m of Object.keys(tracks)) {
      if (m !== nextModule) sendLeave(m)
    }
    // 进入新模块
    if (nextModule && !tracks[nextModule]) {
      sendEnter(nextModule)
    }
  })

  // 关标签/刷新保底
  window.addEventListener('beforeunload', () => {
    for (const m of Object.keys(tracks)) {
      sendLeave(m, true)
    }
  })
}
