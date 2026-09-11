<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import AuthLeftPanel from '@/components/auth/AuthLeftPanel.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const success = ref('')
const showPassword = ref(false)

onMounted(() => {
  if (route.query.registered === '1') {
    success.value = 'Compte créé avec succès. Connectez-vous pour accéder à votre espace.'
    if (typeof route.query.email === 'string') {
      email.value = route.query.email
    }
    router.replace({ path: '/connexion', query: {} })
  }
})

function homeFor(role: string) {
  if (role === 'ADMIN') return '/apercu'
  if (role === 'DOCTOR') return '/medecin/tableau-de-bord'
  return '/patient/tableau-de-bord'
}

async function handleLogin() {
  error.value = ''
  success.value = ''
  try {
    const data = await auth.login(email.value, password.value)
    router.push(homeFor(data.user.role))
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    error.value = err.response?.data?.error || 'Email ou mot de passe incorrect'
  }
}

async function forgotPassword() {
  if (!email.value) {
    error.value = 'Veuillez saisir votre email'
    return
  }
  try {
    await api.post('/auth/forgot-password', { email: email.value })
    error.value = ''
    success.value = 'Si cet email existe, un lien de réinitialisation a été envoyé.'
  } catch {
    error.value = 'Erreur lors de l\'envoi'
  }
}
</script>

<template>
  <div class="login-root">
    <AuthLeftPanel />

    <div class="login-right">
      <div class="login-card">
        <div class="login-card__mobile-brand">
          <img src="/logo.png" alt="SuiviConnect" class="login-card__logo-img" />
        </div>

        <h1 class="login-card__title">Connexion</h1>
        <p class="login-card__sub">Accédez à votre espace SuiviConnect.</p>

        <div v-if="error" class="login-alert login-alert--error" role="alert">{{ error }}</div>
        <div v-if="success" class="login-alert login-alert--ok" role="status">{{ success }}</div>

        <form class="login-form" @submit.prevent="handleLogin">
          <div class="field">
            <label class="field__label" for="login-email">Adresse email</label>
            <input
              id="login-email"
              v-model="email"
              type="email"
              class="field__input"
              placeholder="votre@email.fr"
              autocomplete="email"
              required
            />
          </div>

          <div class="field">
            <div class="field__row">
              <label class="field__label" for="login-password">Mot de passe</label>
              <button type="button" class="field__forgot" @click="forgotPassword">Mot de passe oublié ?</button>
            </div>
            <div class="field__password">
              <input
                id="login-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                class="field__input"
                placeholder="••••••••••"
                autocomplete="current-password"
                required
              />
              <button type="button" class="field__eye" :aria-label="showPassword ? 'Masquer' : 'Afficher'" @click="showPassword = !showPassword">
                <svg v-if="!showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#8AA0B4" stroke-width="1.8"/><circle cx="12" cy="12" r="3" stroke="#8AA0B4" stroke-width="1.8"/></svg>
                <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="#8AA0B4" stroke-width="1.8" stroke-linecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="#8AA0B4" stroke-width="1.8" stroke-linecap="round"/></svg>
              </button>
            </div>
          </div>

          <button type="submit" class="login-submit" :disabled="auth.loading">
            <span v-if="!auth.loading">Se connecter</span>
            <span v-else class="login-submit__spin" aria-hidden="true" />
          </button>
        </form>

        <p class="login-signup">
          Pas encore de compte ?
          <router-link to="/inscription">Créer un compte</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-root {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  min-height: 100vh;
  font-family: var(--font-base);
  background: #FFFFFF;
}

@media (max-width: 960px) {
  .login-root { grid-template-columns: 1fr; }
  .login-root :deep(.auth-visual) { display: none; }
}

.login-right {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 40px;
  background:
    radial-gradient(ellipse 90% 70% at 100% 0%, rgba(22, 119, 200, 0.06), transparent 55%),
    #F7FBFE;
  min-height: 100vh;
}

.login-card {
  width: 100%;
  max-width: 420px;
  animation: rise 0.5s ease both;
}

@keyframes rise {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.login-card__mobile-brand {
  display: none;
  margin-bottom: 28px;
}
.login-card__logo-img {
  height: 48px;
  width: auto;
  max-width: 180px;
  object-fit: contain;
  display: block;
}
@media (max-width: 960px) {
  .login-card__mobile-brand { display: block; }
}

.login-card__title {
  margin: 0 0 8px;
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 750;
  letter-spacing: -0.04em;
  color: #123B6D;
  line-height: 1.15;
}

.login-card__sub {
  margin: 0 0 28px;
  font-size: 15px;
  color: #5B738A;
  font-weight: 500;
  line-height: 1.5;
}

.login-alert {
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 18px;
  line-height: 1.4;
}
.login-alert--error { background: #FFF1F2; color: #BE123C; border: 1px solid #FDA4AF; }
.login-alert--ok { background: #E6F8F6; color: #0E9A8B; border: 1px solid #A5E4DC; }

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 22px;
}

.field { display: flex; flex-direction: column; gap: 8px; }
.field__row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.field__label {
  font-size: 13px;
  font-weight: 700;
  color: #18324A;
  letter-spacing: -0.01em;
}
.field__forgot {
  border: none; background: none; padding: 0;
  font-size: 12px; font-weight: 700; color: #1677C8; cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
}
.field__forgot:hover { text-decoration: underline; }

.field__input {
  width: 100%;
  box-sizing: border-box;
  padding: 14px 16px;
  border: 1.5px solid #D7E5EE;
  border-radius: 12px;
  font-size: 15px;
  font-family: inherit;
  font-weight: 500;
  color: #18324A;
  background: #F7FBFD;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}
.field__input:focus {
  border-color: #1677C8;
  background: #fff;
  box-shadow: 0 0 0 4px rgba(22, 119, 200, 0.12);
}
.field__input::placeholder { color: #B7C7D4; font-weight: 500; }

.field__password { position: relative; }
.field__password .field__input { padding-right: 48px; }
.field__eye {
  position: absolute;
  right: 12px; top: 50%;
  transform: translateY(-50%);
  border: none; background: none; cursor: pointer;
  display: flex; padding: 4px;
}

.login-submit {
  width: 100%;
  margin-top: 4px;
  padding: 14px 18px;
  border: none;
  border-radius: 10px;
  background: #1677C8;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;
  letter-spacing: -0.01em;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
}
.login-submit:hover:not(:disabled) { background: #1260AC; }
.login-submit:disabled { opacity: 0.75; cursor: not-allowed; }

.login-submit__spin {
  width: 20px; height: 20px;
  border: 2.5px solid rgba(255,255,255,0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.login-signup {
  text-align: center;
  margin: 24px 0 0;
  font-size: 14px;
  color: #5B738A;
  font-weight: 500;
}
.login-signup a {
  color: #1677C8;
  font-weight: 700;
  text-decoration: none;
}
.login-signup a:hover { text-decoration: underline; }
</style>
