# SIPP-BMN — Sistem Informasi Peminjaman & Pengembalian Barang Milik Negara

Aplikasi web **fullstack** untuk mengelola peminjaman dan pengembalian Barang Milik Negara (BMN): pengajuan online, persetujuan admin, **stempel/tanda tangan digital** pada dokumen PDF, **QR Code** untuk verifikasi pengembalian, serta **pelacakan status realtime**.

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Node.js + Express + Prisma ORM + PostgreSQL
- **Tanpa Docker.** Seluruh antarmuka & pesan dalam **Bahasa Indonesia**.

---

## 📁 Struktur Proyek

```
sipp-bmn/
├── backend/     # REST API (Express + Prisma)
├── frontend/    # Aplikasi web (Next.js)
└── README.md    # Dokumen ini
```

---

## 🧩 Teknologi

| Bagian   | Teknologi                                                                             |
| -------- | ------------------------------------------------------------------------------------- |
| Backend  | Node.js, Express, Prisma, PostgreSQL, JWT, bcryptjs, Multer, qrcode, pdf-lib, Zod     |
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Zustand, Axios, React Hook Form, Zod |
| Lainnya  | date-fns (locale ID), html5-qrcode, react-hot-toast, lucide-react                     |

---

## ✅ Prasyarat

- **Node.js** v18 atau lebih baru — <https://nodejs.org>
- **PostgreSQL** (salah satu):
  - Install lokal/native — <https://www.postgresql.org/download/>, **atau**
  - Layanan cloud gratis: **Supabase** (<https://supabase.com>) / **Neon** (<https://neon.tech>)

---

## 🚀 Langkah Instalasi (Lengkap)

### 1) Siapkan Database PostgreSQL

**Opsi A — PostgreSQL lokal**

1. Install PostgreSQL, lalu buat database baru:
   ```sql
   CREATE DATABASE sipp_bmn;
   ```
2. Connection string contoh:
   ```
   postgresql://postgres:password@localhost:5432/sipp_bmn?schema=public
   ```

**Opsi B — Supabase / Neon (cloud, gratis)**

1. Buat project baru di Supabase atau Neon.
2. Salin **connection string** dari dashboard (Settings → Database / Connection Details).
3. Tempel ke `DATABASE_URL` pada file `.env` backend.

### 2) Backend

```bash
cd backend

# Install dependency
npm install

# Salin & sesuaikan environment
cp .env.example .env       # Windows (PowerShell): Copy-Item .env.example .env
#  → buka .env, isi DATABASE_URL & secret JWT

# Buat tabel di database (migrasi)
npx prisma migrate dev --name init

# Generate Prisma Client (otomatis terpanggil saat migrate; jalankan bila perlu)
npx prisma generate

# Isi data awal (admin default, peminjam & barang contoh)
npm run seed

# Jalankan server (mode pengembangan, port 5000)
npm run dev
```

Server backend aktif di **http://localhost:5000** (API di `/api`).

### 3) Frontend

Buka terminal **baru**:

```bash
cd frontend

# Install dependency
npm install

# Salin & sesuaikan environment
cp .env.example .env.local   # PowerShell: Copy-Item .env.example .env.local
#  → pastikan NEXT_PUBLIC_API_URL = http://localhost:5000/api

# Jalankan aplikasi (port 3000)
npm run dev
```

Buka **http://localhost:3000** di browser.

---

## 🔑 Akun Default (setelah `npm run seed`)

| Peran    | Email             | Kata Sandi     |
| -------- | ----------------- | -------------- |
| Admin    | admin@bmn.go.id   | `Admin123!`    |
| Peminjam | budi@bmn.go.id    | `Peminjam123!` |
| Peminjam | siti@bmn.go.id    | `Peminjam123!` |

> Akun admin hanya dibuat melalui seeder. Registrasi publik selalu berperan **Peminjam**.

---

## 🔄 Alur Aplikasi

**Peminjaman:** Login → Pilih Barang (Katalog) → Isi Form & Unggah Dokumen → Tunggu Persetujuan → Disetujui (stok berkurang + QR Code dibuat) → Ambil Barang.

**Pengembalian:** Bawa Barang → Tunjukkan QR Code → Admin Scan QR → Konfirmasi Pengembalian (stok dikembalikan otomatis).

Status: `MENUNGGU → DISETUJUI → DIPINJAM → DIKEMBALIKAN` (atau `DITOLAK`). Sistem otomatis menandai **TERLAMBAT** bila melewati tanggal rencana kembali.

---

## 📡 Dokumentasi Endpoint API

Base URL: `http://localhost:5000/api`. Semua respons berformat:

```json
{ "sukses": true, "pesan": "...", "data": {}, "meta": {} }
```

### Autentikasi — `/auth`

| Method | Endpoint         | Akses  | Keterangan                          |
| ------ | ---------------- | ------ | ----------------------------------- |
| POST   | `/auth/register` | Publik | Registrasi peminjam baru            |
| POST   | `/auth/login`    | Publik | Login, mengembalikan token          |
| POST   | `/auth/refresh`  | Publik | Perbarui access token (via cookie)  |
| POST   | `/auth/logout`   | Publik | Hapus cookie refresh token          |
| GET    | `/auth/me`       | Login  | Profil pengguna saat ini            |

### Barang — `/barang`

| Method | Endpoint       | Akses | Keterangan                                          |
| ------ | -------------- | ----- | --------------------------------------------------- |
| GET    | `/barang`      | Login | Daftar barang (query: `q`, `jenis`, `kondisi`, `page`, `limit`) |
| GET    | `/barang/:id`  | Login | Detail barang                                       |
| POST   | `/barang`      | Admin | Tambah barang (multipart, field `foto`)             |
| PUT    | `/barang/:id`  | Admin | Edit barang (multipart, field `foto`)               |
| DELETE | `/barang/:id`  | Admin | Hapus barang                                        |

### Peminjaman — `/peminjaman`

| Method | Endpoint                      | Akses | Keterangan                                        |
| ------ | ----------------------------- | ----- | ------------------------------------------------- |
| GET    | `/peminjaman`                 | Login | Daftar peminjaman (admin: semua; peminjam: miliknya) |
| POST   | `/peminjaman`                 | Login | Ajukan peminjaman (multipart: `items`, `dokumen`) |
| GET    | `/peminjaman/:id`             | Login | Detail peminjaman                                 |
| PATCH  | `/peminjaman/:id/setujui`     | Admin | Setujui → stok berkurang + QR dibuat              |
| PATCH  | `/peminjaman/:id/tolak`       | Admin | Tolak (wajib `catatanAdmin`)                      |
| PATCH  | `/peminjaman/:id/serahkan`    | Admin | Tandai barang diserahkan (DISETUJUI → DIPINJAM)   |
| PATCH  | `/peminjaman/:id/kembalikan`  | Admin | Konfirmasi pengembalian → stok dikembalikan       |
| POST   | `/peminjaman/:id/stempel`     | Admin | Tempel stempel + tanda tangan digital ke PDF      |
| GET    | `/peminjaman/:id/qrcode`      | Login | Ambil URL QR Code peminjaman                      |
| POST   | `/peminjaman/scan`            | Admin | Cari peminjaman via kode (untuk pengembalian)     |

### Dashboard — `/dashboard`

| Method | Endpoint              | Akses | Keterangan                       |
| ------ | --------------------- | ----- | -------------------------------- |
| GET    | `/dashboard/admin`    | Admin | Statistik & grafik ringkasan     |
| GET    | `/dashboard/peminjam` | Login | Ringkasan peminjaman peminjam    |

---

## 🛡️ Keamanan

- Password di-hash dengan **bcrypt**.
- Proteksi rute berdasarkan peran: middleware backend (`authMiddleware`, `roleMiddleware`) **dan** `middleware.ts` di frontend.
- Validasi semua input dengan **Zod**.
- Batasan tipe & ukuran file upload (default maks **5 MB**, PDF/JPG/PNG).
- Penanganan error terpusat dengan format respons API yang konsisten.

---

## 🧪 Perintah Berguna

**Backend**

| Perintah                | Fungsi                                  |
| ----------------------- | --------------------------------------- |
| `npm run dev`           | Jalankan server (nodemon)               |
| `npm start`             | Jalankan server (produksi)              |
| `npm run seed`          | Isi data awal                           |
| `npx prisma studio`     | GUI inspeksi database                   |
| `npx prisma migrate dev`| Buat/terapkan migrasi                   |

**Frontend**

| Perintah        | Fungsi                          |
| --------------- | ------------------------------- |
| `npm run dev`   | Jalankan aplikasi (port 3000)   |
| `npm run build` | Build produksi                  |
| `npm start`     | Jalankan hasil build            |

---

## ❓ Pemecahan Masalah

- **Gagal konek database** → periksa `DATABASE_URL` di `backend/.env`; pastikan PostgreSQL berjalan. Untuk Supabase/Neon, gunakan `?sslmode=require` bila diperlukan.
- **CORS / cookie tidak terkirim** → pastikan `CLIENT_URL` (backend) = `http://localhost:3000` dan `NEXT_PUBLIC_API_URL` (frontend) = `http://localhost:5000/api`.
- **Kamera scan QR tidak muncul** → akses lewat `http://localhost` atau HTTPS, dan izinkan kamera di browser. Tersedia juga input kode manual.
- **Foto/QR tidak tampil** → pastikan `NEXT_PUBLIC_BACKEND_URL` mengarah ke origin backend (`http://localhost:5000`).

Detail tambahan ada di `backend/README.md` dan `frontend/README.md`.
