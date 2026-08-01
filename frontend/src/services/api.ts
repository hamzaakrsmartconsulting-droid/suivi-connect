import axios, { type InternalAxiosRequestConfig } from 'axios'

// In development, vite proxy forwards /api → localhost:3000
// In production (Cloudflare Pages), VITE_API_URL points to the Render backend
const baseURL = import.meta.env.VITE_API_URL ?? '/api'

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
})

// Attach auth token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-refresh token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken })
          localStorage.setItem('accessToken', data.accessToken)
          original.headers.Authorization = `Bearer ${data.accessToken}`
          return api(original)
        } catch {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('currentUser')
          window.location.href = '/connexion'
        }
      } else {
        window.location.href = '/connexion'
      }
    }
    return Promise.reject(error)
  }
)

export default api
