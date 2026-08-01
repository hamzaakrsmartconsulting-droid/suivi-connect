<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, Eye, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight } from '@lucide/vue'

interface Patient {
  id: string
  nomComplet: string
  age: number
  stadeRecommande: string
  alerts?: { id: string }[]
  riskPredictions?: { niveau: string; score: number }[]
  followUps?: { poids: number; tensionSys: number }[]
}

const props = defineProps<{
  patients: Patient[]
  loading?: boolean
}>()

const emit = defineEmits<{ select: [id: string] }>()

const search = ref('')
const page = ref(1)
const perPage = 10

const filtered = computed(() => {
  if (!props.patients?.length) return []
  const q = search.value.toLowerCase().trim()
  if (!q) return props.patients
  return props.patients.filter(p =>
    p.nomComplet?.toLowerCase().includes(q) ||
    p.stadeRecommande?.toLowerCase().includes(q)
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / perPage)))
const paged = computed(() => filtered.value.slice((page.value - 1) * perPage, page.value * perPage))

const riskMeta: Record<string, { label: string; color: string; bg: string }> = {
  LOW:       { label: 'LOW',       color: '#10B981', bg: '#D1FAE5' },
  MODERATE:  { label: 'MODERATE',  color: '#F59E0B', bg: '#FEF3C7' },
  HIGH:      { label: 'HIGH',      color: '#EF4444', bg: '#FEE2E2' },
  VERY_HIGH: { label: 'VERY HIGH', color: '#7C3AED', bg: '#EDE9FE' },
}
</script>

<template>
  <div class="plt">
    <!-- Card header -->
    <div class="plt__head">
      <h2 class="plt__title">Liste des patients</h2>
      <span class="plt__count">{{ filtered.length }} patient{{ filtered.length !== 1 ? 's' : '' }}</span>
    </div>

    <!-- Search -->
    <div class="plt__search-wrap">
      <Search :size="16" :stroke-width="1.75" color="#94A3B8" class="plt__search-icon" />
      <input
        v-model="search"
        class="plt__search"
        placeholder="Rechercher un patient…"
        @input="page = 1"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="plt__loading">
      <v-progress-circular indeterminate color="primary" size="36" width="3" />
    </div>

    <!-- Empty -->
    <div v-else-if="!filtered.length" class="plt__empty">
      <CheckCircle :size="40" :stroke-width="1.25" color="#CBD5E1" />
      <p>Aucun patient trouvé</p>
    </div>

    <!-- Table -->
    <div v-else class="plt__table-wrap">
      <table class="plt__table">
        <thead>
          <tr>
            <th>Patient</th>
            <th>Âge</th>
            <th>Stade</th>
            <th>Risque</th>
            <th>Alertes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in paged" :key="p.id" class="plt__row" @click="emit('select', p.id)">
            <td>
              <div class="plt__patient">
                <div class="plt__avatar">{{ p.nomComplet?.charAt(0) ?? '?' }}</div>
                <div>
                  <p class="plt__name">{{ p.nomComplet }}</p>
                  <p class="plt__id">{{ p.id }}</p>
                </div>
              </div>
            </td>
            <td class="plt__age">{{ p.age }} ans</td>
            <td>
              <span class="plt__stage">{{ p.stadeRecommande }}</span>
            </td>
            <td>
              <span
                v-if="p.riskPredictions?.[0]"
                class="plt__risk-pill"
                :style="{
                  background: (riskMeta[p.riskPredictions[0].niveau] ?? riskMeta.LOW).bg,
                  color: (riskMeta[p.riskPredictions[0].niveau] ?? riskMeta.LOW).color
                }"
              >
                {{ (riskMeta[p.riskPredictions[0].niveau] ?? riskMeta.LOW).label }}
              </span>
              <span v-else class="plt__risk-none">—</span>
            </td>
            <td>
              <div v-if="p.alerts?.length" class="plt__alerts">
                <AlertTriangle :size="14" :stroke-width="2" color="#EF4444" />
                <span class="plt__alert-count">{{ p.alerts.length }}</span>
              </div>
              <CheckCircle v-else :size="16" :stroke-width="1.75" color="#10B981" />
            </td>
            <td>
              <button class="plt__btn" @click.stop="emit('select', p.id)">
                <Eye :size="14" :stroke-width="2" />
                Voir
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="!loading && filtered.length > perPage" class="plt__pagination">
      <span class="plt__pagination-info">
        {{ (page - 1) * perPage + 1 }}–{{ Math.min(page * perPage, filtered.length) }} sur {{ filtered.length }}
      </span>
      <div class="plt__pagination-btns">
        <button class="plt__pg-btn" :disabled="page === 1" @click="page--">
          <ChevronLeft :size="15" :stroke-width="2" />
        </button>
        <span class="plt__pg-num">{{ page }} / {{ totalPages }}</span>
        <button class="plt__pg-btn" :disabled="page === totalPages" @click="page++">
          <ChevronRight :size="15" :stroke-width="2" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.plt {
  background: #FFF;
  border: 1px solid #E2E8F0;
  border-radius: 20px;
  box-shadow: 0 1px 3px rgba(15,23,42,0.05);
  overflow: hidden;
}

