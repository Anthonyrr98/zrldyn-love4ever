import { useEffect, useRef, useState } from 'react'
import AMapLoader from '@amap/amap-jsapi-loader'

function AMapContainer({ className = '', markers = [], flyTo = null, onMarkerClick = null }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const amapRef = useRef(null)
  const markerInstancesRef = useRef([])
  const onMarkerClickRef = useRef(onMarkerClick)
  onMarkerClickRef.current = onMarkerClick
  const [mapReady, setMapReady] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [amapConfig, setAmapConfig] = useState({
    key: import.meta.env.VITE_AMAP_KEY || '',
    securityCode: import.meta.env.VITE_AMAP_SECURITY_CODE || '',
  })

  useEffect(() => {
    // 从后端读取最新配置（如果有）
    fetch('/api/config/public')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!data) return
        setAmapConfig((prev) => ({
          key: data.amap_key || prev.key,
          securityCode: data.amap_security_code || prev.securityCode,
        }))
      })
      .catch(() => {
        // 忽略错误，继续使用构建时配置
      })
  }, [])

  useEffect(() => {
    const key = amapConfig.key
    const securityCode = amapConfig.securityCode

    if (!key) {
      setMapReady(false)
      setLoadError(null)
      return
    }

    setLoadError(null)
    if (securityCode) {
      window._AMapSecurityConfig = { securityJsCode: securityCode }
    }

    let cancelled = false
    AMapLoader.load({
      key,
      version: '2.0',
      plugins: ['AMap.Scale', 'AMap.ToolBar'],
    })
      .then((AMap) => {
        if (cancelled || !containerRef.current) return
        const map = new AMap.Map(containerRef.current, {
          viewMode: '2D',
          zoom: 5,
          center: [116.397428, 39.90923],
          mapStyle: 'amap://styles/light',
        })
        amapRef.current = AMap
        mapRef.current = map
        setMapReady(true)
        requestAnimationFrame(() => {
          try {
            if (mapRef.current && typeof mapRef.current.resize === 'function') {
              mapRef.current.resize()
            }
          } catch (_) {}
        })
      })
      .catch((e) => {
        console.error('AMap load error:', e)
        setMapReady(false)
        setLoadError(e?.message || '地图加载失败')
      })

    return () => {
      cancelled = true
      setMapReady(false)
      markerInstancesRef.current = []
      if (mapRef.current) {
        try {
          mapRef.current.destroy()
        } catch (_) {}
        mapRef.current = null
      }
      amapRef.current = null
    }
  }, [amapConfig.key, amapConfig.securityCode])

  useEffect(() => {
    if (!mapReady) return
    const map = mapRef.current
    const AMap = amapRef.current
    if (!map || !AMap || !Array.isArray(markers)) return

    // 地图圆点尺寸（px），可调范围参考：10～20，当前 14
    const dotSize = 14
    const half = dotSize / 2
    const dotRadius = Math.max(1, dotSize / 2 - 1)
    const palette = [
      '#c41e3a', '#0d47a1', '#1b5e20', '#e65100', '#4a148c',
      '#b71c1c', '#01579b', '#33691e', '#bf360c', '#311b92',
      '#880e4f', '#004d40', '#f57f17', '#1565c0', '#2e7d32',
    ]
    const dotSvg = (color, opacity = 1) =>
      `data:image/svg+xml;utf8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${dotSize}" height="${dotSize}" viewBox="0 0 ${dotSize} ${dotSize}">
          <circle cx="${dotSize/2}" cy="${dotSize/2}" r="${dotRadius}" fill="${color}" fill-opacity="${opacity}" stroke="#fff" stroke-width="1"/>
        </svg>`
      )}`

    const createIcon = (url) => {
      try {
        if (AMap.Icon) {
          return new AMap.Icon({
            size: new AMap.Size(dotSize, dotSize),
            image: url,
            imageSize: new AMap.Size(dotSize, dotSize),
          })
        }
      } catch (_) {}
      return url
    }

    const prev = markerInstancesRef.current
    prev.forEach((m) => {
      if (m.blinkTimer) clearInterval(m.blinkTimer)
      map.remove(m)
    })

    const added = []
    markers.forEach((markerData, index) => {
      const { lat, lng, title } = markerData
      const color = palette[index % palette.length]
      const marker = new AMap.Marker({
        position: [Number(lng), Number(lat)],
        title: title || '照片',
        icon: createIcon(dotSvg(color, 1)),
        offset: new AMap.Pixel(-half, -half),
      })
      marker._markerData = markerData
      map.add(marker)
      added.push(marker)

      marker.on('click', () => {
        try {
          const fn = onMarkerClickRef.current
          if (typeof fn === 'function') fn(marker._markerData)
        } catch (_) {}
      })

      let bright = true
      marker.blinkTimer = setInterval(() => {
        try {
          bright = !bright
          marker.setIcon(createIcon(dotSvg(color, bright ? 1 : 0.6)))
        } catch (_) {}
      }, 600)
    })
    markerInstancesRef.current = added

    return () => {
      added.forEach((m) => {
        if (m.blinkTimer) clearInterval(m.blinkTimer)
      })
    }
  }, [markers, mapReady])

  useEffect(() => {
    if (!mapReady || !flyTo || !mapRef.current) return
    const map = mapRef.current
    const lng = Number(flyTo.lng)
    const lat = Number(flyTo.lat)
    if (Number.isNaN(lng) || Number.isNaN(lat)) return
    try {
      if (typeof map.panTo === 'function') {
        map.panTo([lng, lat], 600)
      } else {
        map.setCenter([lng, lat])
      }
    } catch (_) {
      map.setCenter([lng, lat])
    }
    const zoom = map.getZoom()
    if (zoom < 10) map.setZoom(11)
  }, [flyTo, mapReady])

  const hasKey = !!amapConfig.key

  if (!hasKey) {
    return (
      <div className={`amap-fallback ${className}`}>
        <div className="amap-fallback-content">
          <p>请配置高德地图 Key 以显示地图</p>
          <p className="amap-fallback-hint">
            在项目根目录 <code>.env</code> 或管理后台「配置」中设置：
            <br />
            <code>VITE_AMAP_KEY=你的Key</code>
            <br />
            高德控制台需勾选「Web 端(JS API)」，并在「Key 的授权 IP/域名」中加入 <code>localhost</code> 或当前域名。
          </p>
          <a
            href="https://lbs.amap.com/dev/key/app"
            target="_blank"
            rel="noopener noreferrer"
            className="amap-fallback-link"
          >
            申请 Key →
          </a>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className={`amap-fallback ${className}`}>
        <div className="amap-fallback-content">
          <p>地图加载失败</p>
          <p className="amap-fallback-hint">
            {loadError}
            <br />
            请检查：Key 是否有效、是否勾选「Web 端(JS API)」、当前访问域名是否已加入 Key 的授权列表（如 localhost）。
          </p>
          <a
            href="https://lbs.amap.com/dev/key/app"
            target="_blank"
            rel="noopener noreferrer"
            className="amap-fallback-link"
          >
            高德控制台 →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className={`amap-container ${className}`}>
      <div ref={containerRef} className="amap-inner" />
    </div>
  )
}

export default AMapContainer
