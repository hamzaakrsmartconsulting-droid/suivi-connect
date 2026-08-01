<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

const router = useRouter()

interface Patient { id: string; nomComplet: string; age: number }
interface Appointment {
  id: string; patientId: string; dateTime: string; type: string
  motif?: string; videoLink?: string; notes?: string; status: string
  patient: Patient
}

// ── Data ─────────────────────────────────────────────────────────────────────
const loading      = ref(true)
const appointments = ref<Appointment[]>([])
const patients     = ref<Patient[]>([])
const showModal    = ref(false)
const saving       = ref(false)
const savedToast   = ref(false)

const form = ref({
  patientId: '', dateTime: '', type: 'consultation',
  motif: '', videoLink: '', notes: '',
})

const typeOptions = ['consultation', 'bilan', 'suivi', 'urgence']
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

// ── Calendar state ────────────────────────────────────────────────────────────
const today       = new Date()
const calYear     = ref(today.getFullYear())
const calMonth    = ref(today.getMonth())
const selectedDay = ref<string | null>(today.toISOString().split('T')[0])

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS   = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

const firstWeekday = computed(() => {
  const d = new Date(calYear.value, calMonth.value, 1).getDay()
  return d === 0 ? 6 : d - 1
})
const daysInMonth = computed(() =>
  new Date(calYear.value, calMonth.value + 1, 0).getDate()
)
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

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
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

// Open modal pre-filled with clicked date
function openModalForDay(day: number | null) {
  if (!day) return
  const d = isoDate(calYear.value, calMonth.value, day)
  selectedDay.value = d
  form.value.dateTime = `${d}T09:00`
  showModal.value = true
}

// Appointments for selected day
const listAppts = computed(() =>
  appointments.value
    .filter(a => selectedDay.value && a.dateTime.startsWith(selectedDay.value))
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
)

// Upcoming appointments (sidebar)
const upcoming = computed(() =>
  appointments.value
    .filter(a => new Date(a.dateTime) >= today && a.status !== 'cancelled')
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
    .slice(0, 6)
)

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
function fmtShort(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}
function isSoon(d: string) {
  const diff = new Date(d).getTime() - today.getTime()
  return diff > 0 && diff < 24 * 60 * 60 * 1000
}

// ── API ───────────────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  try {
    const [apptRes, patRes] = await Promise.all([
      api.get('/doctor/appointments'),
      api.get('/doctor/patients'),
    ])
    appointments.value = apptRes.data
    patients.value = patRes.data.items ?? []
  } finally { loading.value = false }
}

async function submit() {
  saving.value = true
  try {
    const { data } = await api.post('/doctor/appointments', form.value)
    appointments.value.push(data)
    showModal.value = false
    savedToast.value = true
    setTimeout(() => { savedToast.value = false }, 4000)
    form.value = { patientId: '', dateTime: '', type: 'consultation', motif: '', videoLink: '', notes: '' }
  } finally { saving.value = false }
}

async function cancelAppt(id: string) {
  await api.patch(`/doctor/appointments/${id}`, { status: 'cancelled' })
  const a = appointments.value.find(x => x.id === id)
  if (a) a.status = 'cancelled'
}

onMounted(load)
</script>

