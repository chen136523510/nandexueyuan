import request from './index.js'

// 上传群聊 CSV（admin+）
export function importChatCsv(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/admin/chat/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000, // 文件上传放宽至 60s
  })
}

// 导入批次列表（admin+）
export function listBatches() {
  return request.get('/admin/chat/batches')
}

// 提问（已登录）
export function askChat(question, sessionId) {
  return request.post('/chat/ask', { question, sessionId }, { timeout: 120000 })
}

// 会话列表（已登录）
export function listSessions() {
  return request.get('/chat/sessions')
}

// 会话详情（已登录）
export function getSession(id) {
  return request.get(`/chat/sessions/${id}`)
}

// 删除会话（已登录）
export function deleteSession(id) {
  return request.delete(`/chat/sessions/${id}`)
}
