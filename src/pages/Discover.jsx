import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import AMapContainer from '../components/AMapContainer'
import { apiRequest } from '../utils/apiClient'
import './Discover.css'

// 省/市名称 -> [经度, 纬度]，用于侧栏地点无经纬度时在地图上显示
const LOCATION_CENTERS = {
  北京: [116.397428, 39.90923],
  上海: [121.473701, 31.230416],
  天津: [117.2008, 39.0842],
  重庆: [106.5516, 29.5630],
  河南: [113.625368, 34.746599],
  郑州: [113.625368, 34.746599],
  开封: [114.307424, 34.797049],
  洛阳: [112.453926, 34.619711],
  安阳: [114.392392, 36.097577],
  平顶山: [113.192814, 33.766324],
  河北: [114.5024, 38.0455],
  秦皇岛: [119.478556, 39.8256],
  广东: [113.2644, 23.1291],
  广州: [113.2644, 23.1291],
  深圳: [114.0579, 22.5431],
  浙江: [120.1551, 30.2741],
  杭州: [120.1551, 30.2741],
  四川: [104.0665, 30.5723],
  成都: [104.0665, 30.5723],
  陕西: [108.9542, 34.2656],
  西安: [108.9542, 34.2656],
  江苏: [118.7969, 32.0603],
  南京: [118.7969, 32.0603],
  山东: [117.0208, 36.6683],
  济南: [117.0208, 36.6683],
  青岛: [120.3826, 36.0671],
  湖北: [114.3055, 30.5931],
  武汉: [114.3055, 30.5931],
  湖南: [112.9834, 28.1129],
  长沙: [112.9834, 28.1129],
  福建: [119.2965, 26.1004],
  厦门: [118.0894, 24.4798],
  云南: [102.7123, 25.0406],
  昆明: [102.7123, 25.0406],
  辽宁: [123.4328, 41.8045],
  沈阳: [123.4328, 41.8045],
  大连: [121.6147, 38.9140],
  其他: [105.0, 35.0],
}

