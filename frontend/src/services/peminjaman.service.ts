// ============================================================
//  Service Peminjaman (frontend).
// ============================================================

import api from '@/lib/api';
import type { DataPengajuan, Peminjaman, StatusPeminjaman } from '@/types/peminjaman.type';
import type { MetaPagination } from '@/types/barang.type';

export interface FilterPeminjaman {
  status?: StatusPeminjaman | '';
  q?: string;
  page?: number;
  limit?: number;
}

export interface DataQrcode {
  kodePeminjaman: string;
  qrCodeUrl: string;
  isi: string;
}

export const peminjamanService = {
  async getSemua(filter: FilterPeminjaman = {}): Promise<{ data: Peminjaman[]; meta: MetaPagination }> {
    const res = await api.get('/peminjaman', { params: filter });
    return { data: res.data.data, meta: res.data.meta };
  },

  async getById(id: string): Promise<Peminjaman> {
    const res = await api.get(`/peminjaman/${id}`);
    return res.data.data;
  },

  // Pengajuan peminjaman (multipart: items JSON)
  async create(data: DataPengajuan): Promise<Peminjaman> {
    const fd = new FormData();
    if (data.tanggalPinjamRencana) fd.append('tanggalPinjamRencana', data.tanggalPinjamRencana);
    if (data.tanggalKembaliRencana) fd.append('tanggalKembaliRencana', data.tanggalKembaliRencana);
    fd.append('items', JSON.stringify(data.items));
    fd.append('tandaTangan', data.tandaTangan);

    const res = await api.post('/peminjaman', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  async setujui(id: string, catatanAdmin?: string): Promise<Peminjaman> {
    const res = await api.patch(`/peminjaman/${id}/setujui`, { catatanAdmin });
    return res.data.data;
  },

  async tolak(id: string, catatanAdmin: string): Promise<Peminjaman> {
    const res = await api.patch(`/peminjaman/${id}/tolak`, { catatanAdmin });
    return res.data.data;
  },

  async serahkan(id: string): Promise<Peminjaman> {
    const res = await api.patch(`/peminjaman/${id}/serahkan`);
    return res.data.data;
  },

  // Peminjam mengajukan pengembalian barang (menunggu konfirmasi admin)
  async mintaPengembalian(id: string): Promise<Peminjaman> {
    const res = await api.patch(`/peminjaman/${id}/minta-pengembalian`);
    return res.data.data;
  },

  async kembalikan(id: string): Promise<Peminjaman> {
    const res = await api.patch(`/peminjaman/${id}/kembalikan`);
    return res.data.data;
  },

  async stempel(id: string): Promise<Peminjaman> {
    const res = await api.post(`/peminjaman/${id}/stempel`);
    return res.data.data;
  },

  // Scan QR (admin): cari peminjaman berdasarkan kode
  async scan(kodePeminjaman: string): Promise<Peminjaman> {
    const res = await api.post('/peminjaman/scan', { kodePeminjaman });
    return res.data.data;
  },

  async getQrcode(id: string): Promise<DataQrcode> {
    const res = await api.get(`/peminjaman/${id}/qrcode`);
    return res.data.data;
  },

  // Hapus peminjaman (admin). Stok dikembalikan otomatis bila masih dipinjam.
  async hapus(id: string): Promise<void> {
    await api.delete(`/peminjaman/${id}`);
  },

  // Hapus banyak peminjaman sekaligus (admin). Mengembalikan jumlah terhapus.
  async hapusMassal(ids: string[]): Promise<number> {
    const res = await api.post('/peminjaman/hapus-massal', { ids });
    return res.data.data?.dihapus ?? 0;
  },

  // Setujui banyak pengajuan sekaligus (admin). Mengembalikan ringkasan hasil.
  async setujuiMassal(ids: string[]): Promise<{ disetujui: number; dilewati: number }> {
    const res = await api.post('/peminjaman/setujui-massal', { ids });
    return { disetujui: res.data.data?.disetujui ?? 0, dilewati: res.data.data?.dilewati ?? 0 };
  },
};
