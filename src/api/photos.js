import { apiRequest } from '../utils/apiClient'

export function getLocations() {
  return apiRequest('/api/photos/locations')
}

export function listPhotos(params = {}) {
  const sp = new URLSearchParams()
  if (params.status != null) sp.set('status', params.status)
  if (params.category) sp.set('category', params.category)
  if (params.keyword) sp.set('keyword', params.keyword)
  if (params.page != null) sp.set('page', String(params.page))
  if (params.pageSize != null) sp.set('pageSize', String(params.pageSize))
  if (params.lat != null) sp.set('lat', String(params.lat))
  if (params.lng != null) sp.set('lng', String(params.lng))
  const qs = sp.toString()
  return apiRequest(`/api/photos${qs ? `?${qs}` : ''}`)
}

export function getPhoto(id) {
  return apiRequest(`/api/photos/${id}`)
}

export function likePhoto(id) {
  return apiRequest(`/api/photos/${id}/like`, { method: 'POST', body: '{}' })
}

export function unlikePhoto(id) {
  return apiRequest(`/api/photos/${id}/unlike`, { method: 'POST', body: '{}' })
}
