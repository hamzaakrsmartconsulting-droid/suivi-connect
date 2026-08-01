<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/api'
import OrdonnancePreview from '@/components/medical/OrdonnancePreview.vue'

const route  = useRoute()
const router = useRouter()
const window = globalThis.window

const loading    = ref(true)
const errorMsg   = ref('')
const patient    = ref<any>(null)
const currentRisk = ref<any>(null)
const goals      = ref<any[]>([])
const doctor     = ref<any>(null)

// Ordonnance preview
const showOrdonnance      = ref(false)
const ordonnanceMeds      = ref<any[]>([])
const ordonnanceSuccessMsg = ref('')

function onOrdonnanceValidated(downloadUrl: string) {
  showOrdonnance.value = false
  ordonnanceSuccessMsg.value = `✓ Ordonnance envoyée au patient avec succès.`
  setTimeout(() => { ordonnanceSuccessMsg.value = '' }, 5000)
}

// Follow-up table
const followUpPage  = ref(1)
const followUpsPerPage = 10
const followUpsDesc = ref(true) // newest first

// Inline doctor note editing
const editingNote = ref<Record<string, string>>({})
const savingNote  = ref<Record<string, boolean>>({})

async function saveNote(followUpId: string) {
  savingNote.value[followUpId] = true
  try {
    await api.patch(`/doctor/patients/${route.params.id}/follow-ups/${followUpId}/note`, {
      note: editingNote.value[followUpId] ?? '',
    })
    const fu = patient.value.followUps.find((f: any) => f.id === followUpId)
    if (fu) fu.doctorNote = editingNote.value[followUpId]
  } finally {
    savingNote.value[followUpId] = false
  }
}

// Prescription modal
const showPrescModal = ref(false)
const prescForm = ref({ nom: '', dosage: '', frequence: '', dateDebut: new Date().toISOString().split('T')[0], dateFin: '', instructions: '' })
const prescSaving = ref(false)

async function submitPrescription() {
  prescSaving.value = true
  try {
    const { data } = await api.post(`/doctor/patients/${route.params.id}/prescriptions`, {
      ...prescForm.value,
      dateFin: prescForm.value.dateFin || undefined,
    })
    patient.value.medications = [...(patient.value.medications ?? []), data]
    showPrescModal.value = false

    // Show ordonnance preview
    ordonnanceMeds.value = [{ ...prescForm.value }]
    showOrdonnance.value = true

    prescForm.value = { nom: '', dosage: '', frequence: '', dateDebut: new Date().toISOString().split('T')[0], dateFin: '', instructions: '' }
  } finally {
    prescSaving.value = false
  }
}

// Health goal modal
const showGoalModal = ref(false)
const goalForm = ref({ type: 'tension_sys', label: '', target: '', unit: '' })
const goalSaving = ref(false)

const goalTypeOptions = [
  { value: 'tension_sys', label: 'Tension systolique', unit: 'mmHg', placeholder: 'Ex: 130' },
  { value: 'ldl', label: 'LDL cholestérol', unit: 'g/L', placeholder: 'Ex: 1.3' },
  { value: 'poids', label: 'Poids', unit: 'kg', placeholder: 'Ex: 75' },
  { value: 'activite', label: 'Activité physique', unit: 'min/sem', placeholder: 'Ex: 150' },
  { value: 'adherence', label: 'Adhésion médicamenteuse', unit: '%', placeholder: 'Ex: 90' },
]

function onGoalTypeChange() {
  const opt = goalTypeOptions.find(o => o.value === goalForm.value.type)
  if (opt) {
    goalForm.value.unit = opt.unit
    goalForm.value.label = opt.label
  }
}

async function submitGoal() {
  goalSaving.value = true
  try {
    const { data } = await api.post(`/doctor/patients/${route.params.id}/goals`, {
      ...goalForm.value,
      target: parseFloat(goalForm.value.target),
    })
    goals.value = goals.value.filter(g => g.type !== data.type)
    goals.value.push(data)
    showGoalModal.value = false
  } finally {
    goalSaving.value = false
  }
}

async function deleteGoal(goalId: string) {
  await api.delete(`/doctor/patients/${route.params.id}/goals/${goalId}`)
  goals.value = goals.value.filter(g => g.id !== goalId)
}

const sortedFollowUps = computed(() => {
  const list = [...(patient.value?.followUps ?? [])]
  return followUpsDesc.value ? list.reverse() : list
})
const pagedFollowUps = computed(() => {
  const start = (followUpPage.value - 1) * followUpsPerPage
  return sortedFollowUps.value.slice(start, start + followUpsPerPage)
})
const totalFollowUpPages = computed(() =>
  Math.ceil((patient.value?.followUps?.length ?? 0) / followUpsPerPage)
)

const latest = computed(() => patient.value?.followUps?.at(-1) ?? null)

