<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Component } from 'vue'
import { HeartPulse, Droplets, Weight, Pill, Activity, AlertTriangle, CheckCheck, Octagon, Bell, CheckCircle, Search } from '@lucide/vue'
import api from '@/services/api'

interface Alert {
  id: string; type: string; severite: string; message: string; lu: boolean; createdAt: string
  patient: { id: string; nomComplet: string; age: number }
}

const alerts = ref<Alert[]>([])
const loading = ref(true)
const filter = ref<'all' | 'unread' | 'HIGH' | 'CRITICAL' | 'MEDIUM' | 'LOW'>('all')
const search = ref('')

const filteredAlerts = computed(() => {
  let list = alerts.value
  if (filter.value === 'unread') list = list.filter(a => !a.lu)
  else if (filter.value !== 'all') list = list.filter(a => a.severite === filter.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(a => a.patient.nomComplet.toLowerCase().includes(q) || a.message.toLowerCase().includes(q))
  }
  return list
})

const unreadCount = computed(() => alerts.value.filter(a => !a.lu).length)

const criticalCount = computed(() => alerts.value.filter(a => a.severite === 'CRITICAL' || a.severite === 'HIGH').length)

const severityMeta: Record<string, { bg: string; color: string; label: string }> = {
  CRITICAL: { bg: '#F3E8FF', color: '#7C3AED', label: 'Critique' },
  HIGH: { bg: '#FEE2E2', color: '#EF4444', label: 'Élevé' },
  MEDIUM: { bg: '#FEF3C7', color: '#D97706', label: 'Moyen' },
  LOW: { bg: '#D1FAE5', color: '#10B981', label: 'Faible' },
}

const typeIcon: Record<string, Component> = {
  BLOOD_PRESSURE: HeartPulse,
  LDL: Droplets,
  WEIGHT: Weight,
  MEDICATION: Pill,
  ACTIVITY: Activity,
  GENERAL: AlertTriangle,
}

const typeMeta: Record<string, string> = {
  BLOOD_PRESSURE: 'Tension artérielle',
  LDL: 'LDL cholestérol',
  WEIGHT: 'Poids',
  MEDICATION: 'Médicaments',
  ACTIVITY: 'Activité physique',
  GENERAL: 'Général',
}

async function markRead(id: string) {
  const a = alerts.value.find(x => x.id === id)
  if (a) a.lu = true
}

async function markAllRead() {
  alerts.value.forEach(a => a.lu = true)
}

