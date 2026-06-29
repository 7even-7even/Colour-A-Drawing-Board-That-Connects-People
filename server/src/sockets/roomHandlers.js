import { nanoid } from 'nanoid';
import { Room } from '../models/Room.js';
import { Stroke } from '../models/Stroke.js';
import { Message } from '../models/Message.js';
import { presence } from '../services/presence.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { logger } from '../utils/logger.js';

const strokeLimiter = createRateLimiter({ capacity: 120, refillPerSec: 80 });
const chatLimiter = createRateLimiter({ capacity: 10, refillPerSec: 2 });

export function registerRoomHandlers(io, socket) {
  const { userId, name, color } = socket.user;
  let currentRoom = null;

  socket.on('room:join', async ({ code } = {}) => {
    try {
      code = String(code || socket.user.roomCode || '').toUpperCase();
      const room = await Room.findOne({ code });
      if (!room) return socket.emit('error', { message: 'Room not found' });

      currentRoom = code;
      socket.join(code);
      presence.add(code, socket.id, { userId, name, color });
      Room.updateOne({ _id: room._id }, { lastActivityAt: new Date() }).catch(() => {});

      // Tell everyone the new presence list
      io.to(code).emit('room:state', { users: presence.list(code) });
      socket.to(code).emit('user:joined', { user: { userId, name, color } });
    } catch (e) {
      logger.error('room:join failed', { msg: e.message });
      socket.emit('error', { message: 'Join failed' });
    }
  });

  socket.on('stroke:add', async (payload = {}) => {
    if (!currentRoom) return;
    if (!strokeLimiter(socket.id)) return; // silently drop on flood
    try {
      const { clientStrokeId, type, data } = payload;
      if (!clientStrokeId || !type) return;

      const room = await Room.findOneAndUpdate(
        { code: currentRoom },
        { $inc: { seq: 1 }, $set: { lastActivityAt: new Date() } },
        { new: true }
      );
      if (!room) return;

      const stroke = {
        roomId: room._id,
        seq: room.seq,
        clientStrokeId,
        authorId: userId,
        type,
        data: data || {},
      };

      // Idempotent insert; dedupe duplicate client retries.
      let saved;
      try {
        saved = await Stroke.create(stroke);
      } catch (err) {
        if (err.code === 11000) return; // duplicate clientStrokeId, ignore
        throw err;
      }

      io.to(currentRoom).emit('stroke:added', saved.toObject());
    } catch (e) {
      logger.error('stroke:add failed', { msg: e.message });
    }
  });

  socket.on('stroke:clear', async () => {
    if (!currentRoom) return;
    try {
      const room = await Room.findOneAndUpdate(
        { code: currentRoom },
        { $inc: { seq: 1 }, $set: { lastActivityAt: new Date() } },
        { new: true }
      );
      if (!room) return;
      await Stroke.create({
        roomId: room._id,
        seq: room.seq,
        clientStrokeId: nanoid(),
        authorId: userId,
        type: 'clear',
        data: {},
      });
      io.to(currentRoom).emit('board:cleared', { by: name });
    } catch (e) {
      logger.error('stroke:clear failed', { msg: e.message });
    }
  });

  // Cursor — high frequency, NOT persisted. Just fan out.
  socket.on('cursor:move', ({ x, y } = {}) => {
    if (!currentRoom || typeof x !== 'number' || typeof y !== 'number') return;
    socket.to(currentRoom).emit('cursor:moved', { userId, name, color, x, y });
  });

  socket.on('chat:send', async ({ text } = {}) => {
    if (!currentRoom) return;
    if (!chatLimiter(socket.id)) return;
    text = String(text || '').slice(0, 2000).trim();
    if (!text) return;
    try {
      const room = await Room.findOne({ code: currentRoom });
      if (!room) return;
      const msg = await Message.create({
        roomId: room._id,
        authorId: userId,
        authorName: name,
        text,
        kind: 'text',
      });
      io.to(currentRoom).emit('chat:message', msg.toObject());
    } catch (e) {
      logger.error('chat:send failed', { msg: e.message });
    }
  });

  socket.on('chat:file', async ({ fileId, originalName, contentType } = {}) => {
    if (!currentRoom || !fileId) return;
    try {
      const room = await Room.findOne({ code: currentRoom });
      if (!room) return;
      const msg = await Message.create({
        roomId: room._id,
        authorId: userId,
        authorName: name,
        kind: 'file',
        fileId,
        originalName,
        contentType,
      });
      io.to(currentRoom).emit('chat:message', msg.toObject());
    } catch (e) {
      logger.error('chat:file failed', { msg: e.message });
    }
  });

  socket.on('disconnect', () => {
    if (!currentRoom) return;
    presence.remove(currentRoom, socket.id);
    io.to(currentRoom).emit('room:state', { users: presence.list(currentRoom) });
    socket.to(currentRoom).emit('user:left', { user: { userId, name, color } });
  });
}
