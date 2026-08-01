<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import { ensureConnected } from '@/services/socket'
import MessageThread from '@/components/messaging/MessageThread.vue'
import CallModal from '@/components/messaging/CallModal.vue'
import { useCall } from '@/composables/useCall'

interface Patient {
  id: string; nomComplet: string
  user: { id: string }
}

interface Message {
  id: string; expediteurId: string; contenu: string; createdAt: string; lu: boolean
}

const auth = useAuthStore()
const patients          = ref<Patient[]>([])
const selectedPatient   = ref<Patient | null>(null)
const messages          = ref<Message[]>([])
const loading           = ref(true)
const search            = ref('')
const patientIsTyping   = ref(false)
const unreadFrom        = ref<Set<string>>(new Set())
let typingTimeout: ReturnType<typeof setTimeout> | null = null

const {
  mode: callMode, callType, contactName: callContactName,
  localStream, remoteStream, muted, cameraOff,
  initiateCall, acceptCall, rejectCall, endCall,
  toggleMute, toggleCamera,
  setupListeners: setupCallListeners,
  teardownListeners: teardownCallListeners,
} = useCall()

const filteredPatients = computed(() => {
  if (!search.value) return patients.value
  const q = search.value.toLowerCase()
  return patients.value.filter(p => p.nomComplet.toLowerCase().includes(q))
})

async function loadPatients() {
  loading.value = true
  try {
    const { data } = await api.get('/doctor/patients')
    patients.value = data.items
    if (data.items.length > 0) await selectPatient(data.items[0])
  } finally {
    loading.value = false
  }
}

async function selectPatient(patient: Patient) {
  selectedPatient.value = patient
  unreadFrom.value.delete(patient.user.id)
  const { data } = await api.get('/doctor/messages', { params: { contactId: patient.user.id } })
  messages.value = data
}

async function sendMessage(content: string) {
  if (!selectedPatient.value) return
  const { data } = await api.post('/doctor/messages', {
    destinataireId: selectedPatient.value.user.id,
    contenu: content,
  })
  messages.value.push(data)
}

function onNewMessage(msg: Message) {
  const isFromCurrentPatient = msg.expediteurId === selectedPatient.value?.user?.id
  if (isFromCurrentPatient) {
    patientIsTyping.value = false
    messages.value.push(msg)
  } else {
    unreadFrom.value = new Set([...unreadFrom.value, msg.expediteurId])
  }
}

function onTyping({ senderId, isTyping }: { senderId: string; isTyping: boolean }) {
  if (senderId !== selectedPatient.value?.user?.id) return
  patientIsTyping.value = isTyping
  if (isTyping) {
    if (typingTimeout) clearTimeout(typingTimeout)
    typingTimeout = setTimeout(() => { patientIsTyping.value = false }, 4000)
  }
}

function handleTyping(isTyping: boolean) {
  const token = localStorage.getItem('accessToken')
  if (!token || !selectedPatient.value?.user?.id) return
  const socket = ensureConnected(token)
  socket.emit('typing', { recipientId: selectedPatient.value.user.id, isTyping })
}

function handleCall(type: 'audio' | 'video') {
  if (!selectedPatient.value?.user?.id) return
  initiateCall(
    selectedPatient.value.user.id,
    selectedPatient.value.nomComplet,
    type,
    auth.user?.profile?.nomComplet ? `Dr. ${auth.user.profile.nomComplet}` : (auth.user?.email ?? 'Médecin'),
  )
}

onMounted(() => {
  loadPatients()
  const token = localStorage.getItem('accessToken')
  if (token) {
    const socket = ensureConnected(token)
    socket.on('new_message', onNewMessage)
    socket.on('typing', onTyping)
  }
  setupCallListeners()
})

onUnmounted(() => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    const socket = ensureConnected(token)
    socket.off('new_message', onNewMessage)
    socket.off('typing', onTyping)
  }
  if (typingTimeout) clearTimeout(typingTimeout)
  teardownCallListeners()
})
</script>

