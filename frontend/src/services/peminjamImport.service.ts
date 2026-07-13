// ============================================================
//  Service Import Peminjam dari Excel/CSV (frontend).
// ============================================================

import api from '@/lib/api';
import { downloadBlob } from '@/lib/download';

export interface HasilImportPeminjam {
  akunDitambahkan: number;
  akunDiperbarui: number;
  peminjamanDibuat: number;
  peminjamanDipertahankan: number;
  dilewatiTanpaNup: number;
  detailDitambahkan: { nama: string; nip: string; email: string }[];
  detailDiperbarui: { nama: string; nip: string; perubahan: string[] }[];
  detailPeminjamanDibuat: { nama: string; merk: string | null; nup: string | null; kodeBarang: string }[];
  gagal: number;
  detailGagal: { baris: number; nama: string; pesan: string }[];
  barangTidakDitemukan: number;
  detailBarangTidakDitemukan: { baris: number; nama: string; merk: string | null; nup: string | null; pesan: string }[];
  passwordDefault: string;
}

export const peminjamImportService = {
  async importExcel(file: File): Promise<HasilImportPeminjam> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await api.post('/import-peminjam', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  async unduhTemplate(): Promise<void> {
    const res = await api.get('/import-peminjam/template', { responseType: 'blob' });
    downloadBlob(res.data, 'template-import-peminjam.xlsx');
  },
};
