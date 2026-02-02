import { findUserByUsername, verifyPassword, createJwtToken } from '../services/userService.js'

export async function login(req, res, next) {
  try {
    const { username, password } = req.body || {}

    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码必填' })
    }

    const user = await findUserByUsername(username)
    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' })
    }

    const ok = await verifyPassword(password, user.password_hash)
    if (!ok) {
      return res.status(401).json({ message: '用户名或密码错误' })
    }

    const token = createJwtToken(user)

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    })
  } catch (err) {
    return next(err)
  }
}
