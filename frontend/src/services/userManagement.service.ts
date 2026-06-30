// ============================================================
//  Service Manajemen User / Peminjam (frontend).
// ============================================================

import api from '@/lib/api';

// Ringkasan hasil hapus massal peminjam dari backend.
export interface HasilHapusPeminjam {
  dihapus: number; // jumlah yang berhasil dihapus
  dilewati: number; // dilewati karena masih punya peminjaman aktif
}

export const userManagementService = {
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
};
