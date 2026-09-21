import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const IDLE_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

export function useIdleLogout() {
  const auth = useAuthStore()
  const router = useRouter()
  let timer: ReturnType<typeof setTimeout> | null = null

  function resetTimer() {
    if (!auth.isAuthenticated) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(async () => {
      await auth.logout()
      router.push({ name: 'login', query: { reason: 'idle' } })
    }, IDLE_TIMEOUT_MS)
  }

  const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']

  onMounted(() => {
    if (!auth.isAuthenticated) return
    EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()
  })

  onUnmounted(() => {
    if (timer) clearTimeout(timer)
    EVENTS.forEach(e => window.removeEventListener(e, resetTimer))
  })
}
