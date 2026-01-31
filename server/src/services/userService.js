import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getDbPool } from '../config/db.js'
import { config } from '../config/env.js'

export async function findUserByUsername(username) {
  const pool = getDbPool()
  const [rows] = await pool.query('SELECT * FROM users WHERE username = ? LIMIT 1', [username])
  return rows[0] || null
}

export async function verifyPassword(plainPassword, passwordHash) {
  if (!passwordHash) return false
  try {
    return await bcrypt.compare(plainPassword, passwordHash)
  } catch {
    return false
  }
}

export function createJwtToken(user) {
  const payload = {
    sub: user.id,
    username: user.username,
    role: user.role,
  }
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '30d' })
}

