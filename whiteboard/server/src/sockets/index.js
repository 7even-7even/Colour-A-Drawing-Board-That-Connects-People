import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { env } from '../config/env.js';
import { verifyToken } from '../services/tokens.js';
import { registerRoomHandlers } from './roomHandlers.js';
import { logger } from '../utils/logger.js';

export async function attachSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_ORIGIN === '*' ? true : env.CLIENT_ORIGIN.split(','),
      credentials: true,
    },
    maxHttpBufferSize: 2e6, // 2MB cap on socket payloads
  });

  // Multi-node fan-out via Redis. Falls back to single-node if REDIS_URL unset.
  if (env.REDIS_URL) {
    try {
      const pub = createClient({ url: env.REDIS_URL });
      const sub = pub.duplicate();
      await Promise.all([pub.connect(), sub.connect()]);
      io.adapter(createAdapter(pub, sub));
      logger.info('Socket.IO Redis adapter enabled');
    } catch (e) {
      logger.warn('Redis adapter failed, running single-node', { msg: e.message });
    }
  } else {
    logger.info('Socket.IO single-node mode (no REDIS_URL)');
  }

  // Auth handshake: token via auth payload or query.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    const user = token && verifyToken(token);
    if (!user) return next(new Error('Unauthorized'));
    socket.user = user;
    next();
  });

  io.on('connection', (socket) => {
    logger.info('socket connected', { userId: socket.user.userId });
    registerRoomHandlers(io, socket);
  });

  return io;
}
