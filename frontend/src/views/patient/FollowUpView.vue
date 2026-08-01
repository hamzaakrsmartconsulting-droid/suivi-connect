<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  CheckCircle, AlertCircle, CalendarDays, Calendar,
  HeartPulse, Droplets, Pill, Stethoscope, Cigarette,
  Percent, FileText, ClipboardList, Activity,
} from '@lucide/vue'
import api from '@/services/api'

interface FollowUp {
  id: string; semaine: string; poids: number; tensionSys: number; tensionDia: number
  ldl: number; activiteMinutes: number; medicamentsPris: number
  medicamentsTotal: number; tabac: boolean; diabete: boolean; notes: string | null
}

const followUps = ref<FollowUp[]>([])
const loading   = ref(true)
const saving    = ref(false)
const toast     = ref<{ type: 'success' | 'error'; msg: string } | null>(null)

const form = ref({
  semaine: new Date().toISOString().split('T')[0],
  poids: 78,
  tensionSys: 128,
  tensionDia: 82,
  ldl: 1.24,
  medicamentsPris: 21,
  medicamentsTotal: 21,
  activiteMinutes: 165,
  tabac: false,
  diabete: false,
  notes: '',
})

const adherencePercent = computed(() =>
  form.value.medicamentsTotal > 0
    ? Math.round((form.value.medicamentsPris / form.value.medicamentsTotal) * 100)
    : 100
)
const adherenceColor = computed(() =>
  adherencePercent.value >= 90 ? '#10B981' : adherencePercent.value >= 70 ? '#F59E0B' : '#EF4444'
)

function showToast(type: 'success' | 'error', msg: string) {
  toast.value = { type, msg }
  setTimeout(() => { toast.value = null }, 3500)
}

async function handleSubmit() {
  saving.value = true
  try {
    await api.post('/patient/follow-ups', { ...form.value })
    showToast('success', 'Suivi hebdomadaire enregistré avec succès !')
    await loadFollowUps()
  } catch {
    showToast('error', 'Erreur lors de l\'enregistrement. Veuillez réessayer.')
  } finally {
    saving.value = false
  }
}

async function loadFollowUps() {
  loading.value = true
  try {
    const { data } = await api.get('/patient/follow-ups')
    followUps.value = data.items
  } finally {
    loading.value = false
  }
}

onMounted(loadFollowUps)
</script>

