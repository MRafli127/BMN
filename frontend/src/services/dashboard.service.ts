// ============================================================
//  Service Dashboard (frontend).
// ============================================================

import api from '@/lib/api';
import type { Peminjaman, StatusPeminjaman } from '@/types/peminjaman.type';

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

export const dashboardService = {
  async admin(): Promise<DashboardAdmin> {
    const res = await api.get('/dashboard/admin');
    return res.data.data;
  },

  async peminjam(): Promise<DashboardPeminjam> {
    const res = await api.get('/dashboard/peminjam');
    return res.data.data;
  },
};
