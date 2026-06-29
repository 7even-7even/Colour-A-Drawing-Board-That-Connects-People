/**
 * In-memory presence per room. For multi-node, presence is reconciled via the
 * Redis adapter rooms; this map tracks the sockets connected to THIS node, and
 * the authoritative count is derived from io.in(room).fetchSockets() when needed.
 *
 * For the MVP we expose helpers used by socket handlers.
 */
const rooms = new Map(); // roomCode -> Map<socketId, user>

export const presence = {
  add(roomCode, socketId, user) {
    if (!rooms.has(roomCode)) rooms.set(roomCode, new Map());
    rooms.get(roomCode).set(socketId, user);
  },
  remove(roomCode, socketId) {
    const r = rooms.get(roomCode);
    if (!r) return;
    r.delete(socketId);
    if (r.size === 0) rooms.delete(roomCode);
  },
  list(roomCode) {
    const r = rooms.get(roomCode);
    if (!r) return [];
    // de-dupe by userId (a user may have multiple tabs)
    const byUser = new Map();
    for (const u of r.values()) byUser.set(u.userId, u);
    return [...byUser.values()];
  },
};
