// ============================================================
//  Service Barang (frontend).
// ============================================================

import api from '@/lib/api';
import type { Barang, FilterBarang, MetaPagination } from '@/types/barang.type';

// Hasil proses import (sinkronisasi cermin) dari backend.
export interface HasilImport {
  ditambahkan: number;
  diperbarui: number;
  dihapus: number;
  dilindungi: number;
  gagal: number;
  detailGagal: { baris: number; nama: string; pesan: string }[];
  detailDilindungi: { nama: string; nup: string | null; kodeBarangBmn: string | null }[];
}

export interface DataBarangForm {
  nama: string;
  merk?: string;
  jenis: string;
  jumlahTotal: number | string;
  kondisi: string;
  lokasiPenyimpanan?: string;
  deskripsi?: string;
  // Identitas aset — membentuk kode barang (Kode Satker - Kode Barang - NUP).
  kodeSatker: string;
  kodeBarangBmn: string;
  nup: string;
  foto?: File | null;
}

// Bangun FormData dari objek barang (mendukung upload foto)
function buatFormData(data: DataBarangForm): FormData {
  const fd = new FormData();
  fd.append('nama', data.nama);
  if (data.merk) fd.append('merk', data.merk);
  fd.append('jenis', data.jenis);
  fd.append('jumlahTotal', String(data.jumlahTotal));
  fd.append('kondisi', data.kondisi);
  if (data.lokasiPenyimpanan) fd.append('lokasiPenyimpanan', data.lokasiPenyimpanan);
  if (data.deskripsi) fd.append('deskripsi', data.deskripsi);
  fd.append('kodeSatker', data.kodeSatker);
  fd.append('kodeBarangBmn', data.kodeBarangBmn);
  fd.append('nup', data.nup);
  if (data.foto) fd.append('foto', data.foto);
  return fd;
}

export const barangService = {
  async getSemua(filter: FilterBarang = {}): Promise<{ data: Barang[]; meta: MetaPagination }> {
    const res = await api.get('/barang', { params: filter });
    return { data: res.data.data, meta: res.data.meta };
  },

  async getById(id: string): Promise<Barang> {
    const res = await api.get(`/barang/${id}`);
    return res.data.data;
  },

  async create(data: DataBarangForm): Promise<Barang> {
    const res = await api.post('/barang', buatFormData(data), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  async update(id: string, data: DataBarangForm): Promise<Barang> {
    const res = await api.put(`/barang/${id}`, buatFormData(data), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/barang/${id}`);
  },

  // Import file Excel/CSV. Backend menyinkronkan database dengan isi file.
  async importExcel(file: File): Promise<HasilImport> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await api.post('/barang/import', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  // Unduh template Excel untuk import (memicu unduhan di browser).
  async unduhTemplate(): Promise<void> {
    const res = await api.get('/barang/template', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-import-barang.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
