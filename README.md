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
| Keamanan | helmet, express-rate-limit, CSRF token, compression, cookie-parser, token blacklist, ETag caching      |
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui (Radix UI), Zustand, Axios, React Hook Form, Zod     |
| Lainnya  | date-fns (locale ID), html5-qrcode, react-hot-toast, nextjsToploader, lucide-react, nodemailer, node-cron |

---

---

## 🚀 Menjalankan Program

### Backend

```bash
cd backend
npm install
npm run dev
```

Backend aktif di **http://localhost:5000**.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend aktif di **http://localhost:3000**.

---

## ✨ Fitur Utama

### Autentikasi & Keamanan

- **Multi-role per akun** — satu akun bisa memiliki peran ADMIN, PEMINJAM, dan/atau SUPER_ADMIN. Pengguna bisa switch peran saat login.
- **JWT + Refresh Token** — access token (60 menit) dan refresh token via cookie httpOnly (7 hari).
- **Session tracking** — sistem melacak aktivitas terakhir, timeout otomatis setelah 60 menit tidak aktif.
- **Token versioning** — saat password diubah, seluruh sesi di-invalidasi.
- **CSRF Protection** — Double Submit Cookie pattern untuk semua operasi yang mengubah data.
- **Rate limiting** — pembatasan permintaan pada endpoint sensitif (login, register, refresh, scan QR, ganti password).
- **Token blacklisting** — refresh token di-blacklist saat logout.
- **Validasi input** — Zod + express-validator untuk semua input.

### Manajemen Barang (BMN)

- **Katalog barang lengkap** — pencarian, filter (jenis, kondisi, ketersediaan, kode satker), pagination.
- **Pengelompokan per merk** — tampilan folder per merk barang.
- **Manajemen stok** — `jumlahTotal` vs `jumlahTersedia`, diatur otomatis saat pinjam/kembali.
- **Kode barang natural** — format `kodeSatker-kodeBarangBmn-NUP`, unik peritem.
- **Bulk insert NUP** — generate urutan NUP secara otomatis dalam satu transaksi.
- **Kode barang auto-rebuild** — saat kodeSatker/kodeBarangBmn/NUP berubah, kodeBarang diperbarui.
- **Import Excel barang** — sinkronisasi cermin (tambah/perbarui/hapus). Proteksi barang yang sedang dipinjam tidak bisa dihapus.
- **Export Excel barang** — export data barang lengkap ke Excel.
- **Template download** — template Excel untuk import tersedia unduh.
- **Autocomplete merk** — sugestão merk saat input barang.
- **Tracking sumber** — data MANUAL vs IMPORT.

### Peminjaman & Pengembalian

- **Mode draft** — simpan pengajuan tanpa upload surat, lengkapi kemudian.
- **Keranjang belanja** — pilih barang di katalog, masukkan keranjang, ajukan sekaligus. Polling stok real-time.
- **Validasi double-booking** — barang yang sudah dipinjam (status aktif) tidak bisa dipinjam lagi.
- **Batas peminjaman aktif** — maksimal 3 peminjaman aktif per peminjam (konfigurasi via env).
- **Surat Pernyataan PDF otomatis** — format resmi dengan kop surat, tabel barang, pernyataan kewajiban 6 poin, blok tanda tangan.
- **Nomor surat berurut per tahun** — format `PRN-<nomor>/BMN/PP.1/<tahun>`, reset setiap tahun.
- **Pratinjau surat** — lihat Surat Pernyataan sebelum submit.
- **Upload surat pernyataan** — peminjam upload surat yang sudah ditandatangani (mode draft).
- **Status lifecycle lengkap** — `DRAFT` → `MENUNGGU` → `DISETUJUI` → `DIPINJAM` → `DIKEMBALIKAN` (atau `DITOLAK`, `TERLAMBAT`).
- **Auto deteksi terlambat** — sistem menandai `TERLAMBAT` saat melewati tanggal rencana kembali.
- **Admin buat peminjaman** — admin bisa membuatkan peminjaman untuk peminjam (dengan/saldo mode draft).
- **Aksi massal** — setujui, serahkan, kembalikan, dan hapus banyak peminjaman sekaligus.
- **QR Code** — dibuat otomatis saat persetujuan, bisa discan untuk verifikasi pengembalian.
- **Scan QR** — gunakan kamera atau input kode manual untuk mencari transaksi.
- **Stempel digital** — tempel stempel + tanda tangan digital ke dokumen PDF.
- **Surat Pengembalian PDF** — dibuat otomatis saat pengembalian, tanda tangan oleh Petugas BMN.
- **Catatan pengembalian** — admin bisa tambahkan catatan internal (tidak terlihat peminjam).

