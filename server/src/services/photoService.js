import { getDbPool } from '../config/db.js'
import { deletePhotoFromOss } from './ossService.js'

const PHOTOS_SELECT_FULL = `id, title, location_province, location_city, location_country, shot_date,
  category, tags, rating, lat, lng, oss_key, oss_url,
  thumbnail_url, preview_url,
  status, reject_reason, hidden,
  focal_length, aperture, shutter_speed, iso, camera, lens,
  created_at, updated_at`
const PHOTOS_SELECT_MINIMAL = `id, title, location_province, location_city, location_country, shot_date,
  category, tags, rating, lat, lng, oss_key, oss_url,
  thumbnail_url, preview_url,
  status, reject_reason,
  created_at, updated_at`

export async function listPhotos({ status, category, keyword, page = 1, pageSize = 20, showHidden = false, userLat, userLng }) {
  const pool = getDbPool()
  const where = []
  const params = []

  if (status) {
    where.push('status = ?')
    params.push(status)
  }
  // 「最新」「随览」「附近」「远方」不按分类过滤；精选按 category 过滤
  if (category && category !== '最新' && category !== '随览' && category !== '附近' && category !== '远方') {
    where.push('category = ?')
    params.push(category)
  }
  if (keyword) {
    where.push('(title LIKE ? OR location_city LIKE ? OR location_country LIKE ?)')
    const like = `%${keyword}%`
    params.push(like, like, like)
  }
  if (!showHidden) {
    where.push('(hidden IS NULL OR hidden = 0)')
  }
  // 附近/远方：只查有经纬度的照片
  const needLocation = category === '附近' || category === '远方'
  if (needLocation) {
    where.push('lat IS NOT NULL AND lng IS NOT NULL')
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const offset = (Number(page) - 1) * Number(pageSize)

  let orderBy
  let orderParams = []
  if (category === '随览') {
    orderBy = 'ORDER BY RAND()'
  } else if ((category === '附近' || category === '远方') && userLat != null && userLng != null) {
    const uLat = Number(userLat)
    const uLng = Number(userLng)
    if (!Number.isNaN(uLat) && !Number.isNaN(uLng)) {
      // 近似距离平方，用于排序（近到远 或 远到近）
      orderBy = category === '附近'
        ? 'ORDER BY (POW(lat - ?, 2) + POW(lng - ?, 2)) ASC'
        : 'ORDER BY (POW(lat - ?, 2) + POW(lng - ?, 2)) DESC'
      orderParams = [uLat, uLng]
    }
  }
  if (!orderBy) {
    orderBy = 'ORDER BY COALESCE(shot_date, created_at) DESC'
  }

  let rows
  let countWhereSql = whereSql
  let countParams = params
  try {
    const [r] = await pool.query(
      `SELECT ${PHOTOS_SELECT_FULL}
       FROM photos
       ${whereSql}
       ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, ...orderParams, Number(pageSize), offset],
    )
    rows = r
  } catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      const whereMinimal = []
      const paramsMinimal = []
      if (status) {
        whereMinimal.push('status = ?')
        paramsMinimal.push(status)
      }
      if (category && category !== '最新' && category !== '随览' && category !== '附近' && category !== '远方') {
        whereMinimal.push('category = ?')
        paramsMinimal.push(category)
      }
      if (keyword) {
        whereMinimal.push('(title LIKE ? OR location_city LIKE ? OR location_country LIKE ?)')
        const like = `%${keyword}%`
        paramsMinimal.push(like, like, like)
      }
      if (needLocation) {
        whereMinimal.push('lat IS NOT NULL AND lng IS NOT NULL')
      }
      countWhereSql = whereMinimal.length ? `WHERE ${whereMinimal.join(' AND ')}` : ''
      countParams = paramsMinimal
      const fallbackOrder = orderBy || 'ORDER BY COALESCE(shot_date, created_at) DESC'
      const [r] = await pool.query(
        `SELECT ${PHOTOS_SELECT_MINIMAL}
         FROM photos
         ${countWhereSql}
         ${fallbackOrder}
         LIMIT ? OFFSET ?`,
        [...countParams, ...orderParams, Number(pageSize), offset],
      )
      rows = (r || []).map((row) => ({
        ...row,
        hidden: 0,
        focal_length: null,
        aperture: null,
        shutter_speed: null,
        iso: null,
        camera: null,
        lens: null,
      }))
    } else {
      throw err
    }
  }

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM photos ${countWhereSql}`,
    countParams,
  )

  return { items: rows, total, page: Number(page), pageSize: Number(pageSize) }
}

/** 直辖市：仅填城市时也作为省级展示，不把“中国”当第一级 */
const MUNICIPALITIES = ['北京', '上海', '天津', '重庆']

/** 地名规范化：去掉末尾的 市、省，便于合并「北京」与「北京市」等 */
function normalizePlaceName(name) {
  if (!name || typeof name !== 'string') return ''
  const t = name.trim()
  if (t.endsWith('市')) return t.slice(0, -1).trim() || t
  if (t.endsWith('省')) return t.slice(0, -1).trim() || t
  return t
}

/** 已审核照片按 省-市 聚合，第一级为省份（含直辖市），第二级为地市；同名归一（北京/北京市 合并） */
export async function getLocationHierarchy() {
  const pool = getDbPool()
  let rows
  try {
    const [r] = await pool.query(
      `SELECT
         NULLIF(TRIM(p.location_province), '') AS location_province,
         NULLIF(TRIM(p.location_city), '') AS location_city,
         p.lat,
         p.lng,
         p.thumbnail_url,
         p.preview_url,
         p.updated_at
       FROM photos p
       WHERE p.status = 'approved'
         AND (p.hidden IS NULL OR p.hidden = 0)
         AND (
           (p.location_province IS NOT NULL AND p.location_province != '')
           OR (p.location_city IS NOT NULL AND p.location_city != '')
         )
       ORDER BY p.updated_at DESC`,
    )
    rows = r
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') throw err
    try {
      const [r] = await pool.query(
        `SELECT
           NULLIF(TRIM(p.location_province), '') AS location_province,
           NULLIF(TRIM(p.location_city), '') AS location_city,
           p.lat,
           p.lng,
           p.thumbnail_url,
           p.preview_url,
           p.updated_at
         FROM photos p
         WHERE p.status = 'approved'
           AND (
             (p.location_province IS NOT NULL AND p.location_province != '')
             OR (p.location_city IS NOT NULL AND p.location_city != '')
           )
         ORDER BY p.updated_at DESC`,
      )
      rows = r
    } catch (err2) {
      if (err2.code === 'ER_BAD_FIELD_ERROR' && /lat|lng/.test(err2.message || '')) {
        const [r] = await pool.query(
          `SELECT
             NULLIF(TRIM(p.location_province), '') AS location_province,
             NULLIF(TRIM(p.location_city), '') AS location_city,
             p.thumbnail_url,
             p.preview_url,
             p.updated_at
           FROM photos p
           WHERE p.status = 'approved'
             AND (
               (p.location_province IS NOT NULL AND p.location_province != '')
               OR (p.location_city IS NOT NULL AND p.location_city != '')
             )
           ORDER BY p.updated_at DESC`,
        )
        rows = r.map((row) => ({ ...row, lat: null, lng: null }))
      } else {
        throw err2
      }
    }
  }

  const byProvince = new Map()
  for (const row of rows) {
    const rawProvince = (row.location_province || '').trim()
    const rawCity = (row.location_city || '').trim()
    const thumbnail = row.thumbnail_url || row.preview_url || null
    const lat = row.lat != null ? Number(row.lat) : null
    const lng = row.lng != null ? Number(row.lng) : null

    const normProvince = normalizePlaceName(rawProvince)
    const normCity = normalizePlaceName(rawCity)

    // 第一级：省份（用规范化名合并，如 北京 + 北京市 -> 北京）
    let province = normProvince
    if (!province && rawCity && (MUNICIPALITIES.includes(normCity) || MUNICIPALITIES.some((m) => normalizePlaceName(rawCity) === m))) {
      province = normCity || rawCity
    }
    if (!province) {
      province = '其他'
    }

    if (!byProvince.has(province)) {
      byProvince.set(province, { name: province, count: 0, thumbnail: null, lat: null, lng: null, children: [] })
    }
    const prov = byProvince.get(province)
    prov.count += 1
    if (!prov.thumbnail && thumbnail) prov.thumbnail = thumbnail
    if (lat != null && lng != null && prov.lat == null) {
      prov.lat = lat
      prov.lng = lng
    }

    // 第二级：地市（用规范化名合并）；直辖市下同名的市不再重复展示
    if (normCity && normCity !== province) {
      const existing = prov.children.find((c) => normalizePlaceName(c.name) === normCity || c.name === normCity)
      if (existing) {
        existing.count += 1
        if (!existing.thumbnail && thumbnail) existing.thumbnail = thumbnail
        if (lat != null && lng != null && existing.lat == null) { existing.lat = lat; existing.lng = lng }
      } else {
        prov.children.push({ name: normCity, count: 1, thumbnail, lat, lng })
      }
    }
  }

  return Array.from(byProvince.values()).map((p) => ({
    name: p.name,
    count: p.count,
    thumbnail: p.thumbnail,
    lat: p.lat,
    lng: p.lng,
    children: (p.children || []).sort((a, b) => b.count - a.count),
  })).sort((a, b) => b.count - a.count)
}

export async function getPhotoStats() {
  const pool = getDbPool()
  const [rows] = await pool.query(
    `SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
     FROM photos`,
  )
  return rows[0] || { total: 0, pending: 0, approved: 0, rejected: 0 }
}

export async function createPhoto(payload) {
  const pool = getDbPool()
  const {
    title,
    location_province,
    location_city,
    location_country,
    shot_date,
    category,
    tags,
    rating,
    lat,
    lng,
    oss_key,
    oss_url,
    thumbnail_url,
    preview_url,
    status = 'pending',
    reject_reason = null,
    focal_length,
    aperture,
    shutter_speed,
    iso,
    camera,
    lens,
  } = payload

  const [result] = await pool.query(
    `INSERT INTO photos
      (title, location_province, location_city, location_country, shot_date,
       category, tags, rating, lat, lng,
       oss_key, oss_url, thumbnail_url, preview_url, status, reject_reason,
       focal_length, aperture, shutter_speed, iso, camera, lens)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title,
      location_province || null,
      location_city || null,
      location_country || null,
      shot_date || null,
      category || '最新',
      tags || null,
      rating || null,
      lat || null,
      lng || null,
      oss_key,
      oss_url || null,
      thumbnail_url || null,
      preview_url || null,
      status,
      reject_reason,
      focal_length || null,
      aperture || null,
      shutter_speed || null,
      iso || null,
      camera || null,
      lens || null,
    ],
  )

  const [rows] = await pool.query(
    'SELECT * FROM photos WHERE id = ? LIMIT 1',
    [result.insertId],
  )

  return rows[0]
}

export async function getPhotoById(id, options = {}) {
  const pool = getDbPool()
  let row
  try {
    const [rows] = await pool.query(
      `SELECT ${PHOTOS_SELECT_FULL}
       FROM photos
       WHERE id = ?
       LIMIT 1`,
      [id],
    )
    row = rows[0] || null
  } catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      const [rows] = await pool.query(
        `SELECT ${PHOTOS_SELECT_MINIMAL}
         FROM photos
         WHERE id = ?
         LIMIT 1`,
        [id],
      )
      const r = rows[0] || null
      row = r ? { ...r, hidden: 0, focal_length: null, aperture: null, shutter_speed: null, iso: null, camera: null, lens: null } : null
    } else {
      throw err
    }
  }
  if (!row) return null
  if (options.publicOnly && (row.status !== 'approved' || (row.hidden != null && row.hidden !== 0))) return null
  return row
}

export async function updatePhotoStatus(id, status, rejectReason = null) {
  const pool = getDbPool()
  const [result] = await pool.query(
    'UPDATE photos SET status = ?, reject_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, rejectReason, id],
  )
  if (result.affectedRows === 0) {
    const err = new Error('照片不存在')
    err.status = 404
    throw err
  }
  const [rows] = await pool.query('SELECT * FROM photos WHERE id = ? LIMIT 1', [id])
  return rows[0]
}

/** 更新照片的可编辑信息（标题、地点、日期、分类、标签、评级、经纬度、隐藏等） */
export async function updatePhoto(id, payload) {
  const pool = getDbPool()
  const existing = await getPhotoById(id, { publicOnly: false })
  if (!existing) {
    const err = new Error('照片不存在')
    err.status = 404
    throw err
  }

  const title = (payload.title != null && String(payload.title).trim() !== '')
    ? String(payload.title).trim()
    : existing.title
  const location_province = payload.location_province != null && payload.location_province !== ''
    ? String(payload.location_province).trim()
    : null
  const location_city = payload.location_city != null && payload.location_city !== ''
    ? String(payload.location_city).trim()
    : existing.location_city
  const location_country = payload.location_country != null && payload.location_country !== ''
    ? String(payload.location_country).trim()
    : existing.location_country
  const shot_date = payload.shot_date || existing.shot_date || null
  const category = (payload.category != null && payload.category !== '') ? payload.category : existing.category
  const tags = payload.tags != null && payload.tags !== '' ? String(payload.tags).trim() : null
  const rating = payload.rating != null && payload.rating !== '' ? Number(payload.rating) : null
  const lat = payload.lat != null && payload.lat !== '' ? Number(payload.lat) : null
  const lng = payload.lng != null && payload.lng !== '' ? Number(payload.lng) : null
  const hidden = payload.hidden != null ? (payload.hidden ? 1 : 0) : (existing.hidden ?? 0)
  const focal_length = payload.focal_length != null && payload.focal_length !== '' ? String(payload.focal_length).trim() : null
  const aperture = payload.aperture != null && payload.aperture !== '' ? String(payload.aperture).trim() : null
  const shutter_speed = payload.shutter_speed != null && payload.shutter_speed !== '' ? String(payload.shutter_speed).trim() : null
  const iso = payload.iso != null && payload.iso !== '' ? String(payload.iso).trim() : null
  const camera = payload.camera != null && payload.camera !== '' ? String(payload.camera).trim() : null
  const lens = payload.lens != null && payload.lens !== '' ? String(payload.lens).trim() : null

  const [result] = await pool.query(
    `UPDATE photos SET
       title = ?,
       location_province = ?,
       location_city = ?,
       location_country = ?,
       shot_date = ?,
       category = ?,
       tags = ?,
       rating = ?,
       lat = ?,
       lng = ?,
       hidden = ?,
       focal_length = ?, aperture = ?, shutter_speed = ?, iso = ?, camera = ?, lens = ?,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [title, location_province, location_city, location_country, shot_date, category, tags, rating, lat, lng, hidden, focal_length, aperture, shutter_speed, iso, camera, lens, id],
  )

  if (result.affectedRows === 0) {
    const err = new Error('照片不存在')
    err.status = 404
    throw err
  }

  const [rows] = await pool.query(
    `SELECT id, title, location_province, location_city, location_country, shot_date,
            category, tags, rating, lat, lng, oss_key, oss_url,
            thumbnail_url, preview_url, status, reject_reason, hidden,
            focal_length, aperture, shutter_speed, iso, camera, lens,
            created_at, updated_at
     FROM photos WHERE id = ? LIMIT 1`,
    [id],
  )
  return rows[0]
}

/** 删除照片（同时删除 OSS 上的原图、缩略图、预览图） */
export async function deletePhoto(id) {
  const pool = getDbPool()
  const [rows] = await pool.query(
    'SELECT id, oss_key FROM photos WHERE id = ? LIMIT 1',
    [id],
  )
  const photo = rows[0]
  if (!photo) {
    const err = new Error('照片不存在')
    err.status = 404
    throw err
  }

  if (photo.oss_key) {
    try {
      await deletePhotoFromOss(photo.oss_key)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('删除 OSS 文件失败，仍将删除数据库记录:', err.message)
      // 继续删除数据库记录，避免照片记录残留
    }
  }

  const [result] = await pool.query('DELETE FROM photos WHERE id = ?', [id])
  if (result.affectedRows === 0) {
    const err = new Error('照片不存在')
    err.status = 404
    throw err
  }
  return { deleted: true, id: Number(id) }
}


