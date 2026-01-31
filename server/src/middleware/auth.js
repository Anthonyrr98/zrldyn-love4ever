import jwt from 'jsonwebtoken'
import { config } from '../config/env.js'

/** 必须登录，否则 401 */
export function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const [scheme, token] = authHeader.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: '未登录或令牌缺失' })
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret)
    req.user = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    }
    return next()
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? '登录已过期，请重新登录'
      : '令牌无效，请重新登录'
    return res.status(401).json({ message: msg })
  }
}

/** 可选登录：有有效 token 则设置 req.user，否则 req.user 为 undefined */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const [scheme, token] = authHeader.split(' ')
  req.user = undefined
  if (scheme !== 'Bearer' || !token) return next()
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    req.user = {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    }
  } catch {
    // 忽略无效 token
  }
  next()
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: '需要管理员权限' })
  }
  return next()
}

