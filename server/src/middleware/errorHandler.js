// 统一错误处理中间件
export function errorHandler(err, req, res, next) {
  console.error('[Server Error]', err.message)
  res.status(err.status || 500).json({
    message: err.message || '服务器内部错误',
  })
}
