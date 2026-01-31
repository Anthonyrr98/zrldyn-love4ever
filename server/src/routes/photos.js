import express from 'express'
import multer from 'multer'
import { authRequired, requireAdmin, optionalAuth } from '../middleware/auth.js'
import {
  listPhotos,
  createPhoto,
  updatePhoto,
  updatePhotoStatus,
  getPhotoStats,
  getPhotoById,
  deletePhoto,
} from '../services/photoService.js'
import { uploadBufferToOss } from '../services/ossService.js'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

// GET /api/photos（未登录仅可查已审核且未隐藏；请求 status=approved 时一律不返回隐藏，管理员列表才含隐藏）
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { status, category, keyword, page = 1, pageSize = 20, lat, lng } = req.query
    const isPublicList = status === 'approved'
    const opts = {
      category,
      keyword,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
      showHidden: !!req.user && !isPublicList,
      userLat: lat != null ? Number(lat) : undefined,
      userLng: lng != null ? Number(lng) : undefined,
    }
    if (req.user) {
      opts.status = status
    } else {
      opts.status = 'approved'
    }
    const result = await listPhotos(opts)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// GET /api/photos/stats（需登录）
router.get('/stats', authRequired, async (req, res, next) => {
  try {
    const stats = await getPhotoStats()
    res.json(stats)
  } catch (err) {
    next(err)
  }
})

// GET /api/photos/locations 已移至 index.js，避免被 /:id 误匹配

// GET /api/photos/:id（未登录仅可读已审核）
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const id = req.params.id
    const photo = await getPhotoById(id, { publicOnly: !req.user })
    if (!photo) {
      return res.status(404).json({ message: '照片不存在' })
    }
    res.json(photo)
  } catch (err) {
    next(err)
  }
})

// POST /api/photos
router.post('/', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const data = req.body || {}

    if (!data.title || !data.oss_key) {
      return res.status(400).json({ message: '标题和 OSS Key 必填' })
    }

    const created = await createPhoto(data)
    res.status(201).json(created)
  } catch (err) {
    next(err)
  }
})

// POST /api/photos/upload-oss
// 表单字段：file
router.post('/upload-oss', authRequired, requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请上传文件' })
    }
    const originalName = req.file.originalname || ''
    const extMatch = originalName.match(/\.[a-zA-Z0-9]+$/)
    const ext = extMatch ? extMatch[0].toLowerCase() : ''
    const allowed = ['.jpg', '.jpeg', '.png', '.webp']
    if (ext && !allowed.includes(ext)) {
      return res.status(400).json({ message: '仅支持 JPG、PNG、WEBP 图片' })
    }

    const result = await uploadBufferToOss(req.file.buffer, { ext })

    res.json({
      ossKey: result.key,
      ossUrl: result.url,
      thumbnailUrl: result.thumbnailUrl,
      previewUrl: result.previewUrl,
    })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/photos/:id（更新照片信息，需登录管理员）
router.patch('/:id', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const data = req.body || {}
    const payload = {
      title: data.title,
      location_province: data.location_province,
      location_city: data.location_city,
      location_country: data.location_country,
      shot_date: data.shot_date,
      category: data.category,
      tags: data.tags,
      rating: data.rating,
      lat: data.lat,
      lng: data.lng,
      hidden: data.hidden,
      focal_length: data.focal_length,
      aperture: data.aperture,
      shutter_speed: data.shutter_speed,
      iso: data.iso,
      camera: data.camera,
      lens: data.lens,
    }
    const updated = await updatePhoto(id, payload)
    res.json(updated)
  } catch (err) {
    next(err)
  }
})

// POST /api/photos/:id/approve
router.post('/:id/approve', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const updated = await updatePhotoStatus(id, 'approved', null)
    res.json(updated)
  } catch (err) {
    next(err)
  }
})

// POST /api/photos/:id/reject
router.post('/:id/reject', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const { reason } = req.body || {}
    const updated = await updatePhotoStatus(id, 'rejected', reason || null)
    res.json(updated)
  } catch (err) {
    next(err)
  }
})

// DELETE /api/photos/:id（需登录管理员）
router.delete('/:id', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const result = await deletePhoto(id)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router