onMounted(async () => {
  try {
    const { data } = await api.get('/doctor/alerts')
    alerts.value = data as Alert[]
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="loading" class="dash-loading">
    <v-progress-circular indeterminate color="primary" size="52" width="4" />
  </div>

  <div v-else class="alerts-page">

    <!-- Header -->
    <div class="dash-header">
      <div>
        <p class="section-label">Monitoring clinique</p>
        <h1 class="dash-header__title">Alertes &amp; Anomalies</h1>
        <p class="dash-header__sub">Surveillance en temps réel des indicateurs de vos patients</p>
      </div>
      <v-btn v-if="unreadCount > 0" variant="tonal" color="primary" @click="markAllRead">
        <template #prepend><CheckCheck :size="14" :stroke-width="2" /></template>
        Tout marquer lu
      </v-btn>
    </div>

    <!-- Summary KPIs -->
    <div class="summary-row">
      <div class="summary-card">
        <div class="summary-card__icon summary-card__icon--red">
          <Octagon :size="19" :stroke-width="1.75" color="white" />
        </div>
        <div>
          <p class="summary-card__val">{{ criticalCount }}</p>
          <p class="summary-card__label">Critiques / Élevées</p>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-card__icon summary-card__icon--blue">
          <Bell :size="19" :stroke-width="1.75" color="white" />
        </div>
        <div>
          <p class="summary-card__val">{{ unreadCount }}</p>
          <p class="summary-card__label">Non lues</p>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-card__icon summary-card__icon--green">
          <CheckCircle :size="19" :stroke-width="1.75" color="white" />
        </div>
        <div>
          <p class="summary-card__val">{{ alerts.length - unreadCount }}</p>
          <p class="summary-card__label">Traitées</p>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-card__icon summary-card__icon--grey">
          <Bell :size="19" :stroke-width="1.75" color="white" />
        </div>
        <div>
          <p class="summary-card__val">{{ alerts.length }}</p>
          <p class="summary-card__label">Total</p>
        </div>
      </div>
    </div>

    <!-- Filters + search -->
    <div class="filter-bar">
      <div class="filter-chips">
        <button
          v-for="f in [
            { key:'all', label:'Toutes' },
            { key:'unread', label:'Non lues' },
            { key:'CRITICAL', label:'Critique' },
            { key:'HIGH', label:'Élevé' },
            { key:'MEDIUM', label:'Moyen' },
            { key:'LOW', label:'Faible' },
          ]"
          :key="f.key"
          class="filter-chip"
          :class="{ 'filter-chip--active': filter === f.key }"
          @click="filter = f.key as typeof filter"
        >
          {{ f.label }}
        </button>
      </div>
      <div class="filter-search">
        <Search :size="15" :stroke-width="1.75" color="#94A3B8" />
        <input v-model="search" placeholder="Rechercher…" class="filter-search__input" />
      </div>
    </div>

    <!-- Alerts list -->
    <div v-if="filteredAlerts.length" class="alerts-list">
      <div
        v-for="alert in filteredAlerts"
        :key="alert.id"
        class="alert-card"
        :class="{ 'alert-card--unread': !alert.lu }"
        @click="markRead(alert.id)"
      >
        <div
          class="alert-card__icon"
          :style="{
            background: (severityMeta[alert.severite]||severityMeta.LOW).bg,
            color: (severityMeta[alert.severite]||severityMeta.LOW).color,
          }"
        >
          <component
            :is="typeIcon[alert.type] || AlertTriangle"
            :size="19"
            :stroke-width="1.75"
            :color="(severityMeta[alert.severite]||severityMeta.LOW).color"
          />
        </div>

        <div class="alert-card__body">
          <div class="alert-card__row1">
            <span class="alert-card__patient">{{ alert.patient.nomComplet }}</span>
            <span class="alert-card__age">{{ alert.patient.age }} ans</span>
            <span
              class="severity-pill"
              :style="{
                background: (severityMeta[alert.severite]||severityMeta.LOW).bg,
                color: (severityMeta[alert.severite]||severityMeta.LOW).color,
              }"
            >
              {{ (severityMeta[alert.severite]||severityMeta.LOW).label }}
            </span>
            <span v-if="!alert.lu" class="unread-dot" />
          </div>
          <p class="alert-card__msg">{{ alert.message }}</p>
          <div class="alert-card__footer">
            <span class="alert-card__type-tag">{{ typeMeta[alert.type] || 'Général' }}</span>
            <span class="alert-card__date">{{ new Date(alert.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) }}</span>
          </div>
        </div>

        <div class="alert-card__actions">
          <v-btn
            size="small"
            color="primary"
            variant="tonal"
            :to="`/medecin/patients/${alert.patient.id}`"
            @click.stop
          >
            Voir patient
          </v-btn>
        </div>
      </div>
    </div>

    <div v-else class="alerts-empty">
      <CheckCircle :size="52" :stroke-width="1.25" color="#CBD5E1" />
      <p class="alerts-empty__title">Aucune alerte</p>
      <p class="alerts-empty__sub">Aucun résultat pour ce filtre.</p>
    </div>

  </div>
</template>

<style scoped>
.dash-loading { display: flex; align-items: center; justify-content: center; min-height: 60vh; }
.alerts-page { width: 100%; }