<template>
  <div class="messages-page">

    <!-- Header -->
    <div class="page-header">
      <div>
        <p class="section-label">Communication</p>
        <h1 class="page-header__title">Messagerie sécurisée</h1>
        <p class="page-header__sub">Échangez en toute confidentialité avec vos patients</p>
      </div>
    </div>

    <!-- Chat layout -->
    <div class="messages-layout">

      <!-- Patient list panel -->
      <div class="contacts-panel">
        <div class="contacts-panel__head">
          <p class="contacts-panel__title">Patients</p>
          <span class="contacts-panel__count">{{ patients.length }}</span>
        </div>

        <div class="contacts-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="search" placeholder="Rechercher…" class="contacts-search__input" />
        </div>

        <div v-if="loading" class="contacts-loading">
          <v-progress-circular indeterminate color="primary" size="28" width="3" />
        </div>

        <div v-else class="contacts-list">
          <button
            v-for="p in filteredPatients"
            :key="p.id"
            class="contact-item"
            :class="{ 'contact-item--active': selectedPatient?.id === p.id, 'contact-item--unread': unreadFrom.has(p.user.id) }"
            @click="selectPatient(p)"
          >
            <div class="contact-item__avatar">{{ p.nomComplet.charAt(0) }}</div>
            <div class="contact-item__info">
              <p class="contact-item__name">{{ p.nomComplet }}</p>
              <p class="contact-item__sub">Patient en suivi</p>
            </div>
            <span v-if="unreadFrom.has(p.user.id)" class="contact-item__badge">●</span>
          </button>
        </div>
      </div>

      <!-- Chat panel -->
      <div class="chat-panel">
        <MessageThread
          v-if="selectedPatient"
          :messages="messages"
          :current-user-id="auth.user!.id"
          :contact-name="selectedPatient.nomComplet"
          contact-role="Patient"
          :contact-typing="patientIsTyping"
          @send="sendMessage"
          @typing="handleTyping"
          @call="handleCall"
        />
        <div v-else class="chat-panel__empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#E2E8F0" stroke-width="1.5" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <p>Sélectionnez un patient pour démarrer</p>
        </div>
      </div>
    </div>

    <!-- Call modal (teleported to body) -->
    <CallModal
      :mode="callMode"
      :call-type="callType"
      :contact-name="callContactName"
      :local-stream="localStream"
      :remote-stream="remoteStream"
      :muted="muted"
      :camera-off="cameraOff"
      @accept="acceptCall"
      @reject="rejectCall"
      @end="endCall"
      @toggle-mute="toggleMute"
      @toggle-camera="toggleCamera"
    />
  </div>
</template>

<style scoped>
.messages-page { width: 100%; }

.page-header {
  margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #E2E8F0;
}
.page-header__title { font-size: 24px; font-weight: 800; color: #0F172A; letter-spacing: -0.03em; margin-bottom: 6px; }
.page-header__sub   { font-size: 14px; color: #64748B; font-weight: 500; }

/* Two-column layout */
.messages-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
  width: 100%;
  align-items: start;
}
@media (max-width: 900px) {
  .messages-layout { grid-template-columns: 1fr; }
  .contacts-panel { max-height: 280px; }
}

/* Contacts panel */
.contacts-panel {
  background: #FFFFFF; border-radius: 20px; border: 1px solid #E2E8F0;
  box-shadow: 0 1px 3px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.04);
  overflow: hidden; display: flex; flex-direction: column;
  max-height: calc(100vh - 64px - 56px - 56px - 80px);
  min-height: 520px;
}

.contacts-panel__head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px 14px; border-bottom: 1px solid #F1F5F9;
}
.contacts-panel__title { font-size: 15px; font-weight: 800; color: #0F172A; margin: 0; }
.contacts-panel__count {
  background: #EFF6FF; color: #2563EB; font-size: 11px; font-weight: 700;
  padding: 2px 8px; border-radius: 20px;
}

.contacts-search {
  display: flex; align-items: center; gap: 8px;
  margin: 12px 16px; padding: 9px 12px;
  background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px;
}
.contacts-search__input {
  flex: 1; border: none; outline: none; background: transparent;
  font-size: 13px; color: #0F172A; font-family: 'Inter', sans-serif;
}
.contacts-search__input::placeholder { color: #CBD5E1; }

.contacts-loading { display: flex; align-items: center; justify-content: center; padding: 40px; }

.contacts-list { flex: 1; overflow-y: auto; padding: 4px 8px 12px; }
.contacts-list::-webkit-scrollbar { width: 3px; }
.contacts-list::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 2px; }

.contact-item {
  display: flex; align-items: center; gap: 12px;
  width: 100%; padding: 11px 12px; border-radius: 12px;
  border: none; background: transparent; cursor: pointer; text-align: left;
  transition: background 0.13s;
}
.contact-item:hover { background: #F8FAFC; }
.contact-item--active { background: #EFF6FF; }
.contact-item--unread { background: #FFF8F0; }
.contact-item__badge { color: #F59E0B; font-size: 16px; flex-shrink: 0; line-height: 1; }
.contact-item__avatar {
  width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, #3B82F6, #7C3AED);
  color: white; font-size: 14px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.contact-item--active .contact-item__avatar { box-shadow: 0 0 0 2px #BFDBFE; }
.contact-item__name { font-size: 14px; font-weight: 700; color: #0F172A; margin: 0 0 2px; }
.contact-item__sub  { font-size: 11px; color: #94A3B8; margin: 0; font-weight: 500; }

/* Chat panel */
.chat-panel { width: 100%; min-width: 0; }
.chat-panel__empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; height: 520px; background: #FFFFFF; border-radius: 20px;
  border: 1px solid #E2E8F0; color: #94A3B8; font-size: 14px;
}
</style>
