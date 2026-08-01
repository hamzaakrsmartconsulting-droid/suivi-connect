<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import StatCard from '@/components/dashboard/StatCard.vue'
import EvolutionChart from '@/components/charts/EvolutionChart.vue'
import { formatChartDate } from '@/utils/date'
import RiskScoreGauge from '@/components/risk/RiskScoreGauge.vue'

interface DashboardData {
  summary: {
    poids: number | null; tension: string | null; ldl: number | null
    activiteMinutes: number; adherence: number; cardiacScore: number; stadeRecommande: string
  }
  charts: {
    poids: { date: string; value: number }[]
    tension: { date: string; sys: number; dia: number }[]
    ldl: { date: string; value: number }[]
    activite: { date: string; value: number }[]
  }
  risk: { score: number; niveau: string; facteurs: string[] }
  medicationsToday: { nom: string; heure: string; pris: boolean; icon: string }[]
  prochainsRdv: { titre: string; date: string; medecin: string; type: string }[]
  recommandations: { id: string; texte: string; date: string; urgence: boolean }[]
  progressionExercice: { objectifMinutes: number; minutesCetteSemaine: number; seancesThisSemaine: number; streakJours: number }
}

const data = ref<DashboardData | null>(null)
const loading = ref(true)
const error = ref('')
const exporting = ref(false)

// Extra clinical data
const appointments = ref<any[]>([])
const goals = ref<any[]>([])

const nextAppointment = computed(() => {
  const now = new Date()
  return appointments.value
    .filter(a => new Date(a.dateTime) >= now && a.status !== 'cancelled')
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())[0] ?? null
})

const chartLabels = computed(() => data.value?.charts.poids.map(d => formatChartDate(d.date)) || [])

const adherenceColor = computed(() => {
  const v = data.value?.summary.adherence ?? 0
  return v >= 90 ? '#10B981' : v >= 70 ? '#F59E0B' : '#EF4444'
})

const exercisePercent = computed(() => {
  const prog = data.value?.progressionExercice
  if (!prog) return 0
  return Math.min(100, Math.round((prog.minutesCetteSemaine / prog.objectifMinutes) * 100))
})

async function loadDashboard() {
  loading.value = true
  error.value = ''
  try {
    const [dashRes, apptRes, goalsRes] = await Promise.all([
      api.get('/patient/dashboard'),
      api.get('/patient/appointments').catch(() => ({ data: [] })),
      api.get('/patient/goals').catch(() => ({ data: [] })),
    ])
    const res = dashRes.data
    data.value = {
      ...res,
      medicationsToday: res.medicationsToday ?? [],
      prochainsRdv: res.prochainsRdv ?? [],
      recommandations: res.recommandations ?? [],
      progressionExercice: res.progressionExercice ?? { objectifMinutes: 150, minutesCetteSemaine: 0, seancesThisSemaine: 0, streakJours: 0 },
    }
    appointments.value = apptRes.data ?? []
    goals.value = goalsRes.data ?? []
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } }; message?: string }
    error.value = err.response?.data?.error || err.message || 'Impossible de charger le tableau de bord'
  } finally {
    loading.value = false
  }
}

