<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/services/api'

interface Doctor {
  nomComplet: string
  specialite: string
  telephone?: string
  adresse?: string
  rppsNumber?: string
  signatureText?: string
  user?: { email?: string }
}

interface Patient {
  nomComplet: string
  age: number
  profession?: string
}

interface Medication {
  nom: string
  dosage: string
  frequence: string
  dateDebut: string
  dateFin?: string
  instructions?: string
}

const props = defineProps<{
  doctor: Doctor
  patient: Patient
  patientId: string
  medications: Medication[]
  date?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'validated', downloadUrl: string): void
}>()

// ── Date ────────────────────────────────────────────────────────────────────
function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}
const today = fmtDate(props.date ? new Date(props.date) : new Date())

// ── Signature canvas ─────────────────────────────────────────────────────────
const canvasRef  = ref<HTMLCanvasElement | null>(null)
const isDrawing  = ref(false)
const hasSig     = ref(false)
const sigMode    = ref<'draw' | 'text'>('draw')

let ctx: CanvasRenderingContext2D | null = null
let lastX = 0, lastY = 0

function getPos(e: MouseEvent | TouchEvent) {
  const canvas = canvasRef.value!
  const rect   = canvas.getBoundingClientRect()
  const sx     = canvas.width  / rect.width
  const sy     = canvas.height / rect.height
  if ('touches' in e) {
    const t = e.touches[0]
    return { x: (t.clientX - rect.left) * sx, y: (t.clientY - rect.top) * sy }
  }
  return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy }
}

function initCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  ctx = canvas.getContext('2d')!
  ctx.strokeStyle = '#1E3A8A'
  ctx.lineWidth   = 2.5
  ctx.lineCap     = 'round'
  ctx.lineJoin    = 'round'
}

function startDraw(e: MouseEvent | TouchEvent) {
  e.preventDefault()
  isDrawing.value = true
  const p = getPos(e); lastX = p.x; lastY = p.y
}
function draw(e: MouseEvent | TouchEvent) {
  if (!isDrawing.value || !ctx) return
  e.preventDefault()
  const p = getPos(e)
  ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(p.x, p.y); ctx.stroke()
  lastX = p.x; lastY = p.y
  hasSig.value = true
}
function stopDraw() { isDrawing.value = false }

function clearSig() {
  if (!ctx || !canvasRef.value) return
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  hasSig.value = false
}

onMounted(initCanvas)

// ── Validate & send ──────────────────────────────────────────────────────────
const validating = ref(false)
const error      = ref('')

async function validate() {
  validating.value = true
  error.value      = ''
  try {
    let signatureDataUrl: string | undefined
    if (sigMode.value === 'draw' && hasSig.value && canvasRef.value) {
      signatureDataUrl = canvasRef.value.toDataURL('image/png')
    }

    const { data } = await api.post(`/doctor/patients/${props.patientId}/ordonnances`, {
      medications:      props.medications,
      signatureDataUrl,
    })

    emit('validated', data.downloadUrl)
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Erreur lors de la validation'
  } finally {
    validating.value = false
  }
}
</script>

