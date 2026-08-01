<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'
import { ensureConnected } from '@/services/socket'

interface Stats { totalPatients: number; activeAlerts: number; highRiskCount: number; rdvAujourdhui: number }
interface HighRiskPatient { id: string; nomComplet: string; risk: { niveau: string; score: number } }
interface RecentAlert { id: string; message: string; severite: string; type: string; createdAt: string; patient: { id: string; nomComplet: string } }
interface Activity { id: string; type: string; patient: string; message: string; time: string }
interface Patient { id: string; nomComplet: string; age: number; stadeRecommande: string; alerts?: { id: string }[]; riskPredictions?: { niveau: string; score: number }[] }

const router = useRouter()
const loading      = ref(true)
const stats        = ref<Stats>({ totalPatients: 0, activeAlerts: 0, highRiskCount: 0, rdvAujourdhui: 0 })
const highRisk     = ref<HighRiskPatient[]>([])
const recentAlerts = ref<RecentAlert[]>([])
const activities   = ref<Activity[]>([])
const patients     = ref<Patient[]>([])
const search       = ref('')

// Live follow-up toast
interface FollowUpEvent { patientName: string; alertCount: number; riskLevel: string }
const liveToasts = ref<(FollowUpEvent & { id: number })[]>([])
let toastId = 0

function onNewFollowup(payload: FollowUpEvent) {
  const id = ++toastId
  liveToasts.value.push({ ...payload, id })
  // Add to activity feed immediately
  activities.value.unshift({
    id: `live-${id}`,
    type: payload.alertCount > 0 ? 'alert' : 'followup',
    patient: payload.patientName,
    message: payload.alertCount > 0
      ? `Suivi soumis — ${payload.alertCount} alerte(s) détectée(s)`
      : 'Suivi hebdomadaire soumis — aucune anomalie',
    time: new Date().toISOString(),
  })
  // Bump alert counter if alerts present
  if (payload.alertCount > 0) stats.value.activeAlerts++
  // Auto-dismiss toast after 6 s
  setTimeout(() => {
    liveToasts.value = liveToasts.value.filter(t => t.id !== id)
  }, 6000)
}

const filtered = computed(() => {
  if (!search.value) return patients.value
  const q = search.value.toLowerCase()
  return patients.value.filter(p => p.nomComplet.toLowerCase().includes(q))
})

const riskMeta: Record<string, { color: string; bg: string; label: string }> = {
  LOW:      { color: '#10B981', bg: '#ECFDF5', label: 'Faible' },
  MODERATE: { color: '#D97706', bg: '#FFFBEB', label: 'Modéré' },
  HIGH:     { color: '#EF4444', bg: '#FEF2F2', label: 'Élevé' },
  VERY_HIGH:{ color: '#7C3AED', bg: '#F5F3FF', label: 'Critique' },
}
const sevMeta: Record<string, { bg: string; color: string }> = {
  CRITICAL: { bg: '#F3E8FF', color: '#7C3AED' },
  HIGH:     { bg: '#FEE2E2', color: '#EF4444' },
  MEDIUM:   { bg: '#FEF3C7', color: '#D97706' },
  LOW:      { bg: '#D1FAE5', color: '#10B981' },
}
const activityColor: Record<string, string> = {
  followup: '#10B981', alert: '#EF4444', message: '#2563EB', report: '#6366F1',
}

onMounted(async () => {
  try {
    const [dashRes, patientsRes] = await Promise.all([
      api.get('/doctor/dashboard'),
      api.get('/doctor/patients'),
    ])
    stats.value        = dashRes.data.stats
    highRisk.value     = dashRes.data.highRiskPatients ?? []
    recentAlerts.value = dashRes.data.recentAlerts ?? []
    activities.value   = dashRes.data.recentActivities ?? []
    patients.value     = patientsRes.data.items ?? []
  } finally {
    loading.value = false
  }

  // Listen for live follow-up submissions
  const token = localStorage.getItem('accessToken')
  if (token) {
    ensureConnected(token).on('new_followup', onNewFollowup)
  }
})

