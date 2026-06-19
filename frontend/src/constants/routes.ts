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

  // Admin
  adminDashboard: '/admin/dashboard',
  adminBarang: '/admin/barang',
  adminBarangTambah: '/admin/barang/tambah',
  adminBarangDetail: (id: string) => `/admin/barang/${id}`,
  adminPeminjaman: '/admin/peminjaman',
  adminPeminjamanDetail: (id: string) => `/admin/peminjaman/${id}`,
  adminScan: '/admin/scan',

  // Peminjam
  peminjamDashboard: '/peminjam/dashboard',
  peminjamKatalog: '/peminjam/katalog',
  peminjamKatalogDetail: (id: string) => `/peminjam/katalog/${id}`,
  peminjamKeranjang: '/peminjam/keranjang',
  peminjamAjukan: '/peminjam/ajukan',
  peminjamRiwayat: '/peminjam/riwayat',
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
