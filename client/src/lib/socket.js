import { io } from 'socket.io-client';

// Same backend as the REST API. Empty string => same-origin (local dev proxy).
// Trailing slashes stripped to avoid malformed socket URLs.
const SERVER_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '') || '/';

let socket = null;

export function connectSocket() {
  const token = sessionStorage.getItem('cb_token');
  if (socket && socket.connected) return socket;
  socket = io(SERVER_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 4000,
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