onUnmounted(() => {
  const token = localStorage.getItem('accessToken')
  if (token) ensureConnected(token).off('new_followup', onNewFollowup)
})
</script>

<template>
  <!-- Live follow-up toasts (teleport so they float above everything) -->
  <Teleport to="body">
    <div class="toast-stack">
      <Transition v-for="t in liveToasts" :key="t.id" name="toast-slide">
        <div class="followup-toast" :class="t.alertCount > 0 ? 'followup-toast--alert' : 'followup-toast--ok'">
          <div class="followup-toast__icon">
            <svg v-if="t.alertCount > 0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12h4l2-5 4 10 2-5h6"/></svg>
          </div>
          <div class="followup-toast__body">
            <p class="followup-toast__title">Suivi reçu — {{ t.patientName }}</p>
            <p class="followup-toast__sub">
              {{ t.alertCount > 0 ? `${t.alertCount} alerte(s) détectée(s) · Risque ${t.riskLevel}` : 'Aucune anomalie détectée' }}
            </p>
          </div>
          <button class="followup-toast__close" @click="liveToasts = liveToasts.filter(x => x.id !== t.id)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </Transition>
    </div>
  </Teleport>

  <div v-if="loading" class="dash-loading">
    <v-progress-circular indeterminate color="primary" size="52" width="4" />
  </div>

  <div v-else class="dashboard">

    <!-- Header -->
    <div class="dash-header">
      <div>
        <p class="section-label">Espace médecin</p>
        <h1 class="dash-header__title">Tableau de bord clinique</h1>
        <p class="dash-header__sub">
          {{ stats.totalPatients }} patients en suivi &mdash; {{ stats.rdvAujourdhui }} rendez-vous aujourd'hui
        </p>
      </div>
      <div class="header-actions">
        <button class="hdr-btn hdr-btn--primary" @click="router.push('/medecin/patients')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Tous les patients
        </button>
        <button class="hdr-btn hdr-btn--danger" @click="router.push('/medecin/alertes')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Alertes ({{ stats.activeAlerts }})
        </button>
      </div>
    </div>

    <!-- KPIs -->
    <section class="dash-section">
      <p class="section-label">Indicateurs clés</p>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon--blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="kpi-body"><p class="kpi-value">{{ stats.totalPatients }}</p><p class="kpi-label">Patients suivis</p></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon--amber">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <div class="kpi-body"><p class="kpi-value">{{ stats.activeAlerts }}</p><p class="kpi-label">Alertes actives</p></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon--red">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </div>
          <div class="kpi-body"><p class="kpi-value">{{ stats.highRiskCount }}</p><p class="kpi-label">À haut risque</p></div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-icon--teal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div class="kpi-body"><p class="kpi-value">{{ stats.rdvAujourdhui }}</p><p class="kpi-label">RDV aujourd'hui</p></div>
        </div>
      </div>
    </section>

    <!-- High risk + recent alerts -->
    <section class="dash-section">
      <p class="section-label">Suivi prioritaire</p>
      <div class="dual-grid">

        <!-- High risk -->
        <div class="panel">
          <div class="panel__header">
            <span class="panel__title">Patients à haut risque</span>
            <span class="badge badge--red">{{ highRisk.length }}</span>
          </div>
          <div v-if="highRisk.length" class="patient-list">
            <div v-for="p in highRisk" :key="p.id" class="p-row" @click="router.push(`/medecin/patients/${p.id}`)">
              <div class="p-row__avatar">{{ p.nomComplet.charAt(0) }}</div>
              <div class="p-row__info">
                <p class="p-row__name">{{ p.nomComplet }}</p>
                <p class="p-row__meta">Score risque : {{ p.risk?.score ?? '—' }}/100</p>
              </div>
              <span class="risk-pill" :style="{ background: (riskMeta[p.risk?.niveau] ?? riskMeta.HIGH).bg, color: (riskMeta[p.risk?.niveau] ?? riskMeta.HIGH).color }">
                {{ (riskMeta[p.risk?.niveau] ?? riskMeta.HIGH).label }}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>
          <div v-else class="panel__empty">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="1.5" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <p>Aucun patient à haut risque</p>
          </div>
        </div>

        <!-- Recent alerts -->
        <div class="panel">
          <div class="panel__header">
            <span class="panel__title">Alertes récentes</span>
            <router-link to="/medecin/alertes" class="panel__link">Toutes →</router-link>
          </div>
          <div class="alert-list">
            <div v-for="a in recentAlerts" :key="a.id" class="a-row">
              <div class="a-row__icon" :style="{ background: (sevMeta[a.severite] ?? sevMeta.LOW).bg, color: (sevMeta[a.severite] ?? sevMeta.LOW).color }">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </div>
              <div class="a-row__body">
                <p class="a-row__patient">{{ a.patient.nomComplet }}</p>
                <p class="a-row__msg">{{ a.message }}</p>
              </div>
              <span class="sev-dot" :style="{ background: (sevMeta[a.severite] ?? sevMeta.LOW).color }" />
            </div>
            <div v-if="!recentAlerts.length" class="panel__empty">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="1.5" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <p>Aucune alerte</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Patients table -->
    <section class="dash-section">
      <p class="section-label">Liste des patients</p>
      <div class="panel">
        <div class="panel__header">
          <span class="panel__title">Patients en suivi</span>
          <div class="search-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input v-model="search" placeholder="Rechercher un patient…" class="search-input" />
          </div>
        </div>

        <div class="patients-table">
          <div class="pt-header">
            <span>Patient</span>
            <span>Âge</span>
            <span>Stade</span>
            <span>Risque</span>
            <span>Alertes</span>
            <span></span>
          </div>
          <div v-for="p in filtered" :key="p.id" class="pt-row" @click="router.push(`/medecin/patients/${p.id}`)">
            <div class="pt-patient">
              <div class="pt-avatar">{{ p.nomComplet.charAt(0) }}</div>
              <span class="pt-name">{{ p.nomComplet }}</span>
            </div>
            <span class="pt-age">{{ p.age ?? '—' }} ans</span>
            <span class="stage-tag">{{ p.stadeRecommande }}</span>
            <span v-if="p.riskPredictions?.[0]" class="risk-pill"
              :style="{ background: (riskMeta[p.riskPredictions[0].niveau] ?? riskMeta.LOW).bg, color: (riskMeta[p.riskPredictions[0].niveau] ?? riskMeta.LOW).color }">
              {{ (riskMeta[p.riskPredictions[0].niveau] ?? riskMeta.LOW).label }}
            </span>
            <span v-else class="pt-dash">—</span>
            <span v-if="p.alerts?.length" class="alert-badge">{{ p.alerts.length }}</span>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            <button class="pt-btn" @click.stop="router.push(`/medecin/patients/${p.id}`)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              Voir
            </button>
          </div>
          <div v-if="!filtered.length" class="pt-empty">
            Aucun patient trouvé
          </div>
        </div>
      </div>
    </section>

    <!-- Activity feed -->
    <section class="dash-section">
      <p class="section-label">Activité récente des patients</p>
      <div class="panel">
        <div class="panel__header">
          <span class="panel__title">Journal d'activité</span>
        </div>
        <div class="activity-feed">
          <div v-for="act in activities" :key="act.id" class="act-item">
            <div class="act-dot" :style="{ background: activityColor[act.type] ?? '#64748B' }">
              <svg v-if="act.type === 'followup'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><path d="M3 12h4l2-5 4 10 2-5h6"/></svg>
              <svg v-else-if="act.type === 'alert'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div class="act-body">
              <p class="act-msg"><strong>{{ act.patient }}</strong> — {{ act.message }}</p>
              <p class="act-time">{{ new Date(act.time).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }) }}</p>
            </div>
          </div>
          <div v-if="!activities.length" class="panel__empty">
            <p>Aucune activité récente</p>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<style scoped>
