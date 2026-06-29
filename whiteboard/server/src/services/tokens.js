import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import { env } from '../config/env.js';

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

// Mint a guest identity scoped to a room. No password, no signup.
export function mintGuestToken({ name, roomCode }) {
  const userId = `guest:${nanoid(10)}`;
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const payload = { userId, name: name || 'Guest', color, roomCode };
  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
  return { token, user: payload };
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch {
    return null;
  }
}
