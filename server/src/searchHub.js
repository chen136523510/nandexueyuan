/**
 * 搜索服务 WS Hub（云端侧）
 *
 * 黑机 WS Worker 主动连接此 Hub，云端通过 WS 下发检索任务，黑机执行后回传结果。
 *
 * 消息协议：
 * 1. 鉴权：黑机发 { type: 'auth', token } -> 云端回 { type: 'auth_ok' } 或关闭连接
 * 2. 心跳：黑机发 { type: 'ping' } -> 云端回 { type: 'pong' }
 * 3. 任务下发：云端发 { type: 'search_task', taskId, agentType, task }
 *    黑机回传进度：{ type: 'agent_thinking', taskId, agent, phase, content, data }
 *    黑机回传结果：{ type: 'search_result', taskId, result }
 *    黑机回传错误：{ type: 'search_error', taskId, error }
 */

import { WebSocketServer } from 'ws'

const BLACK_WORKER_TOKEN = process.env.BLACK_WORKER_TOKEN || 'dev-token-change-in-production'
const HEARTBEAT_TIMEOUT = 60000 // 60 秒无 ping 判定离线
const TASK_TIMEOUT = 15000 // 单任务 15 秒超时

let wss = null
let blackWs = null // 当前黑机连接实例
let blackOnline = false
let lastPingTime = 0
let heartbeatChecker = null

// 待处理任务：taskId -> { resolve, reject, emit, timeout }
const pendingTasks = new Map()

/**
 * 将 WS Hub 挂载到 HTTP 服务器
 * @param {import('http').Server} server HTTP 服务器实例
 */
export function attachSearchHub(server) {
  wss = new WebSocketServer({ server, path: '/search-hub' })

  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress
    console.log(`[SearchHub] 新连接来自 ${clientIp}`)

    ws.isAlive = false // 鉴权前标记为未认证

    ws.on('message', (raw) => {
      let msg
      try {
        msg = JSON.parse(raw.toString())
      } catch {
        console.warn('[SearchHub] 收到非法 JSON，忽略')
        return
      }

      // 鉴权
      if (msg.type === 'auth') {
        if (msg.token === BLACK_WORKER_TOKEN) {
          ws.isAlive = true
          blackWs = ws
          blackOnline = true
          lastPingTime = Date.now()
          console.log('[SearchHub] 黑机认证成功，已上线')
          ws.send(JSON.stringify({ type: 'auth_ok' }))
        } else {
          console.warn('[SearchHub] 认证失败，关闭连接')
          ws.send(JSON.stringify({ type: 'auth_fail', message: 'Invalid token' }))
          ws.close(1008, 'Unauthorized')
        }
        return
      }

      // 未认证的消息一律忽略
      if (!ws.isAlive) return

      // 心跳
      if (msg.type === 'ping') {
        lastPingTime = Date.now()
        ws.send(JSON.stringify({ type: 'pong' }))
        return
      }

      // 子 Agent 进度回传 -> 转发给 SSE
      if (msg.type === 'agent_thinking') {
        const pending = pendingTasks.get(msg.taskId)
        if (pending && pending.emit) {
          pending.emit(msg.agent, msg.phase, msg.content, msg.data || null)
        }
        return
      }

      // 最终结果
      if (msg.type === 'search_result') {
        const pending = pendingTasks.get(msg.taskId)
        if (pending) {
          clearTimeout(pending.timeout)
          pendingTasks.delete(msg.taskId)
          pending.resolve(msg.result)
        }
        return
      }

      // 错误
      if (msg.type === 'search_error') {
        const pending = pendingTasks.get(msg.taskId)
        if (pending) {
          clearTimeout(pending.timeout)
          pendingTasks.delete(msg.taskId)
          pending.reject(new Error(msg.error || '黑机执行失败'))
        }
        return
      }
    })

    ws.on('close', () => {
      if (blackWs === ws) {
        console.log('[SearchHub] 黑机断开连接')
        blackWs = null
        blackOnline = false
        // 拒绝所有待处理任务，触发降级
        for (const [taskId, pending] of pendingTasks) {
          clearTimeout(pending.timeout)
          pendingTasks.delete(taskId)
          pending.reject(new Error('黑机断开连接'))
        }
      }
    })

    ws.on('error', (err) => {
      console.error('[SearchHub] WS 错误:', err.message)
    })
  })

  // 心跳超时检测：每 20 秒检查一次
  heartbeatChecker = setInterval(() => {
    if (blackOnline && Date.now() - lastPingTime > HEARTBEAT_TIMEOUT) {
      console.log('[SearchHub] 黑机心跳超时，标记离线')
      blackOnline = false
      if (blackWs) {
        blackWs.close(1000, '心跳超时')
        blackWs = null
      }
      // 拒绝所有待处理任务
      for (const [taskId, pending] of pendingTasks) {
        clearTimeout(pending.timeout)
        pendingTasks.delete(taskId)
        pending.reject(new Error('黑机心跳超时'))
      }
    }
  }, 20000)

  console.log('[SearchHub] WS Hub 已挂载到 /search-hub')
}

/**
 * 黑机是否在线
 * @returns {boolean}
 */
export function isBlackOnline() {
  return blackOnline && blackWs !== null && blackWs.readyState === 1 // OPEN
}

/**
 * 通过 WS 向黑机下发检索任务
 * @param {object} task 任务对象 { type, target/keywords }
 * @param {function} emit SSE 进度回调 (agent, phase, content, data)
 * @returns {Promise<object>} 子 Agent 的返回值
 */
export function sendSearchTask(task, emit) {
  return new Promise((resolve, reject) => {
    if (!isBlackOnline()) {
      reject(new Error('黑机离线'))
      return
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    // 超时处理
    const timeout = setTimeout(() => {
      pendingTasks.delete(taskId)
      reject(new Error('黑机检索超时（15s）'))
    }, TASK_TIMEOUT)

    pendingTasks.set(taskId, { resolve, reject, emit, timeout })

    // 下发任务
    const msg = {
      type: 'search_task',
      taskId,
      agentType: task.type,
      task,
    }
    blackWs.send(JSON.stringify(msg), (err) => {
      if (err) {
        clearTimeout(timeout)
        pendingTasks.delete(taskId)
        reject(new Error(`WS 发送失败: ${err.message}`))
      }
    })

    console.log(`[SearchHub] 下发任务 ${taskId} (${task.type}) 给黑机`)
  })
}

/**
 * 关闭 WS Hub（用于优雅退出）
 */
export function closeSearchHub() {
  if (heartbeatChecker) clearInterval(heartbeatChecker)
  if (wss) wss.close()
}
