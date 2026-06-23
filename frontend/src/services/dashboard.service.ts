// ============================================================
//  Service Dashboard (frontend).
// ============================================================

import api from '@/lib/api';
import type { Peminjaman, StatusPeminjaman } from '@/types/peminjaman.type';
import type { Barang } from '@/types/barang.type';

export interface DashboardAdmin {
  statistik: {
    totalBarang: number;
    pengajuanMenunggu: number;
    peminjamanAktif: number;
    barangTerlambat: number;
    totalPeminjam: number;
  };
  grafikStatus: { status: StatusPeminjaman; jumlah: number }[];
  peminjamanTerbaru: Peminjaman[];
}

export interface DashboardPeminjam {
  statistik: {
    peminjamanAktif: number;
    menunggu: number;
    dikembalikan: number;
    totalRiwayat: number;
  };
  daftarAktif: Peminjaman[];
  statusTerkini: Peminjaman | null;
}

// Kategori untuk data dashboard
export type KategoriDashboard = 'semua' | 'barang' | 'pengajuan_menunggu' | 'peminjaman_aktif' | 'barang_terlambat' | 'peminjam';

export interface ResponseKategori {
  items: Peminjaman[] | Barang[] | UserList[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalHalaman: number;
  };
}

interface UserList {
  id: string;
  nama: string;
  nip: string;
  email: string;
  unitKerja: string;
  createdAt: string;
}

export const dashboardService = {
  async admin(): Promise<DashboardAdmin> {
    const res = await api.get('/dashboard/admin');
    return res.data.data;
  },

  async peminjam(): Promise<DashboardPeminjam> {
    const res = await api.get('/dashboard/peminjam');
    return res.data.data;
  },

  async ambilKategori(kategori: KategoriDashboard, page = 1, limit = 10): Promise<ResponseKategori> {
    const res = await api.get(`/dashboard/kategori/${kategori}`, { params: { page, limit } });
    return res.data.data;
  },
};
