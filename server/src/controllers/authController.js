import { findUserByUsername, verifyPassword, createJwtToken, createUser } from '../services/userService.js'

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

    if (user.status && user.status !== 'active') {
      return res.status(403).json({ message: '账号已被禁用，请联系管理员' })
    }

    const token = createJwtToken(user)

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email || null,
        status: user.status || 'active',
      },
    })
  } catch (err) {
    return next(err)
  }
}

export async function register(req, res, next) {
  try {
    const { username, password, email } = req.body || {}

    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码必填' })
    }

    const user = await createUser({
      username,
      password,
      email,
      role: 'viewer',
      status: 'active',
    })

    const token = createJwtToken(user)

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email || null,
        status: user.status || 'active',
      },
    })
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ message: err.message })
    }
    return next(err)
  }
}
