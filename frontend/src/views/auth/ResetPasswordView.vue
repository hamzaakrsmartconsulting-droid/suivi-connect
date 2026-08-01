<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/api'

const route = useRoute()
const router = useRouter()

const password = ref('')
const confirmPassword = ref('')
const message = ref('')
const error = ref('')
const loading = ref(false)
const token = ref('')

onMounted(() => {
  token.value = (route.query.token as string) || ''
  if (!token.value) error.value = 'Token manquant'
})

async function submit() {
  if (password.value !== confirmPassword.value) {
    error.value = 'Les mots de passe ne correspondent pas'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.post('/auth/reset-password', {
      token: token.value,
      password: password.value,
    })
    message.value = data.message
    setTimeout(() => router.push('/connexion'), 2000)
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    error.value = err.response?.data?.error || 'Erreur'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-app>
    <v-main class="auth-bg d-flex align-center justify-center">
      <v-card width="420" class="pa-8">
        <h1 class="text-h5 font-weight-bold text-primary mb-6">Nouveau mot de passe</h1>

        <v-alert v-if="message" type="success" variant="tonal" class="mb-4">{{ message }}</v-alert>
        <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>

        <v-form @submit.prevent="submit">
          <v-text-field v-model="password" label="Nouveau mot de passe" type="password" class="mb-2" />
          <v-text-field v-model="confirmPassword" label="Confirmer" type="password" class="mb-4" />
          <v-btn type="submit" color="primary" block :loading="loading" :disabled="!token">
            Réinitialiser
          </v-btn>
        </v-form>
      </v-card>
    </v-main>
  </v-app>
</template>

<style scoped>
.auth-bg {
  background: linear-gradient(135deg, #1565C0 0%, #2E7D32 100%);
  min-height: 100vh;
}
</style>
