import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../lib/jwt.js';

let io: Server | null = null;

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token as string;
    if (!token) return next(new Error('Authentification requise'));
    try {
      const user = verifyAccessToken(token);
      socket.data.user = user;
      next();
    } catch {
      next(new Error('Token invalide'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.user.userId;
    socket.join(`user:${userId}`);

    // Forward typing indicator to the recipient
    socket.on('typing', ({ recipientId, isTyping }: { recipientId: string; isTyping: boolean }) => {
      io!.to(`user:${recipientId}`).emit('typing', { senderId: userId, isTyping });
    });

    // WebRTC signaling relay — forward each event to the intended recipient
    socket.on('call_offer', ({ to, offer, callType, callerName }: {
      to: string; offer: RTCSessionDescriptionInit; callType: string; callerName: string;
    }) => {
      io!.to(`user:${to}`).emit('call_offer', { from: userId, offer, callType, callerName });
    });

    socket.on('call_answer', ({ to, answer }: { to: string; answer: RTCSessionDescriptionInit }) => {
      io!.to(`user:${to}`).emit('call_answer', { answer });
    });

    socket.on('call_rejected', ({ to }: { to: string }) => {
      io!.to(`user:${to}`).emit('call_rejected');
    });

    socket.on('call_ended', ({ to }: { to: string }) => {
      io!.to(`user:${to}`).emit('call_ended');
    });

    socket.on('ice_candidate', ({ to, candidate }: { to: string; candidate: RTCIceCandidateInit }) => {
      io!.to(`user:${to}`).emit('ice_candidate', { candidate });
    });

    socket.on('disconnect', () => {
      socket.leave(`user:${userId}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io non initialisé');
  return io;
}

export function emitToUser(userId: string, event: string, data: unknown) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}