.dash-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 28px; gap: 16px; flex-wrap: wrap;
  padding-bottom: 24px; border-bottom: 1px solid #E2E8F0;
}
.dash-header__title { font-size: 24px; font-weight: 800; color: #0F172A; letter-spacing: -0.03em; margin-bottom: 6px; }
.dash-header__sub { font-size: 14px; color: #64748B; font-weight: 500; }

/* Summary row */
.summary-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
@media (max-width: 960px) { .summary-row { grid-template-columns: repeat(2, 1fr); } }

.summary-card {
  background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px;
  padding: 18px 20px; display: flex; align-items: center; gap: 16px;
  box-shadow: 0 1px 4px rgba(15,23,42,0.06);
}
.summary-card__icon {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.summary-card__icon--red { background: #EF4444; }
.summary-card__icon--blue { background: #2563EB; }
.summary-card__icon--green { background: #10B981; }
.summary-card__icon--grey { background: #94A3B8; }
.summary-card__val { font-size: 28px; font-weight: 800; color: #0F172A; line-height: 1; margin: 0 0 4px; }
.summary-card__label { font-size: 12px; color: #64748B; font-weight: 500; margin: 0; }

/* Filters */
.filter-bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.filter-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.filter-chip {
  padding: 7px 14px; border-radius: 8px; border: 1px solid #E2E8F0;
  background: #FFFFFF; font-size: 13px; font-weight: 500; color: #64748B;
  cursor: pointer; transition: all 0.15s;
}
.filter-chip:hover { border-color: #2563EB; color: #2563EB; }
.filter-chip--active { background: #2563EB; border-color: #2563EB; color: #FFFFFF; font-weight: 600; }
.filter-search {
  display: flex; align-items: center; gap: 8px; background: #FFFFFF;
  border: 1px solid #E2E8F0; border-radius: 10px; padding: 8px 14px; min-width: 220px;
}
.filter-search__input { border: none; outline: none; font-size: 13px; color: #0F172A; background: transparent; width: 100%; }

/* Alert cards */
.alerts-list { display: flex; flex-direction: column; gap: 12px; }
.alert-card {
  display: flex; align-items: center; gap: 20px; background: #FFFFFF;
  border: 1px solid #E2E8F0; border-radius: 16px; padding: 20px 24px;
  box-shadow: 0 1px 4px rgba(15,23,42,0.06); cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s;
}
.alert-card:hover { box-shadow: 0 4px 16px rgba(15,23,42,0.10); border-color: #CBD5E1; }
.alert-card--unread { border-left: 4px solid #2563EB; background: #FAFCFF; }

.alert-card__icon {
  width: 48px; height: 48px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}

.alert-card__body { flex: 1; min-width: 0; }
.alert-card__row1 { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; flex-wrap: wrap; }
.alert-card__patient { font-size: 15px; font-weight: 700; color: #0F172A; }
.alert-card__age { font-size: 12px; color: #94A3B8; }
.alert-card__msg { font-size: 14px; color: #334155; font-weight: 500; margin: 0 0 10px; line-height: 1.5; }
.alert-card__footer { display: flex; align-items: center; gap: 12px; }
.alert-card__type-tag {
  background: #F1F5F9; color: #64748B; font-size: 11px; font-weight: 600;
  padding: 2px 8px; border-radius: 6px;
}
.alert-card__date { font-size: 12px; color: #94A3B8; }

.severity-pill {
  display: inline-block; padding: 3px 10px; border-radius: 8px;
  font-size: 11px; font-weight: 700;
}
.unread-dot {
  width: 8px; height: 8px; border-radius: 50%; background: #2563EB; flex-shrink: 0;
}
.alert-card__actions { flex-shrink: 0; }

.alerts-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; padding: 64px 0; text-align: center;
}
.alerts-empty__title { font-size: 18px; font-weight: 700; color: #0F172A; margin: 0; }
.alerts-empty__sub { font-size: 14px; color: #94A3B8; margin: 0; }
</style>
