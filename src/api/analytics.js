import api from './index'

// 学院数据·模块访问埋点（岁月史书）
export function reportVisit(data) {
  return api.post('/analytics/visit', data)
}

export function getAnalyticsSummary(days = 30) {
  return api.get('/analytics/summary', { params: { days } })
}
