import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import { getDetailPreviewUrl } from '../utils/imageUrl'
import { getPhoto, recordPhotoView, listPhotoComments, createPhotoComment, deletePhotoComment } from '../api/photos'
import { loadAuth } from '../utils/apiClient'
import AMapContainer from '../components/AMapContainer'
import SharePanel from '../components/SharePanel'
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
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const [photo, setPhoto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showMapDialog, setShowMapDialog] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState({ work: true, camera: false, location: false })
  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [commentAuthor, setCommentAuthor] = useState('')
  const [commentContent, setCommentContent] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const { user } = typeof window !== 'undefined' ? loadAuth() : { user: null }
  const isAdmin = !!user && user.role === 'admin'

  useEffect(() => {
    if (!id) {
      setLoading(false)
      setError(t('photoDetail.invalidId'))
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    getPhoto(id)
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

  // 访问统计：同一 Tab 会话内同一照片只上报一次
  useEffect(() => {
    if (!id) return
    const key = `pic4pick-viewed-${id}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      // ignore
    }
    recordPhotoView(id).catch(() => {})
  }, [id])

  // 加载评论列表
  useEffect(() => {
    if (!id) return
    let cancelled = false
    setCommentsLoading(true)
    setCommentError('')
    listPhotoComments(id, { limit: 100 })
      .then((data) => {
        if (cancelled) return
        setComments((data && Array.isArray(data.items)) ? data.items : [])
      })
      .catch(() => {
        if (cancelled) return
        setCommentError('加载评论失败')
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false)
      })
    return () => { cancelled = true }
  }, [id])

  // Open Graph / 分享元信息：照片加载后更新 title 与 og 标签
  useEffect(() => {
    if (!photo) return
    const defaultTitle = 'Pic4Pick - 照片分享'
    const prevTitle = document.title
    document.title = `${photo.title} - Pic4Pick`

    const imgUrl = photo.preview_url || getDetailPreviewUrl(photo.oss_url || photo.image)
    const absImage = imgUrl && (imgUrl.startsWith('http') ? imgUrl : new URL(imgUrl, window.location.origin).href)
    const shareUrl = window.location.href

    const setMeta = (nameOrProp, content, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name'
      let el = document.querySelector(`meta[${attr}="${nameOrProp}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, nameOrProp)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content || '')
    }

    setMeta('og:title', `${photo.title} - Pic4Pick`, true)
    setMeta('og:image', absImage, true)
    setMeta('og:url', shareUrl, true)
    setMeta('og:description', photo.location ? `${photo.title} · ${photo.location}` : photo.title, true)
    setMeta('og:type', 'website', true)

    return () => {
      document.title = prevTitle || defaultTitle
    }
  }, [photo])

  if (loading) {
    return <div className="photo-detail-loading">{t('photoDetail.loading')}</div>
  }

  if (error || !photo) {
    return (
      <div className="photo-detail-page">
        <div className="photo-detail-container">
          <button className="back-button" onClick={() => navigate(-1)}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t('photoDetail.back')}
          </button>
          <div className="photo-detail-error">{error || t('photoDetail.notFound')}</div>
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

  const shareImageUrl = photo.preview_url || getDetailPreviewUrl(photo.oss_url || photo.image)

  const handleSubmitComment = async (e) => {
    e.preventDefault()
    if (!id || commentSubmitting) return
    if (!user) {
      setCommentError('请先登录后再发表评论')
      return
    }
    const content = (commentContent || '').trim()
    if (!content) {
      setCommentError('评论内容不能为空')
      return
    }
    if (content.length > 1000) {
      setCommentError('评论内容过长（最多 1000 字）')
      return
    }
    setCommentError('')
    setCommentSubmitting(true)
    try {
      const created = await createPhotoComment(id, {
        author: (commentAuthor || '').trim(),
        content,
      })
      if (created) {
        setComments((prev) => [...prev, created])
        setCommentContent('')
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
      if (err?.status === 404) {
        setCommentError('当前照片暂不支持评论，可能已被下架或隐藏。')
      } else {
        setCommentError(err?.data?.message || err?.message || '提交评论失败，请稍后重试。')
      }
    } finally {
      setCommentSubmitting(false)
    }
  }

  return (
    <div className="photo-detail-page">
      <div className="photo-detail-container">
        <div className="photo-detail-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t('photoDetail.back')}
          </button>
          <SharePanel
            title={`${photo.title} - Pic4Pick`}
            url={window.location.href}
            image={shareImageUrl}
            description={photo.location ? `${photo.title} · ${photo.location}` : photo.title}
          />
        </div>

        <div className="photo-detail-content">
          <div
            className="photo-image-section photo-image-section--clickable"
            onClick={() => setLightboxOpen(true)}
            onKeyDown={(e) => e.key === 'Enter' && setLightboxOpen(true)}
            role="button"
            tabIndex={0}
            title={t('photoDetail.clickZoom')}
          >
            <img src={previewUrl} alt={photo.title} className="detail-photo-image" />
          </div>
          <Lightbox
            open={lightboxOpen}
            close={() => setLightboxOpen(false)}
            slides={[{ src: previewUrl, alt: photo.title }]}
            plugins={[Zoom]}
          />

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
                  <svg width="20" height="20" viewBox="0 0 1080 1024" fill="none">
                    <path d="M310.840889 577.422222a28.444444 28.444444 0 0 1 28.444444-28.444444h398.222223a28.444444 28.444444 0 1 1 0 56.888889h-398.222223a28.444444 28.444444 0 0 1-28.444444-28.444445zM310.840889 732.444444a28.444444 28.444444 0 0 1 28.444444-28.444444h398.222223a28.444444 28.444444 0 1 1 0 56.888889h-398.222223a28.444444 28.444444 0 0 1-28.444444-28.444445zM369.777778 308.622222v85.333334H455.111111v-85.333334H369.777778z m-28.444445-56.888889h142.222223a28.444444 28.444444 0 0 1 28.444444 28.444445v142.222222a28.444444 28.444444 0 0 1-28.444444 28.444444H341.333333a28.444444 28.444444 0 0 1-28.444444-28.444444v-142.222222a28.444444 28.444444 0 0 1 28.444444-28.444445zM579.356444 280.177778a28.444444 28.444444 0 0 1 28.444445-28.444445h115.484444a28.444444 28.444444 0 0 1 0 56.888889h-115.484444a28.444444 28.444444 0 0 1-28.444445-28.444444zM579.356444 422.4a28.444444 28.444444 0 0 1 28.444445-28.444444h115.484444a28.444444 28.444444 0 0 1 0 56.888888h-115.484444a28.444444 28.444444 0 0 1-28.444445-28.444444z" fill="currentColor"/>
                    <path d="M840.988444 184.888889v654.222222H235.804444V184.888889h605.184z m-605.184-56.888889a56.888889 56.888889 0 0 0-56.888888 56.888889v654.222222a56.888889 56.888889 0 0 0 56.888888 56.888889h605.184a56.888889 56.888889 0 0 0 56.888889-56.888889V184.888889a56.888889 56.888889 0 0 0-56.888889-56.888889H235.804444z" fill="currentColor"/>
                  </svg>
                  {t('photoDetail.workInfo')}
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
                  <svg width="20" height="20" viewBox="0 0 1024 1024" fill="none">
                    <path d="M70.4 134.4h684.8v300.8h70.4V153.6c0-51.2-38.4-89.6-89.6-89.6h-640C38.4 64 0 102.4 0 153.6v780.8c0 51.2 38.4 89.6 89.6 89.6h249.6v-70.4H70.4V134.4z" fill="currentColor"/>
                    <path d="M979.2 569.6h-89.6l-6.4-25.6c-6.4-25.6-32-44.8-57.6-44.8H614.4c-25.6 0-51.2 19.2-57.6 44.8l-12.8 25.6H454.4c-25.6 0-44.8 19.2-44.8 44.8v364.8c0 25.6 19.2 44.8 44.8 44.8h524.8c25.6 0 44.8-19.2 44.8-44.8V614.4c0-25.6-19.2-44.8-44.8-44.8z m-25.6 384H480v-320h89.6l12.8-38.4c6.4-19.2 25.6-32 44.8-32h179.2c19.2 0 38.4 12.8 44.8 32l12.8 38.4h89.6v320z" fill="currentColor"/>
                    <path d="M716.8 659.2c-70.4 0-128 57.6-128 128s57.6 128 128 128 128-57.6 128-128-57.6-128-128-128z m0 185.6c-32 0-57.6-25.6-57.6-57.6s25.6-57.6 57.6-57.6 57.6 25.6 57.6 57.6-25.6 57.6-57.6 57.6zM128 320h448v64H128zM128 448h320v64H128zM128 576h192v64H128zM128 704h192v64H128z" fill="currentColor"/>
                  </svg>
                  {t('photoDetail.cameraParams')}
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
                    {t('photoDetail.location')}
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

            <div className="info-card photo-comments">
              <div className="photo-comments-header">
                <h3 className="photo-comments-title">评论</h3>
                <span className="photo-comments-count">
                  {comments.length ? `${comments.length} 条` : '暂无评论'}
                </span>
              </div>
              <div className="photo-comments-body">
                {commentsLoading ? (
                  <div className="photo-comments-empty">评论加载中...</div>
                ) : comments.length === 0 ? (
                  <div className="photo-comments-empty">还没有评论，来写第一条吧。</div>
                ) : (
                  <ul className="photo-comments-list">
                    {comments.map((c) => (
                      <li key={c.id} className="photo-comment-item">
                        <div className="photo-comment-meta">
                          <span className="photo-comment-author">
                            {c.author || '游客'}
                          </span>
                          <span className="photo-comment-time">
                            {c.created_at
                              ? new Date(c.created_at).toLocaleString('zh-CN', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </span>
                          {isAdmin && (
                            <button
                              type="button"
                              className="photo-comment-delete"
                              onClick={async () => {
                                try {
                                  await deletePhotoComment(id, c.id)
                                  setComments((prev) => prev.filter((x) => x.id !== c.id))
                                } catch (err) {
                                  // eslint-disable-next-line no-console
                                  console.error(err)
                                  setCommentError(err?.data?.message || err?.message || '删除评论失败')
                                }
                              }}
                            >
                              删除
                            </button>
                          )}
                        </div>
                        <div className="photo-comment-content">
                          {c.content}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <form className="photo-comment-form" onSubmit={handleSubmitComment}>
                  <div className="photo-comment-form-row">
                    <input
                      type="text"
                      className="photo-comment-input photo-comment-input--author"
                      placeholder="昵称（可选）"
                      maxLength={64}
                      value={commentAuthor}
                      onChange={(e) => setCommentAuthor(e.target.value)}
                    />
                  </div>
                  <div className="photo-comment-form-row">
                    <textarea
                      className="photo-comment-input photo-comment-input--content"
                      placeholder="写下你的想法（最多 1000 字）"
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      rows={3}
                    />
                  </div>
                  {commentError && (
                    <div className="photo-comment-error">{commentError}</div>
                  )}
                  <div className="photo-comment-actions">
                    <button
                      type="submit"
                      className="photo-comment-submit"
                      disabled={commentSubmitting || !user}
                      title={!user ? '登录后才能发表评论' : undefined}
                    >
                      {commentSubmitting ? '提交中…' : user ? '发表评论' : '请登录后评论'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PhotoDetail