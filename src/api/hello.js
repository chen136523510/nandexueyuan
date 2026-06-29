import request from './index'

// 联通性测试
export const getHello = () => request.get('/hello')
