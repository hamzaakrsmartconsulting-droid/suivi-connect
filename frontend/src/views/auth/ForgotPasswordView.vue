<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'
import AuthLeftPanel from '@/components/auth/AuthLeftPanel.vue'

const router = useRouter()
const email = ref('')
const message = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  message.value = ''
  if (!email.value.trim()) {
    error.value = 'Veuillez saisir votre adresse email.'
    return
  }
  loading.value = true
  try {
    const { data } = await api.post('/auth/forgot-password', { email: email.value })
    message.value = data.message || 'Si cet email existe, un lien de réinitialisation a été envoyé.'
  } catch {
    error.value = 'Erreur lors de l\'envoi. Veuillez réessayer.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-root">
    <AuthLeftPanel />

    <div class="auth-right">
      <div class="auth-card">
        <div class="auth-card__mobile-brand">
          <img src="/logo.png" alt="SuiviConnect" class="auth-card__logo" />
        </div>

        <h1 class="auth-card__title">Mot de passe oublié</h1>
        <p class="auth-card__sub">Entrez votre email pour recevoir un lien de réinitialisation.</p>

        <div v-if="message" class="auth-alert auth-alert--ok" role="status">{{ message }}</div>
        <div v-if="error" class="auth-alert auth-alert--error" role="alert">{{ error }}</div>

        <form class="auth-form" @submit.prevent="submit" novalidate>
          <div class="field">
            <label class="field__label" for="forgot-email">Adresse email</label>
            <input
              id="forgot-email"
              v-model="email"
              type="email"
              class="field__input"
              placeholder="votre@email.fr"
              autocomplete="email"
            />
          </div>

          <button type="submit" class="auth-submit" :disabled="loading">
            <span v-if="!loading">Envoyer le lien</span>
            <span v-else class="auth-submit__spin" aria-hidden="true" />
          </button>
        </form>

        <p class="auth-back">
          <router-link to="/connexion">← Retour à la connexion</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-root {
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  min-height: 100vh;
  font-family: var(--font-base);
  background: #FFFFFF;
}

@media (max-width: 960px) {
  .auth-root { grid-template-columns: 1fr; }
  .auth-root :deep(.auth-visual) { display: none; }
}

.auth-right {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 40px;
  background:
    radial-gradient(ellipse 90% 70% at 100% 0%, rgba(22, 119, 200, 0.06), transparent 55%),
    #F7FBFE;
  min-height: 100vh;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  animation: rise 0.5s ease both;
}

@keyframes rise {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.auth-card__mobile-brand {
  display: none;
  margin-bottom: 28px;
}
.auth-card__logo {
  height: 48px;
  width: auto;
  max-width: 180px;
  object-fit: contain;
  display: block;
}
@media (max-width: 960px) {
  .auth-card__mobile-brand { display: block; }
}

.auth-card__title {
  margin: 0 0 8px;
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 750;
  letter-spacing: -0.04em;
  color: #123B6D;
  line-height: 1.15;
}

.auth-card__sub {
  margin: 0 0 28px;
  font-size: 15px;
  color: #5B738A;
  font-weight: 500;
  line-height: 1.5;
}

.auth-alert {
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 18px;
  line-height: 1.4;
}
.auth-alert--error { background: #FFF1F2; color: #BE123C; border: 1px solid #FDA4AF; }
.auth-alert--ok    { background: #E6F8F6; color: #0E9A8B; border: 1px solid #A5E4DC; }

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 22px;
}

.field { display: flex; flex-direction: column; gap: 8px; }
.field__label {
  font-size: 13px;
  font-weight: 700;
  color: #18324A;
  letter-spacing: -0.01em;
}
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

.auth-submit {
  width: 100%;
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
.auth-submit:hover:not(:disabled) { background: #1260AC; }
.auth-submit:disabled { opacity: 0.75; cursor: not-allowed; }

.auth-submit__spin {
  width: 20px; height: 20px;
  border: 2.5px solid rgba(255,255,255,0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.auth-back {
  text-align: center;
  margin: 20px 0 0;
  font-size: 14px;
}
.auth-back a {
  color: #1677C8;
  font-weight: 700;
  text-decoration: none;
}
.auth-back a:hover { text-decoration: underline; }
</style>
