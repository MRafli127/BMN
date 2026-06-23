# Backend SIPP-BMN

REST API untuk Sistem Informasi Peminjaman & Pengembalian Barang Milik Negara.
**Node.js + Express + Prisma + PostgreSQL.**

## Instalasi Cepat

```bash
npm install
cp .env.example .env            # PowerShell: Copy-Item .env.example .env
# Sesuaikan DATABASE_URL & JWT secret di .env
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Server: **http://localhost:5000** · API: **/api**

## Variabel Lingkungan (`.env`)

| Variabel                | Keterangan                                            |
| ----------------------- | ----------------------------------------------------- |
| `PORT`                  | Port server (default 5000)                            |
| `CLIENT_URL`            | Origin frontend untuk CORS (`http://localhost:3000`)  |
| `APP_URL`               | Origin backend untuk URL file (`http://localhost:5000`)|
| `DATABASE_URL`          | Connection string PostgreSQL (lokal/Supabase/Neon)    |
| `JWT_ACCESS_SECRET`     | Secret access token                                   |
| `JWT_REFRESH_SECRET`    | Secret refresh token                                  |
| `JWT_ACCESS_EXPIRES_IN` | Masa berlaku access token (default `15m`)             |
| `JWT_REFRESH_EXPIRES_IN`| Masa berlaku refresh token (default `7d`)             |
| `MAX_FILE_SIZE_MB`      | Batas ukuran file upload (default 5)                  |
| `ADMIN_*`               | Data admin default untuk seeder                       |

### Contoh `DATABASE_URL`

```bash
# Lokal
postgresql://postgres:password@localhost:5432/sipp_bmn?schema=public
# Supabase
postgresql://postgres.xxxx:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
# Neon
postgresql://user:password@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

## Struktur

```
backend/
├── prisma/
│   ├── schema.prisma      # 4 model: User, Barang, Peminjaman, DetailPeminjaman
│   └── seed.js            # data awal (admin, peminjam, barang)
├── src/
│   ├── config/            # database, env, multer
│   ├── controllers/       # auth, barang, peminjaman, stempel, qrcode, dashboard
│   ├── services/          # logika bisnis (termasuk $transaction stok)
│   ├── routes/            # definisi endpoint
│   ├── middleware/        # auth, role, upload, validate, error
│   ├── validators/        # skema Zod
│   ├── utils/             # generateKode, formatTanggal, apiResponse, hashPassword, logger
│   ├── app.js             # konfigurasi Express
│   └── server.js          # titik masuk
└── uploads/               # dokumen, stempel, qrcode, foto-barang (dibuat runtime)
```

## Catatan Teknis

- **Transaksi stok:** persetujuan & pengembalian peminjaman memakai `prisma.$transaction` agar stok tidak pernah minus.
- **Kode otomatis:** Barang `BMN-<tahun>-0001`. Peminjaman memakai kode aset barang yang dipinjam (`kodeSatker-kodeBarangBmn-NUP`), bukan generator sendiri — satu pengajuan dibatasi 1 barang.
- **Stempel digital:** `pdf-lib` membubuhkan cap "DISETUJUI" + tanda tangan. Jika ada file `assets/stempel.png`, gambar tersebut ikut ditempel; jika tidak, stempel digambar secara vektor.
- **QR Code:** disimpan sebagai PNG di `uploads/qrcode`, berisi `kodePeminjaman`, peminjam, barang, status, tanggal.
- **File statis:** diakses di `http://localhost:5000/uploads/...`.

Dokumentasi endpoint lengkap ada di `../README.md`.
