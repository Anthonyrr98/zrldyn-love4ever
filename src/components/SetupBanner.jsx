import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSetupStatus } from '../api/setup'
import './SetupBanner.css'

const DISMISS_KEY = 'pic4pick_setup_hide_until'
const DISMISS_MS = 24 * 60 * 60 * 1000

function isDismissed() {
  try {
    const until = Number(window.localStorage.getItem(DISMISS_KEY) || 0)
    return until && Date.now() < until
  } catch {
    return false
  }
}

function dismissForAWhile() {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS))
  } catch {}
}

export default function SetupBanner() {
  const [status, setStatus] = useState(null)
  const [hidden, setHidden] = useState(() => isDismissed())

  useEffect(() => {
    let cancelled = false
    getSetupStatus()
      .then((data) => {
        if (!cancelled) setStatus(data)
      })
      .catch(() => {
        if (!cancelled) setStatus(null)
      })
    return () => { cancelled = true }
  }, [])

  if (hidden) return null
  if (!status?.needsSetup) return null

  const missingTables = status.missingTables || []
  const missingSettings = status.missingSettings || []
  const hints = status.hints || []

  return (
    <div className="setup-banner">
      <div className="setup-banner-inner">
        <div className="setup-banner-title">首次部署提醒：请完成初始化与配置</div>

        <div className="setup-banner-content">
          {missingTables.length > 0 && (
            <div className="setup-banner-row">
              <div className="setup-banner-badge">DB</div>
              <div className="setup-banner-text">
                数据库未就绪：缺少表 {missingTables.join(', ')}。建议执行 `cd server && npm run migrate`
              </div>
            </div>
          )}

          {!status.adminOk && (
            <div className="setup-banner-row">
              <div className="setup-banner-badge">Admin</div>
              <div className="setup-banner-text">
                未初始化管理员账号：建议执行 `cd server && npm run init-admin`
              </div>
            </div>
          )}

          {missingSettings.length > 0 && (
            <div className="setup-banner-row">
              <div className="setup-banner-badge">Config</div>
              <div className="setup-banner-text">
                缺少关键配置：{missingSettings.join(', ')}。请进入管理后台配置页填写。
              </div>
            </div>
          )}

          {hints.length > 0 && (
            <div className="setup-banner-hints">
              {hints.map((h) => (
                <div key={h.title} className="setup-banner-hint">
                  <div className="setup-banner-hint-title">{h.title}</div>
                  <div className="setup-banner-hint-detail">{h.detail}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="setup-banner-actions">
          <Link className="setup-banner-btn" to="/admin">去管理后台</Link>
          <button
            type="button"
            className="setup-banner-btn setup-banner-btn--ghost"
            onClick={() => { dismissForAWhile(); setHidden(true) }}
          >
            暂不提示
          </button>
        </div>
      </div>
    </div>
  )
}