### Manajemen Pengguna

- **Multi-role** — satu akun bisa memiliki beberapa peran.
- **Promosi/demosi peran** — tambah atau hapus peran pengguna (admin tidak bisa demote last admin/super_admin).
- **Akses satker** — admin hanya bisa mengelola transaksi untuk satker yang ditugaskan.
- **Reset password** — password direset ke default, dikirim via email, tokenVersion di-increment.
- **Proteksi delete** — tidak bisa hapus akun yang masih punya peminjaman aktif, last admin, atau last super_admin.
- **Bulk delete peminjam** — hapus banyak akun peminjam sekaligus, proteksi yang punya pinjaman aktif.
- **Import pegawai** — sinkronisasi data pegawai dari Excel ke akun peminjam.
- **Import peminjam + pinjaman** — migrasi data peminjam dan peminjaman dari sistem lama.
- **Export Excel pengguna** — export data pengguna lengkap ke Excel.
- **Hitung tanggal pensiun** — dihitung otomatis dari NIP (tanggal lahir tersandi dalam NIP).
- **Notifikasi pensiun** — cron job harian memberitahu admin dan peminjam yang akan pensiun dalam 90 hari.

### Dashboard

- **Dashboard Admin** — statistik (total barang, stok tersedia/habis, pengajuan menunggu, peminjaman aktif, terlambat), grafik ringkasan aktivitas (filter per satker), 5 peminjaman terbaru.
- **Dashboard Super Admin** — statistik silang satker, breakdown per satker (jumlah barang, peminjaman).
- **Dashboard Peminjam** — ringkasan personal (total, aktif, selesai), peminjaman aktif terbaru.
- **Halaman kategori** — data rinci per kategori: semua barang, pengajuan menunggu, peminjaman aktif, barang terlambat, daftar pengguna.

### Notifikasi

- **In-app notification** — notifikasi realtime per pengguna.
- **Tipe notifikasi** — pengajuan baru, disetujui, ditolak, diserahkan, dikembalikan, terlambat, kerusakan, kehilangan, export/import selesai, sistem, pensiun mendekat.
- **Prioritas** — TINGGI, SEDANG, RENDAH.
- **Tandai baca** — baca satu per satu atau semua sekaligus.
- **Hapus notifikasi** — hapus satu atau semua.
- **Email notification** — dikirim saat perubahan status (konfigurasi SMTP).

### Audit Log

- **Pencatatan seluruh aksi** — CREATE, UPDATE, DELETE, STATUS_CHANGE, LOGIN, REGISTER, IMPORT, EXPORT, ROLE_CHANGE, dll.
- **Snapshot data** — menangkap data sebelum/sesudah perubahan dalam JSON.
- **Deskripsi human-readable** — otomatis generate deskripsi aksi dalam Bahasa Indonesia.
- **Filter & statistik** — filter berdasarkan entitas, aksi, user, rentang tanggal. Statistik: total per entitas, top aksi, top user aktif.
- **Metadata request** — IP address dan user agent disimpan.
- **Join-free** — log tetap bisa dibaca meskipun data terkait sudah dihapus (karena snapshot).

### Pencarian

- **Pencarian global** — satu input mencari di barang, peminjaman, dan peminjam secara bersamaan (minimal 2 karakter).
- **Hasil per kategori** — maksimal 5 hasil per kategori.

### Satker (Satuan Kerja)

- **CRUD satker** — tambah, edit, hapus (super admin).
- **Sync dari barang** — generate daftar satker dari data barang yang ada.
- **Akses scoping** — admin hanya melihat/mengelola transaksi satkernya.

### Import & Export