async function exportPdf() {
  exporting.value = true
  try {
    const response = await api.get('/patient/reports/pdf', { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url; link.download = 'rapport-suivi.pdf'
    link.click()
    window.URL.revokeObjectURL(url)
  } finally {
    exporting.value = false
  }
}

onMounted(loadDashboard)
</script>

<template>
  <div v-if="loading" class="dash-loading">
    <v-progress-circular indeterminate color="primary" size="52" width="4" />
  </div>

  <div v-else-if="error" class="dash-error">
    <div class="dash-error__box">
      <div class="dash-error__icon">⚠️</div>
      <h3 class="dash-error__title">Impossible de charger le tableau de bord</h3>
      <p class="dash-error__msg">{{ error }}</p>
      <p class="dash-error__hint">Vérifiez que le serveur backend est démarré sur le port 3000, puis réessayez.</p>
      <button class="dash-error__btn" @click="loadDashboard">Réessayer</button>
    </div>
  </div>

  <div v-else-if="data" class="dashboard">

    <!-- Header -->
    <div class="dash-header">
      <div>
        <p class="section-label">Espace patient</p>
        <h1 class="dash-header__title">Bonjour, votre santé aujourd'hui</h1>
        <p class="dash-header__sub">
          Stade recommandé :
          <span class="stage-tag">{{ data.summary.stadeRecommande }}</span>
        </p>
      </div>
      <v-btn color="primary" variant="flat" prepend-icon="mdi-file-pdf-box" :loading="exporting" @click="exportPdf">
        Exporter PDF
      </v-btn>
    </div>

    <!-- Row 1: 4 KPI cards -->
    <section class="dash-section">
      <p class="section-label">Indicateurs clés</p>
      <div class="dash-grid dash-grid--4">
        <StatCard title="Poids actuel" :value="data.summary.poids ?? '—'" unit="kg" icon="mdi-scale-bathroom" color="primary" />
        <StatCard title="Tension artérielle" :value="data.summary.tension ?? '—'" unit="mmHg" icon="mdi-heart-pulse" color="error" />
        <StatCard title="LDL cholestérol" :value="data.summary.ldl ?? '—'" unit="g/L" icon="mdi-water" color="info" />
        <StatCard
          title="Activité hebdomadaire"
          :value="data.summary.activiteMinutes"
          unit="min"
          icon="mdi-run-fast"
          color="secondary"
          :subtitle="data.summary.activiteMinutes >= 150 ? 'Objectif atteint ✓' : 'Objectif : 150 min'"
        />
      </div>
    </section>

    <!-- Row 2: Score + Adherence + Exercise -->
    <section class="dash-section">
      <p class="section-label">Score de santé &amp; progression</p>
      <div class="dash-grid dash-grid--3">

        <!-- Cardiac score gauge -->
        <RiskScoreGauge :score="data.summary.cardiacScore" />

        <!-- Adherence card -->
        <div class="info-card info-card--blue">
          <div class="info-card__header">
            <div class="info-card__icon-wrap">
              <v-icon size="20" color="white">mdi-pill</v-icon>
            </div>
            <span class="info-card__title">Adhésion médicamenteuse</span>
          </div>
          <div class="info-card__value">
            {{ data.summary.adherence }}<span class="info-card__unit">%</span>
          </div>
          <v-progress-linear
            :model-value="data.summary.adherence"
            :color="adherenceColor"
            bg-color="#F1F5F9"
            rounded height="8"
            class="mb-3"
          />
          <div class="adherence-status" :style="{ color: adherenceColor }">
            <v-icon size="14" class="mr-1">{{ data.summary.adherence >= 90 ? 'mdi-check-circle' : 'mdi-alert-circle-outline' }}</v-icon>
            {{ data.summary.adherence >= 90 ? 'Excellente adhésion' : data.summary.adherence >= 70 ? 'Adhésion correcte' : 'Adhésion à améliorer' }}
          </div>
        </div>

        <!-- Exercise card -->
        <div class="info-card info-card--green">
          <div class="info-card__header">
            <div class="info-card__icon-wrap info-card__icon-wrap--green">
              <v-icon size="20" color="white">mdi-run-fast</v-icon>
            </div>
            <span class="info-card__title">Activité cette semaine</span>
          </div>
          <div class="exercise-ring">
            <svg viewBox="0 0 80 80" class="exercise-ring__svg">
              <circle cx="40" cy="40" r="30" stroke="#F1F5F9" stroke-width="8" fill="none" />
              <circle cx="40" cy="40" r="30" stroke="#10B981" stroke-width="8" fill="none"
                stroke-dasharray="188.5"
                :stroke-dashoffset="188.5 - (188.5 * exercisePercent / 100)"
                stroke-linecap="round" transform="rotate(-90 40 40)"
                style="transition: stroke-dashoffset 1s ease"
              />
              <text x="40" y="44" text-anchor="middle" fill="#0F172A" font-size="14" font-weight="700" font-family="Inter,sans-serif">{{ exercisePercent }}%</text>
            </svg>
          </div>
          <div class="exercise-stats">
            <div class="exercise-stat">
              <span class="exercise-stat__val">{{ data.progressionExercice.minutesCetteSemaine }}</span>
              <span class="exercise-stat__label">/ {{ data.progressionExercice.objectifMinutes }} min</span>
            </div>
            <div class="exercise-stat">
              <v-icon size="14" color="#10B981" class="mr-1">mdi-fire</v-icon>
              <span class="exercise-stat__label">Streak {{ data.progressionExercice.streakJours }}j</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Row 3: Today's medications + Appointments -->
    <section class="dash-section">
      <p class="section-label">Aujourd'hui</p>
      <div class="dash-grid dash-grid--2">

        <!-- Medications today -->
        <div class="panel-card">
          <div class="panel-card__header">
            <span class="panel-card__title">
              <v-icon size="18" color="#2563EB" class="mr-2">mdi-pill</v-icon>
              Médicaments du jour
            </span>
            <router-link to="/patient/medicaments" class="panel-card__link">Tout voir</router-link>
          </div>
          <div class="med-list">
            <div v-for="med in data.medicationsToday" :key="med.nom" class="med-item" :class="{ 'med-item--done': med.pris }">
              <div class="med-item__check" :class="{ 'med-item__check--done': med.pris }">
                <v-icon size="14" :color="med.pris ? 'white' : '#CBD5E1'">mdi-check</v-icon>
              </div>
              <div class="med-item__info">
                <p class="med-item__name">{{ med.nom }}</p>
                <p class="med-item__time">{{ med.heure }}</p>
              </div>
              <span class="med-item__status">{{ med.pris ? 'Pris' : 'À prendre' }}</span>
            </div>
          </div>
        </div>

        <!-- Upcoming appointments + Goals -->
        <div class="panel-card">
          <div class="panel-card__header">
            <span class="panel-card__title">Prochain rendez-vous</span>
            <router-link to="/patient/rendez-vous" class="panel-link">Tous →</router-link>
          </div>
          <div v-if="nextAppointment" class="next-rdv">
            <div class="next-rdv__date">
              <p class="next-rdv__day">{{ new Date(nextAppointment.dateTime).getDate() }}</p>
              <p class="next-rdv__mon">{{ new Date(nextAppointment.dateTime).toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase() }}</p>
            </div>
            <div class="next-rdv__info">
              <p class="next-rdv__time">{{ new Date(nextAppointment.dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }}</p>
              <p class="next-rdv__doc">Dr. {{ nextAppointment.doctor?.nomComplet }}</p>
              <p v-if="nextAppointment.motif" class="next-rdv__motif">{{ nextAppointment.motif }}</p>
            </div>
            <span class="rdv-status" :class="nextAppointment.status === 'confirmed' ? 'rdv-status--green' : 'rdv-status--amber'">
              {{ nextAppointment.status === 'confirmed' ? 'Confirmé' : 'En attente' }}
            </span>
          </div>
          <div v-else class="panel-card__empty">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <p>Aucun rendez-vous planifié</p>
          </div>

          <!-- Health goals -->
          <div v-if="goals.length" class="goals-section">
            <p class="goals-section__title">Objectifs de santé</p>
            <div v-for="g in goals" :key="g.id" class="goal-row">
              <div class="goal-row__info">
                <span class="goal-row__label">{{ g.label }}</span>
                <span class="goal-row__vals">
                  <span :style="{ color: g.current !== null && g.current <= g.target ? '#10B981' : '#EF4444', fontWeight: 700 }">
                    {{ g.current ?? '—' }}
                  </span> / {{ g.target }} {{ g.unit }}
                </span>
              </div>
              <div class="goal-bar">
                <div class="goal-bar__fill"
                  :style="{
                    width: g.current !== null ? Math.min(100, Math.round((g.current/g.target)*100)) + '%' : '0%',
                    background: g.current !== null && g.current <= g.target ? '#10B981' : '#EF4444'
                  }" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Row 4: Weight + Blood pressure charts -->
    <section class="dash-section">
      <p class="section-label">Évolution des mesures</p>
      <div class="dash-grid dash-grid--2">
        <EvolutionChart
          title="Évolution du poids"
          :labels="chartLabels"
          :datasets="[{ label: 'Poids', data: data.charts.poids.map(d => d.value), borderColor: '#2563EB', backgroundColor: 'rgba(37,99,235,0.07)' }]"
          unit="kg"
          :height="240"
        />
        <EvolutionChart
          title="Tension artérielle"
          :labels="chartLabels"
          :datasets="[
            { label: 'Systolique', data: data.charts.tension.map(d => d.sys), borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.07)' },
            { label: 'Diastolique', data: data.charts.tension.map(d => d.dia), borderColor: '#2563EB', backgroundColor: 'rgba(37,99,235,0.07)' },
          ]"
          unit="mmHg"
          :height="240"
        />
      </div>
    </section>

    <!-- Row 5: LDL + Activity charts -->
    <section class="dash-section">
      <p class="section-label">Cholestérol &amp; activité physique</p>
      <div class="dash-grid dash-grid--2">
        <EvolutionChart
          title="Évolution du LDL cholestérol"
          :labels="chartLabels"
          :datasets="[{ label: 'LDL', data: data.charts.ldl.map(d => d.value), borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.07)' }]"
          unit="g/L"
          :height="220"
        />
        <EvolutionChart
          title="Activité physique hebdomadaire"
          :labels="chartLabels"
          :datasets="[{ label: 'Minutes', data: data.charts.activite.map(d => d.value), borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.07)' }]"
          unit="min"
          :height="220"
        />
      </div>
    </section>

    <!-- Row 6: Recommendations + Risk factors -->
    <section class="dash-section">
      <p class="section-label">Recommandations &amp; risques</p>
      <div class="dash-grid dash-grid--2">

        <!-- Recommendations -->
        <div class="panel-card">
          <div class="panel-card__header">
            <span class="panel-card__title">
              <v-icon size="18" color="#2563EB" class="mr-2">mdi-clipboard-text-outline</v-icon>
              Dernières recommandations
            </span>
            <router-link to="/patient/rapports" class="panel-card__link">Tout voir</router-link>
          </div>
          <div class="reco-list">
            <div v-for="r in data.recommandations" :key="r.id" class="reco-item" :class="{ 'reco-item--urgent': r.urgence }">
              <div class="reco-item__dot" :class="{ 'reco-item__dot--urgent': r.urgence }" />
              <div class="reco-item__body">
                <span v-if="r.urgence" class="reco-urgent-tag">Urgent</span>
                <p class="reco-item__text">{{ r.texte }}</p>
                <p class="reco-item__date">{{ new Date(r.date).toLocaleDateString('fr-FR') }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Risk factors -->
        <div class="panel-card">
          <div class="panel-card__header">
            <span class="panel-card__title">
              <v-icon size="18" color="#F59E0B" class="mr-2">mdi-alert-circle-outline</v-icon>
              Facteurs de risque
            </span>
          </div>
          <div class="risk-level-row">
            <div class="risk-level-badge" :class="{
              'risk-level-badge--green': data.risk.niveau === 'LOW',
              'risk-level-badge--yellow': data.risk.niveau === 'MODERATE',
              'risk-level-badge--red': data.risk.niveau === 'HIGH',
            }">
              <span class="risk-level-badge__label">Risque {{ data.risk.niveau === 'LOW' ? 'faible' : data.risk.niveau === 'MODERATE' ? 'modéré' : 'élevé' }}</span>
              <span class="risk-level-badge__score">Score : {{ data.risk.score }}</span>
            </div>
          </div>
          <div v-if="data.risk.facteurs.length" class="risk-factors">
            <div v-for="(f, i) in data.risk.facteurs" :key="i" class="risk-factor-item">
              <v-icon size="14" color="#D97706">mdi-alert-circle</v-icon>
              <span>{{ f }}</span>
            </div>
          </div>
          <div v-else class="risk-empty">
            <v-icon size="40" color="#10B981">mdi-check-circle-outline</v-icon>
            <p>Aucun facteur de risque identifié</p>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<style scoped>
.dash-loading { display: flex; align-items: center; justify-content: center; min-height: 60vh; }
.dashboard { width: 100%; }

.dash-error { display: flex; align-items: center; justify-content: center; min-height: 60vh; }
.dash-error__box { text-align: center; max-width: 440px; padding: 40px; background: #fff; border: 1px solid #FEE2E2; border-radius: 20px; box-shadow: 0 4px 24px rgba(239,68,68,0.08); }
.dash-error__icon { font-size: 40px; margin-bottom: 16px; }
.dash-error__title { font-size: 18px; font-weight: 700; color: #0F172A; margin: 0 0 10px; }
.dash-error__msg { font-size: 14px; color: #EF4444; font-weight: 500; margin: 0 0 8px; font-family: monospace; background: #FEF2F2; padding: 8px 14px; border-radius: 8px; }
.dash-error__hint { font-size: 13px; color: #64748B; margin: 0 0 20px; }
.dash-error__btn { background: #2563EB; color: white; border: none; padding: 10px 24px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; }
.dash-error__btn:hover { background: #1D4ED8; }

/* Header */
.dash-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 32px; gap: 16px; flex-wrap: wrap;
  padding-bottom: 24px; border-bottom: 1px solid #E2E8F0;
}
.dash-header__title { font-size: 24px; font-weight: 800; color: #0F172A; letter-spacing: -0.03em; margin-bottom: 6px; }
.dash-header__sub { font-size: 13px; color: #64748B; }
.stage-tag { font-weight: 700; color: #2563EB; background: #EFF6FF; padding: 2px 8px; border-radius: 6px; }

.dash-section { margin-bottom: 36px; }

/* Info cards (adherence + exercise) */
.info-card {
  background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0;
  padding: 24px; box-shadow: 0 1px 4px rgba(15,23,42,0.06);
}
.info-card--blue { border-top: 3px solid #2563EB; }
.info-card--green { border-top: 3px solid #10B981; }

.info-card__header { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
.info-card__icon-wrap {
  width: 44px; height: 44px; border-radius: 12px; background: #2563EB;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.info-card__icon-wrap--green { background: #10B981; }
.info-card__title { font-size: 15px; font-weight: 600; color: #0F172A; }
.info-card__value { font-size: 40px; font-weight: 800; color: #0F172A; line-height: 1; margin-bottom: 16px; }
.info-card__unit { font-size: 20px; font-weight: 400; color: #94A3B8; margin-left: 2px; }

.adherence-status { font-size: 12px; font-weight: 600; display: flex; align-items: center; margin-top: 6px; }

/* Exercise ring */
.exercise-ring { width: 90px; height: 90px; margin: 0 auto 16px; }
.exercise-ring__svg { width: 100%; height: 100%; }
.exercise-stats { display: flex; align-items: center; justify-content: space-between; }
.exercise-stat { display: flex; align-items: baseline; gap: 2px; }
.exercise-stat__val { font-size: 22px; font-weight: 800; color: #0F172A; }
.exercise-stat__label { font-size: 12px; color: #64748B; font-weight: 500; }

/* Panel cards */
.panel-card {
  background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0;
  padding: 24px; box-shadow: 0 1px 4px rgba(15,23,42,0.06);
}
.panel-card__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.panel-card__title { font-size: 15px; font-weight: 700; color: #0F172A; display: flex; align-items: center; }
.panel-card__link { font-size: 12px; color: #2563EB; font-weight: 600; text-decoration: none; }
.panel-card__link:hover { text-decoration: underline; }

/* Medications */
.med-list { display: flex; flex-direction: column; gap: 10px; }
.med-item {
  display: flex; align-items: center; gap: 14px; padding: 12px 14px;
  border-radius: 10px; border: 1px solid #F1F5F9; background: #FAFAFA; transition: background 0.15s;
}
.med-item--done { opacity: 0.65; }
.med-item__check {
  width: 26px; height: 26px; border-radius: 50%; border: 2px solid #CBD5E1;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.med-item__check--done { background: #10B981; border-color: #10B981; }
.med-item__info { flex: 1; }
.med-item__name { font-size: 14px; font-weight: 600; color: #0F172A; margin: 0 0 2px; }
.med-item__time { font-size: 12px; color: #94A3B8; margin: 0; }
.med-item__status { font-size: 11px; font-weight: 600; color: #64748B; }
.med-item--done .med-item__status { color: #10B981; }

/* RDV */
.rdv-list { display: flex; flex-direction: column; gap: 12px; }
.rdv-item { display: flex; align-items: center; gap: 16px; padding: 14px; border-radius: 12px; border: 1px solid #F1F5F9; background: #FAFAFA; }
.rdv-item__date { width: 44px; text-align: center; background: #EFF6FF; border-radius: 10px; padding: 8px 4px; flex-shrink: 0; }
.rdv-item__day { display: block; font-size: 18px; font-weight: 800; color: #2563EB; line-height: 1; }
.rdv-item__month { display: block; font-size: 10px; font-weight: 600; color: #2563EB; text-transform: uppercase; margin-top: 2px; }
.rdv-item__info { flex: 1; }
.rdv-item__title { font-size: 14px; font-weight: 600; color: #0F172A; margin: 0 0 3px; }
.rdv-item__doc { font-size: 12px; color: #64748B; margin: 0; }
.rdv-type-badge { background: #F1F5F9; color: #64748B; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 6px; }

.panel-link { font-size: 12px; font-weight: 700; color: #2563EB; text-decoration: none; }
.panel-link:hover { text-decoration: underline; }
.panel-card__empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px 12px; color: #94A3B8; font-size: 13px; text-align: center; }

/* Next appointment card */
.next-rdv { display: flex; align-items: center; gap: 16px; padding: 14px; background: #F8FAFC; border-radius: 14px; border: 1px solid #E2E8F0; margin-bottom: 16px; }
.next-rdv__date { text-align: center; background: #EFF6FF; border-radius: 10px; padding: 10px 14px; border: 1px solid #BFDBFE; flex-shrink: 0; }
.next-rdv__day  { font-size: 22px; font-weight: 900; color: #2563EB; margin: 0; line-height: 1; }
.next-rdv__mon  { font-size: 10px; font-weight: 700; color: #93C5FD; text-transform: uppercase; margin: 3px 0 0; }
.next-rdv__info { flex: 1; min-width: 0; }
.next-rdv__time { font-size: 14px; font-weight: 800; color: #0F172A; margin: 0 0 3px; }
.next-rdv__doc  { font-size: 12px; color: #64748B; margin: 0 0 2px; }
.next-rdv__motif { font-size: 12px; color: #94A3B8; font-style: italic; margin: 0; }
.rdv-status { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; flex-shrink: 0; }
.rdv-status--green { background: #ECFDF5; color: #10B981; }
.rdv-status--amber { background: #FFFBEB; color: #D97706; }

/* Goals */
.goals-section { border-top: 1px solid #F1F5F9; padding-top: 14px; margin-top: 4px; display: flex; flex-direction: column; gap: 10px; }
.goals-section__title { font-size: 11px; font-weight: 700; color: #94A3B8; letter-spacing: 0.07em; text-transform: uppercase; margin: 0 0 6px; }
.goal-row { display: flex; flex-direction: column; gap: 5px; }
.goal-row__info { display: flex; align-items: center; justify-content: space-between; }
.goal-row__label { font-size: 12px; font-weight: 600; color: #64748B; }
.goal-row__vals  { font-size: 12px; color: #94A3B8; }
.goal-bar { height: 5px; background: #F1F5F9; border-radius: 3px; overflow: hidden; }
.goal-bar__fill { height: 100%; border-radius: 3px; transition: width 0.4s ease; }

/* Recommendations */
.reco-list { display: flex; flex-direction: column; gap: 12px; }
.reco-item { display: flex; gap: 14px; padding: 14px; border-radius: 12px; border: 1px solid #F1F5F9; }
.reco-item--urgent { border-color: #FECACA; background: #FFF8F8; }
.reco-item__dot { width: 8px; height: 8px; border-radius: 50%; background: #CBD5E1; flex-shrink: 0; margin-top: 5px; }
.reco-item__dot--urgent { background: #EF4444; }
.reco-urgent-tag { display: inline-block; background: #FEE2E2; color: #EF4444; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 5px; margin-bottom: 4px; }
.reco-item__text { font-size: 13px; color: #1E293B; font-weight: 500; margin: 0 0 4px; line-height: 1.5; }
.reco-item__date { font-size: 11px; color: #94A3B8; margin: 0; }

/* Risk */
.risk-level-row { margin-bottom: 16px; }
.risk-level-badge {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; border-radius: 12px;
}
.risk-level-badge--green { background: #ECFDF5; }
.risk-level-badge--yellow { background: #FFFBEB; }
.risk-level-badge--red { background: #FEF2F2; }
.risk-level-badge__label { font-size: 15px; font-weight: 700; color: #0F172A; }
.risk-level-badge__score { font-size: 13px; font-weight: 600; color: #64748B; }
.risk-factors { display: flex; flex-direction: column; gap: 8px; }
.risk-factor-item { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #475569; background: #FFFBEB; border-radius: 8px; padding: 8px 12px; font-weight: 500; }
.risk-empty { display: flex; flex-direction: column; align-items: center; padding: 24px 0; gap: 8px; color: #64748B; font-size: 13px; }
</style>
