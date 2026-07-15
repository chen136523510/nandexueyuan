import jwt from 'jsonwebtoken'

/**
 * 获取 JWT 密钥（运行时读取，确保 dotenv 已加载）
 * 不能用顶层 const，因为 ESM import 在 dotenv.config() 之前执行
 */
function getSecret() {
  return process.env.JWT_SECRET || 'change-me-in-production'
}

/**
 * 验证 JWT Token（复用 Express 的密钥）
 * @param {string} token - JWT Token
 * @returns {{ userId: number, username: string, nickname: string } | null}
 */
export function verifyToken(token) {
  const secret = getSecret()
  try {
    return jwt.verify(token, secret)
  } catch (err) {
    // 尝试回退密钥
    const fallback = 'change-me-in-production'
    if (secret !== fallback) {
      try {
        return jwt.verify(token, fallback)
      } catch (e2) {
        // 两个密钥都失败
      }
    }
    console.error('[auth] JWT 验证失败:', err.message)
    return null
  }
}