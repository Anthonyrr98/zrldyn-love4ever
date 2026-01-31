import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { loadAuth } from '../utils/apiClient'
import './Header.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

function Header() {
  const location = useLocation()
  const [siteConfig, setSiteConfig] = useState({
    site_name: 'Pic4Pick',
    site_subtitle: 'Anthony',
    logo_letter: 'P',
    logo_image_url: '',
    avatar_letter: 'A',
    avatar_image_url: '',
  })
  const [user, setUser] = useState(null)

  useEffect(() => {
    const { user: u } = loadAuth()
    setUser(u)
  }, [location.pathname])

  useEffect(() => {
    const onAuthChange = () => {
      const { user: u } = loadAuth()
      setUser(u)
    }
    window.addEventListener('pic4pick-auth-change', onAuthChange)
    return () => window.removeEventListener('pic4pick-auth-change', onAuthChange)
  }, [])

  const fetchPublicConfig = useCallback(() => {
    fetch(`${API_BASE}/api/config/public`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return
        setSiteConfig({
          site_name: data.site_name || 'Pic4Pick',
          site_subtitle: data.site_subtitle || 'Anthony',
          logo_letter: (data.logo_letter || 'P').trim().slice(0, 1) || 'P',
          logo_image_url: data.logo_image_url || '',
          avatar_letter: (data.avatar_letter || 'A').trim().slice(0, 1) || 'A',
          avatar_image_url: data.avatar_image_url || '',
        })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchPublicConfig()
  }, [fetchPublicConfig])

  useEffect(() => {
    const onConfigUpdate = () => fetchPublicConfig()
    window.addEventListener('pic4pick-config-updated', onConfigUpdate)
    return () => window.removeEventListener('pic4pick-config-updated', onConfigUpdate)
  }, [fetchPublicConfig])

  // 用户头像：有图则显示图，已登录无图用用户名首字，未登录无图用 avatar_letter
  const avatarImageUrl = siteConfig.avatar_image_url || ''
  const userAvatarLetter = user?.username
    ? String(user.username).trim().slice(0, 1).toUpperCase() || siteConfig.avatar_letter
    : siteConfig.avatar_letter

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left" aria-hidden />
        <Link to="/" className="logo-section" title="站点首页">
          {siteConfig.logo_image_url ? (
            <div className="logo-avatar logo-avatar--img">
              <img src={siteConfig.logo_image_url} alt="" />
            </div>
          ) : (
            <div className="logo-avatar" aria-hidden>{siteConfig.logo_letter}</div>
          )}
          <div className="logo-text">
            <div className="logo-title">{siteConfig.site_name}</div>
            <div className="logo-subtitle">{siteConfig.site_subtitle}</div>
          </div>
        </Link>
        <div className="header-right">
          <Link to="/gallery" className={`header-icon ${location.pathname === '/gallery' || location.pathname === '/' ? 'active' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M3 7h14M7 3v14" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            <span>图库</span>
          </Link>

          <Link to="/discover" className={`header-icon ${location.pathname === '/discover' ? 'active' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L12.5 7.5L18 10L12.5 12.5L10 18L7.5 12.5L2 10L7.5 7.5L10 2Z" fill="currentColor"/>
            </svg>
            <span>发现</span>
          </Link>

          <Link to="/admin" className="user-avatar" title={user ? `用户 ${user.username}` : '管理后台'}>
            {avatarImageUrl ? (
              <div className="avatar-circle avatar-circle--img">
                <img src={avatarImageUrl} alt="" />
              </div>
            ) : (
              <div className="avatar-circle" aria-hidden>{userAvatarLetter}</div>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}

export default Header
