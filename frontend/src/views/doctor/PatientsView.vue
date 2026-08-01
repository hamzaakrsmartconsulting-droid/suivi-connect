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
const router = useRouter()

onMounted(async () => {
  try {
    const { data } = await api.get('/doctor/patients')
    if (Array.isArray(data)) {
      patients.value = data
    } else if (data?.items && Array.isArray(data.items)) {
      patients.value = data.items
    } else {
      patients.value = []
    }
  } catch {
    patients.value = []
  } finally {
    loading.value = false
  }
})

function goToPatient(id: string) {
  router.push(`/medecin/patients/${id}`)
}
</script>

<template>
  <PatientListTable :patients="patients" :loading="loading" @select="goToPatient" />
</template>
