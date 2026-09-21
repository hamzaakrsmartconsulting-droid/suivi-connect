<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import {
  User, Ruler, Briefcase, CalendarDays, Clock, Activity,
  Save, CheckCircle, AlertCircle, Loader2, Download, Trash2,
} from '@lucide/vue'

const auth   = useAuthStore()
const router = useRouter()

const profile = ref({
  nomComplet: '',
  age: 0,
  taille: 0,
  profession: '',
  dateProcedure: '',
  sejourReeducation: '',
  stadeRecommande: '',
})

const loading  = ref(true)
const saving   = ref(false)
const status   = ref<'idle' | 'ok' | 'error'>('idle')

const initials = computed(() =>
  (profile.value.nomComplet || auth.user?.email || '?')
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
)

async function loadProfile() {
  loading.value = true
  try {
    const { data } = await api.get('/patient/profile')
    profile.value = { ...data, dateProcedure: data.dateProcedure?.split('T')[0] || '' }
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  status.value = 'idle'
  try {
    await api.put('/patient/profile', profile.value)
    status.value = 'ok'
    setTimeout(() => { status.value = 'idle' }, 4000)
  } catch {
    status.value = 'error'
    setTimeout(() => { status.value = 'idle' }, 4000)
  } finally {
    saving.value = false
  }
}

// ── RGPD: export data ──────────────────────────────────────────────────────
const exporting = ref(false)
const exportError = ref('')
async function exportData() {
  exporting.value = true
  try {
    const res = await api.get('/patient/export', { responseType: 'blob' })
    const cd  = res.headers['content-disposition'] || ''
    const match = cd.match(/filename="([^"]+)"/)
    const filename = match ? match[1] : 'mes-donnees.json'
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/json' }))
    const a   = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  } catch {
    exportError.value = 'Erreur lors de l\'export de vos données.'
    setTimeout(() => { exportError.value = '' }, 4000)
  } finally {
    exporting.value = false
  }
}

// ── RGPD: delete account ───────────────────────────────────────────────────
const showDeleteModal = ref(false)
const deletePassword  = ref('')
const deleteError     = ref('')
const deleting        = ref(false)

async function confirmDelete() {
  if (!deletePassword.value) { deleteError.value = 'Veuillez entrer votre mot de passe.'; return }
  deleting.value = true
  deleteError.value = ''
  try {
    await api.delete('/patient/account', { data: { password: deletePassword.value } })
    auth.logout()
    router.push('/login')
  } catch (err: any) {
    deleteError.value = err?.response?.data?.message || 'Mot de passe incorrect.'
  } finally {
    deleting.value = false
  }
}

onMounted(loadProfile)
</script>