.dash-loading { display: flex; align-items: center; justify-content: center; min-height: 60vh; }
.dashboard { width: 100%; }

/* Header */
.dash-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 32px; gap: 16px; flex-wrap: wrap;
  padding-bottom: 24px; border-bottom: 1px solid #E2E8F0;
}
.dash-header__title { font-size: 24px; font-weight: 800; color: #0F172A; letter-spacing: -0.03em; margin-bottom: 6px; }
.dash-header__sub   { font-size: 14px; color: #64748B; font-weight: 500; }
.header-actions { display: flex; gap: 12px; flex-wrap: wrap; }

.hdr-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 18px; border-radius: 10px; border: none; cursor: pointer;
  font-size: 13px; font-weight: 700; transition: opacity 0.15s;
}
.hdr-btn:hover { opacity: 0.88; }
.hdr-btn--primary { background: #2563EB; color: white; }
.hdr-btn--danger  { background: #FEE2E2; color: #EF4444; }

.dash-section { margin-bottom: 36px; }

/* KPI grid */
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
@media (max-width: 900px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) { .kpi-grid { grid-template-columns: 1fr; } }

.kpi-card {
  background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 20px;
  display: flex; align-items: center; gap: 16px;
  box-shadow: 0 1px 4px rgba(15,23,42,0.06);
}
.kpi-icon {
  width: 48px; height: 48px; border-radius: 14px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.kpi-icon--blue  { background: linear-gradient(135deg, #2563EB, #1D4ED8); }
.kpi-icon--amber { background: linear-gradient(135deg, #F59E0B, #D97706); }
.kpi-icon--red   { background: linear-gradient(135deg, #EF4444, #DC2626); }
.kpi-icon--teal  { background: linear-gradient(135deg, #10B981, #059669); }
.kpi-value { font-size: 28px; font-weight: 800; color: #0F172A; letter-spacing: -0.04em; margin: 0 0 2px; }
.kpi-label { font-size: 12px; color: #64748B; font-weight: 600; margin: 0; }

/* Dual grid */
.dual-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 768px) { .dual-grid { grid-template-columns: 1fr; } }

/* Panel */
.panel {
  background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 24px;
  box-shadow: 0 1px 4px rgba(15,23,42,0.06);
}
.panel__header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20px; gap: 12px; flex-wrap: wrap;
}
.panel__title { font-size: 15px; font-weight: 700; color: #0F172A; }
.panel__link  { font-size: 12px; color: #2563EB; font-weight: 600; text-decoration: none; }
.panel__link:hover { text-decoration: underline; }
.panel__empty {
  display: flex; flex-direction: column; align-items: center;
  padding: 28px 0; gap: 8px; color: #64748B; font-size: 13px;
}

/* Badge */
.badge { display: inline-flex; align-items: center; justify-content: center; min-width: 22px; height: 22px; border-radius: 7px; font-size: 11px; font-weight: 700; padding: 0 6px; }
.badge--red { background: #FEE2E2; color: #EF4444; }

/* Risk pills */
.risk-pill { display: inline-block; padding: 3px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; }

/* Patient list */
.patient-list { display: flex; flex-direction: column; gap: 8px; }
.p-row {
  display: flex; align-items: center; gap: 12px; padding: 10px 12px;
  border-radius: 12px; border: 1px solid #F1F5F9; cursor: pointer;
  transition: background 0.15s;
}
.p-row:hover { background: #F8FAFC; }
.p-row__avatar {
  width: 38px; height: 38px; border-radius: 50%; background: #2563EB;
  color: white; font-size: 14px; font-weight: 700; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.p-row__info { flex: 1; min-width: 0; }
.p-row__name { font-size: 14px; font-weight: 700; color: #0F172A; margin: 0 0 2px; }
.p-row__meta { font-size: 12px; color: #64748B; margin: 0; }

/* Alert list */
.alert-list { display: flex; flex-direction: column; gap: 8px; }
.a-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px; border: 1px solid #F1F5F9; }
.a-row__icon { width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.a-row__body { flex: 1; min-width: 0; }
.a-row__patient { font-size: 13px; font-weight: 700; color: #0F172A; margin: 0 0 2px; }
.a-row__msg { font-size: 12px; color: #64748B; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sev-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

/* Search */
.search-box {
  display: flex; align-items: center; gap: 8px;
  background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px;
  padding: 8px 14px; min-width: 200px;
}
.search-input { border: none; outline: none; font-size: 13px; color: #0F172A; background: transparent; width: 100%; }

/* Patients table */
.patients-table { width: 100%; }
.pt-header, .pt-row {
  display: grid;
  grid-template-columns: 2fr 70px 90px 90px 70px 90px;
  align-items: center; gap: 8px;
}
.pt-header {
  font-size: 11px; font-weight: 700; color: #64748B; letter-spacing: 0.07em;
  text-transform: uppercase; padding: 10px 12px; background: #F8FAFC;
  border-radius: 10px; margin-bottom: 4px;
}
.pt-row {
  padding: 12px; border-radius: 10px; cursor: pointer;
  transition: background 0.13s;
}
.pt-row:hover { background: #EFF6FF; }
.pt-patient { display: flex; align-items: center; gap: 10px; min-width: 0; }
.pt-avatar {
  width: 34px; height: 34px; border-radius: 50%; background: #2563EB;
  color: white; font-size: 13px; font-weight: 700; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.pt-name { font-size: 14px; font-weight: 600; color: #0F172A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pt-age  { font-size: 13px; color: #334155; }
.pt-dash { font-size: 13px; color: #94A3B8; }
.stage-tag { background: #EFF6FF; color: #2563EB; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 6px; width: fit-content; }
.alert-badge { background: #FEE2E2; color: #EF4444; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; min-width: 24px; text-align: center; }
.pt-btn {
  display: flex; align-items: center; gap: 6px;
  background: #EFF6FF; color: #2563EB; border: none; border-radius: 8px;
  padding: 7px 12px; font-size: 12px; font-weight: 700; cursor: pointer;
  transition: background 0.13s;
}
.pt-btn:hover { background: #DBEAFE; }
.pt-empty { padding: 24px; text-align: center; color: #94A3B8; font-size: 14px; }

/* Activity feed */
.activity-feed { display: flex; flex-direction: column; }
.act-item { display: flex; align-items: flex-start; gap: 14px; padding: 14px 0; border-bottom: 1px solid #F1F5F9; }
.act-item:last-child { border-bottom: none; }
.act-dot { width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.act-body { flex: 1; min-width: 0; }
.act-msg  { font-size: 14px; color: #334155; margin: 0 0 4px; line-height: 1.4; }
.act-time { font-size: 12px; color: #94A3B8; margin: 0; }

/* Live follow-up toast stack */
.toast-stack {
  position: fixed; bottom: 28px; right: 28px; z-index: 10000;
  display: flex; flex-direction: column; gap: 12px; pointer-events: none;
}
.followup-toast {
  display: flex; align-items: center; gap: 14px;
  background: #FFFFFF; border-radius: 16px; padding: 16px 20px;
  box-shadow: 0 8px 32px rgba(15,23,42,0.18), 0 2px 8px rgba(15,23,42,0.08);
  border-left: 4px solid #10B981;
  min-width: 320px; max-width: 400px;
  pointer-events: all;
}
.followup-toast--alert { border-left-color: #EF4444; }
.followup-toast--ok    { border-left-color: #10B981; }

.followup-toast__icon {
  width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: #ECFDF5; color: #10B981;
}
.followup-toast--alert .followup-toast__icon { background: #FEF2F2; color: #EF4444; }

.followup-toast__body { flex: 1; min-width: 0; }
.followup-toast__title { font-size: 14px; font-weight: 700; color: #0F172A; margin: 0 0 3px; }
.followup-toast__sub   { font-size: 12px; color: #64748B; margin: 0; }

.followup-toast__close {
  background: none; border: none; cursor: pointer; padding: 4px;
  color: #94A3B8; border-radius: 6px; flex-shrink: 0;
}
.followup-toast__close:hover { background: #F1F5F9; color: #64748B; }

/* Toast transition */
.toast-slide-enter-active, .toast-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease;
}
.toast-slide-enter-from { transform: translateX(60px); opacity: 0; }
.toast-slide-leave-to   { transform: translateX(60px); opacity: 0; }
</style>
