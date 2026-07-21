/**
 * 创建版本公告 v1.2.0（多 Agent 协作检索）
 *
 * 用法：
 *   本地：node scripts/create-version-v1.2.0.js
 *   生产：ssh root@47.96.158.104 "cd /root/projects/www.nandexueyuan.top/server && node ../scripts/create-version-v1.2.0.js"
 *
 * 脚本会先读取当前线上公告，如果 v1.2.0 已存在则跳过。
 */

const http = require('http')
const HOST = 'localhost'
const PORT = 3000

const LOGIN_DATA = JSON.stringify({ username: 'chenzijian', password: 'admin123456' })

const NEW_VERSION = {
  version: 'v1.2.0',
  date: '2026-07-21',
  summary: '男德通AI升级为多Agent协作检索，检索精度与思考透明度大幅提升',
  updates: [
    '男德通AI升级为动态多Agent协作检索，大Agent智能规划检索任务',
    '新增4种专业子Agent：人物统计、人物发言、被提及内容、话题检索',
    '检索结果全量返回，每条消息附带前后各5条上下文',
    '新增思考过程可视化，展示各子Agent的检索数据和分析推理',
    '优化时间范围类问题的检索',
  ],
  plans: [
    '玩家精灵系统ComfyUI美术资源生成',
    '德塔P4角色创建系统',
    '男德通记忆系统（跨会话上下文）',
  ],
}

function login() {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: HOST, port: PORT, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(LOGIN_DATA) } },
      (res) => {
        let d = ''
        res.on('data', (c) => (d += c))
        res.on('end', () => {
          const token = JSON.parse(d).data.token
          resolve(token)
        })
      },
    )
    req.on('error', reject)
    req.write(LOGIN_DATA)
    req.end()
  })
}

function getVersions(token) {
  return new Promise((resolve, reject) => {
    http.get(
      { hostname: HOST, port: PORT, path: '/api/announcement/versions', headers: { Authorization: 'Bearer ' + token } },
      (res) => {
        let d = ''
        res.on('data', (c) => (d += c))
        res.on('end', () => {
          const j = JSON.parse(d)
          resolve(j.data || [])
        })
      },
    ).on('error', reject)
  })
}

function createVersion(token) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(NEW_VERSION)
    const req = http.request(
      { hostname: HOST, port: PORT, path: '/api/announcement/versions', method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, 'Content-Length': Buffer.byteLength(body) } },
      (res) => {
        let d = ''
        res.on('data', (c) => (d += c))
        res.on('end', () => resolve({ status: res.statusCode, body: d }))
      },
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

;(async () => {
  console.log('1. 登录...')
  const token = await login()
  console.log('   Token:', token.substring(0, 20) + '...')

  console.log('2. 读取当前线上公告...')
  const versions = await getVersions(token)
  console.log('   现有版本:', versions.map((v) => v.version).join(', '))

  // 检查是否已存在
  const exists = versions.find((v) => v.version === NEW_VERSION.version)
  if (exists) {
    console.log(`3. v1.2.0 已存在，跳过创建`)
    console.log('   当前内容:', JSON.stringify(exists, null, 2))
    return
  }

  console.log('3. 创建 v1.2.0...')
  const result = await createVersion(token)
  console.log('   结果:', result.status, result.body)
})().catch((e) => console.error('Error:', e.message))
