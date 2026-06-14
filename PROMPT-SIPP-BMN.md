# PROMPT LENGKAP: Sistem Informasi Peminjaman & Pengembalian BMN (SIPP-BMN)

> Prompt final siap tempel ke AI coding assistant untuk membangun aplikasi web fullstack peminjaman & pengembalian Barang Milik Negara.

---

Buatkan aplikasi web **fullstack** lengkap dan production-ready untuk **Sistem Informasi Peminjaman dan Pengembalian Barang Milik Negara (SIPP-BMN)**. Gunakan **Next.js 14 (App Router) + TypeScript** untuk frontend dan **Node.js + Express** untuk backend, dengan database **PostgreSQL** menggunakan **Prisma ORM**. Seluruh antarmuka, komentar kode, dan pesan error menggunakan **bahasa Indonesia yang baik dan mudah dimengerti**. **JANGAN gunakan Docker.** Kerjakan secara bertahap dan terstruktur sesuai struktur folder yang saya berikan di bawah.

## A. Teknologi yang Digunakan

**Backend:**

- Node.js + Express (REST API)
- Prisma ORM + PostgreSQL
- JWT (access token + refresh token) untuk autentikasi
- bcrypt untuk hashing password
- Multer untuk upload file (dokumen & foto)
- library `qrcode` untuk generate QR Code
- library `pdf-lib` untuk menempel stempel/tanda tangan digital ke PDF
- `zod` untuk validasi input
- `date-fns` (locale Indonesia) untuk format tanggal

**Frontend:**

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Zustand untuk state management
- Axios untuk panggilan API
- React Hook Form + Zod untuk validasi form
- `html5-qrcode` untuk scan QR Code
- `react-hot-toast` untuk notifikasi
- `date-fns` (locale Indonesia)

**Database PostgreSQL — tanpa Docker:**

Sertakan instruksi untuk dua opsi: (1) install PostgreSQL secara lokal/native, atau (2) menghubungkan ke layanan cloud gratis **Supabase** atau **Neon** melalui `DATABASE_URL`. Sertakan contoh format connection string di `.env.example`.

## B. Skema Database (Prisma)

Buat 4 model:

**1. User**

- `id` (UUID), `nama`, `nip` (unik), `email` (unik), `password` (hashed), `jabatan`, `unitKerja`, `role` (enum: `ADMIN`, `PEMINJAM`), `createdAt`, `updatedAt`

**2. Barang**

- `id` (UUID), `kodeBarang` (unik, format `BMN-2026-0001`), `nama`, `jenis` (enum: Elektronik, Furnitur, Kendaraan, ATK, Lainnya), `jumlahTotal`, `jumlahTersedia`, `kondisi` (enum: Baik, Rusak Ringan, Rusak Berat), `lokasiPenyimpanan`, `deskripsi`, `fotoUrl`, `createdAt`, `updatedAt`

**3. Peminjaman**

- `id` (UUID), `kodePeminjaman` (unik, format `PJM-2026-0001`), `userId` (relasi peminjam), `tanggalPengajuan`, `tanggalPinjamRencana`, `tanggalKembaliRencana`, `tanggalKembaliAktual`, `status` (enum: `MENUNGGU`, `DISETUJUI`, `DITOLAK`, `DIPINJAM`, `DIKEMBALIKAN`, `TERLAMBAT`), `alasanPeminjaman`, `dokumenUrl`, `dokumenStempelUrl`, `qrCodeUrl`, `catatanAdmin`, `disetujuiOleh` (relasi admin), `createdAt`, `updatedAt`

**4. DetailPeminjaman** (relasi barang ↔ peminjaman)

- `id`, `peminjamanId`, `barangId`, `jumlahPinjam`, `statusItem`

Gunakan transaksi Prisma (`$transaction`) untuk operasi yang mengubah stok agar stok tidak pernah minus.

## C. Fitur & Alur Lengkap

### 1. Autentikasi (Role-Based Access Control)

- Halaman Login & Registrasi (registrasi hanya untuk peminjam; admin dibuat lewat seeder)
- Middleware: `authMiddleware` (verifikasi token) & `roleMiddleware('ADMIN')`
- Seeder membuat 1 akun admin default + beberapa data barang & user contoh

