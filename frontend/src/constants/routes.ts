// ============================================================
//  Konstanta path rute aplikasi (frontend).
// ============================================================

import type { Role } from '@/types/user.type';
import { RUTE_DEFAULT_PER_ROLE } from './roles';

// Rute yang memerlukan login
export const RUTE_TERPROTEKSI = ['/admin', '/peminjam', '/super-admin'] as const;

// Tujuan default berdasarkan peran
export const RUTE_DEFAULT: Record<Role, string> = RUTE_DEFAULT_PER_ROLE;

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

  // Super Admin
  superAdminDashboard: '/super-admin/dashboard',
  superAdminAdmin: '/super-admin/admin',
  superAdminBarang: '/super-admin/barang',
  superAdminBarangDetail: (id: string) => `/super-admin/barang/${id}`,
  superAdminPengguna: '/super-admin/pengguna',
  superAdminPeminjaman: '/super-admin/peminjaman',
  superAdminPeminjamanDetail: (id: string) => `/super-admin/peminjaman/${id}`,
  superAdminSatker: '/super-admin/satker',
  superAdminLogs: '/super-admin/logs',

  // Admin
  adminDashboard: '/admin/dashboard',
  adminBarang: '/admin/barang',
  // Manajemen Barang dengan filter ketersediaan stok awal (mis. dari kartu dashboard).
  adminBarangStok: (ketersediaan?: string) =>
    ketersediaan ? `/admin/barang?stok=${encodeURIComponent(ketersediaan)}` : '/admin/barang',
  adminBarangTambah: '/admin/barang/tambah',
  adminBarangBulk: '/admin/barang/bulk',
  adminBarangDetail: (id: string) => `/admin/barang/${id}`,
  adminPeminjaman: '/admin/peminjaman',
  // Manajemen Peminjaman dengan filter status awal (mis. dari kartu dashboard).
  // status boleh gabungan dipisah koma, mis. "DISETUJUI,DIPINJAM,TERLAMBAT".
  adminPeminjamanStatus: (status?: string) =>
    status ? `/admin/peminjaman?status=${encodeURIComponent(status)}` : '/admin/peminjaman',
  adminPeminjamanDetail: (id: string) => `/admin/peminjaman/${id}`,
  adminScan: '/admin/scan',
  adminKategori: (kategori: string) => `/admin/dashboard/kategori/${kategori}`,
  adminLogImport: '/admin/import-log',

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
