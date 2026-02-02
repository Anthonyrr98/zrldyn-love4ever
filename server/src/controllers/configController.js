import { getAllSettings, getSettings, saveSettings } from '../services/settingsService.js'

export async function getAll(req, res, next) {
  try {
    const settings = await getAllSettings()
    res.json(settings)
  } catch (err) {
    next(err)
  }
}

export async function save(req, res, next) {
  try {
    const data = req.body || {}
    await saveSettings(data)
    const fresh = await getAllSettings()
    res.json(fresh)
  } catch (err) {
    next(err)
  }
}

export async function getPublic(req, res, next) {
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
}
