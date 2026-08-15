// ============================================================
//  Service Manajemen User / Peminjam (frontend).
// ============================================================

import api from '@/lib/api';

// Ringkasan hasil hapus massal peminjam dari backend.
export interface HasilHapusPeminjam {
  dihapus: number; // jumlah yang berhasil dihapus
  dilewati: number; // dilewati karena masih punya peminjaman aktif
}

// Data untuk menambah peminjam (pegawai) secara manual oleh admin.
// Nama, NIP, Email, dan password wajib; sisanya opsional.
export interface DataTambahPeminjam {
  nama: string;
  nip: string;
  email: string;
  password: string;
  jabatan?: string;
  unitKerja?: string;
  eselon2?: string; // Eselon II
  eselon3?: string; // Eselon III
  eselon4?: string; // Eselon IV
}

// Data untuk mengedit profil peminjam (tanpa password — password direset terpisah).
export interface DataEditPeminjam {
  nama?: string;
  nip?: string;
  email?: string;
  jabatan?: string;
  unitKerja?: string;
  eselon2?: string;
  eselon3?: string;
  eselon4?: string;
}

// Response paginated list
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalHalaman: number;
  };
}

// User item dari list
export interface UserItem {
  id: string;
  nama: string;
  nip: string;
  email: string;
  jabatan?: string | null;
  unitKerja?: string | null;
  eselon2?: string | null;
  eselon3?: string | null;
  eselon4?: string | null;
  roles: string[];
  sumber?: string;
  satkerAkses?: string[];
  createdAt?: string;
  updatedAt?: string;
  totalPeminjaman?: number;
}

export const userManagementService = {
  // Ambil daftar user dengan filter (untuk Super Admin)
  async getSemua(params?: {
    q?: string;
    role?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<UserItem>> {
    const res = await api.get('/users', { params });
    return res.data;  // { data, meta }
  },

  // Ambil satu user
  async getById(id: string): Promise<UserItem> {
    const res = await api.get(`/users/${id}`);
    return res.data.data;
  },

  // Tambah user baru (untuk Super Admin)
  async create(data: DataTambahPeminjam & { roles?: string[] }): Promise<{ user: UserItem; passwordDefault?: string }> {
    const res = await api.post('/users', data);
    return res.data.data;
  },

  // Update user
  async update(id: string, data: DataEditPeminjam): Promise<void> {
    await api.patch(`/users/${id}`, data);
  },

  // Hapus satu user
  async remove(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },

  // Hapus banyak peminjam sekaligus berdasarkan ID terpilih (lewati yang aktif).
  async hapusMassal(ids: string[]): Promise<HasilHapusPeminjam> {
    const res = await api.post('/users/peminjam/hapus-massal', { ids });
    return {
      dihapus: res.data.data?.dihapus ?? 0,
      dilewati: res.data.data?.dilewati ?? 0,
    };
  },

  // Tambah role ke user (promote)
  async tambahRole(id: string, role: string): Promise<void> {
    await api.post(`/users/${id}/roles`, { role });
  },

  // Hapus role dari user (demote)
  async hapusRole(id: string, role: string): Promise<void> {
    await api.delete(`/users/${id}/roles/${role}`);
  },

  // Update satker akses (khusus Super Admin)
  async updateSatkerAkses(id: string, satkerList: string[]): Promise<void> {
    await api.patch(`/users/${id}/satker-access`, { satkerAkses: satkerList });
  },

  // Reset password user
  async resetPassword(id: string): Promise<{ passwordBaru: string }> {
    const res = await api.post(`/users/${id}/reset-password`);
    return res.data.data;
  },

  // Statistik user (total, admin, peminjam)
  async getStatistik(): Promise<{ totalUser: number; totalAdmin: number; totalPeminjam: number }> {
    const res = await api.get('/users/statistik');
    return res.data.data;
  },

  // Jadikan admin (promote): tambahkan peran ADMIN ke akun.
  async jadikanAdmin(id: string): Promise<void> {
    await api.post(`/users/${id}/roles`, { role: 'ADMIN' });
  },

  // Cabut admin (demote): hapus peran ADMIN dari akun.
  async cabutAdmin(id: string): Promise<void> {
    await api.delete(`/users/${id}/roles/ADMIN`);
  },
};