<template>
  <div class="ordo-overlay" @click.self="emit('close')">
    <div class="ordo-shell">

      <!-- ── Toolbar ──────────────────────────────────────────────────────── -->
      <div class="ordo-toolbar">
        <span class="ordo-toolbar__title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          Ordonnance — aperçu avant envoi
        </span>
        <button class="ordo-btn ordo-btn--close" @click="emit('close')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          Fermer
        </button>
      </div>

      <!-- ── A4 Sheet ─────────────────────────────────────────────────────── -->
      <div class="ordo-page">

        <!-- HEADER -->
        <div class="ordo-header">
          <div class="ordo-header__doctor">
            <p class="ordo-header__name">Dr. {{ doctor.nomComplet }}</p>
            <p class="ordo-header__spec">{{ doctor.specialite }}</p>
            <div class="ordo-header__contact">
              <span v-if="doctor.telephone">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 5.83 5.83l.61-.61a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/></svg>
                {{ doctor.telephone }}
              </span>
              <span v-if="doctor.user?.email">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                {{ doctor.user.email }}
              </span>
              <span v-if="doctor.adresse">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {{ doctor.adresse }}
              </span>
              <span v-if="doctor.rppsNumber">RPPS : {{ doctor.rppsNumber }}</span>
            </div>
          </div>
          <div class="ordo-header__logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 12h4l2-5 4 10 2-5h6" stroke="#2563EB" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            SuiviConnect
          </div>
        </div>

        <div class="ordo-dateline">Fait le {{ today }}</div>
        <div class="ordo-divider" />

        <!-- PATIENT -->
        <div class="ordo-patient">
          <div class="ordo-patient__row"><span class="ordo-patient__label">Patient :</span><span class="ordo-patient__val">{{ patient.nomComplet }}</span></div>
          <div class="ordo-patient__row"><span class="ordo-patient__label">Âge :</span><span class="ordo-patient__val">{{ patient.age }} ans</span></div>
          <div v-if="patient.profession" class="ordo-patient__row"><span class="ordo-patient__label">Profession :</span><span class="ordo-patient__val">{{ patient.profession }}</span></div>
        </div>

        <!-- Rx -->
        <div class="ordo-rx">℞</div>

        <!-- MEDICATIONS -->
        <div class="ordo-meds">
          <div v-for="(med, i) in medications" :key="i" class="ordo-med">
            <div class="ordo-med__num">{{ i + 1 }}</div>
            <div class="ordo-med__body">
              <p class="ordo-med__name">{{ med.nom }} <span class="ordo-med__dose">{{ med.dosage }}</span></p>
              <p class="ordo-med__freq">{{ med.frequence }}</p>
              <p class="ordo-med__dates">Du {{ fmtDate(med.dateDebut) }}<span v-if="med.dateFin"> au {{ fmtDate(med.dateFin) }}</span><span v-else> — durée continue</span></p>
              <p v-if="med.instructions" class="ordo-med__instr">ℹ {{ med.instructions }}</p>
            </div>
          </div>
        </div>

        <!-- FOOTER -->
        <div class="ordo-footer">
          <!-- Signature pad -->
          <div class="ordo-sig">
            <p class="ordo-sig__label">Signature du médecin</p>
            <div class="sig-toggle">
              <button :class="['sig-btn', sigMode==='draw' && 'sig-btn--active']" @click="sigMode='draw'">✏️ Dessiner</button>
              <button :class="['sig-btn', sigMode==='text' && 'sig-btn--active']" @click="sigMode='text'">Aa Cursif</button>
            </div>

            <div v-if="sigMode==='draw'" class="sig-pad">
              <canvas ref="canvasRef" class="sig-canvas" width="300" height="100"
                @mousedown="startDraw" @mousemove="draw" @mouseup="stopDraw" @mouseleave="stopDraw"
                @touchstart.prevent="startDraw" @touchmove.prevent="draw" @touchend="stopDraw" />
              <div v-if="!hasSig" class="sig-hint">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                Signez ici
              </div>
              <button v-if="hasSig" class="sig-clear" @click="clearSig">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                Effacer
              </button>
            </div>

            <div v-else class="sig-text">
              <span class="sig-cursive">{{ doctor.signatureText || `Dr. ${doctor.nomComplet}` }}</span>
            </div>

            <p class="ordo-sig__name">Dr. {{ doctor.nomComplet }}</p>
          </div>

          <!-- Stamp -->
          <div class="ordo-stamp">
            <div class="ordo-stamp__circle">
              <p class="stamp-top">{{ doctor.nomComplet.toUpperCase() }}</p>
              <p class="stamp-spec">{{ doctor.specialite }}</p>
              <div class="stamp-star">✦</div>
              <p class="stamp-rpps">{{ doctor.rppsNumber ? `RPPS ${doctor.rppsNumber}` : 'Médecin' }}</p>
            </div>
          </div>
        </div>

        <p class="ordo-note">Document généré par SuiviConnect — Plateforme de suivi cardiologique. Confidentiel.</p>
      </div>

      <!-- ── Validate bar ─────────────────────────────────────────────────── -->
      <div class="validate-bar">
        <div class="validate-bar__left">
          <div class="vb-info">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>Le patient recevra l'ordonnance en PDF dans ses notifications</span>
          </div>
          <p v-if="error" class="vb-error">{{ error }}</p>
        </div>
        <button class="vb-btn" :disabled="validating" @click="validate">
          <span v-if="validating" class="spin" />
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          {{ validating ? 'Génération du PDF…' : 'Valider et envoyer au patient' }}
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* ── Overlay ─────────────────────────────────────────────────────────────── */
.ordo-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(10,16,40,0.75); backdrop-filter: blur(6px);
  display: flex; flex-direction: column; align-items: center;
  padding: 20px 16px 0; overflow-y: auto;
}
.ordo-shell { width: 100%; max-width: 740px; display: flex; flex-direction: column; }

