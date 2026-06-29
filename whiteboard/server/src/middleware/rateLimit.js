/**
 * Simple token-bucket rate limiter for socket events. Per-socket, in-memory.
 * Prevents a single client from flooding stroke/chat events.
 */
export function createRateLimiter({ capacity, refillPerSec }) {
  const buckets = new Map(); // socketId -> { tokens, last }

  return function allow(socketId) {
    const now = Date.now();
    let b = buckets.get(socketId);
    if (!b) {
      b = { tokens: capacity, last: now };
      buckets.set(socketId, b);
    }
    const elapsed = (now - b.last) / 1000;
    b.tokens = Math.min(capacity, b.tokens + elapsed * refillPerSec);
    b.last = now;
    if (b.tokens < 1) return false;
    b.tokens -= 1;
    return true;
  };
}
