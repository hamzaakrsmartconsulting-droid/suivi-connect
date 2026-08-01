import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import { connectSocket, disconnectSocket } from '@/services/socket'

export interface UserProfile {
  id: string
  nomComplet: string
  [key: string]: unknown
}

export interface User {
  id: string
  email: string
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN'
  profile: UserProfile | null
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'))
  const loading = ref(false)

  const isAuthenticated = computed(() => !!accessToken.value)
  const isPatient = computed(() => user.value?.role === 'PATIENT')
  const isDoctor = computed(() => user.value?.role === 'DOCTOR')
  const isAdmin  = computed(() => user.value?.role === 'ADMIN')
  const displayName = computed(() => user.value?.profile?.nomComplet || user.value?.email || '')

  function setTokens(access: string, refresh: string) {
    accessToken.value = access
    localStorage.setItem('accessToken', access)
    localStorage.setItem('refreshToken', refresh)
    try { connectSocket(access) } catch { /* ignore */ }
  }

  function persistUser(u: User) {
    user.value = u
    localStorage.setItem('currentUser', JSON.stringify(u))
  }

  async function login(email: string, password: string) {
    loading.value = true
    try {
      const { data } = await api.post('/auth/login', { email, password })
      persistUser(data.user)
      setTokens(data.accessToken, data.refreshToken)
      return data
    } finally {
      loading.value = false
    }
  }

  async function register(payload: Record<string, unknown>) {
    loading.value = true
    try {
      const { data } = await api.post('/auth/register', payload)
      persistUser(data.user)
      setTokens(data.accessToken, data.refreshToken)
      return data
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    const refreshToken = localStorage.getItem('refreshToken')
    if (refreshToken) {
      try { await api.post('/auth/logout', { refreshToken }) } catch { /* ignore */ }
    }
    user.value = null
    accessToken.value = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('currentUser')
    disconnectSocket()
  }

  function initFromStorage() {
    const stored = localStorage.getItem('currentUser')
    if (stored) {
      try {
        user.value = JSON.parse(stored) as User
      } catch {
        localStorage.removeItem('currentUser')
      }
    }

    // Stale token with no user data → clear and force re-login
    if (accessToken.value && !user.value) {
      accessToken.value = null
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      return
    }

    if (accessToken.value) {
      try { connectSocket(accessToken.value) } catch { /* ignore */ }
    }
  }

  return {
    user,
    accessToken,
    loading,
    isAuthenticated,
    isPatient,
    isDoctor,
    isAdmin,
    displayName,
    login,
    register,
    logout,
    initFromStorage,
    persistUser,
  }
})
