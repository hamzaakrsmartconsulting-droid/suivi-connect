import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function connectSocket(token: string) {
  // Disconnect any existing socket (including stale ones with old tokens)
  if (socket) {
    socket.disconnect()
    socket = null
  }

  socket = io(import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000', {
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ['websocket', 'polling'],
  })

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id)
  })

  socket.on('connect_error', (err) => {
    console.warn('[Socket] Connection error:', err.message)
  })

  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export function getSocket(): Socket | null {
  return socket
}

export function ensureConnected(token: string): Socket {
  if (!socket || !socket.connected) {
    return connectSocket(token)
  }
  return socket
}
