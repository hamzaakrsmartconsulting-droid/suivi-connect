<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/services/api'
import { FileText, Download, AlertTriangle, TrendingUp, Clock } from '@lucide/vue'

interface Reports {
  rapports: { id: string; titre: string; date: string; type: string; pages: number }[]
  recommandations: { id: string; auteur: string; date: string; texte: string; priorite: string }[]
}

const data = ref<Reports | null>(null)
const loading = ref(true)
const downloading = ref<string | null>(null)

async function download(id: string) {
  downloading.value = id
  try {
    const response = await api.get('/patient/reports/pdf', { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url; link.download = 'rapport-suivi.pdf'
    link.click()
    window.URL.revokeObjectURL(url)
  } finally {
    downloading.value = null
  }
}

onMounted(async () => {
  try {
    const { data: res } = await api.get('/patient/reports')
    data.value = res as Reports
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="loading" class="dash-loading">
    <v-progress-circular indeterminate color="primary" size="52" width="4" />
  </div>

  <div v-else-if="data" class="reports-page">

    <div class="dash-header">
      <div>
        <p class="section-label">Espace patient</p>
        <h1 class="dash-header__title">Rapports &amp; Recommandations</h1>
        <p class="dash-header__sub">Téléchargez vos rapports médicaux et consultez les recommandations de votre médecin</p>
      </div>
    </div>

    <!-- Reports -->
    <section class="dash-section">
      <p class="section-label">Rapports disponibles</p>
      <div class="reports-grid">
        <div v-for="r in data.rapports" :key="r.id" class="report-card">
          <div class="report-card__icon">
            <FileText :size="26" color="#2563EB" />
          </div>
          <div class="report-card__info">
            <p class="report-card__title">{{ r.titre }}</p>
            <p class="report-card__meta">{{ r.pages }} pages · {{ new Date(r.date).toLocaleDateString('fr-FR') }}</p>
            <span class="report-card__type">{{ r.type }}</span>
          </div>
          <button class="dl-btn" :disabled="downloading === r.id" @click="download(r.id)">
            <Download :size="15" />
            {{ downloading === r.id ? '...' : 'Télécharger' }}
          </button>
        </div>
      </div>
    </section>

    <!-- Recommendations -->
    <section class="dash-section">
      <p class="section-label">Recommandations médicales</p>
      <div class="reco-list">
        <div v-for="r in data.recommandations" :key="r.id" class="reco-card">
          <div class="reco-card__accent" :class="r.priorite === 'urgent' ? 'reco-card__accent--urgent' : ''" />
          <div class="reco-card__body">
            <div class="reco-card__header">
              <div class="reco-card__author">
                <div class="reco-card__avatar">D</div>
                <span class="reco-card__doc">{{ r.auteur }}</span>
              </div>
              <div class="reco-card__badges">
                <span v-if="r.priorite === 'urgent'" class="reco-badge reco-badge--urgent">
                  <AlertTriangle :size="10" style="margin-right:3px" />Urgent
                </span>
                <span class="reco-card__date">{{ new Date(r.date).toLocaleDateString('fr-FR') }}</span>
              </div>
            </div>
            <p class="reco-card__text">{{ r.texte }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Health history info card -->
    <section class="dash-section">
      <p class="section-label">Historique de santé</p>
      <div class="history-info">
        <TrendingUp :size="40" color="#2563EB" class="history-info__icon" />
        <div>
          <p class="history-info__title">Historique complet disponible</p>
          <p class="history-info__sub">Consultez votre suivi hebdomadaire pour voir l'évolution complète de vos mesures de santé au fil du temps.</p>
          <router-link to="/patient/suivi-hebdomadaire" class="history-btn">
            <Clock :size="15" /> Voir le suivi hebdomadaire
          </router-link>
        </div>
      </div>
    </section>

  </div>
</template>

<style scoped>
.dash-loading { display: flex; align-items: center; justify-content: center; min-height: 60vh; }
.reports-page { width: 100%; }

.dash-header { margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #E2E8F0; }
.dash-header__title { font-size: 24px; font-weight: 800; color: #0F172A; letter-spacing: -0.03em; margin-bottom: 6px; }
.dash-header__sub { font-size: 14px; color: #64748B; font-weight: 500; }
.dash-section { margin-bottom: 36px; }

/* Reports grid */
.reports-grid { display: flex; flex-direction: column; gap: 12px; }
.report-card {
  display: flex; align-items: center; gap: 20px; background: #FFFFFF;
  border: 1px solid #E2E8F0; border-radius: 16px; padding: 20px 24px;
  box-shadow: 0 1px 4px rgba(15,23,42,0.06); transition: box-shadow 0.2s;
}
.report-card:hover { box-shadow: 0 4px 16px rgba(15,23,42,0.10); }
.report-card__icon { width: 56px; height: 56px; border-radius: 14px; background: #EFF6FF; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.report-card__info { flex: 1; min-width: 0; }
.report-card__title { font-size: 15px; font-weight: 700; color: #0F172A; margin: 0 0 4px; }
.report-card__meta { font-size: 13px; color: #64748B; margin: 0 0 6px; }
.report-card__type { background: #F1F5F9; color: #64748B; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 6px; }

/* Recommendations */
.reco-list { display: flex; flex-direction: column; gap: 14px; }
.reco-card {
  display: flex; background: #FFFFFF; border: 1px solid #E2E8F0;
  border-radius: 16px; overflow: hidden; box-shadow: 0 1px 4px rgba(15,23,42,0.06);
}
.reco-card__accent { width: 4px; background: #E2E8F0; flex-shrink: 0; }
.reco-card__accent--urgent { background: #EF4444; }
.reco-card__body { flex: 1; padding: 20px 24px; }
.reco-card__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
.reco-card__author { display: flex; align-items: center; gap: 10px; }
.reco-card__avatar { width: 30px; height: 30px; border-radius: 50%; background: #2563EB; color: white; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.reco-card__doc { font-size: 13px; font-weight: 600; color: #64748B; }
.reco-card__badges { display: flex; align-items: center; gap: 10px; }
.reco-badge { display: inline-flex; align-items: center; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px; }
.reco-badge--urgent { background: #FEE2E2; color: #EF4444; }
.reco-card__date { font-size: 12px; color: #94A3B8; }
.reco-card__text { font-size: 14px; color: #1E293B; line-height: 1.6; margin: 0; font-weight: 500; }

/* History info */
.history-info {
  display: flex; align-items: flex-start; gap: 24px; background: #EFF6FF;
  border: 1px solid #BFDBFE; border-radius: 16px; padding: 28px 32px;
}
.history-info__icon { flex-shrink: 0; margin-top: 4px; }
.history-info__title { font-size: 17px; font-weight: 700; color: #1E40AF; margin: 0 0 6px; }
.history-info__sub { font-size: 14px; color: #1E40AF; opacity: 0.8; margin: 0; line-height: 1.5; }

.dl-btn {
  display: inline-flex; align-items: center; gap: 6px;
  background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE;
  padding: 8px 16px; border-radius: 10px; font-size: 13px; font-weight: 600;
  cursor: pointer; white-space: nowrap; transition: background 0.15s;
}
.dl-btn:hover { background: #DBEAFE; }
.dl-btn:disabled { opacity: 0.6; cursor: default; }

.history-btn {
  display: inline-flex; align-items: center; gap: 8px; margin-top: 12px;
  background: #2563EB; color: white; padding: 10px 20px; border-radius: 10px;
  font-size: 13px; font-weight: 600; text-decoration: none; transition: background 0.15s;
}
.history-btn:hover { background: #1D4ED8; }
</style>
