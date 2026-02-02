import { getDbPool } from '../config/db.js'
import { getSettings } from '../services/settingsService.js'

async function tableExists(pool, tableName) {
  try {
    await pool.query(`SELECT 1 FROM \`${tableName}\` LIMIT 1`)
    return true
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') return false
    throw err
  }
}

export async function getStatus(req, res, next) {
  try {
    const pool = getDbPool()

    // 1) DB 连通性
    try {
      await pool.query('SELECT 1')
    } catch (err) {
      return res.json({
        needsSetup: true,
        dbOk: false,
        missingTables: [],
        missingSettings: [],
        adminOk: false,
        hints: [
          { title: '检查数据库连接', detail: '请检查 server/.env 中 DB_* 配置，并确认 MySQL 正常运行。' },
        ],
      })
    }

    // 2) 必要表
    const requiredTables = ['users', 'photos', 'app_settings']
    const missingTables = []
    for (const t of requiredTables) {
      const ok = await tableExists(pool, t)
      if (!ok) missingTables.push(t)
    }

    // 3) 是否存在管理员账号
    let adminOk = false
    if (!missingTables.includes('users')) {
      const [[row]] = await pool.query(`SELECT COUNT(*) AS n FROM users WHERE role = 'admin'`)
      adminOk = Number(row?.n || 0) > 0
    }

    // 4) 关键配置（上传与地图用）
    const requiredSettings = [
      'amap_key',
      'oss_region',
      'oss_bucket',
      'oss_access_key_id',
      'oss_access_key_secret',
    ]
    const settings = await getSettings(requiredSettings)
    const missingSettings = requiredSettings.filter((k) => !String(settings?.[k] || '').trim())

    const needsSetup = missingTables.length > 0 || !adminOk || missingSettings.length > 0

    const hints = []
    if (missingTables.length > 0) {
      hints.push({
        title: '数据库未初始化/未迁移',
        detail: '请在 server 目录执行：npm run migrate',
      })
    }
    if (!adminOk) {
      hints.push({
        title: '未初始化管理员账号',
        detail: '请在 server 目录执行：npm run init-admin',
      })
    }
    if (missingSettings.length > 0) {
      hints.push({
        title: '缺少关键配置',
        detail: '请进入「管理后台 → 配置」填写高德 Key 与 OSS 信息。',
      })
    }

    res.json({
      needsSetup,
      dbOk: true,
      missingTables,
      missingSettings,
      adminOk,
      hints,
    })
  } catch (err) {
    next(err)
  }
}

