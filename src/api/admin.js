import request from './index'

/** 成员列表 */
export function listUsers() {
  return request.get('/admin/users')
}

/** 禁用/启用成员 */
export function updateUserStatus(id, status) {
  return request.patch(`/admin/users/${id}/status`, { status })
}

/** 重置成员密码 */
export function resetUserPassword(id) {
  return request.post(`/admin/users/${id}/reset-password`)
}

/** 变更角色（仅院长） */
export function updateUserRole(id, role) {
  return request.patch(`/admin/users/${id}/role`, { role })
}