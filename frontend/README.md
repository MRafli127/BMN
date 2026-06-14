# Frontend SIPP-BMN

Aplikasi web SIPP-BMN berbasis **Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui**.

## Instalasi Cepat

```bash
npm install
cp .env.example .env.local      # PowerShell: Copy-Item .env.example .env.local
npm run dev
```

Aplikasi: **http://localhost:3000** (pastikan backend berjalan di port 5000).

## Variabel Lingkungan (`.env.local`)

| Variabel                  | Keterangan                                      |
| ------------------------- | ----------------------------------------------- |
| `NEXT_PUBLIC_API_URL`     | Base URL API backend (`http://localhost:5000/api`) |
| `NEXT_PUBLIC_BACKEND_URL` | Origin backend untuk file/foto/QR (`http://localhost:5000`) |

## Struktur

```
frontend/src/
├── app/
│   ├── (auth)/             # login, register
│   ├── (dashboard)/        # layout + halaman admin & peminjam (terproteksi)
│   │   ├── admin/          # dashboard, barang, peminjaman, scan
│   │   └── peminjam/       # dashboard, katalog, ajukan, riwayat
│   ├── panduan/            # halaman panduan publik
│   ├── layout.tsx          # root layout + font + Providers
│   ├── providers.tsx       # init sesi + Toaster
│   ├── page.tsx            # beranda publik
│   └── not-found.tsx       # halaman 404
├── components/
│   ├── ui/                 # button, input, card, table, badge, dialog, toast
│   ├── layout/             # Sidebar, Header, JamRealtime, Footer
│   ├── barang/             # KartuBarang, TabelBarang, FormBarang
│   ├── peminjaman/         # FormPeminjaman, KartuStatus, TabelPeminjaman, TimelineStatus
│   ├── qrcode/             # TampilQR, ScannerQR
│   └── shared/             # LoadingSpinner, EmptyState, KonfirmasiDialog
├── lib/                    # api (Axios+refresh), auth (sesi), utils
├── services/               # auth, barang, peminjaman, dashboard
├── store/                  # authStore, uiStore (Zustand)
├── hooks/                  # useAuth, useJamRealtime, useBarang
├── types/ · constants/     # tipe data & konstanta (status, rute)
└── middleware.ts           # proteksi rute berbasis peran (cookie)
```

## Fitur Antarmuka

- **Tema formal instansi** (biru/hijau), modern, bersih, responsif (mobile-friendly).
- **Jam berjalan realtime** di header (format Indonesia, mis. _Sabtu, 13 Juni 2026, 14:30:05 WIB_).
- **Timeline visual** untuk pelacakan status peminjaman.
- **Scan QR** via kamera (html5-qrcode) + input kode manual.
- **Tampilkan/Unduh/Cetak** QR Code peminjaman.
- Notifikasi dengan **react-hot-toast**, validasi form **React Hook Form + Zod**.

## Catatan

- Autentikasi: access token disimpan di `localStorage` (untuk Axios) dan dicerminkan ke cookie agar dapat dibaca `middleware.ts`. Refresh token memakai cookie httpOnly dari backend.
- Pastikan menjalankan backend & seeder lebih dahulu agar dapat login dengan akun default.
