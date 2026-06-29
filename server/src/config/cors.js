import { env } from './env.js';
import { logger } from '../utils/logger.js';

// Normalize an origin: trim whitespace and any trailing slashes.
function normalize(o) {
  return String(o || '').trim().replace(/\/+$/, '');
}

// Parse CLIENT_ORIGIN into a list of allowed origins.
// Supports: "*", comma-separated list, and a special "*.vercel.app" wildcard
// (set ALLOW_VERCEL_PREVIEWS=true to auto-allow Vercel preview deployments).
const allowList = env.CLIENT_ORIGIN === '*'
  ? '*'
  : env.CLIENT_ORIGIN.split(',').map(normalize).filter(Boolean);

const allowVercelPreviews = String(process.env.ALLOW_VERCEL_PREVIEWS || '').toLowerCase() === 'true';

export function isAllowedOrigin(origin) {
  // Non-browser clients (curl, server-to-server, health checks) send no Origin.
  if (!origin) return true;
  if (allowList === '*') return true;

  const o = normalize(origin);
  if (allowList.includes(o)) return true;

  // Allow any *.vercel.app preview if explicitly enabled.
  if (allowVercelPreviews && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(o)) return true;

  return false;
}

// Shared cors() options object (used by Express).
export const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    logger.warn('CORS blocked origin', { origin });
    return callback(null, false); // do NOT throw -> avoids 500s on preflight
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Origin checker for Socket.IO (same logic).
export const socketCorsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
};

logger.info('CORS configured', {
  allowList: allowList === '*' ? '*' : allowList,
  allowVercelPreviews,
});
