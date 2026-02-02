import { apiRequest } from '../utils/apiClient'

export function listCategories() {
  return apiRequest('/api/categories')
}
