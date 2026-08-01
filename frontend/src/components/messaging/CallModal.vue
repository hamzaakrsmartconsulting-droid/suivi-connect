<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import type { CallType, CallMode } from '@/composables/useCall'

const props = defineProps<{
  mode: CallMode
  callType: CallType
  contactName: string
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  muted: boolean
  cameraOff: boolean
}>()

const emit = defineEmits<{
  accept: []
  reject: []
  end: []
  toggleMute: []
  toggleCamera: []
}>()

const localVideoRef  = ref<HTMLVideoElement | null>(null)
const remoteVideoRef = ref<HTMLVideoElement | null>(null)
const duration = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

watch(() => props.mode, (val) => {
  if (val === 'active') {
    duration.value = 0
    timer = setInterval(() => duration.value++, 1000)
  } else {
    if (timer) { clearInterval(timer); timer = null }
    duration.value = 0
  }
})

watch(() => props.localStream, (s) => {
  if (localVideoRef.value) localVideoRef.value.srcObject = s
}, { immediate: true })

watch(() => props.remoteStream, (s) => {
  if (remoteVideoRef.value) remoteVideoRef.value.srcObject = s
}, { immediate: true })

// Re-attach after DOM updates when video refs mount
function onLocalRef(el: Element | null) {
  if (el && props.localStream) (el as HTMLVideoElement).srcObject = props.localStream
  localVideoRef.value = el as HTMLVideoElement | null
}
function onRemoteRef(el: Element | null) {
  if (el && props.remoteStream) (el as HTMLVideoElement).srcObject = props.remoteStream
  remoteVideoRef.value = el as HTMLVideoElement | null
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="call-fade">
      <div v-if="mode !== 'idle'" class="call-overlay" :class="{ 'call-overlay--video': callType === 'video' && mode === 'active' }">

        <!-- ── REMOTE VIDEO (background when active video call) ── -->
        <video
          v-if="callType === 'video' && mode === 'active'"
          :ref="onRemoteRef"
          class="call-remote-video"
          autoplay
          playsinline
        />

        <!-- ── MAIN CARD ── -->
        <div class="call-card" :class="mode === 'active' && callType === 'video' ? 'call-card--transparent' : ''">

          <!-- Incoming ringing state -->
          <template v-if="mode === 'incoming'">
            <div class="call-ring-wrap">
              <div class="call-ring call-ring--3" />
              <div class="call-ring call-ring--2" />
              <div class="call-ring call-ring--1" />
              <div class="call-avatar">{{ contactName.charAt(0).toUpperCase() }}</div>
            </div>
            <p class="call-label">Appel entrant</p>
            <p class="call-name">{{ contactName }}</p>
            <p class="call-type-badge">
              <svg v-if="callType === 'video'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              {{ callType === 'video' ? 'Appel vidéo' : 'Appel audio' }}
            </p>
            <div class="call-actions">
              <button class="call-btn call-btn--reject" title="Refuser" @click="emit('reject')">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
              <button class="call-btn call-btn--accept" title="Accepter" @click="emit('accept')">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </button>
            </div>
            <div class="call-labels-row">
              <span>Refuser</span>
              <span>Accepter</span>
            </div>
          </template>

          <!-- Outgoing calling state -->
          <template v-else-if="mode === 'outgoing'">
            <div class="call-ring-wrap">
              <div class="call-ring call-ring--3 call-ring--pulse" />
              <div class="call-ring call-ring--2 call-ring--pulse" />
              <div class="call-ring call-ring--1 call-ring--pulse" />
              <div class="call-avatar">{{ contactName.charAt(0).toUpperCase() }}</div>
            </div>
            <p class="call-label">Appel en cours…</p>
            <p class="call-name">{{ contactName }}</p>
            <p class="call-type-badge">
              <svg v-if="callType === 'video'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              {{ callType === 'video' ? 'Appel vidéo' : 'Appel audio' }}
            </p>
            <div class="call-actions">
              <button class="call-btn call-btn--end" title="Raccrocher" @click="emit('end')">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>
          </template>

          <!-- Active call state -->
          <template v-else-if="mode === 'active'">

            <!-- Audio-only active view -->
            <template v-if="callType === 'audio'">
              <div class="call-avatar call-avatar--lg">{{ contactName.charAt(0).toUpperCase() }}</div>
              <p class="call-name">{{ contactName }}</p>
              <p class="call-timer">{{ formatDuration(duration) }}</p>
            </template>

            <!-- Video active view: local PiP -->
            <template v-else>
              <div class="call-pip-wrap">
                <video :ref="onLocalRef" class="call-local-video" autoplay playsinline muted />
              </div>
              <p class="call-name call-name--video">{{ contactName }}</p>
              <p class="call-timer call-timer--video">{{ formatDuration(duration) }}</p>
            </template>

            <!-- Controls -->
            <div class="call-controls">
              <button
                class="call-ctrl-btn"
                :class="{ 'call-ctrl-btn--active': muted }"
                title="Muet"
                @click="emit('toggleMute')"
              >
                <svg v-if="!muted" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                <span>{{ muted ? 'Activé' : 'Muet' }}</span>
              </button>

              <button class="call-ctrl-btn call-ctrl-btn--end" title="Raccrocher" @click="emit('end')">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                <span>Fin</span>
              </button>

              <button
                v-if="callType === 'video'"
                class="call-ctrl-btn"
                :class="{ 'call-ctrl-btn--active': cameraOff }"
                title="Caméra"
                @click="emit('toggleCamera')"
              >
                <svg v-if="!cameraOff" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56"/></svg>
                <span>{{ cameraOff ? 'Caméra off' : 'Caméra' }}</span>
              </button>
            </div>
          </template>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Overlay */
.call-overlay {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  background: rgba(10, 16, 40, 0.82);
  backdrop-filter: blur(12px);
}
.call-overlay--video {
  background: rgba(5, 8, 20, 0.72);
}

/* Remote video fills background */
.call-remote-video {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; border-radius: 0;
}

/* Card */
.call-card {
  position: relative; z-index: 1;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 28px;
  padding: 40px 48px 36px;
  min-width: 320px;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  backdrop-filter: blur(24px);
  box-shadow: 0 32px 80px rgba(0,0,0,0.5);
}
.call-card--transparent {
  background: rgba(5,8,20,0.55);
}

/* Avatar + rings */
.call-ring-wrap {
  position: relative; width: 96px; height: 96px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 4px;
}
.call-ring {
  position: absolute; border-radius: 50%;
  border: 2px solid rgba(59,130,246,0.35);
  animation: ring-expand 2.4s infinite ease-out;
}
.call-ring--1 { width: 96px;  height: 96px;  animation-delay: 0s;    }
.call-ring--2 { width: 128px; height: 128px; animation-delay: 0.5s;  }
.call-ring--3 { width: 160px; height: 160px; animation-delay: 1.0s;  }
.call-ring--pulse { animation-name: ring-pulse; }

@keyframes ring-expand {
  0%   { transform: scale(0.85); opacity: 0.7; }
  70%  { transform: scale(1.1);  opacity: 0;   }
  100% { transform: scale(1.1);  opacity: 0;   }
}
@keyframes ring-pulse {
  0%, 100% { transform: scale(1);    opacity: 0.5; }
  50%       { transform: scale(1.08); opacity: 0.2; }
}

.call-avatar {
  width: 84px; height: 84px; border-radius: 50%;
  background: linear-gradient(135deg, #2563EB, #7C3AED);
  color: white; font-size: 32px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 32px rgba(37,99,235,0.45);
  flex-shrink: 0;
}
.call-avatar--lg {
  width: 96px; height: 96px; font-size: 36px;
}

.call-label {
  font-size: 13px; font-weight: 600; letter-spacing: 0.08em;
  text-transform: uppercase; color: rgba(255,255,255,0.5); margin: 0;
}
.call-name {
  font-size: 22px; font-weight: 800; color: #FFFFFF;
  margin: 0; letter-spacing: -0.03em;
}
.call-name--video {
  position: absolute; top: 20px; left: 24px;
  font-size: 18px; text-shadow: 0 2px 8px rgba(0,0,0,0.6);
}

.call-type-badge {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; color: rgba(255,255,255,0.55); margin: 0;
}

.call-timer {
  font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.8);
  letter-spacing: 0.04em; font-variant-numeric: tabular-nums; margin: 0;
}
.call-timer--video {
  position: absolute; top: 50px; left: 24px;
  font-size: 15px; text-shadow: 0 2px 8px rgba(0,0,0,0.6);
}

/* Action buttons (incoming/outgoing) */
.call-actions {
  display: flex; align-items: center; justify-content: center; gap: 40px;
  margin-top: 8px;
}
.call-btn {
  width: 68px; height: 68px; border-radius: 50%; border: none;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: transform 0.15s, filter 0.15s;
}
.call-btn:hover { transform: scale(1.1); filter: brightness(1.1); }
.call-btn--accept { background: linear-gradient(135deg, #10B981, #059669); box-shadow: 0 6px 24px rgba(16,185,129,0.5); }
.call-btn--reject { background: linear-gradient(135deg, #EF4444, #DC2626); box-shadow: 0 6px 24px rgba(239,68,68,0.5); }
.call-btn--end    { background: linear-gradient(135deg, #EF4444, #DC2626); box-shadow: 0 6px 24px rgba(239,68,68,0.5); }

.call-labels-row {
  display: flex; justify-content: space-between; width: 100%; max-width: 176px;
  font-size: 12px; color: rgba(255,255,255,0.45); font-weight: 600;
}

/* Active call controls */
.call-controls {
  display: flex; align-items: center; gap: 20px; margin-top: 16px;
}
.call-ctrl-btn {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15);
  border-radius: 16px; padding: 14px 18px; cursor: pointer; color: rgba(255,255,255,0.85);
  font-size: 11px; font-weight: 600; transition: background 0.15s, transform 0.15s;
  min-width: 70px;
}
.call-ctrl-btn:hover { background: rgba(255,255,255,0.17); transform: translateY(-1px); }
.call-ctrl-btn--active { background: rgba(255,255,255,0.2); color: #60A5FA; border-color: #3B82F6; }
.call-ctrl-btn--end {
  background: linear-gradient(135deg, #EF4444, #DC2626);
  border-color: transparent; color: white;
  box-shadow: 0 4px 16px rgba(239,68,68,0.45);
}
.call-ctrl-btn--end:hover { filter: brightness(1.1); }

/* Local PiP for video */
.call-pip-wrap {
  position: absolute; top: 20px; right: 20px;
  width: 130px; height: 90px; border-radius: 14px; overflow: hidden;
  border: 2px solid rgba(255,255,255,0.2);
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
}
.call-local-video {
  width: 100%; height: 100%; object-fit: cover;
}

/* Transition */
.call-fade-enter-active, .call-fade-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.call-fade-enter-from, .call-fade-leave-to { opacity: 0; transform: scale(0.96); }
</style>
