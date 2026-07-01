// 统一响应格式
export function success(res, data = null, message = '操作成功') {
  res.json({ code: 0, message, data })
}

export function fail(res, code, message, httpStatus) {
  res.status(httpStatus || 200).json({ code, message, data: null })
}

// 业务错误码
export const ErrorCode = {
  PARAM_ERROR:    { code: 1001, httpStatus: 400 },
  UNAUTHORIZED:   { code: 1002, httpStatus: 401 },
  FORBIDDEN:      { code: 1003, httpStatus: 403 },
  NOT_FOUND:      { code: 1004, httpStatus: 404 },
  CONFLICT:       { code: 1005, httpStatus: 409 },
  SERVER_ERROR:   { code: 5000, httpStatus: 500 },
}
