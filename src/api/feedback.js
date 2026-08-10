import api from './index'

export function listFeedback(params = {}) {
  return api.get('/feedback', { params })
}

export function createFeedback(data) {
  return api.post('/feedback', data)
}

export function deleteFeedback(id) {
  return api.delete(`/feedback/${id}`)
}

export function updateFeedbackStatus(id, data) {
  return api.patch(`/feedback/${id}/status`, data)
}
