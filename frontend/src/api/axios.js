import axios from 'axios'

// Extract base URL from .env (supports VITE_API_URL, VITE_BASE_URL, or VITE_BACKEND_URL)
const envBase =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  ''

const cleanBase = String(envBase).trim().replace(/\/+$/, '')
const isLocalhost = cleanBase.includes('localhost') || cleanBase.includes('127.0.0.1')
// In production on Vercel, if VITE_API_URL was left pointing to localhost or empty, use relative '/api'
const effectiveBase = (import.meta.env.PROD && isLocalhost) ? '' : cleanBase

const baseURL = effectiveBase.startsWith('http')
  ? (effectiveBase.endsWith('/api') ? effectiveBase : `${effectiveBase}/api`)
  : '/api'

const api = axios.create({
  baseURL,
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hitam_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Only redirect if specifically /auth/me fails and user has no active cached session
    const isMeRequest = err.config?.url?.includes('/auth/me')
    const hasLocalUser = Boolean(localStorage.getItem('hitam_user') || localStorage.getItem('hitam_token'))
    if (err.response?.status === 401 && isMeRequest && !hasLocalUser && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('hitam_token')
      localStorage.removeItem('hitam_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
