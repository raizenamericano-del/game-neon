# NEON DASH

**A polished Geometry Dash–style rhythm platformer.** Dark neon cyber visuals, five player forms, ten official levels, practice mode, global leaderboards, accounts, custom workshop levels, and a daily challenge.

Frontend (Canvas + Vite) + Express API + PostgreSQL + Prisma + Socket.io. One process, one Railway project.

![stack](https://img.shields.io/badge/Node-20-00f5ff?style=flat-square) ![stack](https://img.shields.io/badge/Express-TypeScript-ff2bd6?style=flat-square) ![stack](https://img.shields.io/badge/Prisma-PostgreSQL-7b2fff?style=flat-square)

---

## Fitur

### Gameplay
- Auto-runner 2D 60 FPS (`requestAnimationFrame`) + physics 120 Hz
- **5 form:** Cube (lompat), Ship (tahan untuk terbang), Ball (klik = balik gravitasi), Wave (tahan 45°), UFO (tap = flap)
- **10 level resmi** dengan kesulitan 1–10, coin, pad, orb, portal, saw, speed portal
- Practice mode + checkpoint (tombol `C` / klik kanan)
- Instant retry setelah mati (tanpa reload)
- Particle, glow, trail, screen shake, parallax, hit flash
- Ghost replay (bayangan run terbaik)
- Daily challenge (seed harian)
- Custom level editor + publish

### Full-stack
- Guest mode (langsung main, progress di `localStorage`)
- Register / login (JWT + httpOnly cookie + Bearer token)
- Progress online, stars, attempts, coins
- Leaderboard per level + global stars (real-time via Socket.io)
- Profil publik, achievement/medal
- Workshop level (like, play count)
- Rate limit, Helmet, Zod validation, bcrypt
- Admin seed account (opsional)

### Kontrol

| Aksi | Desktop | Mobile |
|---|---|---|
| Jump / aksi | `Space` `W` `↑` / klik | Tap |
| Hold (ship / wave) | Tahan tombol / mouse | Tahan jari |
| Pause | `Esc` | tombol ❚❚ |
| Restart | `R` | overlay Retry |
| Checkpoint (practice) | `C` / klik kanan | — |

---

## Arsitektur

```
browser  ──static──►  Express (satu PORT)
   │                      │
   ├── /api/*  REST       ├── Prisma ──► PostgreSQL
   └── /socket.io         └── seed achievements on boot

client/     Vite + vanilla JS modules + Canvas
server/     Express + TypeScript + Socket.io
prisma/     schema + migration awal
```

Production: Vite me-build `client/dist`, Express menyajikannya. Development: Vite dev server (`:5173`) mem-proxy `/api` ke Express (`:3000`).

---

## Prasyarat

- **Node.js 20+** dan npm 10+
- **PostgreSQL 14+** (lokal, Docker, atau plugin Railway)
- Git

---

## Jalankan secara lokal (step-by-step)

### 1. Clone / masuk folder

```bash
git clone https://github.com/<username>/neon-dash.git
cd neon-dash
```

### 2. Install dependensi

```bash
npm install
```

`postinstall` otomatis menjalankan `prisma generate`.

### 3. Siapkan database

**Opsi A — Docker (paling mudah)**

```bash
docker compose up -d
```

Ini menjalankan Postgres 16 di `localhost:5432` dengan user/password/db `neondash`.

**Opsi B — Postgres yang sudah terpasang**

```sql
CREATE USER neondash WITH PASSWORD 'neondash';
CREATE DATABASE neondash OWNER neondash;
```

### 4. Environment

```bash
cp .env.example .env
```

Default `.env.example` sudah cocok untuk Docker di atas. Ganti `JWT_SECRET` menjadi string acak:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 5. Migrasi + seed

```bash
npx prisma migrate deploy
npm run db:seed
```

Atau, jika ingin sinkron tanpa file migrasi:

```bash
npx prisma db push
npm run db:seed
```

### 6. Dev server (frontend + backend)

```bash
npm run dev
```

- Game (hot reload): **http://localhost:5173**
- API: **http://localhost:3000/api/health**

Buka `5173`, klik di mana saja untuk meng-unlock audio, lalu **PLAY**.

Akun admin default (jika tidak diubah):

- email: `admin@neondash.local`
- password: `changeme-admin`

### 7. Production build lokal

```bash
npm run build
NODE_ENV=production CLIENT_ORIGIN=http://localhost:3000 npm start
```

Buka **http://localhost:3000**.

---

## Push ke GitHub

```bash
git init
git add .
git commit -m "feat: neon dash full-stack release"
git branch -M main
git remote add origin https://github.com/<username>/neon-dash.git
git push -u origin main
```

Jangan commit `.env`. File itu sudah ada di `.gitignore`. Yang di-commit adalah `.env.example`.

---

## Deploy ke Railway (dari nol sampai live)

Railway bisa menjalankan **satu service Node** + **plugin PostgreSQL**. Frontend di-serve oleh Express yang sama.

### 1. Akun & project

1. Buka [https://railway.app](https://railway.app) dan login (GitHub disarankan).
2. **New Project** → **Deploy from GitHub repo** → pilih `neon-dash`.
3. Jika repo belum ada, push dulu (langkah di atas), lalu refresh.

### 2. Tambah PostgreSQL

1. Di project yang sama: **New** → **Database** → **PostgreSQL**.
2. Tunggu status **Available**.
3. Buka service **Node** (bukan Postgres) → tab **Variables**.
4. **Add Reference** / Variable:
   - `DATABASE_URL` = referensi `DATABASE_URL` dari plugin Postgres  
     (Railway biasanya menawarkannya otomatis saat service terhubung.)

   Kalau belum otomatis, buka plugin Postgres → **Variables** → salin `DATABASE_URL` → tempel ke service web.

### 3. Environment variables service web

Set paling tidak:

| Key | Value |
|---|---|
| `DATABASE_URL` | *(dari plugin Postgres)* |
| `JWT_SECRET` | string acak panjang |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `PORT` | biarkan Railway yang set, atau `3000` |
| `ADMIN_EMAIL` | opsional, mis. `you@mail.com` |
| `ADMIN_PASSWORD` | opsional, password kuat |
| `ADMIN_USERNAME` | opsional, `admin` |

`CLIENT_ORIGIN` tidak wajib di production — CORS di-set `origin: true`.

### 4. Build & start

File `package.json`, `railway.toml`, dan `nixpacks.toml` sudah menyiapkan:

- **Build:** `npm install` → `prisma generate` → `npm run build` (Vite + `tsc`)
- **Start:** `npx prisma migrate deploy && node server/dist/index.js`

Di service settings, pastikan:

- **Builder:** Nixpacks (default)
- **Start command** (jika diminta):  
  `npx prisma migrate deploy && node server/dist/index.js`
- **Healthcheck path:** `/api/health`

### 5. Domain publik

1. Service web → **Settings** → **Networking** → **Generate Domain**.
2. Dapat URL seperti `https://neon-dash-production.up.railway.app`.
3. Buka URL itu. Seharusnya splash **NEON DASH** muncul.
4. Cek `https://<domain>/api/health` — `{ "ok": true, "db": "ok" }`.

### 6. Jika build gagal

- Log “Prisma schema not found” → pastikan folder `prisma/` ter-push.
- Log “P1001 database unreachable” → `DATABASE_URL` belum terpasang di service **web**.
- Port binding error → jangan hardcode host `127.0.0.1`. Server sudah `0.0.0.0`.
- Blank page → pastikan `npm run build` menghasilkan `client/dist/index.html`.

### 7. Redeploy

Setiap `git push` ke branch yang terhubung akan me-redeploy. Migrasi baru di `prisma/migrations` ikut dijalankan oleh `prisma migrate deploy`.

---

## API (ringkas)

| Method | Path | Auth | Keterangan |
|---|---|---|---|
| GET | `/api/health` | — | status + db + online |
| GET | `/api/levels` | — | metadata 10 level resmi |
| POST | `/api/auth/register` | — | `{ username, email, password }` |
| POST | `/api/auth/login` | — | `{ login, password }` |
| GET | `/api/auth/me` | JWT | profil sendiri |
| PATCH | `/api/auth/me` | JWT | bio / warna / favorite |
| GET | `/api/progress` | JWT | progress semua level |
| POST | `/api/progress` | JWT | submit run / death / clear |
| GET | `/api/leaderboard/global` | — | ranking stars |
| GET | `/api/leaderboard/:levelId` | opt | top clears + recent |
| GET | `/api/profile/:username` | — | profil publik |
| GET | `/api/achievements` | opt | daftar medal |
| GET | `/api/daily` | — | challenge hari ini |
| GET | `/api/custom` | opt | workshop |
| POST | `/api/custom` | JWT | publish level |
| POST | `/api/custom/:id/like` | JWT | toggle like |
| GET | `/api/admin/stats` | admin | ringkas |

Socket events: `auth`, `join-level`, `leaderboard:update`, `online`.

---

## Skrip npm

| Script | Fungsi |
|---|---|
| `npm run dev` | Vite + server watch |
| `npm run build` | client + server production |
| `npm start` | jalankan server hasil build |
| `npm run db:migrate` | `prisma migrate deploy` |
| `npm run db:push` | sinkron schema tanpa migrasi |
| `npm run db:seed` | achievements + admin |
| `npm run db:studio` | GUI Prisma |

---

## Struktur folder

```
/
├── client/                 # Vite app
│   ├── index.html
│   ├── public/favicon.svg
│   └── src/
│       ├── main.js         # app shell / routing
│       ├── ui.js
│       ├── api.js          # REST + localStorage fallback
│       ├── audio.js        # WebAudio BGM + SFX
│       ├── styles.css
│       └── game/           # engine, player, levels, editor
├── server/src/             # Express + TS
│   ├── index.ts
│   ├── routes/
│   ├── middleware/
│   └── lib/
├── prisma/                 # schema + migration
├── docker-compose.yml      # Postgres lokal
├── railway.toml
├── nixpacks.toml
└── README.md
```

---

## Catatan desain

- **Guest-first.** Game tetap bisa dimainkan tanpa backend. Progress disimpan lokal dan di-sync saat login.
- **Death = instant.** Freeze 0.4s + ledakan particle, lalu state di-reset. Tidak ada loading screen.
- **Juice.** Trail, shake, flash, parallax grid, synth chiptune (tanpa file audio eksternal).
- **Keamanan dasar.** Helmet, CORS, rate limit auth, Zod, bcrypt cost 12, JWT, payload replay dibatasi 4000 titik.

---

## Lisensi

MIT. Buat, modifikasi, deploy, dan pamerkan leaderboard-mu.
