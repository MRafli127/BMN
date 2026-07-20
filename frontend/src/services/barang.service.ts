// ============================================================
//  Service Barang (frontend).
// ============================================================

import api from '@/lib/api';
import { invalidasiCacheDenganNama } from '@/lib/cache';
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

// Data untuk bulk insert barang
export interface DataBarangBulkForm {
  nama: string;
  merk: string;
  jenis: string;
  kondisi: string;
  lokasiPenyimpanan?: string;
  deskripsi?: string;
  kodeSatker: string;
  kodeBarangBmn: string;
  jumlahBarang: number | string;
  foto?: File | null;
}

// Data form single barang
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

// Hasil bulk insert
export interface HasilBulkCreate {
  berhasil: number;
  nupAwal: string;
  nupAkhir: string;
  merkNormalized: string;
}

// Bangun FormData dari objek barang (mendukung upload foto)
function buatFormData(data: Record<string, unknown> | DataBarangForm | DataBarangBulkForm): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      if (value instanceof File) {
        fd.append(key, value);
      } else {
        fd.append(key, String(value));
      }
    }
  }
  return fd;
}

export const barangService = {
  async getSemua(filter: FilterBarang = {}): Promise<{ data: Barang[]; meta: MetaPagination }> {
    const res = await api.get('/barang', { params: filter });
    return { data: res.data.data, meta: res.data.meta };
  },

  // Ambil SELURUH barang yang cocok dengan filter (menelusuri semua halaman).
  // Dipakai oleh tampilan folder agar tiap merk memuat semua unitnya, bukan
  // hanya yang kebetulan berada di satu halaman.
  // OPTIMASI: tanpa include peminjam (lebih cepat untuk katalog)
  async getSemuaLengkap(filter: Omit<FilterBarang, 'page' | 'limit'> = {}, options: { includePeminjam?: boolean } = {}): Promise<Barang[]> {
    const limit = 500; // batas maksimum per halaman di backend (dinaikkan untuk mengurangi request)
    const pertama = await barangService.getSemua({ ...filter, page: 1, limit, includePeminjam: options.includePeminjam });
    const semua = [...pertama.data];
    // Fetch halaman lain secara paralel untuk speed
    if (pertama.meta.totalHalaman > 1) {
      const halamanReqs = [];
      for (let page = 2; page <= pertama.meta.totalHalaman; page++) {
        halamanReqs.push(barangService.getSemua({ ...filter, page, limit, includePeminjam: options.includePeminjam }));
      }
      const hasil = await Promise.all(halamanReqs);
      for (const res of hasil) {
        semua.push(...res.data);
      }
    }
    return semua;
  },

  // Cek stok barang untuk polling cart.
  // Mengembalikan daftar barang yang tidak tersedia lagi (stok habis).
  async cekStokKeranjang(barangIds: string[]): Promise<Barang[]> {
    const res = await api.post('/barang/check-stok', { barangIds });
    return res.data.data;
  },

  async getById(id: string): Promise<Barang> {
    const res = await api.get(`/barang/${id}`);
    return res.data.data;
  },

  async create(data: DataBarangForm): Promise<Barang> {
    const res = await api.post('/barang', buatFormData(data), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    invalidasiCacheDenganNama('barang');
    return res.data.data;
  },

  async update(id: string, data: DataBarangForm): Promise<Barang> {
    const res = await api.put(`/barang/${id}`, buatFormData(data), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    invalidasiCacheDenganNama('barang');
    return res.data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/barang/${id}`);
    invalidasiCacheDenganNama('barang');
  },

  // Bulk insert barang sekaligus (NUP auto-generate)
  async bulkCreate(data: DataBarangBulkForm): Promise<HasilBulkCreate> {
    const res = await api.post('/barang/bulk', buatFormData(data), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    invalidasiCacheDenganNama('barang');
    return res.data.data;
  },

  // Import file Excel/CSV. Backend menyinkronkan database dengan isi file.
  async importExcel(file: File): Promise<HasilImport> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await api.post('/barang/import', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    invalidasiCacheDenganNama('barang');
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
