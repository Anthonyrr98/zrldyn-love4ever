import { apiRequest, saveAuth as _saveAuth, loadAuth as _loadAuth, clearAuth as _clearAuth } from '../utils/apiClient'

export function login(username, password) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function register(payload) {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  })
}

export function saveAuth(token, user) {
  return _saveAuth(token, user)
}

export function loadAuth() {
  return _loadAuth()
}

export function clearAuth() {
  return _clearAuth()
}
