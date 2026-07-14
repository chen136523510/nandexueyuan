import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'change-me-in-production'

/**
 * 验证 JWT Token（复用 Express 的密钥）
 * @param {string} token - JWT Token
 * @returns {{ userId: number, username: string, nickname: string } | null}
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET)
  } catch (err) {
    console.error('[auth] JWT 验证失败:', err.message)
    return null
  }
}
