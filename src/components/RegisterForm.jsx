import { useState } from 'react'
import { login, register as registerApi, saveAuth as saveAuthApi } from '../api/auth'
import './LoginForm.css'

function RegisterForm({ onRegistered, onSwitchToLogin }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const name = (username || '').trim()
    if (!name || name.length < 3 || name.length > 32) {
      setError('用户名长度需在 3-32 个字符之间')
      return
    }

    if (!password || password.length < 6) {
      setError('密码长度至少为 6 位')
      return
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    const trimmedEmail = (email || '').trim()
    if (trimmedEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)) {
      setError('邮箱格式不正确')
      return
    }

    try {
      setLoading(true)
      // 注册
      const reg = await registerApi({
        username: name,
        password,
        email: trimmedEmail || undefined,
      })
      // 后端已返回 token + user，则直接保存
      if (reg?.token && reg?.user) {
        saveAuthApi(reg.token, reg.user)
        if (onRegistered) onRegistered(reg.user)
        return
      }
      // 兜底：如果后端未来改为不返回 token，则尝试登录
      const loginRes = await login(name, password)
      saveAuthApi(loginRes.token, loginRes.user)
      if (onRegistered) onRegistered(loginRes.user)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
      setError(err.message || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-card">
      <div className="login-header">
        <div className="login-title">注册账号</div>
        <div className="login-subtitle">用于前台评论与点赞</div>
      </div>
      <form onSubmit={handleSubmit} className="login-form">
        <div className="login-field">
          <label>用户名</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="login-field">
          <label>邮箱（可选）</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="login-field">
          <label>密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="login-field">
          <label>确认密码</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        {error && <div className="login-error">{error}</div>}
        <button type="submit" className="login-submit" disabled={loading}>
          {loading ? '注册中...' : '注册'}
        </button>
        {onSwitchToLogin && (
          <div className="login-footer login-footer--right">
            <button
              type="button"
              className="login-footer-link"
              onClick={onSwitchToLogin}
            >
              已经有账号？去登录
            </button>
          </div>
        )}
      </form>
    </div>
  )
}

export default RegisterForm

