# Colour — Real-Time Collaborative Whiteboard

> A production-ready MVP architected to scale to millions of users.
> **Stack:** React (Vite) · Node.js (Express) · Socket.IO (WebSockets) · MongoDB (+ GridFS) · Redis (scale-out adapter)

---

## 1. System Architecture

### 1.1 High-level overview

```
                                  ┌────────────────────────────────────┐
                                  │             Clients (SPA)          │
                                  │   React + Konva canvas + Socket.IO │
                                  └───────────────┬────────────────────┘
                                                  │  HTTPS  +  WSS
                                                  ▼
                                  ┌────────────────────────────────────┐
                                  │       Load Balancer / Ingress      │
                                  │   (sticky sessions for WebSockets) │
                                  └───────────────┬────────────────────┘
                         ┌────────────────────────┼────────────────────────┐
                         ▼                         ▼                        ▼
                ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
                │  Node instance  │      │  Node instance  │      │  Node instance  │
                │  Express + IO   │ ···  │  Express + IO   │ ···  │  Express + IO   │
                └───────┬─────────┘      └────────┬────────┘      └────────┬────────┘
                        │                         │                        │
                        └──────────────┬──────────┴────────────┬──────────┘
                                       ▼                        ▼
                              ┌────────────────┐       ┌──────────────────┐
                              │  Redis Pub/Sub │       │     MongoDB      │
                              │  (IO adapter,  │       │  rooms / msgs /  │
                              │   presence)    │       │  strokes / files │
                              └────────────────┘       │  (GridFS blobs)  │
                                                       └──────────────────┘
```

### 1.2 Why these choices

| Concern | Decision | Rationale |
|---|---|---|
| Real-time transport | **Socket.IO** over WebSockets | Auto-reconnect, rooms, fallbacks, battle-tested. Raw `ws` would re-implement all of this. |
| Horizontal scale | **Redis adapter** (`@socket.io/redis-adapter`) | Broadcasts fan out across all Node instances. A user on instance A sees strokes from a user on instance B. |
| Sticky sessions | LB hashes on connection | A socket stays on one node; Redis handles cross-node fan-out. |
| Persistence | **MongoDB** | Flexible document model fits freeform stroke/JSON payloads; horizontal sharding by `roomId` later. |
| File storage | **GridFS** | Keeps infra to one datastore for the MVP; chunked storage avoids the 16MB BSON limit. Swappable behind a `StorageService` interface for S3 later. |
| Auth | **Guest + room codes** | Zero signup friction. Signed JWT carries a guest identity; rooms joined by short code. |
| State authority | **Server-authoritative log** | Strokes are an append-only event log persisted per room → late joiners replay; conflict-free for an additive whiteboard. |

### 1.3 Real-time data flow (a single stroke)

```
User draws  ──▶  client batches points (rAF)  ──▶  socket.emit("stroke:add")
                                                          │
                                                          ▼
                                        server validates + assigns id/seq
                                                          │
                         ┌────────────────────────────────┼───────────────────────────┐
                         ▼                                 ▼                            ▼
              persist to Mongo (async)        broadcast to room (Redis)      ack back to sender
                                                          │
                                                          ▼
                              every other client renders the stroke on its canvas
```

- **Optimistic rendering:** the drawer sees their stroke instantly; the server echo is idempotent (deduped by `clientStrokeId`).
- **Throttling:** cursor moves are throttled (~50ms) and *not* persisted. Strokes are batched per animation frame.
- **Late join / refresh:** client calls `GET /api/rooms/:code/snapshot` to hydrate the full board, then subscribes to the live stream.

### 1.4 Scaling to millions

1. **Stateless Node tier** → autoscale horizontally; Redis adapter makes any node equivalent.
2. **Shard MongoDB on `roomId`** → strokes/messages co-locate per room; reads/writes scale linearly.
3. **Snapshotting / compaction** → periodically fold the stroke log into a single compacted snapshot doc so replay cost is bounded (the included `compactRoom` job sketches this).
4. **CDN for static SPA** + **object storage (S3/R2)** for files in production (swap `GridFsStorage` for `S3Storage`).
5. **Redis presence keys with TTL** → accurate online counts without DB load.
6. **Backpressure**: per-socket rate limits on `stroke:add` / `chat:send`.

---

## 2. File Structure

```
whiteboard/
├── ARCHITECTURE.md
├── README.md
├── docker-compose.yml          # mongo + redis + server + client
├── .env.example
├── server/
│   ├── package.json
│   ├── Dockerfile
│   └── src/
│       ├── index.js            # bootstrap: http + express + socket.io
│       ├── app.js              # express app (routes, middleware)
│       ├── config/
│       │   ├── env.js          # env loading/validation
│       │   └── db.js           # mongo connection + GridFS bucket
│       ├── models/
│       │   ├── Room.js
│       │   ├── Stroke.js
│       │   └── Message.js
│       ├── routes/
│       │   ├── rooms.js        # create/join/snapshot
│       │   ├── files.js        # GridFS upload/download
│       │   └── health.js
│       ├── sockets/
│       │   ├── index.js        # io setup + redis adapter + auth
│       │   └── roomHandlers.js # join/draw/chat/presence events
│       ├── services/
│       │   ├── storage.js      # StorageService interface + GridFS impl
│       │   ├── presence.js     # in-room presence tracking
│       │   └── tokens.js       # guest JWT mint/verify
│       ├── middleware/
│       │   ├── auth.js
│       │   ├── rateLimit.js
│       │   └── error.js
│       └── utils/
│           ├── logger.js
│           └── codes.js        # human-friendly room codes
└── client/
    ├── package.json
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── store/useStore.js           # zustand global state
        ├── lib/socket.js               # socket singleton
        ├── lib/api.js                  # REST client
        ├── hooks/useWhiteboard.js      # canvas sync logic
        ├── hooks/useChat.js
        ├── pages/Landing.jsx
        ├── pages/Room.jsx
        ├── components/Whiteboard.jsx   # Konva canvas
        ├── components/Toolbar.jsx
        ├── components/ChatPanel.jsx
        ├── components/FilePanel.jsx
        ├── components/PresenceBar.jsx
        ├── components/Cursors.jsx
        └── styles/*.css
```

