const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export function getToken() {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem('pic4pick_token') || ''
}

export async function apiRequest(path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  let data
  const text = await res.text()
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!res.ok) {
    const message = data && data.message ? data.message : `请求失败 (${res.status})`
    const error = new Error(message)
    error.status = res.status
    error.data = data
    throw error
  }

  return data
}

export function saveAuth(token, user) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem('pic4pick_token', token)
  window.localStorage.setItem('pic4pick_user', JSON.stringify(user))
}

export function loadAuth() {
  if (typeof window === 'undefined') return { token: '', user: null }
  const token = getToken()
  const raw = window.localStorage.getItem('pic4pick_user')
  let user = null
  if (raw) {
    try {
      user = JSON.parse(raw)
    } catch {
      user = null
    }
  }
  return { token, user }
}

export function clearAuth() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem('pic4pick_token')
  window.localStorage.removeItem('pic4pick_user')
}

