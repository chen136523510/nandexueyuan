import request from './index.js'

// 会话列表（admin）
export function listNonoSessions() {
  return request.get('/nono/sessions')
}

// 会话详情（admin）
export function getNonoSession(id) {
  return request.get(`/nono/sessions/${id}`)
}

// 删除会话（admin）
export function deleteNonoSession(id) {
  return request.delete(`/nono/sessions/${id}`)
}

// 诺诺的记忆（admin）：{ profile, memories[] }
export function getNonoMemories() {
  return request.get('/nono/memories')
}

// 删除一条记忆（admin）
export function deleteNonoMemory(id) {
  return request.delete(`/nono/memories/${id}`)
}
