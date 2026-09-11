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
  primary:   { iconColor: '#1677C8', bg: 'linear-gradient(135deg,#D7EBFA,#E8F3FB)', text: '#0F5FA3', border: '#B9D9F2' },
  secondary: { iconColor: '#16B8A6', bg: 'linear-gradient(135deg,#CFF3EE,#E6F8F6)', text: '#0E9A8B', border: '#A5E4DC' },
  error:     { iconColor: '#E11D48', bg: 'linear-gradient(135deg,#FECDD3,#FFF1F2)', text: '#BE123C', border: '#FDA4AF' },
  warning:   { iconColor: '#D97706', bg: 'linear-gradient(135deg,#FDE68A,#FFFBEB)', text: '#B45309', border: '#FCD34D' },
  info:      { iconColor: '#1677C8', bg: 'linear-gradient(135deg,#D7EBFA,#E8F3FB)', text: '#0F5FA3', border: '#B9D9F2' },
  accent:    { iconColor: '#16B8A6', bg: 'linear-gradient(135deg,#CFF3EE,#E6F8F6)', text: '#0E9A8B', border: '#A5E4DC' },
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
  background: var(--c-surface, #FFFFFF);
  border-radius: 16px;
  border: 1px solid var(--c-border-lt, #EAF2F7);
  border-bottom: 3px solid var(--c-border, #B9D9F2);
  padding: 20px 22px 22px;
  box-shadow: var(--shadow-sm, 0 1px 3px rgba(18,59,109,0.05));
  display: flex; flex-direction: column; gap: 14px; min-height: 150px;
  transition: box-shadow 0.2s ease, transform 0.2s ease; cursor: default;
}
.kpi:hover {
  box-shadow: var(--shadow-md, 0 6px 18px rgba(18,59,109,0.08));
  transform: translateY(-2px);
}
.kpi__top { display: flex; align-items: flex-start; justify-content: space-between; }
.kpi__icon-box {
  width: 46px; height: 46px; border-radius: 13px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.kpi__trend { display: flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 20px; font-size: 11px; font-weight: 700; }
.kpi__body { display: flex; flex-direction: column; gap: 4px; }
.kpi__label { font-size: 12px; font-weight: 600; color: var(--c-text-4, #8AA0B4); text-transform: uppercase; letter-spacing: 0.06em; margin: 0; }
.kpi__value { font-size: 34px; font-weight: 800; color: var(--c-text, #18324A); line-height: 1; letter-spacing: -0.04em; margin: 0; font-variant-numeric: tabular-nums; }
.kpi__unit { font-size: 15px; font-weight: 500; color: var(--c-text-5, #B7C7D4); margin-left: 3px; letter-spacing: 0; }
.kpi__sub { font-size: 12px; color: var(--c-text-4, #8AA0B4); font-weight: 500; margin: 2px 0 0; }
</style>