### 2. Akun ADMIN

**Dashboard:** total barang, peminjaman aktif, pengajuan menunggu, barang terlambat, grafik ringkasan.

**Manajemen Barang (CRUD):** tambah (kode unik auto-generate), edit, hapus, lihat detail, upload foto; tabel dengan pencarian, filter, dan pagination.

**Manajemen Peminjaman:**

- Lihat semua pengajuan + filter status
- Lihat dokumen yang diunggah peminjam
- Tombol **SETUJUI (ACC)** dan **TOLAK** (wajib isi catatan saat menolak)
- Saat disetujui: stok berkurang otomatis + QR Code di-generate
- **Cap/Stempel Digital:** tempel gambar stempel + tanda tangan ke dokumen PDF menggunakan `pdf-lib`, simpan sebagai `dokumenStempelUrl`, bisa diunduh
- Konfirmasi pengembalian (stok dikembalikan otomatis)

### 3. Akun PEMINJAM/KARYAWAN

**Dashboard:** peminjaman aktif, riwayat, status terkini.

- **Katalog Barang:** kartu barang dengan foto, stok, status ketersediaan
- **Ajukan Peminjaman:** pilih barang + jumlah, isi tanggal pinjam & rencana kembali, alasan, dan **unggah dokumen peminjaman** (PDF/gambar)
- **Lacak Status** real-time via timeline visual
- Unduh dokumen yang sudah distempel admin
- Lihat, unduh & cetak QR Code peminjaman

### 4. Sistem QR Code

- Saat peminjaman DISETUJUI, generate QR Code unik berisi: `kodePeminjaman`, nama barang, nama peminjam, status, tanggal
- QR tampil di detail peminjaman & dapat diunduh/dicetak
- **Halaman Scan QR (pengembalian):** admin scan QR → tampilkan detail → tombol **"Konfirmasi Barang Dikembalikan"** → status & stok diperbarui otomatis

### 5. Tanggal & Waktu Realtime

- Semua timestamp format Indonesia lengkap: **`Sabtu, 13 Juni 2026, 14:30 WIB`** (date-fns locale `id`)
- Komponen **jam berjalan realtime** di header (update tiap detik)
- Deteksi otomatis status **TERLAMBAT** jika melewati tanggal rencana kembali

### 6. Halaman Panduan (publik)

- Langkah peminjaman (step-by-step bernomor + ikon): Login → Pilih Barang → Isi Form & Unggah Dokumen → Tunggu Persetujuan → Ambil Barang + QR Code
- Langkah pengembalian: Bawa Barang → Tunjukkan QR Code → Admin Scan → Selesai
- FAQ dengan accordion
- Tampilan visual menarik (timeline)

## D. Endpoint API (REST)

Sertakan lengkap, minimal:

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/refresh`
- `GET/POST /api/barang`, `GET/PUT/DELETE /api/barang/:id`
- `GET/POST /api/peminjaman`, `GET /api/peminjaman/:id`
- `PATCH /api/peminjaman/:id/setujui`, `PATCH /api/peminjaman/:id/tolak`
- `POST /api/peminjaman/:id/stempel`, `PATCH /api/peminjaman/:id/kembalikan`
- `GET /api/peminjaman/:id/qrcode`, `POST /api/peminjaman/scan`
- `GET /api/dashboard/admin`, `GET /api/dashboard/peminjam`

## E. Struktur Folder & File

Ikuti struktur ini secara konsisten:

```
sipp-bmn/
├── backend/
├── frontend/
└── README.md
```

### Backend

```
backend/
├── prisma/
│   ├── schema.prisma
│   ├── seed.js
│   └── migrations/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── env.js
│   │   └── multer.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── barang.controller.js
│   │   ├── peminjaman.controller.js
│   │   ├── stempel.controller.js
│   │   ├── qrcode.controller.js
│   │   └── dashboard.controller.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── barang.service.js
│   │   ├── peminjaman.service.js
│   │   ├── stempel.service.js
│   │   └── qrcode.service.js
│   ├── routes/
│   │   ├── index.js
│   │   ├── auth.routes.js
│   │   ├── barang.routes.js
│   │   ├── peminjaman.routes.js
│   │   ├── qrcode.routes.js
│   │   └── dashboard.routes.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── role.middleware.js
│   │   ├── upload.middleware.js
│   │   ├── validate.middleware.js
│   │   └── error.middleware.js
│   ├── validators/
│   │   ├── auth.validator.js
│   │   ├── barang.validator.js
│   │   └── peminjaman.validator.js
│   ├── utils/
│   │   ├── generateKode.js
│   │   ├── formatTanggal.js
│   │   ├── apiResponse.js
│   │   ├── hashPassword.js
│   │   └── logger.js
│   ├── app.js
│   └── server.js
├── uploads/
│   ├── dokumen/
│   ├── stempel/
│   ├── qrcode/
│   └── foto-barang/
├── .env
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

