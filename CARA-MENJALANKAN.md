# 🚀 Cara Menjalankan SIPP-BMN

Panduan langkah demi langkah menjalankan aplikasi **SIPP-BMN** (Sistem Informasi Peminjaman & Pengembalian Barang Milik Negara) di komputer lokal.

> **Stack:** Next.js 14 (frontend) + Express & Prisma (backend) + PostgreSQL.
> Panduan ini ditujukan untuk **Windows / PowerShell**.

---

## ✅ Prasyarat

| Kebutuhan      | Keterangan                                                       |
| -------------- | --------------------------------------------------------------- |
| **Node.js 18+** | Unduh di <https://nodejs.org> — cek dengan `node -v`            |
| **PostgreSQL**  | Lokal (<https://www.postgresql.org/download/>) **atau** cloud gratis: [Supabase](https://supabase.com) / [Neon](https://neon.tech) |
| **Git**         | Untuk clone repo (opsional bila sudah punya folder)            |

---

## 📥 Software yang Perlu Diinstall

Pasang **3 program** ini di komputer (sekali saja):

### 1. Node.js (wajib) — sudah termasuk `npm` & `npx`

- **Unduh:** <https://nodejs.org> → pilih versi **LTS** (18 atau lebih baru)
- Saat instalasi, biarkan opsi default (centang "Add to PATH").
- **Verifikasi** di PowerShell:
  ```powershell
  node -v     # contoh: v20.11.0
  npm -v      # contoh: 10.2.4
  ```

### 2. PostgreSQL (wajib — pilih SALAH SATU)

- **Opsi A — Install lokal:** <https://www.postgresql.org/download/windows/>
  Saat instalasi, **ingat password** untuk user `postgres` (dipakai di `DATABASE_URL`).
  Verifikasi: buka aplikasi **pgAdmin** atau jalankan `psql --version`.
- **Opsi B — Cloud gratis (tanpa install):** daftar di [Supabase](https://supabase.com) atau [Neon](https://neon.tech), lalu salin connection string-nya. Cocok kalau tidak mau ribet install database.

### 3. Git (wajib bila clone dari GitHub)

- **Unduh:** <https://git-scm.com/download/win>
- **Verifikasi:**
  ```powershell
  git --version
  ```

> 💡 **Library/dependency aplikasi** (Express, Prisma, Next.js, dll.) **tidak perlu diinstall manual** — semuanya otomatis terpasang lewat `npm install` di langkah 2 & 3 di bawah.

### Ringkasan perintah instalasi dependency

Setelah ketiga software di atas terpasang, cukup jalankan ini untuk memasang semua kebutuhan aplikasi:

```powershell
# Dependency backend
cd backend
npm install

# Dependency frontend
cd ../frontend
npm install
```

---

## 📂 Struktur Proyek

```
Project/
├── backend/     # REST API (Express + Prisma)  → port 5000
├── frontend/    # Aplikasi web (Next.js)        → port 3000
└── CARA-MENJALANKAN.md
```

Aplikasi terdiri dari **dua bagian** yang dijalankan **bersamaan** di **dua terminal terpisah**.

---

## 1️⃣ Siapkan Database

**Opsi A — PostgreSQL lokal:**

```sql
CREATE DATABASE sipp_bmn;
```

Connection string contoh:
```
postgresql://postgres:password@localhost:5432/sipp_bmn?schema=public
```

**Opsi B — Supabase / Neon (cloud, gratis):**
Buat project baru, lalu salin **connection string** dari dashboard untuk ditempel ke `DATABASE_URL`.

---

## 2️⃣ Jalankan Backend

Buka terminal **pertama**:

```powershell
cd backend

# Install dependency (otomatis menjalankan `prisma generate`)
npm install

# Siapkan file environment
Copy-Item .env.example .env
#  → buka .env, isi DATABASE_URL dan JWT secret
#  → (opsional) isi BLOB_READ_WRITE_TOKEN bila pakai Vercel Blob untuk upload file

# Buat tabel di database
npx prisma migrate dev --name init

# Isi data awal (admin default, peminjam & barang contoh)
npm run seed

# Jalankan server (mode pengembangan, auto-reload)
npm run dev
```

✅ Backend aktif di **http://localhost:5000** (API di `/api`).

---

## 3️⃣ Jalankan Frontend

Buka terminal **kedua** (biarkan terminal backend tetap berjalan):

```powershell
cd frontend

# Install dependency
npm install

# Siapkan file environment
Copy-Item .env.example .env.local
#  → pastikan NEXT_PUBLIC_API_URL = http://localhost:5000/api
#  → pastikan NEXT_PUBLIC_BACKEND_URL = http://localhost:5000

# Jalankan aplikasi
npm run dev
```

✅ Buka **http://localhost:3000** di browser.

---

## 🔑 Akun Default (setelah `npm run seed`)

| Peran    | Email             | Kata Sandi     |
| -------- | ----------------- | -------------- |
| Admin    | `admin@bmn.go.id` | `Admin123!`    |
| Peminjam | `budi@bmn.go.id`  | `Peminjam123!` |
| Peminjam | `siti@bmn.go.id`  | `Peminjam123!` |

> Akun admin hanya dibuat lewat seeder. Registrasi publik selalu berperan **Peminjam**.

---

## 🧪 Perintah Berguna

**Backend** (`cd backend`)

| Perintah                  | Fungsi                          |
| ------------------------- | ------------------------------- |
| `npm run dev`             | Jalankan server (nodemon)       |
| `npm start`               | Jalankan server (produksi)      |
| `npm run seed`            | Isi ulang data awal             |
| `npx prisma studio`       | GUI inspeksi database           |
| `npx prisma migrate dev`  | Buat/terapkan migrasi           |
| `npx prisma generate`     | Generate ulang Prisma Client    |

**Frontend** (`cd frontend`)

| Perintah        | Fungsi                        |
| --------------- | ----------------------------- |
| `npm run dev`   | Jalankan aplikasi (port 3000) |
| `npm run build` | Build produksi                |
| `npm start`     | Jalankan hasil build          |
| `npm run lint`  | Cek linting                   |

---

## ❓ Pemecahan Masalah

| Masalah | Solusi |
| ------- | ------ |
| **Gagal konek database** | Periksa `DATABASE_URL` di `backend/.env`; pastikan PostgreSQL berjalan. Untuk Supabase/Neon tambahkan `?sslmode=require` bila perlu. |
| **CORS / cookie tidak terkirim** | Pastikan `CLIENT_URL` (backend) = `http://localhost:3000` dan `NEXT_PUBLIC_API_URL` (frontend) = `http://localhost:5000/api`. |
| **Foto / QR tidak tampil** | Pastikan `NEXT_PUBLIC_BACKEND_URL` = `http://localhost:5000`. |
| **Kamera scan QR tidak muncul** | Akses lewat `http://localhost` atau HTTPS dan izinkan kamera di browser (tersedia juga input kode manual). |
| **`nodemon` tidak auto-reload di Windows** | Restart manual dengan mengetik `rs` lalu Enter di terminal backend. |
| **Port 3000/5000 sudah dipakai** | Hentikan proses lain, atau ubah `PORT` di `.env` (backend) / `-p` di script `dev` (frontend). |

---

> 📖 Dokumentasi lengkap (endpoint API, alur aplikasi, keamanan) ada di [README.md](README.md).
