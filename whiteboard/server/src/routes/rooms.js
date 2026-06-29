import { Router } from 'express';
import { Room } from '../models/Room.js';
import { Stroke } from '../models/Stroke.js';
import { Message } from '../models/Message.js';
import { newRoomCode } from '../utils/codes.js';
import { mintGuestToken } from '../services/tokens.js';
import { requireGuest } from '../middleware/auth.js';

const router = Router();

// Helper: create a guest identity for a room and return token.
function asGuest(name, code) {
  return mintGuestToken({ name, roomCode: code });
}

// POST /api/rooms  { name?, displayName? } -> creates room + creator token
router.post('/rooms', async (req, res, next) => {
  try {
    const { name, displayName } = req.body || {};
    let code;
    // retry on the unlikely code collision
    for (let i = 0; i < 5; i++) {
      code = newRoomCode();
      if (!(await Room.exists({ code }))) break;
    }
    const { token, user } = asGuest(displayName, code);
    const room = await Room.create({
      code,
      name: name?.trim() || 'Untitled Board',
      createdBy: user.userId,
    });
    res.status(201).json({ room: publicRoom(room), token, user });
  } catch (e) {
    next(e);
  }
});

// POST /api/rooms/:code/join  { displayName? } -> token for an existing room
router.post('/rooms/:code/join', async (req, res, next) => {
  try {
    const code = req.params.code.toUpperCase();
    const room = await Room.findOne({ code });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.isLocked) return res.status(403).json({ error: 'Room is locked' });
    const { token, user } = asGuest(req.body?.displayName, code);
    res.json({ room: publicRoom(room), token, user });
  } catch (e) {
    next(e);
  }
});

// GET /api/rooms/:code -> metadata
router.get('/rooms/:code', requireGuest, async (req, res, next) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ room: publicRoom(room) });
  } catch (e) {
    next(e);
  }
});

// GET /api/rooms/:code/snapshot -> full board hydrate
router.get('/rooms/:code/snapshot', requireGuest, async (req, res, next) => {
  try {
    const room = await Room.findOne({ code: req.params.code.toUpperCase() });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    // Replay strokes since the last "clear" (compaction-friendly).
    const lastClear = await Stroke.findOne({ roomId: room._id, type: 'clear' })
      .sort({ seq: -1 })
      .lean();
    const strokeFilter = { roomId: room._id };
    if (lastClear) strokeFilter.seq = { $gt: lastClear.seq };

    const [strokes, messages] = await Promise.all([
      Stroke.find(strokeFilter).sort({ seq: 1 }).limit(20000).lean(),
      Message.find({ roomId: room._id }).sort({ createdAt: 1 }).limit(200).lean(),
    ]);

    res.json({ room: publicRoom(room), strokes, messages });
  } catch (e) {
    next(e);
  }
});

function publicRoom(r) {
  return { id: r._id, code: r.code, name: r.name, isLocked: r.isLocked, createdAt: r.createdAt };
}

export default router;
