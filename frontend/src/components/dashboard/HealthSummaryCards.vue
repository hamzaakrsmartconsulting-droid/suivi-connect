<script setup lang="ts">
import StatCard from './StatCard.vue'

defineProps<{
  cards: {
    title: string
    value: string | number
    unit?: string
    icon: string
    color?: string
    trend?: 'up' | 'down' | 'stable'
    trendValue?: string
  }[]
}>()
</script>

<template>
  <v-row>
    <v-col v-for="(card, i) in cards" :key="i" cols="12" sm="6" md="3">
      <StatCard v-bind="card" />
    </v-col>
  </v-row>
</template>
