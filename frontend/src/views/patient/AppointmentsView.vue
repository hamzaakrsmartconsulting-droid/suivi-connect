<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ensureConnected } from '@/services/socket'
import api from '@/services/api'

interface Appointment {
  id: string
  dateTime: string
  type: string
  motif?: string
  notes?: string
  videoLink?: string
  status: string
  doctor: { nomComplet: string; specialite: string }
}

// ── Data ─────────────────────────────────────────────────────────────────────
const loading      = ref(true)
const appointments = ref<Appointment[]>([])
const newApptToast = ref<Appointment | null>(null)

// ── Calendar state ────────────────────────────────────────────────────────────
const today       = new Date()
const calYear     = ref(today.getFullYear())
const calMonth    = ref(today.getMonth()) // 0-indexed
const selectedDay = ref<string | null>(today.toISOString().split('T')[0]) // YYYY-MM-DD

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS   = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

// First weekday of month (0=Mon … 6=Sun)
const firstWeekday = computed(() => {
  const d = new Date(calYear.value, calMonth.value, 1).getDay()
  return d === 0 ? 6 : d - 1 // convert Sun=0 to Mon=0
})

const daysInMonth = computed(() =>
  new Date(calYear.value, calMonth.value + 1, 0).getDate()
)

// Build grid: nulls for leading blanks, then day numbers
const calGrid = computed(() => {
  const cells: (number | null)[] = Array(firstWeekday.value).fill(null)
  for (let d = 1; d <= daysInMonth.value; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
})

function prevMonth() {
  if (calMonth.value === 0) { calMonth.value = 11; calYear.value-- }
  else calMonth.value--
}
function nextMonth() {
  if (calMonth.value === 11) { calMonth.value = 0; calYear.value++ }
  else calMonth.value++
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
function isoToday() { return today.toISOString().split('T')[0] }

function appointmentsOnDay(day: number) {
  const d = isoDate(calYear.value, calMonth.value, day)
  return appointments.value.filter(a => a.dateTime.startsWith(d) && a.status !== 'cancelled')
}

function selectDay(day: number | null) {
  if (!day) return
  selectedDay.value = isoDate(calYear.value, calMonth.value, day)
}

// Appointments shown in the list panel
const listAppts = computed(() => {
  if (selectedDay.value) {
    return appointments.value
      .filter(a => a.dateTime.startsWith(selectedDay.value!))
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
  }
  return []
})

// Upcoming (next 30 days), for the sidebar widget
const upcoming = computed(() =>
  appointments.value
    .filter(a => {
      const d = new Date(a.dateTime)
      return d >= today && a.status !== 'cancelled'
    })
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
    .slice(0, 5)
)

const typeMeta: Record<string, { color: string; bg: string; label: string }> = {
  consultation: { color: '#2563EB', bg: '#EFF6FF', label: 'Consultation' },
  bilan:        { color: '#7C3AED', bg: '#F5F3FF', label: 'Bilan' },
  suivi:        { color: '#10B981', bg: '#ECFDF5', label: 'Suivi' },
  urgence:      { color: '#EF4444', bg: '#FEF2F2', label: 'Urgence' },
}
const statusMeta: Record<string, { color: string; bg: string; label: string }> = {
  proposed:  { color: '#D97706', bg: '#FFFBEB', label: '⏳ En attente' },
  confirmed: { color: '#10B981', bg: '#ECFDF5', label: '✓ Confirmé' },
  cancelled: { color: '#94A3B8', bg: '#F1F5F9', label: '✕ Annulé' },
}

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
function fmtFullDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}
function fmtShort(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

// ── Actions ───────────────────────────────────────────────────────────────────
async function confirm(id: string) {
  await api.patch(`/patient/appointments/${id}/confirm`)
  const a = appointments.value.find(x => x.id === id)
  if (a) a.status = 'confirmed'
}
async function cancel(id: string) {
  await api.patch(`/patient/appointments/${id}/cancel`)
  const a = appointments.value.find(x => x.id === id)
  if (a) a.status = 'cancelled'
}

// ── Socket: doctor adds appointment → show immediately + toast ────────────────
function onNewAppointment(payload: any) {
  const appt: Appointment = payload.appointment ?? payload
  if (!appointments.value.find(a => a.id === appt.id)) {
    appointments.value.push(appt)
  }
  // Jump calendar to that month
  const d = new Date(appt.dateTime)
  calYear.value  = d.getFullYear()
  calMonth.value = d.getMonth()
  selectedDay.value = appt.dateTime.split('T')[0]

  // Toast notification
  newApptToast.value = appt
  setTimeout(() => { newApptToast.value = null }, 6000)
}

onMounted(async () => {
  try {
    const { data } = await api.get('/patient/appointments')
    appointments.value = data
  } finally { loading.value = false }

  const token = localStorage.getItem('accessToken')
  if (token) {
    const socket = ensureConnected(token)
    socket.off('new_appointment')
    socket.on('new_appointment', onNewAppointment)
  }
})
</script>

<template>
  <div class="agenda-page">

    <!-- ── New appointment toast ─────────────────────────────────────────────── -->
    <Transition name="toast">
      <div v-if="newApptToast" class="new-appt-toast">
        <div class="toast-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <div>
          <p class="toast-title">Nouveau rendez-vous !</p>
          <p class="toast-sub">Dr. {{ newApptToast.doctor.nomComplet }} — {{ fmtShort(newApptToast.dateTime) }} à {{ fmtTime(newApptToast.dateTime) }}</p>
        </div>
        <button class="toast-close" @click="newApptToast = null">✕</button>
      </div>
    </Transition>

    <!-- ── Page header ───────────────────────────────────────────────────────── -->
    <div class="page-head">
      <div class="page-head__icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      </div>
      <div>
        <p class="section-lbl">Agenda</p>
        <h1 class="page-title">Mes rendez-vous</h1>
      </div>
    </div>

    <div v-if="loading" class="skeleton-wrap">
      <div class="skeleton cal-skeleton" />
      <div class="skeleton list-skeleton" />
    </div>

    <div v-else class="agenda-layout">

      <!-- ══ LEFT: Calendar ══════════════════════════════════════════════════ -->
      <aside class="cal-col">

        <!-- Month nav -->
        <div class="cal-header">
          <button class="cal-nav" @click="prevMonth">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span class="cal-header__label">{{ MONTHS[calMonth] }} {{ calYear }}</span>
          <button class="cal-nav" @click="nextMonth">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        <!-- Weekday headers -->
        <div class="cal-grid cal-grid--head">
          <div v-for="wd in WEEKDAYS" :key="wd" class="cal-wd">{{ wd }}</div>
        </div>

        <!-- Days grid -->
        <div class="cal-grid">
          <div
            v-for="(cell, i) in calGrid" :key="i"
            class="cal-cell"
            :class="{
              'cal-cell--empty':    cell === null,
              'cal-cell--today':    cell !== null && isoDate(calYear, calMonth, cell) === isoToday(),
              'cal-cell--selected': cell !== null && isoDate(calYear, calMonth, cell) === selectedDay,
              'cal-cell--has-appt': cell !== null && appointmentsOnDay(cell).length > 0,
            }"
            @click="selectDay(cell)"
          >
            <span class="cal-cell__num">{{ cell ?? '' }}</span>
            <!-- appointment dots -->
            <div v-if="cell && appointmentsOnDay(cell).length" class="cal-dots">
              <span
                v-for="(a, di) in appointmentsOnDay(cell).slice(0, 3)" :key="di"
                class="cal-dot"
                :style="{ background: (typeMeta[a.type] ?? typeMeta.consultation).color }"
              />
            </div>
          </div>
        </div>

        <!-- Legend -->
        <div class="cal-legend">
          <div v-for="(m, type) in typeMeta" :key="type" class="legend-item">
            <span class="legend-dot" :style="{ background: m.color }" />
            {{ m.label }}
          </div>
        </div>

        <!-- Upcoming mini list -->
        <div class="upcoming-panel">
          <p class="upcoming-panel__title">Prochains rendez-vous</p>
          <div v-if="!upcoming.length" class="upcoming-empty">Aucun rendez-vous à venir</div>
          <div v-else class="upcoming-list">
            <div
              v-for="a in upcoming" :key="a.id"
              class="upcoming-item"
              :class="{ 'upcoming-item--active': a.dateTime.startsWith(selectedDay ?? '') }"
              @click="selectedDay = a.dateTime.split('T')[0]; calYear = new Date(a.dateTime).getFullYear(); calMonth = new Date(a.dateTime).getMonth()"
            >
              <div class="upcoming-item__date">
                <p class="upcoming-item__day">{{ new Date(a.dateTime).getDate() }}</p>
                <p class="upcoming-item__mon">{{ new Date(a.dateTime).toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase() }}</p>
              </div>
              <div class="upcoming-item__info">
                <p class="upcoming-item__type" :style="{ color: (typeMeta[a.type] ?? typeMeta.consultation).color }">
                  {{ (typeMeta[a.type] ?? typeMeta.consultation).label }}
                </p>
                <p class="upcoming-item__time">{{ fmtTime(a.dateTime) }} · Dr. {{ a.doctor.nomComplet }}</p>
              </div>
              <span class="upcoming-item__status" :style="{ color: (statusMeta[a.status] ?? statusMeta.proposed).color }">
                {{ a.status === 'confirmed' ? '✓' : '⏳' }}
              </span>
            </div>
          </div>
        </div>

      </aside>

      <!-- ══ RIGHT: Day detail ════════════════════════════════════════════════ -->
      <main class="detail-col">

        <!-- Day heading -->
        <div class="detail-head" v-if="selectedDay">
          <div>
            <p class="detail-head__label">
              {{ selectedDay === isoToday() ? "Aujourd'hui" : "Rendez-vous du" }}
            </p>
            <h2 class="detail-head__date">
              {{ new Date(selectedDay + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) }}
            </h2>
          </div>
          <div class="detail-head__count" v-if="listAppts.length">
            {{ listAppts.length }} rendez-vous
          </div>
        </div>

        <!-- No appts on selected day -->
        <div v-if="!listAppts.length" class="day-empty">
          <div class="day-empty__icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <p class="day-empty__title">Aucun rendez-vous ce jour</p>
          <p class="day-empty__sub">Votre médecin vous proposera une date de consultation</p>
        </div>

        <!-- Appointment cards for the day -->
        <div v-else class="appt-cards">
          <div
            v-for="a in listAppts" :key="a.id"
            class="appt-card"
            :class="{
              'appt-card--proposed':  a.status === 'proposed',
              'appt-card--confirmed': a.status === 'confirmed',
              'appt-card--cancelled': a.status === 'cancelled',
            }"
          >
            <!-- Time bar -->
            <div class="appt-time-bar" :style="{ background: (typeMeta[a.type] ?? typeMeta.consultation).color }">
              <p class="appt-time-bar__time">{{ fmtTime(a.dateTime) }}</p>
            </div>

            <div class="appt-content">
              <div class="appt-content__top">
                <span class="type-badge"
                  :style="{ background: (typeMeta[a.type] ?? typeMeta.consultation).bg, color: (typeMeta[a.type] ?? typeMeta.consultation).color }">
                  {{ (typeMeta[a.type] ?? typeMeta.consultation).label }}
                </span>
                <span class="status-badge"
                  :style="{ background: (statusMeta[a.status] ?? statusMeta.proposed).bg, color: (statusMeta[a.status] ?? statusMeta.proposed).color }">
                  {{ (statusMeta[a.status] ?? statusMeta.proposed).label }}
                </span>
              </div>

              <div class="appt-doctor">
                <div class="appt-doctor__avatar">{{ a.doctor.nomComplet.charAt(0) }}</div>
                <div>
                  <p class="appt-doctor__name">Dr. {{ a.doctor.nomComplet }}</p>
                  <p class="appt-doctor__spec">{{ a.doctor.specialite }}</p>
                </div>
              </div>

              <p v-if="a.motif" class="appt-motif">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                {{ a.motif }}
              </p>

              <a v-if="a.videoLink && a.status === 'confirmed'" :href="a.videoLink" target="_blank" class="video-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                Rejoindre la téléconsultation
              </a>

              <div class="appt-actions" v-if="a.status !== 'cancelled'">
                <template v-if="a.status === 'proposed'">
                  <button class="appt-btn appt-btn--confirm" @click="confirm(a.id)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Confirmer
                  </button>
                  <button class="appt-btn appt-btn--decline" @click="cancel(a.id)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    Refuser
                  </button>
                </template>
                <button v-else-if="a.status === 'confirmed'" class="appt-btn appt-btn--cancel" @click="cancel(a.id)">
                  Annuler le rendez-vous
                </button>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>

  </div>
