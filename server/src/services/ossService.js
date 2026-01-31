import OSS from 'ali-oss'
import crypto from 'crypto'
import sharp from 'sharp'
import { config } from '../config/env.js'
import { getSettings } from './settingsService.js'

let ossClient = null

async function getOssClient() {
  if (ossClient) return ossClient

  // 优先从数据库读取
  const dbSettings = await getSettings([
    'oss_region',
    'oss_bucket',
    'oss_access_key_id',
    'oss_access_key_secret',
  ])

  const region = dbSettings.oss_region || config.oss.region
  const bucket = dbSettings.oss_bucket || config.oss.bucket
  const accessKeyId = dbSettings.oss_access_key_id || config.oss.accessKeyId
  const accessKeySecret = dbSettings.oss_access_key_secret || config.oss.accessKeySecret

  if (!region || !accessKeyId || !accessKeySecret || !bucket) {
    throw Object.assign(
      new Error('OSS 未配置完整，请在后台配置页或环境变量中填写 OSS 参数'),
      { status: 500 },
    )
  }

  ossClient = new OSS({
    region,
    accessKeyId,
    accessKeySecret,
    bucket,
  })
  return ossClient
}

/** 测试 OSS 连接与权限（用于脚本或健康检查） */
export async function testOssConnection() {
  const client = await getOssClient()
  const dbSettings = await getSettings(['oss_bucket'])
  const bucket = dbSettings.oss_bucket || config.oss.bucket
  if (!bucket) {
    throw new Error('OSS bucket 未配置')
  }
  const info = await client.getBucketInfo(bucket)
  return {
    ok: true,
    bucket: info.bucket?.name || bucket,
    region: info.bucket?.region,
  }
}

export async function uploadBufferToOss(buffer, options = {}) {
  const client = await getOssClient()
  const ext = options.ext || ''
  const now = new Date()
  const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(
    now.getDate(),
  ).padStart(2, '0')}`
  const random = crypto.randomBytes(8).toString('hex')
  const baseKey = `pic4pick-zrldyn/${datePath}/${random}`

  try {
    // 获取原图尺寸
    const image = sharp(buffer)
    const metadata = await image.metadata()
    const width = metadata.width || 2000
    const height = metadata.height || 2000

    // 生成缩略图（0.1倍）
    const thumbWidth = Math.round(width * 0.1)
    const thumbHeight = Math.round(height * 0.1)
    const thumbBuffer = await image
      .clone()
      .resize(thumbWidth, thumbHeight, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer()
    const thumbKey = `pic4pick-zrldyn/thumbnails/${datePath}/${random}${ext}`
    const thumbResult = await client.put(thumbKey, thumbBuffer)

    // 生成预览图（0.25倍）
    const previewWidth = Math.round(width * 0.25)
    const previewHeight = Math.round(height * 0.25)
    const previewBuffer = await image
      .clone()
      .resize(previewWidth, previewHeight, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()
    const previewKey = `pic4pick-zrldyn/previews/${datePath}/${random}${ext}`
    const previewResult = await client.put(previewKey, previewBuffer)

    // 上传原图
    const originalKey = `pic4pick-zrldyn/original/${datePath}/${random}${ext}`
    const originalResult = await client.put(originalKey, buffer)

    return {
      key: originalKey,
      url: originalResult.url,
      thumbnailKey: thumbKey,
      thumbnailUrl: thumbResult.url,
      previewKey: previewKey,
      previewUrl: previewResult.url,
    }
  } catch (err) {
    // 如果图片处理失败，只上传原图
    // eslint-disable-next-line no-console
    console.error('图片压缩失败，仅上传原图:', err.message)
    const originalKey = `pic4pick-zrldyn/original/${datePath}/${random}${ext}`
    const originalResult = await client.put(originalKey, buffer)
    return {
      key: originalKey,
      url: originalResult.url,
      thumbnailKey: null,
      thumbnailUrl: null,
      previewKey: null,
      previewUrl: null,
    }
  }
}

/**
 * 根据照片的 oss_key（原图 key 或完整 URL）推导并删除 OSS 上的原图、缩略图、预览图
 * 与 uploadBufferToOss 的命名规则一致：original / thumbnails / previews
 */
export async function deletePhotoFromOss(ossKey) {
  if (!ossKey || typeof ossKey !== 'string') return
  let key = ossKey.trim()
  if (!key) return  // 若存的是完整 URL，解析出 object key（路径部分）
  if (key.startsWith('http://') || key.startsWith('https://')) {
    try {
      const u = new URL(key)
      key = u.pathname.startsWith('/') ? u.pathname.slice(1) : u.pathname
    } catch {
      return
    }
  }  const originalPrefix = 'pic4pick-zrldyn/original/'
  if (!key.startsWith(originalPrefix)) {
    await deleteOssKeys([key])
    return
  }

  const suffix = key.slice(originalPrefix.length)
  const thumbKey = `pic4pick-zrldyn/thumbnails/${suffix}`
  const previewKey = `pic4pick-zrldyn/previews/${suffix}`
  await deleteOssKeys([key, thumbKey, previewKey])
}

/** 批量删除 OSS 对象；quiet 模式下不存在的 key 不会报错 */
async function deleteOssKeys(keys) {
  const valid = keys.filter((k) => k && k.trim())
  if (valid.length === 0) return
  const client = await getOssClient()
  await client.deleteMulti(valid, { quiet: true })
}