import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hitam_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Only redirect to /login if 401 happens on protected pages, NOT on login page/request
    const isAuthRequest = err.config?.url?.includes('/auth/login') || err.config?.url?.includes('/auth/register')
    if (err.response?.status === 401 && !isAuthRequest && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('hitam_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
