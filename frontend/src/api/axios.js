import axios from 'axios'

const api = axios.create({
  // VITE_API_URL overrides the dev proxy target (e.g. http://localhost:5000/api)
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
    if (err.response?.status === 401) {
      localStorage.removeItem('hitam_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
