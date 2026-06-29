import { customAlphabet } from 'nanoid';

// Human-friendly, no ambiguous chars (no 0/O, 1/I).
const nano = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

export function newRoomCode() {
  const s = nano();
  return `${s.slice(0, 2)}-${s.slice(2)}`; // e.g. "BR-7F3K"
}
