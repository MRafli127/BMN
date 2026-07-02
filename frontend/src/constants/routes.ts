// ============================================================
//  Konstanta path rute aplikasi (frontend).
// ============================================================

export const RUTE = {
  // Publik
  beranda: '/',
  panduan: '/panduan',
  login: '/login',
  register: '/register',

  // Dalam aplikasi (perlu login)
  bantuan: '/bantuan',
  pengaturan: '/pengaturan',
  notifikasi: '/notifikasi',

  // Admin
  adminDashboard: '/admin/dashboard',
  adminBarang: '/admin/barang',
  // Manajemen Barang dengan filter ketersediaan stok awal (mis. dari kartu dashboard).
  adminBarangStok: (ketersediaan?: string) =>
    ketersediaan ? `/admin/barang?stok=${encodeURIComponent(ketersediaan)}` : '/admin/barang',
  adminBarangTambah: '/admin/barang/tambah',
  adminBarangDetail: (id: string) => `/admin/barang/${id}`,
  adminPeminjaman: '/admin/peminjaman',
  // Manajemen Peminjaman dengan filter status awal (mis. dari kartu dashboard).
  // status boleh gabungan dipisah koma, mis. "DISETUJUI,DIPINJAM,TERLAMBAT".
  adminPeminjamanStatus: (status?: string) =>
    status ? `/admin/peminjaman?status=${encodeURIComponent(status)}` : '/admin/peminjaman',
  adminPeminjamanDetail: (id: string) => `/admin/peminjaman/${id}`,
  adminScan: '/admin/scan',
  adminKategori: (kategori: string) => `/admin/dashboard/kategori/${kategori}`,

  // Peminjam
  peminjamDashboard: '/peminjam/dashboard',
  peminjamKatalog: '/peminjam/katalog',
  peminjamKatalogDetail: (id: string) => `/peminjam/katalog/${id}`,
  peminjamKeranjang: '/peminjam/keranjang',
  peminjamAjukan: '/peminjam/ajukan',
  peminjamRiwayat: '/peminjam/riwayat',
  // Riwayat dengan filter status awal (mis. dari kartu ringkasan dashboard).
  peminjamRiwayatStatus: (status?: string) =>
    status ? `/peminjam/riwayat?status=${encodeURIComponent(status)}` : '/peminjam/riwayat',
  peminjamRiwayatDetail: (id: string) => `/peminjam/riwayat/${id}`,
  peminjamRiwayatReview: (id: string) => `/peminjam/riwayat/${id}/review`,
} as const;

// Rute yang memerlukan login
export const RUTE_TERPROTEKSI = ['/admin', '/peminjam'];

// Tujuan default berdasarkan peran
export const RUTE_DEFAULT = {
  ADMIN: RUTE.adminDashboard,
  PEMINJAM: RUTE.peminjamDashboard,
};
