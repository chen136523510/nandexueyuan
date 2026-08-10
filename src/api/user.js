import request from './index'

export function updateProfile(data) {
  // 如果包含头像文件，用 FormData 提交
  if (data.avatarFile) {
    const formData = new FormData()
    if (data.nickname !== undefined) formData.append('nickname', data.nickname)
    formData.append('avatar', data.avatarFile)
    return request.put('/user/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }
  // 无头像文件，纯 JSON
  const payload = {}
  if (data.nickname !== undefined) payload.nickname = data.nickname
  return request.put('/user/profile', payload)
}

export function updateSkin(data) {
  return request.put('/user/skin', data)
}

export function updatePassword(data) {
  return request.put('/user/password', data)
}