<template>
  <div class="followup-page">

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toast" class="toast" :class="`toast--${toast.type}`">
        <CheckCircle v-if="toast.type === 'success'" :size="15" :stroke-width="2" />
        <AlertCircle v-else :size="15" :stroke-width="2" />
        {{ toast.msg }}
      </div>
    </Transition>

    <!-- Page header -->
    <div class="page-header">
      <div>
        <p class="section-label">Espace patient</p>
        <h1 class="page-header__title">Suivi hebdomadaire</h1>
        <p class="page-header__sub">Renseignez vos données de santé chaque semaine pour un suivi optimal</p>
      </div>
      <div class="week-badge">
        <CalendarDays :size="13" :stroke-width="1.75" color="#2563EB" style="margin-right:5px" />
        Semaine {{ new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' }) }}
      </div>
    </div>

    <!-- ── Form card ── -->
    <div class="form-card">
      <div class="form-card__head">
        <div class="form-card__head-icon">
          <ClipboardList :size="20" :stroke-width="1.75" color="white" />
        </div>
        <div>
          <p class="form-card__head-title">Nouveau suivi</p>
          <p class="form-card__head-sub">Remplissez tous les champs ci-dessous</p>
        </div>
      </div>

      <form @submit.prevent="handleSubmit">

        <!-- ── Section 1: Date ── -->
        <div class="form-section">
          <p class="form-section__label">
            <Calendar :size="13" :stroke-width="1.75" color="#2563EB" style="margin-right:5px" />
            Période
          </p>
          <div class="form-grid form-grid--1">
            <div class="field">
              <label class="field__label">Date de la semaine</label>
              <div class="field__wrap">
                <input v-model="form.semaine" type="date" class="field__input" />
              </div>
            </div>
          </div>
        </div>

        <!-- ── Section 2: Vitals ── -->
        <div class="form-section">
          <p class="form-section__label">
            <HeartPulse :size="13" :stroke-width="1.75" color="#EF4444" style="margin-right:5px" />
            Signes vitaux
          </p>
          <div class="form-grid form-grid--3">
            <div class="field">
              <label class="field__label">Poids (kg)</label>
              <div class="field__wrap field__wrap--icon">
                <span class="field__unit-left">kg</span>
                <input v-model.number="form.poids" type="number" step="0.1" min="30" max="200" class="field__input field__input--has-left" />
              </div>
            </div>
            <div class="field">
              <label class="field__label">Tension systolique (mmHg)</label>
              <div class="field__wrap field__wrap--icon">
                <span class="field__unit-left">SYS</span>
                <input v-model.number="form.tensionSys" type="number" min="60" max="250" class="field__input field__input--has-left" />
              </div>
            </div>
            <div class="field">
              <label class="field__label">Tension diastolique (mmHg)</label>
              <div class="field__wrap field__wrap--icon">
                <span class="field__unit-left">DIA</span>
                <input v-model.number="form.tensionDia" type="number" min="40" max="150" class="field__input field__input--has-left" />
              </div>
            </div>
          </div>
        </div>

        <!-- ── Section 3: Cholesterol + Activity ── -->
        <div class="form-section">
          <p class="form-section__label">
            <Droplets :size="13" :stroke-width="1.75" color="#F59E0B" style="margin-right:5px" />
            Bilan lipidique &amp; activité
          </p>
          <div class="form-grid form-grid--2">
            <div class="field">
              <label class="field__label">LDL cholestérol (g/L)</label>
              <div class="field__wrap">
                <input v-model.number="form.ldl" type="number" step="0.01" min="0" max="5" class="field__input" />
                <span class="field__unit-right">g/L</span>
              </div>
            </div>
            <div class="field">
              <label class="field__label">Activité physique cette semaine</label>
              <div class="field__wrap">
                <input v-model.number="form.activiteMinutes" type="number" min="0" max="1000" class="field__input" />
                <span class="field__unit-right">min</span>
              </div>
              <p class="field__hint" :style="{ color: form.activiteMinutes >= 150 ? '#10B981' : '#F59E0B' }">
                {{ form.activiteMinutes >= 150 ? '✓ Objectif OMS atteint (150 min)' : `Encore ${150 - form.activiteMinutes} min pour l'objectif` }}
              </p>
            </div>
          </div>
        </div>

        <!-- ── Section 4: Medication adherence ── -->
        <div class="form-section">
          <p class="form-section__label">
            <Pill :size="13" :stroke-width="1.75" color="#10B981" style="margin-right:5px" />
            Adhésion médicamenteuse
          </p>
          <div class="form-grid form-grid--2">
            <div class="field">
              <label class="field__label">Médicaments pris</label>
              <div class="field__wrap">
                <input v-model.number="form.medicamentsPris" type="number" min="0" :max="form.medicamentsTotal" class="field__input" />
                <span class="field__unit-right">prises</span>
              </div>
            </div>
            <div class="field">
              <label class="field__label">Médicaments total prescrits</label>
              <div class="field__wrap">
                <input v-model.number="form.medicamentsTotal" type="number" min="0" class="field__input" />
                <span class="field__unit-right">prises</span>
              </div>
            </div>
          </div>
          <!-- Adherence bar -->
          <div class="adherence-preview">
            <div class="adherence-preview__label">
              <span>Taux d'adhésion calculé</span>
              <span class="adherence-preview__pct" :style="{ color: adherenceColor }">{{ adherencePercent }}%</span>
            </div>
            <div class="adherence-preview__track">
              <div class="adherence-preview__fill" :style="{ width: `${adherencePercent}%`, background: adherenceColor }" />
            </div>
          </div>
        </div>

        <!-- ── Section 5: Medical status ── -->
        <div class="form-section">
          <p class="form-section__label">
            <Stethoscope :size="13" :stroke-width="1.75" color="#7C3AED" style="margin-right:5px" />
            État de santé
          </p>
          <div class="toggle-grid">
            <button
              type="button"
              class="toggle-card"
              :class="{ 'toggle-card--active-red': form.tabac, 'toggle-card--inactive': !form.tabac }"
              @click="form.tabac = !form.tabac"
            >
              <div class="toggle-card__icon" :class="form.tabac ? 'toggle-card__icon--red' : ''">
                <Cigarette :size="20" :stroke-width="1.75" />
              </div>
              <div class="toggle-card__body">
                <p class="toggle-card__name">Tabagisme</p>
                <p class="toggle-card__status">{{ form.tabac ? 'Fumeur actif' : 'Non fumeur' }}</p>
              </div>
              <div class="toggle-card__pill" :class="form.tabac ? 'toggle-card__pill--on' : 'toggle-card__pill--off'">
                {{ form.tabac ? 'Oui' : 'Non' }}
              </div>
            </button>

            <button
              type="button"
              class="toggle-card"
              :class="{ 'toggle-card--active-orange': form.diabete, 'toggle-card--inactive': !form.diabete }"
              @click="form.diabete = !form.diabete"
            >
              <div class="toggle-card__icon" :class="form.diabete ? 'toggle-card__icon--orange' : ''">
                <Percent :size="20" :stroke-width="1.75" />
              </div>
              <div class="toggle-card__body">
                <p class="toggle-card__name">Diabète</p>
                <p class="toggle-card__status">{{ form.diabete ? 'Diabétique' : 'Non diabétique' }}</p>
              </div>
              <div class="toggle-card__pill" :class="form.diabete ? 'toggle-card__pill--orange' : 'toggle-card__pill--off'">
                {{ form.diabete ? 'Oui' : 'Non' }}
              </div>
            </button>
          </div>
        </div>

        <!-- ── Section 6: Notes ── -->
        <div class="form-section">
          <p class="form-section__label">
            <FileText :size="13" :stroke-width="1.75" color="#64748B" style="margin-right:5px" />
            Notes de la semaine
          </p>
          <div class="field">
            <textarea
              v-model="form.notes"
              rows="4"
              class="field__textarea"
              placeholder="Décrivez votre semaine, ressentis, événements particuliers…"
            />
          </div>
        </div>

        <!-- Submit -->
        <div class="form-actions">
          <button type="submit" class="submit-btn" :disabled="saving">
            <svg v-if="saving" class="spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="white" stroke-width="3" stroke-linecap="round"/>
            </svg>
            <CheckCircle v-else :size="17" :stroke-width="1.75" />
            <span>{{ saving ? 'Enregistrement…' : 'Enregistrer le suivi' }}</span>
          </button>
          <p class="form-actions__note">Les données sont chiffrées et transmises de façon sécurisée</p>
        </div>
      </form>
    </div>

    <!-- ── History table ── -->
    <div class="history-card">
      <div class="history-card__head">
        <div>
          <p class="history-card__title">Historique des suivis</p>
          <p class="history-card__sub">{{ followUps.length }} enregistrement{{ followUps.length !== 1 ? 's' : '' }}</p>
        </div>
      </div>

      <div v-if="loading" class="history-card__loading">
        <v-progress-circular indeterminate color="primary" size="36" width="3" />
      </div>

      <div v-else-if="!followUps.length" class="history-card__empty">
        <ClipboardList :size="48" :stroke-width="1.25" color="#CBD5E1" />
        <p class="history-card__empty-title">Aucun suivi enregistré</p>
        <p class="history-card__empty-sub">Soumettez votre premier suivi ci-dessus pour commencer</p>
      </div>

      <div v-else class="history-table">
        <div class="history-table__head">
          <span>Semaine</span>
          <span>Poids</span>
          <span>Tension</span>
          <span>LDL</span>
          <span>Activité</span>
          <span>Adhésion</span>
          <span>Tabac</span>
        </div>
        <div v-for="fu in followUps" :key="fu.id" class="history-table__row">
          <span class="history-table__date">{{ new Date(fu.semaine).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) }}</span>
          <span class="history-table__val">{{ fu.poids }} <em>kg</em></span>
          <span class="history-table__val">{{ fu.tensionSys }}/<span class="dim">{{ fu.tensionDia }}</span> <em>mmHg</em></span>
          <span class="history-table__val">{{ fu.ldl }} <em>g/L</em></span>
          <span class="history-table__val">{{ fu.activiteMinutes }} <em>min</em></span>
          <span>
            <span class="adherence-tag" :style="{
              background: (fu.medicamentsTotal > 0 ? Math.round(fu.medicamentsPris/fu.medicamentsTotal*100) : 100) >= 90 ? '#ECFDF5' : '#FEF3C7',
              color: (fu.medicamentsTotal > 0 ? Math.round(fu.medicamentsPris/fu.medicamentsTotal*100) : 100) >= 90 ? '#065F46' : '#92400E',
            }">
              {{ fu.medicamentsTotal > 0 ? Math.round(fu.medicamentsPris/fu.medicamentsTotal*100) : 100 }}%
            </span>
          </span>
          <span>
            <span class="status-dot" :class="fu.tabac ? 'status-dot--red' : 'status-dot--green'" />
            {{ fu.tabac ? 'Oui' : 'Non' }}
          </span>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.followup-page { width: 100%; display: flex; flex-direction: column; gap: 28px; }

