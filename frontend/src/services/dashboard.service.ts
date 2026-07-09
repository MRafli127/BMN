// ============================================================
//  Service Dashboard (frontend).
// ============================================================

import api from '@/lib/api';
import type { Peminjaman, StatusPeminjaman } from '@/types/peminjaman.type';
import type { Barang } from '@/types/barang.type';
import type { Role } from '@/types/user.type';

export interface DashboardAdmin {
  statistik: {
    totalBarang: number;
    stokTersedia: number;
    stokHabis: number;
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

// Filter peran untuk daftar peminjam
export type FilterRole = '' | 'ADMIN' | 'NON_ADMIN';

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
  jabatan: string | null; //   Jabatan
  unitKerja: string | null; // Unit Kerja
  eselon2: string | null; //   Eselon II
  eselon3: string | null; //   Eselon III
  eselon4: string | null; //   Eselon IV
  roles: Role[]; //            Peran yang dimiliki akun
  createdAt: string;
}

export interface DashboardFilter {
  dari?: string;
  sampai?: string;
}

export const dashboardService = {
  async admin(filter?: DashboardFilter): Promise<DashboardAdmin> {
    const params = new URLSearchParams();
    if (filter?.dari) params.append('dari', filter.dari);
    if (filter?.sampai) params.append('sampai', filter.sampai);
    const query = params.toString();
    const res = await api.get(`/dashboard/admin${query ? `?${query}` : ''}`);
    return res.data.data;
  },

  async peminjam(): Promise<DashboardPeminjam> {
    const res = await api.get('/dashboard/peminjam');
    return res.data.data;
  },

  async ambilKategori(kategori: KategoriDashboard, page = 1, limit = 10, q = '', role?: FilterRole): Promise<ResponseKategori> {
    const params: Record<string, string | number> = { page, limit };
    if (q.trim()) params.q = q.trim();
    if (role) params.role = role;
    const res = await api.get(`/dashboard/kategori/${kategori}`, { params });
    return res.data.data;
  },
};
