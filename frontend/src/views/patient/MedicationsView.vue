<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Pill, Clock, CalendarCheck, CalendarX, Download, FileText } from '@lucide/vue'
import api from '@/services/api'

interface Medication {
  id: string; nom: string; dosage: string; frequence: string
  dateDebut: string; dateFin: string | null; actif: boolean
}

interface Ordonnance {
  id: string
  downloadUrl: string
  medications: any[]
  createdAt: string
  doctor: { nomComplet: string; specialite: string }
}

const medications = ref<Medication[]>([])
const ordonnances = ref<Ordonnance[]>([])
const loading     = ref(true)

const activeMeds   = computed(() => medications.value.filter(m => m.actif))
const inactiveMeds = computed(() => medications.value.filter(m => !m.actif))

async function loadMedications() {
  loading.value = true
  try {
    const [medsRes, ordoRes] = await Promise.all([
      api.get('/patient/medications'),
      api.get('/patient/ordonnances'),
    ])
    medications.value = medsRes.data
    ordonnances.value = ordoRes.data
  } finally {
    loading.value = false
  }
}

onMounted(loadMedications)
</script>

<template>
  <div class="meds-page">

    <!-- Header -->
    <div class="page-header">
      <div class="page-header__text">
        <p class="section-label">Espace patient</p>
        <h1 class="page-header__title">Mes médicaments</h1>
        <p class="page-header__sub">{{ medications.length }} médicament{{ medications.length !== 1 ? 's' : '' }} au total · {{ activeMeds.length }} actif{{ activeMeds.length !== 1 ? 's' : '' }}</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="center-loader">
      <v-progress-circular indeterminate color="primary" size="40" width="3" />
    </div>

    <!-- Empty state -->
    <div v-else-if="!medications.length" class="empty-state">
      <div class="empty-state__icon">
        <Pill :size="36" :stroke-width="1.5" color="#93C5FD" />
      </div>
      <p class="empty-state__title">Aucun médicament prescrit</p>
      <p class="empty-state__sub">Vos médicaments apparaîtront ici une fois prescrits par votre médecin</p>
    </div>

    <template v-else>
      <!-- Active medications -->
      <section v-if="activeMeds.length">
        <p class="section-label">Traitements actifs</p>
        <div class="med-grid">
          <div v-for="med in activeMeds" :key="med.id" class="med-card">
            <div class="med-card__accent" />
            <div class="med-card__body">
              <div class="med-card__header">
                <div class="med-card__icon">
                  <Pill :size="20" :stroke-width="1.75" color="#2563EB" />
                </div>
                <div class="med-card__info">
                  <p class="med-card__name">{{ med.nom }}</p>
                  <p class="med-card__dosage">{{ med.dosage }}</p>
                </div>
                <span class="med-card__active-badge">Actif</span>
              </div>

              <div class="med-card__details">
                <div class="med-card__detail">
                  <Clock :size="13" :stroke-width="1.75" color="#94A3B8" />
                  <span>{{ med.frequence }}</span>
                </div>
                <div class="med-card__detail">
                  <CalendarCheck :size="13" :stroke-width="1.75" color="#94A3B8" />
                  <span>Depuis {{ new Date(med.dateDebut).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' }) }}</span>
                </div>
                <div v-if="med.dateFin" class="med-card__detail">
                  <CalendarX :size="13" :stroke-width="1.75" color="#F59E0B" />
                  <span>Jusqu'au {{ new Date(med.dateFin).toLocaleDateString('fr-FR') }}</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      <!-- Inactive medications -->
      <section v-if="inactiveMeds.length" class="mt-section">
        <p class="section-label">Traitements terminés</p>
        <div class="med-grid">
          <div v-for="med in inactiveMeds" :key="med.id" class="med-card med-card--inactive">
            <div class="med-card__accent med-card__accent--grey" />
            <div class="med-card__body">
              <div class="med-card__header">
                <div class="med-card__icon med-card__icon--grey">
                  <Pill :size="20" :stroke-width="1.75" color="#94A3B8" />
                </div>
                <div class="med-card__info">
                  <p class="med-card__name">{{ med.nom }}</p>
                  <p class="med-card__dosage">{{ med.dosage }}</p>
                </div>
                <span class="med-card__inactive-badge">Terminé</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>


  <!-- ── ORDONNANCES RECEIVED ─────────────────────────────────────────────────── -->
  <section class="ordo-section">
    <div class="ordo-section__header">
      <div class="ordo-section__icon">
        <FileText :size="18" :stroke-width="2" color="white" />
      </div>
      <div>
        <p class="ordo-section__title">Ordonnances reçues</p>
        <p class="ordo-section__sub">Téléchargez vos ordonnances émises par votre médecin</p>
      </div>
    </div>

    <div v-if="!ordonnances.length" class="ordo-empty">
      <FileText :size="32" :stroke-width="1.5" color="#CBD5E1" />
      <p>Aucune ordonnance reçue pour l'instant</p>
    </div>

    <div v-else class="ordo-list">
      <div v-for="o in ordonnances" :key="o.id" class="ordo-card">
        <div class="ordo-card__icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        </div>
        <div class="ordo-card__info">
          <p class="ordo-card__doctor">Dr. {{ o.doctor.nomComplet }}</p>
          <p class="ordo-card__spec">{{ o.doctor.specialite }}</p>
          <p class="ordo-card__date">{{ new Date(o.createdAt).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' }) }}</p>
          <div class="ordo-card__meds">
            <span v-for="(m, i) in (o.medications as any[])" :key="i" class="ordo-card__pill">
              {{ m.nom }} {{ m.dosage }}
            </span>
          </div>
        </div>
        <a :href="o.downloadUrl" target="_blank" download class="ordo-download-btn">
          <Download :size="15" :stroke-width="2.5" />
          Télécharger PDF
        </a>
      </div>
    </div>
  </section>

  </div>
</template>

<style scoped>
.meds-page { width: 100%; max-width: 100%; overflow: visible; }

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

/* Loading / empty */
.center-loader { display: flex; align-items: center; justify-content: center; padding: 64px; }
.empty-state {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 80px 32px; text-align: center;
}
.empty-state__icon {
  width: 80px; height: 80px; border-radius: 24px; background: #EFF6FF;
  display: flex; align-items: center; justify-content: center; margin-bottom: 8px;
}
.empty-state__title { font-size: 18px; font-weight: 800; color: #0F172A; }
.empty-state__sub   { font-size: 14px; color: #94A3B8; max-width: 300px; }

/* Med grid */
.med-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 18px; margin-bottom: 32px; }
.mt-section { margin-top: 32px; }

/* Med card */
.med-card {
  background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0;
  box-shadow: 0 1px 3px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.04);
  overflow: hidden; display: flex;
  transition: box-shadow 0.2s, transform 0.2s;
}
.med-card:hover { box-shadow: 0 4px 16px rgba(15,23,42,0.10); transform: translateY(-2px); }
.med-card--inactive { opacity: 0.7; }

.med-card__accent { width: 4px; background: linear-gradient(180deg, #2563EB, #60A5FA); flex-shrink: 0; }
.med-card__accent--grey { background: #CBD5E1; }
.med-card__body { flex: 1; padding: 20px 22px; }

.med-card__header { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 16px; }
.med-card__icon {
  width: 44px; height: 44px; border-radius: 12px; background: #EFF6FF;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.med-card__icon--grey { background: #F1F5F9; }
.med-card__info { flex: 1; }
.med-card__name   { font-size: 16px; font-weight: 800; color: #0F172A; margin: 0 0 4px; letter-spacing: -0.02em; }
.med-card__dosage { font-size: 13px; color: #64748B; margin: 0; font-weight: 500; }

.med-card__active-badge {
  background: #ECFDF5; color: #065F46; font-size: 11px; font-weight: 700;
  padding: 3px 10px; border-radius: 20px; flex-shrink: 0;
}
.med-card__inactive-badge {
  background: #F1F5F9; color: #64748B; font-size: 11px; font-weight: 700;
  padding: 3px 10px; border-radius: 20px; flex-shrink: 0;
}

.med-card__details { display: flex; flex-direction: column; gap: 7px; margin-bottom: 18px; }
.med-card__detail { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #64748B; font-weight: 500; }

/* Field common (shared with FollowUpView pattern) */
.field__wrap {
  display: flex; align-items: center;
  background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 10px;
  overflow: hidden; transition: border-color 0.15s, box-shadow 0.15s;
}
.field__wrap:focus-within { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
.field__input {
  flex: 1; border: none; outline: none; background: transparent;
  font-size: 14px; font-weight: 500; color: #0F172A;
  padding: 11px 14px; font-family: 'Inter', sans-serif; width: 100%;
}

/* ── Ordonnances ─────────────────────────────────────────────────────────── */
.ordo-section {
  margin-top: 32px;
  background: white; border: 1px solid #E2E8F0; border-radius: 20px; overflow: hidden;
}
.ordo-section__header {
  display: flex; align-items: center; gap: 14px;
  padding: 20px 24px; border-bottom: 1px solid #F1F5F9;
}
.ordo-section__icon {
  width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
  background: linear-gradient(135deg, #2563EB, #7C3AED);
  display: flex; align-items: center; justify-content: center;
}
.ordo-section__title { font-size: 15px; font-weight: 800; color: #0F172A; margin: 0 0 2px; }
.ordo-section__sub   { font-size: 12px; color: #64748B; margin: 0; }

.ordo-empty {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 40px; color: #94A3B8; font-size: 13px; text-align: center;
}

.ordo-list { display: flex; flex-direction: column; }

.ordo-card {
  display: flex; align-items: center; gap: 16px;
  padding: 18px 24px; border-bottom: 1px solid #F8FAFC;
  transition: background 0.12s;
}
.ordo-card:last-child { border-bottom: none; }
.ordo-card:hover { background: #F8FAFF; }

.ordo-card__icon {
  width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
  background: #EFF6FF; display: flex; align-items: center; justify-content: center;
}
.ordo-card__info { flex: 1; min-width: 0; }
.ordo-card__doctor { font-size: 14px; font-weight: 700; color: #0F172A; margin: 0 0 1px; }
.ordo-card__spec   { font-size: 11px; color: #2563EB; font-weight: 600; margin: 0 0 3px; }
.ordo-card__date   { font-size: 11px; color: #94A3B8; margin: 0 0 6px; }
.ordo-card__meds   { display: flex; flex-wrap: wrap; gap: 5px; }
.ordo-card__pill   {
  padding: 2px 9px; border-radius: 20px; background: #EFF6FF;
  font-size: 11px; font-weight: 600; color: #2563EB;
}

.ordo-download-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 20px; border-radius: 10px;
  background: #0D9488; color: white; text-decoration: none;
  font-size: 13px; font-weight: 700; flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(13,148,136,0.28);
  transition: background 0.15s, transform 0.12s, box-shadow 0.15s;
}
.ordo-download-btn:hover {
  background: #0B7A70;
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(13,148,136,0.36);
}
</style>
