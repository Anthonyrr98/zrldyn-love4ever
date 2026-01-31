import { getDbPool } from '../config/db.js'

/**
 * 配置项白名单：仅允许以下 key 写入 app_settings 表。
 * 与后台「配置」表单一一对应，所有表单字段均在此列出并持久化到数据库。
 */
const KNOWN_KEYS = [
  'site_name',           // 站点名称
  'site_subtitle',       // 副标题
  'logo_letter',         // 站点 Logo 字母（无图时显示）
  'logo_image_url',      // 站点 Logo 图片 URL
  'avatar_letter',       // 头像字母（无图时备用）
  'avatar_image_url',   // 用户头像图片 URL
  'theme_color',         // 主题色（hex）
  'amap_key',            // 高德 API Key
  'amap_security_code',  // 高德安全密钥
  'oss_region',           // 阿里云 OSS Region
  'oss_bucket',          // OSS Bucket
  'oss_access_key_id',   // OSS AccessKeyId
  'oss_access_key_secret', // OSS AccessKeySecret
]

export async function getAllSettings() {
  return getSettings(KNOWN_KEYS)
}

export async function getSettings(keys) {
  const pool = getDbPool()
  const uniqueKeys = Array.from(new Set(keys.filter(Boolean)))
  if (!uniqueKeys.length) return {}

  try {
    const [rows] = await pool.query(
      'SELECT config_key, config_value FROM app_settings WHERE config_key IN (?)',
      [uniqueKeys],
    )
    const map = {}
    for (const row of rows) {
      map[row.config_key] = row.config_value || ''
    }
    for (const key of uniqueKeys) {
      if (!(key in map)) map[key] = ''
    }
    return map
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return Object.fromEntries(uniqueKeys.map((k) => [k, '']))
    }
    throw err
  }
}

export async function saveSettings(partialSettings) {
  const pool = getDbPool()
  const entries = Object.entries(partialSettings).filter(
    ([key]) => KNOWN_KEYS.includes(key),
  )
  if (!entries.length) return

  const values = entries.map(([key, value]) => [key, String(value ?? '')])

  try {
    await pool.query(
      `INSERT INTO app_settings (config_key, config_value)
       VALUES ?
       ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_at = CURRENT_TIMESTAMP`,
      [values],
    )
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      const createTable = `
        CREATE TABLE IF NOT EXISTS app_settings (
          config_key VARCHAR(64) NOT NULL,
          config_value TEXT NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (config_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `
      await pool.query(createTable)
      await pool.query(
        `INSERT INTO app_settings (config_key, config_value)
         VALUES ?
         ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_at = CURRENT_TIMESTAMP`,
        [values],
      )
      return
    }
    throw err
  }
}

