import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getDbPool } from '../config/db.js'
import { config } from '../config/env.js'

export async function findUserByUsername(username) {
  const pool = getDbPool()
  const [rows] = await pool.query('SELECT * FROM users WHERE username = ? LIMIT 1', [username])
  return rows[0] || null
}

export async function findUserById(id) {
  const pool = getDbPool()
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id])
  return rows[0] || null
}

export async function createUser({ username, password, email, role = 'viewer', status = 'active' }) {
  const pool = getDbPool()

  const name = (username || '').trim()
  if (!name) {
    const err = new Error('用户名不能为空')
    err.status = 400
    throw err
  }

  // 基础长度限制：与前端保持一致
  if (name.length < 3 || name.length > 32) {
    const err = new Error('用户名长度需在 3-32 个字符之间')
    err.status = 400
    throw err
  }

  const existing = await findUserByUsername(name)
  if (existing) {
    const err = new Error('用户名已存在')
    err.status = 409
    throw err
  }

  const pwd = typeof password === 'string' ? password : ''
  if (!pwd || pwd.length < 6) {
    const err = new Error('密码长度至少为 6 位')
    err.status = 400
    throw err
  }

  const hashed = await bcrypt.hash(pwd, 10)
  const safeEmail = typeof email === 'string' ? email.trim().slice(0, 128) || null : null

  const [result] = await pool.query(
    'INSERT INTO users (username, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
    [name, safeEmail, hashed, role, status],
  )

  const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [result.insertId])
  return rows[0] || null
}

export async function setUserPassword(userId, newPassword) {
  const pool = getDbPool()
  const pwd = typeof newPassword === 'string' ? newPassword : ''
  if (!pwd || pwd.length < 6) {
    const err = new Error('密码长度至少为 6 位')
    err.status = 400
    throw err
  }
  const hashed = await bcrypt.hash(pwd, 10)
  const [result] = await pool.query(
    'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [hashed, userId],
  )
  if (result.affectedRows === 0) {
    const err = new Error('用户不存在')
    err.status = 404
    throw err
  }
  return true
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

