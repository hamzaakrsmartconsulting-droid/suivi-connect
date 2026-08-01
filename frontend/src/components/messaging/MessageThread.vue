<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'

interface Message {
  id: string
  expediteurId: string
  contenu: string
  createdAt: string
  lu: boolean
}

const props = defineProps<{
  messages: Message[]
  currentUserId: string
  contactName: string
  contactRole?: string
  contactTyping?: boolean
}>()

const emit = defineEmits<{
  send: [content: string]
  typing: [isTyping: boolean]
  call: [type: 'audio' | 'video']
}>()

const newMessage  = ref('')
const sending     = ref(false)
const messagesEnd = ref<HTMLElement | null>(null)
const inputRef    = ref<HTMLTextAreaElement | null>(null)
let typingTimer: ReturnType<typeof setTimeout> | null = null

function formatTime(date: string) {
  const d = new Date(date)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function send() {
  const text = newMessage.value.trim()
  if (!text || sending.value) return
  sending.value = true
  emit('typing', false)
  emit('send', text)
  newMessage.value = ''
  sending.value = false
  inputRef.value?.focus()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

function onInput() {
  emit('typing', true)
  if (typingTimer) clearTimeout(typingTimer)
  typingTimer = setTimeout(() => emit('typing', false), 2000)
}

watch(() => props.messages.length, async () => {
  await nextTick()
  messagesEnd.value?.scrollIntoView({ behavior: 'smooth' })
})

watch(() => props.contactTyping, async () => {
  await nextTick()
  messagesEnd.value?.scrollIntoView({ behavior: 'smooth' })
})
</script>

<template>
  <div class="chat">
    <!-- Header -->
    <div class="chat__header">
      <div class="chat__avatar">{{ contactName.charAt(0).toUpperCase() }}</div>
      <div class="chat__header-info">
        <p class="chat__name">{{ contactName }}</p>
        <p class="chat__status">
          <span class="chat__status-dot" />
          {{ contactRole || 'En ligne' }}
        </p>
      </div>
      <div class="chat__header-actions">
        <button class="chat__action-btn" title="Appel audio" @click="emit('call', 'audio')">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="1.8" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        </button>
        <button class="chat__action-btn" title="Appel vidéo" @click="emit('call', 'video')">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="1.8" stroke-linecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
        </button>
      </div>
    </div>

    <!-- Messages -->
    <div class="chat__messages">
      <div v-if="!messages.length" class="chat__empty">
        <div class="chat__empty-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#93C5FD" stroke-width="1.5" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="13" y2="14"/></svg>
        </div>
        <p class="chat__empty-title">Démarrez la conversation</p>
        <p class="chat__empty-sub">Envoyez un message sécurisé à {{ contactName }}</p>
      </div>

      <template v-else>
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="bubble-row"
          :class="msg.expediteurId === currentUserId ? 'bubble-row--sent' : 'bubble-row--received'"
        >
          <div v-if="msg.expediteurId !== currentUserId" class="bubble__avatar">
            {{ contactName.charAt(0).toUpperCase() }}
          </div>
          <div class="bubble-wrap">
            <div
              class="bubble"
              :class="msg.expediteurId === currentUserId ? 'bubble--sent' : 'bubble--received'"
            >
              {{ msg.contenu }}
            </div>
            <span class="bubble__time">{{ formatTime(msg.createdAt) }}</span>
          </div>
        </div>
      </template>

      <!-- Typing indicator -->
      <Transition name="typing-fade">
        <div v-if="contactTyping" class="bubble-row bubble-row--received typing-row">
          <div class="bubble__avatar">{{ contactName.charAt(0).toUpperCase() }}</div>
          <div class="bubble-wrap">
            <div class="bubble bubble--received bubble--typing">
              <span class="typing-dot" />
              <span class="typing-dot" />
              <span class="typing-dot" />
            </div>
            <span class="bubble__time">en train d'écrire…</span>
          </div>
        </div>
      </Transition>

      <div ref="messagesEnd" />
    </div>

    <!-- Input -->
    <div class="chat__input-area">
      <div class="chat__input-wrap">
        <textarea
          ref="inputRef"
          v-model="newMessage"
          rows="1"
          class="chat__textarea"
          placeholder="Écrire un message sécurisé…"
          @keydown="onKeydown"
          @input="onInput"
        />
        <button
          class="chat__send-btn"
          :disabled="!newMessage.trim() || sending"
          @click="send"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
      <p class="chat__secure-note">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Messagerie chiffrée · Confidentielle
      </p>
    </div>
  </div>
</template>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px - 56px - 56px); /* topbar + padding */
  min-height: 520px;
  max-height: 780px;
  background: #FFFFFF;
  border-radius: 20px;
  border: 1px solid #E2E8F0;
  box-shadow: 0 1px 3px rgba(15,23,42,0.05), 0 8px 32px rgba(15,23,42,0.06);
  overflow: hidden;
  width: 100%;
}