const riskMeta: Record<string, { color: string; bg: string; label: string }> = {
  LOW:       { color: '#10B981', bg: '#ECFDF5', label: 'Faible' },
  MODERATE:  { color: '#D97706', bg: '#FFFBEB', label: 'Modéré' },
  HIGH:      { color: '#EF4444', bg: '#FEF2F2', label: 'Élevé' },
  VERY_HIGH: { color: '#7C3AED', bg: '#F5F3FF', label: 'Très élevé' },
}
const sevMeta: Record<string, { color: string; bg: string }> = {
  LOW:      { color: '#10B981', bg: '#ECFDF5' },
  MEDIUM:   { color: '#D97706', bg: '#FFFBEB' },
  HIGH:     { color: '#EF4444', bg: '#FEF2F2' },
  CRITICAL: { color: '#7C3AED', bg: '#F5F3FF' },
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function adherence(f: any) {
  if (!f || f.medicamentsTotal === 0) return 100
  return Math.round((f.medicamentsPris / f.medicamentsTotal) * 100)
}
function adherenceColor(pct: number) {
  if (pct >= 80) return '#10B981'
  if (pct >= 60) return '#D97706'
  return '#EF4444'
}

onMounted(async () => {
  try {
    const [detailRes, goalsRes] = await Promise.all([
      api.get(`/doctor/patients/${route.params.id}`),
      api.get(`/doctor/patients/${route.params.id}/goals`),
    ])
    patient.value     = detailRes.data.patient
    currentRisk.value = detailRes.data.currentRisk
    doctor.value      = detailRes.data.doctor
    goals.value       = goalsRes.data

    // Pre-fill note editor from existing data
    for (const fu of patient.value?.followUps ?? []) {
      editingNote.value[fu.id] = fu.doctorNote ?? ''
    }
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.error ?? e?.message ?? 'Erreur inconnue'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="detail-page">

    <!-- Back + Print -->
    <div class="page-toolbar no-print">
      <button class="back-btn" @click="router.push('/medecin/patients')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        Retour aux patients
      </button>
      <button class="print-btn" @click="window.print()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Imprimer / Exporter PDF
      </button>
    </div>

    <!-- Print header (only visible when printing) -->
    <div class="print-header print-only">
      <div class="print-header__logo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 12h4l2-5 4 10 2-5h6" stroke="#2563EB" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <strong>SuiviConnect</strong>
      </div>
      <div class="print-header__meta">
        <span>Dossier patient — Confidentiel</span>
        <span>Généré le {{ new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) }}</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="center-loader">
      <v-progress-circular indeterminate color="primary" size="48" width="3" />
    </div>

    <!-- Error -->
    <div v-else-if="errorMsg" class="error-state">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <p>{{ errorMsg }}</p>
    </div>

    <template v-else-if="patient">

      <!-- ── SUCCESS TOAST ─────────────────────────────────────────────────────── -->
      <Transition name="toast-fade">
        <div v-if="ordonnanceSuccessMsg" class="ordo-success-toast">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          {{ ordonnanceSuccessMsg }}
        </div>
      </Transition>

      <!-- ── HEADER CARD ─────────────────────────────────────────────────────── -->
      <div class="header-card">
        <div class="header-card__avatar">{{ patient.nomComplet.charAt(0) }}</div>
        <div class="header-card__info">
          <h1 class="header-card__name">{{ patient.nomComplet }}</h1>
          <p class="header-card__meta">
            {{ patient.age }} ans
            <span v-if="patient.profession"> · {{ patient.profession }}</span>
            · {{ patient.user?.email }}
          </p>
              <div class="header-card__tags">
            <span class="tag tag--blue">{{ patient.stadeRecommande }}</span>
            <span class="tag"
              :style="{ background: (riskMeta[currentRisk?.niveau] ?? riskMeta.MODERATE).bg, color: (riskMeta[currentRisk?.niveau] ?? riskMeta.MODERATE).color }">
              Risque {{ (riskMeta[currentRisk?.niveau] ?? riskMeta.MODERATE).label }}
            </span>
            <span class="tag tag--gray">{{ patient.followUps?.length ?? 0 }} suivis enregistrés</span>
          </div>
          <div class="header-card__actions no-print">
            <button class="action-btn action-btn--blue" @click="showPrescModal = true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Prescrire un médicament
            </button>
            <button class="action-btn action-btn--purple" @click="showGoalModal = true; onGoalTypeChange()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              Définir un objectif
            </button>
            <button class="action-btn action-btn--gray" @click="router.push('/medecin/rendez-vous')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Planifier RDV
            </button>
          </div>
        </div>
        <div v-if="currentRisk" class="risk-score-block">
          <p class="risk-score-block__val" :style="{ color: (riskMeta[currentRisk.niveau] ?? riskMeta.MODERATE).color }">
            {{ currentRisk.score }}<span>/100</span>
          </p>
          <p class="risk-score-block__label">Score de risque</p>
        </div>
      </div>

      <!-- ── LATEST KPIs ────────────────────────────────────────────────────── -->
      <section class="section" v-if="latest">
        <p class="section-label">Dernier suivi — {{ fmt(latest.semaine) }}</p>
        <div class="kpi-row">
          <div class="kpi-card kpi-card--red">
            <p class="kpi-card__label">Tension</p>
            <p class="kpi-card__val">{{ latest.tensionSys }}/{{ latest.tensionDia }} <span>mmHg</span></p>
          </div>
          <div class="kpi-card kpi-card--blue">
            <p class="kpi-card__label">Poids</p>
            <p class="kpi-card__val">{{ latest.poids }} <span>kg</span></p>
          </div>
          <div class="kpi-card kpi-card--amber">
            <p class="kpi-card__label">LDL</p>
            <p class="kpi-card__val">{{ latest.ldl?.toFixed(2) }} <span>g/L</span></p>
          </div>
          <div class="kpi-card kpi-card--green">
            <p class="kpi-card__label">Activité</p>
            <p class="kpi-card__val">{{ latest.activiteMinutes }} <span>min/sem</span></p>
          </div>
          <div class="kpi-card kpi-card--purple">
            <p class="kpi-card__label">Adhésion</p>
            <p class="kpi-card__val" :style="{ color: adherenceColor(adherence(latest)) }">{{ adherence(latest) }} <span>%</span></p>
          </div>
        </div>
      </section>

      <!-- ── RISK FACTORS ──────────────────────────────────────────────────── -->
      <section class="section" v-if="currentRisk?.facteurs?.length">
        <p class="section-label">Facteurs de risque identifiés</p>
        <div class="risk-factors">
          <div v-for="f in currentRisk.facteurs" :key="f" class="risk-factor">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            {{ f }}
          </div>
        </div>
      </section>

      <!-- ── FOLLOW-UP HISTORY TABLE ────────────────────────────────────────── -->
      <section class="section">
        <div class="section-header">
          <p class="section-label" style="margin:0">Historique des suivis hebdomadaires ({{ patient.followUps?.length ?? 0 }})</p>
          <button class="sort-btn no-print" @click="followUpsDesc = !followUpsDesc; followUpPage = 1">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><polyline v-if="followUpsDesc" points="5 12 12 19 19 12"/><polyline v-else points="5 12 12 5 19 12"/>
            </svg>
            {{ followUpsDesc ? 'Plus récent en premier' : 'Plus ancien en premier' }}
          </button>
        </div>

        <div v-if="!patient.followUps?.length" class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5" stroke-linecap="round"><path d="M3 12h4l2-5 4 10 2-5h6"/></svg>
          <p>Aucun suivi enregistré</p>
        </div>

        <div v-else class="followup-table-wrap">
          <table class="followup-table">
            <thead>
              <tr>
                <th>Semaine</th>
                <th>Tension</th>
                <th>Poids</th>
                <th>LDL</th>
                <th>Activité</th>
                <th>Adhésion</th>
                <th>Tabac</th>
                <th>Diabète</th>
                <th>Notes patient</th>
                <th>Note médecin</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in pagedFollowUps" :key="f.id">
                <td class="td-date">{{ fmt(f.semaine) }}</td>
                <td>
                  <span class="bp-chip"
                    :class="{ 'bp-chip--warn': f.tensionSys >= 140 || f.tensionDia >= 90, 'bp-chip--crit': f.tensionSys >= 160 || f.tensionDia >= 100 }">
                    {{ f.tensionSys }}/{{ f.tensionDia }}
                  </span>
                </td>
                <td>{{ f.poids }} kg</td>
                <td>
                  <span :style="{ color: f.ldl > 1.6 ? '#EF4444' : f.ldl > 1.3 ? '#D97706' : '#10B981', fontWeight: 700 }">
                    {{ f.ldl?.toFixed(2) }}
                  </span>
                  <span style="color:#94A3B8;font-size:11px"> g/L</span>
                </td>
                <td>
                  <span :style="{ color: f.activiteMinutes < 90 ? '#EF4444' : f.activiteMinutes < 150 ? '#D97706' : '#10B981', fontWeight: 700 }">
                    {{ f.activiteMinutes }}
                  </span>
                  <span style="color:#94A3B8;font-size:11px"> min</span>
                </td>
                <td>
                  <div class="adh-bar">
                    <div class="adh-bar__fill"
                      :style="{ width: adherence(f) + '%', background: adherenceColor(adherence(f)) }" />
                    <span :style="{ color: adherenceColor(adherence(f)), fontWeight: 700 }">{{ adherence(f) }}%</span>
                  </div>
                </td>
                <td>
                  <span v-if="f.tabac" class="pill pill--red">Oui</span>
                  <span v-else class="pill pill--green">Non</span>
                </td>
                <td>
                  <span v-if="f.diabete" class="pill pill--amber">Oui</span>
                  <span v-else class="pill pill--green">Non</span>
                </td>
                <td class="td-notes">{{ f.notes || '—' }}</td>
                <td class="td-doctor-note">
                  <div class="note-cell">
                    <textarea
                      v-model="editingNote[f.id]"
                      class="note-input"
                      rows="1"
                      placeholder="Ajouter une note…"
                    />
                    <button
                      class="note-save-btn"
                      :disabled="savingNote[f.id]"
                      @click="saveNote(f.id)"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Pagination -->
          <div v-if="totalFollowUpPages > 1" class="pagination">
            <button class="page-btn" :disabled="followUpPage === 1" @click="followUpPage--">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span class="page-info">{{ followUpPage }} / {{ totalFollowUpPages }}</span>
            <button class="page-btn" :disabled="followUpPage === totalFollowUpPages" @click="followUpPage++">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      </section>

      <!-- ── HEALTH GOALS ────────────────────────────────────────────────────── -->
      <section class="section">
        <div class="section-header">
          <p class="section-label" style="margin:0">Objectifs de santé ({{ goals.length }})</p>
          <button class="sort-btn no-print" @click="showGoalModal = true; onGoalTypeChange()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Ajouter un objectif
          </button>
        </div>
        <div v-if="goals.length" class="goals-grid">
          <div v-for="g in goals" :key="g.id" class="goal-card">
            <div class="goal-card__header">
              <span class="goal-card__label">{{ g.label }}</span>
              <button class="goal-delete-btn" @click="deleteGoal(g.id)" title="Supprimer">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="goal-card__values">
              <span class="goal-card__current" :style="{ color: g.current !== null && g.current <= g.target ? '#10B981' : '#EF4444' }">
                {{ g.current ?? '—' }}
              </span>
              <span class="goal-card__sep">/</span>
              <span class="goal-card__target">{{ g.target }} {{ g.unit }}</span>
            </div>
            <div v-if="g.current !== null" class="goal-bar">
              <div class="goal-bar__fill"
                :style="{
                  width: Math.min(100, Math.round((g.current / g.target) * 100)) + '%',
                  background: g.current <= g.target ? '#10B981' : '#EF4444'
                }"
              />
            </div>
            <p class="goal-card__sub">Objectif : {{ g.target }} {{ g.unit }}</p>
          </div>
        </div>
        <div v-else class="empty-state">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          <p>Aucun objectif défini pour ce patient</p>
        </div>
      </section>

      <!-- ── MEDS + ALERTS ──────────────────────────────────────────────────── -->
      <div class="dual-grid">

        <!-- Medications -->
        <section class="panel">
          <p class="panel__title">Médicaments actifs ({{ patient.medications?.length ?? 0 }})</p>
          <div v-if="patient.medications?.length" class="med-list">
            <div v-for="m in patient.medications" :key="m.id" class="med-row">
              <div class="med-row__icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round"><path d="M10.5 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v2"/><circle cx="16" cy="16" r="6"/><path d="M16 12v8"/><path d="M12 16h8"/></svg>
              </div>
              <div class="med-row__body">
                <p class="med-row__name">{{ m.nom }}</p>
                <p class="med-row__detail">{{ m.dosage }} · {{ m.frequence }}</p>
              </div>
              <span class="pill pill--blue">Actif</span>
              <button class="btn-ordo-inline" title="Voir l'ordonnance"
                @click="ordonnanceMeds = [m]; showOrdonnance = true">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                Ordonnance
              </button>
            </div>
          </div>
          <p v-else class="empty-text">Aucun médicament actif</p>
        </section>

        <!-- Alerts -->
        <section class="panel">
          <p class="panel__title">Alertes ({{ patient.alerts?.length ?? 0 }})</p>
          <div v-if="patient.alerts?.length" class="alert-list">
            <div v-for="a in patient.alerts" :key="a.id" class="alert-row">
              <span class="sev-badge"
                :style="{ background: (sevMeta[a.severite] ?? sevMeta.LOW).bg, color: (sevMeta[a.severite] ?? sevMeta.LOW).color }">
                {{ a.severite }}
              </span>
              <div class="alert-row__body">
                <p class="alert-row__msg">{{ a.message }}</p>
                <p class="alert-row__date">{{ fmt(a.createdAt) }}</p>
              </div>
              <span v-if="a.lu" class="pill pill--green" style="font-size:10px">Lu</span>
            </div>
          </div>
          <p v-else class="empty-text">Aucune alerte</p>
        </section>
      </div>

    <!-- ── ORDONNANCE PREVIEW ──────────────────────────────────────────────── -->
    <Teleport to="body">
      <OrdonnancePreview
        v-if="showOrdonnance && doctor && patient"
        :doctor="{ ...doctor, user: patient.user }"
        :patient="patient"
        :patient-id="String(route.params.id)"
        :medications="ordonnanceMeds"
        @close="showOrdonnance = false"
        @validated="onOrdonnanceValidated"
      />
    </Teleport>

    <!-- ── PRESCRIPTION MODAL ──────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showPrescModal" class="modal-overlay" @click.self="showPrescModal = false">
          <div class="modal">
            <div class="modal__header">
              <h2 class="modal__title">Prescrire un médicament</h2>
              <button class="modal__close" @click="showPrescModal = false">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="modal__body">
              <div class="form-grid">
                <div class="form-group form-group--full">
                  <label class="form-label">Nom du médicament *</label>
                  <input v-model="prescForm.nom" class="form-input" placeholder="Ex: Bisoprolol" />
                </div>
                <div class="form-group">
                  <label class="form-label">Dosage *</label>
                  <input v-model="prescForm.dosage" class="form-input" placeholder="Ex: 5 mg" />
                </div>
                <div class="form-group">
                  <label class="form-label">Fréquence *</label>
                  <input v-model="prescForm.frequence" class="form-input" placeholder="Ex: 1×/jour matin" />
                </div>
                <div class="form-group">
                  <label class="form-label">Date de début *</label>
                  <input v-model="prescForm.dateDebut" type="date" class="form-input" />
                </div>
                <div class="form-group">
                  <label class="form-label">Date de fin (optionnel)</label>
                  <input v-model="prescForm.dateFin" type="date" class="form-input" />
                </div>
                <div class="form-group form-group--full">
                  <label class="form-label">Instructions particulières</label>
                  <textarea v-model="prescForm.instructions" class="form-input" rows="2" placeholder="Ex: À prendre avec un grand verre d'eau, éviter le pamplemousse…" />
                </div>
              </div>
            </div>
            <div class="modal__footer">
              <button class="modal-btn modal-btn--cancel" @click="showPrescModal = false">Annuler</button>
              <button class="modal-btn modal-btn--submit" :disabled="!prescForm.nom || !prescForm.dosage || prescSaving" @click="submitPrescription">
                {{ prescSaving ? 'Envoi…' : 'Prescrire' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── HEALTH GOAL MODAL ────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showGoalModal" class="modal-overlay" @click.self="showGoalModal = false">
          <div class="modal">
            <div class="modal__header">
              <h2 class="modal__title">Définir un objectif de santé</h2>
              <button class="modal__close" @click="showGoalModal = false">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="modal__body">
              <div class="form-grid">
                <div class="form-group form-group--full">
                  <label class="form-label">Type d'objectif</label>
                  <select v-model="goalForm.type" class="form-input" @change="onGoalTypeChange">
                    <option v-for="o in goalTypeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Valeur cible *</label>
                  <div style="display:flex;gap:8px;align-items:center">
                    <input v-model="goalForm.target" type="number" step="0.1" class="form-input" :placeholder="goalTypeOptions.find(o=>o.value===goalForm.type)?.placeholder" />
                    <span style="font-size:13px;color:#64748B;white-space:nowrap">{{ goalForm.unit }}</span>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Libellé affiché au patient</label>
                  <input v-model="goalForm.label" class="form-input" placeholder="Ex: Tension systolique cible" />
                </div>
              </div>
            </div>
            <div class="modal__footer">
              <button class="modal-btn modal-btn--cancel" @click="showGoalModal = false">Annuler</button>
              <button class="modal-btn modal-btn--submit" :disabled="!goalForm.target || goalSaving" @click="submitGoal">
                {{ goalSaving ? 'Enregistrement…' : 'Définir l\'objectif' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    </template>
  </div>
</template>

<style scoped>
.detail-page { width: 100%; }

.back-btn {
  display: inline-flex; align-items: center; gap: 6px;
  background: none; border: none; cursor: pointer;
  font-size: 13px; font-weight: 600; color: #64748B;
  padding: 0; margin-bottom: 20px;
  transition: color 0.15s;
}
.back-btn:hover { color: #2563EB; }

.center-loader { display: flex; align-items: center; justify-content: center; padding: 80px; }
.error-state   { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px; color: #EF4444; font-weight: 600; text-align: center; }

/* Header card */
.header-card {
  display: flex; align-items: flex-start; gap: 20px;
  background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 20px;
  padding: 28px 32px; margin-bottom: 28px;
  box-shadow: 0 1px 4px rgba(15,23,42,0.06);
}
.header-card__avatar {
  width: 72px; height: 72px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, #2563EB, #7C3AED);
  color: white; font-size: 28px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
}
.header-card__info { flex: 1; min-width: 0; }
.header-card__name { font-size: 22px; font-weight: 800; color: #0F172A; margin: 0 0 6px; letter-spacing: -0.03em; }
.header-card__meta { font-size: 13px; color: #64748B; margin: 0 0 12px; }
.header-card__tags { display: flex; gap: 8px; flex-wrap: wrap; }

.tag { display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
.tag--blue { background: #EFF6FF; color: #2563EB; }
.tag--gray { background: #F1F5F9; color: #64748B; }

.risk-score-block { text-align: center; }
.risk-score-block__val { font-size: 40px; font-weight: 900; margin: 0; letter-spacing: -0.04em; }
.risk-score-block__val span { font-size: 16px; font-weight: 600; color: #94A3B8; }
.risk-score-block__label { font-size: 11px; font-weight: 700; color: #94A3B8; letter-spacing: 0.06em; text-transform: uppercase; margin: 0; }

/* Sections */
.section { margin-bottom: 28px; }
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 10px; }
.section-label { font-size: 11px; font-weight: 700; color: #64748B; letter-spacing: 0.08em; text-transform: uppercase; margin: 0 0 14px; }

/* KPI strip */
.kpi-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
@media (max-width: 900px) { .kpi-row { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 560px) { .kpi-row { grid-template-columns: repeat(2, 1fr); } }

.kpi-card {
  background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px;
  padding: 16px 18px; border-left: 3px solid transparent;
}
.kpi-card--red    { border-left-color: #EF4444; }
.kpi-card--blue   { border-left-color: #2563EB; }
.kpi-card--amber  { border-left-color: #F59E0B; }
.kpi-card--green  { border-left-color: #10B981; }
.kpi-card--purple { border-left-color: #7C3AED; }
.kpi-card__label { font-size: 11px; font-weight: 700; color: #94A3B8; letter-spacing: 0.06em; text-transform: uppercase; margin: 0 0 6px; }
.kpi-card__val   { font-size: 22px; font-weight: 800; color: #0F172A; margin: 0; letter-spacing: -0.03em; }
.kpi-card__val span { font-size: 12px; font-weight: 500; color: #94A3B8; }

/* Risk factors */
.risk-factors { display: flex; flex-wrap: wrap; gap: 10px; }
.risk-factor {
  display: flex; align-items: center; gap: 7px;
  background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px;
  padding: 7px 14px; font-size: 13px; font-weight: 600; color: #DC2626;
}

/* Sort button */
.sort-btn {
  display: flex; align-items: center; gap: 6px;
  background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 9px;
  padding: 7px 14px; font-size: 12px; font-weight: 600; color: #64748B; cursor: pointer;
  transition: background 0.13s;
}
.sort-btn:hover { background: #EFF6FF; color: #2563EB; border-color: #BFDBFE; }

/* Follow-up table */
.followup-table-wrap {
  background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden;
  box-shadow: 0 1px 4px rgba(15,23,42,0.06);
}
.followup-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.followup-table thead tr { background: #F8FAFC; }
.followup-table th {
  padding: 12px 14px; text-align: left;
  font-size: 11px; font-weight: 700; color: #64748B;
  letter-spacing: 0.07em; text-transform: uppercase;
  border-bottom: 1px solid #E2E8F0; white-space: nowrap;
}
.followup-table td {
  padding: 13px 14px; color: #334155; font-weight: 500;
  border-bottom: 1px solid #F8FAFC; vertical-align: middle;
}
.followup-table tbody tr:last-child td { border-bottom: none; }
.followup-table tbody tr:hover td { background: #F8FAFC; }

.td-date { font-weight: 700; color: #0F172A; white-space: nowrap; }
.td-notes { max-width: 180px; color: #64748B; font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Blood pressure chip */
.bp-chip {
  display: inline-block; padding: 3px 9px; border-radius: 7px; font-weight: 700;
  background: #ECFDF5; color: #059669;
}
.bp-chip--warn  { background: #FEF3C7; color: #D97706; }
.bp-chip--crit  { background: #FEF2F2; color: #EF4444; }

/* Adherence bar */
.adh-bar {
  display: flex; align-items: center; gap: 8px;
}
.adh-bar__fill {
  height: 6px; border-radius: 3px; flex-shrink: 0;
  max-width: 60px; min-width: 4px;
  transition: width 0.3s;
}

/* Pagination */
.pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 16px; border-top: 1px solid #F1F5F9; }
.page-btn {
  width: 34px; height: 34px; border-radius: 9px; border: 1px solid #E2E8F0;
  background: #FFFFFF; cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: #64748B; transition: background 0.13s;
}
.page-btn:hover:not(:disabled) { background: #EFF6FF; color: #2563EB; border-color: #BFDBFE; }
.page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.page-info { font-size: 13px; font-weight: 700; color: #64748B; }

/* Pills */
.pill { display: inline-block; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; }
.pill--green  { background: #ECFDF5; color: #059669; }
.pill--red    { background: #FEF2F2; color: #EF4444; }
.pill--amber  { background: #FFFBEB; color: #D97706; }
.pill--blue   { background: #EFF6FF; color: #2563EB; }

/* Dual grid */
.dual-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
@media (max-width: 768px) { .dual-grid { grid-template-columns: 1fr; } }

/* Panel */
.panel {
  background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px;
  padding: 24px; box-shadow: 0 1px 4px rgba(15,23,42,0.06);
}
.panel__title { font-size: 14px; font-weight: 700; color: #0F172A; margin: 0 0 16px; }

/* Meds */
.med-list { display: flex; flex-direction: column; gap: 10px; }
.med-row { display: flex; align-items: center; gap: 12px; }
.med-row__icon {
  width: 36px; height: 36px; border-radius: 10px; background: #EFF6FF;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.med-row__body { flex: 1; min-width: 0; }
.med-row__name   { font-size: 13px; font-weight: 700; color: #0F172A; margin: 0 0 2px; }
.med-row__detail { font-size: 12px; color: #64748B; margin: 0; }

.btn-ordo-inline {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 11px; border-radius: 8px; border: 1.5px solid #2563EB;
  background: transparent; color: #2563EB; cursor: pointer;
  font-size: 11px; font-weight: 700; white-space: nowrap;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
}
.btn-ordo-inline:hover { background: #2563EB; color: white; }

/* Ordonnance sent toast */
.ordo-success-toast {
  position: fixed; top: 24px; right: 24px; z-index: 8000;
  display: flex; align-items: center; gap: 10px;
  background: #16A34A; color: white;
  padding: 14px 22px; border-radius: 14px;
  font-size: 14px; font-weight: 700;
  box-shadow: 0 8px 32px rgba(22,163,74,0.35);
}
.toast-fade-enter-active, .toast-fade-leave-active { transition: all 0.35s; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateY(-12px); }

/* Alerts */
.alert-list { display: flex; flex-direction: column; gap: 10px; max-height: 340px; overflow-y: auto; }
.alert-row  { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid #F8FAFC; }
.alert-row:last-child { border-bottom: none; }
.sev-badge  { padding: 2px 9px; border-radius: 7px; font-size: 10px; font-weight: 700; flex-shrink: 0; white-space: nowrap; }
.alert-row__body { flex: 1; min-width: 0; }
.alert-row__msg  { font-size: 13px; color: #0F172A; margin: 0 0 3px; line-height: 1.4; }
.alert-row__date { font-size: 11px; color: #94A3B8; margin: 0; }

.empty-text  { color: #94A3B8; font-size: 13px; }
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px; color: #CBD5E1; font-size: 14px; }

/* Header actions */
.header-card__actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
.action-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 16px; border-radius: 10px; border: none; cursor: pointer;
  font-size: 13px; font-weight: 700; transition: opacity 0.15s;
}
.action-btn:hover { opacity: 0.85; }
.action-btn--blue   { background: #EFF6FF; color: #2563EB; }
.action-btn--purple { background: #F5F3FF; color: #7C3AED; }
.action-btn--gray   { background: #F1F5F9; color: #475569; }

/* Doctor note cell in table */
.td-doctor-note { min-width: 180px; }
.note-cell { display: flex; align-items: flex-start; gap: 6px; }
.note-input {
  flex: 1; border: 1px solid #E2E8F0; border-radius: 8px; padding: 6px 9px;
  font-size: 12px; color: #0F172A; background: #F8FAFC; resize: vertical;
  font-family: inherit; outline: none; transition: border-color 0.15s;
  min-height: 34px;
}
.note-input:focus { border-color: #2563EB; background: #fff; }
.note-save-btn {
  width: 28px; height: 28px; border-radius: 7px; border: none; flex-shrink: 0;
  background: #ECFDF5; color: #10B981; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.13s;
}
.note-save-btn:hover:not(:disabled) { background: #D1FAE5; }
.note-save-btn:disabled { opacity: 0.4; }

/* Health goals */
.goals-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
.goal-card {
  background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px;
  box-shadow: 0 1px 3px rgba(15,23,42,0.05);
}
.goal-card__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.goal-card__label  { font-size: 12px; font-weight: 700; color: #64748B; letter-spacing: 0.05em; text-transform: uppercase; }
.goal-delete-btn   { background: none; border: none; cursor: pointer; color: #CBD5E1; padding: 2px; border-radius: 4px; }
.goal-delete-btn:hover { color: #EF4444; background: #FEF2F2; }
.goal-card__values { display: flex; align-items: baseline; gap: 4px; margin-bottom: 8px; }
.goal-card__current { font-size: 28px; font-weight: 900; letter-spacing: -0.04em; }
.goal-card__sep    { font-size: 14px; color: #CBD5E1; }
.goal-card__target { font-size: 14px; color: #94A3B8; font-weight: 600; }
.goal-bar { height: 6px; background: #F1F5F9; border-radius: 3px; overflow: hidden; margin-bottom: 6px; }
.goal-bar__fill { height: 100%; border-radius: 3px; transition: width 0.4s ease; }
.goal-card__sub { font-size: 11px; color: #94A3B8; margin: 0; }

/* Modals */
.modal-overlay {
  position: fixed; inset: 0; z-index: 9998; background: rgba(10,16,40,0.5);
  display: flex; align-items: center; justify-content: center; padding: 20px;
  backdrop-filter: blur(4px);
}
.modal {
  background: #FFFFFF; border-radius: 20px; width: 100%; max-width: 540px;
  box-shadow: 0 24px 64px rgba(15,23,42,0.2);
}
.modal__header { display: flex; align-items: center; justify-content: space-between; padding: 24px 28px 0; }
.modal__title  { font-size: 18px; font-weight: 800; color: #0F172A; margin: 0; letter-spacing: -0.02em; }
.modal__close  { background: #F1F5F9; border: none; border-radius: 8px; width: 32px; height: 32px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748B; }
.modal__close:hover { background: #E2E8F0; }
.modal__body   { padding: 20px 28px; }
.modal__footer { display: flex; gap: 10px; justify-content: flex-end; padding: 0 28px 24px; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group--full { grid-column: 1 / -1; }
.form-label { font-size: 12px; font-weight: 700; color: #64748B; letter-spacing: 0.04em; text-transform: uppercase; }
.form-input {
  border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 10px 14px;
  font-size: 14px; color: #0F172A; background: #F8FAFC; outline: none;
  font-family: inherit; transition: border-color 0.15s;
}
.form-input:focus { border-color: #2563EB; background: #fff; }

.modal-btn { padding: 10px 22px; border-radius: 10px; border: none; font-size: 14px; font-weight: 700; cursor: pointer; transition: opacity 0.15s; }
.modal-btn:hover:not(:disabled) { opacity: 0.88; }
.modal-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.modal-btn--cancel { background: #F1F5F9; color: #64748B; }
.modal-btn--submit { background: linear-gradient(135deg, #2563EB, #1D4ED8); color: white; box-shadow: 0 4px 12px rgba(37,99,235,0.3); }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.25s ease; }
.modal-fade-enter-active .modal, .modal-fade-leave-active .modal { transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1); }
.modal-fade-enter-from { opacity: 0; }
.modal-fade-enter-from .modal { transform: scale(0.94) translateY(10px); }
.modal-fade-leave-to { opacity: 0; }

/* ── Toolbar ────────────────────────────────────────────────────────────────── */
.page-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20px; flex-wrap: wrap; gap: 10px;
}

.print-btn {
  display: inline-flex; align-items: center; gap: 8px;
  background: linear-gradient(135deg, #0F172A, #1E293B);
  color: white; border: none; border-radius: 10px;
  padding: 10px 18px; font-size: 13px; font-weight: 700;
  cursor: pointer; transition: opacity 0.15s;
  box-shadow: 0 4px 12px rgba(15,23,42,0.2);
}
.print-btn:hover { opacity: 0.88; }

/* ── Print header (screen hidden, print visible) ────────────────────────────── */
.print-only { display: none; }

/* ═══════════════════════════════════════════════════════════════════════════
   PRINT STYLESHEET
   ═══════════════════════════════════════════════════════════════════════════ */
@media print {
  /* Hide everything we don't want */
  .no-print,
  .back-btn,
  .v-navigation-drawer,
  .v-app-bar,
  .app-topbar,
  .sidebar,
  [class*="v-navigation"],
  [class*="v-app-bar"] { display: none !important; }

  /* Show print-only elements */
  .print-only { display: flex !important; }

  /* Base page */
  body, html { background: white !important; font-size: 11pt; }

  .detail-page {
    padding: 0 !important;
    max-width: 100% !important;
  }

  /* Print header */
  .print-header {
    align-items: center; justify-content: space-between;
    border-bottom: 2px solid #2563EB; padding-bottom: 10px; margin-bottom: 20px;
    color: #0F172A;
  }
  .print-header__logo {
    display: flex; align-items: center; gap: 8px;
    font-size: 14pt; font-weight: 800; color: #2563EB;
  }
  .print-header__meta {
    display: flex; flex-direction: column; align-items: flex-end;
    font-size: 9pt; color: #64748B;
  }

  /* Patient header card */
  .header-card {
    border: 1px solid #E2E8F0 !important;
    box-shadow: none !important;
    page-break-inside: avoid;
    padding: 16px !important;
  }
  .header-card__avatar {
    width: 48px !important; height: 48px !important;
    font-size: 20px !important;
  }

  /* Sections */
  .section { page-break-inside: avoid; margin-bottom: 18px !important; }

  /* KPI row */
  .kpi-row { grid-template-columns: repeat(5, 1fr) !important; gap: 8px !important; }
  .kpi-card { padding: 10px 12px !important; border-radius: 8px !important; }
  .kpi-card__val { font-size: 16pt !important; }

  /* Goals grid */
  .goals-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 10px !important; }
  .goal-card { padding: 12px !important; }
  .goal-card__current { font-size: 20px !important; }
  .goal-delete-btn { display: none !important; }

  /* Follow-up table */
  .followup-table-wrap {
    box-shadow: none !important;
    border: 1px solid #E2E8F0 !important;
    border-radius: 8px !important;
    overflow: visible !important;
  }
  .followup-table { font-size: 8pt !important; }
  .followup-table th, .followup-table td { padding: 6px 8px !important; }
  .td-doctor-note { min-width: 120px !important; }
  .note-cell { display: block !important; }
  .note-input {
    border: none !important; background: transparent !important;
    resize: none !important; font-size: 8pt !important; padding: 0 !important;
  }
  .note-save-btn { display: none !important; }

  /* Medications & Alerts panels */
  .dual-grid { grid-template-columns: 1fr 1fr !important; }
  .panel-card {
    box-shadow: none !important;
    border: 1px solid #E2E8F0 !important;
    border-radius: 8px !important;
    page-break-inside: avoid;
  }
  .med-item, .alert-item {
    padding: 6px 10px !important;
    border-radius: 6px !important;
  }

  /* Risk factors */
  .risk-factors { gap: 6px !important; }
  .risk-factor  { padding: 4px 10px !important; font-size: 9pt !important; }

  /* Tags */
  .tag { padding: 2px 8px !important; font-size: 8pt !important; }

  /* Force print colors */
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

  /* Page break helpers */
  .section:nth-child(n+4) { page-break-before: auto; }
}
</style>
