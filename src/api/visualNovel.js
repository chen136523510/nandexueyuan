import request from './index'

// ===== 全局进度 =====

export function getProgress() {
  return request.get('/visualnovel/progress')
}

export function updateProgress(data) {
  return request.post('/visualnovel/progress', data)
}

// ===== 存档槽 =====

export function listSaves() {
  return request.get('/visualnovel/saves')
}

export function getSave(slot) {
  return request.get(`/visualnovel/saves/${slot}`)
}

export function writeSave(slot, data) {
  return request.post(`/visualnovel/saves/${slot}`, data)
}

export function deleteSave(slot) {
  return request.delete(`/visualnovel/saves/${slot}`)
}
