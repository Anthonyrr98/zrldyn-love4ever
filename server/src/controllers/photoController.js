import multer from 'multer'
import {
  listPhotos,
  createPhoto,
  updatePhoto,
  updatePhotoStatus,
  getPhotoStats,
  getPhotoById,
  deletePhoto,
  incrementPhotoLike,
  decrementPhotoLike,
  getLocationHierarchy,
} from '../services/photoService.js'
import { uploadBufferToOss } from '../services/ossService.js'

export async function getLocations(req, res, next) {
  try {
    const hierarchy = await getLocationHierarchy()
    res.json(hierarchy)
  } catch (err) {
    next(err)
  }
}

export async function getList(req, res, next) {
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
    opts.status = req.user ? status : 'approved'
    const result = await listPhotos(opts)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function getStats(req, res, next) {
  try {
    const stats = await getPhotoStats()
    res.json(stats)
  } catch (err) {
    next(err)
  }
}

export async function like(req, res, next) {
  try {
    const likes = await incrementPhotoLike(req.params.id)
    res.json({ likes })
  } catch (err) {
    next(err)
  }
}

export async function unlike(req, res, next) {
  try {
    const likes = await decrementPhotoLike(req.params.id)
    res.json({ likes })
  } catch (err) {
    next(err)
  }
}

export async function getById(req, res, next) {
  try {
    const photo = await getPhotoById(req.params.id, { publicOnly: !req.user })
    if (!photo) return res.status(404).json({ message: '照片不存在' })
    res.json(photo)
  } catch (err) {
    next(err)
  }
}

export async function create(req, res, next) {
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
}

const upload = multer({ storage: multer.memoryStorage() })

export const uploadMiddleware = upload.single('file')

export async function uploadOss(req, res, next) {
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
}

export async function update(req, res, next) {
  try {
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
    const updated = await updatePhoto(req.params.id, payload)
    res.json(updated)
  } catch (err) {
    next(err)
  }
}

export async function approve(req, res, next) {
  try {
    const updated = await updatePhotoStatus(req.params.id, 'approved', null)
    res.json(updated)
  } catch (err) {
    next(err)
  }
}

export async function reject(req, res, next) {
  try {
    const { reason } = req.body || {}
    const updated = await updatePhotoStatus(req.params.id, 'rejected', reason || null)
    res.json(updated)
  } catch (err) {
    next(err)
  }
}

export async function remove(req, res, next) {
  try {
    const result = await deletePhoto(req.params.id)
    res.json(result)
  } catch (err) {
    next(err)
  }
}
