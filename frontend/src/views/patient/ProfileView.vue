<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/services/api'

const profile = ref({
  nomComplet: '',
  age: 0,
  taille: 0,
  profession: '',
  dateProcedure: '',
  sejourReeducation: '',
  stadeRecommande: '',
})

const loading = ref(true)
const saving = ref(false)
const message = ref('')

async function loadProfile() {
  loading.value = true
  try {
    const { data } = await api.get('/patient/profile')
    profile.value = {
      ...data,
      dateProcedure: data.dateProcedure?.split('T')[0] || '',
    }
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  message.value = ''
  try {
    await api.put('/patient/profile', profile.value)
    message.value = 'Profil mis à jour avec succès'
  } finally {
    saving.value = false
  }
}

onMounted(loadProfile)
</script>

<template>
  <v-card class="pa-6" max-width="800">
    <h2 class="text-h5 font-weight-bold mb-6">Mon profil</h2>

    <v-alert v-if="message" type="success" variant="tonal" class="mb-4">{{ message }}</v-alert>

    <v-skeleton-loader v-if="loading" type="article" />
    <v-form v-else @submit.prevent="save">
      <v-row>
        <v-col cols="12" md="6">
          <v-text-field v-model="profile.nomComplet" label="Nom complet" />
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field v-model.number="profile.age" label="Âge" type="number" />
        </v-col>
        <v-col cols="12" md="3">
          <v-text-field v-model.number="profile.taille" label="Taille (cm)" type="number" />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field v-model="profile.profession" label="Profession" />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field v-model="profile.dateProcedure" label="Date de procédure" type="date" />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field v-model="profile.sejourReeducation" label="Séjour de rééducation" />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field v-model="profile.stadeRecommande" label="Stade recommandé" readonly />
        </v-col>
      </v-row>
      <v-btn type="submit" color="primary" :loading="saving" prepend-icon="mdi-content-save">
        Enregistrer
      </v-btn>
    </v-form>
  </v-card>
</template>
