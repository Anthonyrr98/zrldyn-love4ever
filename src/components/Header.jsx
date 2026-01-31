import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Header.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

function Header() {
  const location = useLocation()
  const [siteConfig, setSiteConfig] = useState({
    site_name: 'Pic4Pick',
    site_subtitle: 'Anthony',
    logo_letter: 'P',
    avatar_letter: 'A',
  })

  useEffect(() => {
    fetch(`${API_BASE}/api/config/public`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return
        setSiteConfig({
          site_name: data.site_name || 'Pic4Pick',
          site_subtitle: data.site_subtitle || 'Anthony',
          logo_letter: (data.logo_letter || 'P').trim().slice(0, 1) || 'P',
          avatar_letter: (data.avatar_letter || 'A').trim().slice(0, 1) || 'A',
        })
      })
      .catch(() => {})
  }, [])

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left" aria-hidden />
        <Link to="/" className="logo-section">
          <div className="logo-avatar">{siteConfig.logo_letter}</div>
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

          <Link to="/admin" className="user-avatar">
            <div className="avatar-circle">{siteConfig.avatar_letter}</div>
          </Link>
        </div>
      </div>
    </header>
  )
}

export default Header
