<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import api from '@/services/api'
import { Bar, Doughnut, Line } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, PointElement, LineElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { formatChartDate } from '@/utils/date'
import StatCard from '@/components/dashboard/StatCard.vue'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend, Filler)

interface GlobalData {
  kpis: {
    totalPatients: number; patientsActifs: number; totalMedecins: number
    consultationsTotal: number; adherenceMoyenne: number; scoreMoyenCardiaque: number
    alertesGenerees: number; programmesTermines: number
    totalAppointments: number; totalPrescriptions: number; totalGoals: number
  }
  evolutionPatients: { date: string; value: number }[]
  activiteHebdo: { date: string; value: number }[]
  scoreDistribution: { label: string; count: number }[]
  repartitionRisque: { faible: number; modere: number; eleve: number; critique: number }
  alertesRecentes: { id: string; patient: string; medecin: string; type: string; severite: string; date: string }[]
  inscriptionsRecentes: { id: string; nom: string; age: number; medecin: string; date: string; stade: string }[]
  activiteSysteme: { id: string; type: string; message: string; time: string }[]
}

const data = ref<GlobalData | null>(null)
const loading = ref(true)
const error = ref('')

const chartLabels = computed(() => data.value?.evolutionPatients.map(d => formatChartDate(d.date)) || [])

const evolutionChartData = computed(() => ({
  labels: chartLabels.value,
  datasets: [{
    label: 'Patients', data: data.value?.evolutionPatients.map(d => d.value) || [],
    borderColor: '#2563EB', backgroundColor: 'rgba(37,99,235,0.08)',
    fill: true, tension: 0.45, pointRadius: 3, borderWidth: 2.5,
  }],
}))

const activiteChartData = computed(() => ({
  labels: chartLabels.value,
  datasets: [{
    label: 'Minutes d\'activité',
    data: data.value?.activiteHebdo.map(d => d.value) || [],
    backgroundColor: 'rgba(16,185,129,0.85)', borderRadius: 6, borderSkipped: false,
  }],
}))

const repartitionData = computed(() => {
  const r = data.value?.repartitionRisque
  return {
    labels: ['Faible', 'Modéré', 'Élevé', 'Critique'],
    datasets: [{
      data: r ? [r.faible, r.modere, r.eleve, r.critique] : [],
      backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#7C3AED'],
      borderWidth: 0, hoverOffset: 8,
    }],
  }
})

const scoreDistChartData = computed(() => ({
  labels: data.value?.scoreDistribution.map(d => d.label) || [],
  datasets: [{
    label: 'Patients',
    data: data.value?.scoreDistribution.map(d => d.count) || [],
    backgroundColor: ['#EF4444', '#F59E0B', '#10B981', '#2563EB'],
    borderRadius: 6, borderSkipped: false,
  }],
}))

const baseChartOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: false, grid: { color: '#F1F5F9' }, border: { display: false }, ticks: { color: '#94A3B8', font: { size: 11 } } },
    x: { grid: { display: false }, border: { display: false }, ticks: { color: '#94A3B8', font: { size: 11 }, maxRotation: 0 } },
  },
}
const barOpts = { ...baseChartOpts, scales: { ...baseChartOpts.scales, y: { ...baseChartOpts.scales.y, beginAtZero: true } } }
const doughnutOpts = {
  responsive: true, maintainAspectRatio: false, cutout: '72%',
  plugins: { legend: { position: 'bottom' as const, labels: { boxWidth: 10, boxHeight: 10, borderRadius: 4, usePointStyle: true, font: { size: 11 }, color: '#64748B', padding: 12 } } },
}

const severityMeta: Record<string, { bg: string; color: string; label: string }> = {
  HIGH:     { bg: '#FEE2E2', color: '#EF4444', label: 'Élevé' },
  CRITICAL: { bg: '#F3E8FF', color: '#7C3AED', label: 'Critique' },
  MEDIUM:   { bg: '#FEF3C7', color: '#D97706', label: 'Moyen' },
  LOW:      { bg: '#D1FAE5', color: '#10B981', label: 'Faible' },
}

