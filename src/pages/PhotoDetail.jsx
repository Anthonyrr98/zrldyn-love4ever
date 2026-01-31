import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getDetailPreviewUrl } from '../utils/imageUrl'
import { apiRequest } from '../utils/apiClient'
import AMapContainer from '../components/AMapContainer'
import './PhotoDetail.css'

/** 将 API 返回的单张照片转为详情页展示格式 */
function normalizeDetailPhoto(row) {
  if (!row) return null
  const location = [row.location_city, row.location_country].filter(Boolean).join(' · ') || '—'
  const tagsRaw = row.tags
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw
    : typeof tagsRaw === 'string'
      ? tagsRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : []
  return {
    ...row,
    location,
    country: row.location_country || '—',
    date: row.shot_date,
    tags,
    likes: row.likes ?? 0,
    latitude: row.lat != null ? Number(row.lat) : null,
    longitude: row.lng != null ? Number(row.lng) : null,
    focalLength: row.focal_length,
    shutterSpeed: row.shutter_speed,
  }
}

function PhotoDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [photo, setPhoto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showMapDialog, setShowMapDialog] = useState(false)
  const [expandedSections, setExpandedSections] = useState({ work: true, camera: false, location: false })

  useEffect(() => {
    if (!id) {
      setLoading(false)
      setError('无效的照片 ID')
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    apiRequest(`/api/photos/${id}`)
      .then((data) => {
        if (!cancelled && data) setPhoto(normalizeDetailPhoto(data))
      })
      .catch((err) => {
        if (!cancelled) setError(err.status === 404 ? '照片不存在' : (err.message || '加载失败'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return <div className="photo-detail-loading">加载中...</div>
  }

  if (error || !photo) {
    return (
      <div className="photo-detail-page">
        <div className="photo-detail-container">
          <button className="back-button" onClick={() => navigate(-1)}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            返回
          </button>
          <div className="photo-detail-error">{error || '照片不存在'}</div>
        </div>
      </div>
    )
  }

  const formatDate = (dateString) => {
    if (!dateString) return '未设置'
    const date = new Date(dateString)
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
  }

  const previewUrl = photo.preview_url || getDetailPreviewUrl(photo.oss_url || photo.image)
  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="photo-detail-page">
      <div className="photo-detail-container">
        <button className="back-button" onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          返回
        </button>

        <div className="photo-detail-content">
          <div className="photo-image-section">
            <img src={previewUrl} alt={photo.title} className="detail-photo-image" />
          </div>

          <div className="photo-info-section">
            <div className={`info-card info-card--accordion ${expandedSections.work ? 'is-expanded' : ''}`}>
              <button
                type="button"
                className="info-card-header"
                onClick={() => toggleSection('work')}
                aria-expanded={expandedSections.work}
                aria-controls="info-card-work"
              >
                <span className="info-card-title">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M4 4h12v12H4V4z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <path d="M6 6h8M6 9h8M6 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  作品信息
                </span>
                <svg className="info-card-chevron" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div id="info-card-work" className="info-card-body" hidden={!expandedSections.work}>
                <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">标题</span>
                  <span className="info-value">{photo.title}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">拍摄地点</span>
                  <span className="info-value">{photo.location}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">国家 / 地区</span>
                  <span className="info-value">{photo.country}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">拍摄日期</span>
                  <span className="info-value">{formatDate(photo.date)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">分类</span>
                  <span className="info-value">{photo.category}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">标签</span>
                  <span className="info-value">
                    {photo.tags.length
                      ? photo.tags.map((tag, index) => (
                          <span key={index} className="tag-badge">{tag}</span>
                        ))
                      : '—'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">评级</span>
                  <span className="info-value">
                    <span className="rating-value">{photo.rating ?? '—'}</span>
                    {photo.rating != null && <span className="rating-max">/10</span>}
                  </span>
                </div>
              </div>
              </div>
            </div>

            <div className={`info-card info-card--accordion ${expandedSections.camera ? 'is-expanded' : ''}`}>
              <button
                type="button"
                className="info-card-header"
                onClick={() => toggleSection('camera')}
                aria-expanded={expandedSections.camera}
                aria-controls="info-card-camera"
              >
                <span className="info-card-title">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2L12 7h5l-4 3 1.5 5L10 13l-4.5 4 1.5-5-4-3h5z" fill="currentColor"/>
                  </svg>
                  相机参数
                </span>
                <svg className="info-card-chevron" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div id="info-card-camera" className="info-card-body" hidden={!expandedSections.camera}>
                <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">焦距</span>
                  <span className="info-value">{photo.focalLength || '未设置'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">光圈</span>
                  <span className="info-value">{photo.aperture || '未设置'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">快门</span>
                  <span className="info-value">{photo.shutterSpeed || '未设置'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">ISO</span>
                  <span className="info-value">{photo.iso || '未设置'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">相机</span>
                  <span className="info-value">{photo.camera || '未设置'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">镜头</span>
                  <span className="info-value">{photo.lens || '未设置'}</span>
                </div>
              </div>
              </div>
            </div>

            {(photo.latitude != null && photo.longitude != null) && (
              <div className={`info-card info-card--location info-card--accordion ${expandedSections.location ? 'is-expanded' : ''}`}>
                <button
                  type="button"
                  className="info-card-header"
                  onClick={() => toggleSection('location')}
                  aria-expanded={expandedSections.location}
                  aria-controls="info-card-location"
                >
                  <span className="info-card-title">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 2C6.5 2 3.5 5 3.5 8.5c0 4 6.5 9.5 6.5 9.5s6.5-5.5 6.5-9.5C16.5 5 13.5 2 10 2z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <circle cx="10" cy="8.5" r="2" fill="currentColor"/>
                    </svg>
                    地理位置
                  </span>
                  <svg className="info-card-chevron" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                    <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <div id="info-card-location" className="info-card-body" hidden={!expandedSections.location}>
                  <div className="location-info">
                  <div className="location-info-grid">
                    <div className="info-item">
                      <span className="info-label">纬度</span>
                      <span className="info-value">{Number(photo.latitude).toFixed(4)}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">经度</span>
                      <span className="info-value">{Number(photo.longitude).toFixed(4)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="map-button"
                    onClick={() => setShowMapDialog(true)}
                  >
                    在地图上查看
                  </button>
                </div>
                </div>
              </div>
            )}

            {showMapDialog && photo.latitude != null && photo.longitude != null && (
              <div
                className="photo-detail-map-overlay"
                onClick={() => setShowMapDialog(false)}
                role="presentation"
              >
                <div
                  className="photo-detail-map-dialog"
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-label="地图位置"
                >
                  <div className="photo-detail-map-dialog-header">
                    <span className="photo-detail-map-dialog-title">{photo.title}</span>
                    <button
                      type="button"
                      className="photo-detail-map-dialog-close"
                      onClick={() => setShowMapDialog(false)}
                      aria-label="关闭"
                    >
                      ×
                    </button>
                  </div>
                  <div className="photo-detail-map-dialog-body">
                    <AMapContainer
                      className="photo-detail-map-amap"
                      markers={[{ lat: photo.latitude, lng: photo.longitude, title: photo.title }]}
                      flyTo={{ lat: photo.latitude, lng: photo.longitude }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PhotoDetail
