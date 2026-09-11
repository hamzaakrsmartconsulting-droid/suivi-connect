<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AuthLeftPanel from '@/components/auth/AuthLeftPanel.vue'

const router = useRouter()
const auth = useAuthStore()

const form = ref({
  email: '',
  password: '',
  passwordConfirm: '',
  role: 'PATIENT' as 'PATIENT' | 'DOCTOR',
  nomComplet: '',
  age: null as number | null,
  taille: null as number | null,
  profession: '',
  dateProcedure: '',
  specialite: '',
})

const error = ref('')
const showPassword = ref(false)

const isPatient = computed(() => form.value.role === 'PATIENT')

function setRole(role: 'PATIENT' | 'DOCTOR') {
  form.value.role = role
  error.value = ''
}

function validate(): string | null {
  const f = form.value
  if (!f.nomComplet.trim() || f.nomComplet.trim().length < 2) {
    return 'Veuillez saisir votre nom complet'
  }
  if (!f.email.trim()) return 'Veuillez saisir votre email'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) {
    return 'Email invalide'
  }
  if (f.password.length < 8) {
    return 'Le mot de passe doit contenir au moins 8 caractères'
  }
  if (f.password !== f.passwordConfirm) {
    return 'Les mots de passe ne correspondent pas'
  }

  if (f.role === 'PATIENT') {
    if (f.age == null || Number.isNaN(f.age)) return 'Veuillez saisir votre âge'
    if (f.age < 18 || f.age > 120) return 'L\'âge doit être entre 18 et 120 ans'
    if (f.taille == null || Number.isNaN(f.taille)) return 'Veuillez saisir votre taille'
    if (f.taille < 100 || f.taille > 250) return 'La taille doit être entre 100 et 250 cm'
    if (!f.dateProcedure) return 'Veuillez saisir la date de procédure'
  } else if (!f.specialite.trim()) {
    return 'Veuillez saisir votre spécialité'
  }

  return null
}

function buildPayload() {
  const f = form.value
  const base = {
    email: f.email.trim().toLowerCase(),
    password: f.password,
    role: f.role,
    nomComplet: f.nomComplet.trim(),
  }

  if (f.role === 'PATIENT') {
    return {
      ...base,
      age: Number(f.age),
      taille: Number(f.taille),
      profession: f.profession.trim() || undefined,
      dateProcedure: f.dateProcedure,
    }
  }

  return {
    ...base,
    specialite: f.specialite.trim(),
  }
}

