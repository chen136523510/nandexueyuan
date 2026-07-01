import axios from 'axios'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 请求拦截器：自动注入 JWT
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器：统一处理业务错误
request.interceptors.response.use(
  (response) => {
    const res = response.data
    // 业务成功
    if (res.code === 0) {
      return res
    }
    // 业务失败（非 0 错误码）
    console.error('[API Error]', res.code, res.message)
    return Promise.reject(res)
  },
  (error) => {
    // HTTP 错误（网络层）
    const status = error.response?.status
    if (status === 401) {
      // token 过期/无效，清除并跳转登录
      localStorage.removeItem('token')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    const res = error.response?.data
    if (res) {
      return Promise.reject(res)
    }
    // 网络错误
    console.error('[Network Error]', error.message)
    return Promise.reject({ code: -1, message: '网络异常，请稍后重试', data: null })
  }
)

export default request
