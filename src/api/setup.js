import { apiRequest } from '../utils/apiClient'

export function getSetupStatus() {
  return apiRequest('/api/setup/status')
}

