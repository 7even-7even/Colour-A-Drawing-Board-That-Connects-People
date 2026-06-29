// In production (Vercel), set VITE_API_URL to your Railway backend URL,
// e.g. https://colour-server.up.railway.app
// Locally it's empty -> Vite dev proxy handles /api.
// Trailing slashes are stripped so we never produce "//api".
export const SERVER_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const BASE = `${SERVER_URL}/api`;

function authHeaders() {
  const token = sessionStorage.getItem('cb_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(opts.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  createRoom: (name, displayName) =>
    req('/rooms', { method: 'POST', body: JSON.stringify({ name, displayName }) }),

  joinRoom: (code, displayName) =>
    req(`/rooms/${code}/join`, { method: 'POST', body: JSON.stringify({ displayName }) }),

  snapshot: (code) => req(`/rooms/${code}/snapshot`),

  uploadFile: async (code, file) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE}/files/${code}`, {
      method: 'POST',
      headers: { ...authHeaders() }, // no content-type; browser sets multipart boundary
      body: form,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },

  fileUrl: (id) => `${BASE}/files/${id}`,
};
