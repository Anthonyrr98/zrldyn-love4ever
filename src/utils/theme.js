// 应用主题色到全局 CSS 变量
export function applyThemeColor(color) {
  if (!color) return
  
  // 验证颜色格式
  const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  if (!hexPattern.test(color)) {
    // eslint-disable-next-line no-console
    console.warn('Invalid color format:', color)
    return
  }

  // 将颜色转换为 RGB
  const hex = color.replace('#', '')
  const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.substring(0, 2), 16)
  const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.substring(2, 4), 16)
  const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.substring(4, 6), 16)

  // 应用到 CSS 变量
  const root = document.documentElement
  root.style.setProperty('--theme-color', color)
  root.style.setProperty('--theme-color-rgb', `${r}, ${g}, ${b}`)
  
  // 计算半透明版本
  root.style.setProperty('--theme-color-92', `rgba(${r}, ${g}, ${b}, 0.92)`)
  root.style.setProperty('--theme-color-75', `rgba(${r}, ${g}, ${b}, 0.75)`)
  root.style.setProperty('--theme-color-50', `rgba(${r}, ${g}, ${b}, 0.50)`)
  root.style.setProperty('--theme-color-25', `rgba(${r}, ${g}, ${b}, 0.25)`)
}

// 从后端加载主题色
export async function loadThemeColor() {
  try {
    const res = await fetch('/api/config/public')
    if (!res.ok) return
    const data = await res.json()
    if (data.theme_color) {
      applyThemeColor(data.theme_color)
    }
  } catch (err) {
    // 忽略错误，使用默认主题
  }
}
