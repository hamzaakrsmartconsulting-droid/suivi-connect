<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const props = defineProps<{
  title: string
  labels: string[]
  datasets: {
    label: string
    data: number[]
    borderColor?: string
    backgroundColor?: string
  }[]
  unit?: string
  height?: number
}>()

const chartData = computed(() => ({
  labels: props.labels,
  datasets: props.datasets.map((ds, i) => ({
    ...ds,
    borderColor:       ds.borderColor       || (i === 0 ? '#2563EB' : '#10B981'),
    backgroundColor:   ds.backgroundColor   || (i === 0 ? 'rgba(37,99,235,0.07)' : 'rgba(16,185,129,0.07)'),
    fill: true,
    tension: 0.42,
    pointRadius: 0,
    pointHoverRadius: 5,
    pointHoverBackgroundColor: ds.borderColor || '#2563EB',
    pointHoverBorderColor: '#fff',
    pointHoverBorderWidth: 2,
    borderWidth: 2.5,
  })),
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: 'index' as const },
  plugins: {
    legend: {
      display: props.datasets.length > 1,
      position: 'top' as const,
      labels: {
        boxWidth: 8, boxHeight: 8,
        usePointStyle: true, pointStyle: 'circle',
        font: { size: 11, family: 'Inter, system-ui, sans-serif', weight: '600' as const },
        color: '#64748B', padding: 14,
      },
    },
    tooltip: {
      backgroundColor: '#0F172A',
      titleColor: '#F8FAFC',
      bodyColor: '#94A3B8',
      borderColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      cornerRadius: 10,
      padding: 12,
      titleFont: { size: 12, weight: 'bold' as const },
      bodyFont: { size: 13 },
      callbacks: {
        label: (ctx: { dataset: { label?: string }; parsed: { y: number } }) =>
          `  ${ctx.dataset.label || ''}: ${ctx.parsed.y}${props.unit ? ' ' + props.unit : ''}`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: false,
      grid: { color: 'rgba(226,232,240,0.7)', drawTicks: false },
      border: { display: false, dash: [3, 3] },
      ticks: {
        color: '#94A3B8',
        font: { size: 11, family: 'Inter, system-ui, sans-serif' },
        padding: 10,
        maxTicksLimit: 5,
      },
    },
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: {
        color: '#94A3B8',
        font: { size: 11, family: 'Inter, system-ui, sans-serif' },
        maxRotation: 0,
        padding: 8,
        maxTicksLimit: 8,
      },
    },
  },
}))
</script>

<template>
  <div class="echart">
    <div class="echart__header">
      <p class="echart__title">{{ title }}</p>
      <slot name="action" />
    </div>
    <div class="echart__body" :style="{ height: `${height || 240}px` }">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<style scoped>
.echart {
  background: #FFFFFF;
  border-radius: 16px;
  border: 1px solid #F1F5F9;
  padding: 22px 24px 20px;
  box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.04);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.echart__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.echart__title {
  font-size: 14px;
  font-weight: 700;
  color: #0F172A;
  letter-spacing: -0.01em;
}

.echart__body {
  position: relative;
  flex: 1;
  min-height: 0;
}
</style>
