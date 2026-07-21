# SIPP-BMN — Sistem Informasi Peminjaman & Pengembalian Barang Milik Negara

Aplikasi web **fullstack** untuk mengelola peminjaman dan pengembalian Barang Milik Negara (BMN): pengajuan online, persetujuan admin, **surat pernyataan PDF otomatis** (dengan penomoran surat berurut per tahun), **stempel & tanda tangan digital** pada dokumen, **QR Code** untuk verifikasi, **import data dari Excel** (barang, peminjam, pegawai), **notifikasi**, **audit log**, serta **pelacakan status realtime**.

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Node.js + Express + Prisma ORM + PostgreSQL
- **Penyimpanan file:** Vercel Blob (foto barang, QR, dokumen PDF)
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

| Bagian   | Teknologi                                                                                             |
| -------- | ---------------------------------------------------------------------------------------------------- |
| Backend  | Node.js, Express, Prisma, PostgreSQL, JWT, bcryptjs, Multer, Vercel Blob, qrcode, pdf-lib, xlsx, Zod |
| Keamanan | helmet, express-rate-limit, CSRF token, compression, cookie-parser, token blacklist                  |
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui (Radix UI), Zustand, Axios, React Hook Form, Zod     |
| Lainnya  | date-fns (locale ID), html5-qrcode, react-hot-toast, nextjs-toploader, lucide-react, nodemailer      |

---

## ✅ Prasyarat

