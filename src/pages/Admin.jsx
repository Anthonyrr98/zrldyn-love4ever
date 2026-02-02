import { useEffect, useRef, useState, useCallback } from 'react'
import exifr from 'exifr'
import LoginForm from '../components/LoginForm'
import LocationPickerModal from '../components/LocationPickerModal'
import Select from '../components/Select'
import DatePicker from '../components/DatePicker'
import { apiRequest, loadAuth, clearAuth, getToken } from '../utils/apiClient'
import './Admin.css'

// 简单拖拽排序辅助
function arrayMove(arr, from, to) {
  const copy = [...arr]
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)
  return copy
}

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
    logo_image_url: '',
    avatar_letter: 'A',
    avatar_image_url: '',
    theme_color: '',
    amap_key: '',
    amap_security_code: '',
    oss_region: '',
    oss_bucket: '',
    oss_access_key_id: '',
    oss_access_key_secret: '',
  })
  const [configLoading, setConfigLoading] = useState(false)
  // 分类管理状态
  const [categories, setCategories] = useState([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [deletedCategories, setDeletedCategories] = useState([])
  const [deletedCategoriesLog, setDeletedCategoriesLog] = useState([])
  const [editingCategory, setEditingCategory] = useState(null)
  const [categoryFormData, setCategoryFormData] = useState({ name: '', filter_type: 'manual', filter_tags: '' })
  const [categorySaving, setCategorySaving] = useState(false)
  const [draggedCategoryIndex, setDraggedCategoryIndex] = useState(null)
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

  // 分类管理
  const loadCategories = useCallback(async () => {
    if (!user) return
    setCategoriesLoading(true)
    try {
      const data = await apiRequest('/api/categories')
      setCategories(data || [])
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('加载分类失败', err)
      showMessage('error', err.message || '加载分类失败')
    } finally {
      setCategoriesLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadStats()
      loadConfig()
      loadCategories()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (!user) return
    if (activeTab === 'reviewed') {
      setPhotoStatusFilter('approved')
      loadPhotos()
    } else if (activeTab === 'categories') {
      loadCategories()
      loadDeletedCategories()
      loadDeletedCategoriesLog()
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
        logo_image_url: data.logo_image_url || '',
        avatar_letter: (data.avatar_letter || 'A').trim().slice(0, 1) || 'A',
        avatar_image_url: data.avatar_image_url || '',
        theme_color: data.theme_color || '',
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

  const openCreateCategory = () => {
    setEditingCategory({ isNew: true })
    setCategoryFormData({ name: '', filter_type: 'manual', filter_tags: '' })
  }

  const openEditCategory = (cat) => {
    setEditingCategory(cat)
    setCategoryFormData({
      name: cat.name || '',
      filter_type: cat.filter_type || 'manual',
      filter_tags: cat.filter_tags || '',
    })
  }

  const closeEditCategory = () => {
    setEditingCategory(null)
    setCategoryFormData({ name: '', filter_type: 'manual', filter_tags: '' })
  }

  const handleCategoryFormChange = (e) => {
    const { name, value } = e.target
    setCategoryFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSaveCategory = async (e) => {
    e.preventDefault()
    if (!user || !editingCategory) return
    if (!categoryFormData.name.trim()) {
      showMessage('error', '分类名称不能为空')
      return
    }
    setCategorySaving(true)
    try {
      if (editingCategory.isNew) {
        await apiRequest('/api/categories', {
          method: 'POST',
          body: JSON.stringify({
            name: categoryFormData.name.trim(),
            filter_type: categoryFormData.filter_type,
            filter_tags: categoryFormData.filter_tags.trim() || null,
          }),
        })
        showMessage('success', '分类已创建')
      } else {
        await apiRequest(`/api/categories/${editingCategory.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: categoryFormData.name.trim(),
            filter_type: categoryFormData.filter_type,
            filter_tags: categoryFormData.filter_tags.trim() || null,
          }),
        })
        showMessage('success', '分类已更新')
      }
      closeEditCategory()
      loadCategories()
    } catch (err) {
      showMessage('error', err.message || '保存失败')
    } finally {
      setCategorySaving(false)
    }
  }

  const loadDeletedCategories = useCallback(async () => {
    if (!user) return
    try {
      const data = await apiRequest('/api/categories/deleted')
      setDeletedCategories(data || [])
    } catch (err) {
      setDeletedCategories([])
    }
  }, [user])

  const loadDeletedCategoriesLog = useCallback(async () => {
    if (!user) return
    try {
      const data = await apiRequest('/api/categories/deleted-history')
      setDeletedCategoriesLog(data || [])
    } catch (err) {
      setDeletedCategoriesLog([])
    }
  }, [user])

  const handleRestoreCategory = async (cat) => {
    if (!user || !cat) return
    try {
      await apiRequest(`/api/categories/${cat.id}/restore`, { method: 'POST' })
      showMessage('success', `「${cat.name}」已复原`)
      loadCategories()
      loadDeletedCategories()
    } catch (err) {
      showMessage('error', err.message || '复原失败')
    }
  }

  const handlePermanentDeleteCategory = async (cat) => {
    if (!user || !cat) return
    if (!window.confirm(`确定永久删除「${cat.name}」？此操作不可恢复，分类将从数据库中彻底移除。`)) return
    try {
      await apiRequest(`/api/categories/deleted/${cat.id}`, { method: 'DELETE' })
      showMessage('success', '分类已永久删除')
      loadDeletedCategories()
      loadDeletedCategoriesLog()
    } catch (err) {
      showMessage('error', err.message || '永久删除失败')
    }
  }

  const handleDeleteCategory = async (cat) => {
    if (!user || !cat) return
    if (cat.is_system) {
      showMessage('error', '系统内置分类不可删除')
      return
    }
    if (!window.confirm(`确定删除分类「${cat.name}」？删除后可在下方「已删除的分类」中复原。`)) return
    try {
      const result = await apiRequest(`/api/categories/${cat.id}`, { method: 'DELETE' })
      showMessage('success', result?.message || '分类已删除，可在下方复原')
      loadCategories()
      loadDeletedCategories()
    } catch (err) {
      showMessage('error', err.message || '删除失败')
    }
  }

  // 拖拽排序
  const handleCategoryDragStart = (index) => {
    setDraggedCategoryIndex(index)
  }

  const handleCategoryDragOver = (e, index) => {
    e.preventDefault()
    if (draggedCategoryIndex == null || draggedCategoryIndex === index) return
    setCategories((prev) => arrayMove(prev, draggedCategoryIndex, index))
    setDraggedCategoryIndex(index)
  }

  const handleCategoryDragEnd = async () => {
    if (draggedCategoryIndex == null) return
    setDraggedCategoryIndex(null)
    // 保存新顺序
    const ids = categories.map((c) => c.id)
    try {
      await apiRequest('/api/categories/reorder', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      })
      showMessage('success', '排序已保存')
    } catch (err) {
      showMessage('error', err.message || '保存排序失败')
      loadCategories() // 重新加载恢复
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
        logo_image_url: saved.logo_image_url || '',
        avatar_letter: (saved.avatar_letter || 'A').trim().slice(0, 1) || 'A',
        avatar_image_url: saved.avatar_image_url || '',
        theme_color: saved.theme_color || '',
        amap_key: saved.amap_key || '',
        amap_security_code: saved.amap_security_code || '',
        oss_region: saved.oss_region || '',
        oss_bucket: saved.oss_bucket || '',
        oss_access_key_id: saved.oss_access_key_id || '',
        oss_access_key_secret: saved.oss_access_key_secret || '',
      })
      showMessage('success', '配置已保存')
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('pic4pick-config-updated'))
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
            {configData.logo_image_url ? (
              <div className="admin-logo-avatar admin-logo-avatar--img">
                <img src={configData.logo_image_url} alt="" />
              </div>
            ) : (
              <div className="admin-logo-avatar">{configData.logo_letter}</div>
            )}
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
              <svg width="24" height="24" viewBox="0 0 1024 1024" fill="none">
                <path d="M192 736h640V128H256a64.768 64.768 0 0 0-64 64v544zM256 64h608c9.344 0 17.024 3.008 23.04 8.96 5.952 6.016 8.96 13.696 8.96 23.04V768a31.168 31.168 0 0 1-8.96 23.04 31.168 31.168 0 0 1-23.04 8.96h-704l-32 57.984V192c0.64-36.032 13.184-66.176 37.504-90.496 24.32-24.32 54.528-36.8 90.496-37.504z m-16 736a49.088 49.088 0 0 0-33.536 14.464 45.44 45.44 0 0 0-13.44 33.536c0 13.312 4.48 24.512 13.44 33.536 9.024 8.96 20.224 13.824 33.536 14.464H832v-96H240z m0-64H896V896a64.832 64.832 0 0 1-64 64H240c-32-0.64-58.496-11.52-79.488-32.512-20.992-20.992-31.808-47.488-32.512-79.488 0.64-32 11.52-58.496 32.512-79.488 20.992-20.992 47.488-31.808 79.488-32.512zM384 128v251.008l96-76.992L576 379.008V128H384zM320 64h320v380.992a31.232 31.232 0 0 1-18.496 28.544 30.144 30.144 0 0 1-33.536-3.52L480 384 371.968 470.016a30.144 30.144 0 0 1-33.472 3.456A31.232 31.232 0 0 1 320 445.056V64z" fill="currentColor"/>
              </svg>
            </div>
            <div className="stat-content">
              <div className="stat-number">{statsLoading ? '...' : stats.total}</div>
              <div className="stat-label">作品总数</div>
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
            className={`admin-tab ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            分类
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
                <svg width="20" height="20" viewBox="0 0 1080 1024" fill="none">
                  <path d="M310.840889 577.422222a28.444444 28.444444 0 0 1 28.444444-28.444444h398.222223a28.444444 28.444444 0 1 1 0 56.888889h-398.222223a28.444444 28.444444 0 0 1-28.444444-28.444445zM310.840889 732.444444a28.444444 28.444444 0 0 1 28.444444-28.444444h398.222223a28.444444 28.444444 0 1 1 0 56.888889h-398.222223a28.444444 28.444444 0 0 1-28.444444-28.444445zM369.777778 308.622222v85.333334H455.111111v-85.333334H369.777778z m-28.444445-56.888889h142.222223a28.444444 28.444444 0 0 1 28.444444 28.444445v142.222222a28.444444 28.444444 0 0 1-28.444444 28.444444H341.333333a28.444444 28.444444 0 0 1-28.444444-28.444444v-142.222222a28.444444 28.444444 0 0 1 28.444444-28.444445zM579.356444 280.177778a28.444444 28.444444 0 0 1 28.444445-28.444445h115.484444a28.444444 28.444444 0 0 1 0 56.888889h-115.484444a28.444444 28.444444 0 0 1-28.444445-28.444444zM579.356444 422.4a28.444444 28.444444 0 0 1 28.444445-28.444444h115.484444a28.444444 28.444444 0 0 1 0 56.888888h-115.484444a28.444444 28.444444 0 0 1-28.444445-28.444444z" fill="currentColor"/>
                  <path d="M840.988444 184.888889v654.222222H235.804444V184.888889h605.184z m-605.184-56.888889a56.888889 56.888889 0 0 0-56.888888 56.888889v654.222222a56.888889 56.888889 0 0 0 56.888888 56.888889h605.184a56.888889 56.888889 0 0 0 56.888889-56.888889V184.888889a56.888889 56.888889 0 0 0-56.888889-56.888889H235.804444z" fill="currentColor"/>
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
                  <DatePicker
                    value={formData.date}
                    onChange={(next) => setFormData((prev) => ({ ...prev, date: next }))}
                    placeholder="YYYY-MM-DD"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    分类 <span className="required">*</span>
                  </label>
                  <Select
                    value={formData.category}
                    onChange={(next) => setFormData((prev) => ({ ...prev, category: next }))}
                    options={(categories?.length ? categories : [{ id: 'fallback', name: '精选' }]).map((cat) => ({
                      value: cat.name,
                      label: cat.name,
                    }))}
                    searchable
                  />
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
                <svg width="20" height="20" viewBox="0 0 1024 1024" fill="none">
                  <path d="M70.4 134.4h684.8v300.8h70.4V153.6c0-51.2-38.4-89.6-89.6-89.6h-640C38.4 64 0 102.4 0 153.6v780.8c0 51.2 38.4 89.6 89.6 89.6h249.6v-70.4H70.4V134.4z" fill="currentColor"/>
                  <path d="M979.2 569.6h-89.6l-6.4-25.6c-6.4-25.6-32-44.8-57.6-44.8H614.4c-25.6 0-51.2 19.2-57.6 44.8l-12.8 25.6H454.4c-25.6 0-44.8 19.2-44.8 44.8v364.8c0 25.6 19.2 44.8 44.8 44.8h524.8c25.6 0 44.8-19.2 44.8-44.8V614.4c0-25.6-19.2-44.8-44.8-44.8z m-25.6 384H480v-320h89.6l12.8-38.4c6.4-19.2 25.6-32 44.8-32h179.2c19.2 0 38.4 12.8 44.8 32l12.8 38.4h89.6v320z" fill="currentColor"/>
                  <path d="M716.8 659.2c-70.4 0-128 57.6-128 128s57.6 128 128 128 128-57.6 128-128-57.6-128-128-128z m0 185.6c-32 0-57.6-25.6-57.6-57.6s25.6-57.6 57.6-57.6 57.6 25.6 57.6 57.6-25.6 57.6-57.6 57.6zM128 320h448v64H128zM128 448h320v64H128zM128 576h192v64H128zM128 704h192v64H128z" fill="currentColor"/>
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
                          <img src={photo.thumbnail_url || photo.preview_url || photo.oss_url} alt={photo.title} loading="lazy" />
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
                          <img src={photo.thumbnail_url || photo.preview_url || photo.oss_url} alt={photo.title} loading="lazy" />
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
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="admin-content admin-content--categories">
            <div className="categories-section">
              <div className="section-title">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                分类管理
                <button type="button" className="category-add-btn" onClick={openCreateCategory}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  添加分类
                </button>
              </div>
              <p className="category-hint">拖拽分类可调整显示顺序，系统分类（带锁图标）不可删除</p>

              {categoriesLoading ? (
                <div className="photo-list-loading">
                  <div className="loading-spinner"></div>
                  <span>加载中...</span>
                </div>
              ) : categories.length === 0 ? (
                <div className="photo-list-empty">暂无分类</div>
              ) : (
                <div className="category-list">
                  {categories.map((cat, index) => (
                    <div
                      key={cat.id}
                      className={`category-item ${draggedCategoryIndex === index ? 'dragging' : ''}`}
                      draggable
                      onDragStart={() => handleCategoryDragStart(index)}
                      onDragOver={(e) => handleCategoryDragOver(e, index)}
                      onDragEnd={handleCategoryDragEnd}
                    >
                      <div className="category-drag-handle">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <circle cx="5" cy="4" r="1.5" fill="currentColor"/>
                          <circle cx="11" cy="4" r="1.5" fill="currentColor"/>
                          <circle cx="5" cy="8" r="1.5" fill="currentColor"/>
                          <circle cx="11" cy="8" r="1.5" fill="currentColor"/>
                          <circle cx="5" cy="12" r="1.5" fill="currentColor"/>
                          <circle cx="11" cy="12" r="1.5" fill="currentColor"/>
                        </svg>
                      </div>
                      <div className="category-info">
                        <span className="category-name">
                          {cat.name}
                          {cat.is_system ? (
                            <svg className="category-system-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" title="系统分类">
                              <path d="M7 1v2M7 11v2M4.5 3.5L3 2M10.5 3.5L12 2M2 7H4M10 7h2M3 12l1.5-1.5M11 12l-1.5-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                              <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
                            </svg>
                          ) : null}
                        </span>
                        <span className="category-filter-type">
                          {cat.filter_type === 'manual' ? '手动分配' : cat.filter_type === 'tag' ? '按标签筛选' : '两者结合'}
                          {cat.filter_tags && <span className="category-tags-preview">（{cat.filter_tags}）</span>}
                        </span>
                      </div>
                      <div className="category-actions">
                        <button type="button" className="category-edit-btn" onClick={() => openEditCategory(cat)} title="编辑">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M10 2l2 2-8 8H2v-2l8-8z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        {!cat.is_system && (
                          <button type="button" className="category-delete-btn" onClick={() => handleDeleteCategory(cat)} title="删除">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M3 4h8M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M11 4v7a1 1 0 01-1 1H4a1 1 0 01-1-1V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {deletedCategories.length > 0 && (
                <div className="categories-deleted-section">
                  <div className="section-title section-title--deleted">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M4 5h10M6 5V4a1 1 0 011-1h4a1 1 0 011 1v1M7 5v8a1 1 0 001 1h2a1 1 0 001-1V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    已删除的分类（可复原）
                  </div>
                  <div className="category-list category-list--deleted">
                    {deletedCategories.map((cat) => (
                      <div key={cat.id} className="category-item category-item--deleted">
                        <div className="category-info">
                          <span className="category-name">{cat.name}</span>
                          <span className="category-filter-type">
                            {cat.filter_type === 'manual' ? '手动分配' : cat.filter_type === 'tag' ? '按标签筛选' : '两者结合'}
                          </span>
                        </div>
                        <div className="category-actions">
                          <button type="button" className="category-restore-btn" onClick={() => handleRestoreCategory(cat)} title="复原">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M2 7h10M2 7L5 4M2 7l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            复原
                          </button>
                          <button type="button" className="category-permanent-delete-btn" onClick={() => handlePermanentDeleteCategory(cat)} title="永久删除（不可恢复）">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M3 4h8M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M11 4v7a1 1 0 01-1 1H4a1 1 0 01-1-1V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            永久删除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 已永久删除的分类（历史，只读） */}
              <div className="categories-deleted-section categories-log-section">
                <div className="section-title section-title--deleted">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3 3h12v12H3V3zM5 5v8M9 5v8M13 5v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  已永久删除的分类（历史）
                </div>
                {deletedCategoriesLog.length === 0 ? (
                  <p className="category-hint">暂无记录，永久删除的分类会出现在这里。</p>
                ) : (
                  <div className="category-list category-list--deleted">
                    {deletedCategoriesLog.map((log) => (
                      <div key={log.id} className="category-item category-item--log">
                        <div className="category-info">
                          <span className="category-name">{log.name}</span>
                          <span className="category-filter-type">
                            {log.filter_type === 'manual' ? '手动分配' : log.filter_type === 'tag' ? '按标签筛选' : '两者结合'}
                            {log.permanent_deleted_at && (
                              <span className="category-log-time">
                                · 永久删除于 {new Date(log.permanent_deleted_at).toLocaleString('zh-CN')}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 编辑/新建分类弹窗 */}
            {editingCategory && (
              <div className="photo-edit-modal-overlay" onClick={closeEditCategory} role="presentation">
                <div className="photo-edit-modal category-edit-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="photo-edit-modal-header">
                    <h3>{editingCategory.isNew ? '新建分类' : '编辑分类'}</h3>
                    <button type="button" className="photo-edit-modal-close" onClick={closeEditCategory} aria-label="关闭">×</button>
                  </div>
                  <form className="photo-edit-form" onSubmit={handleSaveCategory}>
                    <div className="photo-edit-fields">
                      <div className="form-group">
                        <label>分类名称 <span className="required">*</span></label>
                        <input
                          type="text"
                          name="name"
                          value={categoryFormData.name}
                          onChange={handleCategoryFormChange}
                          placeholder="例如：风景、人像、美食"
                          required
                          disabled={editingCategory.is_system && !editingCategory.isNew}
                        />
                      </div>
                      <div className="form-group">
                        <label>筛选方式</label>
                        <select name="filter_type" value={categoryFormData.filter_type} onChange={handleCategoryFormChange}>
                          <option value="manual">手动分配（上传时选择分类）</option>
                          <option value="tag">按标签筛选（自动匹配标签）</option>
                          <option value="both">两者结合</option>
                        </select>
                      </div>
                      {(categoryFormData.filter_type === 'tag' || categoryFormData.filter_type === 'both') && (
                        <div className="form-group form-group-full">
                          <label>筛选标签</label>
                          <input
                            type="text"
                            name="filter_tags"
                            value={categoryFormData.filter_tags}
                            onChange={handleCategoryFormChange}
                            placeholder="用逗号分隔，例如：风景,自然,山水"
                          />
                          <span className="form-hint">照片含有这些标签时会自动归入此分类</span>
                        </div>
                      )}
                    </div>
                    <div className="photo-edit-modal-actions">
                      <button type="submit" className="submit-btn" disabled={categorySaving}>
                        {categorySaving ? '保存中...' : '保存'}
                      </button>
                      <button type="button" className="reset-btn" onClick={closeEditCategory}>取消</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
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
                </div>
              </section>

              <section className="config-card">
                <h3 className="config-card-title">品牌与头像（可自定义）</h3>
                <p className="config-card-hint">站点 Logo 用于头部左侧与管理页左上角；用户头像用于头部右侧圆形。可上传图片或填写 URL，上传后自动保存到数据库。</p>
                <div className="config-media-grid">
                  <div className="config-media-item">
                    <div className="config-media-label">站点 LOGO 图片</div>
                    <div className="config-media-row">
                      <div className="config-media-preview" aria-hidden>
                        {configData.logo_image_url ? (
                          <img src={configData.logo_image_url} alt="" />
                        ) : (
                          <div className="config-media-placeholder">无图片</div>
                        )}
                      </div>
                      <div className="config-media-actions">
                        <label className="config-media-upload-btn">
                          上传图片
                          <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            const ext = (file.name.match(/\.([a-zA-Z0-9]+)$/)?.[1] || '').toLowerCase()
                            if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
                              showMessage('error', '仅支持 JPG、PNG、WEBP')
                              return
                            }
                            try {
                              const formData = new FormData()
                              formData.append('file', file)
                              const token = getToken()
                              const apiBase = import.meta.env.VITE_API_BASE_URL || ''
                              const res = await fetch(`${apiBase}/api/photos/upload-oss`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData })
                              const data = await res.json().catch(() => ({}))
                              if (!res.ok) throw new Error(data.message || '上传失败')
                              const logoUrl = data.ossUrl || data.url || ''
                              setConfigData((p) => ({ ...p, logo_image_url: logoUrl }))
                              await apiRequest('/api/config', { method: 'POST', body: JSON.stringify({ logo_image_url: logoUrl }) })
                              if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('pic4pick-config-updated'))
                              showMessage('success', '站点 Logo 已上传并保存到数据库')
                            } catch (err) {
                              showMessage('error', err.message || '上传失败')
                            }
                            e.target.value = ''
                          }} />
                        </label>
                        {configData.logo_image_url ? (
                          <button
                            type="button"
                            className="config-media-clear-btn"
                            onClick={async () => {
                              setConfigData((p) => ({ ...p, logo_image_url: '' }))
                              try {
                                await apiRequest('/api/config', { method: 'POST', body: JSON.stringify({ logo_image_url: '' }) })
                                if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('pic4pick-config-updated'))
                                showMessage('success', '站点 Logo 已清除并保存到数据库')
                              } catch (err) {
                                showMessage('error', err.message || '清除失败')
                              }
                            }}
                          >
                            清除
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="config-media-item">
                    <div className="config-media-label">用户头像图片</div>
                    <div className="config-media-row">
                      <div className="config-media-preview" aria-hidden>
                        {configData.avatar_image_url ? (
                          <img src={configData.avatar_image_url} alt="" />
                        ) : (
                          <div className="config-media-placeholder">无图片</div>
                        )}
                      </div>
                      <div className="config-media-actions">
                        <label className="config-media-upload-btn">
                          上传图片
                          <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            const ext = (file.name.match(/\.([a-zA-Z0-9]+)$/)?.[1] || '').toLowerCase()
                            if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
                              showMessage('error', '仅支持 JPG、PNG、WEBP')
                              return
                            }
                            try {
                              const formData = new FormData()
                              formData.append('file', file)
                              const token = getToken()
                              const apiBase = import.meta.env.VITE_API_BASE_URL || ''
                              const res = await fetch(`${apiBase}/api/photos/upload-oss`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData })
                              const data = await res.json().catch(() => ({}))
                              if (!res.ok) throw new Error(data.message || '上传失败')
                              const avatarUrl = data.ossUrl || data.url || ''
                              setConfigData((p) => ({ ...p, avatar_image_url: avatarUrl }))
                              await apiRequest('/api/config', { method: 'POST', body: JSON.stringify({ avatar_image_url: avatarUrl }) })
                              if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('pic4pick-config-updated'))
                              showMessage('success', '用户头像已上传并保存到数据库')
                            } catch (err) {
                              showMessage('error', err.message || '上传失败')
                            }
                            e.target.value = ''
                          }} />
                        </label>
                        {configData.avatar_image_url ? (
                          <button
                            type="button"
                            className="config-media-clear-btn"
                            onClick={async () => {
                              setConfigData((p) => ({ ...p, avatar_image_url: '' }))
                              try {
                                await apiRequest('/api/config', { method: 'POST', body: JSON.stringify({ avatar_image_url: '' }) })
                                if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('pic4pick-config-updated'))
                                showMessage('success', '用户头像已清除并保存到数据库')
                              } catch (err) {
                                showMessage('error', err.message || '清除失败')
                              }
                            }}
                          >
                            清除
                          </button>
                        ) : null}
                      </div>
                    </div>
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
                    <img src={editingPhoto.thumbnail_url || editingPhoto.preview_url || editingPhoto.oss_url} alt={editingPhoto.title} loading="lazy" />
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
                    <DatePicker
                      value={editFormData.date || ''}
                      onChange={(next) => setEditFormData((prev) => (prev ? { ...prev, date: next } : prev))}
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                  <div className="form-group">
                    <label>分类</label>
                    <Select
                      value={editFormData.category || categories[0]?.name || '精选'}
                      onChange={(next) => setEditFormData((prev) => (prev ? { ...prev, category: next } : prev))}
                      options={(categories?.length ? categories : [{ id: 'fallback', name: '精选' }]).map((cat) => ({
                        value: cat.name,
                        label: cat.name,
                      }))}
                      searchable
                    />
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
