import { useEffect, useRef, useState } from 'react'
import AMapLoader from '@amap/amap-jsapi-loader'
import './LocationPickerModal.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export default function LocationPickerModal({ visible, onClose, onConfirm, initialLat, initialLng }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const amapRef = useRef(null)
  const markerRef = useRef(null)
  const geocoderRef = useRef(null)
  const [amapConfig, setAmapConfig] = useState({ key: '', securityCode: '' })
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [picked, setPicked] = useState({ lat: null, lng: null, province: '', city: '', district: '', address: '' })
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!visible) return
    fetch(`${API_BASE}/api/config/public`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.amap_key) {
          setAmapConfig({
            key: data.amap_key,
            securityCode: data.amap_security_code || '',
          })
        }
      })
      .catch(() => {})
  }, [visible])

  useEffect(() => {
    if (!visible || !amapConfig.key) return
    if (amapConfig.securityCode) {
      window._AMapSecurityConfig = { securityJsCode: amapConfig.securityCode }
    }
    const key = amapConfig.key
    AMapLoader.load({
      key,
      version: '2.0',
      plugins: ['AMap.Scale', 'AMap.Geocoder', 'AMap.PlaceSearch'],
    })
      .then((AMap) => {
        if (!containerRef.current) return
        const center = initialLat && initialLng ? [Number(initialLng), Number(initialLat)] : [116.397428, 39.90923]
        const map = new AMap.Map(containerRef.current, {
          viewMode: '2D',
          zoom: 14,
          center,
          mapStyle: 'amap://styles/whitesmoke',
        })
        amapRef.current = AMap
        mapRef.current = map

        const geocoder = new AMap.Geocoder({ radius: 500, extensions: 'all' })
        geocoderRef.current = geocoder
        const placeSearch = new AMap.PlaceSearch({ pageSize: 10 })

        const updateMarker = (lnglat) => {
          if (markerRef.current) map.remove(markerRef.current)
          markerRef.current = new AMap.Marker({ position: lnglat })
          map.add(markerRef.current)
          map.setCenter(lnglat)
          const [lng, lat] = lnglat
          geocoder.getAddress([lng, lat], (status, result) => {
            if (status === 'complete' && result?.regeocode) {
              const addr = result.regeocode
              const comp = addr.addressComponent || {}
              setPicked({
                lat,
                lng,
                province: comp.province || '',
                city: comp.city || comp.province || '',
                district: comp.district || '',
                address: addr.formattedAddress || '',
              })
            } else {
              setPicked((prev) => ({ ...prev, lat, lng }))
            }
          })
        }

        if (initialLat && initialLng) {
          const lnglat = [Number(initialLng), Number(initialLat)]
          updateMarker(lnglat)
        }

        map.on('click', (e) => {
          updateMarker(e.lnglat)
        })

        window.__locationPickerSearch = (keyword) => {
          const k = (keyword || '').trim()
          if (!k) return
          setSearching(true)
          placeSearch.search(k, (status, result) => {
            setSearching(false)
            if (status === 'complete' && result?.poiList?.pois?.length) {
              setSearchResults(
                result.poiList.pois.map((p) => ({
                  name: p.name,
                  address: p.address,
                  location: p.location,
                }))
              )
            } else {
              setSearchResults([])
            }
          })
        }
      })
      .catch((e) => console.error('AMap load error:', e))

    return () => {
      window.__locationPickerSearch = undefined
      geocoderRef.current = null
      if (markerRef.current && mapRef.current) {
        mapRef.current.remove(markerRef.current)
        markerRef.current = null
      }
      if (mapRef.current) {
        mapRef.current.destroy()
        mapRef.current = null
      }
      amapRef.current = null
    }
  }, [visible, amapConfig.key, amapConfig.securityCode])

  const handleSearch = (e) => {
    e.preventDefault()
    if (typeof window.__locationPickerSearch === 'function') window.__locationPickerSearch(searchKeyword)
  }

  const handleSelectResult = (item) => {
    const loc = item.location
    if (!loc || !mapRef.current || !amapRef.current) return
    const lnglat = [loc.lng, loc.lat]
    if (markerRef.current) mapRef.current.remove(markerRef.current)
    markerRef.current = new amapRef.current.Marker({ position: lnglat })
    mapRef.current.add(markerRef.current)
    mapRef.current.setCenter(lnglat)
    setPicked({
      lat: loc.lat,
      lng: loc.lng,
      province: '',
      city: '',
      district: '',
      address: item.address || item.name || '',
    })
    setSearchResults([])
    setSearchKeyword('')
    const gc = geocoderRef.current
    if (gc) {
      gc.getAddress([loc.lng, loc.lat], (status, result) => {
        if (status === 'complete' && result?.regeocode) {
          const comp = result.regeocode.addressComponent || {}
          setPicked((prev) => ({
            ...prev,
            province: comp.province || '',
            city: comp.city || comp.province || '',
            district: comp.district || '',
            address: result.regeocode.formattedAddress || prev.address,
          }))
        }
      })
    }
  }

  const handleConfirm = () => {
    if (picked.lat != null && picked.lng != null) {
      setConfirming(true)
      onConfirm({
        lat: picked.lat,
        lng: picked.lng,
        province: picked.province || undefined,
        city: picked.city || picked.district || undefined,
        country: '中国',
        address: picked.address || undefined,
      })
      setConfirming(false)
      onClose()
    }
  }

  if (!visible) return null

  return (
    <div className="location-picker-overlay" onClick={onClose}>
      <div className="location-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="location-picker-header">
          <h3 className="location-picker-title">选择照片地理位置</h3>
          <button type="button" className="location-picker-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <div className="location-picker-search-row">
          <form onSubmit={handleSearch} className="location-picker-search-form">
            <input
              type="text"
              className="location-picker-search-input"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索地点，如：北京天安门、郑州二七塔"
            />
            <button type="submit" className="location-picker-search-btn" disabled={searching}>
              {searching ? '搜索中…' : '搜索'}
            </button>
          </form>
        </div>
        {searchResults.length > 0 && (
          <ul className="location-picker-results">
            {searchResults.map((item, i) => (
              <li key={i}>
                <button type="button" onClick={() => handleSelectResult(item)}>
                  <span className="result-name">{item.name}</span>
                  {item.address && <span className="result-addr">{item.address}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="location-picker-map-wrap">
          {!amapConfig.key && (
            <div className="location-picker-no-key">
              请先在「配置」中填写高德地图 Key 以使用地图选点
            </div>
          )}
          <div ref={containerRef} className="location-picker-map" />
        </div>
        {picked.lat != null && (
          <div className="location-picker-picked">
            已选：{picked.lat.toFixed(5)}, {picked.lng.toFixed(5)}
            {picked.address && ` · ${picked.address}`}
          </div>
        )}
        <div className="location-picker-actions">
          <button type="button" className="location-picker-cancel" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="location-picker-confirm"
            onClick={handleConfirm}
            disabled={picked.lat == null || confirming}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  )
}
