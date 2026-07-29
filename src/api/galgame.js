import request from './index'

// ===== 全局进度 =====

export function getProgress() {
  return request.get('/galgame/progress')
}

export function updateProgress(data) {
  return request.post('/galgame/progress', data)
}

// ===== 存档槽 =====

export function listSaves() {
  return request.get('/galgame/saves')
}

export function getSave(slot) {
  return request.get(`/galgame/saves/${slot}`)
}

export function writeSave(slot, data) {
  return request.post(`/galgame/saves/${slot}`, data)
}

export function deleteSave(slot) {
  return request.delete(`/galgame/saves/${slot}`)
}
