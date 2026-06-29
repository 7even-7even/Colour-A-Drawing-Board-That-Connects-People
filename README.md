# CollabBoard — Real-Time Collaborative Whiteboard

A production-ready MVP: multiple users draw on a shared canvas in real time, chat, share files, create/join rooms with a code, and sessions persist. Built to scale horizontally to millions of users.

**Stack:** React (Vite + Konva) · Node.js (Express) · Socket.IO · MongoDB (+ GridFS) · Redis (scale-out)

> Full design rationale lives in [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Features

- 🎨 **Simultaneous drawing** — pen, eraser, shapes, text; optimistic local render + server-authoritative event log.
- 💬 **Chat** — persisted per room, scrolls live to all participants.
- 🚪 **Rooms** — create or join by a short human-friendly code (e.g. `BR-7F3K`). No signup.
- 📎 **File sharing** — upload to GridFS, posted into chat; images render inline.
- 💾 **Session saving** — every stroke/message persists; refresh or rejoin replays the full board.
- 👥 **Live presence + cursors** — see who's online and where their cursor is.

---

## Quick start (Docker — everything)

```bash
cd whiteboard
JWT_SECRET=$(openssl rand -hex 32) docker compose up --build
# client → http://localhost:8080
# server → http://localhost:4000/api/health
```

Scale the real-time tier horizontally (Redis fans out across nodes):

```bash
docker compose up --build --scale server=3
```

## Local dev (no Docker)

You need MongoDB running locally (`mongodb://localhost:27017`). Redis is optional.

```bash
# 1. Server
cd server
cp ../.env.example .env       # edit JWT_SECRET
npm install
npm run dev                   # http://localhost:4000

# 2. Client (new terminal)
cd client
npm install
npm run dev                   # http://localhost:5173 (proxies /api + /socket.io)
```

Open two browser windows at `http://localhost:5173`, create a board in one, copy the
invite link / code, join from the other — drawing, chat, and presence sync live.

---

## How real-time works (short version)

1. Client draws → batches points → `socket.emit('stroke:add', { clientStrokeId, type, data })`.
2. Server validates, increments the room's monotonic `seq`, persists the stroke, and broadcasts `stroke:added` to the room.
3. Other clients render it; the sender's optimistic copy is deduped by `clientStrokeId`.
4. New joiners call `GET /api/rooms/:code/snapshot` to replay the board since the last `clear`, then subscribe to the live stream.

Cursors are throttled and **not** persisted. Strokes and chat **are**.

---

## Project layout

See [`ARCHITECTURE.md` §2](./ARCHITECTURE.md) for the annotated tree, schema, and API reference.

```
server/   Express + Socket.IO + Mongoose + GridFS
client/   React SPA (Vite, Konva canvas, zustand, react-router)
```

---

## Production notes

- **Stateless server tier** → autoscale; Redis adapter makes nodes interchangeable.
- **Sticky sessions** at the LB for WebSocket connections.
- **Shard MongoDB on `roomId`**; periodically compact the stroke log into snapshots.
- Swap **GridFS → S3/R2** by implementing the `StorageService` interface in `server/src/services/storage.js` (routes unchanged).
- Helmet, CORS allow-list, per-socket rate limiting, payload caps, idempotent writes, health probe, graceful shutdown — all wired.