<template>
  <div class="agenda-page">

    <!-- ── Success toast ─────────────────────────────────────────────────────── -->
    <Transition name="toast">
      <div v-if="savedToast" class="saved-toast">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        Rendez-vous planifié — le patient a été notifié
      </div>
    </Transition>

    <!-- ── Header ─────────────────────────────────────────────────────────────── -->
    <div class="page-head">
      <div class="page-head__left">
        <div class="page-head__icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <div>
          <p class="section-lbl">Agenda</p>
          <h1 class="page-title">Rendez-vous</h1>
        </div>
      </div>
      <button class="add-btn" @click="showModal = true; form.dateTime = selectedDay ? `${selectedDay}T09:00` : ''">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Nouveau rendez-vous
      </button>
    </div>

    <!-- ── Skeleton ───────────────────────────────────────────────────────────── -->
    <div v-if="loading" class="skeleton-wrap">
      <div class="skeleton cal-sk" />
      <div class="skeleton list-sk" />
    </div>

    <div v-else class="agenda-layout">

      <!-- ══ LEFT: Calendar ═════════════════════════════════════════════════════ -->
      <aside class="cal-col">

        <!-- Month nav -->
        <div class="cal-header">
          <button class="cal-nav" @click="prevMonth">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span class="cal-title">{{ MONTHS[calMonth] }} {{ calYear }}</span>
          <button class="cal-nav" @click="nextMonth">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        <!-- Weekdays -->
        <div class="cal-grid cal-grid--head">
          <div v-for="wd in WEEKDAYS" :key="wd" class="cal-wd">{{ wd }}</div>
        </div>

        <!-- Days -->
        <div class="cal-grid">
          <div
            v-for="(cell, i) in calGrid" :key="i"
            class="cal-cell"
            :class="{
              'cal-cell--empty':    !cell,
              'cal-cell--today':    cell !== null && isoDate(calYear, calMonth, cell) === isoToday(),
              'cal-cell--selected': cell !== null && isoDate(calYear, calMonth, cell) === selectedDay,
              'cal-cell--has':      cell !== null && appointmentsOnDay(cell).length > 0,
            }"
            @click="selectDay(cell)"
            @dblclick="openModalForDay(cell)"
            :title="cell ? 'Clic : voir · Double-clic : ajouter' : ''"
          >
            <span class="cal-cell__num">{{ cell ?? '' }}</span>
            <div v-if="cell && appointmentsOnDay(cell).length" class="cal-dots">
              <span
                v-for="(a, di) in appointmentsOnDay(cell).slice(0, 3)" :key="di"
                class="cal-dot"
                :style="{ background: (typeMeta[a.type] ?? typeMeta.consultation).color }"
              />
            </div>
          </div>
        </div>

        <!-- Hint -->
        <p class="cal-hint">Double-clic sur un jour pour créer un rendez-vous</p>

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
                <p class="upcoming-item__patient">{{ a.patient.nomComplet }}</p>
                <p class="upcoming-item__time">
                  {{ fmtTime(a.dateTime) }} ·
                  <span :style="{ color: (typeMeta[a.type] ?? typeMeta.consultation).color }">{{ (typeMeta[a.type] ?? typeMeta.consultation).label }}</span>
                </p>
              </div>
              <span v-if="isSoon(a.dateTime)" class="soon-dot" title="Dans moins de 24h">!</span>
            </div>
          </div>
        </div>

      </aside>

      <!-- ══ RIGHT: Day detail ══════════════════════════════════════════════════ -->
      <main class="detail-col">

        <!-- Day heading -->
        <div class="detail-head" v-if="selectedDay">
          <div>
            <p class="detail-head__label">
              {{ selectedDay === isoToday() ? "Aujourd'hui" : "Consultations du" }}
            </p>
            <h2 class="detail-head__date">
              {{ new Date(selectedDay + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) }}
            </h2>
          </div>
          <button class="add-day-btn"
            @click="showModal = true; form.dateTime = `${selectedDay}T09:00`">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Ajouter ce jour
          </button>
        </div>

        <!-- Empty day -->
        <div v-if="!listAppts.length" class="day-empty">
          <div class="day-empty__icon">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <p class="day-empty__title">Aucune consultation ce jour</p>
          <p class="day-empty__sub">Double-cliquez sur le calendrier ou utilisez le bouton "Ajouter ce jour"</p>
          <button class="day-empty__btn"
            @click="showModal = true; form.dateTime = selectedDay ? `${selectedDay}T09:00` : ''">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Planifier une consultation
          </button>
        </div>

        <!-- Appointment cards -->
        <div v-else class="appt-cards">
          <div
            v-for="a in listAppts" :key="a.id"
            class="appt-card"
            :class="{
              'appt-card--confirmed': a.status === 'confirmed',
              'appt-card--cancelled': a.status === 'cancelled',
              'appt-card--soon':      isSoon(a.dateTime),
            }"
          >
            <!-- Time strip -->
            <div class="appt-strip" :style="{ background: (typeMeta[a.type] ?? typeMeta.consultation).color }">
              <p class="appt-strip__time">{{ fmtTime(a.dateTime) }}</p>
              <p class="appt-strip__type">{{ (typeMeta[a.type] ?? typeMeta.consultation).label }}</p>
            </div>

            <div class="appt-body">
              <div class="appt-body__top">
                <div class="appt-patient"
                  @click="router.push(`/medecin/patients/${a.patient.id}`)">
                  <div class="appt-patient__avatar">{{ a.patient.nomComplet.charAt(0) }}</div>
                  <div>
                    <p class="appt-patient__name">{{ a.patient.nomComplet }}</p>
                    <p class="appt-patient__age">{{ a.patient.age }} ans</p>
                  </div>
                </div>
                <div class="appt-badges">
                  <span v-if="isSoon(a.dateTime)" class="badge badge--soon">Bientôt</span>
                  <span class="badge"
                    :style="{ background: (statusMeta[a.status] ?? statusMeta.proposed).bg, color: (statusMeta[a.status] ?? statusMeta.proposed).color }">
                    {{ (statusMeta[a.status] ?? statusMeta.proposed).label }}
                  </span>
                </div>
              </div>

              <p v-if="a.motif" class="appt-motif">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                {{ a.motif }}
              </p>

              <a v-if="a.videoLink" :href="a.videoLink" target="_blank" class="video-btn">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                Lien téléconsultation
              </a>

              <div class="appt-actions">
                <button
                  class="appt-nav-btn"
                  @click="router.push(`/medecin/patients/${a.patient.id}`)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Voir le patient
                </button>
                <button v-if="a.status !== 'cancelled'" class="appt-cancel-btn" @click="cancelAppt(a.id)">
                  Annuler le RDV
                </button>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>

    <!-- ══ MODAL: New appointment ═════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
          <div class="modal">
            <div class="modal__head">
              <div class="modal__head-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/></svg>
              </div>
              <div>
                <h2 class="modal__title">Nouveau rendez-vous</h2>
                <p class="modal__sub">Le patient sera notifié immédiatement</p>
              </div>
              <button class="modal__close" @click="showModal = false">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div class="modal__body">
              <div class="form-grid">
                <div class="form-group form-group--full">
                  <label class="form-label">Patient *</label>
                  <select v-model="form.patientId" class="form-input">
                    <option value="">Sélectionner un patient…</option>
                    <option v-for="p in patients" :key="p.id" :value="p.id">
                      {{ p.nomComplet }} ({{ p.age }} ans)
                    </option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Date et heure *</label>
                  <input v-model="form.dateTime" type="datetime-local" class="form-input" />
                </div>

                <div class="form-group">
                  <label class="form-label">Type de consultation</label>
                  <div class="type-picker">
                    <button
                      v-for="t in typeOptions" :key="t"
                      class="type-opt"
                      :class="{ 'type-opt--active': form.type === t }"
                      :style="form.type === t ? { background: typeMeta[t].bg, color: typeMeta[t].color, borderColor: typeMeta[t].color } : {}"
                      type="button"
                      @click="form.type = t">
                      {{ typeMeta[t].label }}
                    </button>
                  </div>
                </div>

                <div class="form-group form-group--full">
                  <label class="form-label">Motif</label>
                  <input v-model="form.motif" class="form-input" placeholder="Ex: Contrôle tension artérielle, Bilan de suivi…" />
                </div>

                <div class="form-group form-group--full">
                  <label class="form-label">Lien téléconsultation <span class="form-label-opt">(optionnel)</span></label>
                  <input v-model="form.videoLink" class="form-input" placeholder="https://meet.google.com/…" />
                </div>

                <div class="form-group form-group--full">
                  <label class="form-label">Notes internes <span class="form-label-opt">(non visibles par le patient)</span></label>
                  <textarea v-model="form.notes" class="form-input" rows="2" placeholder="Préparation, documents à apporter, rappels…" />
                </div>
              </div>
            </div>

            <div class="modal__footer">
              <button class="modal-btn modal-btn--cancel" @click="showModal = false">Annuler</button>
              <button class="modal-btn modal-btn--submit"
                :disabled="!form.patientId || !form.dateTime || saving"
                @click="submit">
                <span v-if="saving" class="btn-spin" />
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                {{ saving ? 'Planification…' : 'Confirmer le rendez-vous' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
/* ── Page ────────────────────────────────────────────────────────────────── */
.agenda-page { width: 100%; display: flex; flex-direction: column; gap: 24px; }

/* Header */
.page-head { display: flex; align-items: center; justify-content: space-between; }
.page-head__left { display: flex; align-items: center; gap: 16px; }
.page-head__icon {
  width: 48px; height: 48px; border-radius: 14px;
  background: linear-gradient(135deg, #2563EB, #7C3AED);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.section-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #2563EB; margin: 0 0 2px; }
.page-title  { font-size: 24px; font-weight: 900; color: #0F172A; margin: 0; letter-spacing: -.03em; }

.add-btn {
  display: flex; align-items: center; gap: 8px;
  background: linear-gradient(135deg, #2563EB, #1D4ED8); color: white;
  border: none; border-radius: 12px; padding: 12px 22px;
  font-size: 14px; font-weight: 700; cursor: pointer;
  box-shadow: 0 4px 14px rgba(37,99,235,0.35); transition: opacity .15s;
}
.add-btn:hover { opacity: .88; }

/* ── Toast ───────────────────────────────────────────────────────────────── */
.saved-toast {
  position: fixed; top: 24px; right: 24px; z-index: 9000;
  display: flex; align-items: center; gap: 10px;
  background: #16A34A; color: white;
  padding: 14px 22px; border-radius: 14px; font-size: 14px; font-weight: 700;
  box-shadow: 0 8px 32px rgba(22,163,74,.35);
}
.toast-enter-active, .toast-leave-active { transition: all .35s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-14px); }

/* ── Skeleton ────────────────────────────────────────────────────────────── */
.skeleton-wrap { display: flex; gap: 24px; }
.skeleton { border-radius: 20px; background: linear-gradient(90deg,#F1F5F9 25%,#E2E8F0 50%,#F1F5F9 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.cal-sk  { width: 320px; height: 560px; flex-shrink: 0; }
.list-sk { flex: 1; height: 560px; }
@keyframes shimmer { to { background-position: -200% 0; } }

/* ── Layout ──────────────────────────────────────────────────────────────── */
.agenda-layout { display: flex; gap: 24px; align-items: flex-start; }

/* ══ CAL COL ══════════════════════════════════════════════════════════════ */
.cal-col {
  width: 308px; flex-shrink: 0;
  background: white; border: 1px solid #E2E8F0; border-radius: 20px; overflow: hidden;
}

.cal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 18px 12px; }
.cal-title { font-size: 14px; font-weight: 800; color: #0F172A; }
.cal-nav {
  width: 30px; height: 30px; border-radius: 8px; border: 1px solid #E2E8F0;
  background: #F8FAFC; cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: #64748B; transition: all .15s;
}
.cal-nav:hover { background: #EFF6FF; border-color: #BFDBFE; color: #2563EB; }

.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); padding: 0 10px; }
.cal-grid--head { margin-bottom: 2px; }
.cal-wd { text-align: center; font-size: 9.5px; font-weight: 700; color: #94A3B8; text-transform: uppercase; padding: 5px 0; }

.cal-cell {
  aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  border-radius: 9px; cursor: pointer; transition: background .12s; gap: 2px;
}
.cal-cell--empty { cursor: default; }
.cal-cell:not(.cal-cell--empty):hover { background: #F1F5F9; }
.cal-cell__num { font-size: 12px; font-weight: 600; color: #374151; line-height: 1; }
.cal-cell--today { background: #EFF6FF; }
.cal-cell--today .cal-cell__num { color: #2563EB; font-weight: 900; }
.cal-cell--selected { background: #2563EB !important; }
.cal-cell--selected .cal-cell__num { color: white !important; }
.cal-cell--has .cal-cell__num { font-weight: 800; }

.cal-dots { display: flex; gap: 2px; justify-content: center; }
.cal-dot  { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
.cal-cell--selected .cal-dot { background: rgba(255,255,255,.65) !important; }

.cal-hint { font-size: 9.5px; color: #CBD5E1; text-align: center; padding: 4px 12px 0; margin: 0; }

.cal-legend { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 18px; border-top: 1px solid #F1F5F9; }
.legend-item { display: flex; align-items: center; gap: 5px; font-size: 9.5px; color: #64748B; font-weight: 600; }
.legend-dot  { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

.upcoming-panel { border-top: 1px solid #F1F5F9; padding: 14px 18px 18px; }
.upcoming-panel__title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #94A3B8; margin: 0 0 10px; }
.upcoming-empty { font-size: 11px; color: #CBD5E1; text-align: center; padding: 10px 0; }
.upcoming-list  { display: flex; flex-direction: column; gap: 3px; }

.upcoming-item {
  display: flex; align-items: center; gap: 9px;
  padding: 9px 10px; border-radius: 10px; cursor: pointer;
  border: 1px solid transparent; transition: all .13s;
}
.upcoming-item:hover { background: #F8FAFC; border-color: #E2E8F0; }
.upcoming-item--active { background: #EFF6FF; border-color: #BFDBFE; }

.upcoming-item__date {
  width: 34px; height: 34px; border-radius: 8px; background: #F1F5F9;
  display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0;
}
.upcoming-item--active .upcoming-item__date { background: #DBEAFE; }
.upcoming-item__day { font-size: 14px; font-weight: 900; color: #0F172A; margin: 0; line-height: 1; }
.upcoming-item__mon { font-size: 8px; font-weight: 700; color: #94A3B8; text-transform: uppercase; margin: 0; }

.upcoming-item__info { flex: 1; min-width: 0; }
.upcoming-item__patient { font-size: 12px; font-weight: 700; color: #0F172A; margin: 0 0 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.upcoming-item__time { font-size: 10.5px; color: #94A3B8; margin: 0; }

.soon-dot { width: 18px; height: 18px; border-radius: 50%; background: #F59E0B; color: white; font-size: 11px; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

/* ══ DETAIL COL ══════════════════════════════════════════════════════════ */
.detail-col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 16px; }

.detail-head {
  display: flex; align-items: center; justify-content: space-between;
  background: white; border: 1px solid #E2E8F0; border-radius: 16px; padding: 20px 24px;
}
.detail-head__label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #2563EB; margin: 0 0 3px; }
.detail-head__date  { font-size: 17px; font-weight: 800; color: #0F172A; margin: 0; text-transform: capitalize; }

.add-day-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 18px; border-radius: 10px; border: 1.5px solid #2563EB;
  background: #EFF6FF; color: #2563EB; font-size: 13px; font-weight: 700; cursor: pointer; transition: all .15s;
}
.add-day-btn:hover { background: #2563EB; color: white; }

/* Empty day */
.day-empty {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  background: white; border: 1px solid #E2E8F0; border-radius: 16px; padding: 60px 32px; text-align: center;
}
.day-empty__icon { width: 60px; height: 60px; border-radius: 16px; background: #F8FAFC; display: flex; align-items: center; justify-content: center; }
.day-empty__title { font-size: 16px; font-weight: 700; color: #64748B; margin: 0; }
.day-empty__sub   { font-size: 13px; color: #94A3B8; margin: 0; max-width: 300px; }
.day-empty__btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 11px 22px; border-radius: 12px; border: none;
  background: linear-gradient(135deg,#2563EB,#1D4ED8); color: white;
  font-size: 13px; font-weight: 700; cursor: pointer; transition: opacity .15s;
  box-shadow: 0 4px 12px rgba(37,99,235,.35);
}
.day-empty__btn:hover { opacity: .88; }

/* Appointment cards */
.appt-cards { display: flex; flex-direction: column; gap: 14px; }

.appt-card {
  display: flex; background: white; border: 1px solid #E2E8F0;
  border-radius: 18px; overflow: hidden;
  box-shadow: 0 1px 4px rgba(15,23,42,.06); transition: box-shadow .15s;
}
.appt-card:hover { box-shadow: 0 6px 20px rgba(15,23,42,.1); }
.appt-card--confirmed { border-color: #A7F3D0; }
.appt-card--cancelled { opacity: .5; }
.appt-card--soon { box-shadow: 0 0 0 2px rgba(245,158,11,.3); }

/* Left strip */
.appt-strip {
  width: 80px; flex-shrink: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 20px 8px; gap: 4px;
}
.appt-strip__time { font-size: 16px; font-weight: 900; color: white; text-align: center; }
.appt-strip__type { font-size: 9px; font-weight: 700; color: rgba(255,255,255,.75); text-transform: uppercase; letter-spacing: .05em; text-align: center; }

/* Content */
.appt-body { flex: 1; padding: 18px 22px; display: flex; flex-direction: column; gap: 12px; }
.appt-body__top { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }

.appt-patient { display: flex; align-items: center; gap: 12px; cursor: pointer; }
.appt-patient:hover .appt-patient__name { color: #2563EB; }
.appt-patient__avatar {
  width: 40px; height: 40px; border-radius: 12px;
  background: linear-gradient(135deg,#2563EB,#7C3AED);
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; font-weight: 800; color: white; flex-shrink: 0;
}
.appt-patient__name { font-size: 15px; font-weight: 800; color: #0F172A; margin: 0 0 1px; transition: color .13s; }
.appt-patient__age  { font-size: 11px; color: #94A3B8; margin: 0; }

.appt-badges { display: flex; align-items: center; gap: 7px; }
.badge { display: inline-block; padding: 4px 11px; border-radius: 20px; font-size: 11px; font-weight: 700; }
.badge--soon { background: #FEF3C7; color: #D97706; }

.appt-motif { display: flex; align-items: center; gap: 7px; font-size: 13px; color: #64748B; font-style: italic; margin: 0; }

.video-btn {
  display: inline-flex; align-items: center; gap: 7px;
  background: #EFF6FF; color: #2563EB; border-radius: 9px; padding: 8px 14px;
  font-size: 12px; font-weight: 700; text-decoration: none; width: fit-content; transition: background .13s;
}
.video-btn:hover { background: #DBEAFE; }

.appt-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.appt-nav-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: 9px; border: 1.5px solid #E2E8F0;
  background: #F8FAFC; color: #374151; font-size: 12px; font-weight: 700; cursor: pointer; transition: all .13s;
}
.appt-nav-btn:hover { border-color: #2563EB; color: #2563EB; background: #EFF6FF; }
.appt-cancel-btn {
  padding: 8px 16px; border-radius: 9px; border: 1.5px solid #FECACA;
  background: #FEF2F2; color: #DC2626; font-size: 12px; font-weight: 700; cursor: pointer; transition: background .13s;
}
.appt-cancel-btn:hover { background: #FEE2E2; }

/* ══ MODAL ══════════════════════════════════════════════════════════════ */
.modal-overlay {
  position: fixed; inset: 0; z-index: 9998;
  background: rgba(10,16,40,.55); backdrop-filter: blur(5px);
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.modal {
  background: white; border-radius: 22px; width: 100%; max-width: 580px;
  box-shadow: 0 32px 80px rgba(15,23,42,.25); overflow: hidden;
}
.modal__head {
  display: flex; align-items: center; gap: 14px;
  padding: 24px 28px; border-bottom: 1px solid #F1F5F9;
}
.modal__head-icon {
  width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
  background: linear-gradient(135deg,#2563EB,#1D4ED8);
  display: flex; align-items: center; justify-content: center;
}
.modal__title { font-size: 17px; font-weight: 800; color: #0F172A; margin: 0 0 2px; }
.modal__sub   { font-size: 12px; color: #64748B; margin: 0; }
.modal__close {
  margin-left: auto; background: #F1F5F9; border: none; border-radius: 9px;
  width: 34px; height: 34px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748B;
  transition: background .13s;
}
.modal__close:hover { background: #E2E8F0; }

.modal__body { padding: 22px 28px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 7px; }
.form-group--full { grid-column: 1 / -1; }
.form-label { font-size: 11px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: .05em; }
.form-label-opt { font-size: 10px; color: #94A3B8; text-transform: none; letter-spacing: 0; font-weight: 500; }
.form-input {
  border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 10px 14px;
  font-size: 14px; color: #0F172A; background: #F8FAFC; outline: none;
  font-family: inherit; transition: border-color .15s; resize: vertical;
}
.form-input:focus { border-color: #2563EB; background: white; }

/* Type picker */
.type-picker { display: flex; gap: 6px; flex-wrap: wrap; }
.type-opt {
  padding: 6px 14px; border-radius: 20px; border: 1.5px solid #E2E8F0;
  background: #F8FAFC; color: #64748B; font-size: 12px; font-weight: 700;
  cursor: pointer; transition: all .15s;
}
.type-opt:hover { border-color: #BFDBFE; }
.type-opt--active { font-weight: 800; }

.modal__footer {
  display: flex; gap: 10px; justify-content: flex-end;
  padding: 0 28px 24px;
}
.modal-btn { display: inline-flex; align-items: center; gap: 8px; padding: 11px 24px; border-radius: 11px; border: none; font-size: 14px; font-weight: 700; cursor: pointer; transition: opacity .15s; }
.modal-btn:hover:not(:disabled) { opacity: .88; }
.modal-btn:disabled { opacity: .45; cursor: not-allowed; }
.modal-btn--cancel { background: #F1F5F9; color: #64748B; }
.modal-btn--submit { background: linear-gradient(135deg,#2563EB,#1D4ED8); color: white; box-shadow: 0 4px 12px rgba(37,99,235,.3); }

.btn-spin { width: 14px; height: 14px; border-radius: 50%; border: 2px solid rgba(255,255,255,.3); border-top-color: white; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity .25s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>