---

## 3. Database Schema (MongoDB)

### `rooms`
```js
{
  _id: ObjectId,
  code: "BR-7F3K",          // unique short join code (indexed)
  name: "Design Sync",
  createdBy: "guest:uuid",
  isLocked: false,           // optional join gate
  lastActivityAt: Date,      // for TTL/cleanup of stale rooms
  createdAt: Date,
  updatedAt: Date
}
// indexes: { code: 1 } unique, { lastActivityAt: 1 }
```

### `strokes` (append-only event log)
```js
{
  _id: ObjectId,
  roomId: ObjectId,          // indexed (shard key candidate)
  seq: Number,               // monotonic per room for ordering
  clientStrokeId: "uuid",    // idempotency / dedupe
  authorId: "guest:uuid",
  type: "path" | "rect" | "ellipse" | "text" | "image" | "clear" | "erase",
  data: {                    // tool-specific payload
    points: [x,y, x,y, ...], // flat array for paths
    color: "#111827",
    width: 4,
    // rect/ellipse: x,y,w,h ; text: x,y,text,fontSize ; image: fileId,x,y,w,h
  },
  createdAt: Date
}
// indexes: { roomId: 1, seq: 1 }, { roomId: 1, clientStrokeId: 1 } unique
```

### `messages`
```js
{
  _id: ObjectId,
  roomId: ObjectId,          // indexed
  authorId: "guest:uuid",
  authorName: "Ada",
  text: "looks great!",
  kind: "text" | "system" | "file",
  fileId: ObjectId | null,   // GridFS ref when kind === "file"
  createdAt: Date
}
// indexes: { roomId: 1, createdAt: 1 }
```

### Files → **GridFS** (`fs.files` / `fs.chunks`)
```js
fs.files: {
  _id, length, chunkSize, uploadDate, filename,
  metadata: { roomId, authorId, contentType, originalName }
}
```

---

## 4. API Endpoints (REST)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET`  | `/api/health` | – | Liveness/readiness probe |
| `POST` | `/api/rooms` | guest | Create a room → `{ room, token }` |
| `POST` | `/api/rooms/:code/join` | guest | Mint/refresh guest token for a room |
| `GET`  | `/api/rooms/:code` | guest | Room metadata |
| `GET`  | `/api/rooms/:code/snapshot` | guest | Full hydrate: strokes + recent messages |
| `POST` | `/api/files/:code` | guest | Upload file (multipart) → GridFS, returns fileId |
| `GET`  | `/api/files/:id` | guest | Stream file from GridFS |

### WebSocket events (Socket.IO)

**Client → Server**
| Event | Payload | Notes |
|---|---|---|
| `room:join` | `{ code, name }` | joins IO room, broadcasts presence |
| `stroke:add` | `{ clientStrokeId, type, data }` | rate-limited, persisted, broadcast |
| `stroke:clear` | `{}` | clears board (logged as `clear` stroke) |
| `cursor:move` | `{ x, y }` | throttled, not persisted |
| `chat:send` | `{ text }` | persisted, broadcast |
| `chat:file` | `{ fileId, originalName, contentType }` | file message |

**Server → Client**
| Event | Payload |
|---|---|
| `room:state` | `{ users: [...] }` presence list |
| `stroke:added` | full stroke object |
| `board:cleared` | `{ by }` |
| `cursor:moved` | `{ userId, name, x, y, color }` |
| `chat:message` | message object |
| `user:joined` / `user:left` | `{ user }` |
| `error` | `{ message }` |

---

## 5. UI Architecture

- **State:** `zustand` store holds `me`, `room`, `users`, `messages`, `tool`. Canvas stroke data is held in a `ref`-backed layer to avoid React re-renders per point (performance critical).
- **Rendering:** **Konva** canvas. One `Layer` for committed strokes, one for the in-progress stroke, one for remote cursors → cheap repaints.
- **Networking:** a single Socket.IO singleton (`lib/socket.js`); REST via `lib/api.js`. Hydrate on mount via snapshot, then stream.
- **Components:** `Room` page composes `Toolbar`, `Whiteboard`, `Cursors`, `PresenceBar`, `ChatPanel`, `FilePanel`.
- **Resilience:** optimistic local draw, reconnect re-joins room and re-hydrates, idempotent stroke replay.

---

## 6. Production concerns covered in the code

- Env validation, structured logging, graceful shutdown.
- Per-socket rate limiting, payload size caps, helmet + CORS.
- Idempotent stroke writes (`clientStrokeId` unique index).
- Redis adapter wired (no-op fallback to single-node in dev).
- Stateless tier → `docker-compose` scales `server` with `--scale`.
- Health endpoint for k8s probes.
