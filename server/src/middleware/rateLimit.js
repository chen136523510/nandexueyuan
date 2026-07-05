import { fail, ErrorCode } from '../utils/response.js'

// 简单内存限流：每用户 N 次/分钟
const requests = new Map()

export function rateLimit(maxPerMinute = 10) {
  return (req, res, next) => {
    const key = req.user?.id
    if (!key) return next()

    const now = Date.now()
    const window = 60 * 1000

    if (!requests.has(key)) {
      requests.set(key, [])
    }

    const timestamps = requests.get(key)
    const valid = timestamps.filter((t) => now - t < window)

    if (valid.length >= maxPerMinute) {
      return fail(res, 4290, '提问过于频繁，请稍后再试', 429)
    }

    valid.push(now)
    requests.set(key, valid)
    next()
  }
}
