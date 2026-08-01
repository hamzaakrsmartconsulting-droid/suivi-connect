<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AuthLeftPanel from '@/components/auth/AuthLeftPanel.vue'

const router = useRouter()
const auth = useAuthStore()

const form = ref({
  email: '',
  password: '',
  role: 'PATIENT' as 'PATIENT' | 'DOCTOR',
  nomComplet: '',
  age: 50,
  taille: 170,
  profession: '',
  dateProcedure: new Date().toISOString().split('T')[0],
  specialite: 'Cardiologie',
})

const error = ref('')
const showPassword = ref(false)

async function handleRegister() {
  error.value = ''
  try {
    const data = await auth.register(form.value)
    router.push(data.user.role === 'DOCTOR' ? '/medecin/tableau-de-bord' : '/patient/tableau-de-bord')
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    error.value = err.response?.data?.error || 'Erreur lors de l\'inscription'
  }
}
</script>

<template>
  <div class="auth-root">
    <AuthLeftPanel />

    <div class="auth-right">
      <div class="auth-form-wrap">

        <div class="auth-form-wrap__mobile-brand">
          <div class="brand-logo brand-logo--sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 12h4l2-5 4 10 2-5h6" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <span>SuiviConnect</span>
        </div>

        <h2 class="auth-form-wrap__title">Créer un compte</h2>
        <p class="auth-form-wrap__sub">Rejoignez la plateforme de suivi médical connecté</p>

        <div v-if="error" class="auth-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#EF4444" stroke-width="2"/><path d="M12 8v5M12 16h.01" stroke="#EF4444" stroke-width="2" stroke-linecap="round"/></svg>
          {{ error }}
        </div>

        <form class="auth-form" @submit.prevent="handleRegister">

          <!-- Role toggle -->
          <div class="field-group">
            <label class="field-label">Type de compte</label>
            <div class="role-toggle">
              <button
                type="button"
                class="role-toggle__btn"
                :class="{ 'role-toggle__btn--active': form.role === 'PATIENT' }"
                @click="form.role = 'PATIENT'"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" :stroke="form.role === 'PATIENT' ? '#2563EB' : '#94A3B8'" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="7" r="4" :stroke="form.role === 'PATIENT' ? '#2563EB' : '#94A3B8'" stroke-width="2"/></svg>
                Patient
              </button>
              <button
                type="button"
                class="role-toggle__btn"
                :class="{ 'role-toggle__btn--active': form.role === 'DOCTOR' }"
                @click="form.role = 'DOCTOR'"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" :stroke="form.role === 'DOCTOR' ? '#2563EB' : '#94A3B8'" stroke-width="2" stroke-linecap="round"/></svg>
                Médecin
              </button>
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Nom complet</label>
            <div class="field-wrap">
              <svg class="field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#94A3B8" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="7" r="4" stroke="#94A3B8" stroke-width="1.8"/></svg>
              <input v-model="form.nomComplet" type="text" placeholder="Jean Dupont" class="field-input" autocomplete="name" required />
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Email</label>
            <div class="field-wrap">
              <svg class="field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#94A3B8" stroke-width="1.8"/><polyline points="22,6 12,13 2,6" stroke="#94A3B8" stroke-width="1.8"/></svg>
              <input v-model="form.email" type="email" placeholder="votre@email.fr" class="field-input" autocomplete="email" required />
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Mot de passe</label>
            <div class="field-wrap">
              <svg class="field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#94A3B8" stroke-width="1.8"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#94A3B8" stroke-width="1.8"/></svg>
              <input v-model="form.password" :type="showPassword ? 'text' : 'password'" placeholder="••••••••" class="field-input" autocomplete="new-password" required />
              <button type="button" class="field-toggle" @click="showPassword = !showPassword">
                <svg v-if="!showPassword" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#94A3B8" stroke-width="1.8"/><circle cx="12" cy="12" r="3" stroke="#94A3B8" stroke-width="1.8"/></svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="#94A3B8" stroke-width="1.8" stroke-linecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="#94A3B8" stroke-width="1.8" stroke-linecap="round"/></svg>
              </button>
            </div>
          </div>

          <!-- Patient fields -->
          <template v-if="form.role === 'PATIENT'">
            <div class="form-section">
              <p class="form-section__label">Informations patient</p>
              <div class="field-row">
                <div class="field-group">
                  <label class="field-label">Âge</label>
                  <div class="field-wrap">
                    <input v-model.number="form.age" type="number" min="1" max="120" class="field-input field-input--no-icon" required />
                  </div>
                </div>
                <div class="field-group">
                  <label class="field-label">Taille (cm)</label>
                  <div class="field-wrap">
                    <input v-model.number="form.taille" type="number" min="100" max="250" class="field-input field-input--no-icon" required />
                  </div>
                </div>
              </div>
              <div class="field-group">
                <label class="field-label">Profession</label>
                <div class="field-wrap">
                  <svg class="field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="14" rx="2" stroke="#94A3B8" stroke-width="1.8"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="#94A3B8" stroke-width="1.8"/></svg>
                  <input v-model="form.profession" type="text" placeholder="Ingénieur" class="field-input" />
                </div>
              </div>
              <div class="field-group">
                <label class="field-label">Date de procédure</label>
                <div class="field-wrap">
                  <svg class="field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="#94A3B8" stroke-width="1.8"/><line x1="16" y1="2" x2="16" y2="6" stroke="#94A3B8" stroke-width="1.8"/><line x1="8" y1="2" x2="8" y2="6" stroke="#94A3B8" stroke-width="1.8"/><line x1="3" y1="10" x2="21" y2="10" stroke="#94A3B8" stroke-width="1.8"/></svg>
                  <input v-model="form.dateProcedure" type="date" class="field-input" required />
                </div>
              </div>
            </div>
          </template>

          <!-- Doctor fields -->
          <template v-else>
            <div class="form-section">
              <p class="form-section__label">Informations médecin</p>
              <div class="field-group">
                <label class="field-label">Spécialité</label>
                <div class="field-wrap">
                  <svg class="field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#94A3B8" stroke-width="1.8" stroke-linecap="round"/></svg>
                  <input v-model="form.specialite" type="text" placeholder="Cardiologie" class="field-input" required />
                </div>
              </div>
            </div>
          </template>

          <button type="submit" class="submit-btn" :disabled="auth.loading">
            <span v-if="!auth.loading">S'inscrire</span>
            <svg v-else class="spin" width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" stroke-width="3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="white" stroke-width="3" stroke-linecap="round"/></svg>
          </button>
        </form>

        <p class="auth-footer-link">
          Déjà un compte ?
          <router-link to="/connexion">Se connecter</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-root {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
}
@media (max-width: 900px) {
  .auth-root { grid-template-columns: 1fr; }
  .auth-root :deep(.auth-left) { display: none; }
}