</template>

<style scoped>
/* ── Page ────────────────────────────────────────────────────────────────── */
.agenda-page { width: 100%; display: flex; flex-direction: column; gap: 24px; }

/* Header */
.page-head { display: flex; align-items: center; gap: 16px; }
.page-head__icon {
  width: 48px; height: 48px; border-radius: 14px;
  background: linear-gradient(135deg, #2563EB, #7C3AED);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.section-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #2563EB; margin: 0 0 2px; }
.page-title  { font-size: 24px; font-weight: 900; color: #0F172A; margin: 0; letter-spacing: -.03em; }

/* ── Toast ───────────────────────────────────────────────────────────────── */
.new-appt-toast {
  position: fixed; top: 24px; right: 24px; z-index: 9000;
  display: flex; align-items: center; gap: 14px;
  background: #1E293B; border: 1px solid #334155; border-radius: 16px;
  padding: 16px 20px; box-shadow: 0 16px 48px rgba(0,0,0,0.35);
  max-width: 360px;
}
.toast-icon { width: 36px; height: 36px; border-radius: 10px; background: #2563EB; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.toast-title { font-size: 13px; font-weight: 800; color: #F8FAFC; margin: 0 0 2px; }
.toast-sub   { font-size: 12px; color: #94A3B8; margin: 0; }
.toast-close { margin-left: auto; background: none; border: none; color: #64748B; cursor: pointer; font-size: 14px; padding: 4px; }
.toast-close:hover { color: #F8FAFC; }
.toast-enter-active, .toast-leave-active { transition: all 0.35s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-16px) scale(0.96); }

/* ── Skeleton ────────────────────────────────────────────────────────────── */
.skeleton-wrap { display: flex; gap: 24px; }
.skeleton { border-radius: 20px; background: linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.cal-skeleton  { width: 340px; height: 520px; flex-shrink: 0; }
.list-skeleton { flex: 1; height: 520px; }
@keyframes shimmer { to { background-position: -200% 0; } }

/* ── Layout ──────────────────────────────────────────────────────────────── */
.agenda-layout { display: flex; gap: 24px; align-items: flex-start; }

/* ══ CAL COL ══════════════════════════════════════════════════════════════ */
.cal-col {
  width: 320px; flex-shrink: 0;
  background: white; border: 1px solid #E2E8F0; border-radius: 20px;
  overflow: hidden; display: flex; flex-direction: column;
}

/* Month nav */
.cal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 14px; }
.cal-header__label { font-size: 15px; font-weight: 800; color: #0F172A; }
.cal-nav {
  width: 32px; height: 32px; border-radius: 8px; border: 1px solid #E2E8F0;
  background: #F8FAFC; cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: #64748B; transition: all .15s;
}
.cal-nav:hover { background: #EFF6FF; border-color: #BFDBFE; color: #2563EB; }

/* Grid */
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); padding: 0 12px; }
.cal-grid--head { margin-bottom: 4px; }
.cal-wd { text-align: center; font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase; padding: 6px 0; }

.cal-cell {
  aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  border-radius: 10px; cursor: pointer; transition: background .12s;
  gap: 2px; position: relative;
}
.cal-cell--empty { cursor: default; }
.cal-cell:not(.cal-cell--empty):hover { background: #F1F5F9; }
.cal-cell__num { font-size: 13px; font-weight: 600; color: #374151; line-height: 1; }
.cal-cell--today .cal-cell__num { color: #2563EB; font-weight: 900; }
.cal-cell--today { background: #EFF6FF; }
.cal-cell--selected { background: #2563EB !important; }
.cal-cell--selected .cal-cell__num { color: white !important; }

.cal-dots { display: flex; gap: 2px; justify-content: center; }
.cal-dot  { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
.cal-cell--selected .cal-dot { background: rgba(255,255,255,0.7) !important; }

/* Legend */
.cal-legend { display: flex; flex-wrap: wrap; gap: 10px; padding: 14px 20px; border-top: 1px solid #F1F5F9; }
.legend-item { display: flex; align-items: center; gap: 5px; font-size: 10px; color: #64748B; font-weight: 600; }
.legend-dot  { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

/* Upcoming panel */
.upcoming-panel { border-top: 1px solid #F1F5F9; padding: 16px 20px 20px; }
.upcoming-panel__title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #94A3B8; margin: 0 0 12px; }
.upcoming-empty { font-size: 12px; color: #CBD5E1; text-align: center; padding: 12px 0; }
.upcoming-list  { display: flex; flex-direction: column; gap: 4px; }

.upcoming-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 12px; cursor: pointer;
  border: 1px solid transparent; transition: all .13s;
}
.upcoming-item:hover  { background: #F8FAFC; border-color: #E2E8F0; }
.upcoming-item--active { background: #EFF6FF; border-color: #BFDBFE; }

.upcoming-item__date {
  width: 38px; height: 38px; border-radius: 10px; background: #F1F5F9;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.upcoming-item--active .upcoming-item__date { background: #DBEAFE; }
.upcoming-item__day { font-size: 15px; font-weight: 900; color: #0F172A; margin: 0; line-height: 1; }
.upcoming-item__mon { font-size: 8px; font-weight: 700; color: #94A3B8; text-transform: uppercase; margin: 0; }

.upcoming-item__info { flex: 1; min-width: 0; }
.upcoming-item__type { font-size: 11px; font-weight: 700; margin: 0 0 1px; }
.upcoming-item__time { font-size: 11px; color: #94A3B8; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.upcoming-item__status { font-size: 14px; flex-shrink: 0; }

/* ══ DETAIL COL ══════════════════════════════════════════════════════════ */
.detail-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 16px; }

.detail-head {
  display: flex; align-items: center; justify-content: space-between;
  background: white; border: 1px solid #E2E8F0; border-radius: 16px;
  padding: 20px 24px;
}
.detail-head__label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #2563EB; margin: 0 0 3px; }
.detail-head__date  { font-size: 18px; font-weight: 800; color: #0F172A; margin: 0; text-transform: capitalize; }
.detail-head__count {
  padding: 6px 14px; border-radius: 20px; background: #EFF6FF;
  color: #2563EB; font-size: 12px; font-weight: 700;
}

/* Empty day */
.day-empty {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  background: white; border: 1px solid #E2E8F0; border-radius: 16px;
  padding: 64px 32px; text-align: center;
}
.day-empty__icon { width: 64px; height: 64px; border-radius: 16px; background: #F8FAFC; display: flex; align-items: center; justify-content: center; }
.day-empty__title { font-size: 16px; font-weight: 700; color: #64748B; margin: 0; }
.day-empty__sub   { font-size: 13px; color: #94A3B8; margin: 0; max-width: 280px; }

/* Appointment cards */
.appt-cards { display: flex; flex-direction: column; gap: 14px; }

.appt-card {
  display: flex; background: white; border: 1px solid #E2E8F0;
  border-radius: 18px; overflow: hidden;
  box-shadow: 0 1px 4px rgba(15,23,42,0.06);
  transition: box-shadow .15s;
}
.appt-card:hover { box-shadow: 0 6px 20px rgba(15,23,42,0.1); }
.appt-card--proposed  { border-left: none; } /* uses time bar color */
.appt-card--confirmed { border-color: #A7F3D0; }
.appt-card--cancelled { opacity: 0.5; }

/* Time bar (left strip) */
.appt-time-bar {
  width: 72px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  padding: 20px 8px;
}
.appt-time-bar__time { font-size: 15px; font-weight: 900; color: white; text-align: center; line-height: 1.2; writing-mode: vertical-rl; transform: rotate(180deg); }

/* Content */
.appt-content { flex: 1; padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }

.appt-content__top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.type-badge, .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; }

.appt-doctor { display: flex; align-items: center; gap: 12px; }
.appt-doctor__avatar {
  width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, #2563EB, #7C3AED);
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 800; color: white; flex-shrink: 0;
}
.appt-doctor__name { font-size: 15px; font-weight: 700; color: #0F172A; margin: 0 0 2px; }
.appt-doctor__spec { font-size: 12px; color: #64748B; margin: 0; }

.appt-motif { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #64748B; font-style: italic; margin: 0; }

.video-btn {
  display: inline-flex; align-items: center; gap: 8px;
  background: #EFF6FF; color: #2563EB; border-radius: 10px;
  padding: 10px 16px; font-size: 13px; font-weight: 700;
  text-decoration: none; width: fit-content; transition: background .13s;
}
.video-btn:hover { background: #DBEAFE; }

.appt-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.appt-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 10px 18px; border-radius: 10px; border: none;
  font-size: 13px; font-weight: 700; cursor: pointer; transition: opacity .13s;
}
.appt-btn:hover { opacity: .85; }
.appt-btn--confirm { background: #ECFDF5; color: #059669; border: 1.5px solid #6EE7B7; }
.appt-btn--decline { background: #FEF2F2; color: #DC2626; border: 1.5px solid #FECACA; }
.appt-btn--cancel  { background: #F8FAFC; color: #64748B; border: 1.5px solid #E2E8F0; }
</style>
