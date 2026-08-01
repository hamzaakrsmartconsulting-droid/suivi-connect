<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/services/api'

const saving  = ref(false)
const loading = ref(true)
const saved   = ref(false)

const form = ref({
  nomComplet:    '',
  specialite:    '',
  telephone:     '',
  adresse:       '',
  rppsNumber:    '',
  signatureText: '',
})

async function load() {
  try {
    const { data } = await api.get('/doctor/profile')
    Object.assign(form.value, {
      nomComplet:    data.nomComplet    ?? '',
      specialite:    data.specialite    ?? '',
      telephone:     data.telephone     ?? '',
      adresse:       data.adresse       ?? '',
      rppsNumber:    data.rppsNumber    ?? '',
      signatureText: data.signatureText ?? '',
    })
  } finally { loading.value = false }
}

async function save() {
  saving.value = true
  saved.value  = false
  try {
    await api.patch('/doctor/profile', form.value)
    saved.value = true
    setTimeout(() => { saved.value = false }, 3000)
  } finally { saving.value = false }
}

onMounted(load)
</script>

<template>
  <div class="profile-page">
    <div class="profile-header">
      <div class="profile-header__icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </div>
      <div>
        <h1 class="profile-header__title">Mon profil médecin</h1>
        <p class="profile-header__sub">Ces informations apparaissent sur vos ordonnances</p>
      </div>
    </div>

    <div v-if="loading" class="profile-loading">Chargement…</div>

    <form v-else class="profile-form" @submit.prevent="save">
      <div class="pf-section">
        <p class="pf-section__title">Informations générales</p>
        <div class="pf-grid">
          <div class="pf-field">
            <label class="pf-label">Nom complet</label>
            <input v-model="form.nomComplet" class="pf-input" placeholder="Dr. Jean Dupont" />
          </div>
          <div class="pf-field">
            <label class="pf-label">Spécialité</label>
            <input v-model="form.specialite" class="pf-input" placeholder="Cardiologie" />
          </div>
        </div>
      </div>

      <div class="pf-section">
        <p class="pf-section__title">En-tête ordonnance</p>
        <div class="pf-grid">
          <div class="pf-field">
            <label class="pf-label">Téléphone</label>
            <input v-model="form.telephone" class="pf-input" placeholder="+33 1 23 45 67 89" />
          </div>
          <div class="pf-field">
            <label class="pf-label">Numéro RPPS</label>
            <input v-model="form.rppsNumber" class="pf-input" placeholder="10 chiffres" />
          </div>
          <div class="pf-field pf-field--full">
            <label class="pf-label">Adresse du cabinet</label>
            <input v-model="form.adresse" class="pf-input" placeholder="12 rue de la Santé, 75014 Paris" />
          </div>
        </div>
      </div>

      <div class="pf-section">
        <p class="pf-section__title">Signature</p>
        <div class="pf-field">
          <label class="pf-label">Nom cursif pour la signature</label>
          <input v-model="form.signatureText" class="pf-input pf-input--cursive" placeholder="Dr. Jean Dupont" />
          <p class="pf-hint">Laissez vide pour utiliser votre nom complet</p>
        </div>
        <div v-if="form.signatureText || form.nomComplet" class="pf-sig-preview">
          <span class="pf-sig-preview__label">Aperçu :</span>
          <span class="pf-sig-preview__cursive">{{ form.signatureText || `Dr. ${form.nomComplet}` }}</span>
        </div>
      </div>

      <div class="pf-actions">
        <button type="submit" class="pf-btn pf-btn--save" :disabled="saving">
          <svg v-if="!saving && !saved" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          <svg v-else-if="saved" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span class="spin" v-if="saving" />
          {{ saved ? 'Sauvegardé !' : saving ? 'Sauvegarde…' : 'Sauvegarder' }}
        </button>
        <transition name="fade">
          <p v-if="saved" class="pf-saved-msg">✓ Profil mis à jour avec succès</p>
        </transition>
      </div>
    </form>
  </div>
</template>

<style scoped>
.profile-page {
  max-width: 720px; margin: 0 auto; padding: 32px 24px;
  display: flex; flex-direction: column; gap: 24px;
}

.profile-header {
  display: flex; align-items: center; gap: 18px;
}
.profile-header__icon {
  width: 52px; height: 52px; border-radius: 16px;
  background: linear-gradient(135deg, #2563EB, #7C3AED);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.profile-header__title { font-size: 22px; font-weight: 800; color: #0F172A; margin: 0 0 3px; }
.profile-header__sub   { font-size: 13px; color: #64748B; margin: 0; }

.profile-loading { text-align: center; color: #64748B; padding: 48px; }

.profile-form { display: flex; flex-direction: column; gap: 20px; }

.pf-section {
  background: white; border: 1px solid #E2E8F0; border-radius: 16px;
  padding: 22px 24px; display: flex; flex-direction: column; gap: 16px;
}
.pf-section__title {
  font-size: 12px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.07em; color: #94A3B8;
}
.pf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.pf-field { display: flex; flex-direction: column; gap: 6px; }
.pf-field--full { grid-column: 1 / -1; }

.pf-label { font-size: 12px; font-weight: 600; color: #374151; }
.pf-input {
  padding: 10px 14px; border-radius: 10px; border: 1.5px solid #E2E8F0;
  font-size: 14px; color: #0F172A; background: #F8FAFC;
  outline: none; transition: border-color 0.15s;
  font-family: inherit;
}
.pf-input:focus { border-color: #2563EB; background: white; }
.pf-input--cursive { font-family: 'Dancing Script', 'Brush Script MT', 'Segoe Script', cursive; font-size: 22px; }

.pf-hint { font-size: 11px; color: #94A3B8; margin: 0; }

.pf-sig-preview {
  display: flex; align-items: center; gap: 14px;
  background: #F8FAFC; border: 1px dashed #CBD5E1;
  border-radius: 10px; padding: 12px 18px;
}
.pf-sig-preview__label { font-size: 11px; color: #94A3B8; flex-shrink: 0; }
.pf-sig-preview__cursive {
  font-family: 'Dancing Script', 'Brush Script MT', 'Segoe Script', cursive;
  font-size: 32px; color: #1E3A8A; line-height: 1;
}

.pf-actions { display: flex; align-items: center; gap: 16px; }

.pf-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 11px 24px; border-radius: 12px; border: none;
  font-size: 14px; font-weight: 700; cursor: pointer; transition: opacity 0.15s;
}
.pf-btn--save { background: linear-gradient(135deg, #2563EB, #1D4ED8); color: white; }
.pf-btn--save:disabled { opacity: 0.6; cursor: not-allowed; }
.pf-btn--save:not(:disabled):hover { opacity: 0.88; }

.pf-saved-msg { font-size: 13px; color: #16A34A; font-weight: 600; margin: 0; }

.spin {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.3); border-top-color: white;
  animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