async function handleRegister() {
  error.value = ''
  const validationError = validate()
  if (validationError) {
    error.value = validationError
    return
  }

  try {
    const payload = buildPayload()
    await auth.register(payload)
    router.push({
      path: '/connexion',
      query: { registered: '1', email: payload.email },
    })
  } catch (e: unknown) {
    const err = e as {
      response?: {
        data?: {
          error?: string
          details?: { field?: string; message?: string }[]
        }
      }
    }
    const details = err.response?.data?.details
      ?.map((d) => d.message)
      .filter(Boolean)
      .join('. ')
    error.value = details || err.response?.data?.error || 'Erreur lors de l\'inscription'
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

        <h1 class="auth-card__title">Créer un compte</h1>
        <p class="auth-card__sub">Inscription patient ou médecin.</p>

        <div v-if="error" class="auth-alert" role="alert">{{ error }}</div>

        <form class="auth-form" @submit.prevent="handleRegister" novalidate>
          <div class="role-toggle" role="group" aria-label="Type de compte">
            <button
              type="button"
              class="role-toggle__btn"
              :class="{ 'role-toggle__btn--active': form.role === 'PATIENT' }"
              :aria-pressed="form.role === 'PATIENT'"
              @click="setRole('PATIENT')"
            >
              Patient
            </button>
            <button
              type="button"
              class="role-toggle__btn"
              :class="{ 'role-toggle__btn--active': form.role === 'DOCTOR' }"
              :aria-pressed="form.role === 'DOCTOR'"
              @click="setRole('DOCTOR')"
            >
              Médecin
            </button>
          </div>

          <div class="field">
            <label class="field__label" for="reg-name">Nom complet</label>
            <input id="reg-name" v-model="form.nomComplet" type="text" class="field__input" placeholder="Jean Dupont" autocomplete="name" required />
          </div>

          <div class="field">
            <label class="field__label" for="reg-email">Email</label>
            <input id="reg-email" v-model="form.email" type="email" class="field__input" placeholder="votre@email.fr" autocomplete="email" required />
          </div>

          <div class="field-row">
            <div class="field">
              <label class="field__label" for="reg-password">Mot de passe</label>
              <div class="field__password">
                <input
                  id="reg-password"
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  class="field__input"
                  placeholder="Min. 8 caractères"
                  autocomplete="new-password"
                  minlength="8"
                  required
                />
                <button type="button" class="field__eye" :aria-label="showPassword ? 'Masquer' : 'Afficher'" @click="showPassword = !showPassword">
                  <svg v-if="!showPassword" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#8AA0B4" stroke-width="1.8"/><circle cx="12" cy="12" r="3" stroke="#8AA0B4" stroke-width="1.8"/></svg>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="#8AA0B4" stroke-width="1.8" stroke-linecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="#8AA0B4" stroke-width="1.8" stroke-linecap="round"/></svg>
                </button>
              </div>
            </div>
            <div class="field">
              <label class="field__label" for="reg-password-confirm">Confirmation</label>
              <input
                id="reg-password-confirm"
                v-model="form.passwordConfirm"
                :type="showPassword ? 'text' : 'password'"
                class="field__input"
                placeholder="Retapez"
                autocomplete="new-password"
                minlength="8"
                required
              />
            </div>
          </div>

          <template v-if="isPatient">
            <div class="field-row">
              <div class="field">
                <label class="field__label" for="reg-age">Âge</label>
                <input id="reg-age" v-model.number="form.age" type="number" min="18" max="120" class="field__input" placeholder="45" required />
              </div>
              <div class="field">
                <label class="field__label" for="reg-taille">Taille (cm)</label>
                <input id="reg-taille" v-model.number="form.taille" type="number" min="100" max="250" class="field__input" placeholder="170" required />
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label class="field__label" for="reg-profession">Profession</label>
                <input id="reg-profession" v-model="form.profession" type="text" class="field__input" placeholder="Optionnel" />
              </div>
              <div class="field">
                <label class="field__label" for="reg-procedure">Date procédure</label>
                <input id="reg-procedure" v-model="form.dateProcedure" type="date" class="field__input" required />
              </div>
            </div>
          </template>

          <div v-else class="field">
            <label class="field__label" for="reg-specialite">Spécialité</label>
            <input id="reg-specialite" v-model="form.specialite" type="text" class="field__input" placeholder="Cardiologie" required />
          </div>

          <button type="submit" class="auth-submit" :disabled="auth.loading">
            <span v-if="!auth.loading">Créer mon compte</span>
            <span v-else class="auth-submit__spin" aria-hidden="true" />
          </button>
        </form>

        <p class="auth-signup">
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
  padding: 36px 40px;
  background:
    radial-gradient(ellipse 90% 70% at 100% 0%, rgba(22, 119, 200, 0.08), transparent 55%),
    #F5FAFE;
  min-height: 100vh;
  overflow-y: auto;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  animation: rise 0.4s ease both;
}
@keyframes rise {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.auth-card__mobile-brand { display: none; margin-bottom: 24px; }
@media (max-width: 960px) { .auth-card__mobile-brand { display: block; } }
.auth-card__logo {
  height: 48px; width: auto; max-width: 180px;
  object-fit: contain; display: block;
}

.auth-card__title {
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 750;
  letter-spacing: -0.04em;
  color: #123B6D;
  line-height: 1.15;
}
.auth-card__sub {
  margin: 0 0 22px;
  font-size: 14px;
  color: #5B738A;
  font-weight: 500;
}

.auth-alert {
  padding: 11px 13px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 16px;
  background: #FFF1F2;
  color: #BE123C;
  border: 1px solid #FDA4AF;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.role-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 2px;
}
.role-toggle__btn {
  padding: 11px 14px;
  background: #FFFFFF;
  border: 1.5px solid #D7E5EE;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 650;
  color: #5B738A;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}
.role-toggle__btn:hover { border-color: #B9D9F2; color: #1677C8; }
.role-toggle__btn--active {
  border-color: #1677C8;
  background: #EFF6FF;
  color: #1677C8;
}

.field { display: flex; flex-direction: column; gap: 6px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

.field__label {
  font-size: 12.5px;
  font-weight: 700;
  color: #18324A;
}

.field__input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  border: 1.5px solid #D7E5EE;
  border-radius: 10px;
  font-size: 14.5px;
  font-family: inherit;
  font-weight: 500;
  color: #18324A;
  background: #FFFFFF;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.field__input:focus {
  border-color: #1677C8;
  box-shadow: 0 0 0 3px rgba(22, 119, 200, 0.12);
}
.field__input::placeholder { color: #B7C7D4; font-weight: 500; }

.field__password { position: relative; }
.field__password .field__input { padding-right: 42px; }
.field__eye {
  position: absolute;
  right: 10px; top: 50%;
  transform: translateY(-50%);
  border: none; background: none; cursor: pointer;
  display: flex; padding: 4px;
}

.auth-submit {
  width: 100%;
  margin-top: 6px;
  padding: 13px 18px;
  border: none;
  border-radius: 10px;
  background: #1677C8;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
}
.auth-submit:hover:not(:disabled) { background: #1260AC; }
.auth-submit:disabled { opacity: 0.75; cursor: not-allowed; }

.auth-submit__spin {
  width: 18px; height: 18px;
  border: 2.5px solid rgba(255,255,255,0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.auth-signup {
  text-align: center;
  margin: 20px 0 0;
  font-size: 14px;
  color: #5B738A;
  font-weight: 500;
}
.auth-signup a {
  color: #1677C8;
  font-weight: 700;
  text-decoration: none;
}
.auth-signup a:hover { text-decoration: underline; }
</style>
