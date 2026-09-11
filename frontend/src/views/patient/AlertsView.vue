<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Component } from 'vue'
import { HeartCrack, Octagon, TriangleAlert, Info, CheckCheck, CheckCircle, CalendarDays, Bell } from '@lucide/vue'
import api from '@/services/api'
import { useNotificationStore } from '@/stores/notifications'

interface Alert { id: string; type: string; severite: string; message: string; lu: boolean; createdAt: string }
interface Notif { id: string; titre: string; message: string; type: string; lu: boolean; createdAt: string }

// Combined item for display
interface Item {
  id: string; kind: 'alert' | 'notif'
  type: string; severite?: string; titre?: string; message: string; lu: boolean; createdAt: string
}

const alerts  = ref<Alert[]>([])
const loading = ref(true)
const notifStore = useNotificationStore()

// Merge clinical alerts + appointment/system notifications into one list
const items = computed<Item[]>(() => {
  const alertItems: Item[] = alerts.value.map(a => ({
    id: a.id, kind: 'alert', type: a.type, severite: a.severite,
    message: a.message, lu: a.lu, createdAt: a.createdAt,
  }))

  const notifItems: Item[] = notifStore.items
    .filter(n => ['appointment', 'patient', 'reminder'].includes(n.type))
    .map(n => ({
      id: n.id, kind: 'notif', type: n.type, titre: n.titre,
      message: n.message, lu: n.lu, createdAt: n.createdAt,
    }))

  return [...alertItems, ...notifItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
})

const unread = computed(() => items.value.filter(i => !i.lu).length)

const severityMeta: Record<string, { bg: string; color: string; label: string; icon: Component }> = {
  HIGH:     { bg: '#FEE2E2', color: '#EF4444', label: 'Élevé',    icon: HeartCrack },
  CRITICAL: { bg: '#F3E8FF', color: '#7C3AED', label: 'Critique', icon: Octagon },
  MEDIUM:   { bg: '#FEF3C7', color: '#D97706', label: 'Moyen',    icon: TriangleAlert },
  LOW:      { bg: '#D1FAE5', color: '#10B981', label: 'Faible',   icon: Info },
}

const notifMeta: Record<string, { bg: string; color: string; icon: Component; label: string }> = {
  appointment: { bg: '#DBEAFE', color: '#1677C8', icon: CalendarDays, label: 'Rendez-vous' },
  reminder:    { bg: '#FEF3C7', color: '#D97706', icon: Bell,          label: 'Rappel' },
  patient:     { bg: '#DCFCE7', color: '#16A34A', icon: Bell,          label: 'Info' },
}

const typeLabel: Record<string, string> = {
  BLOOD_PRESSURE: 'Tension artérielle', LDL: 'LDL cholestérol',
  WEIGHT: 'Poids', MEDICATION: 'Médicaments', ACTIVITY: 'Activité physique', GENERAL: 'Général',
}

function getMeta(item: Item) {
  if (item.kind === 'notif') return notifMeta[item.type] ?? notifMeta.patient
  return severityMeta[item.severite ?? 'LOW'] ?? severityMeta.LOW
}

function getLabel(item: Item) {
  if (item.kind === 'notif') return (notifMeta[item.type] ?? notifMeta.patient).label
  return typeLabel[item.type] || 'Général'
}

async function markRead(item: Item) {
  if (item.lu) return
  if (item.kind === 'alert') {
    try { await api.patch(`/patient/alerts/${item.id}/read`) } catch { /* ignore */ }
    const a = alerts.value.find(x => x.id === item.id)
    if (a) a.lu = true
  } else {
    await notifStore.markAsRead(item.id)
  }
}

async function markAll() {
  alerts.value.forEach(a => { a.lu = true })
  await notifStore.markAllAsRead()
}

onMounted(async () => {
  try {
    const { data } = await api.get('/patient/alerts')
    alerts.value = data
    if (!notifStore.items.length) await notifStore.fetchNotifications()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="alerts-page">

    <!-- Header -->
    <div class="page-header">
      <div>
        <p class="section-label">Espace patient</p>
        <h1 class="page-header__title">Mes alertes</h1>
        <p class="page-header__sub">Notifications médicales et indicateurs à surveiller</p>
      </div>
      <button v-if="unread > 0" class="mark-all-btn" @click="markAll">
        <CheckCheck :size="14" :stroke-width="2" />
        Tout marquer comme lu
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="center-loader">
      <v-progress-circular indeterminate color="primary" size="40" width="3" />
    </div>

    <!-- Empty -->
    <div v-else-if="!items.length" class="empty-state">
      <div class="empty-state__icon">
        <CheckCircle :size="36" :stroke-width="1.5" color="#34D399" />
      </div>
      <p class="empty-state__title">Aucune alerte</p>
      <p class="empty-state__sub">Tout va bien ! Aucun indicateur médical nécessite votre attention.</p>
    </div>

    <!-- Combined list -->
    <div v-else class="alerts-list">
      <div
        v-for="item in items"
        :key="`${item.kind}-${item.id}`"
        class="alert-card"
        :class="{
          'alert-card--unread': !item.lu,
          'alert-card--appointment': item.kind === 'notif' && item.type === 'appointment'
        }"
        @click="markRead(item)"
      >
        <div class="alert-card__icon" :style="{ background: getMeta(item).bg }">
          <component :is="getMeta(item).icon" :size="20" :stroke-width="1.75" :color="getMeta(item).color" />
        </div>

        <div class="alert-card__body">
          <div class="alert-card__row">
            <span class="alert-card__type">
              {{ item.kind === 'notif' ? item.titre : getLabel(item) }}
            </span>
            <span class="sev-badge" :style="{ background: getMeta(item).bg, color: getMeta(item).color }">
              {{ getMeta(item).label }}
            </span>
            <span v-if="!item.lu" class="unread-dot" />
          </div>
          <p class="alert-card__msg">{{ item.message }}</p>
          <p class="alert-card__date">
            {{ new Date(item.createdAt).toLocaleDateString('fr-FR', { weekday:'long', day:'2-digit', month:'long', hour:'2-digit', minute:'2-digit' }) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.alerts-page { width: 100%; }
.center-loader { display: flex; align-items: center; justify-content: center; padding: 64px; }

.page-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
  margin-bottom: 28px; padding-bottom: 24px; border-bottom: 1px solid #E2E8F0;
}
.page-header__title { font-size: 24px; font-weight: 800; color: #0F172A; letter-spacing: -0.03em; margin-bottom: 6px; }
.page-header__sub   { font-size: 14px; color: #64748B; font-weight: 500; }

.mark-all-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 18px; background: #FFFFFF; border: 1.5px solid #E2E8F0;
  border-radius: 10px; font-size: 13px; font-weight: 600; color: #64748B;
  cursor: pointer; transition: all 0.13s;
}
.mark-all-btn:hover { border-color: #2563EB; color: #2563EB; background: #EFF6FF; }

.empty-state {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 80px 32px; text-align: center;
}
.empty-state__icon {
  width: 80px; height: 80px; border-radius: 24px; background: #ECFDF5;
  display: flex; align-items: center; justify-content: center; margin-bottom: 8px;
}
.empty-state__title { font-size: 18px; font-weight: 800; color: #0F172A; }
.empty-state__sub   { font-size: 14px; color: #94A3B8; max-width: 300px; }

.alerts-list { display: flex; flex-direction: column; gap: 12px; }

.alert-card {
  display: flex; align-items: center; gap: 20px;
  background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 16px;
  padding: 20px 24px; cursor: pointer;
  box-shadow: 0 1px 3px rgba(15,23,42,0.05);
  transition: box-shadow 0.2s, border-color 0.15s;
}
.alert-card:hover { box-shadow: 0 4px 16px rgba(15,23,42,0.10); border-color: #CBD5E1; }
.alert-card--unread { border-left: 4px solid #1677C8; background: #FAFCFF; }
.alert-card--appointment.alert-card--unread { border-left-color: #1677C8; }

.alert-card__icon {
  width: 50px; height: 50px; border-radius: 14px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}

.alert-card__body { flex: 1; }
.alert-card__row  { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; flex-wrap: wrap; }
.alert-card__type { font-size: 13px; font-weight: 700; color: #0F172A; }
.alert-card__msg  { font-size: 14px; color: #334155; font-weight: 500; margin: 0 0 8px; line-height: 1.5; }
.alert-card__date { font-size: 12px; color: #94A3B8; text-transform: capitalize; }

.sev-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
.unread-dot { width: 8px; height: 8px; border-radius: 50%; background: #2563EB; flex-shrink: 0; }
</style>
