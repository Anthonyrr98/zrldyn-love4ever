import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PhotoCard from '../components/PhotoCard'
import { listPhotos } from '../api/photos'
import { listCategories } from '../api/categories'
import './Gallery.css'

const PHOTOS_PER_PAGE = 12
// 系统分类名称（用于特殊逻辑判断）
const SYSTEM_CATEGORIES = { NEARBY: '附近', FAR: '远方' }

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
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryFromUrl = searchParams.get('category')
  const keywordFromUrl = searchParams.get('keyword') || ''
  
  const [searchInput, setSearchInput] = useState(keywordFromUrl)

  useEffect(() => {
    setSearchInput(keywordFromUrl)
  }, [keywordFromUrl])
  
  // 分类列表（从 API 动态加载）
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const categoryNames = categories.map((c) => c.name)
  
  const [activeCategory, setActiveCategory] = useState(() => categoryFromUrl || '最新')

  // 加载分类
  useEffect(() => {
    let cancelled = false
    setCategoriesLoading(true)
    listCategories()
      .then((data) => {
        if (cancelled) return
        const cats = Array.isArray(data) ? data : []
        setCategories(cats)
        // 如果当前选中的分类不存在，切换到第一个分类
        const names = cats.map((c) => c.name)
        if (names.length > 0) {
          const urlCat = searchParams.get('category')
          if (urlCat && names.includes(urlCat)) {
            setActiveCategory(urlCat)
          } else if (!names.includes(activeCategory)) {
            setActiveCategory(names[0])
          }
        }
      })
      .catch(() => {
        // 加载失败时使用默认分类
        setCategories([{ id: 0, name: '最新', is_system: 1 }])
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false)
      })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 浏览器前进/后退或从详情返回时，按 URL 恢复分类
  useEffect(() => {
    if (categoriesLoading || categoryNames.length === 0) return
    const cat = searchParams.get('category')
    const next = cat && categoryNames.includes(cat) ? cat : categoryNames[0] || '最新'
    setActiveCategory((prev) => (prev !== next ? next : prev))
  }, [searchParams, categoriesLoading, categoryNames])

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

  // 是否是需要定位的系统分类
  const needsLocation = activeCategory === SYSTEM_CATEGORIES.NEARBY || activeCategory === SYSTEM_CATEGORIES.FAR

  // 附近/远方：获取当前位置
  useEffect(() => {
    if (!needsLocation) {
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
  }, [needsLocation])

  // 加载照片（从后端 API）
  const loadPhotos = useCallback(
    async (page) => {
      if (loadingRef.current) return
      loadingRef.current = true
      setLoading(true)
      setLoadError('')
      try {
        const result = await listPhotos({
          status: 'approved',
          page,
          pageSize: PHOTOS_PER_PAGE,
          category: activeCategory || undefined,
          keyword: keywordFromUrl.trim() || undefined,
          lat: needsLocation && userPosition ? userPosition.lat : undefined,
          lng: needsLocation && userPosition ? userPosition.lng : undefined,
        })
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
    [activeCategory, userPosition, needsLocation, keywordFromUrl]
  )

  // 初始加载与切换分类时重置并加载；附近/远方在拿到位置后再加载
  useEffect(() => {
    // 等待分类加载完成
    if (categoriesLoading) return
    if (needsLocation && !userPosition && !locationError) {
      return
    }
    setDisplayedPhotos([])
    setCurrentPage(1)
    setHasMore(true)
    loadingRef.current = false
    loadPhotos(1)
  }, [activeCategory, loadPhotos, userPosition, locationError, categoriesLoading, needsLocation, keywordFromUrl])

  const activeIndex = categoryNames.indexOf(activeCategory)

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

  // 获取默认分类名称（用于 URL 参数判断）
  const defaultCategoryName = categoryNames[0] || '最新'

  const handleSearchSubmit = (e) => {
    e?.preventDefault?.()
    const k = (searchInput || '').trim()
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (k) next.set('keyword', k)
      else next.delete('keyword')
      return next
    })
  }

  return (
    <div className="gallery-page">
      <div className="gallery-container">
        <div className="gallery-header-wrap">
          {categoriesLoading ? (
            <div className="category-bar category-bar--loading">
              <span className="category-loading-text">{t('gallery.loadCategories')}</span>
            </div>
          ) : (
            <div ref={categoryBarRef} className="category-bar">
              <span
                className="category-pill"
                style={{
                  transform: `translateX(${pillStyle.left}px)`,
                  width: pillStyle.width,
                }}
                aria-hidden
              />
              {categoryNames.map((categoryName, i) => (
                <button
                  ref={(el) => (buttonRefs.current[i] = el)}
                  key={categoryName}
                  className={`category-btn ${activeCategory === categoryName ? 'active' : ''}`}
                  onClick={() => {
                    setActiveCategory(categoryName)
                    setSearchParams(categoryName === defaultCategoryName ? {} : { category: categoryName })
                  }}
                >
                  <span className="category-btn-text">{categoryName}</span>
                </button>
              ))}
            </div>
          )}

          <form className="gallery-search-form" onSubmit={handleSearchSubmit}>
          <input
            type="search"
            className="gallery-search-input"
            placeholder={t('gallery.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="搜索照片"
          />
          <button type="submit" className="gallery-search-btn" aria-label="搜索">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
              <path d="M16 16l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </form>
        </div>

        {loadError && (
          <div className="gallery-error">{loadError}</div>
        )}

        {needsLocation && !userPosition && !locationError && (
          <div className="gallery-hint">{t('gallery.getLocation')}</div>
        )}
        {needsLocation && locationError && (
          <div className="gallery-hint gallery-hint--warn">
            {locationError === '当前浏览器不支持定位' ? t('gallery.geoNotSupported') : t('gallery.locationError')}
          </div>
        )}

        <div className="photo-grid">
          {displayedPhotos.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} />
          ))}
        </div>

        {!loadError && displayedPhotos.length === 0 && !loading && (
          <div className="gallery-empty">{t('gallery.empty')}</div>
        )}

        {/* 加载指示器和观察目标 */}
        <div ref={observerTarget} className="load-more-trigger">
          {loading && (
            <div className="loading-indicator">
              <div className="loading-spinner"></div>
              <span>{t('gallery.loading')}</span>
            </div>
          )}
          {!hasMore && displayedPhotos.length > 0 && (
            <div className="no-more-photos">{t('gallery.noMore')}</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Gallery
