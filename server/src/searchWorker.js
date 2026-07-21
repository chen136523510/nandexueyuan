/**
 * 黑机 WS Worker（黑机侧）
 *
 * 主动连接云端 WS Hub，接收检索任务并执行，回传结果和进度。
 *
 * 用法：node src/searchWorker.js
 */

import WebSocket from 'ws'
import { PrismaClient } from '@prisma/client'
import { runPersonStatAgent } from './agents/personStatAgent.js'
import { runPersonMessagesAgent } from './agents/personMessagesAgent.js'
import { runMentionedAgent } from './agents/mentionedAgent.js'
import { runTopicSearchAgent } from './agents/topicSearchAgent.js'

const CLOUD_WS_URL = process.env.CLOUD_WS_URL || 'ws://localhost:3000/search-hub'
const BLACK_WORKER_TOKEN = process.env.BLACK_WORKER_TOKEN || 'dev-token-change-in-production'

const HEARTBEAT_INTERVAL = 30000 // 30 秒心跳
const RECONNECT_DELAY = 5000 // 5 秒重连

let ws = null
let heartbeatTimer = null
let reconnectTimer = null
let isShuttingDown = false

// Prisma 实例
const prisma = new PrismaClient()

/**
 * 连接云端 WS Hub
 */
function connect() {
  console.log(`[WS Worker] 连接云端: ${CLOUD_WS_URL}`)
  ws = new WebSocket(CLOUD_WS_URL)

  ws.on('open', () => {
    console.log('[WS Worker] 连接已建立，发送握手...')
    // 握手
    ws.send(JSON.stringify({ type: 'auth', token: BLACK_WORKER_TOKEN }))

    // 开始心跳
    startHeartbeat()
  })

  ws.on('message', async (raw) => {
    let msg
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      console.warn('[WS Worker] 收到非法 JSON，忽略')
      return
    }

    // 握手响应
    if (msg.type === 'auth_ok') {
      console.log('[WS Worker] 认证成功，黑机已上线')
      return
    }

    if (msg.type === 'auth_fail') {
      console.error('[WS Worker] 认证失败:', msg.message)
      ws.close()
      return
    }

    // 心跳响应
    if (msg.type === 'pong') {
      return
    }

    // 收到检索任务
    if (msg.type === 'search_task') {
      await handleSearchTask(msg)
      return
    }

    console.warn('[WS Worker] 收到未知消息类型:', msg.type)
  })

  ws.on('close', (code, reason) => {
    console.log(`[WS Worker] 连接断开 (code=${code}, reason=${reason || ''})`)
    stopHeartbeat()

    if (!isShuttingDown) {
      console.log(`[WS Worker] ${RECONNECT_DELAY / 1000} 秒后重连...`)
      clearTimeout(reconnectTimer)
      reconnectTimer = setTimeout(() => {
        connect()
      }, RECONNECT_DELAY)
    }
  })

  ws.on('error', (err) => {
    console.error('[WS Worker] WS 错误:', err.message)
  })
}

/**
 * 开始心跳
 */
function startHeartbeat() {
  stopHeartbeat()
  heartbeatTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }))
    }
  }, HEARTBEAT_INTERVAL)
}

/**
 * 停止心跳
 */
function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

/**
 * 处理检索任务
 * @param {{ type: 'search_task', taskId: string, agentType: string, task: object }} msg
 */
async function handleSearchTask(msg) {
  const { taskId, agentType, task } = msg
  console.log(`[WS Worker] 收到任务: ${taskId}, type: ${agentType}`)

  const startTime = Date.now()

  try {
    // emit 回调：包装成 WS 消息发回云端
    const emit = (agent, phase, content, data) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'agent_thinking',
          taskId,
          agent,
          phase,
          content,
          data: data || null,
        }))
      }
    }

    // 执行子 Agent（全量模式，limit=null）
    let result
    switch (agentType) {
      case 'person_stat':
        result = await runPersonStatAgent(task, emit)
        break
      case 'person_messages':
        result = await runPersonMessagesAgent(task, emit, { limit: null }) // 全量
        break
      case 'mentioned':
        result = await runMentionedAgent(task, emit, { limit: null }) // 全量
        break
      case 'topic_search':
        result = await runTopicSearchAgent(task, emit)
        break
      default:
        throw new Error(`未知 agentType: ${agentType}`)
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`[WS Worker] 任务 ${taskId} 完成，耗时 ${elapsed} 秒`)

    // 回传结果
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'search_result',
        taskId,
        result,
      }))
    }
  } catch (err) {
    console.error(`[WS Worker] 任务 ${taskId} 失败:`, err.message)

    // 回传错误
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'search_error',
        taskId,
        error: err.message,
      }))
    }
  }
}

/**
 * 优雅退出
 */
function shutdown() {
  isShuttingDown = true
  stopHeartbeat()
  clearTimeout(reconnectTimer)
  if (ws) {
    ws.close()
  }
  prisma.$disconnect()
  console.log('[WS Worker] 已关闭')
}

// 启动
connect()

// 优雅退出监听
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)