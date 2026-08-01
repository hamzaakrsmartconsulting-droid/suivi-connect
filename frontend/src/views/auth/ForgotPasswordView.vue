<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

const router = useRouter()
const email = ref('')
const message = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  message.value = ''
  loading.value = true
  try {
    const { data } = await api.post('/auth/forgot-password', { email: email.value })
    message.value = data.message
  } catch {
    error.value = 'Erreur lors de l\'envoi'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-app>
    <v-main class="auth-bg d-flex align-center justify-center">
      <v-card width="420" class="pa-8">
        <h1 class="text-h5 font-weight-bold text-primary mb-2">Mot de passe oublié</h1>
        <p class="text-body-2 text-medium-emphasis mb-6">
          Entrez votre email pour recevoir un lien de réinitialisation.
        </p>

        <v-alert v-if="message" type="success" variant="tonal" class="mb-4">{{ message }}</v-alert>
        <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>

        <v-form @submit.prevent="submit">
          <v-text-field v-model="email" label="Email" type="email" class="mb-4" />
          <v-btn type="submit" color="primary" block :loading="loading">Envoyer</v-btn>
        </v-form>

        <v-btn variant="text" block class="mt-4" @click="router.push('/connexion')">
          Retour à la connexion
        </v-btn>
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