.auth-right {
  background: #F8FAFC;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 32px;
  min-height: 100vh;
  overflow-y: auto;
}

.auth-form-wrap {
  width: 100%;
  max-width: 440px;
  padding: 8px 0 32px;
}

.auth-form-wrap__mobile-brand {
  display: none;
  align-items: center;
  gap: 10px;
  margin-bottom: 32px;
  font-size: 16px;
  font-weight: 800;
  color: #0F172A;
  letter-spacing: -0.03em;
}
@media (max-width: 900px) { .auth-form-wrap__mobile-brand { display: flex; } }

.brand-logo--sm {
  width: 32px; height: 32px; border-radius: 9px;
  background: linear-gradient(135deg, #2563EB, #1D4ED8);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.4);
}

.auth-form-wrap__title {
  font-size: 28px;
  font-weight: 800;
  color: #0F172A;
  letter-spacing: -0.04em;
  margin-bottom: 6px;
}
.auth-form-wrap__sub {
  font-size: 14px;
  color: #64748B;
  font-weight: 500;
  margin-bottom: 28px;
}

.auth-error {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #FEF2F2;
  border: 1px solid #FECACA;
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 13px;
  color: #B91C1C;
  font-weight: 500;
  margin-bottom: 20px;
}

.auth-form { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }

.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 13px; font-weight: 600; color: #374151; }

.field-wrap {
  position: relative;
  display: flex;
  align-items: center;
  background: #FFFFFF;
  border: 1.5px solid #E2E8F0;
  border-radius: 12px;
  padding: 0 14px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.field-wrap:focus-within {
  border-color: #2563EB;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}
.field-icon { flex-shrink: 0; }
.field-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: #0F172A;
  font-family: 'Inter', sans-serif;
  padding: 13px 12px;
  min-width: 0;
}
.field-input--no-icon { padding: 13px 4px; }
.field-input::placeholder { color: #CBD5E1; }
.field-toggle { background: none; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; flex-shrink: 0; }

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.role-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.role-toggle__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: #FFFFFF;
  border: 1.5px solid #E2E8F0;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #64748B;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s, box-shadow 0.15s;
}
.role-toggle__btn:hover { border-color: #CBD5E1; background: #F8FAFC; }
.role-toggle__btn--active {
  border-color: #2563EB;
  background: #EFF6FF;
  color: #2563EB;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 14px;
}
.form-section__label {
  font-size: 11px;
  font-weight: 700;
  color: #94A3B8;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 2px;
}

.submit-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #2563EB, #1D4ED8);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  letter-spacing: -0.01em;
  transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.4);
  margin-top: 4px;
}
.submit-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37,99,235,0.45); }
.submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.auth-footer-link { text-align: center; font-size: 13px; color: #64748B; }
.auth-footer-link a { color: #2563EB; font-weight: 600; text-decoration: none; }
.auth-footer-link a:hover { text-decoration: underline; }
</style>
