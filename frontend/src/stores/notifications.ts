import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'
import { getSocket, ensureConnected } from '@/services/socket'
import { useAuthStore } from './auth'

export interface Notification {
  id: string
  titre: string
  message: string
  type: string
  lu: boolean
  createdAt: string
}

export const useNotificationStore = defineStore('notifications', () => {
  const items = ref<Notification[]>([])
  const unreadCount = ref(0)

  async function fetchNotifications() {
    const auth = useAuthStore()
    const endpoint = auth.isDoctor ? '/doctor/notifications' : '/patient/notifications'
    const { data } = await api.get(endpoint)
    items.value = data
    unreadCount.value = data.filter((n: Notification) => !n.lu).length
  }

  async function markAsRead(id: string) {
    const auth = useAuthStore()
    const endpoint = auth.isDoctor ? '/doctor/notifications' : '/patient/notifications'
    await api.patch(`${endpoint}/${id}/read`)
    const item = items.value.find((n) => n.id === id)
    if (item && !item.lu) {
      item.lu = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
  }

  async function markAllAsRead() {
    const auth = useAuthStore()
    const endpoint = auth.isDoctor ? '/doctor/notifications/read-all' : '/patient/notifications/read-all'
    try { await api.patch(endpoint) } catch { /* ignore if fails, still update locally */ }
    items.value.forEach(n => { n.lu = true })
    unreadCount.value = 0
  }

  function initSocketListeners() {
    const auth = useAuthStore()
    const token = localStorage.getItem('accessToken')
    if (!token) return

    // Use ensureConnected so we always have a live socket, even if it's still
    // in the middle of its handshake. Listeners survive reconnects because
    // socket.io re-attaches them automatically.
    const socket = ensureConnected(token)

    // Remove any stale listener before re-registering (idempotent call)
    socket.off('notification')
    socket.off('new_alert')

    socket.on('notification', (notification: Notification) => {
      items.value.unshift(notification)
      if (!notification.lu) unreadCount.value++
    })

    // Doctor-specific: follow-up submission ping
    if (auth.isDoctor) {
      socket.off('new_followup')
      socket.on('new_followup', () => {
        fetchNotifications().catch(() => {})
      })

      socket.off('new_alert')
      socket.on('new_alert', () => {
        fetchNotifications().catch(() => {})
      })
    }

    // Patient-specific: ordonnance received
    if (!auth.isDoctor && !auth.isAdmin) {
      socket.off('new_ordonnance')
      socket.on('new_ordonnance', (payload: { downloadUrl: string; doctorName: string }) => {
        fetchNotifications().catch(() => {})
        // browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Ordonnance de Dr. ${payload.doctorName}`, {
            body: 'Votre médecin vous a envoyé une ordonnance. Cliquez pour télécharger.',
          })
        }
      })
    }
  }

  return { items, unreadCount, fetchNotifications, markAsRead, markAllAsRead, initSocketListeners }
})
