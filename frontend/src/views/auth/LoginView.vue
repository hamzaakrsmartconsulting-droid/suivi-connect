<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import AuthLeftPanel from '@/components/auth/AuthLeftPanel.vue'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const showPassword = ref(false)

async function handleLogin() {
  error.value = ''
  try {
    const data = await auth.login(email.value, password.value)
    router.push(data.user.role === 'DOCTOR' ? '/medecin/tableau-de-bord' : '/patient/tableau-de-bord')
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    error.value = err.response?.data?.error || 'Email ou mot de passe incorrect'
  }
}

async function forgotPassword() {
  if (!email.value) { error.value = 'Veuillez saisir votre email'; return }
  try {
    await api.post('/auth/forgot-password', { email: email.value })
    error.value = ''
  } catch { error.value = 'Erreur lors de l\'envoi' }
}
</script>

<template>
  <div class="login-root">

    <AuthLeftPanel />

    <!-- ── Right Panel ──────────────────────────────────────────── -->
    <div class="login-right">
      <div class="login-form-wrap">

        <!-- Mobile brand -->
        <div class="login-form-wrap__mobile-brand">
          <div class="brand-logo brand-logo--sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 12h4l2-5 4 10 2-5h6" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <span>SuiviConnect</span>
        </div>

        <h2 class="login-form-wrap__title">Bienvenue</h2>
        <p class="login-form-wrap__sub">Connectez-vous à votre espace de santé</p>

        <!-- Error -->
        <div v-if="error" class="login-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#EF4444" stroke-width="2"/><path d="M12 8v5M12 16h.01" stroke="#EF4444" stroke-width="2" stroke-linecap="round"/></svg>
          {{ error }}
        </div>

        <!-- Form -->
        <form class="login-form" @submit.prevent="handleLogin">
          <div class="field-group">
            <label class="field-label">Email</label>
            <div class="field-wrap">
              <svg class="field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#94A3B8" stroke-width="1.8"/><polyline points="22,6 12,13 2,6" stroke="#94A3B8" stroke-width="1.8"/></svg>
              <input v-model="email" type="email" placeholder="votre@email.fr" class="field-input" autocomplete="email" />
            </div>
          </div>

          <div class="field-group">
            <div class="field-label-row">
              <label class="field-label">Mot de passe</label>
              <button type="button" class="forgot-link" @click="forgotPassword">Oublié ?</button>
            </div>
            <div class="field-wrap">
              <svg class="field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#94A3B8" stroke-width="1.8"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#94A3B8" stroke-width="1.8"/></svg>
              <input v-model="password" :type="showPassword ? 'text' : 'password'" placeholder="••••••••" class="field-input" autocomplete="current-password" />
              <button type="button" class="field-toggle" @click="showPassword = !showPassword">
                <svg v-if="!showPassword" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#94A3B8" stroke-width="1.8"/><circle cx="12" cy="12" r="3" stroke="#94A3B8" stroke-width="1.8"/></svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="#94A3B8" stroke-width="1.8" stroke-linecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="#94A3B8" stroke-width="1.8" stroke-linecap="round"/></svg>
              </button>
            </div>
          </div>

          <button type="submit" class="submit-btn" :disabled="auth.loading">
            <span v-if="!auth.loading">Se connecter</span>
            <svg v-else class="spin" width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" stroke-width="3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="white" stroke-width="3" stroke-linecap="round"/></svg>
          </button>
        </form>

        <p class="register-link">Pas encore de compte ? <router-link to="/inscription">Créer un compte</router-link></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Root ── */
.login-root {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
}
@media (max-width: 900px) {
  .login-root { grid-template-columns: 1fr; }
  .login-root :deep(.auth-left) { display: none; }
}

/* ── Right panel ── */
.login-right {
  background: #F8FAFC;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 32px;
  min-height: 100vh;
}

.login-form-wrap {
  width: 100%;
  max-width: 420px;
}

.brand-logo--sm { width: 32px; height: 32px; border-radius: 9px; background: linear-gradient(135deg, #2563EB, #1D4ED8); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(37, 99, 235, 0.4); }

.login-form-wrap__mobile-brand {
  display: none;
  align-items: center;
  gap: 10px;
  margin-bottom: 32px;
  font-size: 16px;
  font-weight: 800;
  color: #0F172A;
  letter-spacing: -0.03em;
}
@media (max-width: 900px) { .login-form-wrap__mobile-brand { display: flex; } }

.login-form-wrap__title {
  font-size: 28px;
  font-weight: 800;
  color: #0F172A;
  letter-spacing: -0.04em;
  margin-bottom: 6px;
}
.login-form-wrap__sub {
  font-size: 14px;
  color: #64748B;
  font-weight: 500;
  margin-bottom: 32px;
}

/* Error */
.login-error {
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

/* Form fields */
.login-form { display: flex; flex-direction: column; gap: 18px; margin-bottom: 24px; }

.field-group { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 13px; font-weight: 600; color: #374151; }
.field-label-row { display: flex; align-items: center; justify-content: space-between; }
.forgot-link { font-size: 12px; color: #2563EB; font-weight: 600; background: none; border: none; cursor: pointer; padding: 0; }
.forgot-link:hover { text-decoration: underline; }

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
}
.field-input::placeholder { color: #CBD5E1; }
.field-toggle { background: none; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; flex-shrink: 0; }

/* Submit */
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
}
.submit-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37,99,235,0.45); }
.submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Register link */
.register-link { text-align: center; font-size: 13px; color: #64748B; }
.register-link a { color: #2563EB; font-weight: 600; text-decoration: none; }
.register-link a:hover { text-decoration: underline; }
</style>
