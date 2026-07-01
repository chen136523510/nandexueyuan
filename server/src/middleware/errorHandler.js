import { ErrorCode } from '../utils/response.js'

// 业务错误类
export class ApiError extends Error {
  constructor(errorInfo, message) {
    super(message || errorInfo.code.toString())
    this.code = errorInfo.code
    this.httpStatus = errorInfo.httpStatus
  }
}

// 统一错误处理中间件
export function errorHandler(err, req, res, next) {
  // ApiError 业务错误
  if (err instanceof ApiError) {
    return res.status(err.httpStatus).json({
      code: err.code,
      message: err.message,
      data: null,
    })
  }

  // Prisma 错误
  if (err.code === 'P2002') {
    return res.status(409).json({
      code: 1005,
      message: '数据冲突',
      data: null,
    })
  }

  console.error('[Server Error]', err)
  const info = ErrorCode.SERVER_ERROR
  res.status(info.httpStatus).json({
    code: info.code,
    message: '服务器内部错误',
    data: null,
  })
}
