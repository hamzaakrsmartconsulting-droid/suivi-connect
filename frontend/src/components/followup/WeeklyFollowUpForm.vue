<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{ submit: [data: Record<string, unknown>] }>()

const form = ref({
  semaine: new Date().toISOString().split('T')[0],
  poids: 75,
  tensionSys: 120,
  tensionDia: 80,
  tabac: false,
  diabete: false,
  ldl: 1.2,
  medicamentsPris: 21,
  medicamentsTotal: 21,
  activiteMinutes: 150,
  notes: '',
})

const loading = ref(false)

function handleSubmit() {
  emit('submit', { ...form.value })
}
</script>

<template>
  <v-card class="pa-4">
    <div class="text-subtitle-1 font-weight-medium mb-4">Nouveau suivi hebdomadaire</div>
    <v-form @submit.prevent="handleSubmit">
      <v-row>
        <v-col cols="12" sm="6" md="4">
          <v-text-field v-model="form.semaine" label="Semaine (date)" type="date" />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-text-field v-model.number="form.poids" label="Poids (kg)" type="number" step="0.1" />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-text-field v-model.number="form.ldl" label="LDL (g/L)" type="number" step="0.01" />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-text-field v-model.number="form.tensionSys" label="Tension systolique" type="number" />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-text-field v-model.number="form.tensionDia" label="Tension diastolique" type="number" />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-text-field v-model.number="form.medicamentsPris" label="Médicaments pris" type="number" />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-text-field v-model.number="form.medicamentsTotal" label="Médicaments total" type="number" />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-text-field v-model.number="form.activiteMinutes" label="Activité physique (min)" type="number" />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-switch v-model="form.tabac" label="Tabagisme" color="error" hide-details />
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <v-switch v-model="form.diabete" label="Diabète" color="warning" hide-details />
        </v-col>
        <v-col cols="12">
          <v-textarea v-model="form.notes" label="Notes hebdomadaires" rows="3" />
        </v-col>
        <v-col cols="12">
          <v-btn type="submit" color="primary" :loading="loading" prepend-icon="mdi-content-save">
            Enregistrer le suivi
          </v-btn>
        </v-col>
      </v-row>
    </v-form>
  </v-card>
</template>
