<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'
import PatientListTable from '@/components/doctor/PatientListTable.vue'

interface Patient {
  id: string
  nomComplet: string
  age: number
  stadeRecommande: string
  alerts?: { id: string }[]
  riskPredictions?: { niveau: string; score: number }[]
  followUps?: { poids: number; tensionSys: number }[]
}

const patients = ref<Patient[]>([])
const loading = ref(true)
const error = ref('')
const router = useRouter()

async function loadPatients() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.get('/doctor/patients', { params: { limit: 100, page: 1 } })
    if (Array.isArray(data)) {
      patients.value = data
    } else if (data?.items && Array.isArray(data.items)) {
      patients.value = data.items
    } else {
      patients.value = []
    }
  } catch {
    patients.value = []
    error.value = 'Impossible de charger les patients. Réessayez.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadPatients()
})

function goToPatient(id: string) {
  router.push(`/medecin/patients/${id}`)
}
</script>

<template>
  <div class="patients-page">
    <div class="patients-page__header">
      <h1 class="patients-page__title">Patients</h1>
      <p class="patients-page__sub">Vos patients en suivi cardiaque</p>
    </div>
    <div v-if="error" class="patients-page__error">
      {{ error }}
      <button type="button" class="patients-page__retry" @click="loadPatients">Réessayer</button>
    </div>
    <PatientListTable :patients="patients" :loading="loading" @select="goToPatient" />
  </div>
</template>

<style scoped>
.patients-page { width: 100%; }
.patients-page__header { margin-bottom: 20px; }
.patients-page__title {
  margin: 0 0 4px;
  font-size: 24px;
  font-weight: 800;
  color: #0F172A;
  letter-spacing: -0.03em;
}
.patients-page__sub { margin: 0; font-size: 14px; color: #64748B; }
.patients-page__error {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  background: #FEF2F2;
  color: #B91C1C;
  font-size: 14px;
  font-weight: 600;
}
.patients-page__retry {
  margin-left: auto;
  padding: 6px 12px;
  border: 1px solid #FECACA;
  border-radius: 8px;
  background: #fff;
  color: #B91C1C;
  font-weight: 700;
  cursor: pointer;
}
</style>
