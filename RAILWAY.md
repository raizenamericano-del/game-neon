# Deploy Railway — yang harus kamu lakukan

Build kemarin **sudah sukses**. Yang gagal hanya healthcheck, karena start command lama:

```
npx prisma migrate deploy && node server/dist/index.js
```

Tanpa Postgres / `DATABASE_URL`, `migrate` gagal → Node **tidak pernah nyala** → Railway tulis `service unavailable`.

## Urutan yang benar

1. Push / upload zip hasil perbaikan ini.
2. Deploy **dulu** sampai status **Online** (hijau). Game sudah bisa dimainkan (guest).
3. Baru tambah database + env.
4. Redeploy sekali.

## Env yang ditambahkan SETELAH service hijau

Di service **web** (bukan plugin Postgres):

| Key | Isi |
|---|---|
| `DATABASE_URL` | **Variable Reference** dari plugin PostgreSQL → `DATABASE_URL` |
| `JWT_SECRET` | string acak panjang |
| `NODE_ENV` | `production` |
| `ADMIN_EMAIL` | opsional |
| `ADMIN_PASSWORD` | opsional |

Jangan isi `DATABASE_URL` dengan `localhost`.

## Cek live

- `https://<domain>/api/health` → `{"ok":true,...}`
- `https://<domain>/` → splash NEON DASH

Kalau builder masih Nixpacks: Settings → Build → Builder = **Dockerfile**, atau biarkan Nixpacks (start command sudah `node server/dist/index.js`).
