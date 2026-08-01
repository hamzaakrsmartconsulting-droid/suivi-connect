<script setup lang="ts">
import { ref } from 'vue'

interface Medication {
  id: string
  nom: string
  dosage: string
  frequence: string
  dateDebut: string
  dateFin: string | null
  actif: boolean
}

defineProps<{
  medications: Medication[]
}>()

const emit = defineEmits<{
  edit: [med: Medication]
  delete: [id: string]
  add: []
}>()

const headers = [
  { title: 'Nom', key: 'nom' },
  { title: 'Dosage', key: 'dosage' },
  { title: 'Fréquence', key: 'frequence' },
  { title: 'Début', key: 'dateDebut' },
  { title: 'Statut', key: 'actif' },
  { title: 'Actions', key: 'actions', sortable: false },
]

const search = ref('')
</script>

<template>
  <v-card>
    <v-card-title class="d-flex align-center justify-space-between pa-4">
      <span>Médicaments</span>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="emit('add')">
        Ajouter
      </v-btn>
    </v-card-title>
    <v-text-field
      v-model="search"
      prepend-inner-icon="mdi-magnify"
      label="Rechercher"
      single-line
      hide-details
      class="px-4 pb-2"
      density="compact"
    />
    <v-data-table
      :headers="headers"
      :items="medications"
      :search="search"
      :items-per-page="5"
      class="elevation-0"
    >
      <template #item.dateDebut="{ item }">
        {{ new Date(item.dateDebut).toLocaleDateString('fr-FR') }}
      </template>
      <template #item.actif="{ item }">
        <v-chip :color="item.actif ? 'success' : 'grey'" size="small" variant="tonal">
          {{ item.actif ? 'Actif' : 'Inactif' }}
        </v-chip>
      </template>
      <template #item.actions="{ item }">
        <v-btn icon size="small" variant="text" @click="emit('edit', item)">
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
        <v-btn icon size="small" variant="text" color="error" @click="emit('delete', item.id)">
          <v-icon>mdi-delete</v-icon>
        </v-btn>
      </template>
    </v-data-table>
  </v-card>
</template>
