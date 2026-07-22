import request from './index'

export function updateProfile(data) {
  return request.put('/user/profile', data)
}

export function updateSkin(data) {
  return request.put('/user/skin', data)
}

export function updatePassword(data) {
  return request.put('/user/password', data)
}
