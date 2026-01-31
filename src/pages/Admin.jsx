import { useEffect, useRef, useState } from 'react'
import exifr from 'exifr'
import LoginForm from '../components/LoginForm'
import LocationPickerModal from '../components/LocationPickerModal'
import { apiRequest, loadAuth, clearAuth, getToken } from '../utils/apiClient'
import './Admin.css'

/** 从 EXIF 解析结果映射到表单字段 */
function exifToFormFields(exif) {
  if (!exif || typeof exif !== 'object') return {}
  const out = {}
  if (exif.DateTimeOriginal) {
    const d = exif.DateTimeOriginal
    if (d instanceof Date) {
      out.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    } else if (typeof d === 'string') {
      const m = d.match(/^(\d{4}):(\d{2}):(\d{2})/)
      if (m) out.date = `${m[1]}-${m[2]}-${m[3]}`
    }
  }
  if (exif.FocalLength != null) {
    const fl = typeof exif.FocalLength === 'number' ? Math.round(exif.FocalLength) : exif.FocalLength
    out.focalLength = `${fl}mm`
  }
  if (exif.FNumber != null) out.aperture = `f/${exif.FNumber}`
  if (exif.ExposureTime != null) {
    const et = exif.ExposureTime
    if (typeof et === 'number') {
      if (et < 1 && et > 0) out.shutterSpeed = `1/${Math.round(1 / et)}s`
      else if (et >= 1) out.shutterSpeed = `${et}s`
      else out.shutterSpeed = String(et)
    } else if (et && typeof et === 'object' && 'denominator' in et) {
      out.shutterSpeed = `1/${et.denominator}s`
    } else out.shutterSpeed = String(et)
  }
  if (exif.ISO != null || exif.ISOSpeedRatings != null) out.iso = String(exif.ISO ?? exif.ISOSpeedRatings ?? '')
  const make = exif.Make || ''
  const model = exif.Model || ''
  if (make || model) out.camera = [make, model].filter(Boolean).join(' ').trim()
  if (exif.LensModel) out.lens = String(exif.LensModel).trim()
  return out
}

