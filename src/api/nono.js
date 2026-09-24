import request from './index.js'

// 直播流历史消息（admin）：{ messages, hasMore }
export function getNonoMessages(before, limit = 50) {
  const params = { limit }
  if (before) params.before = before
  return request.get('/nono/messages', { params })
}

// 发消息进直播流（admin）
export function sendNonoMessage(content) {
  return request.post('/nono/talk', { content })
}

// 诺诺的记忆（admin）：{ profile, memories[] }
export function getNonoMemories() {
  return request.get('/nono/memories')
}

// 删除一条记忆（admin）
export function deleteNonoMemory(id) {
  return request.delete(`/nono/memories/${id}`)
}
