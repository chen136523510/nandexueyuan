import request from './index'

export function getAnnouncement() {
  return request.get('/announcement')
}

export function getVersions() {
  return request.get('/announcement/versions')
}

export function createVersion(data) {
  return request.post('/announcement/versions', data)
}

export function updateVersion(id, data) {
  return request.put(`/announcement/versions/${id}`, data)
}

export function deleteVersion(id) {
  return request.delete(`/announcement/versions/${id}`)
}
