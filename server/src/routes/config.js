import express from 'express'
import { authRequired, requireAdmin } from '../middleware/auth.js'
import { getAllSettings, getSettings, saveSettings } from '../services/settingsService.js'

const router = express.Router()

// GET /api/config
router.get('/', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const settings = await getAllSettings()
    res.json(settings)
  } catch (err) {
    next(err)
  }
})

// POST /api/config
router.post('/', authRequired, requireAdmin, async (req, res, next) => {
  try {
    const data = req.body || {}
    await saveSettings(data)
    const fresh = await getAllSettings()
    res.json(fresh)
  } catch (err) {
    next(err)
  }
})

// 公共只读配置（前台使用，不含敏感信息）
// GET /api/config/public
router.get('/public', async (req, res, next) => {
  try {
    const data = await getSettings([
      'site_name',
      'site_subtitle',
      'logo_letter',
      'logo_image_url',
      'avatar_letter',
      'avatar_image_url',
      'amap_key',
      'amap_security_code',
      'theme_color',
    ])
    res.json({
      site_name: data.site_name || 'Pic4Pick',
      site_subtitle: data.site_subtitle || 'Anthony',
      logo_letter: (data.logo_letter || 'P').trim().slice(0, 1) || 'P',
      logo_image_url: data.logo_image_url || '',
      avatar_letter: (data.avatar_letter || 'A').trim().slice(0, 1) || 'A',
      avatar_image_url: data.avatar_image_url || '',
      amap_key: data.amap_key || '',
      amap_security_code: data.amap_security_code || '',
      theme_color: data.theme_color || '',
    })
  } catch (err) {
    res.status(200).json({
      site_name: 'Pic4Pick',
      site_subtitle: 'Anthony',
      logo_letter: 'P',
      logo_image_url: '',
      avatar_letter: 'A',
      avatar_image_url: '',
      amap_key: '',
      amap_security_code: '',
      theme_color: '',
    })
  }
})

export default router

