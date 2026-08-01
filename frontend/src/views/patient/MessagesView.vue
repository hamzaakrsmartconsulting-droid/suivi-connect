<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import { ensureConnected } from '@/services/socket'
import MessageThread from '@/components/messaging/MessageThread.vue'
import CallModal from '@/components/messaging/CallModal.vue'
import { useCall } from '@/composables/useCall'

interface Message {
  id: string; expediteurId: string; contenu: string; createdAt: string; lu: boolean
}

const auth = useAuthStore()
const messages        = ref<Message[]>([])
const doctorContact   = ref<{ user: { id: string }; nomComplet: string } | null>(null)
const loading         = ref(true)
const doctorIsTyping  = ref(false)
let typingTimeout: ReturnType<typeof setTimeout> | null = null

const {
  mode: callMode, callType, contactName: callContactName,
  localStream, remoteStream, muted, cameraOff,
  initiateCall, acceptCall, rejectCall, endCall,
  toggleMute, toggleCamera,
  setupListeners: setupCallListeners,
  teardownListeners: teardownCallListeners,
} = useCall()

async function loadDoctor() {
  loading.value = true
  try {
    const { data } = await api.get('/patient/doctor-contact')
    doctorContact.value = data
    if (data?.user?.id) {
      const { data: msgs } = await api.get('/patient/messages', { params: { contactId: data.user.id } })
      messages.value = msgs
    }
  } finally {
    loading.value = false
  }
}

async function sendMessage(content: string) {
  if (!doctorContact.value?.user?.id) return
  const { data } = await api.post('/patient/messages', {
    destinataireId: doctorContact.value.user.id,
    contenu: content,
  })
  messages.value.push(data)
}

function onNewMessage(msg: Message) {
  if (msg.expediteurId === doctorContact.value?.user?.id) {
    doctorIsTyping.value = false
    messages.value.push(msg)
  }
}

function onTyping({ senderId, isTyping }: { senderId: string; isTyping: boolean }) {
  if (senderId !== doctorContact.value?.user?.id) return
  doctorIsTyping.value = isTyping
  if (isTyping) {
    if (typingTimeout) clearTimeout(typingTimeout)
    typingTimeout = setTimeout(() => { doctorIsTyping.value = false }, 4000)
  }
}

function handleTyping(isTyping: boolean) {
  const token = localStorage.getItem('accessToken')
  if (!token || !doctorContact.value?.user?.id) return
  const socket = ensureConnected(token)
  socket.emit('typing', { recipientId: doctorContact.value.user.id, isTyping })
}

function handleCall(type: 'audio' | 'video') {
  if (!doctorContact.value?.user?.id) return
  initiateCall(
    doctorContact.value.user.id,
    doctorContact.value.nomComplet,
    type,
    auth.user?.profile?.nomComplet ?? auth.user?.email ?? 'Patient',
  )
}

onMounted(() => {
  loadDoctor()
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
        <p class="page-header__sub">Contactez votre médecin en toute confidentialité</p>
      </div>
      <div v-if="doctorContact" class="doctor-badge">
        <div class="doctor-badge__avatar">D</div>
        <div>
          <p class="doctor-badge__name">{{ doctorContact.nomComplet }}</p>
          <p class="doctor-badge__role">Votre cardiologue</p>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="center-loader">
      <v-progress-circular indeterminate color="primary" size="40" width="3" />
    </div>

    <!-- No doctor -->
    <div v-else-if="!doctorContact" class="empty-state">
      <div class="empty-state__icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#93C5FD" stroke-width="1.5" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="4" y1="4" x2="20" y2="20"/></svg>
      </div>
      <p class="empty-state__title">Aucun médecin assigné</p>
      <p class="empty-state__sub">Un médecin vous sera assigné prochainement pour le suivi de votre rééducation.</p>
    </div>

    <!-- Chat — full width -->
    <div v-else class="chat-wrapper">
      <MessageThread
        :messages="messages"
        :current-user-id="auth.user!.id"
        :contact-name="doctorContact.nomComplet"
        contact-role="Cardiologue · En ligne"
        :contact-typing="doctorIsTyping"
        @send="sendMessage"
        @typing="handleTyping"
        @call="handleCall"
      />
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
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
  margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #E2E8F0;
}
.page-header__title { font-size: 24px; font-weight: 800; color: #0F172A; letter-spacing: -0.03em; margin-bottom: 6px; }
.page-header__sub   { font-size: 14px; color: #64748B; font-weight: 500; }

.doctor-badge {
  display: flex; align-items: center; gap: 12px;
  background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 14px; padding: 12px 18px;
}
.doctor-badge__avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: linear-gradient(135deg, #2563EB, #1D4ED8);
  color: white; font-size: 15px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.doctor-badge__name { font-size: 14px; font-weight: 700; color: #1E40AF; margin: 0 0 2px; }
.doctor-badge__role { font-size: 12px; color: #3B82F6; margin: 0; font-weight: 500; }

.center-loader { display: flex; align-items: center; justify-content: center; padding: 80px; }

.empty-state {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 80px 32px; text-align: center;
}
.empty-state__icon {
  width: 80px; height: 80px; border-radius: 24px; background: #EFF6FF;
  display: flex; align-items: center; justify-content: center; margin-bottom: 8px;
}
.empty-state__title { font-size: 18px; font-weight: 800; color: #0F172A; }
.empty-state__sub   { font-size: 14px; color: #94A3B8; max-width: 360px; }

/* Full-width chat */
.chat-wrapper { width: 100%; }
</style>
