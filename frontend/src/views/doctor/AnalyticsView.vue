<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import { Pill, HeartPulse, Trophy, TrendingUp, PersonStanding, AlertTriangle } from '@lucide/vue'
import { Bar, Doughnut, Line } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, PointElement, LineElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { formatChartDate } from '@/utils/date'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend, Filler)

interface Analytics {
  adherenceMoyenne: number; scoreMoyen: number; tauxReussite: number
  alertesParSemaine: { date: string; value: number }[]
  adherenceEvolution: { date: string; value: number }[]
  repartitionRisque: { niveau: string; count: number; color: string }[]
  stadeRepartition: { stade: string; count: number }[]
}

const data = ref<Analytics | null>(null)
const loading = ref(true)

const chartLabels = computed(() =>
  data.value?.alertesParSemaine.map(d => formatChartDate(d.date)) || []
)

const alertesChartData = computed(() => ({
  labels: chartLabels.value,
  datasets: [{
    label: 'Alertes', data: data.value?.alertesParSemaine.map(d => d.value) || [],
    backgroundColor: 'rgba(239,68,68,0.8)', borderRadius: 6, borderSkipped: false,
  }],
}))

const adherenceChartData = computed(() => ({
  labels: chartLabels.value,
  datasets: [{
    label: 'Adhésion (%)',
    data: data.value?.adherenceEvolution.map(d => d.value) || [],
    borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.08)',
    fill: true, tension: 0.45, pointRadius: 3, borderWidth: 2.5,
  }],
}))

const riskChartData = computed(() => ({
  labels: data.value?.repartitionRisque.map(d => d.niveau) || [],
  datasets: [{
    data: data.value?.repartitionRisque.map(d => d.count) || [],
    backgroundColor: data.value?.repartitionRisque.map(d => d.color) || [],
    borderWidth: 0, hoverOffset: 8,
  }],
}))

const stadeChartData = computed(() => ({
  labels: data.value?.stadeRepartition.map(d => d.stade) || [],
  datasets: [{
    label: 'Patients',
    data: data.value?.stadeRepartition.map(d => d.count) || [],
    backgroundColor: ['#E0E7FF', '#BFDBFE', '#93C5FD', '#60A5FA'],
    borderRadius: 6, borderSkipped: false,
  }],
}))

const baseOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, grid: { color: '#F1F5F9' }, border: { display: false }, ticks: { color: '#94A3B8', font: { size: 11 } } },
    x: { grid: { display: false }, border: { display: false }, ticks: { color: '#94A3B8', font: { size: 11 }, maxRotation: 0 } },
  },
}

const lineOpts = {
  ...baseOpts,
  scales: {
    ...baseOpts.scales,
    y: { ...baseOpts.scales.y, min: 50, max: 100 },
  },
  plugins: {
    ...baseOpts.plugins,
    tooltip: {
      callbacks: { label: (ctx: { parsed: { y: number } }) => ` ${ctx.parsed.y}%` },
    },
  },
}

const donutOpts = {
  responsive: true, maintainAspectRatio: false, cutout: '70%',
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, font: { size: 11 }, color: '#64748B', padding: 12 },
    },
  },
}

