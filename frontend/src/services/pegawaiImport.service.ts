// ============================================================
//  Service Import Data Pegawai (Daftar Pegawai) — frontend.
//  Mengisi & menyinkronkan data diri peminjam dari file master
//  pegawai; membuat akun baru bila NIP belum terdaftar.
// ============================================================

import api from '@/lib/api';
import { downloadBlob } from '@/lib/download';

export interface HasilImportPegawai {
  ditambahkan: number; // akun peminjam baru yang dibuat
  diperbarui: number; //  akun yang data dirinya diisi/diubah
  takBerubah: number; //  akun cocok tanpa perubahan
  gagal: number; //       baris yang gagal diproses
  detailDitambahkan: { nama: string; nip: string; email: string }[];
  detailDiperbarui: { nama: string; nip: string; perubahan: string[] }[];
  detailGagal: { baris: number; nama: string; pesan: string }[];
  passwordDefault: string;
}

export const pegawaiImportService = {
  async importExcel(file: File): Promise<HasilImportPegawai> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await api.post('/import-pegawai', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  async unduhTemplate(): Promise<void> {
    const res = await api.get('/import-pegawai/template', { responseType: 'blob' });
    downloadBlob(res.data, 'template-import-pegawai.xlsx');
  },
};