<template>
  <div class="profile-page">

    <!-- Header card -->
    <div class="profile-hero">
      <div class="profile-hero__avatar">{{ initials }}</div>
      <div class="profile-hero__info">
        <h1 class="profile-hero__name">{{ profile.nomComplet || '—' }}</h1>
        <p class="profile-hero__meta">
          <span class="profile-hero__tag">Patient</span>
          <span v-if="profile.stadeRecommande" class="profile-hero__tag profile-hero__tag--teal">
            {{ profile.stadeRecommande }}
          </span>
          <span v-if="profile.profession" class="profile-hero__sub">· {{ profile.profession }}</span>
        </p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="profile-loading">
      <Loader2 :size="28" :stroke-width="1.75" class="spin" color="#1677C8" />
      <span>Chargement du profil…</span>
    </div>

    <template v-else>
      <!-- Success / error toast -->
      <Transition name="toast">
        <div v-if="status === 'ok'" class="profile-toast profile-toast--ok">
          <CheckCircle :size="16" :stroke-width="2" />
          Profil mis à jour avec succès.
        </div>
        <div v-else-if="status === 'error'" class="profile-toast profile-toast--err">
          <AlertCircle :size="16" :stroke-width="2" />
          Erreur lors de la sauvegarde.
        </div>
      </Transition>
      <Transition name="toast">
        <div v-if="exportError" class="profile-toast profile-toast--err">
          <AlertCircle :size="16" :stroke-width="2" />
          {{ exportError }}
        </div>
      </Transition>

      <form class="profile-form" @submit.prevent="save">

        <!-- Section — Identité -->
        <section class="profile-section">
          <div class="profile-section__head">
            <span class="profile-section__icon"><User :size="15" :stroke-width="2" /></span>
            <span class="profile-section__title">Informations personnelles</span>
          </div>
          <div class="profile-grid profile-grid--3">
            <div class="pf">
              <label class="pf__label"><User :size="12" :stroke-width="2" /> Nom complet</label>
              <input v-model="profile.nomComplet" type="text" class="pf__input" placeholder="Jean Dupont" />
            </div>
            <div class="pf">
              <label class="pf__label"><Activity :size="12" :stroke-width="2" /> Âge</label>
              <input v-model.number="profile.age" type="number" min="1" max="120" class="pf__input" />
            </div>
            <div class="pf">
              <label class="pf__label"><Ruler :size="12" :stroke-width="2" /> Taille (cm)</label>
              <input v-model.number="profile.taille" type="number" min="100" max="250" class="pf__input" />
            </div>
            <div class="pf">
              <label class="pf__label"><Briefcase :size="12" :stroke-width="2" /> Profession</label>
              <input v-model="profile.profession" type="text" class="pf__input" placeholder="Ingénieur" />
            </div>
          </div>
        </section>

        <!-- Section — Suivi -->
        <section class="profile-section">
          <div class="profile-section__head">
            <span class="profile-section__icon profile-section__icon--teal"><CalendarDays :size="15" :stroke-width="2" /></span>
            <span class="profile-section__title">Suivi cardiaque</span>
          </div>
          <div class="profile-grid profile-grid--3">
            <div class="pf">
              <label class="pf__label"><CalendarDays :size="12" :stroke-width="2" /> Date de procédure</label>
              <input v-model="profile.dateProcedure" type="date" class="pf__input" />
            </div>
            <div class="pf">
              <label class="pf__label"><Clock :size="12" :stroke-width="2" /> Séjour de rééducation</label>
              <input v-model="profile.sejourReeducation" type="text" class="pf__input" placeholder="2 semaines" />
            </div>
            <div class="pf">
              <label class="pf__label"><Activity :size="12" :stroke-width="2" /> Stade recommandé</label>
              <input :value="profile.stadeRecommande" type="text" class="pf__input pf__input--readonly" readonly />
            </div>
          </div>
        </section>

        <!-- Actions -->
        <div class="profile-actions">
          <button type="submit" class="profile-save" :disabled="saving">
            <Loader2 v-if="saving" :size="15" :stroke-width="2" class="spin" />
            <Save v-else :size="15" :stroke-width="2" />
            {{ saving ? 'Enregistrement…' : 'Enregistrer les modifications' }}
          </button>
        </div>

      </form>

      <!-- ── RGPD section ─────────────────────────────────────────────── -->
      <section class="rgpd-section">
        <div class="profile-section__head">
          <span class="profile-section__icon profile-section__icon--warn">
            <User :size="15" :stroke-width="2" />
          </span>
          <span class="profile-section__title">Mes données personnelles (RGPD)</span>
        </div>
        <p class="rgpd-desc">
          Conformément au Règlement Général sur la Protection des Données, vous pouvez télécharger
          l'ensemble de vos données ou supprimer définitivement votre compte.
        </p>
        <div class="rgpd-actions">
          <button class="rgpd-btn rgpd-btn--export" :disabled="exporting" @click="exportData">
            <Loader2 v-if="exporting" :size="15" :stroke-width="2" class="spin" />
            <Download v-else :size="15" :stroke-width="2" />
            {{ exporting ? 'Préparation…' : 'Télécharger mes données' }}
          </button>
          <button class="rgpd-btn rgpd-btn--delete" @click="showDeleteModal = true">
            <Trash2 :size="15" :stroke-width="2" />
            Supprimer mon compte
          </button>
        </div>
      </section>

      <!-- ── Delete confirmation modal ──────────────────────────────── -->
      <Teleport to="body">
        <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
          <div class="modal-card">
            <h2 class="modal-title">Supprimer mon compte</h2>
            <p class="modal-body">
              Cette action est <strong>irréversible</strong>. Toutes vos données (suivis, médicaments,
              alertes, messages, rendez-vous…) seront définitivement supprimées.
            </p>
            <p class="modal-body">Pour confirmer, entrez votre mot de passe&nbsp;:</p>
            <input
              v-model="deletePassword"
              type="password"
              class="modal-input"
              placeholder="Votre mot de passe"
              @keyup.enter="confirmDelete"
            />
            <p v-if="deleteError" class="modal-error">{{ deleteError }}</p>
            <div class="modal-actions">
              <button class="modal-btn modal-btn--cancel" @click="showDeleteModal = false; deletePassword = ''; deleteError = ''">
                Annuler
              </button>
              <button class="modal-btn modal-btn--confirm" :disabled="deleting" @click="confirmDelete">
                <Loader2 v-if="deleting" :size="14" :stroke-width="2" class="spin" />
                {{ deleting ? 'Suppression…' : 'Supprimer définitivement' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>

    </template>
  </div>
</template>

<style scoped>
.profile-page {
  max-width: 780px;
  width: 100%;
}

/* ── Hero ── */
.profile-hero {
  display: flex;
  align-items: center;
  gap: 20px;
  background: #fff;
  border: 1px solid #E2EDF5;
  border-radius: 20px;
  padding: 24px 28px;
  margin-bottom: 20px;
  box-shadow: 0 1px 4px rgba(18,59,109,0.05);
}
.profile-hero__avatar {
  width: 64px; height: 64px; border-radius: 18px; flex-shrink: 0;
  background: #1677C8;
  color: #fff; font-size: 22px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  letter-spacing: -0.03em;
}
.profile-hero__name {
  font-size: 22px; font-weight: 800; color: #18324A;
  letter-spacing: -0.03em; margin: 0 0 6px;
}
.profile-hero__meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.profile-hero__tag {
  padding: 3px 10px; border-radius: 20px;
  font-size: 12px; font-weight: 700;
  background: #EEF5FB; color: #1677C8;
}
.profile-hero__tag--teal { background: #E6F8F6; color: #0D9488; }
.profile-hero__sub { font-size: 13px; color: #8AA0B4; font-weight: 500; }

/* ── Loading ── */
.profile-loading {
  display: flex; align-items: center; gap: 12px;
  padding: 40px; color: #8AA0B4; font-size: 14px;
}

/* ── Toast ── */
.profile-toast {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; border-radius: 12px;
  font-size: 13px; font-weight: 600;
  margin-bottom: 16px;
}
.profile-toast--ok  { background: #E6F8F6; color: #0D9488; border: 1px solid #A5E4DC; }
.profile-toast--err { background: #FFF1F2; color: #E11D48; border: 1px solid #FDA4AF; }
.toast-enter-active, .toast-leave-active { transition: all 0.3s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-8px); }

/* ── Form ── */
.profile-form { display: flex; flex-direction: column; gap: 16px; }

/* ── Section card ── */
.profile-section {
  background: #fff;
  border: 1px solid #E2EDF5;
  border-radius: 16px;
  padding: 20px 24px;
  box-shadow: 0 1px 4px rgba(18,59,109,0.04);
}
.profile-section__head {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid #EAF2F7;
}
.profile-section__icon {
  width: 30px; height: 30px; border-radius: 8px;
  background: #EEF5FB; color: #1677C8;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.profile-section__icon--teal { background: #E6F8F6; color: #0D9488; }
.profile-section__title {
  font-size: 14px; font-weight: 700; color: #18324A; letter-spacing: -0.01em;
}

/* ── Grid ── */
.profile-grid { display: grid; gap: 14px; }
.profile-grid--3 { grid-template-columns: repeat(3, 1fr); }
@media (max-width: 700px) { .profile-grid--3 { grid-template-columns: 1fr; } }
@media (max-width: 900px) { .profile-grid--3 { grid-template-columns: repeat(2, 1fr); } }

/* ── Field ── */
.pf { display: flex; flex-direction: column; gap: 6px; }
.pf__label {
  display: flex; align-items: center; gap: 5px;
  font-size: 11.5px; font-weight: 700; color: #5B738A; letter-spacing: 0.01em;
  text-transform: uppercase;
}
.pf__input {
  width: 100%; box-sizing: border-box;
  padding: 11px 14px;
  border: 1.5px solid #D7E5EE; border-radius: 10px;
  font-size: 14px; font-weight: 500; color: #18324A;
  background: #F7FBFD; font-family: inherit;
  outline: none; transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}
.pf__input:focus {
  border-color: #1677C8; background: #fff;
  box-shadow: 0 0 0 4px rgba(22,119,200,0.10);
}
.pf__input--readonly {
  background: #F0F6FA; color: #8AA0B4; cursor: not-allowed;
}

/* ── Actions ── */
.profile-actions { display: flex; justify-content: flex-end; }
.profile-save {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 28px; border: none; border-radius: 12px;
  background: #1677C8; color: #fff;
  font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit;
  box-shadow: 0 6px 16px rgba(22,119,200,0.28);
  transition: background 0.15s, transform 0.12s, box-shadow 0.15s;
  letter-spacing: -0.01em;
}
.profile-save:hover:not(:disabled) {
  background: #1260AC;
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(22,119,200,0.36);
}
.profile-save:disabled { opacity: 0.7; cursor: not-allowed; }

.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── RGPD section ── */
.rgpd-section {
  background: #fff;
  border: 1px solid #FFE4E6;
  border-radius: 16px;
  padding: 20px 24px;
  box-shadow: 0 1px 4px rgba(18,59,109,0.04);
}
.profile-section__icon--warn { background: #FFF1F2; color: #E11D48; }
.rgpd-desc {
  font-size: 13px; color: #5B738A; line-height: 1.6;
  margin: 0 0 16px;
}
.rgpd-actions { display: flex; gap: 12px; flex-wrap: wrap; }
.rgpd-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 11px 22px; border: none; border-radius: 10px;
  font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit;
  transition: background 0.15s, transform 0.12s;
}
.rgpd-btn--export {
  background: #EEF5FB; color: #1677C8;
}
.rgpd-btn--export:hover:not(:disabled) { background: #D8EAFA; transform: translateY(-1px); }
.rgpd-btn--delete {
  background: #FFF1F2; color: #E11D48;
}
.rgpd-btn--delete:hover { background: #FFE4E6; transform: translateY(-1px); }
.rgpd-btn:disabled { opacity: 0.7; cursor: not-allowed; }

/* ── Modal ── */
.modal-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(18,59,109,0.45);
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(2px);
}
.modal-card {
  background: #fff; border-radius: 20px;
  padding: 32px; max-width: 460px; width: 90%;
  box-shadow: 0 24px 60px rgba(18,59,109,0.25);
}
.modal-title {
  font-size: 18px; font-weight: 800; color: #18324A;
  margin: 0 0 14px; letter-spacing: -0.02em;
}
.modal-body {
  font-size: 14px; color: #5B738A; line-height: 1.6; margin: 0 0 10px;
}
.modal-input {
  width: 100%; box-sizing: border-box;
  padding: 11px 14px; border: 1.5px solid #D7E5EE; border-radius: 10px;
  font-size: 14px; color: #18324A; background: #F7FBFD;
  font-family: inherit; outline: none; margin-top: 4px;
  transition: border-color 0.15s;
}
.modal-input:focus { border-color: #1677C8; background: #fff; }
.modal-error {
  font-size: 13px; font-weight: 600; color: #E11D48; margin: 8px 0 0;
}
.modal-actions {
  display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px;
}
.modal-btn {
  padding: 11px 22px; border: none; border-radius: 10px;
  font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit;
  display: inline-flex; align-items: center; gap: 8px;
  transition: background 0.15s;
}
.modal-btn--cancel  { background: #F0F6FA; color: #5B738A; }
.modal-btn--cancel:hover { background: #E2EDF5; }
.modal-btn--confirm { background: #E11D48; color: #fff; }
.modal-btn--confirm:hover:not(:disabled) { background: #BE123C; }
.modal-btn--confirm:disabled { opacity: 0.7; cursor: not-allowed; }
</style>
