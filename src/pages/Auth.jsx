import { useState } from 'react'
import { loadAuth, clearAuth } from '../api/auth'
import LoginForm from '../components/LoginForm'
import RegisterForm from '../components/RegisterForm'
import './Admin.css'

function Auth() {
  const [mode, setMode] = useState('login')
  const { user } = typeof window !== 'undefined' ? loadAuth() : { user: null }

  // 已登录：提供退出登录入口
  if (user) {
    return (
      <div className="admin-page admin-page--login">
        <div className="admin-container admin-container--login">
          <div className="login-card">
            <div className="login-header">
              <div className="login-title">已登录</div>
              <div className="login-subtitle">当前账号：{user.username}</div>
            </div>
            <button
              type="button"
              className="login-submit"
              onClick={() => {
                clearAuth()
                if (typeof window !== 'undefined') {
                  window.location.href = '/'
                }
              }}
            >
              退出登录
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page admin-page--login">
      <div className="admin-container admin-container--login">
        {mode === 'login' ? (
          <LoginForm
            mode="user"
            onSwitchToRegister={() => setMode('register')}
          />
        ) : (
          <RegisterForm
            onRegistered={() => {
              setMode('login')
              // 登录已在注册成功时完成，刷新页面以便 Header / 评论区等拿到最新状态
              if (typeof window !== 'undefined') {
                window.location.href = '/'
              }
            }}
            onSwitchToLogin={() => setMode('login')}
          />
        )}
      </div>
    </div>
  )
}

export default Auth

