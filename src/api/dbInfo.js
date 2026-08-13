import request from './index'

// 群聊数据库统计（首页数据看板用，复用 dbInfoAgent 的 SQL）
export function getDbInfo() {
  return request.get('/chat/db-info')
}