/* Header */
.plt__head {
  display: flex; align-items: center; gap: 12px;
  padding: 20px 24px 0;
}
.plt__title { font-size: 18px; font-weight: 800; color: #0F172A; letter-spacing: -0.03em; margin: 0; }
.plt__count { font-size: 12px; font-weight: 600; color: #64748B; background: #F1F5F9; padding: 3px 10px; border-radius: 20px; }

/* Search */
.plt__search-wrap {
  position: relative; margin: 16px 24px;
}
.plt__search-icon {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  pointer-events: none;
}
.plt__search {
  width: 100%; padding: 10px 12px 10px 38px;
  border: 1.5px solid #E2E8F0; border-radius: 12px;
  font-size: 14px; color: #0F172A; background: #F8FAFC;
  outline: none; box-sizing: border-box; transition: border-color 0.15s;
}
.plt__search:focus { border-color: #2563EB; background: #FFF; }

/* Loading / Empty */
.plt__loading { display: flex; justify-content: center; padding: 60px; }
.plt__empty {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 60px; color: #94A3B8; font-size: 14px;
}
.plt__empty p { margin: 0; }

/* Table */
.plt__table-wrap { overflow-x: auto; }
.plt__table { width: 100%; border-collapse: collapse; }
.plt__table thead tr { background: #F8FAFC; border-bottom: 1px solid #E2E8F0; }
.plt__table th {
  padding: 11px 16px;
  text-align: left; font-size: 11px; font-weight: 700;
  color: #94A3B8; text-transform: uppercase; letter-spacing: 0.07em;
  white-space: nowrap;
}
.plt__row {
  border-bottom: 1px solid #F8FAFC; cursor: pointer;
  transition: background 0.12s;
}
.plt__row:hover { background: #F8FAFF; }
.plt__row:last-child { border-bottom: none; }
.plt__table td { padding: 14px 16px; vertical-align: middle; }

/* Patient cell */
.plt__patient { display: flex; align-items: center; gap: 12px; }
.plt__avatar {
  width: 38px; height: 38px; border-radius: 10px;
  background: linear-gradient(135deg, #3B82F6, #6366F1);
  color: white; font-size: 15px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.plt__name { font-size: 14px; font-weight: 700; color: #0F172A; margin: 0 0 2px; }
.plt__id   { font-size: 11px; color: #94A3B8; margin: 0; }
.plt__age  { font-size: 14px; font-weight: 600; color: #334155; }

.plt__stage {
  display: inline-block; padding: 3px 10px; border-radius: 6px;
  font-size: 12px; font-weight: 700; color: #2563EB; background: #EFF6FF;
}

.plt__risk-pill {
  display: inline-block; padding: 4px 10px; border-radius: 20px;
  font-size: 11px; font-weight: 700; letter-spacing: 0.03em;
}
.plt__risk-none { color: #CBD5E1; font-size: 14px; }

.plt__alerts { display: inline-flex; align-items: center; gap: 5px; }
.plt__alert-count { font-size: 13px; font-weight: 700; color: #EF4444; }

/* Voir button */
.plt__btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; background: linear-gradient(135deg, #EFF6FF, #DBEAFE);
  color: #2563EB; border: 1px solid #BFDBFE; border-radius: 8px;
  font-size: 13px; font-weight: 700; cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  white-space: nowrap;
}
.plt__btn:hover { background: linear-gradient(135deg, #DBEAFE, #BFDBFE); transform: translateY(-1px); }

/* Pagination */
.plt__pagination {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 24px; border-top: 1px solid #F1F5F9;
}
.plt__pagination-info { font-size: 13px; color: #64748B; font-weight: 500; }
.plt__pagination-btns { display: flex; align-items: center; gap: 8px; }
.plt__pg-btn {
  width: 32px; height: 32px; border-radius: 8px;
  border: 1.5px solid #E2E8F0; background: white; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: border-color 0.15s, background 0.15s; color: #334155;
}
.plt__pg-btn:hover:not(:disabled) { border-color: #2563EB; color: #2563EB; }
.plt__pg-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.plt__pg-num { font-size: 13px; font-weight: 600; color: #334155; padding: 0 4px; }
</style>
