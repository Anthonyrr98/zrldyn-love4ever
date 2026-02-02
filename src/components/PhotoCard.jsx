import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getThumbUrl } from '../utils/imageUrl'
import { likePhoto, unlikePhoto } from '../api/photos'
import { loadAuth } from '../api/auth'
import './PhotoCard.css'

const LIKED_KEY = 'pic4pick_liked'

function getLikedSet() {
  try {
    const raw = window.localStorage.getItem(LIKED_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function addToLiked(photoId) {
  const set = getLikedSet()
  set.add(String(photoId))
  window.localStorage.setItem(LIKED_KEY, JSON.stringify([...set]))
}

function removeFromLiked(photoId) {
  const set = getLikedSet()
  set.delete(String(photoId))
  window.localStorage.setItem(LIKED_KEY, JSON.stringify([...set]))
}

function PhotoCard({ photo }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [likes, setLikes] = useState(photo.likes ?? 0)
  const [hasLiked, setHasLiked] = useState(() => getLikedSet().has(String(photo.id)))
  const [liking, setLiking] = useState(false)

  const handleClick = () => {
    navigate(`/photo/${photo.id}`)
  }

  const handleLikeClick = useCallback(
    (e) => {
      e.stopPropagation()
      if (liking) return

      const { user } = typeof window !== 'undefined' ? loadAuth() : { user: null }
      if (!user) {
        // 未登录：提示并跳转到登录 / 注册页
        // eslint-disable-next-line no-alert
        window.alert('登录后才能点赞，请先登录或注册账号。')
        navigate('/auth')
        return
      }

      setLiking(true)
      const req = hasLiked ? unlikePhoto(photo.id) : likePhoto(photo.id)
      req.then((res) => {
        const nextLikes = typeof res?.likes === 'number'
          ? res.likes
          : (hasLiked ? Math.max(likes - 1, 0) : likes + 1)
        setLikes(nextLikes)
        if (hasLiked) {
          setHasLiked(false)
          removeFromLiked(photo.id)
        } else {
          setHasLiked(true)
          addToLiked(photo.id)
        }
      })
        .catch(() => {})
        .finally(() => setLiking(false))
    },
    [photo.id, hasLiked, liking, likes, navigate],
  )

  // 优先使用数据库中的缩略图，否则使用原图生成缩略图
  const thumbUrl = photo.thumbnail_url || getThumbUrl(photo.oss_url || photo.image)

  return (
    <div className="photo-card" onClick={handleClick}>
      <div className="photo-image-container">
        <img src={thumbUrl} alt={photo.title} className="photo-image" loading="lazy" />
        {Array.isArray(photo.tags) && photo.tags.length > 0 ? (
          <div className="photo-tag">{photo.tags.filter(Boolean).join(', ')}</div>
        ) : null}
      </div>
      <div className="photo-info">
        <div className="photo-info-left">
          <div className="photo-title">{photo.title}</div>
          <div className="photo-location">{photo.location}</div>
        </div>
        <button
          type="button"
          className={`photo-like-btn ${hasLiked ? 'photo-like-btn--liked' : ''}`}
          onClick={handleLikeClick}
          disabled={liking}
          aria-label={hasLiked ? t('photoCard.liked') : t('photoCard.like')}
          title={hasLiked ? t('photoCard.liked') : t('photoCard.like')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={hasLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {likes > 0 && <span className="photo-like-count">{likes}</span>}
        </button>
      </div>
    </div>
  )
}

export default PhotoCard
