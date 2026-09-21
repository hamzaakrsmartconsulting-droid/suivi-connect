<script setup lang="ts">
import type { Component } from 'vue'
import StatCard from './StatCard.vue'

defineProps<{
  cards: {
    title: string
    value: string | number
    unit?: string
    icon?: Component
    color?: string
    trend?: 'up' | 'down' | 'stable'
    trendValue?: string
  }[]
}>()
</script>

<template>
  <v-row>
    <v-col v-for="(card, i) in cards" :key="i" cols="12" sm="6" md="3">
      <StatCard
        :title="card.title"
        :value="card.value"
        :unit="card.unit"
        :color="card.color"
        :trend="card.trend"
        :trend-value="card.trendValue"
      >
        <template v-if="card.icon" #icon>
          <component :is="card.icon" :size="22" :stroke-width="1.8" />
        </template>
      </StatCard>
    </v-col>
  </v-row>
</template>
