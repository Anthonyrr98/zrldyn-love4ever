const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export function getPublicConfig() {
  return fetch(`${API_BASE}/api/config/public`)
    .then((res) => (res.ok ? res.json() : null))
}
