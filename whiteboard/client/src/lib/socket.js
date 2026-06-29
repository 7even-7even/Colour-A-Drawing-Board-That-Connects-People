import { io } from 'socket.io-client';

let socket = null;

export function connectSocket() {
  const token = sessionStorage.getItem('cb_token');
  if (socket && socket.connected) return socket;
  socket = io('/', {
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
