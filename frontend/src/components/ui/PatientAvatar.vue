<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  name?: string
  avatar?: string | null
  size?: number
}>(), {
  name: '',
  avatar: null,
  size: 42,
})

// ── Initials ──────────────────────────────────────────────────────────────────
const initials = computed(() => {
  const parts = (props.name || '?').trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
})

// ── Deterministic soft color from name ───────────────────────────────────────
// Maps to a set of neutral, professional healthcare tones
const palettes = [
  { bg: '#DBEAFE', color: '#1677C8' }, // blue
  { bg: '#CCFBF1', color: '#0D9488' }, // teal
  { bg: '#E0E7FF', color: '#4F46E5' }, // indigo
  { bg: '#FCE7F3', color: '#BE185D' }, // rose
  { bg: '#D1FAE5', color: '#065F46' }, // emerald
  { bg: '#FEF3C7', color: '#92400E' }, // amber
  { bg: '#EDE9FE', color: '#5B21B6' }, // violet
  { bg: '#CFFAFE', color: '#0E7490' }, // cyan
]

const palette = computed(() => {
  const code = (props.name || '?').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return palettes[code % palettes.length]
})

const boxStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontSize: `${Math.round(props.size * 0.38)}px`,
}))
</script>

<template>
  <!-- With photo -->
  <img
    v-if="avatar"
    :src="avatar"
    :alt="name"
    class="pa-img"
    :style="boxStyle"
    :width="size"
    :height="size"
    loading="lazy"
  />

  <!-- Initials fallback -->
  <span
    v-else
    class="pa-initials"
    :style="{
      ...boxStyle,
      background: palette.bg,
      color: palette.color,
    }"
    :aria-label="name"
    role="img"
  >
    {{ initials }}
  </span>
</template>

<style scoped>
/* shared shape */
.pa-img,
.pa-initials {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1.5px solid #E5EAF0;
  box-shadow: 0 1px 3px rgba(18,59,109,0.08);
  vertical-align: middle;
  transition: box-shadow 0.15s, transform 0.15s;
}

/* photo */
.pa-img {
  object-fit: cover;
}

/* initials */
.pa-initials {
  font-weight: 700;
  letter-spacing: -0.02em;
  user-select: none;
  line-height: 1;
}

/* hover lift — parent tr hover already handles row, but component also reacts */
.pa-img:hover,
.pa-initials:hover {
  box-shadow: 0 4px 10px rgba(18,59,109,0.14);
  transform: translateY(-1px);
}
</style>