/* Toast */
.toast {
  position: fixed; top: 24px; right: 24px; z-index: 9999;
  display: flex; align-items: center; gap: 10px;
  padding: 14px 20px; border-radius: 12px; font-size: 14px; font-weight: 600;
  box-shadow: 0 8px 32px rgba(15,23,42,0.16);
}
.toast--success { background: #0F172A; color: #34D399; }
.toast--error   { background: #0F172A; color: #F87171; }
.toast-enter-active, .toast-leave-active { transition: opacity 0.25s, transform 0.25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(16px); }

/* Page header */
.page-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
  padding-bottom: 24px; border-bottom: 1px solid #E2E8F0;
}
.page-header__title { font-size: 24px; font-weight: 800; color: #0F172A; letter-spacing: -0.03em; margin-bottom: 6px; }
.page-header__sub   { font-size: 14px; color: #64748B; font-weight: 500; }
.week-badge {
  display: flex; align-items: center;
  background: #EFF6FF; border: 1px solid #BFDBFE;
  border-radius: 8px; padding: 6px 12px;
  font-size: 12px; font-weight: 600; color: #1D4ED8;
}

/* Form card */
.form-card {
  background: #FFFFFF; border-radius: 20px;
  border: 1px solid #E2E8F0;
  box-shadow: 0 1px 3px rgba(15,23,42,0.05), 0 8px 32px rgba(15,23,42,0.05);
  overflow: hidden;
}

.form-card__head {
  display: flex; align-items: center; gap: 16px;
  padding: 24px 32px; border-bottom: 1px solid #F1F5F9;
  background: linear-gradient(135deg, #F8FAFC, #FFFFFF);
}
.form-card__head-icon {
  width: 48px; height: 48px; border-radius: 14px; flex-shrink: 0;
  background: linear-gradient(135deg, #2563EB, #1D4ED8);
  box-shadow: 0 4px 14px rgba(37,99,235,0.35);
  display: flex; align-items: center; justify-content: center;
}
.form-card__head-title { font-size: 16px; font-weight: 800; color: #0F172A; margin: 0 0 3px; letter-spacing: -0.02em; }
.form-card__head-sub   { font-size: 13px; color: #64748B; margin: 0; }

/* Form sections */
.form-section { padding: 24px 32px; border-bottom: 1px solid #F8FAFC; }
.form-section:last-of-type { border-bottom: none; }
.form-section__label {
  display: flex; align-items: center; font-size: 11px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase; color: #64748B;
  margin-bottom: 16px;
}

/* Grids */
.form-grid { display: grid; gap: 16px; }
.form-grid--1 { grid-template-columns: 1fr; max-width: 320px; }
.form-grid--2 { grid-template-columns: repeat(2, 1fr); }
.form-grid--3 { grid-template-columns: repeat(3, 1fr); }
@media (max-width: 768px) { .form-grid--3, .form-grid--2 { grid-template-columns: 1fr; } }

/* Field components */
.field { display: flex; flex-direction: column; gap: 6px; }
.field__label {
  font-size: 13px; font-weight: 600; color: #374151; user-select: none;
}
.field__hint { font-size: 11px; margin-top: 4px; font-weight: 500; }

.field__wrap {
  display: flex; align-items: center;
  background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 11px;
  overflow: hidden; transition: border-color 0.15s, box-shadow 0.15s;
}
.field__wrap:focus-within {
  border-color: #2563EB;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
}
.field__input {
  flex: 1; border: none; outline: none; background: transparent;
  font-size: 14px; font-weight: 500; color: #0F172A;
  padding: 11px 14px; font-family: 'Inter', sans-serif;
}
.field__input--has-left { padding-left: 8px; }
.field__unit-left {
  padding: 11px 10px 11px 14px; font-size: 11px; font-weight: 700;
  color: #94A3B8; background: #F8FAFC; border-right: 1px solid #E2E8F0;
  white-space: nowrap; letter-spacing: 0.04em;
}
.field__unit-right {
  padding: 11px 14px; font-size: 12px; font-weight: 600; color: #94A3B8;
  background: #F8FAFC; border-left: 1px solid #E2E8F0; white-space: nowrap;
}

.field__textarea {
  width: 100%; border: 1.5px solid #E2E8F0; border-radius: 11px;
  background: #FFFFFF; font-size: 14px; font-weight: 500; color: #0F172A;
  font-family: 'Inter', sans-serif; padding: 13px 16px; line-height: 1.6;
  resize: vertical; min-height: 100px; outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.field__textarea:focus { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
.field__textarea::placeholder { color: #CBD5E1; }

/* Adherence preview */
.adherence-preview { margin-top: 16px; }
.adherence-preview__label {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 13px; color: #64748B; font-weight: 500; margin-bottom: 8px;
}
.adherence-preview__pct { font-size: 16px; font-weight: 800; }
.adherence-preview__track { height: 8px; background: #F1F5F9; border-radius: 4px; overflow: hidden; }
.adherence-preview__fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }

/* Toggle cards */
.toggle-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
@media (max-width: 640px) { .toggle-grid { grid-template-columns: 1fr; } }

.toggle-card {
  display: flex; align-items: center; gap: 16px; padding: 18px 20px;
  background: #FAFAFA; border: 1.5px solid #E2E8F0; border-radius: 14px;
  cursor: pointer; text-align: left; transition: all 0.15s;
}
.toggle-card:hover { border-color: #CBD5E1; background: #F8FAFC; }
.toggle-card--active-red   { border-color: #FECACA; background: #FFF8F8; }
.toggle-card--active-orange { border-color: #FDE68A; background: #FFFBEB; }

.toggle-card__icon {
  width: 44px; height: 44px; border-radius: 12px; background: #F1F5F9;
  display: flex; align-items: center; justify-content: center;
  color: #94A3B8; flex-shrink: 0; transition: all 0.15s;
}
.toggle-card__icon--red    { background: #FEE2E2; color: #EF4444; }
.toggle-card__icon--orange { background: #FEF3C7; color: #D97706; }

.toggle-card__body { flex: 1; }
.toggle-card__name   { font-size: 14px; font-weight: 700; color: #0F172A; margin: 0 0 3px; }
.toggle-card__status { font-size: 12px; color: #64748B; margin: 0; }

.toggle-card__pill {
  padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; flex-shrink: 0;
}
.toggle-card__pill--on     { background: #FEE2E2; color: #EF4444; }
.toggle-card__pill--orange { background: #FEF3C7; color: #D97706; }
.toggle-card__pill--off    { background: #F1F5F9; color: #94A3B8; }

/* Form actions */
.form-actions {
  padding: 24px 32px 32px; display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
}
.submit-btn {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 14px 28px; background: linear-gradient(135deg, #2563EB, #1D4ED8);
  color: white; border: none; border-radius: 12px;
  font-size: 15px; font-weight: 700; cursor: pointer;
  box-shadow: 0 4px 16px rgba(37,99,235,0.4); letter-spacing: -0.01em;
  transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
}
.submit-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37,99,235,0.45); }
.submit-btn:disabled { opacity: 0.65; cursor: not-allowed; }
.form-actions__note { font-size: 12px; color: #94A3B8; font-weight: 500; }

.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* History card */
.history-card {
  background: #FFFFFF; border-radius: 20px; border: 1px solid #E2E8F0;
  box-shadow: 0 1px 3px rgba(15,23,42,0.05), 0 8px 32px rgba(15,23,42,0.04);
  overflow: hidden;
}
.history-card__head {
  padding: 22px 32px; border-bottom: 1px solid #F1F5F9;
  display: flex; align-items: center; justify-content: space-between;
}
.history-card__title { font-size: 16px; font-weight: 800; color: #0F172A; margin: 0 0 4px; letter-spacing: -0.02em; }
.history-card__sub   { font-size: 13px; color: #94A3B8; margin: 0; }

.history-card__loading { display: flex; align-items: center; justify-content: center; padding: 48px; }
.history-card__empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 56px 32px; text-align: center; }
.history-card__empty-title { font-size: 16px; font-weight: 700; color: #0F172A; margin: 4px 0 0; }
.history-card__empty-sub   { font-size: 13px; color: #94A3B8; }

/* History table */
.history-table { width: 100%; }
.history-table__head {
  display: grid; grid-template-columns: 1.5fr 1fr 1.5fr 1fr 1fr 1fr 1fr;
  padding: 10px 32px; background: #F8FAFC; border-bottom: 1px solid #F1F5F9;
  font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: #94A3B8;
  gap: 8px;
}
.history-table__row {
  display: grid; grid-template-columns: 1.5fr 1fr 1.5fr 1fr 1fr 1fr 1fr;
  padding: 14px 32px; border-bottom: 1px solid #F8FAFC;
  font-size: 13px; color: #334155; align-items: center; gap: 8px;
  transition: background 0.12s;
}
.history-table__row:hover { background: #F8FAFC; }
.history-table__row:last-child { border-bottom: none; }
.history-table__date { font-weight: 700; color: #0F172A; }
.history-table__val { font-weight: 600; }
.history-table__val em { font-style: normal; font-size: 11px; color: #94A3B8; margin-left: 2px; }
.dim { color: #94A3B8; }

.adherence-tag {
  display: inline-block; padding: 3px 10px; border-radius: 20px;
  font-size: 12px; font-weight: 700;
}
.status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 6px; }
.status-dot--red   { background: #EF4444; }
.status-dot--green { background: #10B981; }
</style>
