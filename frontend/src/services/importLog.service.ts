// ============================================================
//  Service untuk Import Log API
// ============================================================

import api from '@/lib/api';

export interface DetailItem {
  nama: string;
  nip?: string;
  email?: string;
  merk?: string;
  nup?: string;
  kodeBarang?: string;
  perubahan?: string[];
  baris?: number;
  pesan?: string;
}

export interface ImportLog {
  id: string;
  userId: string;
  userEmail: string;
  userNama: string;
  jenisImport: 'PEMINJAM' | 'BARANG' | 'PEGAWAI';
  namaFile: string;
  jumlahBaris: number;
  akunDitambahkan: number;
  akunDiperbarui: number;
  peminjamanDibuat: number;
  peminjamanDipertahankan: number;
  dilewatiTanpaNup: number;
  gagal: number;
  barangTidakDitemukan: number;
  detailDitambahkan: { data: DetailItem[] };
  detailDiperbarui: { data: DetailItem[] };
  detailPeminjaman: { data: DetailItem[] };
  detailGagal: { data: DetailItem[] };
  detailBarangTidakDitemukan: { data: DetailItem[] };
  createdAt: string;
}

export interface ImportLogResponse {
  data: ImportLog[];
  meta: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface StatistikImport {
  totalImport: number;
  totalAkunDitambahkan: number;
  totalAkunDiperbarui: number;
  totalPeminjamanDibuat: number;
  totalGagal: number;
}

export async function ambilSemuaLog(page = 1, limit = 10): Promise<{ data: ImportLog[]; meta: ImportLogResponse['meta'] }> {
  const res = await api.get('/import-logs', { params: { page, limit } });
  return res.data;
}

export async function ambilLogById(id: string): Promise<ImportLog> {
  const res = await api.get(`/import-logs/${id}`);
  return res.data.data;
}

export async function hapusLog(id: string): Promise<void> {
  await api.delete(`/import-logs/${id}`);
}

export async function ambilStatistikImport(): Promise<StatistikImport> {
  const res = await api.get('/import-logs/statistik');
  return res.data.data;
}
