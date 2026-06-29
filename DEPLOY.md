# Deploying Colour 🎨

This guide deploys the app for **free** as a portfolio project using:

| Layer | Host | Cost |
|---|---|---|
| Database + file storage (GridFS) | **MongoDB Atlas** (M0) | Free forever |
| Backend (Node + Socket.IO) | **Railway** | Free trial credit, then ~$5/mo |
| Frontend (React build) | **Vercel** | Free |

> You'll end up with a public URL like `https://colour.vercel.app`.
> Total time: ~25–35 minutes. No credit card needed for Atlas or Vercel.

---

## Prerequisites

1. The `whiteboard/` project pushed to a **GitHub repo** (both Railway and Vercel deploy from GitHub).
   ```bash
   cd whiteboard
   git init
   git add .
   git commit -m "Colour: real-time collaborative whiteboard"
   # create an empty repo on github.com, then:
   git remote add origin https://github.com/<you>/colour.git
   git push -u origin main
   ```
2. Accounts (sign up with GitHub for all three):
   - https://www.mongodb.com/cloud/atlas/register
   - https://railway.app
   - https://vercel.com

---

## Step 1 — Database: MongoDB Atlas (free)

1. After signing up, **Create a Cluster** → choose **M0 Free** → pick a region near you → **Create**.
2. **Security → Database Access → Add New Database User**
   - Username: `colour`  ·  Password: click **Autogenerate** and **copy it** (you'll need it).
   - Built-in role: **Read and write to any database**.
3. **Security → Network Access → Add IP Address → "Allow access from anywhere"** (`0.0.0.0/0`).
   - *(Railway uses dynamic IPs, so this is the simplest. For tighter security later, restrict to Railway's egress IPs.)*
4. **Database → Connect → Drivers** → copy the connection string. It looks like:
   ```
   mongodb+srv://colour:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Edit it:
   - Replace `<password>` with the password from step 2.
   - Add the database name `colour` **before** the `?`:
   ```
   mongodb+srv://colour:YOURPASSWORD@cluster0.xxxxx.mongodb.net/colour?retryWrites=true&w=majority
   ```
   👉 **Save this final string** — it's your `MONGO_URI`.

---

## Step 2 — Backend: Railway

1. Railway → **New Project → Deploy from GitHub repo** → pick your repo.
2. Railway may detect the whole repo. Point it at the **server** folder:
   - Open the service → **Settings → Root Directory** → set to `server`.
   - Railway will use `server/Dockerfile` automatically (config in `server/railway.json`).
3. **Variables** tab → add these (one per line, "Raw Editor" makes it easy):
   ```
   NODE_ENV=production
   MONGO_URI=mongodb+srv://colour:YOURPASSWORD@cluster0.xxxxx.mongodb.net/colour?retryWrites=true&w=majority
   JWT_SECRET=05d54199-2bcf-4b07-bc26-befd24543215
   REDIS_URL=
   MAX_FILE_MB=15
   CLIENT_ORIGIN=*
   ```
   - Leave `CLIENT_ORIGIN=*` **for now** — we'll lock it to the Vercel URL in Step 4.
   - Do **not** set `PORT` — Railway injects it; the server reads `process.env.PORT`.
4. **Settings → Networking → Generate Domain.** Copy the URL, e.g.:
   ```
   https://colour-server-production.up.railway.app
   ```
5. Verify it's alive — open this in your browser:
   ```
   https://colour-server-production.up.railway.app/api/health
   ```
   You should see `{"status":"ok","db":"up",...}`. ✅ If `db` is `down`, re-check your `MONGO_URI`.

---

## Step 3 — Frontend: Vercel

1. Vercel → **Add New → Project** → import the same GitHub repo.
2. Configure:
   - **Root Directory:** `client`
   - **Framework Preset:** Vite (auto-detected; `client/vercel.json` handles the SPA rewrite).
3. **Environment Variables** → add:
   ```
   VITE_API_URL = https://colour-server-production.up.railway.app
   ```
   (Your Railway URL from Step 2.4 — **no trailing slash**.)
4. **Deploy.** When it finishes you'll get a URL like `https://colour.vercel.app`.

---

## Step 4 — Lock down CORS (important)

Right now the backend accepts requests from anywhere (`*`). Restrict it to your real frontend:

1. Railway → your server → **Variables** → set:
   ```
   CLIENT_ORIGIN=https://colour.vercel.app
   ALLOW_VERCEL_PREVIEWS=true
   ```
   - `CLIENT_ORIGIN` = your **production** Vercel domain. You can list several,
     comma-separated. Trailing slashes/spaces are auto-trimmed, so a stray `/` is fine.
   - `ALLOW_VERCEL_PREVIEWS=true` also allows Vercel's **per-deployment preview URLs**
     (e.g. `colour-cild3eot0-yourproject.vercel.app`). Without this, only the exact
     production domain works and preview deploys hit CORS errors. Set it to `false`
     once you're testing only the production domain.
2. Railway redeploys automatically. Done.

> **Why you saw the CORS error:** the failing request came from a Vercel *preview*
> URL that wasn't in `CLIENT_ORIGIN`. Either add that exact URL, or set
> `ALLOW_VERCEL_PREVIEWS=true`. Also make sure `VITE_API_URL` on Vercel has **no
> trailing slash** (the app now strips it defensively, but keep it clean).

---

## Step 5 — Test it live

1. Open `https://colour.vercel.app`.
2. Enter a name → **Create board**.
3. Copy the invite link, open it in a **second browser / incognito / phone**.
4. Draw in one window → it appears live in the other. Send a chat message. Upload a file. ✅

---

## How requests flow in production

```
Browser ──HTTPS──▶  Vercel (static React)         ← serves the SPA
Browser ──HTTPS──▶  Railway /api/*                ← REST (rooms, files/GridFS)
Browser ──WSS────▶  Railway /socket.io            ← real-time strokes/chat/presence
Railway ──────────▶ Atlas (MongoDB + GridFS)      ← persistence
```

The frontend knows where the backend is via `VITE_API_URL` (baked in at build time).
Both REST and WebSocket point at the same Railway service.

---

## Common gotchas

| Symptom | Fix |
|---|---|
| Board loads but drawing/chat don't sync | `VITE_API_URL` wrong/missing on Vercel, or WebSocket blocked. Re-check Step 3.3 and redeploy. |
| CORS error in console | `CLIENT_ORIGIN` on Railway must exactly match your Vercel origin (scheme + host, no path, no trailing slash). |
| `/api/health` shows `db: down` | `MONGO_URI` wrong, or Atlas Network Access doesn't allow `0.0.0.0/0`. |
| Refreshing `/r/CODE` 404s | Ensure `client/vercel.json` is present (SPA rewrite). |
| Uploaded files disappear | You're not on Atlas / your Mongo isn't persistent. Files live in GridFS inside MongoDB. |
| Railway build fails | Confirm **Root Directory = `server`** so it finds `server/Dockerfile`. |

---

## Scaling beyond the free tier (later)

This MVP is single-instance on Railway. To grow:

1. **Add Redis** (Railway has a one-click Redis plugin) and set `REDIS_URL`. The code auto-enables the Socket.IO Redis adapter → you can then run **multiple backend instances** and they'll share real-time state.
2. **Enable sticky sessions** at your load balancer for WebSocket connections.
3. **Move files GridFS → S3/R2** by implementing the `StorageService` interface in `server/src/services/storage.js` (routes don't change). Cheaper at scale than storing blobs in Mongo.
4. **Shard Atlas on `roomId`** and add the stroke-log compaction job (see `ARCHITECTURE.md §1.4`).
5. Put the frontend behind Vercel's CDN (already is) and add a custom domain in both Vercel and `CLIENT_ORIGIN`.

---

## Alternative: one-host deploy (VPS / Render)

If you'd rather run everything on a single box, the repo already has a working
`docker-compose.yml` (Mongo + Redis + server + client + Nginx WS proxy):

```bash
JWT_SECRET=05d54199-2bcf-4b07-bc26-befd24543215 docker compose up --build -d
# app on http://<server-ip>:8080 ; put Nginx/Caddy in front for HTTPS
```

Ask me and I'll generate a Caddy/Nginx + Let's Encrypt config for a custom domain.
