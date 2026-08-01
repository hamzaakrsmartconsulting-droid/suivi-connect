<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  score: number
  label?: string
}>()

const COLOR = computed(() => {
  if (props.score >= 75) return { stroke: '#10B981', glow: 'rgba(16,185,129,0.2)', text: '#059669', badge: 'Excellent', bg: '#ECFDF5', badgeColor: '#065F46' }
  if (props.score >= 50) return { stroke: '#F59E0B', glow: 'rgba(245,158,11,0.2)', text: '#D97706', badge: 'Modéré', bg: '#FFFBEB', badgeColor: '#92400E' }
  return { stroke: '#EF4444', glow: 'rgba(239,68,68,0.2)', text: '#DC2626', badge: 'À surveiller', bg: '#FEF2F2', badgeColor: '#991B1B' }
})

// Half-circle arc: total circumference ~251.3 for r=40 half circle
const TOTAL = 251.3
const dasharray = computed(() => `${(props.score / 100) * TOTAL} ${TOTAL}`)
</script>

<template>
  <div class="gauge">
    <p class="gauge__title">{{ label || 'Score de santé cardiaque' }}</p>

    <div class="gauge__visual">
      <svg viewBox="0 0 120 70" class="gauge__svg" aria-hidden="true">
        <!-- Track -->
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none" stroke="#F1F5F9" stroke-width="10" stroke-linecap="round"
        />
        <!-- Glow filter -->
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <!-- Progress arc -->
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
          :stroke="COLOR.stroke"
          stroke-width="10"
          stroke-linecap="round"
          :stroke-dasharray="dasharray"
          stroke-dashoffset="0"
          filter="url(#glow)"
          class="gauge__arc"
        />
      </svg>

      <!-- Center value -->
      <div class="gauge__center">
        <span class="gauge__num" :style="{ color: COLOR.text }">{{ score }}</span>
        <span class="gauge__max">/100</span>
      </div>
    </div>

    <div class="gauge__badge" :style="{ background: COLOR.bg, color: COLOR.badgeColor }">
      <span class="gauge__badge-dot" :style="{ background: COLOR.stroke }" />
      {{ COLOR.badge }}
    </div>
  </div>
</template>

<style scoped>
.gauge {
  background: #FFFFFF;
  border-radius: 16px;
  border: 1px solid #F1F5F9;
  padding: 22px 24px;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.04);
  text-align: center;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
}

.gauge__title {
  font-size: 14px;
  font-weight: 700;
  color: #0F172A;
  letter-spacing: -0.01em;
  margin-bottom: 16px;
}

.gauge__visual {
  position: relative;
  width: 180px;
  height: 100px;
  margin: 0 auto;
}

.gauge__svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.gauge__arc {
  transition: stroke-dasharray 1.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.gauge__center {
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: baseline;
  gap: 2px;
  white-space: nowrap;
}

.gauge__num {
  font-size: 36px;
  font-weight: 800;
  line-height: 1;
  font-family: 'Inter', sans-serif;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
}

.gauge__max {
  font-size: 14px;
  color: #CBD5E1;
  font-weight: 400;
}

.gauge__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  margin-top: 16px;
  letter-spacing: -0.01em;
}

.gauge__badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
