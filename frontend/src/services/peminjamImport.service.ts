// ============================================================
//  Service Import Peminjam dari Excel/CSV (frontend).
// ============================================================

import api from '@/lib/api';

export interface HasilImportPeminjam {
  akunDitambahkan: number;
  akunDiperbarui: number;
  akunDihapus: number;
  akunDilindungi: number;
  peminjamanDibuat: number;
  peminjamanDipertahankan: number;
  gagal: number;
  detailGagal: { baris: number; nama: string; pesan: string }[];
  barangTidakDitemukan: number;
  detailBarangTidakDitemukan: { baris: number; nama: string; nup: string | null; pesan: string }[];
  detailDilindungi: { nama: string; nip: string }[];
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
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-import-peminjam.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