### Frontend

```
frontend/
├── public/
│   ├── images/
│   │   ├── logo.png
│   │   └── ilustrasi-panduan/
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── admin/
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   ├── barang/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── tambah/page.tsx
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   ├── peminjaman/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   └── scan/page.tsx
│   │   │   └── peminjam/
│   │   │       ├── dashboard/page.tsx
│   │   │       ├── katalog/page.tsx
│   │   │       ├── ajukan/page.tsx
│   │   │       └── riwayat/
│   │   │           ├── page.tsx
│   │   │           └── [id]/page.tsx
│   │   ├── panduan/page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── table.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── toast.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── JamRealtime.tsx
│   │   │   └── Footer.tsx
│   │   ├── barang/
│   │   │   ├── KartuBarang.tsx
│   │   │   ├── TabelBarang.tsx
│   │   │   └── FormBarang.tsx
│   │   ├── peminjaman/
│   │   │   ├── FormPeminjaman.tsx
│   │   │   ├── KartuStatus.tsx
│   │   │   ├── TabelPeminjaman.tsx
│   │   │   └── TimelineStatus.tsx
│   │   ├── qrcode/
│   │   │   ├── TampilQR.tsx
│   │   │   └── ScannerQR.tsx
│   │   └── shared/
│   │       ├── LoadingSpinner.tsx
│   │       ├── EmptyState.tsx
│   │       └── KonfirmasiDialog.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   └── utils.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── barang.service.ts
│   │   ├── peminjaman.service.ts
│   │   └── dashboard.service.ts
│   ├── store/
│   │   ├── authStore.ts
│   │   └── uiStore.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useJamRealtime.ts
│   │   └── useBarang.ts
│   ├── types/
│   │   ├── user.type.ts
│   │   ├── barang.type.ts
│   │   └── peminjaman.type.ts
│   ├── constants/
│   │   ├── status.ts
│   │   └── routes.ts
│   └── middleware.ts
├── .env.local
├── .env.example
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

## F. Keamanan

- Hash password dengan bcrypt
- Proteksi route berdasarkan peran (backend middleware + frontend `middleware.ts`)
- Validasi semua input dengan Zod
- Batasi tipe & ukuran file upload
- Penanganan error terpusat dengan format respons API konsisten

## G. Output yang Diharapkan

1. Kode **backend lengkap** untuk setiap file sesuai struktur
2. Kode **frontend lengkap** untuk setiap file sesuai struktur
3. File `.env.example` untuk backend & frontend (termasuk contoh `DATABASE_URL` Supabase/Neon)
4. **Dokumentasi instalasi langkah demi langkah:** `npm install`, setup `.env`, `npx prisma migrate dev`, menjalankan seeder, menjalankan dev server (backend & frontend)
5. **Dokumentasi endpoint API** dalam bentuk tabel
6. Komentar kode dalam **bahasa Indonesia** di bagian penting
7. Desain UI **modern, bersih, responsif (mobile-friendly)**, tema warna formal instansi pemerintah (biru/hijau)

## H. Urutan Pengerjaan

Kerjakan bertahap agar runtut:

1. **Backend:** schema Prisma → config → utils → middleware → validators → services → controllers → routes → seeder → app.js & server.js
2. **Frontend:** types → constants → lib & services → store → hooks → components → pages
3. **Terakhir:** README & dokumentasi instalasi

Jika kode terlalu panjang untuk satu respons, lanjutkan secara bertahap dan beri tahu bagian mana yang sedang dikerjakan. Pastikan semua kode konsisten dan dapat langsung dijalankan.