function Admin() {
  const [activeTab, setActiveTab] = useState('upload')
  const [{ user }, setAuthState] = useState(() => loadAuth())
  const [authExpiredMessage, setAuthExpiredMessage] = useState('')
  const [locationPickerOpen, setLocationPickerOpen] = useState(false)
  const [photos, setPhotos] = useState([])
  const [photoStatusFilter, setPhotoStatusFilter] = useState('approved')
  const [photosLoading, setPhotosLoading] = useState(false)
  const [photosError, setPhotosError] = useState('')
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [statsLoading, setStatsLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null) // 0-100, null 表示未在上传
  const [uploadStage, setUploadStage] = useState(null) // 'uploading' | 'processing' | 'done'
  const [message, setMessage] = useState({ type: '', text: '' })
  const [configData, setConfigData] = useState({
    site_name: 'Pic4Pick',
    site_subtitle: 'Anthony',
    logo_letter: 'P',
    avatar_letter: 'A',
    amap_key: '',
    amap_security_code: '',
    oss_region: '',
    oss_bucket: '',
    oss_access_key_id: '',
    oss_access_key_secret: '',
  })
  const [configLoading, setConfigLoading] = useState(false)
  const [editingPhoto, setEditingPhoto] = useState(null)
  const [editFormData, setEditFormData] = useState(null)
  const [editDetailLoading, setEditDetailLoading] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [locationPickerTarget, setLocationPickerTarget] = useState('upload')
  const fileInputRef = useRef(null)
  const [formData, setFormData] = useState({
    title: '',
    province: '',
    location: '',
    country: '中国',
    date: '',
    category: '精选',
    tags: '',
    rating: '5',
    lat: '',
    lng: '',
    ossKey: '',
    ossUrl: '',
    thumbnailUrl: '',
    previewUrl: '',
    focalLength: '',
    aperture: '',
    shutterSpeed: '',
    iso: '',
    camera: '',
    lens: ''
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    if (!user) {
      showMessage('error', '请先登录管理员账号')
      return
    }
    try {
      setUploading(true)
      setUploadProgress(0)
      setUploadStage('uploading')
      // 并行解析 EXIF（不阻塞上传，失败则忽略）
      const exifPromise = exifr.parse(file).catch(() => null)
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)
      const token = getToken()
      const apiBase = import.meta.env.VITE_API_BASE_URL || ''
      const data = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        // 0–90% 为上传进度，90–100% 为服务端压缩与处理时间
        const UPLOAD_CAP = 90
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            const uploadPercent = (ev.loaded / ev.total) * 100
            const displayPercent = Math.round((uploadPercent / 100) * UPLOAD_CAP)
            setUploadProgress(displayPercent)
            if (ev.loaded >= ev.total) setUploadStage('processing')
          } else {
            setUploadProgress((p) => (p == null ? 0 : Math.min(p + 5, UPLOAD_CAP - 5)))
          }
        }
        xhr.onload = () => {
          setUploadStage('done')
          setUploadProgress(100) // 服务端处理完成，显示 100%
          try {
            const json = JSON.parse(xhr.responseText || '{}')
            if (xhr.status >= 200 && xhr.status < 300) resolve(json)
            else reject(new Error(json.message || '上传失败'))
          } catch {
            reject(new Error('上传失败'))
          }
        }
        xhr.onerror = () => reject(new Error('网络错误，请稍后重试'))
        xhr.onabort = () => reject(new Error('上传已取消'))
        xhr.open('POST', `${apiBase}/api/photos/upload-oss`)
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        xhr.send(formDataUpload)
      })
      const exif = await exifPromise
      const exifFields = exifToFormFields(exif)
      const hasExif = Object.keys(exifFields).length > 0
      setFormData(prev => ({
        ...prev,
        ossKey: data.ossKey || prev.ossKey,
        ossUrl: data.ossUrl || prev.ossUrl,
        thumbnailUrl: data.thumbnailUrl || prev.thumbnailUrl,
        previewUrl: data.previewUrl || prev.previewUrl,
        ...exifFields,
      }))
      showMessage(
        'success',
        hasExif
          ? '上传成功，已生成缩略图并自动填入作品信息与相机参数'
          : '上传成功，已自动生成缩略图和预览图'
      )
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
      showMessage('error', err.message || '上传失败，请稍后重试')
    } finally {
      setUploading(false)
      setUploadProgress(null)
      setUploadStage(null)
      // 重置 input，允许重复选择同一文件
      e.target.value = ''
    }
  }

  const uploadStageLabel = uploadStage === 'uploading' ? '上传中' : uploadStage === 'processing' ? '压缩图片与处理中' : uploadStage === 'done' ? '完成' : ''

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files && files[0]) {
      const fakeEvent = { target: { files } }
      handleFileUpload(fakeEvent)
    }
  }

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  const loadStats = async () => {
    if (!user) return
    setStatsLoading(true)
    try {
      const data = await apiRequest('/api/photos/stats')
      setStats({
        total: data.total || 0,
        pending: data.pending || 0,
        approved: data.approved || 0,
        rejected: data.rejected || 0,
      })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('加载统计数据失败', err)
      if (err.status === 401) {
        setAuthExpiredMessage(err.message || '登录已过期或令牌无效，请重新登录')
        clearAuth()
        setAuthState(loadAuth())
      }
    } finally {
      setStatsLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!user) {
      showMessage('error', '请先登录管理员账号')
      return
    }

    if (!formData.ossKey) {
      showMessage('error', '请先上传图片')
      return
    }

    try {
      setSubmitLoading(true)
      const payload = {
        title: formData.title,
        location_province: formData.province || null,
        location_city: formData.location,
        location_country: formData.country,
        shot_date: formData.date || null,
        category: formData.category,
        tags: formData.tags,
        rating: formData.rating ? Number(formData.rating) : null,
        lat: formData.lat ? Number(formData.lat) : null,
        lng: formData.lng ? Number(formData.lng) : null,
        oss_key: formData.ossKey,
        oss_url: formData.ossUrl || null,
        thumbnail_url: formData.thumbnailUrl || null,
        preview_url: formData.previewUrl || null,
        status: 'approved',
        focal_length: formData.focalLength || null,
        aperture: formData.aperture || null,
        shutter_speed: formData.shutterSpeed || null,
        iso: formData.iso || null,
        camera: formData.camera || null,
        lens: formData.lens || null,
      }

      await apiRequest('/api/photos', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      showMessage('success', '提交成功，已出现在已上传列表')
      handleReset()
      loadStats()
      setActiveTab('reviewed')
      loadPhotos()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
      showMessage('error', err.message || '提交失败，请稍后重试')
      if (err.status === 401) {
        setAuthExpiredMessage(err.message || '登录已过期或令牌无效，请重新登录')
        clearAuth()
        setAuthState(loadAuth())
      }
    } finally {
      setSubmitLoading(false)
    }
  }

  const loadPhotos = async (status) => {
    if (!user) return
    setPhotosLoading(true)
    setPhotosError('')
    try {
      // 不传 status 时拉取全部（含隐藏），用于「已上传/已隐藏」列表；传 status 时按状态筛选
      const url = status
        ? `/api/photos?status=${encodeURIComponent(status)}&page=1&pageSize=500`
        : '/api/photos?page=1&pageSize=500'
      const data = await apiRequest(url)
      setPhotos(data.items || [])
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
      setPhotosError(err.message || '加载失败')
      if (err.status === 401) {
        setAuthExpiredMessage(err.message || '登录已过期或令牌无效，请重新登录')
        clearAuth()
        setAuthState(loadAuth())
      }
    } finally {
      setPhotosLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadStats()
      loadConfig()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (!user) return
    if (activeTab === 'reviewed') {
      setPhotoStatusFilter('approved')
      loadPhotos()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user])

  const handleApprove = async (id) => {
    try {
      await apiRequest(`/api/photos/${id}/approve`, { method: 'POST' })
      showMessage('success', '已通过审核')
      loadPhotos(activeTab === 'reviewed' ? undefined : photoStatusFilter)
      loadStats()
    } catch (err) {
      showMessage('error', err.message || '操作失败')
      if (err.status === 401) {
        setAuthExpiredMessage(err.message || '登录已过期或令牌无效，请重新登录')
        clearAuth()
        setAuthState(loadAuth())
      }
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  }

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const openEditPhoto = async (photo) => {
    if (!photo?.id || !user) return
    setEditingPhoto({ id: photo.id })
    setEditFormData(null)
    setEditDetailLoading(true)
    try {
      const full = await apiRequest(`/api/photos/${photo.id}`)
      setEditingPhoto(full)
      setEditFormData({
        title: full.title || '',
        province: full.location_province || '',
        location: full.location_city || '',
        country: full.location_country || '',
        date: formatDateForInput(full.shot_date),
        category: full.category || '精选',
        tags: full.tags || '',
        rating: full.rating != null ? String(full.rating) : '5',
        lat: full.lat != null ? String(full.lat) : '',
        lng: full.lng != null ? String(full.lng) : '',
        hidden: !!(full.hidden ?? 0),
        focalLength: full.focal_length || '',
        aperture: full.aperture || '',
        shutterSpeed: full.shutter_speed || '',
        iso: full.iso || '',
        camera: full.camera || '',
        lens: full.lens || '',
      })
    } catch (err) {
      showMessage('error', err.message || '加载照片详情失败')
      closeEditPhoto()
    } finally {
      setEditDetailLoading(false)
    }
  }

  const closeEditPhoto = () => {
    setEditingPhoto(null)
    setEditFormData(null)
    setEditDetailLoading(false)
  }

  const handleEditInputChange = (e) => {
    const { name, value } = e.target
    setEditFormData((prev) => (prev ? { ...prev, [name]: value } : null))
  }

  const handleEditSave = async (e) => {
    e.preventDefault()
    if (!editingPhoto || !editFormData || !user) return
    try {
      setEditSaving(true)
      await apiRequest(`/api/photos/${editingPhoto.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: (editFormData.title || '').trim(),
          location_province: (editFormData.province || '').trim() || null,
          location_city: (editFormData.location || '').trim(),
          location_country: (editFormData.country || '').trim(),
          shot_date: editFormData.date || null,
          category: editFormData.category || '精选',
          tags: (editFormData.tags || '').trim() || null,
          rating: editFormData.rating ? Number(editFormData.rating) : null,
          lat: editFormData.lat && String(editFormData.lat).trim() ? Number(editFormData.lat) : null,
          lng: editFormData.lng && String(editFormData.lng).trim() ? Number(editFormData.lng) : null,
          hidden: !!editFormData.hidden,
          focal_length: (editFormData.focalLength || '').trim() || null,
          aperture: (editFormData.aperture || '').trim() || null,
          shutter_speed: (editFormData.shutterSpeed || '').trim() || null,
          iso: (editFormData.iso || '').trim() || null,
          camera: (editFormData.camera || '').trim() || null,
          lens: (editFormData.lens || '').trim() || null,
        }),
      })
      showMessage('success', '已保存')
      closeEditPhoto()
      loadPhotos(activeTab === 'reviewed' ? undefined : photoStatusFilter)
      loadStats()
    } catch (err) {
      showMessage('error', err.message || err.data?.message || '保存失败')
      if (err.status === 401) {
        setAuthExpiredMessage(err.message || '登录已过期或令牌无效，请重新登录')
        clearAuth()
        setAuthState(loadAuth())
      }
    } finally {
      setEditSaving(false)
    }
  }

  const handleToggleHidden = async () => {
    if (!editingPhoto || !editFormData || !user) return
    const nextHidden = !editFormData.hidden
    try {
      setEditSaving(true)
      await apiRequest(`/api/photos/${editingPhoto.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ hidden: nextHidden }),
      })
      setEditFormData((prev) => (prev ? { ...prev, hidden: nextHidden } : null))
      setEditingPhoto((p) => (p ? { ...p, hidden: nextHidden ? 1 : 0 } : null))
      showMessage('success', nextHidden ? '已隐藏，前台将不再展示' : '已取消隐藏')
      loadPhotos(activeTab === 'reviewed' ? undefined : photoStatusFilter)
      loadStats()
    } catch (err) {
      showMessage('error', err.message || '操作失败')
    } finally {
      setEditSaving(false)
    }
  }

  const handleDeletePhoto = async () => {
    if (!editingPhoto || !user) return
    if (!window.confirm('确定删除该照片？删除后无法恢复。')) return
    try {
      setEditSaving(true)
      await apiRequest(`/api/photos/${editingPhoto.id}`, { method: 'DELETE' })
      showMessage('success', '已删除')
      closeEditPhoto()
      loadPhotos(activeTab === 'reviewed' ? undefined : photoStatusFilter)
      loadStats()
    } catch (err) {
      showMessage('error', err.message || '删除失败')
      if (err.status === 401) {
        setAuthExpiredMessage(err.message || '登录已过期或令牌无效，请重新登录')
        clearAuth()
        setAuthState(loadAuth())
      }
    } finally {
      setEditSaving(false)
    }
  }

  const handleReset = () => {
    setFormData({
      title: '',
      province: '',
      location: '',
      country: '中国',
      date: '',
      category: '精选',
      tags: '',
      rating: '5',
      lat: '',
      lng: '',
      focalLength: '',
      aperture: '',
      shutterSpeed: '',
      iso: '',
      camera: '',
      lens: '',
      ossKey: '',
      ossUrl: '',
      thumbnailUrl: '',
      previewUrl: '',
    })
  }

  const loadConfig = async () => {
    if (!user) return
    setConfigLoading(true)
    try {
      const data = await apiRequest('/api/config')
      setConfigData({
        site_name: data.site_name || 'Pic4Pick',
        site_subtitle: data.site_subtitle || 'Anthony',
        logo_letter: (data.logo_letter || 'P').trim().slice(0, 1) || 'P',
        avatar_letter: (data.avatar_letter || 'A').trim().slice(0, 1) || 'A',
        amap_key: data.amap_key || '',
        amap_security_code: data.amap_security_code || '',
        oss_region: data.oss_region || '',
        oss_bucket: data.oss_bucket || '',
        oss_access_key_id: data.oss_access_key_id || '',
        oss_access_key_secret: data.oss_access_key_secret || '',
      })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('加载配置失败', err)
      showMessage('error', err.message || '加载配置失败')
      if (err.status === 401) {
        setAuthExpiredMessage(err.message || '登录已过期或令牌无效，请重新登录')
        clearAuth()
        setAuthState(loadAuth())
      }
    } finally {
      setConfigLoading(false)
    }
  }

  const handleConfigChange = (e) => {
    const { name, value } = e.target
    setConfigData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleConfigSave = async (e) => {
    e.preventDefault()
    if (!user) {
      showMessage('error', '请先登录管理员账号')
      return
    }
    try {
      setConfigLoading(true)
      const saved = await apiRequest('/api/config', {
        method: 'POST',
        body: JSON.stringify(configData),
      })
      setConfigData({
        site_name: saved.site_name || 'Pic4Pick',
        site_subtitle: saved.site_subtitle || 'Anthony',
        logo_letter: (saved.logo_letter || 'P').trim().slice(0, 1) || 'P',
        avatar_letter: (saved.avatar_letter || 'A').trim().slice(0, 1) || 'A',
        amap_key: saved.amap_key || '',
        amap_security_code: saved.amap_security_code || '',
        oss_region: saved.oss_region || '',
        oss_bucket: saved.oss_bucket || '',
        oss_access_key_id: saved.oss_access_key_id || '',
        oss_access_key_secret: saved.oss_access_key_secret || '',
      })
      showMessage('success', '配置已保存')
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err)
      showMessage('error', err.message || '保存配置失败')
      if (err.status === 401) {
        setAuthExpiredMessage(err.message || '登录已过期或令牌无效，请重新登录')
        clearAuth()
        setAuthState(loadAuth())
      }
    } finally {
      setConfigLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="admin-page admin-page--login">
        <div className="admin-container admin-container--login">
          <LoginForm
            expiredMessage={authExpiredMessage}
            onLogin={(loggedInUser) => {
              setAuthExpiredMessage('')
              setAuthState({ user: loggedInUser, token: loadAuth().token })
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <div className="admin-header">
          <div className="admin-logo">
            <div className="admin-logo-avatar">{configData.logo_letter}</div>
            <div>
              <div className="admin-title">{configData.site_name || 'Pic4Pick'}</div>
              <div className="admin-subtitle">{configData.site_subtitle || 'Anthony'}</div>
            </div>
          </div>
          {user && (
            <div className="admin-user-info">
              <span className="admin-username">{user.username}</span>
              <button
                className="admin-logout-btn"
                onClick={() => {
                  clearAuth()
                  setAuthState(loadAuth())
                  showMessage('success', '已退出登录')
                }}
              >
                退出
              </button>
            </div>
          )}
        </div>

        <div className="stats-section">
          <div className="stat-card">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-number">{statsLoading ? '...' : stats.total}</div>
              <div className="stat-label">作品总数</div>
              <div className="stat-sublabel">全部作品数量</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-number">{statsLoading ? '...' : stats.approved}</div>
              <div className="stat-label">已上传</div>
              <div className="stat-sublabel">已上传的作品</div>
            </div>
          </div>
        </div>

        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            上传作品
          </button>
          <button
            className={`admin-tab ${activeTab === 'reviewed' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviewed')}
          >
            已上传 ({stats.approved})
          </button>
          <button
            className={`admin-tab ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 10a2 2 0 100-4 2 2 0 000 4z" fill="currentColor"/>
              <path d="M8 1v2M8 13v2M3 8H1M15 8h-2M2.343 2.343l1.414 1.414M12.243 12.243l1.414 1.414M2.343 13.657l1.414-1.414M12.243 3.757l1.414-1.414" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            配置
          </button>
        </div>

        {activeTab === 'upload' && (
          <div className="admin-content">
            <div className="upload-section">
              <div className="section-title">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 3v10M10 3L6 7M10 3l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 14v2a1 1 0 001 1h12a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                上传作品
              </div>
              <input
                ref={fileInputRef}
                type="file"
                id="admin-upload-input"
                accept="image/jpeg,image/png"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <div
                className="upload-dropzone"
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {formData.thumbnailUrl ? (
                  <>
                    <img src={formData.thumbnailUrl} alt="已上传缩略图" className="upload-thumbnail" />
                    <div className="upload-dropzone-text">
                      <span className="upload-text">已上传，可点击或拖拽更换照片</span>
                      <span className="upload-hint">支持JPG、PNG格式, 推荐不超过20MB</span>
                    </div>
                  </>
                ) : (
                  <>
                    <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                      <path d="M24 8v32M8 24h32" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
                    </svg>
                    <span className="upload-text">点击或拖拽上传照片</span>
                    <span className="upload-hint">支持JPG、PNG格式, 推荐不超过20MB</span>
                  </>
                )}
              </div>
              {uploading && uploadProgress != null && (
                <div className="upload-progress-wrap">
                  <div className="upload-progress-label">{uploadStageLabel}</div>
                  <div className="upload-progress">
                    <div className="upload-progress-bar" style={{ width: `${uploadProgress}%` }} />
                    <span className="upload-progress-text">{uploadProgress}%</span>
                  </div>
                </div>
              )}
            </div>

            <form className="form-section" onSubmit={handleSubmit}>
              <div className="section-title">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 4h12v12H4V4z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <path d="M6 6h8M6 9h8M6 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                作品信息
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>
                    标题 <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="请输入作品标题"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>省份（可选）</label>
                  <input
                    type="text"
                    name="province"
                    value={formData.province}
                    onChange={handleInputChange}
                    placeholder="例如: 河南、北京、河北"
                  />
                </div>

                <div className="form-group">
                  <label>
                    城市 / 拍摄地点 <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="城市或地标"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    国家 / 地区 <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    placeholder="例如: 冰岛"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    拍摄日期 <span className="required">*</span>
                  </label>
                  <div className="date-input-wrapper">
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      placeholder="yyyy/mm/dd"
                      required
                    />
                    <svg className="date-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M4 4h12v12H4V4z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <path d="M4 8h12M7 4v4M13 4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    分类 <span className="required">*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="精选">精选</option>
                    <option value="最新">最新</option>
                    <option value="随览">随览</option>
                    <option value="附近">附近</option>
                    <option value="远方">远方</option>
                  </select>
                </div>

                <div className="form-group form-group-full">
                  <label>标签</label>
                  <input
                    type="text"
                    name="tags"
                    value={formData.tags}
                    onChange={handleInputChange}
                    placeholder="旅行,城市,夜景(用逗号分隔)"
                  />
                </div>

                <div className="form-group form-group-full">
                  <label>作品的经纬度</label>
                  <div className="form-row-lnglat">
                    <input
                      type="text"
                      name="lng"
                      value={formData.lng}
                      onChange={handleInputChange}
                      placeholder="经度，如 116.397"
                    />
                    <input
                      type="text"
                      name="lat"
                      value={formData.lat}
                      onChange={handleInputChange}
                      placeholder="纬度，如 39.909"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>评级 (1-10)</label>
                  <input
                    type="number"
                    name="rating"
                    value={formData.rating}
                    onChange={handleInputChange}
                    min="1"
                    max="10"
                    placeholder="5"
                  />
                </div>

                <div className="form-group">
                  <label>地理位置</label>
                  <button
                    type="button"
                    className="location-btn"
                    onClick={() => { setLocationPickerTarget('upload'); setLocationPickerOpen(true); }}
                  >
                    在地图上选择位置
                  </button>
                </div>
              </div>

              <div className="section-title">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2L12 7h5l-4 3 1.5 5L10 13l-4.5 4 1.5-5-4-3h5z" fill="currentColor"/>
                </svg>
                相机参数
              </div>

              <div className="form-grid form-grid-camera">
                <div className="form-group">
                  <label>焦距</label>
                  <input
                    type="text"
                    name="focalLength"
                    value={formData.focalLength}
                    onChange={handleInputChange}
                    placeholder="例如: 50mm"
                  />
                </div>

                <div className="form-group">
                  <label>光圈</label>
                  <input
                    type="text"
                    name="aperture"
                    value={formData.aperture}
                    onChange={handleInputChange}
                    placeholder="例如: f/2.8"
                  />
                </div>

                <div className="form-group">
                  <label>快门</label>
                  <input
                    type="text"
                    name="shutterSpeed"
                    value={formData.shutterSpeed}
                    onChange={handleInputChange}
                    placeholder="例如: 1/125s"
                  />
                </div>

                <div className="form-group">
                  <label>ISO</label>
                  <input
                    type="text"
                    name="iso"
                    value={formData.iso}
                    onChange={handleInputChange}
                    placeholder="例如: 200"
                  />
                </div>

                <div className="form-group">
                  <label>相机</label>
                  <input
                    type="text"
                    name="camera"
                    value={formData.camera}
                    onChange={handleInputChange}
                    placeholder="例如: Canon EOS 5D Mark IV"
                  />
                </div>

                <div className="form-group">
                  <label>镜头</label>
                  <input
                    type="text"
                    name="lens"
                    value={formData.lens}
                    onChange={handleInputChange}
                    placeholder="例如: EF 70-200mm f/2.8L"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-btn" disabled={submitLoading}>
                  {submitLoading ? '提交中...' : '提交审核'}
                </button>
                <button type="button" onClick={handleReset} className="reset-btn">重置</button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'reviewed' && (
          <div className="admin-content">
            <div className="photo-list-section">
              <div className="section-title">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 4h12v12H4V4z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  <path d="M6 6h8M6 9h8M6 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                已上传作品
                {!photosLoading && !photosError && (
                  <span className="section-title-count">（{photos.filter((p) => !p.hidden).length}）</span>
                )}
              </div>

              {photosLoading ? (
                <div className="photo-list-loading">
                  <div className="loading-spinner"></div>
                  <span>加载中...</span>
                </div>
              ) : photosError ? (
                <div className="photo-list-error">{photosError}</div>
              ) : photos.filter((p) => !p.hidden).length === 0 ? (
                <div className="photo-list-empty">暂无数据</div>
              ) : (
                <div className="photo-list">
                  {photos.filter((p) => !p.hidden).map((photo) => (
                    <div
                      key={photo.id}
                      className="photo-list-item"
                      role="button"
                      tabIndex={0}
                      onClick={() => openEditPhoto(photo)}
                      onKeyDown={(e) => e.key === 'Enter' && openEditPhoto(photo)}
                      title="点击编辑该照片信息"
                    >
                      <div className="photo-list-image">
                        {(photo.thumbnail_url || photo.preview_url || photo.oss_url) ? (
                          <img src={photo.thumbnail_url || photo.preview_url || photo.oss_url} alt={photo.title} />
                        ) : (
                          <div className="photo-list-placeholder">无图片</div>
                        )}
                      </div>
                      <div className="photo-list-info">
                        <div className="photo-list-title">{photo.title}</div>
                        <div className="photo-list-meta">
                          <span>{photo.location_city || '-'}</span>
                          <span>·</span>
                          <span>{photo.location_country || '-'}</span>
                          <span>·</span>
                          <span>{formatDate(photo.shot_date)}</span>
                        </div>
                        <div className="photo-list-tags">
                          {photo.tags && (
                            <span className="photo-tag-badge">{photo.tags}</span>
                          )}
                          {photo.rating && (
                            <span className="photo-rating-badge">⭐ {photo.rating}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="photo-list-section photo-list-section--hidden">
              <div className="section-title">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 10h14M10 3v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                已隐藏作品
                {!photosLoading && !photosError && (
                  <span className="section-title-count">（{photos.filter((p) => p.hidden).length}）</span>
                )}
              </div>

              {photosLoading ? null : photosError ? null : photos.filter((p) => p.hidden).length === 0 ? (
                <div className="photo-list-empty">暂无隐藏作品</div>
              ) : (
                <div className="photo-list">
                  {photos.filter((p) => p.hidden).map((photo) => (
                    <div
                      key={photo.id}
                      className="photo-list-item"
                      role="button"
                      tabIndex={0}
                      onClick={() => openEditPhoto(photo)}
                      onKeyDown={(e) => e.key === 'Enter' && openEditPhoto(photo)}
                      title="点击编辑该照片信息"
                    >
                      <div className="photo-list-image">
                        {(photo.thumbnail_url || photo.preview_url || photo.oss_url) ? (
                          <img src={photo.thumbnail_url || photo.preview_url || photo.oss_url} alt={photo.title} />
                        ) : (
                          <div className="photo-list-placeholder">无图片</div>
                        )}
                      </div>
                      <div className="photo-list-info">
                        <div className="photo-list-title">{photo.title}</div>
                        <div className="photo-list-meta">
                          <span>{photo.location_city || '-'}</span>
                          <span>·</span>
                          <span>{photo.location_country || '-'}</span>
                          <span>·</span>
                          <span>{formatDate(photo.shot_date)}</span>
                        </div>
                        <div className="photo-list-tags">
                          {photo.tags && (
                            <span className="photo-tag-badge">{photo.tags}</span>
                          )}
                          {photo.rating && (
                            <span className="photo-rating-badge">⭐ {photo.rating}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="admin-content admin-content--config">
            <form className="config-form" onSubmit={handleConfigSave}>
              <section className="config-card">
                <h3 className="config-card-title">站点 / 个人</h3>
                <div className="config-grid config-grid--compact">
                  <div className="form-group">
                    <label>站点名称</label>
                    <input type="text" name="site_name" value={configData.site_name} onChange={handleConfigChange} placeholder="Pic4Pick" />
                  </div>
                  <div className="form-group">
                    <label>副标题</label>
                    <input type="text" name="site_subtitle" value={configData.site_subtitle} onChange={handleConfigChange} placeholder="Anthony" />
                  </div>
                  <div className="form-group">
                    <label>Logo 字母</label>
                    <input type="text" name="logo_letter" value={configData.logo_letter} onChange={handleConfigChange} placeholder="P" maxLength={1} title="头部左侧圆形内显示" />
                  </div>
                  <div className="form-group">
                    <label>头像字母</label>
                    <input type="text" name="avatar_letter" value={configData.avatar_letter} onChange={handleConfigChange} placeholder="A" maxLength={1} title="头部右侧圆形内显示" />
                  </div>
                </div>
              </section>

              <section className="config-card">
                <h3 className="config-card-title">高德地图</h3>
                <div className="config-grid">
                  <div className="form-group">
                    <label>API Key</label>
                    <input type="text" name="amap_key" value={configData.amap_key} onChange={handleConfigChange} placeholder="高德 Web JS API Key" />
                  </div>
                  <div className="form-group">
                    <label>安全密钥</label>
                    <input type="text" name="amap_security_code" value={configData.amap_security_code} onChange={handleConfigChange} placeholder="可选" />
                  </div>
                </div>
              </section>

              <section className="config-card">
                <h3 className="config-card-title">阿里云 OSS</h3>
                <div className="config-grid">
                  <div className="form-group">
                    <label>Region</label>
                    <input type="text" name="oss_region" value={configData.oss_region} onChange={handleConfigChange} placeholder="oss-cn-beijing" />
                  </div>
                  <div className="form-group">
                    <label>Bucket</label>
                    <input type="text" name="oss_bucket" value={configData.oss_bucket} onChange={handleConfigChange} placeholder="Bucket 名称" />
                  </div>
                  <div className="form-group">
                    <label>AccessKey ID</label>
                    <input type="text" name="oss_access_key_id" value={configData.oss_access_key_id} onChange={handleConfigChange} placeholder="AccessKeyId" />
                  </div>
                  <div className="form-group">
                    <label>AccessKey Secret</label>
                    <input type="password" name="oss_access_key_secret" value={configData.oss_access_key_secret} onChange={handleConfigChange} placeholder="密钥" />
                  </div>
                </div>
              </section>

              <div className="config-form-actions">
                <button type="submit" className="submit-btn" disabled={configLoading}>
                  {configLoading ? '保存中...' : '保存配置'}
                </button>
              </div>
            </form>
          </div>
        )}

        {message.text && (
          <div className={`admin-message admin-message-${message.type}`}>
            {message.text}
          </div>
        )}

        <LocationPickerModal
          visible={locationPickerOpen}
          onClose={() => setLocationPickerOpen(false)}
          onConfirm={(data) => {
            if (locationPickerTarget === 'edit' && editFormData) {
              setEditFormData((prev) => (prev ? {
                ...prev,
                lat: data.lat != null ? String(data.lat) : '',
                lng: data.lng != null ? String(data.lng) : '',
                province: data.province || prev.province,
                location: data.city || prev.location,
                country: data.country || prev.country,
              } : null))
            } else {
              setFormData((prev) => ({
                ...prev,
                lat: data.lat != null ? String(data.lat) : '',
                lng: data.lng != null ? String(data.lng) : '',
                province: data.province || prev.province,
                location: data.city || prev.location,
                country: data.country || prev.country,
              }))
            }
            setLocationPickerOpen(false)
          }}
          initialLat={locationPickerTarget === 'edit' && editFormData ? (editFormData.lat || undefined) : (formData.lat || undefined)}
          initialLng={locationPickerTarget === 'edit' && editFormData ? (editFormData.lng || undefined) : (formData.lng || undefined)}
        />

        {editingPhoto && (editDetailLoading || editFormData) && (
          <div className="photo-edit-modal-overlay" onClick={closeEditPhoto} role="presentation">
            <div className="photo-edit-modal" onClick={(e) => e.stopPropagation()}>
              <div className="photo-edit-modal-header">
                <h3>编辑照片信息</h3>
                <button type="button" className="photo-edit-modal-close" onClick={closeEditPhoto} aria-label="关闭">×</button>
              </div>
              {editDetailLoading ? (
                <div className="photo-edit-modal-loading">
                  <div className="loading-spinner" />
                  <span>加载中...</span>
                </div>
              ) : (
              <form className="photo-edit-form" onSubmit={handleEditSave}>
                <div className="photo-edit-preview">
                  {(editingPhoto.thumbnail_url || editingPhoto.preview_url || editingPhoto.oss_url) ? (
                    <img src={editingPhoto.thumbnail_url || editingPhoto.preview_url || editingPhoto.oss_url} alt={editingPhoto.title} />
                  ) : (
                    <div className="photo-list-placeholder">无图片</div>
                  )}
                </div>

                <div className="photo-edit-meta-section">
                  <h4 className="photo-edit-meta-title">相机信息</h4>
                  <div className="photo-edit-camera-grid">
                    <div className="form-group">
                      <label>焦距</label>
                      <input type="text" name="focalLength" value={editFormData.focalLength || ''} onChange={handleEditInputChange} placeholder="例如: 50mm" />
                    </div>
                    <div className="form-group">
                      <label>光圈</label>
                      <input type="text" name="aperture" value={editFormData.aperture || ''} onChange={handleEditInputChange} placeholder="例如: f/2.8" />
                    </div>
                    <div className="form-group">
                      <label>快门</label>
                      <input type="text" name="shutterSpeed" value={editFormData.shutterSpeed || ''} onChange={handleEditInputChange} placeholder="例如: 1/125s" />
                    </div>
                    <div className="form-group">
                      <label>ISO</label>
                      <input type="text" name="iso" value={editFormData.iso || ''} onChange={handleEditInputChange} placeholder="例如: 200" />
                    </div>
                    <div className="form-group form-group-full">
                      <label>相机</label>
                      <input type="text" name="camera" value={editFormData.camera || ''} onChange={handleEditInputChange} placeholder="例如: Canon EOS 5D Mark IV" />
                    </div>
                    <div className="form-group form-group-full">
                      <label>镜头</label>
                      <input type="text" name="lens" value={editFormData.lens || ''} onChange={handleEditInputChange} placeholder="例如: EF 70-200mm f/2.8L" />
                    </div>
                  </div>
                </div>

                <div className="photo-edit-fields">
                  <div className="form-group">
                    <label>标题 <span className="required">*</span></label>
                    <input type="text" name="title" value={editFormData.title || ''} onChange={handleEditInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>省份（可选）</label>
                    <input type="text" name="province" value={editFormData.province || ''} onChange={handleEditInputChange} placeholder="例如: 河南、北京" />
                  </div>
                  <div className="form-group">
                    <label>城市 / 拍摄地点 <span className="required">*</span></label>
                    <input type="text" name="location" value={editFormData.location || ''} onChange={handleEditInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>国家 / 地区 <span className="required">*</span></label>
                    <input type="text" name="country" value={editFormData.country || ''} onChange={handleEditInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>拍摄日期</label>
                    <input type="date" name="date" value={editFormData.date || ''} onChange={handleEditInputChange} />
                  </div>
                  <div className="form-group">
                    <label>分类</label>
                    <select name="category" value={editFormData.category || '精选'} onChange={handleEditInputChange}>
                      <option value="精选">精选</option>
                      <option value="最新">最新</option>
                      <option value="随览">随览</option>
                      <option value="附近">附近</option>
                      <option value="远方">远方</option>
                    </select>
                  </div>
                  <div className="form-group form-group-full">
                    <label>标签</label>
                    <input type="text" name="tags" value={editFormData.tags || ''} onChange={handleEditInputChange} placeholder="用逗号分隔" />
                  </div>
                  <div className="form-group">
                    <label>评级 (1-10)</label>
                    <input type="number" name="rating" value={editFormData.rating || ''} onChange={handleEditInputChange} min="1" max="10" />
                  </div>
                  <div className="form-group form-group-full">
                    <label>经纬度</label>
                    <div className="form-row-lnglat">
                      <input type="text" name="lng" value={editFormData.lng || ''} onChange={handleEditInputChange} placeholder="经度" />
                      <input type="text" name="lat" value={editFormData.lat || ''} onChange={handleEditInputChange} placeholder="纬度" />
                    </div>
                  </div>
                  <div className="form-group form-group-full">
                    <button
                      type="button"
                      className="location-btn"
                      onClick={() => { setLocationPickerTarget('edit'); setLocationPickerOpen(true); }}
                    >
                      在地图上选择位置
                    </button>
                  </div>
                </div>
                <div className="photo-edit-modal-actions">
                  <button type="submit" className="submit-btn" disabled={editSaving}>{editSaving ? '保存中...' : '保存'}</button>
                  <button type="button" className="reset-btn" onClick={closeEditPhoto}>取消</button>
                  <button type="button" className="photo-edit-btn-hide" onClick={handleToggleHidden} disabled={editSaving} title={editFormData.hidden ? '取消隐藏' : '隐藏后前台不展示'}>
                    {editFormData.hidden ? '取消隐藏' : '隐藏'}
                  </button>
                  <button type="button" className="photo-edit-btn-delete" onClick={handleDeletePhoto} disabled={editSaving} title="删除该照片">
                    删除
                  </button>
                </div>
              </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Admin
