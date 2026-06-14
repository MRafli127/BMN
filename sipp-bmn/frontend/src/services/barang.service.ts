// ============================================================
//  Service Barang (frontend).
// ============================================================

import api from '@/lib/api';
import type { Barang, FilterBarang, MetaPagination } from '@/types/barang.type';

export interface DataBarangForm {
  nama: string;
  jenis: string;
  jumlahTotal: number | string;
  kondisi: string;
  lokasiPenyimpanan?: string;
  deskripsi?: string;
  foto?: File | null;
}

// Bangun FormData dari objek barang (mendukung upload foto)
function buatFormData(data: DataBarangForm): FormData {
  const fd = new FormData();
  fd.append('nama', data.nama);
  fd.append('jenis', data.jenis);
  fd.append('jumlahTotal', String(data.jumlahTotal));
  fd.append('kondisi', data.kondisi);
  if (data.lokasiPenyimpanan) fd.append('lokasiPenyimpanan', data.lokasiPenyimpanan);
  if (data.deskripsi) fd.append('deskripsi', data.deskripsi);
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
};