function Discover() {
  const [searchParams] = useSearchParams()
  const [locations, setLocations] = useState([])
  const [locationsLoading, setLocationsLoading] = useState(true)
  const [locationsError, setLocationsError] = useState('')
  const [locationsVersion, setLocationsVersion] = useState(0)
  const [expandedSections, setExpandedSections] = useState([])
  const [mapFlyTo, setMapFlyTo] = useState(null)

  // 从详情页「在地图上查看」跳转时，根据 URL 经纬度飞向该点
  useEffect(() => {
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    if (lat != null && lng != null) {
      const latNum = Number(lat)
      const lngNum = Number(lng)
      if (!Number.isNaN(latNum) && !Number.isNaN(lngNum)) {
        setMapFlyTo({ lat: latNum, lng: lngNum })
      }
    }
  }, [searchParams])

  const fetchLocations = (silent = false) => {
    if (!silent) {
      setLocationsLoading(true)
      setLocationsError('')
    }
    apiRequest('/api/photos/locations')
      .then((data) => {
        if (Array.isArray(data)) {
          setLocations(data)
          if (data.length > 0) setExpandedSections((prev) => (prev.length ? prev : data.map((p) => p.name)))
          setLocationsVersion((v) => v + 1)
        }
      })
      .catch((err) => {
        if (!silent) setLocationsError(err?.message || '加载地点失败')
      })
      .finally(() => {
        if (!silent) setLocationsLoading(false)
      })
  }

  useEffect(() => {
    let cancelled = false
    setLocationsLoading(true)
    setLocationsError('')
    apiRequest('/api/photos/locations')
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setLocations(data)
          if (data.length > 0) setExpandedSections(data.map((p) => p.name))
          setLocationsVersion((v) => v + 1)
        }
      })
      .catch((err) => {
        if (!cancelled) setLocationsError(err?.message || '加载地点失败')
      })
      .finally(() => {
        if (!cancelled) setLocationsLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const onFocus = () => { fetchLocations(true) }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const [photosList, setPhotosList] = useState([])
  const [selectedLocationPhotos, setSelectedLocationPhotos] = useState(null)

  useEffect(() => {
    let cancelled = false
    apiRequest('/api/photos?status=approved&pageSize=500')
      .then((res) => {
        if (cancelled || !res?.items) return
        const items = (res.items || []).filter((p) => p.lat != null && p.lng != null)
        setPhotosList(items)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // 按地点聚合：同一经纬度（保留 4 位小数）的照片归为一组，地图上一个圆点对应一组
  const mapMarkers = useMemo(() => {
    const groups = new Map()
    for (const p of photosList) {
      const lat = Number(p.lat)
      const lng = Number(p.lng)
      const key = `${lat.toFixed(4)}_${lng.toFixed(4)}`
      if (!groups.has(key)) {
        groups.set(key, { lat, lng, title: p.title || '照片', photos: [] })
      }
      groups.get(key).photos.push({
        id: p.id,
        title: p.title || '照片',
        thumbnail_url: p.thumbnail_url,
        preview_url: p.preview_url,
        oss_url: p.oss_url,
      })
    }
    return Array.from(groups.values()).map((g) => ({
      ...g,
      title: g.photos.length > 1 ? `该地点 ${g.photos.length} 张` : g.photos[0].title,
    }))
  }, [photosList])

  const toggleSection = (name) => {
    setExpandedSections(prev =>
      prev.includes(name)
        ? prev.filter(n => n !== name)
        : [...prev, name]
    )
  }

  const getLocationCenter = (loc) => {
    if (loc.lat != null && loc.lng != null) return { lat: Number(loc.lat), lng: Number(loc.lng) }
    const c = LOCATION_CENTERS[loc.name]
    if (c) return { lat: c[1], lng: c[0] }
    return null
  }

  const getChildCenter = (child) => {
    if (child.lat != null && child.lng != null) return { lat: Number(child.lat), lng: Number(child.lng) }
    const c = LOCATION_CENTERS[child.name]
    if (c) return { lat: c[1], lng: c[0] }
    return null
  }

  const handleLocationClick = (loc) => {
    const center = getLocationCenter(loc)
    if (center) setMapFlyTo(center)
  }

  const handleChildClick = (child) => {
    const center = getChildCenter(child)
    if (center) setMapFlyTo(center)
  }

  return (
    <div className="discover-page">
      <div className="discover-container">
        <aside className="location-sidebar">
          <div className="location-sidebar-header">
            <h2 className="location-sidebar-title">按地点</h2>
          </div>
          <div className="location-sidebar-list">
            {locationsLoading && (
              <div className="location-sidebar-loading">加载地点中…</div>
            )}
            {!locationsLoading && locationsError && (
              <div className="location-sidebar-error">{locationsError}</div>
            )}
            {!locationsLoading && !locationsError && locations.length === 0 && (
              <div className="location-sidebar-empty">暂无已上传的地点</div>
            )}
            {!locationsLoading && !locationsError && locations.map((location) => (
              <div key={location.name} className="location-section">
                <div
                  className="location-section-header"
                  onClick={() => toggleSection(location.name)}
                >
                  <span className="section-title">{location.name}</span>
                  <svg
                    className={`section-arrow ${expandedSections.includes(location.name) ? 'expanded' : ''}`}
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                  >
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                {expandedSections.includes(location.name) && (
                  <div className="location-content">
                    {(location.children || []).length === 0 ? (
                      <div
                        className="location-card-large"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleLocationClick(location)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLocationClick(location)}
                      >
                        {location.thumbnail ? (
                          <img src={`${location.thumbnail}${location.thumbnail.includes('?') ? '&' : '?'}t=${locationsVersion}`} alt={location.name} className="location-thumbnail" />
                        ) : (
                          <div className="location-thumbnail-placeholder" aria-hidden />
                        )}
                        <div className="location-info">
                          <div className="location-name">{location.name}</div>
                          <div className="location-count">{location.count}张</div>
                        </div>
                      </div>
                    ) : (
                      <div className="location-grid">
                        {(location.children || []).map((child) => (
                          <div
                            key={child.name}
                            className="location-card-small"
                            role="button"
                            tabIndex={0}
                            onClick={() => handleChildClick(child)}
                            onKeyDown={(e) => e.key === 'Enter' && handleChildClick(child)}
                          >
                            {child.thumbnail ? (
                              <img src={`${child.thumbnail}${child.thumbnail.includes('?') ? '&' : '?'}t=${locationsVersion}`} alt={child.name} className="location-thumbnail" />
                            ) : (
                              <div className="location-thumbnail-placeholder" aria-hidden />
                            )}
                            <div className="location-info">
                              <div className="location-name">{child.name}</div>
                              <div className="location-count">{child.count}张</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        <div className="map-container">
          <div className="map-view">
            <AMapContainer
              className="map-amap"
              markers={mapMarkers}
              flyTo={mapFlyTo}
              onMarkerClick={(data) => data?.photos?.length && setSelectedLocationPhotos(data.photos)}
            />
          </div>
        </div>

        {selectedLocationPhotos && selectedLocationPhotos.length > 0 && (
          <div className="discover-photo-popup-overlay" onClick={() => setSelectedLocationPhotos(null)} role="presentation">
            <div className="discover-photo-popup" onClick={(e) => e.stopPropagation()}>
              <div className="discover-photo-popup-header">
                <h3>此地点的照片（{selectedLocationPhotos.length} 张）</h3>
                <button type="button" className="discover-photo-popup-close" onClick={() => setSelectedLocationPhotos(null)} aria-label="关闭">×</button>
              </div>
              <div className="discover-photo-popup-list">
                {selectedLocationPhotos.map((photo) => (
                  <a key={photo.id} href={`/#/photo/${photo.id}`} className="discover-photo-popup-item">
                    <div className="discover-photo-popup-thumb">
                      {(photo.thumbnail_url || photo.preview_url || photo.oss_url) ? (
                        <img src={photo.thumbnail_url || photo.preview_url || photo.oss_url} alt={photo.title} />
                      ) : (
                        <div className="discover-photo-popup-placeholder">无图</div>
                      )}
                    </div>
                    <span className="discover-photo-popup-title">{photo.title}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Discover