onMounted(async () => {
  try {
    const { data: res } = await api.get('/doctor/analytics')
    data.value = res as Analytics
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="loading" class="dash-loading">
    <v-progress-circular indeterminate color="primary" size="52" width="4" />
  </div>

  <div v-else-if="data" class="analytics-page">

    <div class="dash-header">
      <div>
        <p class="section-label">Analytique médicale</p>
        <h1 class="dash-header__title">Statistiques &amp; Analytique</h1>
        <p class="dash-header__sub">Analyse de la santé populationnelle de vos patients</p>
      </div>
    </div>

    <!-- Row 1: KPI summary -->
    <section class="dash-section">
      <p class="section-label">Indicateurs clés</p>
      <div class="dash-grid dash-grid--3">
        <div class="metric-card">
          <div class="metric-card__icon metric-card__icon--green">
            <Pill :size="20" :stroke-width="1.75" color="white" />
          </div>
          <div>
            <p class="metric-card__val">{{ data.adherenceMoyenne }}<span class="metric-card__unit">%</span></p>
            <p class="metric-card__label">Adhésion médicamenteuse moyenne</p>
          </div>
          <div class="metric-card__bar">
            <div class="metric-card__fill" :style="{ width: `${data.adherenceMoyenne}%`, background: '#10B981' }" />
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-card__icon metric-card__icon--blue">
            <HeartPulse :size="20" :stroke-width="1.75" color="white" />
          </div>
          <div>
            <p class="metric-card__val">{{ data.scoreMoyen }}<span class="metric-card__unit">/100</span></p>
            <p class="metric-card__label">Score cardiaque moyen</p>
          </div>
          <div class="metric-card__bar">
            <div class="metric-card__fill" :style="{ width: `${data.scoreMoyen}%`, background: '#2563EB' }" />
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-card__icon metric-card__icon--purple">
            <Trophy :size="20" :stroke-width="1.75" color="white" />
          </div>
          <div>
            <p class="metric-card__val">{{ data.tauxReussite }}<span class="metric-card__unit">%</span></p>
            <p class="metric-card__label">Taux de réussite rééducation</p>
          </div>
          <div class="metric-card__bar">
            <div class="metric-card__fill" :style="{ width: `${data.tauxReussite}%`, background: '#7C3AED' }" />
          </div>
        </div>
      </div>
    </section>

    <!-- Row 2: Alerts + Adherence evolution -->
    <section class="dash-section">
      <p class="section-label">Évolution temporelle</p>
      <div class="dash-grid dash-grid--2">
        <div class="chart-card">
          <div class="chart-card__header">
            <span class="chart-card__title">Alertes générées par semaine</span>
          </div>
          <div class="chart-card__body" style="height:240px">
            <Bar :data="alertesChartData" :options="baseOpts" />
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-card__header">
            <span class="chart-card__title">Évolution de l'adhésion médicamenteuse</span>
          </div>
          <div class="chart-card__body" style="height:240px">
            <Line :data="adherenceChartData" :options="lineOpts" />
          </div>
        </div>
      </div>
    </section>

    <!-- Row 3: Risk repartition + Stage repartition -->
    <section class="dash-section">
      <p class="section-label">Répartition des patients</p>
      <div class="dash-grid dash-grid--2">
        <div class="chart-card">
          <div class="chart-card__header">
            <span class="chart-card__title">Répartition par niveau de risque</span>
          </div>
          <div class="chart-card__body" style="height:260px">
            <Doughnut :data="riskChartData" :options="donutOpts" />
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-card__header">
            <span class="chart-card__title">Répartition par stade de rééducation</span>
          </div>
          <div class="chart-card__body" style="height:260px">
            <Bar :data="stadeChartData" :options="baseOpts" />
          </div>
        </div>
      </div>
    </section>

    <!-- Row 4: Clinical insights -->
    <section class="dash-section">
      <p class="section-label">Insights cliniques</p>
      <div class="insights-grid">
        <div class="insight-card insight-card--blue">
          <TrendingUp :size="22" :stroke-width="1.75" color="#2563EB" style="margin-bottom:8px" />
          <p class="insight-card__title">Amélioration de l'adhésion</p>
          <p class="insight-card__body">L'adhésion médicamenteuse a augmenté de +17% sur les 12 dernières semaines grâce aux rappels automatiques.</p>
        </div>
        <div class="insight-card insight-card--green">
          <PersonStanding :size="22" :stroke-width="1.75" color="#10B981" style="margin-bottom:8px" />
          <p class="insight-card__title">Activité physique en hausse</p>
          <p class="insight-card__body">Le temps moyen d'activité hebdomadaire est passé de 92 à 148 min en 3 mois.</p>
        </div>
        <div class="insight-card insight-card--orange">
          <AlertTriangle :size="22" :stroke-width="1.75" color="#D97706" style="margin-bottom:8px" />
          <p class="insight-card__title">Alertes tensions fréquentes</p>
          <p class="insight-card__body">60% des alertes concernent la tension artérielle. Un suivi renforcé est recommandé.</p>
        </div>
      </div>
    </section>

  </div>
</template>

<style scoped>
.dash-loading { display: flex; align-items: center; justify-content: center; min-height: 60vh; }
.analytics-page { width: 100%; }

.dash-header { margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #E2E8F0; }
.dash-header__title { font-size: 24px; font-weight: 800; color: #0F172A; letter-spacing: -0.03em; margin-bottom: 6px; }
.dash-header__sub { font-size: 14px; color: #64748B; font-weight: 500; }
.dash-section { margin-bottom: 36px; }

/* Metric cards */
.metric-card {
  background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px;
  padding: 24px; box-shadow: 0 1px 4px rgba(15,23,42,0.06);
  display: flex; flex-direction: column; gap: 12px;
}
.metric-card__icon {
  width: 48px; height: 48px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
}
.metric-card__icon--green { background: #10B981; }
.metric-card__icon--blue { background: #2563EB; }
.metric-card__icon--purple { background: #7C3AED; }
.metric-card__val { font-size: 40px; font-weight: 800; color: #0F172A; line-height: 1; margin: 0 0 4px; font-family: 'Inter', sans-serif; }
.metric-card__unit { font-size: 18px; font-weight: 400; color: #94A3B8; margin-left: 2px; }
.metric-card__label { font-size: 13px; color: #64748B; font-weight: 500; margin: 0; }
.metric-card__bar { height: 6px; background: #F1F5F9; border-radius: 3px; overflow: hidden; }
.metric-card__fill { height: 100%; border-radius: 3px; transition: width 1s ease; }

/* Chart cards */
.chart-card {
  background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0;
  padding: 24px; box-shadow: 0 1px 4px rgba(15,23,42,0.06);
}
.chart-card__header { margin-bottom: 20px; }
.chart-card__title { font-size: 15px; font-weight: 700; color: #0F172A; }
.chart-card__body { position: relative; }

/* Insights */
.insights-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
@media (max-width: 960px) { .insights-grid { grid-template-columns: 1fr; } }

.insight-card {
  border-radius: 16px; padding: 24px; border: 1px solid transparent;
}
.insight-card--blue { background: #EFF6FF; border-color: #BFDBFE; }
.insight-card--green { background: #ECFDF5; border-color: #A7F3D0; }
.insight-card--orange { background: #FFFBEB; border-color: #FDE68A; }
.insight-card__title { font-size: 15px; font-weight: 700; color: #0F172A; margin: 0 0 8px; }
.insight-card__body { font-size: 13px; color: #64748B; line-height: 1.6; margin: 0; }
</style>
