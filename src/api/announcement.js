import request from './index'

export function getAnnouncement() {
  return request.get('/announcement')
}

export function updateAnnouncement(content) {
  return request.put('/announcement', { content })
}
