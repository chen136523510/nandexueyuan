import request from './index'

/** 生成邀请码 */
export function createInviteCode() {
  return request.post('/invite-codes')
}

/** 邀请码列表 */
export function listInviteCodes() {
  return request.get('/invite-codes')
}