/* ── Toolbar ─────────────────────────────────────────────────────────────── */
.ordo-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  background: #1E293B; border-radius: 16px 16px 0 0; padding: 14px 20px;
}
.ordo-toolbar__title { display: flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 700; color: #F8FAFC; }
.ordo-btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; border-radius: 10px; border: none; font-size: 13px; font-weight: 700; cursor: pointer; }
.ordo-btn--close { background: #334155; color: #CBD5E1; }
.ordo-btn--close:hover { background: #475569; }

/* ── A4 page ─────────────────────────────────────────────────────────────── */
.ordo-page {
  background: #fff; padding: 44px 52px 36px;
  font-family: Georgia, serif; color: #1a1a2e;
  position: relative; display: flex; flex-direction: column; gap: 0;
}
.ordo-page::before {
  content: 'CONFIDENTIEL'; position: absolute; top: 50%; left: 50%;
  transform: translate(-50%,-50%) rotate(-35deg);
  font-size: 60px; font-weight: 900; color: rgba(37,99,235,0.04);
  letter-spacing: .15em; pointer-events: none; user-select: none; white-space: nowrap;
}

/* Header */
.ordo-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.ordo-header__name { font-size: 18px; font-weight: 700; color: #0F172A; margin: 0 0 2px; font-family: 'Inter',sans-serif; }
.ordo-header__spec { font-size: 12px; color: #2563EB; font-weight: 600; margin: 0 0 9px; font-family: 'Inter',sans-serif; }
.ordo-header__contact { display: flex; flex-direction: column; gap: 3px; font-size: 10.5px; color: #64748B; font-family: 'Inter',sans-serif; }
.ordo-header__contact span { display: flex; align-items: center; gap: 5px; }
.ordo-header__logo { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 800; color: #2563EB; font-family: 'Inter',sans-serif; }

.ordo-dateline { text-align: right; font-size: 11px; color: #64748B; font-family: 'Inter',sans-serif; margin-bottom: 12px; }
.ordo-divider { height: 2px; background: linear-gradient(to right,#2563EB,#7C3AED,#2563EB); border-radius: 2px; margin-bottom: 18px; }

/* Patient */
.ordo-patient { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 11px 16px; margin-bottom: 22px; display: flex; flex-direction: column; gap: 4px; font-family: 'Inter',sans-serif; }
.ordo-patient__row { display: flex; gap: 10px; font-size: 12.5px; }
.ordo-patient__label { color: #64748B; font-weight: 600; min-width: 85px; }
.ordo-patient__val   { color: #0F172A; font-weight: 700; }

/* Rx */
.ordo-rx { font-size: 40px; font-weight: 700; color: #2563EB; font-family: 'Times New Roman',serif; line-height: 1; margin-bottom: 12px; }

/* Medications */
.ordo-meds { display: flex; flex-direction: column; gap: 16px; margin-bottom: 32px; }
.ordo-med { display: flex; gap: 14px; align-items: flex-start; padding-bottom: 14px; border-bottom: 1px dashed #E2E8F0; }
.ordo-med:last-child { border-bottom: none; }
.ordo-med__num { width: 24px; height: 24px; border-radius: 50%; background: #2563EB; color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; margin-top: 2px; font-family: 'Inter',sans-serif; }
.ordo-med__body { flex: 1; }
.ordo-med__name { font-size: 16px; font-weight: 700; color: #0F172A; margin: 0 0 3px; }
.ordo-med__dose { font-size: 13px; color: #2563EB; margin-left: 6px; }
.ordo-med__freq { font-size: 12px; color: #374151; margin: 0 0 2px; font-style: italic; }
.ordo-med__dates { font-size: 11px; color: #64748B; margin: 0 0 3px; font-family: 'Inter',sans-serif; }
.ordo-med__instr { font-size: 11px; color: #7C3AED; margin: 3px 0 0; font-style: italic; font-family: 'Inter',sans-serif; }

/* Footer */
.ordo-footer { display: flex; justify-content: space-between; align-items: flex-end; padding-top: 20px; border-top: 1px solid #E2E8F0; }

/* Signature */
.ordo-sig { display: flex; flex-direction: column; gap: 7px; }
.ordo-sig__label { font-size: 9px; color: #94A3B8; font-family: 'Inter',sans-serif; text-transform: uppercase; letter-spacing: .08em; }
.ordo-sig__name  { font-size: 10px; color: #64748B; font-family: 'Inter',sans-serif; margin: 3px 0 0; }

.sig-toggle { display: flex; gap: 6px; }
.sig-btn { padding: 4px 11px; border-radius: 8px; border: 1.5px solid #E2E8F0; font-size: 11px; font-weight: 600; cursor: pointer; background: #F8FAFC; color: #64748B; transition: all .15s; }
.sig-btn--active { border-color: #2563EB; background: #EFF6FF; color: #2563EB; }

.sig-pad { position: relative; width: 300px; border: 2px dashed #94A3B8; border-radius: 10px; overflow: hidden; background: #FAFBFF; cursor: crosshair; }
.sig-canvas { display: block; width: 100%; height: 100px; touch-action: none; }
.sig-hint { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 7px; font-size: 12px; color: #94A3B8; pointer-events: none; font-family: 'Inter',sans-serif; }
.sig-clear { position: absolute; top: 5px; right: 7px; display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 7px; border: 1px solid #E2E8F0; background: rgba(255,255,255,.9); font-size: 10px; color: #EF4444; cursor: pointer; font-family: 'Inter',sans-serif; font-weight: 600; }
.sig-clear:hover { background: #FEF2F2; }

.sig-text { width: 300px; min-height: 80px; border-bottom: 2px solid #94A3B8; display: flex; align-items: flex-end; padding-bottom: 6px; }
.sig-cursive { font-family: 'Dancing Script','Brush Script MT','Segoe Script',cursive; font-size: 34px; color: #1E3A8A; line-height: 1; }

/* Stamp */
.ordo-stamp { display: flex; align-items: center; justify-content: center; }
.ordo-stamp__circle { width: 120px; height: 120px; border-radius: 50%; border: 3px solid #1D4ED8; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 10px; transform: rotate(-12deg); box-shadow: inset 0 0 0 4px rgba(37,99,235,.06); }
.stamp-top  { font-size: 7.5px; font-weight: 800; color: #1D4ED8; letter-spacing: .04em; margin: 0; line-height: 1.3; font-family: 'Inter',sans-serif; }
.stamp-spec { font-size: 8px; color: #3B82F6; font-weight: 600; margin: 3px 0; font-family: 'Inter',sans-serif; }
.stamp-star { font-size: 9px; color: #2563EB; margin: 1px 0; }
.stamp-rpps { font-size: 7px; color: #93C5FD; margin: 0; font-family: 'Inter',sans-serif; }

.ordo-note { font-size: 8.5px; color: #CBD5E1; text-align: center; margin-top: 18px; font-family: 'Inter',sans-serif; line-height: 1.5; }

/* ── Validate bar ─────────────────────────────────────────────────────────── */
.validate-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  background: #0F172A; padding: 18px 24px; border-radius: 0 0 16px 16px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}
.validate-bar__left { display: flex; flex-direction: column; gap: 4px; }
.vb-info { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #94A3B8; font-family: 'Inter',sans-serif; }
.vb-error { font-size: 12px; color: #EF4444; margin: 0; font-family: 'Inter',sans-serif; }

.vb-btn {
  display: inline-flex; align-items: center; gap: 9px;
  padding: 13px 26px; border-radius: 12px; border: none;
  background: #2563EB; color: white;
  font-size: 14px; font-weight: 800; cursor: pointer;
  transition: opacity .15s; white-space: nowrap; flex-shrink: 0;
}
.vb-btn:hover:not(:disabled) { opacity: .88; }
.vb-btn:disabled { opacity: .6; cursor: not-allowed; }

.spin { width: 16px; height: 16px; border-radius: 50%; border: 2.5px solid rgba(255,255,255,.3); border-top-color: white; animation: spin .6s linear infinite; flex-shrink: 0; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