- **Node.js** v18 atau lebih baru — <https://nodejs.org>
- **PostgreSQL** (salah satu):
  - Install lokal/native — <https://www.postgresql.org/download/>, **atau**
  - Layanan cloud gratis: **Supabase** (<https://supabase.com>) / **Neon** (<https://neon.tech>)
- **Vercel Blob** (untuk penyimpanan file) — buat Blob Storage di dashboard Vercel, salin `BLOB_READ_WRITE_TOKEN`.

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

# Install dependency (otomatis menjalankan `prisma generate`)
npm install

# Salin & sesuaikan environment
cp .env.example .env       # Windows (PowerShell): Copy-Item .env.example .env
#  → buka .env, isi DATABASE_URL & BLOB_READ_WRITE_TOKEN
#    (secret JWT dibuat otomatis saat server pertama kali dijalankan)

# Buat tabel di database (migrasi)
npx prisma migrate dev --name init

# Isi data awal (admin default, peminjam & barang contoh)
npm run seed

# Jalankan server (mode pengembangan, port 5000)
npm run dev
```

Server backend aktif di **http://localhost:5000** (API di `/api`).

> **Catatan JWT:** `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET` dibuat otomatis saat server pertama kali dijalankan dan tetap sampai di-reset manual (`node -r ./src/config/env.js reset-secrets`).

### 3) Frontend

Buka terminal **baru**:

```bash
cd frontend

# Install dependency
npm install

# Salin & sesuaikan environment
cp .env.example .env.local   # PowerShell: Copy-Item .env.example .env.local
#  → pastikan NEXT_PUBLIC_API_URL = http://localhost:5000/api
#    dan NEXT_PUBLIC_BACKEND_URL = http://localhost:5000

# Jalankan aplikasi (port 3000)
npm run dev
```

Buka **http://localhost:3000** di browser.

---

## 🔑 Akun Default (setelah `npm run seed`)

| Peran    | Email                | Kata Sandi     |
| -------- | -------------------- | -------------- |
| Admin    | admin@bmn.go.id      | `Admin123!`    |
| Peminjam | budi@bmn.go.id       | `Peminjam123!` |
| Peminjam | siti@bmn.go.id       | `Peminjam123!` |

> Akun admin hanya dibuat melalui seeder. Registrasi publik selalu berperan **Peminjam**.
> Registrasi wajib mengisi **Nama, NIP, Email, dan Kata Sandi**. Kata sandi minimal 8 karakter dengan huruf besar, huruf kecil, angka, dan karakter spesial.

---

## 🔄 Alur Aplikasi

**Peminjaman:** Login → Pilih Barang (Katalog) → Masukkan ke Keranjang → Ajukan (surat pernyataan PDF dibuat otomatis, dapat dipratinjau) → Tunggu Persetujuan → **Disetujui** (stok berkurang + QR Code dibuat) → Admin **Serahkan** barang (DISETUJUI → DIPINJAM).

**Pengembalian:** Peminjam **ajukan pengembalian** dengan mengunggah Surat Pernyataan Pengembalian yang sudah ditandatangani → Admin verifikasi (bisa via **scan QR**) → **Konfirmasi Pengembalian** (stok dikembalikan otomatis). Admin dapat menambah catatan pengembalian internal (tidak terlihat peminjam).

Status: `MENUNGGU → DISETUJUI → DIPINJAM → DIKEMBALIKAN` (atau `DITOLAK`). Sistem otomatis menandai **TERLAMBAT** bila melewati tanggal rencana kembali.

Admin juga dapat melakukan **aksi massal**: setujui, serahkan, kembalikan, dan hapus banyak peminjaman sekaligus.

---

## ✨ Fitur Utama

- **Katalog & keranjang barang** dengan pencarian, filter (jenis/kondisi), dan pagination.
- **Surat Pernyataan PDF otomatis** (peminjaman & pengembalian) dengan **penomoran surat berurut per tahun** (`PRN-<no>/BMN/PP.1/<tahun>`) — otomatis reset tiap ganti tahun.
- **Stempel & tanda tangan digital** ditempel ke PDF oleh admin.
- **QR Code** per transaksi untuk verifikasi pengembalian (scan kamera atau input kode manual).
- **Import Excel**: data barang (register BMN), peminjam aktif, dan master data pegawai — masing-masing dengan template unduhan & sinkronisasi (tambah/perbarui/hapus) untuk data ber-sumber IMPORT.
- **Export Excel**: peminjaman, barang, dan pengguna.
- **Manajemen pengguna** (admin): buat, edit, reset password, hapus (termasuk hapus massal peminjam).
- **Notifikasi** in-app dengan prioritas & penanda sudah/belum dibaca.
- **Audit log**: pencatatan seluruh aksi (CREATE/UPDATE/DELETE/STATUS_CHANGE/LOGIN, dll).
- **Dashboard** terpisah untuk admin (statistik & grafik) dan peminjam (ringkasan).

---

## 📡 Dokumentasi Endpoint API

Base URL: `http://localhost:5000/api`. Semua respons berformat:

```json
{ "sukses": true, "pesan": "...", "data": {}, "meta": {} }
```

> Endpoint yang mengubah data (POST/PATCH/PUT/DELETE) memerlukan **CSRF token** — ambil lebih dulu via `GET /auth/csrf-token`.

### Autentikasi — `/auth`

| Method | Endpoint            | Akses  | Keterangan                          |
| ------ | ------------------- | ------ | ----------------------------------- |
| POST   | `/auth/register`    | Publik | Registrasi peminjam baru            |
| POST   | `/auth/login`       | Publik | Login, mengembalikan token          |
| POST   | `/auth/refresh`     | Publik | Perbarui access token (via cookie)  |
| GET    | `/auth/csrf-token`  | Publik | Ambil CSRF token                    |
| POST   | `/auth/logout`      | Login  | Hapus & blacklist refresh token     |
| GET    | `/auth/me`          | Login  | Profil pengguna saat ini            |
| PATCH  | `/auth/me`          | Login  | Perbarui data diri                  |
| PATCH  | `/auth/me/password` | Login  | Ganti kata sandi                    |

### Barang — `/barang`

| Method | Endpoint            | Akses | Keterangan                                                     |
| ------ | ------------------- | ----- | ------------------------------------------------------------- |
| GET    | `/barang`           | Login | Daftar barang (query: `q`, `jenis`, `kondisi`, `page`, `limit`) |
| GET    | `/barang/:id`       | Login | Detail barang                                                 |
| GET    | `/barang/template`  | Admin | Unduh template Excel import barang                            |
| POST   | `/barang/import`    | Admin | Import barang dari Excel                                      |
| POST   | `/barang`           | Admin | Tambah barang (multipart, field `foto`)                       |
| PUT    | `/barang/:id`       | Admin | Edit barang (multipart, field `foto`)                         |
| DELETE | `/barang/:id`       | Admin | Hapus barang                                                  |

### Peminjaman — `/peminjaman`

| Method | Endpoint                              | Akses | Keterangan                                            |
| ------ | ------------------------------------- | ----- | ---------------------------------------------------- |
| GET    | `/peminjaman`                         | Login | Daftar Pegawaian (admin: semua; peminjam: miliknya) |
| POST   | `/peminjaman`                         | Login | Ajukan peminjaman (multipart: `items`, `dokumen`)    |
| POST   | `/peminjaman/preview-surat`           | Login | Pratinjau Surat Pernyataan Peminjaman (PDF)          |
| GET    | `/peminjaman/:id`                     | Login | Detail peminjaman                                    |
| PATCH  | `/peminjaman/:id/setujui`             | Admin | Setujui → stok berkurang + QR dibuat                 |
| PATCH  | `/peminjaman/:id/tolak`               | Admin | Tolak (wajib `catatanAdmin`)                         |
| PATCH  | `/peminjaman/:id/serahkan`            | Admin | Tandai barang diserahkan (DISETUJUI → DIPINJAM)      |
| PATCH  | `/peminjaman/:id/minta-pengembalian`  | Login | Peminjam ajukan pengembalian (unggah surat `dokumen`) |
| GET    | `/peminjaman/:id/surat-pengembalian`  | Login | Unduh Surat Pernyataan Pengembalian (PDF)            |
| PATCH  | `/peminjaman/:id/kembalikan`          | Admin | Konfirmasi pengembalian → stok dikembalikan          |
| POST   | `/peminjaman/:id/stempel`             | Admin | Tempel stempel + tanda tangan digital ke PDF         |
| DELETE | `/peminjaman/:id`                     | Admin | Hapus peminjaman                                     |
| GET    | `/peminjaman/:id/qrcode`              | Login | Ambil URL QR Code peminjaman                         |
| POST   | `/peminjaman/scan`                    | Admin | Cari peminjaman via kode (untuk pengembalian)        |
| POST   | `/peminjaman/setujui-massal`          | Admin | Setujui banyak peminjaman sekaligus                  |
| POST   | `/peminjaman/serahkan-massal`         | Admin | Serahkan banyak peminjaman sekaligus                 |
| POST   | `/peminjaman/kembalikan-massal`       | Admin | Kembalikan banyak peminjaman sekaligus               |
| POST   | `/peminjaman/hapus-massal`            | Admin | Hapus banyak peminjaman sekaligus                    |

### Dashboard — `/dashboard`

| Method | Endpoint                        | Akses | Keterangan                       |
| ------ | ------------------------------- | ----- | -------------------------------- |
| GET    | `/dashboard/admin`              | Admin | Statistik & grafik ringkasan     |
| GET    | `/dashboard/peminjam`           | Login | Ringkasan peminjaman peminjam    |
| GET    | `/dashboard/kategori/:kategori` | Admin | Data rinci per kategori          |

### Manajemen Pengguna — `/users` *(khusus Admin)*

| Method | Endpoint                       | Keterangan                              |
| ------ | ------------------------------ | --------------------------------------- |
| GET    | `/users`                       | Daftar pengguna (filter & pagination)   |
| GET    | `/users/statistik`             | Statistik pengguna                      |
| POST   | `/users`                       | Buat pengguna baru                      |
| GET    | `/users/:id`                   | Detail pengguna                         |
| PATCH  | `/users/:id`                   | Edit pengguna                           |
| POST   | `/users/:id/reset-password`    | Reset kata sandi pengguna               |
| DELETE | `/users/:id`                   | Hapus pengguna                          |
| POST   | `/users/peminjam/hapus-massal` | Hapus banyak peminjam sekaligus         |

### Import Data *(khusus Admin)*

| Method | Endpoint                    | Keterangan                                          |
| ------ | --------------------------- | -------------------------------------------------- |
| GET    | `/import-peminjam/template` | Template Excel peminjam aktif                       |
| POST   | `/import-peminjam`          | Import peminjam + peminjaman aktif dari Excel       |
| GET    | `/import-pegawai/template`  | Template Excel master pegawai                       |
| POST   | `/import-pegawai`           | Import/sinkron data diri pegawai dari Excel         |

### Export, Audit Log & Notifikasi

| Method | Endpoint                       | Akses | Keterangan                              |
| ------ | ------------------------------ | ----- | --------------------------------------- |
| GET    | `/export/peminjaman`           | Admin | Export peminjaman (Excel)               |
| GET    | `/export/barang`               | Admin | Export barang (Excel)                   |
| GET    | `/export/users`                | Admin | Export pengguna (Excel)                 |
| GET    | `/audit-logs`                  | Admin | Daftar audit log (filter & pagination)  |
| GET    | `/audit-logs/statistik`        | Admin | Statistik audit log                     |
| GET    | `/audit-logs/:id`              | Admin | Detail audit log                        |
| GET    | `/notifications`               | Login | Daftar notifikasi                       |
| GET    | `/notifications/belum-baca`    | Login | Jumlah notifikasi belum dibaca          |
| PATCH  | `/notifications/:id/baca`      | Login | Tandai satu notifikasi sudah dibaca     |
| PATCH  | `/notifications/baca-semua`    | Login | Tandai semua notifikasi sudah dibaca    |
| DELETE | `/notifications/:id`           | Login | Hapus satu notifikasi                   |
| DELETE | `/notifications`               | Login | Hapus semua notifikasi                  |

---

## 🛡️ Keamanan

- Password di-hash dengan **bcrypt**.
- **JWT** access token (singkat) + refresh token via **cookie httpOnly**; logout mem-**blacklist** refresh token, dan `tokenVersion` meng-invalidasi seluruh token saat password diubah.
- **CSRF token** untuk seluruh operasi yang mengubah data.
- **Rate limiting** pada endpoint sensitif (login, register, refresh, ganti password).
- Header keamanan **helmet** & kompresi **gzip**.
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
| `npm run prisma:studio` | GUI inspeksi database                   |
| `npm run prisma:migrate`| Buat/terapkan migrasi                   |
| `npm run prisma:generate`| Generate Prisma Client                 |

**Frontend**

| Perintah        | Fungsi                          |
| --------------- | ------------------------------- |
| `npm run dev`   | Jalankan aplikasi (port 3000)   |
| `npm run build` | Build produksi                  |
| `npm start`     | Jalankan hasil build            |
| `npm run lint`  | Jalankan ESLint                 |

---

## ☁️ Deploy ke Vercel

Backend & frontend dapat di-deploy di **Vercel** (lihat `backend/vercel.json`). Pastikan pada environment produksi:

- `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, dan `CLIENT_URL`/`APP_URL` diisi sesuai domain produksi.
- `NEXT_PUBLIC_API_URL` & `NEXT_PUBLIC_BACKEND_URL` (frontend) mengarah ke origin backend produksi.

---

## ❓ Pemecahan Masalah

- **Gagal konek database** → periksa `DATABASE_URL` di `backend/.env`; pastikan PostgreSQL berjalan. Untuk Supabase/Neon, gunakan `?sslmode=require` bila diperlukan.
- **CORS / cookie tidak terkirim** → pastikan `CLIENT_URL` (backend) = `http://localhost:3000` dan `NEXT_PUBLIC_API_URL` (frontend) = `http://localhost:5000/api`.
- **Error 403 / CSRF** → ambil token lewat `GET /auth/csrf-token` sebelum mengirim request yang mengubah data.
- **Kamera scan QR tidak muncul** → akses lewat `http://localhost` atau HTTPS, dan izinkan kamera di browser. Tersedia juga input kode manual.
- **Foto/QR/dokumen tidak tampil** → pastikan `NEXT_PUBLIC_BACKEND_URL` mengarah ke origin backend (`http://localhost:5000`) dan `BLOB_READ_WRITE_TOKEN` valid.

Detail tambahan ada di `backend/README.md`, `backend/DATABASE.md`, dan `frontend/README.md`.
