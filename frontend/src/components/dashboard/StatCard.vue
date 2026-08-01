<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  title: string
  value: string | number
  unit?: string
  color?: string
  trend?: 'up' | 'down' | 'stable'
  trendValue?: string
  subtitle?: string
}>()

type ColorKey = 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'accent'

const palette: Record<ColorKey, { iconColor: string; bg: string; text: string; border: string }> = {
  primary:   { iconColor: '#2563EB', bg: 'linear-gradient(135deg,#DBEAFE,#EFF6FF)', text: '#1D4ED8', border: '#BFDBFE' },
  secondary: { iconColor: '#059669', bg: 'linear-gradient(135deg,#D1FAE5,#ECFDF5)', text: '#047857', border: '#A7F3D0' },
  error:     { iconColor: '#DC2626', bg: 'linear-gradient(135deg,#FEE2E2,#FEF2F2)', text: '#B91C1C', border: '#FECACA' },
  warning:   { iconColor: '#D97706', bg: 'linear-gradient(135deg,#FEF3C7,#FFFBEB)', text: '#B45309', border: '#FDE68A' },
  info:      { iconColor: '#0284C7', bg: 'linear-gradient(135deg,#E0F2FE,#F0F9FF)', text: '#0369A1', border: '#BAE6FD' },
  accent:    { iconColor: '#7C3AED', bg: 'linear-gradient(135deg,#EDE9FE,#F5F3FF)', text: '#6D28D9', border: '#DDD6FE' },
}

const c = computed<ColorKey>(() => (props.color as ColorKey) || 'primary')
const meta = computed(() => palette[c.value] || palette.primary)
</script>

<template>
  <div class="kpi" :style="{ '--c-border': meta.border }">
    <div class="kpi__top">
      <div class="kpi__icon-box" :style="{ background: meta.bg, border: `1px solid ${meta.border}` }">
        <slot name="icon">
          <!-- default icon placeholder -->
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" :stroke="meta.iconColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/></svg>
        </slot>
      </div>
      <div v-if="trend === 'up'" class="kpi__trend" style="background:#ECFDF5;color:#10B981">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
        <span>{{ trendValue }}</span>
      </div>
      <div v-else-if="trend === 'down'" class="kpi__trend" style="background:#FEF2F2;color:#EF4444">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
        <span>{{ trendValue }}</span>
      </div>
    </div>

    <div class="kpi__body">
      <p class="kpi__label">{{ title }}</p>
      <p class="kpi__value">
        {{ value }}<span v-if="unit" class="kpi__unit">{{ unit }}</span>
      </p>
      <p v-if="subtitle" class="kpi__sub">{{ subtitle }}</p>
    </div>
  </div>
</template>

<style scoped>
.kpi {
  background: #FFFFFF;
  border-radius: 16px;
  border: 1px solid #F1F5F9;
  border-bottom: 3px solid var(--c-border, #BFDBFE);
  padding: 20px 22px 22px;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.04);
  display: flex; flex-direction: column; gap: 14px; min-height: 150px;
  transition: box-shadow 0.2s ease, transform 0.2s ease; cursor: default;
}
.kpi:hover {
  box-shadow: 0 4px 12px rgba(15,23,42,0.08), 0 12px 32px rgba(15,23,42,0.06);
  transform: translateY(-2px);
}
.kpi__top { display: flex; align-items: flex-start; justify-content: space-between; }
.kpi__icon-box {
  width: 46px; height: 46px; border-radius: 13px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.kpi__trend { display: flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 20px; font-size: 11px; font-weight: 700; }
.kpi__body { display: flex; flex-direction: column; gap: 4px; }
.kpi__label { font-size: 12px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.06em; margin: 0; }
.kpi__value { font-size: 34px; font-weight: 800; color: #0F172A; line-height: 1; letter-spacing: -0.04em; margin: 0; font-variant-numeric: tabular-nums; }
.kpi__unit { font-size: 15px; font-weight: 500; color: #CBD5E1; margin-left: 3px; letter-spacing: 0; }
.kpi__sub { font-size: 12px; color: #94A3B8; font-weight: 500; margin: 2px 0 0; }
</style>
