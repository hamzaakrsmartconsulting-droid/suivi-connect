<script setup lang="ts">
defineProps<{
  alerts: {
    id: string
    type: string
    severite: string
    message: string
    lu: boolean
    createdAt: string
  }[]
}>()

const emit = defineEmits<{ read: [id: string] }>()

const severityMeta: Record<string, { bg: string; color: string; icon: string }> = {
  LOW: { bg: '#F0F9FF', color: '#0EA5E9', icon: 'mdi-information-outline' },
  MEDIUM: { bg: '#FFFBEB', color: '#F59E0B', icon: 'mdi-alert-outline' },
  HIGH: { bg: '#FEF2F2', color: '#EF4444', icon: 'mdi-alert-circle-outline' },
  CRITICAL: { bg: '#FEF2F2', color: '#DC2626', icon: 'mdi-alert-octagon-outline' },
}

const typeIcon: Record<string, string> = {
  BLOOD_PRESSURE: 'mdi-heart-pulse',
  LDL: 'mdi-water-outline',
  WEIGHT: 'mdi-scale-bathroom',
  MEDICATION: 'mdi-pill',
  ACTIVITY: 'mdi-run',
  GENERAL: 'mdi-alert-outline',
}
</script>

<template>
  <div class="alert-panel">
    <div class="alert-panel__header">
      <span class="alert-panel__title">Alertes récentes</span>
      <v-chip v-if="alerts.length" size="x-small" color="error" variant="tonal">
        {{ alerts.length }}
      </v-chip>
    </div>

    <div v-if="alerts.length" class="alert-panel__list">
      <div
        v-for="alert in alerts"
        :key="alert.id"
        class="alert-item"
        :class="{ 'alert-item--unread': !alert.lu }"
        @click="emit('read', alert.id)"
      >
        <div
          class="alert-item__icon"
          :style="{
            background: (severityMeta[alert.severite] || severityMeta.MEDIUM).bg,
            color: (severityMeta[alert.severite] || severityMeta.MEDIUM).color,
          }"
        >
          <v-icon size="18">
            {{ typeIcon[alert.type] || (severityMeta[alert.severite] || severityMeta.MEDIUM).icon }}
          </v-icon>
        </div>
        <div class="alert-item__body">
          <p class="alert-item__msg">{{ alert.message }}</p>
          <p class="alert-item__date">{{ new Date(alert.createdAt).toLocaleDateString('fr-FR') }}</p>
        </div>
      </div>
    </div>

    <div v-else class="alert-panel__empty">
      <v-icon size="40" color="#10B981">mdi-check-circle-outline</v-icon>
      <p>Aucune alerte active</p>
    </div>
  </div>
</template>

<style scoped>
.alert-panel {
  background: #FFFFFF;
  border-radius: 16px;
  border: 1px solid #E2E8F0;
  padding: 24px;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.06);
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 300px;
}

.alert-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.alert-panel__title {
  font-size: 16px;
  font-weight: 700;
  color: #0F172A;
}

.alert-panel__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.alert-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid #F1F5F9;
  background: #FAFAFA;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.alert-item:hover {
  background: #F8FAFC;
  border-color: #E2E8F0;
}

.alert-item--unread {
  background: #EFF6FF;
  border-color: #BFDBFE;
}

.alert-item__icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.alert-item__msg {
  font-size: 13px;
  font-weight: 600;
  color: #1E293B;
  line-height: 1.5;
  margin-bottom: 4px;
}

.alert-item__date {
  font-size: 11px;
  color: #94A3B8;
}

.alert-panel__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #64748B;
  font-size: 13px;
  padding: 32px 0;
}
</style>