- **Import barang (Excel)** — sinkronisasi cermin: item baru ditambahkan, berubah diperbarui, hilang dihapus (proteksi barang dipinjam).
- **Import pegawai (Excel)** — buat/-update akun peminjam dari master data pegawai.
- **Import peminjam + pinjaman (Excel)** — migrasi akun dan peminjaman dari sistem lama (status langsung DIPINJAM).
- **Template download** — setiap import punya template Excel yang bisa diunduh.
- **Import log** — histori import lengkap dengan statistik (dibuat, diperbarui, dilewati, gagal).
- **Export Excel** — peminjaman, barang, dan pengguna ke Excel.

### PDF & Dokumen

- **Surat Pernyataan Peminjaman** — format resmi BMN dengan kop surat, tabel barang, pernyataan kewajiban, blok tanda tangan.
- **Surat Pengembalian** — format resmi BMN untuk pengembalian.
- **Penomoran surat otomatis** — berurut per tahun, atomically assigned.
- **Stempel digital** — overlay stempel & tanda tangan ke dokumen.
- **QR Code** — generado pada persetujuan, berwarna biru gelap (#1e3a5f) di atas putih.

### Tema & UI

- **Light/Dark mode** — toggle tema, persist ke localStorage.
- **Responsif** — tampilan mobile dengan bottom navigation.
- **Service Worker / PWA** — registrasi service worker untuk pengalaman app-like.
- **Page transition** — animasi transisi antar halaman.
- **Loading state** — skeleton loader dan spinner di seluruh aplikasi.
- **Toast notification** — feedback aksi menggunakan react-hot-toast.
- **Top loader** — progress bar di atas halaman saat loading.

---

## 🔄 Alur Aplikasi

**Peminjaman:** Login → Pilih Barang (Katalog) → Masukkan ke Keranjang → Ajukan (surat pernyataan PDF dibuat otomatis, dapat dipratinjau) → Tunggu Persetujuan → **Disetujui** (stok berkurang + QR Code dibuat) → Admin **Serahkan** barang (DISETUJUI → DIPINJAM).

**Pengembalian:** Peminjam **ajukan pengembalian** dengan mengunggah Surat Pernyataan Pengembalian yang sudah ditandatangani → Admin verifikasi (bisa via **scan QR**) → **Konfirmasi Pengembalian** (stok dikembalikan otomatis). Admin dapat menambah catatan pengembalian internal (tidak terlihat peminjam).

Status: `DRAFT` → `MENUNGGU` → `DISETUJUI` → `DIPINJAM` → `DIKEMBALIKAN` (atau `DITOLAK`, `TERLAMBAT`). Sistem otomatis menandai **TERLAMBAT** bila melewati tanggal rencana kembali.

---

## 🛡️ Keamanan

- Password di-hash dengan **bcrypt**.
- **JWT** access token (singkat) + refresh token via **cookie httpOnly**; logout mem-**blacklist** refresh token, dan `tokenVersion` meng-invalidasi seluruh token saat password diubah.
- **CSRF token** untuk seluruh operasi yang mengubah data.
- **Rate limiting** pada endpoint sensitif (login, register, refresh, ganti password, scan QR).
- **Header keamanan** **helmet** & kompresi **gzip**.
- **ETag caching** — caching cerdas pada GET request dengan user-scoped keys.
- Proteksi rute berdasarkan peran: middleware backend (`authMiddleware`, `roleMiddleware`) **dan** `middleware.ts` di frontend.
- Validasi semua input dengan **Zod**.
- Batasan tipe & ukuran file upload (default maks **5 MB**, PDF/JPG/PNG).
- Penanganan error terpusat dengan format respons API yang konsisten.
- **Session timeout** — otomatis logout setelah 60 menit tidak aktif.

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
| `npm run prisma:generate`| Generate Prisma Client                  |

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
- **Session expired** → secara otomatis logout setelah 60 menit tidak aktif. Login ulang diperlukan.
- **Notifikasi email tidak masuk** → pastikan `EMAIL_ENABLED=true` dan konfigurasi SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) sudah benar.

Detail tambahan ada di `backend/README.md`, `backend/DATABASE.md`, dan `frontend/README.md`.