/* Header */
.chat__header {
  display: flex; align-items: center; gap: 14px;
  padding: 18px 24px; border-bottom: 1px solid #F1F5F9;
  background: #FFFFFF; flex-shrink: 0;
}
.chat__avatar {
  width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, #3B82F6, #7C3AED);
  color: white; font-size: 16px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.chat__header-info { flex: 1; min-width: 0; }
.chat__name   { font-size: 15px; font-weight: 800; color: #0F172A; margin: 0 0 3px; letter-spacing: -0.02em; }
.chat__status { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748B; margin: 0; font-weight: 500; }
.chat__status-dot { width: 7px; height: 7px; border-radius: 50%; background: #10B981; box-shadow: 0 0 6px rgba(16,185,129,0.6); }
.chat__header-actions { display: flex; gap: 6px; }
.chat__action-btn {
  width: 36px; height: 36px; border: 1px solid #E2E8F0; background: #FFFFFF;
  border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background 0.13s, border-color 0.13s;
}
.chat__action-btn:hover { background: #F8FAFC; border-color: #CBD5E1; }

/* Messages area */
.chat__messages {
  flex: 1; overflow-y: auto; padding: 24px;
  background: #F8FAFC;
  display: flex; flex-direction: column; gap: 16px;
}
.chat__messages::-webkit-scrollbar { width: 4px; }
.chat__messages::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 2px; }

.chat__empty {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 10px; text-align: center;
}
.chat__empty-icon {
  width: 72px; height: 72px; border-radius: 20px; background: #EFF6FF;
  display: flex; align-items: center; justify-content: center; margin-bottom: 4px;
}
.chat__empty-title { font-size: 16px; font-weight: 800; color: #0F172A; margin: 0; }
.chat__empty-sub   { font-size: 13px; color: #94A3B8; margin: 0; }

/* Bubbles */
.bubble-row {
  display: flex; align-items: flex-end; gap: 10px;
  max-width: 72%;
}
.bubble-row--sent {
  align-self: flex-end;
  flex-direction: row-reverse;
}
.bubble-row--received { align-self: flex-start; }

.bubble__avatar {
  width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, #3B82F6, #7C3AED);
  color: white; font-size: 12px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 18px;
}

.bubble-wrap { display: flex; flex-direction: column; gap: 4px; }
.bubble-row--sent .bubble-wrap { align-items: flex-end; }
.bubble-row--received .bubble-wrap { align-items: flex-start; }

.bubble {
  padding: 12px 16px; border-radius: 16px;
  font-size: 14px; line-height: 1.55; font-weight: 500;
  word-break: break-word;
}
.bubble--sent {
  background: linear-gradient(135deg, #2563EB, #1D4ED8);
  color: white;
  border-bottom-right-radius: 4px;
  box-shadow: 0 2px 8px rgba(37,99,235,0.25);
}
.bubble--received {
  background: #FFFFFF;
  color: #1E293B;
  border: 1px solid #E2E8F0;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 4px rgba(15,23,42,0.06);
}

.bubble__time { font-size: 11px; color: #94A3B8; font-weight: 500; padding: 0 4px; }

/* Input area */
.chat__input-area {
  padding: 16px 20px 14px; border-top: 1px solid #F1F5F9;
  background: #FFFFFF; flex-shrink: 0;
}
.chat__input-wrap {
  display: flex; align-items: flex-end; gap: 10px;
  background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 14px;
  padding: 10px 10px 10px 16px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.chat__input-wrap:focus-within {
  border-color: #2563EB;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
  background: #FFFFFF;
}
.chat__textarea {
  flex: 1; border: none; outline: none; background: transparent;
  font-size: 14px; color: #0F172A; font-family: 'Inter', sans-serif;
  font-weight: 500; resize: none; line-height: 1.5; max-height: 120px;
  padding: 2px 0;
}
.chat__textarea::placeholder { color: #CBD5E1; }

.chat__send-btn {
  width: 40px; height: 40px; border-radius: 11px; border: none; flex-shrink: 0;
  background: linear-gradient(135deg, #2563EB, #1D4ED8);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 3px 10px rgba(37,99,235,0.35);
  transition: opacity 0.15s, transform 0.15s;
}
.chat__send-btn:hover:not(:disabled) { opacity: 0.9; transform: scale(1.05); }
.chat__send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

.chat__secure-note {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; color: #94A3B8; font-weight: 500;
  margin: 8px 0 0; justify-content: center;
}

/* Typing indicator */
.typing-row { align-items: flex-end; }

.bubble--typing {
  display: flex; align-items: center; gap: 5px;
  padding: 14px 18px; min-width: 60px;
}

.typing-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #94A3B8; display: inline-block;
  animation: typing-bounce 1.2s infinite ease-in-out;
}
.typing-dot:nth-child(1) { animation-delay: 0s; }
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-6px); opacity: 1; }
}

/* Transition */
.typing-fade-enter-active, .typing-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.typing-fade-enter-from, .typing-fade-leave-to {
  opacity: 0; transform: translateY(6px);
}
</style>
