# Dokumentasi SIPP-BMN
# Sistem Informasi Peminjaman & Pengembalian Barang Milik Negara

**Versi:** 1.0.0 | **Tanggal:** 19 Agustus 2026 | **Status:** Final

---

## Daftar Isi

1. [Pendahuluan](#1-pendahuluan)
2. [Gambaran Sistem](#2-gambaran-sistem)
3. [Peran dan Hak Akses](#3-peran-dan-hak-akses)
4. [Fitur Super Admin](#4-fitur-super-admin)
5. [Fitur Administrator](#5-fitur-administrator)
6. [Fitur Peminjam](#6-fitur-peminjam)
7. [Halaman dan Fitur Bersama](#7-halaman-dan-fitur-bersama)
8. [Alur Kerja Peminjaman](#8-alur-kerja-peminjaman)
9. [Entitas Basis Data](#9-entitas-basis-data)
10. [Rute API](#10-rute-api)
11. [Fitur Keamanan](#11-fitur-keamanan)
12. [Fitur Tambahan](#12-fitur-tambahan)
13. [Penjadwalan Otomatis](#13-penjadwalan-otomatis)
14. [Penutup](#14-penutup)

---

## 1. Pendahuluan

### 1.1 Latar Belakang

Perkembangan teknologi informasi di lingkungan instansi pemerintah menuntut adanya sistem yang efisien, transparan, dan akuntabel dalam pengelolaan Barang Milik Negara (BMN). Selama ini, proses peminjaman dan pengembalian barang milik negara masih mengandalkan dokumen fisik dan pencatatan manual yang memiliki berbagai keterbatasan, antara lain:

- Sulitnya menjaga konsistensi data antar unit kerja
- Tidak adanya informasi stok secara *real-time*
- Risiko kehilangan atau kerusakan dokumen
- Sulitnya melakukan pelacakan dan audit terhadap transaksi peminjaman
- Proses persetujuan yang memakan waktu lama karena ketergantungan pada kehadiran fisik pihak yang berwenang

Untuk menjawab tantangan tersebut, dikembangkanlah **SIPP-BMN** (*Sistem Informasi Peminjaman & Pengembalian Barang Milik Negara*), sebuah aplikasi berbasis web yang menyediakan pengelolaan peminjaman dan pengembalian BMN secara *end-to-end*, mulai dari pengajuan oleh peminjam, persetujuan oleh administrator, hingga generasi dokumen resmi berupa Surat Pernyataan Peminjaman dan Surat Pengembalian secara otomatis.

### 1.2 Tujuan Dokumentasi

Dokumentasi ini dirancang untuk:

1. Memberikan gambaran menyeluruh tentang arsitektur dan fitur sistem
2. Menjadi panduan bagi setiap jenis pengguna (*role*) dalam mengoperasikan aplikasi sesuai dengan hak akses masing-masing
3. Mendokumentasikan entitas basis data dan alur kerja utama
4. Memudahkan proses pengembangan, pemeliharaan, dan transisi pengetahuan (*knowledge transfer*) bagi tim teknis
5. Serve sebagai acuan dalam proses pelatihan (*training*) dan *User Acceptance Testing* (UAT)

### 1.3 Ruang Lingkup

Dokumentasi ini mencakup tiga kategori utama:

1. **Fitur dan Halaman** --- daftar lengkap halaman yang tersedia untuk setiap peran pengguna
2. **Alur Kerja** --- penjelasan proses bisnis dari awal pengajuan hingga pengembalian barang
3. **Arsitektur Sistem** --- entitas basis data, teknologi yang digunakan, serta mekanisme keamanan

> Dokumentasi ini **tidak** mencakup panduan instalasi lokal, konfigurasi variabel lingkungan pada level infrastruktur, serta kode sumber program.

---

## 2. Gambaran Sistem

### 2.1 Deskripsi Sistem

SIPP-BMN adalah aplikasi *full-stack* berbasis web yang dirancang untuk mengelola seluruh aspek siklus hidup peminjaman dan pengembalian Barang Milik Negara. Sistem ini menyediakan fungsi-fungsi utama berikut:

| No | Fungsi | Deskripsi |
|----|--------|-----------|
| 1 | Manajemen Katalog Barang | Penambahan, pengeditan, pencarian, dan penyaringan barang BMN berdasarkan kategori, kondisi, lokasi penyimpanan, dan Satuan Kerja (Satker) |
| 2 | Manajemen Peminjaman | Pengajuan, persetujuan, penolakan, penandoveran, dan pengembalian barang dengan pelacakan status secara *real-time* |
| 3 | Manajemen Pengguna | Registrasi, autentikasi, otorisasi berbasis peran (RBAC), dan pengelolaan sesi |
| 4 | Generasi Dokumen Otomatis | Pembuatan Surat Pernyataan Peminjaman dan Surat Pengembalian secara otomatis dengan nomor urut, perangko digital, dan tanda tangan digital |
| 5 | Verifikasi QR Code | Pembangkitan dan pemindaian kode QR untuk verifikasi transaksi pengembalian |
| 6 | Impor dan Ekspor Data | Impor dan ekspor data barang, pegawai, dan peminjaman dalam format Microsoft Excel |
| 7 | Sistem Notifikasi | Pemberitahuan dalam aplikasi kepada pengguna terkait status pengajuan dan jadwal pengembalian |
| 8 | Log Audit | Pencatatan seluruh aktivitas pengguna untuk keperluan audit dan akuntabilitas |

### 2.2 Stack Teknologi

| Lapisan | Teknologi |
|---------|-----------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui (Radix UI), Zustand (state management), Axios, React Hook Form, Zod, date-fns (locale ID), html5-qrcode, lucide-react |
| **Backend** | Node.js, Express.js, Prisma ORM, PostgreSQL, bcryptjs (password hashing), Multer (file upload), Vercel Blob (penyimpanan file), qrcode, pdf-lib (generasi PDF), xlsx (impor/ekspor Excel), Zod (validasi), helmet (keamanan header), express-rate-limit (rate limiting), nodemailer (email), node-cron (penjadwal) |
| **Penyimpanan** | Vercel Blob (foto, QR code, dokumen PDF) |
| **Autentikasi** | JWT Access Token (60 menit) + Refresh Token via httpOnly cookie (7 hari), CSRF Protection (Double Submit Cookie), Token Versioning, Token Blacklisting |

### 2.3 Model Arsitektur

SIPP-BMN mengadopsi arsitektur *client-server* dengan pola RESTful API. Arsitektur ini memisahkan concerns antara frontend dan backend secara jelas, memungkinkan pengembangan dan penskalaan masing-masing secara independen.

```
┌──────────────────────────────────────────────┐
│           Client (Browser)                    │
│         Next.js 14 (React)                    │
└──────────────────┬───────────────────────────┘
                   │ HTTP/REST API (JSON)
┌──────────────────▼───────────────────────────┐
│            API Layer (Express.js)            │
│        Routing, Middleware, Validasi         │
└──────────────────┬───────────────────────────┘
                   │
┌──────────────────▼───────────────────────────┐
│         Business Logic Layer                 │
│         Controller, Service, Workflow         │
└──────────────────┬───────────────────────────┘
                   │
┌──────────────────▼───────────────────────────┐
│       Data Access Layer (Prisma ORM)         │
│            PostgreSQL Database               │
└──────────────────┬───────────────────────────┘
                   │
┌──────────────────▼───────────────────────────┐
│          External Services                    │
│       Vercel Blob, Email Server              │
└──────────────────────────────────────────────┘
```

---

## 3. Peran dan Hak Akses

Sistem SIPP-BMN menerapkan model *Role-Based Access Control* (RBAC) dengan tiga peran utama. Setiap akun dapat memiliki kombinasi peran secara bersamaan (*multi-role*), yang memungkinkan fleksibilitas dalam Pendelegasian tugas.

### 3.1 Daftar Peran

| Kode Peran | Nama | Deskripsi |
|------------|------|-----------|
| `SUPER_ADMIN` | Super Admin | Akses penuh ke seluruh data dan fungsi sistem tanpa batasan Satker. Mampu mengelola akun admin, seluruh barang, seluruh transaksi, seluruh pengguna, seluruh Satker, dan seluruh log. |
| `ADMIN` | Administrator | Mengelola barang untuk Satker yang ditugaskan, menyetujui/menolak/mengembalikan peminjaman di lingkup Satker-nya, mengelola akun peminjam di Satker-nya, serta melihat log aktivitas. |
| `PEMINJAM` | Peminjam | Mengakses katalog barang, menambahkan barang ke keranjang, mengajukan permintaan peminjaman, mengunggah surat pernyataan yang ditandatangani, meminta pengembalian, serta melihat riwayat pribadi. |

### 3.2 Sistem Multi-Peran

Sistem ini mendukung *multi-role assignment*, di mana satu akun dapat memiliki kombinasi peran secara bersamaan.

- **Pemilihan Peran saat Login**: Pengguna dengan beberapa peran akan diminta memilih peran yang ingin digunakan saat masuk ke sistem
- **Pengalihan Peran (*Role Switching*)**: Pengguna dapat beralih antar-peran melalui *header switcher* tanpa harus keluar dan masuk kembali ke sistem
- **Logika Peran Efektif**: Peran `ADMIN` secara otomatis mencakup kemampuan `PEMINJAM`, dan peran `SUPER_ADMIN` mencakup kemampuan `ADMIN` maupun `PEMINJAM`

### 3.3 Matriks Hak Akses

| Fitur | SUPER ADMIN | ADMIN | PEMINJAM |
|-------|:-----------:|:-----:|:--------:|
| **A. Manajemen Pengguna** | | | |
| Mengelola akun Super Admin | ✓ | ✗ | ✗ |
| Mengelola akun Admin | ✓ | ✗ | ✗ |
| Mengelola akun Peminjam | ✓ | ✓ | ✗ |
| Menetapkan akses Satker admin | ✓ | ✗ | ✗ |
| Mengubah informasi profil sendiri | ✓ | ✓ | ✓ |
| Mengubah kata sandi sendiri | ✗ ¹ | ✓ | ✓ |
| **B. Manajemen Barang** | | | |
| Menambah barang | ✓ | ✓ | ✗ |
| Mengedit barang | ✓ | ✓ | ✗ |
| Menghapus barang | ✓ | ✓ | ✗ |
| Impor barang dari Excel | ✓ | ✓ | ✗ |
| Ekspor barang ke Excel | ✓ | ✓ | ✗ |
| Melihat katalog barang | ✓ | ✓ | ✓ |
| **C. Manajemen Peminjaman** | | | |
| Mengajukan peminjaman | ✓ ² | ✓ ² | ✓ |
| Menyetujui peminjaman | ✓ | ✓ | ✗ |
| Menolak peminjaman | ✓ | ✓ | ✗ |
| Menandoveran barang | ✓ | ✓ | ✗ |
| Memproses pengembalian | ✓ | ✓ | ✗ |
| Membuat peminjaman atas nama | ✓ | ✓ | ✗ |
| Melihat seluruh peminjaman | ✓ | ✓ | ✗ |
| Melihat riwayat pribadi | ✓ | ✓ | ✓ |
| Memindai QR Code | ✓ | ✓ | ✗ |
| **D. Manajemen Satker** | | | |
| CRUD Satker | ✓ | ✗ | ✗ |
| **E. Log & Audit** | | | |
| Melihat log audit | ✓ | ✓ | ✗ |
| Melihat riwayat impor | ✓ | ✓ | ✗ |
| **F. Notifikasi** | | | |
| Menerima notifikasi | ✓ | ✓ | ✓ |
| Mengelola notifikasi | ✓ | ✓ | ✓ |
| **G. Lingkup Akses** | | | |
| Akses lintas Satker | ✓ | ✗ | ✗ |
| Akses terbatas pada Satker tugas | ✗ | ✓ | ✗ |
| Akses data pribadi saja | ✗ | ✗ | ✓ |

> ¹ Super Admin dikecualikan dari operasi perubahan kata sandi diri sendiri karena alasan keamanan
> ² Super Admin dan Admin yang memiliki peran `PEMINJAM` juga dapat mengajukan peminjaman

### 3.4 Cakupan Akses Berdasarkan Satker

| Peran | Lingkup Akses |
|-------|--------------|
| **Super Admin** | Akses tanpa batasan Satker (*cross-Satker*). Semua data dari seluruh Satker dapat dilihat dan dikelola. |
| **Admin** | Hanya dapat mengakses dan mengelola data yang terkait dengan Satker yang tercantum dalam kolom `satkerAkses` pada akunnya. |
| **Peminjam** | Hanya dapat melihat dan berinteraksi dengan data barang dan transaksi yang berasal dari Satker yang sama dengan profilnya. |

---

## 4. Fitur Super Admin

**Rute:** `/super-admin/*` | **Lingkup Akses:** Seluruh Satker (tanpa batasan)

### 4.1 Dashboard
**Rute:** `/super-admin/dashboard`

Halaman utama yang menyajikan statistik lintas Satker, meliputi:
- Total jumlah barang keseluruhan
- Rincian stok barang berdasarkan kondisi (Baik, Rusak Ringan, Rusak Berat)
- Jumlah peminjaman berdasarkan status (Menunggu, Disetujui, Aktif/Dipinjam, Terlambat, Selesai)
- Perincian statistik per-Satker
- Visualisasi data dalam bentuk grafik dan diagram

### 4.2 Manajemen Admin
**Rute:** `/super-admin/admin`

Halaman untuk mengelola seluruh akun Administrator, dengan kemampuan:
- **Membuat** akun admin baru
- **Mengaktifkan/Menonaktifkan** akun
- **Mengubah peran** (menaikkan ke Super Admin atau menurunkan ke Peminjam)
- **Menetapkan akses Satker** untuk setiap admin
- **Mereset kata sandi** akun admin

### 4.3 Katalog Barang (Lintas Satker)
**Rute:** `/super-admin/barang` | Detail: `/super-admin/barang/[id]`

Menampilkan seluruh data barang BMN dari semua Satker. Super Admin dapat melihat, mencari, dan menyaring barang berdasarkan kode Satker, kategori barang, kondisi, lokasi penyimpanan, dan kata kunci pencarian.

### 4.4 Manajemen Pengguna (Peminjam)
**Rute:** `/super-admin/pengguna`

Mengelola seluruh akun Peminjam di seluruh Satker, meliputi:
- Melihat daftar pengguna dan informasi profil
- Menonaktifkan atau mengaktifkan akun
- Mereset kata sandi
- Mengelola peran pengguna

### 4.5 Daftar Peminjaman (Lintas Satker)
**Rute:** `/super-admin/peminjaman` | Detail: `/super-admin/peminjaman/[id]`

Tabel lengkap seluruh transaksi peminjaman dari semua Satker dengan fitur:
- Penyaringan (*filter*) berdasarkan status peminjaman
- Pencarian berdasarkan kode transaksi, nama peminjam, atau nama barang
- Navigasi ke halaman detail masing-masing transaksi
- Tindakan massal (*bulk actions*) seperti persetujuan massal, penandoveran massal, dan pengembalian massal

### 4.6 Manajemen Satker
**Rute:** `/super-admin/satker`

Laman untuk melakukan operasi CRUD (*Create, Read, Update, Delete*) terhadap entitas Satker:
- **Membuat** Satker baru dengan mengisi kode unik, nama lengkap, nama singkat, dan status aktif
- **Mengubah** informasi Satker
- **Mengaktifkan/Menonaktifkan** Satker
- **Menghapus** Satker yang tidak diperlukan (dengan validasi tidak ada data terkait)

### 4.7 Log Audit
**Rute:** `/super-admin/logs`

Halaman untuk melihat seluruh riwayat aktivitas pengguna dalam sistem, yang mencakup:
- **Aktivitas yang dicatat**: login/logout, pembuatan data, perubahan data (dengan snapshot data lama dan baru), penghapusan data, perubahan status peminjaman, impor data, dan lain-lain
- **Informasi setiap log**: timestamp kejadian, alamat IP sumber, *user agent* browser, dan pengguna yang melakukan tindakan
- **Penyaringan**: berdasarkan tipe aktivitas, entitas yang terlibat, rentang tanggal, dan pengguna tertentu
- **Statistik**: ringkasan jumlah aktivitas per kategori

---

## 5. Fitur Administrator

**Rute:** `/admin/*` | **Lingkup Akses:** Terbatas pada Satker yang diberikan

### 5.1 Dashboard
**Rute:** `/admin/dashboard`

Halaman utama Administrator yang menampilkan ringkasan statistik berbasis Satker yang dikelolanya:
- Jumlah total barang dan rincian stok
- Jumlah pengajuan yang menunggu persetujuan
- Jumlah peminjaman aktif
- Jumlah barang yang terlambat dikembalikan
- Lima transaksi terakhir
- Visualisasi data dalam bentuk grafik

Navigasi ke detail kategori spesifik tersedia di `/admin/dashboard/kategori/[kategori]` dengan opsi: *barang*, *pengajuan_menunggu*, *peminjaman_aktif*, *barang_terlambat*, dan *peminjam*.

### 5.2 Katalog Barang
**Rute:** `/admin/barang`

Menampilkan daftar barang BMN yang dimiliki oleh Satker Administrator dengan fitur pencarian dan penyaringan berdasarkan kategori, kondisi, lokasi penyimpanan, dan kata kunci.

#### Tambah Barang Tunggal
**Rute:** `/admin/barang/tambah`

Formulir untuk menambahkan satu item barang baru secara manual dengan mengisi seluruh field yang diperlukan.

#### Tambah Barang Massal (Bulk)
**Rute:** `/admin/barang/bulk`

Formulir untuk menambahkan beberapa barang sekaligus secara massal. Sistem secara otomatis menghasilkan nomor NUP (Nomor Urut Barang) yang berurutan sesuai dengan jumlah yang ditentukan oleh pengguna.

#### Detail Barang
**Rute:** `/admin/barang/[id]`

Halaman informasi lengkap satu item barang yang juga menyediakan fungsi *Edit* untuk memperbarui data barang.

### 5.3 Daftar Peminjaman
**Rute:** `/admin/peminjaman` | Detail: `/admin/peminjaman/[id]`

Tabel seluruh transaksi peminjaman di lingkup Satker Administrator dengan fitur *filter* berdasarkan status. Tindakan yang tersedia meliputi:

| Tindakan | Transisi Status | Keterangan |
|----------|-----------------|------------|
| **Persetujuan** | `MENUNGGU` → `DISETUJUI` | Stok dikurangi, QR Code dibangkitkan, notifikasi ke borrower |
| **Penolakan** | `MENUNGGU` → `DITOLAK` | Kunci barang dilepaskan, catatan penolakan dicatat |
| **Penandoveran** | `DISETUJUI` → `DIPINJAM` | Konfirmasi handover fisik barang |
| **Konfirmasi Pengembalian** | `DIPINJAM`/`TERLAMBAT` → `DIKEMBALIKAN` | Stok dipulihkan, surat pengembalian dibangkitkan |
| **Pembuatan atas nama** | - | Admin membuatkan peminjaman untuk borrower |
| **Tindakan massal** | - | Bulk approve, handover, return, delete |

### 5.4 Pemindaian QR Code
**Rute:** `/admin/scan`

Halaman khusus untuk Administrator memindai kode QR pada dokumen Surat Pernyataan Peminjaman borrower. Pemindaian dapat dilakukan melalui:
- **Kamera** perangkat (pemindaian *real-time* menggunakan pustaka *html5-qrcode*)
- **Masukan manual** kode QR jika kamera tidak tersedia

Hasil pemindaian akan langsung menavigasi Administrator ke halaman detail transaksi terkait.

### 5.5 Riwayat Impor
**Rute:** `/admin/import-log`

Halaman yang menampilkan daftar seluruh riwayat operasi impor data Excel yang pernah dilakukan oleh Administrator di Satkernya, disertai statistik rinci: data ditambahkan, diperbarui, dilewati (*skipped*), dan gagal beserta alasannya.

---

## 6. Fitur Peminjam

**Rute:** `/peminjam/*` | **Lingkup Akses:** Data pribadi dan transaksi sendiri

### 6.1 Dashboard
**Rute:** `/peminjam/dashboard`

Halaman utama Borrower yang menyajikan ringkasan pribadi:
- Total jumlah pengajuan peminjaman
- Jumlah peminjaman aktif (*on loan*)
- Jumlah peminjaman yang telah selesai
- Daftar peminjaman aktif terbaru
- Informasi penting terkait batas maksimal peminjaman aktif (maksimal 3 aktif)

### 6.2 Katalog Barang
**Rute:** `/peminjam/katalog` | Detail: `/peminjam/katalog/[id]`

Halaman penjelajahan (*browse*) seluruh barang BMN yang tersedia untuk Satker borrower, dengan fitur:
- Pencarian berdasarkan nama, merk, atau tipe barang
- Penyaringan berdasarkan kategori barang
- Navigasi ke halaman detail barang

### 6.3 Keranjang
**Rute:** `/peminjam/keranjang`

Sistem keranjang belanja (*shopping cart*) yang memungkinkan borrower memilih beberapa barang sebelum mengajukan peminjaman:
- **Penambahan/penghapusan** barang dari keranjang
- **Penyesuaian jumlah** barang yang ingin dipinjam
- **Real-time stock polling**: sistem secara berkala memperbarui informasi stok untuk mencegah pemesanan ganda (*double-booking*) selama sesi keranjang berlangsung
- **Validasi otomatis**: barang yang stoknya tidak tersedia akan ditandai atau dihapus secara otomatis

### 6.4 Pengajuan Peminjaman
**Rute:** `/peminjam/ajukan`

Formulir utama untuk mengajukan permintaan peminjaman dengan dua mode:

#### Mode Konsep (*Draft Mode*)
Borrower dapat menyimpan pengajuan *tanpa* mengunggah Surat Pernyataan yang sudah ditandatangani:
- Item barang dikunci (tidak bisa dipinjam pengguna lain)
- Stock count belum dikurangi
- Pengajuan konsep dapat dilanjutkan dan diselesaikan kapan saja

#### Mode Lengkap
Borrower melengkapi seluruh informasi pengajuan:
- Tanggal rencana pinjam dan tanggal rencana kembali
- Alasan/tujuan peminjaman
- Pangkat dan golongan
- *Upload* Surat Pernyataan yang telah dicetak, ditandatangani, distempel, dan diunggah (PDF/scan)

> Status berubah menjadi `MENUNGGU` dan notifikasi dikirimkan kepada seluruh Administrator.

### 6.5 Riwayat Peminjaman
**Rute:** `/peminjam/riwayat` | Detail: `/peminjam/riwayat/[id]`

Daftar seluruh riwayat pengajuan dan peminjaman borrower secara pribadi dengan fitur *filter* berdasarkan status. Detail setiap transaksi menyediakan:
- **Timeline** lengkap status pengajuan
- **Unduhan Surat Pernyataan** Peminjaman (PDF)
- **Unduhan Surat Pengembalian** (jika sudah dikembalikan)
- **Form ulasan/review** barang setelah pengembalian (`/peminjam/riwayat/[id]/review`)

---

## 7. Halaman dan Fitur Bersama

Seluruh halaman di bawah ini dapat diakses oleh semua peran yang telah *login* ke dalam sistem.

### 7.1 Halaman Publik

| Halaman | Rute | Deskripsi |
|---------|------|-----------|
| Landing Page | `/` | Halaman muka yang menyambut pengunjung dengan informasi singkat sistem dan tombol navigasi |
| Login | `/login` | Halaman autentikasi dengan pilihan peran untuk akun multi-role |
| Registrasi | `/register` | Pendaftaran pengguna baru (menghasilkan akun dengan peran `PEMINJAM` secara default) |
| Panduan | `/panduan` | Panduan penggunaan sistem bagi pengguna akhir |

### 7.2 Pengaturan
**Rute:** `/pengaturan`

Halaman pengelolaan profil pengguna. Informasi yang dapat diubah:
- Nama lengkap, alamat email, NIP, jabatan, unit kerja
- Eselon II, III, dan IV
- Tipe laptop (apabila diperlukan)

> Catatan: `SUPER_ADMIN` dikecualikan dari operasi perubahan kata sandi sendiri karena alasan keamanan.

### 7.3 Notifikasi
**Rute:** `/notifikasi`

Pusat pemberitahuan dalam aplikasi yang menyimpan seluruh notifikasi pengguna. Setiap notifikasi memiliki judul, isi pesan, prioritas (Tinggi/Sedang/Rendah), status (sudah/belum dibaca), dan tautan referensi ke halaman terkait.

### 7.4 Bantuan
**Rute:** `/bantuan`

Halaman bantuan umum yang memuat pertanyaan yang sering diajukan (FAQ), penjelasan alur kerja sistem, dan informasi kontak teknis.

---

## 8. Alur Kerja Peminjaman

### 8.1 Daftar Status Peminjaman

| Status | Alias | Deskripsi |
|--------|-------|-----------|
| `DRAFT` | Konsep | Pengajuan disimpan tanpa surat ditandatangani. Barang dikunci namun stok belum dikurangi. Dapat dilanjutkan kapan saja. |
| `MENUNGGU` | Menunggu | Pengajuan lengkap telah disubmit. Menunggu persetujuan Administrator. |
| `DISETUJUI` | Disetujui | Administrator menyetujui pengajuan. Stok dikurangi, QR Code dibangkitkan. |
| `DITOLAK` | Ditolak | Administrator menolak pengajuan dengan alasan tertentu. |
| `DIPINJAM` | Dipinjam | Barang secara fisik telah handed over kepada borrower. |
| `TERLAMBAT` | Terlambat | Tanggal kembali rencana telah melewati batas tanpa pengembalian. |
| `DIKEMBALIKAN` | Selesai | Barang telah dikembalikan dan diverifikasi oleh Administrator. |

### 8.2 Diagram Alur Status

```
                    ┌──────────────┐
                    │    DRAFT     │
                    └──────┬───────┘
                           │ Submit
                    ┌──────▼───────┐
                    │   MENUNGGU   │
                    └──────┬───────┘
              ┌───────────┼───────────┐
              │ Approve   │ Reject    │
       ┌──────▼──────┐   └─► DITOLAK  │
       │  DISETUJUI  │                │
       └──────┬──────┘                │
              │ Handover             │
       ┌──────▼──────┐               │
       │  DIPINJAM   │               │
       └──────┬──────┘               │
         ┌────┼────┐                 │
         │     │    │                 │
    Return│  Late│Return             │
    ┌─────▼┐ ┌──▼──┐                 │
    │DIKEM-│ │TER- │                 │
    │BALIK-│ │LAMBAT                │
    │KAN   │ └─────┘                 │
    └──────┘                          │
```

### 8.3 Penjelasan Tahapan Proses

#### Tahap 1: Konsep (*Draft*)
Borrower menyusun pengajuan di `/peminjam/ajukan`. Barang dikunci (*soft lock*) namun stok belum dikurangi. Pengajuan dapat diedit, dilengkapi, atau dibatalkan kapan saja.

#### Tahap 2: Pengajuan (*Menunggu*)
Setelah borrower melengkapi informasi dan mengunggah Surat Pernyataan:
- Status berubah menjadi `MENUNGGU`
- Notifikasi dikirim ke seluruh Administrator di Satker terkait
- Pengajuan tidak bisa dibatalkan lagi oleh borrower

#### Tahap 3: Persetujuan / Penolakan

| Hasil | Aksi |
|-------|------|
| **Disetujui** | Stok dikurangi, QR Code dibangkitkan, nomor surat dibuat, notifikasi ke borrower |
| **Ditolak** | Kunci barang dilepaskan, catatan penolakan dicatat, notifikasi ke borrower |

#### Tahap 4: Penandoveran (*Dipinjam*)
Borrower yang pengajuannya disetujui mengambil barang secara fisik. Administrator mengonfirmasi handover.

#### Tahap 5: Pengembalian

1. **Borrower meminta pengembalian**: Borrower mengunggah Surat Pengembalian yang telah ditandatangani
2. **Administrator mengonfirmasi**: Stok dipulihkan, Surat Pengembalian dibangkitkan, borrower dapat memberikan review

### 8.4 Pencegahan Pemesanan Ganda

Sistem menerapkan mekanisme *pessimistic locking*:
- Barang dalam status `DRAFT`, `MENUNGGU`, `DISETUJUI`, `DIPINJAM`, atau `TERLAMBAT` tidak dapat disertakan dalam pengajuan baru
- *Real-time stock polling* pada halaman keranjang memastikan informasi stok terkini
- Setiap operasi pengurangan dan pemulihan stok dilakukan secara *atomik*

### 8.5 Deteksi Terlambat Otomatis

Sistem secara otomatis menandai peminjaman sebagai `TERLAMBAT` ketika `tanggalKembaliRencana` telah dilewati. Deteksi ini di-*throttle* maksimal sekali per menit per *dashboard load*.

### 8.6 Batas Maksimum Peminjaman Aktif

Setiap borrower dibatasi maksimal **3 (tiga) peminjaman aktif** secara bersamaan. Batas ini dapat dikonfigurasi melalui variabel lingkungan `MAX_PEMINJAMAN_AKTIF`.

---

## 9. Entitas Basis Data

Sistem menggunakan **Prisma ORM** dengan basis data **PostgreSQL**. Berikut adalah entitas utama:

### 9.1 ERD Singkat

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Satker     │       │    User      │       │   Barang     │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ kode (PK)    │       │ id (PK)      │       │ kodeBarang   │
│ nama          │       │ nama         │       │   (PK)       │
│ singkat       │       │ nip          │       │ nama         │
│ aktif         │       │ email        │       │ merk         │
└──────────────┘       │ password     │       │ jenis        │
                       │ roles[]      │       │ jumlahTotal  │
                       │ satkerAkses[] │       │ jumlahTersedia│
                       │ satkerId(FK) │       │ kondisi      │
                       └──────┬───────┘       │ kodeSatker(FK)│
                             │               └───────┬───────┘
                             │                       │
                             │               ┌───────▼────────┐
                             │               │ DetailPeminjaman│
                             │               ├────────────────┤
                       ┌─────▼───────────────▼────────┐
                       │        Peminjaman          │
                       ├─────────────────────────────┤
                       │ id (PK)                     │
                       │ kodeTransaksi               │
                       │ userId (FK)                 │
                       │ status                      │
                       │ tanggalPengajuan            │
                       │ tanggalPinjamRencana        │
                       │ tanggalKembaliRencana      │
                       │ tanggalKembaliAktual       │
                       │ disetujuiOleh (FK)         │
                       │ dikembalikanOleh (FK)     │
                       │ qrCodeUrl                   │
                       │ dokumenUrl                  │
                       └─────────────────────────────┘
```

### 9.2 Deskripsi Entitas

#### Satker (Satuan Kerja)

| Atribut | Tipe | Deskripsi |
|---------|------|-----------|
| `kode` | String (PK) | Kode unik Satker |
| `nama` | String | Nama lengkap Satuan Kerja |
| `singkat` | String | Nama singkat/gelar Satker |
| `aktif` | Boolean | Status aktif Satker |

#### User (Pengguna)

| Atribut | Tipe | Deskripsi |
|---------|------|-----------|
| `id` | Int (PK) | ID unik pengguna |
| `nama` | String | Nama lengkap |
| `nip` | String | Nomor Induk Pegawai |
| `email` | String | Alamat email (unik) |
| `password` | String | Hash kata sandi (bcrypt) |
| `jabatan` | String | Jabatan |
| `unitKerja` | String | Unit kerja |
| `eselon2/3/4` | String | Pengelompokan eselon |
| `roles` | Enum[] | Array peran: `[SUPER_ADMIN, ADMIN, PEMINJAM]` |
| `sumber` | Enum | Asal data: `MANUAL` atau `IMPORT` |
| `tokenVersion` | Int | Nomor versi token untuk invalidasi sesi |
| `satkerAkses` | String[] | Kode Satker yang boleh diakses Admin |
| `sessionInvalidatedAt` | DateTime | Timestamp invalidasi sesi |

#### Barang

| Atribut | Tipe | Deskripsi |
|---------|------|-----------|
| `kodeBarang` | String (PK) | Kode unik = `<kodeSatker>-<kodeBarangBmn>-<NUP>` |
| `nama` | String | Nama barang |
| `merk` | String | Merk/type/model |
| `jenis` | Enum | `ELEKTRONIK`, `FURNITUR`, `KENDARAAN`, `ATK`, `LAINNYA` |
| `jumlahTotal` | Int | Total unit barang |
| `jumlahTersedia` | Int | Unit yang tersedia (belum dipinjam) |
| `kondisi` | Enum | `BAIK`, `RUSAK_RINGAN`, `RUSAK_BERAT` |
| `lokasiPenyimpanan` | String | Lokasi penyimpanan |
| `fotoUrl` | String | URL foto di Vercel Blob |
| `kodeSatker` | String (FK) | Kode Satker pemilik |

#### Peminjaman

| Atribut | Tipe | Deskripsi |
|---------|------|-----------|
| `id` | Int (PK) | ID unik transaksi |
| `kodeTransaksi` | String | Kode unik transaksi (unik) |
| `userId` | Int (FK) | ID borrower |
| `status` | Enum | Status saat ini |
| `tanggalPengajuan` | DateTime | Tanggal pengajuan dibuat |
| `tanggalPinjamRencana` | DateTime | Tanggal rencana pinjam |
| `tanggalKembaliRencana` | DateTime | Batas tanggal pengembalian |
| `tanggalKembaliAktual` | DateTime | Tanggal pengembalian sesungguhnya |
| `dokumenUrl` | String | URL Surat Pernyataan |
| `qrCodeUrl` | String | URL QR Code |
| `nomorSurat` | String | Format: `PRN-<no>/BMN/PP.1/<tahun>` |
| `disetujuiOleh` | Int (FK) | ID Admin yang menyetujui |
| `dikembalikanOleh` | Int (FK) | ID Admin yang memproses pengembalian |

#### DetailPeminjaman

| Atribut | Tipe | Deskripsi |
|---------|------|-----------|
| `id` | Int (PK) | ID unik |
| `peminjamanId` | Int (FK) | ID transaksi peminjaman |
| `barangKode` | String | Kode barang (snapshot) |
| `jumlahPinjam` | Int | Jumlah unit yang dipinjam |
| `statusItem` | Enum | `DIPINJAM` atau `DIKEMBALIKAN` |

### 9.3 Entitas Pendukung

| Entitas | Fungsi |
|---------|--------|
| `NomorSuratCounter` | Counter atomik untuk nomor surat per jenis per tahun |
| `Notifikasi` | Pemberitahuan dalam aplikasi per pengguna |
| `AuditLog` | Pencatatan aktivitas dengan snapshot data |
| `ImportLog` | Riwayat operasi impor Excel |
| `BlacklistedToken` | Refresh token yang telah diinvalidasi |

---

## 10. Rute API

Seluruh endpoint API berada di bawah prefix `/api`.

### 10.1 Autentikasi

| Rute | Metode | Akses | Deskripsi |
|------|--------|-------|-----------|
| `/api/auth/login` | POST | Publik | Login pengguna |
| `/api/auth/register` | POST | Publik | Registrasi pengguna |
| `/api/auth/logout` | POST | Auth | Logout |
| `/api/auth/refresh` | POST | Auth | Refresh token |
| `/api/auth/switch-role` | POST | Auth | Ganti peran |
| `/api/auth/me` | GET | Auth | Info user saat ini |
| `/api/auth/password` | PUT | Auth | Ubah kata sandi |
| `/api/auth/csrf-token` | GET | Publik | CSRF token |

### 10.2 Barang

| Rute | Metode | Akses |
|------|--------|-------|
| `/api/barang` | GET | Auth |
| `/api/barang` | POST | Admin+ |
| `/api/barang/[id]` | GET | Auth |
| `/api/barang/[id]` | PUT | Admin+ |
| `/api/barang/[id]` | DELETE | Admin+ |
| `/api/barang/import` | POST | Admin+ |
| `/api/barang/template` | GET | Admin+ |
| `/api/barang/stock` | POST | Auth |
| `/api/barang/merk` | GET | Admin+ |
| `/api/barang/nup-preview` | GET | Admin+ |

### 10.3 Peminjaman

| Rute | Metode | Akses |
|------|--------|-------|
| `/api/peminjaman` | GET | Admin+ |
| `/api/peminjaman` | POST | Auth |
| `/api/peminjaman/bulk` | POST | Admin+ |
| `/api/peminjaman/[id]` | GET | Auth |
| `/api/peminjaman/[id]` | PUT | Auth |
| `/api/peminjaman/[id]` | DELETE | Admin+ |
| `/api/peminjaman/[id]/approve` | POST | Admin+ |
| `/api/peminjaman/[id]/reject` | POST | Admin+ |
| `/api/peminjaman/[id]/handover` | POST | Admin+ |
| `/api/peminjaman/[id]/return` | POST | Admin+ |
| `/api/peminjaman/[id]/pdf` | GET | Auth |
| `/api/peminjaman/[id]/stempel` | POST | Admin+ |
| `/api/peminjaman/[id]/request-return` | POST | Auth |
| `/api/peminjaman/scan` | POST | Admin+ |

### 10.4 Dashboard

| Rute | Metode | Akses |
|------|--------|-------|
| `/api/dashboard` | GET | Admin+ |
| `/api/dashboard/user` | GET | Auth |
| `/api/dashboard/super` | GET | Super |
| `/api/dashboard/kategori` | GET | Admin+ |

### 10.5 Manajemen User

| Rute | Metode | Akses |
|------|--------|-------|
| `/api/users` | GET | Admin+ |
| `/api/users` | POST | Admin+ |
| `/api/users/[id]` | GET | Admin+ |
| `/api/users/[id]` | PUT | Admin+ |
| `/api/users/[id]` | DELETE | Admin+ |
| `/api/users/[id]/reset-password` | POST | Admin+ |
| `/api/users/promote` | POST | Super |

### 10.6 Satker

| Rute | Metode | Akses |
|------|--------|-------|
| `/api/satker` | GET | Admin+ |
| `/api/satker` | POST | Super |
| `/api/satker/[id]` | PUT | Super |
| `/api/satker/[id]` | DELETE | Super |

### 10.7 Notifikasi, Log, Ekspor, Impor

| Grup | Rute | Metode | Akses |
|------|------|--------|-------|
| Notifikasi | `/api/notifikasi` | GET | Auth |
| Notifikasi | `/api/notifikasi/[id]` | PUT | Auth |
| Notifikasi | `/api/notifikasi/[id]` | DELETE | Auth |
| Audit Logs | `/api/audit-logs` | GET | Admin+ |
| Ekspor | `/api/export/barang` | GET | Admin+ |
| Ekspor | `/api/export/peminjaman` | GET | Admin+ |
| Ekspor | `/api/export/users` | GET | Admin+ |
| Impor | `/api/import-log` | GET | Admin+ |
| Impor | `/api/import-pegawai` | POST | Admin+ |
| Impor | `/api/import-peminjam` | POST | Admin+ |

> **Keterangan:**
> - `Auth` = Memerlukan Access Token JWT yang valid
> - `Admin+` = Memerlukan peran `ADMIN` atau `SUPER_ADMIN`
> - `Super` = Memerlukan peran `SUPER_ADMIN`

---

## 11. Fitur Keamanan

### 11.1 Mekanisme Autentikasi

| Mekanisme | Deskripsi |
|-----------|-----------|
| **JWT Access Token** | Berlaku 60 menit, disimpan di memori aplikasi |
| **Refresh Token** | Berlaku 7 hari, disimpan dalam cookie httpOnly (XSS protection) |
| **CSRF Protection** | Double Submit Cookie pattern pada setiap request state-changing |
| **Token Versioning** | Setiap perubahan kata sandi/invalidasi sesi memperbarui versi token |
| **Token Blacklisting** | Refresh token yang di-revoke dicatat dengan timestamp kadaluarsa |
| **Session Invalidation** | Kolom `sessionInvalidatedAt` memungkinkan invalidasi masif seluruh sesi |

### 11.2 Mekanisme Otorisasi

Semua rute API dilindungi oleh *middleware otorisasi* yang:
1. Mengekstrak dan memvalidasi Access Token dari header `Authorization`
2. Memverifikasi peran pengguna terhadap requirement rute
3. Menerapkan *scope checking* berbasis Satker untuk peran `ADMIN`

### 11.3 Proteksi Tambahan

| Proteksi | Implementasi |
|----------|-------------|
| Rate Limiting | `express-rate-limit` --- mencegah brute-force dan DoS |
| Security Headers | `helmet` --- HSTS, X-Frame-Options, CSP, dll. |
| Validasi Input | Zod schema validation pada level controller |
| Validasi File Upload | Multer membatasi tipe file dan ukuran upload |

---

## 12. Fitur Tambahan

### 12.1 Generasi Dokumen Otomatis

#### Surat Pernyataan Peminjaman
Dihasilkan saat Administrator *approve* pengajuan:
- *Header* resmi/letterkop instansi
- Nomor surat format: `PRN-<nomor>/BMN/PP.1/<tahun>`
- Tabel barang yang dipinjam
- Pernyataan kewajiban borrower (6 butir)
- Blok tanda tangan borrower
- QR Code transaksi

#### Surat Pengembalian
Dihasilkan saat Administrator mengonfirmasi pengembalian:
- *Header* resmi
- Nomor surat pengembalian
- Daftar barang yang dikembalikan beserta kondisi
- Catatan pengembalian dari Administrator
- Tanda tangan digital Petugas BMN
- Perangko digital

#### Perangko Digital dan Tanda Tangan Digital
Setelah borrower mengunggah Surat Pernyataan yang telah ditandatangani dan distempel basah secara fisik, Administrator dapat menambahkan perangko digital dan tanda tangan digital ke dokumen menggunakan pustaka *pdf-lib*.

### 12.2 QR Code Verification

Setiap transaksi yang disetujui dibangkitkan QR Code berisi tautan verifikasi:
- Warna biru tua (#1e3a5f) pada latar putih
- Diunggah ke Vercel Blob
- Dapat dipindai menggunakan kamera atau dimasukkan secara manual

### 12.3 Impor dan Ekspor Data

| Jenis | Strategi | Deskripsi |
|-------|----------|-----------|
| **Impor Barang** | Mirror Sync | Barang baru ditambahkan, yang ada diperbarui, yang tidak ada di file dihapus (dengan validasi peminjaman aktif) |
| **Impor Pegawai** | Sync | Data pegawai master untuk seeding/pembaruan akun Peminjam |
| **Impor Peminjaman** | Batch | Migrasi data dari sistem lama (*legacy system*) |
| **Ekspor** | - | Barang, peminjaman, dan pengguna ke format Excel |

### 12.4 Sistem Notifikasi

| Jenis Notifikasi | Penerima | Pemicu |
|-----------------|----------|--------|
| Pengajuan baru | Administrator | Borrower submit pengajuan |
| Status perubahan | Borrower | Admin approve/tolak/request return |
| Reminder pengembalian | Borrower | Beberapa hari sebelum batas tanggal kembali |
| Notifikasi pensiun | Admin & Borrower | Akan pensiun dalam 90 hari ke depan |

---

## 13. Penjadwalan Otomatis

Sistem menjalankan tugas terjadwal secara otomatis menggunakan pustaka *node-cron*:

| Tugas | Jadwal | Deskripsi |
|-------|--------|-----------|
| **Notifikasi Pensiun** | Harian (00:00) | Memeriksa seluruh pengguna dan mengirim notifikasi kepada Administrator dan borrower yang akan pensiun dalam 90 hari. Tanggal pensiun dihitung otomatis dari NIP. |
| **Perhitungan Stok** | Saat diperlukan | Pengurangan dan pemulihan stok barang dilakukan secara atomik setiap kali status peminjaman berubah |
| **Deteksi Terlambat** | Per request | Setiap *dashboard load*, memeriksa apakah ada peminjaman aktif yang telah melewati batas tanggal kembali (*throttled* maksimal sekali per menit) |
| **Hapus Token Kadaluarsa** | Periodik | *Cleanup* otomatis untuk token kadaluarsa pada tabel `BlacklistedToken` |

---

## 14. Penutup

### 14.1 Ringkasan

SIPP-BMN (*Sistem Informasi Peminjaman & Pengembalian Barang Milik Negara*) adalah aplikasi berbasis web yang komprehensif untuk mengelola seluruh siklus hidup peminjaman dan pengembalian Barang Milik Negara.

| Peran | Kapabilitas Utama |
|-------|-----------------|
| **Super Admin** | Akses penuh lintas Satker, pengelolaan admin, seluruh barang, seluruh transaksi, seluruh pengguna, seluruh Satker, dan log audit |
| **Administrator** | Pengelolaan barang di Satker tugas, persetujuan/penolakan peminjaman, penandoveran dan pengembalian barang, pengelolaan peminjam, pemindaian QR Code |
| **Peminjam** | Akses katalog barang, pengajuan peminjaman (termasuk mode konsep), upload surat pernyataan, permintaan pengembalian, pelacakan riwayat pribadi |

Fitur utama meliputi generasi dokumen otomatis dengan perangko dan tanda tangan digital, verifikasi QR Code, impor/ekspor data Excel, pencegahan pemesanan ganda, sistem notifikasi dalam aplikasi, log audit lengkap, penjadwalan otomatis, serta mekanisme keamanan berlapis (JWT, Refresh Token, CSRF Protection, Token Versioning, Rate Limiting, dan Security Headers).

---

## Daftar Singkatan dan Istilah

| Singkatan | Definisi |
|-----------|----------|
| API | Application Programming Interface |
| BMN | Barang Milik Negara (State-Owned Goods) |
| CSRF | Cross-Site Request Forgery |
| CRUD | Create, Read, Update, Delete |
| ERD | Entity Relationship Diagram |
| FK | Foreign Key (Kunci Tamu) |
| HTTP | Hypertext Transfer Protocol |
| JWT | JSON Web Token |
| NIP | Nomor Induk Pegawai (Employee Identification Number) |
| NUP | Nomor Urut (Item Serial Number) |
| ORM | Object-Relational Mapping |
| RBAC | Role-Based Access Control |
| REST | Representational State Transfer |
| Satker | Satuan Kerja (Work Unit / Cost Center) |
| SIPP-BMN | Sistem Informasi Peminjaman & Pengembalian BMN |
| SQL | Structured Query Language |
| UAT | User Acceptance Testing |
| URL | Uniform Resource Locator |
| XSS | Cross-Site Scripting |

---

## Referensi

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma ORM Documentation](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com)
- [JWT - RFC 7519](https://tools.ietf.org/html/rfc7519)
- [NIST Role-Based Access Control](https://csrc.nist.gov/projects/role-based-access-control)
- [pdf-lib: Create and modify PDF documents](https://pdf-lib.js.org)
- [Zod: TypeScript-first schema validation](https://zod.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
