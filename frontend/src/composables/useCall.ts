import { ref, shallowRef } from 'vue'
import { ensureConnected } from '@/services/socket'

export type CallType = 'audio' | 'video'
export type CallMode = 'idle' | 'incoming' | 'outgoing' | 'active'

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

export function useCall() {
  const mode         = ref<CallMode>('idle')
  const callType     = ref<CallType>('audio')
  const contactName  = ref('')
  const contactId    = ref('')
  const muted        = ref(false)
  const cameraOff    = ref(false)
  const localStream  = shallowRef<MediaStream | null>(null)
  const remoteStream = shallowRef<MediaStream | null>(null)

  let pc: RTCPeerConnection | null = null
  let pendingOffer: RTCSessionDescriptionInit | null = null
  let pendingCandidates: RTCIceCandidateInit[] = []

  function socket() {
    const token = localStorage.getItem('accessToken') ?? ''
    return ensureConnected(token)
  }

  // ── Socket listeners ──────────────────────────────────────────────────────

  async function onCallOffer({ from, offer, callType: type, callerName }: {
    from: string
    offer: RTCSessionDescriptionInit
    callType: CallType
    callerName: string
  }) {
    if (mode.value !== 'idle') {
      // Already in a call — reject automatically
      socket().emit('call_rejected', { to: from })
      return
    }
    pendingOffer   = offer
    contactId.value   = from
    contactName.value = callerName
    callType.value    = type
    mode.value        = 'incoming'
  }

  async function onCallAnswer({ answer }: { answer: RTCSessionDescriptionInit }) {
    if (!pc) return
    await pc.setRemoteDescription(new RTCSessionDescription(answer))
    // Flush any queued ICE candidates
    for (const c of pendingCandidates) {
      await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
    }
    pendingCandidates = []
    mode.value = 'active'
  }

  function onCallRejected() { cleanup() }
  function onCallEnded()    { cleanup() }

  async function onIceCandidate({ candidate }: { candidate: RTCIceCandidateInit }) {
    if (!pc || !pc.remoteDescription) {
      pendingCandidates.push(candidate)
      return
    }
    await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {})
  }

  function setupListeners() {
    const s = socket()
    s.on('call_offer',    onCallOffer)
    s.on('call_answer',   onCallAnswer)
    s.on('call_rejected', onCallRejected)
    s.on('call_ended',    onCallEnded)
    s.on('ice_candidate', onIceCandidate)
  }

  function teardownListeners() {
    const s = socket()
    s.off('call_offer',    onCallOffer)
    s.off('call_answer',   onCallAnswer)
    s.off('call_rejected', onCallRejected)
    s.off('call_ended',    onCallEnded)
    s.off('ice_candidate', onIceCandidate)
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  async function getMedia(type: CallType) {
    return navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video',
    })
  }

  function buildPeerConnection(recipientId: string) {
    const peer = new RTCPeerConnection(ICE_CONFIG)

    peer.onicecandidate = ({ candidate }) => {
      if (candidate) {
        socket().emit('ice_candidate', { to: recipientId, candidate: candidate.toJSON() })
      }
    }

    peer.ontrack = (e) => {
      remoteStream.value = e.streams[0] ?? null
    }

    pc = peer
    return peer
  }

  // ── Public actions ────────────────────────────────────────────────────────

  async function initiateCall(
    recipientId: string,
    name: string,
    type: CallType,
    callerName: string,
  ) {
    callType.value    = type
    contactName.value = name
    contactId.value   = recipientId
    mode.value        = 'outgoing'

    try {
      localStream.value = await getMedia(type)
      const peer = buildPeerConnection(recipientId)

      for (const track of localStream.value.getTracks()) {
        peer.addTrack(track, localStream.value)
      }

      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)

      socket().emit('call_offer', {
        to: recipientId,
        offer,
        callType: type,
        callerName,
      })
    } catch (err) {
      console.error('[Call] Error initiating call:', err)
      cleanup()
    }
  }

  async function acceptCall() {
    if (!pendingOffer) return
    mode.value = 'active'

    try {
      localStream.value = await getMedia(callType.value)
      const peer = buildPeerConnection(contactId.value)

      for (const track of localStream.value.getTracks()) {
        peer.addTrack(track, localStream.value)
      }

      await peer.setRemoteDescription(new RTCSessionDescription(pendingOffer))
      pendingOffer = null

      const answer = await peer.createAnswer()
      await peer.setLocalDescription(answer)

      for (const c of pendingCandidates) {
        await peer.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
      }
      pendingCandidates = []

      socket().emit('call_answer', { to: contactId.value, answer })
    } catch (err) {
      console.error('[Call] Error accepting call:', err)
      cleanup()
    }
  }

  function rejectCall() {
    socket().emit('call_rejected', { to: contactId.value })
    cleanup()
  }

  function endCall() {
    socket().emit('call_ended', { to: contactId.value })
    cleanup()
  }

  function toggleMute() {
    if (!localStream.value) return
    muted.value = !muted.value
    localStream.value.getAudioTracks().forEach(t => { t.enabled = !muted.value })
  }

  function toggleCamera() {
    if (!localStream.value) return
    cameraOff.value = !cameraOff.value
    localStream.value.getVideoTracks().forEach(t => { t.enabled = !cameraOff.value })
  }

  function cleanup() {
    mode.value      = 'idle'
    pendingOffer    = null
    pendingCandidates = []

    if (pc) { pc.close(); pc = null }

    if (localStream.value) {
      localStream.value.getTracks().forEach(t => t.stop())
      localStream.value = null
    }
    remoteStream.value = null
    muted.value        = false
    cameraOff.value    = false
  }

  return {
    // state
    mode, callType, contactName, contactId,
    localStream, remoteStream, muted, cameraOff,
    // actions
    initiateCall, acceptCall, rejectCall, endCall,
    toggleMute, toggleCamera,
    // lifecycle
    setupListeners, teardownListeners,
  }
}
