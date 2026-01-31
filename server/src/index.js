import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { config } from './config/env.js'
import { testConnection } from './config/db.js'
import errorHandler from './middleware/errorHandler.js'
import authRoutes from './routes/auth.js'
import photosRoutes from './routes/photos.js'
import configRoutes from './routes/config.js'
import categoriesRoutes from './routes/categories.js'
import { getLocationHierarchy } from './services/photoService.js'

const app = express()

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
)

app.use(express.json())
app.use(morgan('dev'))

app.get('/api/health', async (req, res) => {
  try {
    await testConnection()
    res.json({ status: 'ok', db: 'ok' })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('DB health check failed', error)
    const msg = error.code === 'ER_NO_SUCH_TABLE'
      ? '数据库表缺失，请在 server 目录执行：npm run migrate'
      : error.code === 'ER_BAD_FIELD_ERROR'
        ? '数据库结构需要更新，请执行：npm run migrate'
        : error.message || 'DB connection failed'
    res.status(500).json({ status: 'error', message: msg })
  }
})

// 诊断接口：尝试查 photos 表，用于排查 500
app.get('/api/health/db', async (req, res) => {
  try {
    const { getDbPool } = await import('./config/db.js')
    const pool = getDbPool()
    await pool.query('SELECT 1')
    await pool.query('SELECT COUNT(*) AS n FROM photos')
    res.json({ status: 'ok', message: '数据库与 photos 表正常' })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[health/db]', error.code, error.sqlMessage || error.message)
    const msg = error.code === 'ER_NO_SUCH_TABLE'
      ? 'photos 表不存在，请执行：npm run migrate'
      : error.code === 'ER_BAD_FIELD_ERROR'
        ? 'photos 表结构过旧，请执行：npm run migrate'
        : (error.sqlMessage || error.message || String(error))
    res.status(500).json({ status: 'error', message: msg })
  }
})

// Auth
app.use('/api/auth', authRoutes)

// Categories
app.use('/api/categories', categoriesRoutes)

// Photos：先注册 /locations，避免被 /:id 误匹配为 id=locations
app.get('/api/photos/locations', async (req, res, next) => {
  try {
    const hierarchy = await getLocationHierarchy()
    res.json(hierarchy)
  } catch (err) {
    next(err)
  }
})
app.use('/api/photos', photosRoutes)

// App config
app.use('/api/config', configRoutes)

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ message: 'Not found' })
})

// 错误处理中间件
app.use(errorHandler)

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Pic4Pick API listening on port ${config.port}`)
})

