<script setup lang="ts">
import type { Component } from 'vue'

const props = withDefaults(defineProps<{
  icon: Component
  tone?: 'teal' | 'blue' | 'green' | 'purple' | 'red' | 'orange'
  size?: 'xs' | 'sm' | 'md' | 'lg'
}>(), {
  tone: 'blue',
  size: 'md',
})

const toneMap: Record<string, { bg: string; color: string }> = {
  teal:   { bg: '#CCFBF1', color: '#0D9488' },
  blue:   { bg: '#DBEAFE', color: '#2563EB' },
  green:  { bg: '#DCFCE7', color: '#16A34A' },
  purple: { bg: '#EDE9FE', color: '#7C3AED' },
  red:    { bg: '#FEE2E2', color: '#DC2626' },
  orange: { bg: '#FFEDD5', color: '#EA580C' },
}

const sizeMap: Record<string, { box: string; icon: number }> = {
  xs: { box: '24px', icon: 12 },
  sm: { box: '32px', icon: 16 },
  md: { box: '40px', icon: 20 },
  lg: { box: '52px', icon: 26 },
}

const { bg, color } = toneMap[props.tone] ?? toneMap.blue
const { box, icon } = sizeMap[props.size] ?? sizeMap.md
</script>

<template>
  <span
    class="pictogram"
    :style="{ background: bg, width: box, height: box, minWidth: box }"
    aria-hidden="true"
  >
    <component :is="icon" :size="icon" :color="color" :stroke-width="2" />
  </span>
</template>

<style scoped>
.pictogram {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  flex-shrink: 0;
}
</style>
