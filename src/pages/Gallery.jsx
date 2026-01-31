import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import PhotoCard from '../components/PhotoCard'
import { apiRequest } from '../utils/apiClient'
import './Gallery.css'

const categories = ['最新', '精选', '随览', '附近', '远方']
const PHOTOS_PER_PAGE = 12

/** 将 API 返回的照片转为 PhotoCard 所需格式 */
function normalizePhoto(item) {
  const location = [item.location_city, item.location_country].filter(Boolean).join(' · ')
  const tags = item.tags
    ? (Array.isArray(item.tags) ? item.tags : String(item.tags).split(',').map((s) => s.trim()).filter(Boolean))
    : []
  return {
    ...item,
    location: location || '—',
    tags,
    likes: item.likes ?? 0,
  }
}

function Gallery() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryFromUrl = searchParams.get('category')
  const [activeCategory, setActiveCategory] = useState(() =>
    categories.includes(categoryFromUrl || '') ? categoryFromUrl : '最新'
  )

  // 浏览器前进/后退或从详情返回时，按 URL 恢复分类
  useEffect(() => {
    const cat = searchParams.get('category')
    const next = cat && categories.includes(cat) ? cat : '最新'
    setActiveCategory((prev) => (prev !== next ? next : prev))
  }, [searchParams])
  const [displayedPhotos, setDisplayedPhotos] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 })
  const observerTarget = useRef(null)
  const loadingRef = useRef(false)
  const categoryBarRef = useRef(null)
  const buttonRefs = useRef([])

  const [loadError, setLoadError] = useState('')
  const [userPosition, setUserPosition] = useState(null)
  const [locationError, setLocationError] = useState(null)

  // 附近/远方：获取当前位置
  useEffect(() => {
    if (activeCategory !== '附近' && activeCategory !== '远方') {
      setLocationError(null)
      return
    }
    if (!navigator.geolocation) {
      setLocationError('当前浏览器不支持定位')
      return
    }
    setLocationError(null)
    setUserPosition(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => {
        setLocationError('无法获取位置，将按时间排序')
        setUserPosition(null)
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    )
  }, [activeCategory])

  // 加载照片（从后端 API）
  const loadPhotos = useCallback(
    async (page) => {
      if (loadingRef.current) return
      loadingRef.current = true
      setLoading(true)
      setLoadError('')
      try {
        const params = new URLSearchParams({
          status: 'approved',
          page: String(page),
          pageSize: String(PHOTOS_PER_PAGE),
        })
        if (activeCategory) params.set('category', activeCategory)
        if ((activeCategory === '附近' || activeCategory === '远方') && userPosition) {
          params.set('lat', String(userPosition.lat))
          params.set('lng', String(userPosition.lng))
        }
        const result = await apiRequest(`/api/photos?${params.toString()}`)
        const items = (result.items || []).map(normalizePhoto)
        setDisplayedPhotos((prev) => (page === 1 ? items : [...prev, ...items]))
        setCurrentPage(page)
        const total = Number(result.total) || 0
        setHasMore(page * PHOTOS_PER_PAGE < total)
      } catch (err) {
        setLoadError(err.status === 401 ? '请先登录后查看图库' : err.message || '加载失败')
        setDisplayedPhotos([])
        setHasMore(false)
      } finally {
        setLoading(false)
        loadingRef.current = false
      }
    },
    [activeCategory, userPosition]
  )

  // 初始加载与切换分类时重置并加载；附近/远方在拿到位置后再加载
  useEffect(() => {
    const needLocation = activeCategory === '附近' || activeCategory === '远方'
    if (needLocation && !userPosition && !locationError) {
      return
    }
    setDisplayedPhotos([])
    setCurrentPage(1)
    setHasMore(true)
    loadingRef.current = false
    loadPhotos(1)
  }, [activeCategory, loadPhotos, userPosition, locationError])

  const activeIndex = categories.indexOf(activeCategory)

  // 滑动指示器位置：根据当前激活项测量
  const updatePill = useCallback(() => {
    const bar = categoryBarRef.current
    const btn = activeIndex >= 0 ? buttonRefs.current[activeIndex] : null
    if (!bar || !btn) return
    const barRect = bar.getBoundingClientRect()
    const btnRect = btn.getBoundingClientRect()
    const s = getComputedStyle(bar)
    const inset = (parseFloat(s.borderLeftWidth) || 0) + (parseFloat(s.paddingLeft) || 0)
    const pillOffset = 5
    setPillStyle({
      left: btnRect.left - barRect.left - inset + pillOffset,
      width: btnRect.width,
    })
  }, [activeIndex])

  useLayoutEffect(() => {
    updatePill()
    const raf = requestAnimationFrame(updatePill)
    return () => cancelAnimationFrame(raf)
  }, [activeIndex, activeCategory, updatePill])

  useEffect(() => {
    const bar = categoryBarRef.current
    if (!bar) return
    const ro = new ResizeObserver(updatePill)
    ro.observe(bar)
    window.addEventListener('resize', updatePill)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updatePill)
    }
  }, [updatePill])

  // 无限滚动监听
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          loadPhotos(currentPage + 1)
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, currentPage, loadPhotos])

  return (
    <div className="gallery-page">
      <div className="gallery-container">
        <div ref={categoryBarRef} className="category-bar">
          <span
            className="category-pill"
            style={{
              transform: `translateX(${pillStyle.left}px)`,
              width: pillStyle.width,
            }}
            aria-hidden
          />
          {categories.map((category, i) => (
            <button
              ref={(el) => (buttonRefs.current[i] = el)}
              key={category}
              className={`category-btn ${activeCategory === category ? 'active' : ''}`}
              onClick={() => {
                setActiveCategory(category)
                setSearchParams(category === '最新' ? {} : { category })
              }}
            >
              <span className="category-btn-text">{category}</span>
            </button>
          ))}
        </div>

        {loadError && (
          <div className="gallery-error">{loadError}</div>
        )}

        {(activeCategory === '附近' || activeCategory === '远方') && !userPosition && !locationError && (
          <div className="gallery-hint">正在获取位置…</div>
        )}
        {(activeCategory === '附近' || activeCategory === '远方') && locationError && (
          <div className="gallery-hint gallery-hint--warn">{locationError}</div>
        )}

        <div className="photo-grid">
          {displayedPhotos.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} />
          ))}
        </div>

        {!loadError && displayedPhotos.length === 0 && !loading && (
          <div className="gallery-empty">暂无照片，去管理后台上传吧</div>
        )}

        {/* 加载指示器和观察目标 */}
        <div ref={observerTarget} className="load-more-trigger">
          {loading && (
            <div className="loading-indicator">
              <div className="loading-spinner"></div>
              <span>加载中...</span>
            </div>
          )}
          {!hasMore && displayedPhotos.length > 0 && (
            <div className="no-more-photos">
              没有更多照片了
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Gallery