// Timeline event icons as SVG paths
const activityMeta: Record<string, { color: string; svg: string }> = {
  patient:      { color: '#2563EB', svg: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' },
  alert:        { color: '#EF4444', svg: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' },
  followup:     { color: '#F59E0B', svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>' },
  appointment:  { color: '#10B981', svg: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' },
  prescription: { color: '#6366F1', svg: '<path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>' },
  goal:         { color: '#7C3AED', svg: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>' },
  rapport:      { color: '#10B981', svg: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' },
  message:      { color: '#6366F1', svg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' },
}

onMounted(async () => {
  try {
    const { data: res } = await api.get('/global/dashboard')
    data.value = {
      ...res,
      alertesRecentes:    res.alertesRecentes ?? [],
      inscriptionsRecentes: res.inscriptionsRecentes ?? [],
      activiteSysteme:    res.activiteSysteme ?? [],
      evolutionPatients:  res.evolutionPatients ?? [],
      activiteHebdo:      res.activiteHebdo ?? [],
      scoreDistribution:  res.scoreDistribution ?? [],
      repartitionRisque:  res.repartitionRisque ?? { faible: 0, modere: 0, eleve: 0, critique: 0 },
    } as GlobalData
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } }; message?: string }
    error.value = err.response?.data?.error || err.message || 'Erreur de chargement'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="loading" class="dash-loading">
    <v-progress-circular indeterminate color="primary" size="52" width="4" />
  </div>

  <div v-else-if="error" class="dash-error">
    <div class="dash-error__box">
      <div style="font-size:36px;margin-bottom:12px">⚠️</div>
      <h3 style="font-size:17px;font-weight:700;color:#0F172A;margin:0 0 8px">Données indisponibles</h3>
      <p style="font-size:13px;color:#EF4444;margin:0 0 8px;font-family:monospace;background:#FEF2F2;padding:8px 12px;border-radius:8px">{{ error }}</p>
    </div>
  </div>

  <div v-else-if="data" class="overview">

    <!-- Header -->
    <div class="dash-header">
      <div>
        <p class="section-label">Administration</p>
        <h1 class="dash-header__title">Vue d'ensemble de la plateforme</h1>
        <p class="dash-header__sub">Tableau de bord global — toutes les statistiques en temps réel</p>
      </div>
      <div class="header-badge">
        <span class="status-dot" />
        Système opérationnel
      </div>
    </div>

    <!-- Row 1: 8 KPI cards -->
    <section class="dash-section">
      <p class="section-label">Indicateurs globaux</p>
      <div class="dash-grid dash-grid--4">

        <StatCard title="Total patients" :value="data.kpis.totalPatients" color="primary" subtitle="Inscrits sur la plateforme">
          <template #icon>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </template>
        </StatCard>

        <StatCard title="Patients actifs" :value="data.kpis.patientsActifs" color="secondary" subtitle="Suivi actif (4 sem.)">
          <template #icon>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
          </template>
        </StatCard>

        <StatCard title="Médecins" :value="data.kpis.totalMedecins" color="info" subtitle="Praticiens actifs">
          <template #icon>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2" stroke-linecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </template>
        </StatCard>

        <StatCard title="Suivis soumis" :value="data.kpis.consultationsTotal" color="accent" subtitle="Total hebdomadaires">
          <template #icon>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </template>
        </StatCard>

      </div>
      <div class="dash-grid dash-grid--4 mt-grid">

        <StatCard title="Adhésion moy." :value="data.kpis.adherenceMoyenne" unit="%" color="secondary">
          <template #icon>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </template>
        </StatCard>

        <StatCard title="Score cardiaque" :value="data.kpis.scoreMoyenCardiaque" unit="/100" color="primary">
          <template #icon>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </template>
        </StatCard>

        <StatCard title="Alertes générées" :value="data.kpis.alertesGenerees" color="warning">
          <template #icon>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </template>
        </StatCard>

        <StatCard title="Rendez-vous" :value="data.kpis.totalAppointments" color="info" subtitle="Planifiés">
          <template #icon>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </template>
        </StatCard>

      </div>
      <!-- Clinical row -->
      <div class="dash-grid dash-grid--3 mt-grid">

        <StatCard title="Ordonnances" :value="data.kpis.totalPrescriptions" color="accent" subtitle="Prescriptions médicales">
          <template #icon>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/><line x1="15" y1="9" x2="15" y2="21"/></svg>
          </template>
        </StatCard>

        <StatCard title="Objectifs actifs" :value="data.kpis.totalGoals" color="secondary" subtitle="Objectifs de santé">
          <template #icon>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          </template>
        </StatCard>

        <StatCard title="Stades complétés" :value="data.kpis.programmesTermines" color="primary" subtitle="Stade III et IV">
          <template #icon>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </template>
        </StatCard>

      </div>
    </section>

    <!-- Row 2: Charts -->
    <section class="dash-section">
      <p class="section-label">Évolution temporelle</p>
      <div class="dash-grid dash-grid--2">
        <div class="chart-card">
          <div class="chart-card__header"><span class="chart-card__title">Évolution du nombre de patients</span></div>
          <div class="chart-card__body" style="height:240px"><Line :data="evolutionChartData" :options="baseChartOpts" /></div>
        </div>
        <div class="chart-card">
          <div class="chart-card__header"><span class="chart-card__title">Activité physique hebdomadaire (min)</span></div>
          <div class="chart-card__body" style="height:240px"><Bar :data="activiteChartData" :options="barOpts" /></div>
        </div>
      </div>
    </section>

    <!-- Row 3: Risk + Score distribution -->
    <section class="dash-section">
      <p class="section-label">Distribution de santé</p>
      <div class="dash-grid dash-grid--2">
        <div class="chart-card">
          <div class="chart-card__header"><span class="chart-card__title">Répartition des niveaux de risque</span></div>
          <div class="chart-card__body" style="height:260px"><Doughnut :data="repartitionData" :options="doughnutOpts" /></div>
          <div class="risk-legend">
            <div v-for="item in [
              { label:'Faible',   val: data.kpis.totalPatients > 0 ? Math.round(data.repartitionRisque.faible  / data.kpis.totalPatients * 100) : 0, color:'#10B981' },
              { label:'Modéré',  val: data.kpis.totalPatients > 0 ? Math.round(data.repartitionRisque.modere  / data.kpis.totalPatients * 100) : 0, color:'#F59E0B' },
              { label:'Élevé',   val: data.kpis.totalPatients > 0 ? Math.round(data.repartitionRisque.eleve   / data.kpis.totalPatients * 100) : 0, color:'#EF4444' },
              { label:'Critique', val: data.kpis.totalPatients > 0 ? Math.round(data.repartitionRisque.critique / data.kpis.totalPatients * 100) : 0, color:'#7C3AED' },
            ]" :key="item.label" class="risk-legend__item">
              <span class="risk-legend__dot" :style="{ background: item.color }" />
              <span class="risk-legend__label">{{ item.label }}</span>
              <span class="risk-legend__val">{{ item.val }}%</span>
            </div>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-card__header"><span class="chart-card__title">Distribution des scores cardiaques</span></div>
          <div class="chart-card__body" style="height:260px"><Bar :data="scoreDistChartData" :options="barOpts" /></div>
          <p class="chart-card__note">Score de 0 (très risqué) à 100 (excellent)</p>
        </div>
      </div>
    </section>

    <!-- Row 4: Alerts + Registrations -->
    <section class="dash-section">
      <p class="section-label">Activité récente</p>
      <div class="dash-grid dash-grid--2">

        <!-- Alerts -->
        <div class="panel-card">
          <div class="panel-card__header">
            <span class="panel-card__title">Alertes récentes</span>
            <span class="count-badge count-badge--red">{{ data.alertesRecentes.length }}</span>
          </div>
          <div class="alerts-table">
            <div class="alerts-table__head">
              <span>Patient</span><span>Type</span><span>Sévérité</span><span>Date</span>
            </div>
            <div v-for="a in data.alertesRecentes" :key="a.id" class="alerts-table__row">
              <span class="alerts-table__patient">{{ a.patient }}</span>
              <span class="alerts-table__type">{{ a.type }}</span>
              <span>
                <span class="severity-badge"
                  :style="{ background: (severityMeta[a.severite] ?? severityMeta.LOW).bg, color: (severityMeta[a.severite] ?? severityMeta.LOW).color }">
                  {{ (severityMeta[a.severite] ?? severityMeta.LOW).label }}
                </span>
              </span>
              <span class="alerts-table__date">{{ new Date(a.date).toLocaleDateString('fr-FR') }}</span>
            </div>
          </div>
        </div>

        <!-- New registrations -->
        <div class="panel-card">
          <div class="panel-card__header"><span class="panel-card__title">Nouvelles inscriptions</span></div>
          <div class="registrations">
            <div v-for="p in data.inscriptionsRecentes" :key="p.id" class="reg-row">
              <div class="reg-avatar">{{ p.nom.charAt(0) }}</div>
              <div class="reg-info">
                <p class="reg-name">{{ p.nom }}</p>
                <p class="reg-meta">{{ p.age }} ans · {{ p.medecin }}</p>
              </div>
              <div class="reg-right">
                <span class="stage-badge">{{ p.stade }}</span>
                <p class="reg-date">{{ new Date(p.date).toLocaleDateString('fr-FR') }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Row 5: Activity timeline -->
    <section class="dash-section">
      <p class="section-label">Journal d'activité système</p>
      <div class="panel-card">
        <div class="timeline">
          <div v-for="ev in data.activiteSysteme" :key="ev.id" class="timeline-item">
            <div class="timeline-dot" :style="{ background: (activityMeta[ev.type] ?? activityMeta.message).color }">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" v-html="(activityMeta[ev.type] ?? activityMeta.message).svg" />
            </div>
            <div class="timeline-content">
              <p class="timeline-msg">{{ ev.message }}</p>
              <p class="timeline-time">{{ new Date(ev.time).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<style scoped>
.dash-loading { display: flex; align-items: center; justify-content: center; min-height: 60vh; }
.overview { width: 100%; }
.mt-grid { margin-top: 20px; }

.dash-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 32px; gap: 16px; flex-wrap: wrap;
  padding-bottom: 24px; border-bottom: 1px solid #E2E8F0;
}
.dash-header__title { font-size: 24px; font-weight: 800; color: #0F172A; letter-spacing: -0.03em; margin-bottom: 6px; }
.dash-header__sub   { font-size: 14px; color: #64748B; font-weight: 500; }
.section-label { font-size: 11px; font-weight: 700; color: #94A3B8; letter-spacing: 0.07em; text-transform: uppercase; margin: 0 0 16px; }

.header-badge {
  display: flex; align-items: center; gap: 8px; background: #ECFDF5;
  border: 1px solid #A7F3D0; border-radius: 10px; padding: 8px 14px;
  font-size: 12px; font-weight: 700; color: #065F46;
}
.status-dot {
  width: 8px; height: 8px; border-radius: 50%; background: #10B981;
  box-shadow: 0 0 0 3px rgba(16,185,129,0.25);
  animation: pulse 2s infinite;
}
@keyframes pulse { 0%,100% { box-shadow: 0 0 0 3px rgba(16,185,129,0.25); } 50% { box-shadow: 0 0 0 6px rgba(16,185,129,0.1); } }

.dash-section { margin-bottom: 36px; }

.dash-grid { display: grid; gap: 20px; }
.dash-grid--4 { grid-template-columns: repeat(4, 1fr); }
.dash-grid--3 { grid-template-columns: repeat(3, 1fr); }
.dash-grid--2 { grid-template-columns: repeat(2, 1fr); }
@media (max-width: 1100px) { .dash-grid--4 { grid-template-columns: repeat(2, 1fr); } .dash-grid--3 { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 700px) { .dash-grid--4, .dash-grid--3, .dash-grid--2 { grid-template-columns: 1fr; } }

.chart-card {
  background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0;
  padding: 24px; box-shadow: 0 1px 4px rgba(15,23,42,0.06);
}
.chart-card__header { margin-bottom: 20px; }
.chart-card__title  { font-size: 15px; font-weight: 700; color: #0F172A; }
.chart-card__body   { position: relative; }
.chart-card__note   { font-size: 11px; color: #94A3B8; margin-top: 12px; text-align: center; }

.panel-card {
  background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0;
  padding: 24px; box-shadow: 0 1px 4px rgba(15,23,42,0.06);
}
.panel-card__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.panel-card__title  { font-size: 15px; font-weight: 700; color: #0F172A; }

.count-badge { padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
.count-badge--red { background: #FEE2E2; color: #DC2626; }

.risk-legend { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 16px; }
.risk-legend__item  { display: flex; align-items: center; gap: 6px; }
.risk-legend__dot   { width: 8px; height: 8px; border-radius: 50%; }
.risk-legend__label { font-size: 12px; color: #64748B; font-weight: 500; }
.risk-legend__val   { font-size: 12px; font-weight: 700; color: #0F172A; }

.alerts-table__head {
  display: grid; grid-template-columns: 2fr 2fr 1fr 1.2fr;
  font-size: 10px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase;
  color: #94A3B8; padding: 0 4px 10px; border-bottom: 1px solid #F1F5F9;
}
.alerts-table__row {
  display: grid; grid-template-columns: 2fr 2fr 1fr 1.2fr;
  padding: 12px 4px; border-bottom: 1px solid #F8FAFC; align-items: center;
}
.alerts-table__row:last-child { border-bottom: none; }
.alerts-table__patient { font-size: 13px; font-weight: 600; color: #0F172A; }
.alerts-table__type    { font-size: 13px; color: #64748B; }
.alerts-table__date    { font-size: 12px; color: #94A3B8; }
.severity-badge { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }

.registrations { display: flex; flex-direction: column; gap: 12px; }
.reg-row { display: flex; align-items: center; gap: 14px; padding: 14px; border-radius: 12px; border: 1px solid #F1F5F9; background: #FAFAFA; }
.reg-avatar { width: 42px; height: 42px; border-radius: 50%; background: #2563EB; color: white; font-weight: 700; font-size: 15px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.reg-info { flex: 1; min-width: 0; }
.reg-name  { font-size: 14px; font-weight: 700; color: #0F172A; margin: 0 0 2px; }
.reg-meta  { font-size: 12px; color: #64748B; margin: 0; }
.reg-right { text-align: right; }
.stage-badge { display: inline-block; background: #EFF6FF; color: #2563EB; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px; margin-bottom: 4px; }
.reg-date { font-size: 11px; color: #94A3B8; margin: 0; }

.timeline { display: flex; flex-direction: column; }
.timeline-item { display: flex; align-items: flex-start; gap: 16px; padding: 16px 0; border-bottom: 1px solid #F1F5F9; }
.timeline-item:last-child { border-bottom: none; }
.timeline-dot { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.timeline-content { flex: 1; }
.timeline-msg  { font-size: 14px; font-weight: 600; color: #1E293B; margin: 0 0 4px; }
.timeline-time { font-size: 12px; color: #94A3B8; margin: 0; }

.dash-error { display: flex; align-items: center; justify-content: center; min-height: 60vh; }
.dash-error__box { text-align: center; max-width: 440px; padding: 40px; background: #fff; border: 1px solid #FEE2E2; border-radius: 20px; }
</style>
