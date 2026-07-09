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

export const userManagementService = {
  // Tambah peminjam baru secara manual (role PEMINJAM, sumber MANUAL).
  async create(data: DataTambahPeminjam): Promise<{ id: string; nama: string; nip: string; email: string }> {
    const res = await api.post('/users', data);
    return res.data.data?.user ?? res.data.data;
  },

  // Update profil peminjam (Nama, NIP, Email, Jabatan, Unit Kerja, Eselon II/III/IV).
  async update(id: string, data: DataEditPeminjam): Promise<void> {
    await api.patch(`/users/${id}`, data);
  },

  // Hapus satu user (peminjam) berdasarkan id.
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

  // Jadikan admin (promote): tambahkan peran ADMIN ke akun.
  async jadikanAdmin(id: string): Promise<void> {
    await api.post(`/users/${id}/roles`, { role: 'ADMIN' });
  },

  // Cabut admin (demote): hapus peran ADMIN dari akun.
  async cabutAdmin(id: string): Promise<void> {
    await api.delete(`/users/${id}/roles/ADMIN`);
  },
};
