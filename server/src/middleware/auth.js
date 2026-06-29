import { verifyToken } from '../services/tokens.js';

// REST guard: expects "Authorization: Bearer <guest-jwt>"
export function requireGuest(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const user = token && verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  req.user = user;
  next();
}
