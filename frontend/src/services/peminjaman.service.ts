// ============================================================
//  Service Peminjaman (frontend).
// ============================================================

import api from '@/lib/api';
import { invalidasiCacheDenganNama } from '@/lib/cache';
import type { DataPengajuan, DataPreviewSurat, Peminjaman, StatusPeminjaman } from '@/types/peminjaman.type';
import type { MetaPagination } from '@/types/barang.type';

export interface FilterPeminjaman {
  status?: StatusPeminjaman | '';
  q?: string;
  page?: number;
  limit?: number;
  /** Filter berdasarkan asal data: 'import' = hasil migrasi/import, 'manual' = input manual */
  importMode?: 'import' | 'manual' | '';
  /** Filter berdasarkan kode satker */
  kodeSatker?: string;
}

export interface DataQrcode {
  kodePeminjaman: string;
  qrCodeUrl: string;
  isi: string;
}

/** Detail peminjaman aktif yang dikembalikan saat error validasi */
export interface DetailPeminjamanError {
  id: string;
  kodeTransaksi: string;
  status: string;
  statusLabel: string;
  statusIcon: string;
  barangList: string;
  tanggalKirim: string | null;
  tanggalPinjamRencana: string | null;
  tanggalKembaliRencana: string | null;
  /** Sumber peminjaman aktif: 'sendiri' (user peminjam yang sama) atau 'peminjam_lain' (user berbeda) */
  dimilikiOleh?: 'sendiri' | 'peminjam_lain';
  /** Nama pemilik peminjaman aktif yang sedang memegang barang (untuk kasus 'peminjam_lain') */
  pemilikNama?: string | null;
}

/** Error dari backend dengan kode error spesifik */
export interface AppErrorDetail {
  kodeError?: string;
  detailPeminjaman?: DetailPeminjamanError | DetailPeminjamanError[];
}

// Mutasi peminjaman memengaruhi banyak cache sekaligus:
//   - 'barang'           : stok/jumlahTersedia barang berubah
//   - 'folder-peminjaman': folder & daftar peminjaman admin/super-admin
//   - 'dashboard-admin'  : statistik dashboard admin
//   - 'dashboard-peminjam': statistik dashboard peminjam (pengaju)
// Pusatkan di helper agar konsisten di tiap endpoint mutasi.
const INVALIDASI_SETELAH_MUTASI_PEMINJAMAN = () =>
  invalidasiCacheDenganNama('barang', 'folder-peminjaman', 'dashboard-admin', 'dashboard-peminjam');

export const peminjamanService = {
  async getSemua(filter: FilterPeminjaman = {}): Promise<{ data: Peminjaman[]; meta: MetaPagination }> {
    const res = await api.get('/peminjaman', { params: filter });
    return { data: res.data.data, meta: res.data.meta };
  },

  async getById(id: string): Promise<Peminjaman> {
    const res = await api.get(`/peminjaman/${id}`);
    return res.data.data;
  },

  // Buat Surat Pernyataan Peminjaman (PDF, data URL) untuk diunduh/cetak peminjam
  // sebelum pengajuan dibuat. Tidak menyimpan apa pun di server.
  async previewSurat(data: DataPreviewSurat): Promise<string> {
    const res = await api.post('/peminjaman/preview-surat', data);
    return res.data.data.suratUrl;
  },

  // Pengajuan peminjaman (multipart: items JSON + dokumen surat pernyataan
  // yang sudah ditandatangani peminjam).
  async create(data: DataPengajuan): Promise<Peminjaman> {
    const fd = new FormData();
    if (data.tanggalPinjamRencana) fd.append('tanggalPinjamRencana', data.tanggalPinjamRencana);
    if (data.tanggalKembaliRencana) fd.append('tanggalKembaliRencana', data.tanggalKembaliRencana);
    if (data.pangkatGolongan) fd.append('pangkatGolongan', data.pangkatGolongan);
    if (data.draft) fd.append('draft', 'true');
    fd.append('items', JSON.stringify(data.items));
    // Surat pernyataan yang sudah ditandatangani (PDF) WAJIB diunggah — kecuali draft.
    if (data.dokumen) {
      fd.append('dokumen', data.dokumen);
    }

    const res = await api.post('/peminjaman', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    // Peminjaman baru mengubah ketersediaan barang + statistik dashboard +
    // folder peminjaman admin/super-admin.
    INVALIDASI_SETELAH_MUTASI_PEMINJAMAN();
    return res.data.data;
  },

  // Buat Surat Pernyataan Peminjaman (PDF, data URL) untuk pengajuan tersimpan
  // (mis. draft) agar peminjam bisa mengunduh, menandatangani, lalu mengunggah.
  async getSuratPernyataan(id: string): Promise<string> {
    const res = await api.get(`/peminjaman/${id}/surat-pernyataan`);
    return res.data.data.suratUrl;
  },

  // Unggah Surat Pernyataan yang sudah ditandatangani untuk pengajuan DRAFT.
  // Status berpindah DRAFT -> MENUNGGU.
  async unggahSurat(id: string, dokumen: File): Promise<Peminjaman> {
    const fd = new FormData();
    fd.append('dokumen', dokumen);
    const res = await api.patch(`/peminjaman/${id}/unggah-surat`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    INVALIDASI_SETELAH_MUTASI_PEMINJAMAN();
    return res.data.data;
  },

  // Batalkan pengajuan DRAFT milik peminjam (membebaskan barang yang terkunci).
  async batalDraft(id: string): Promise<void> {
    await api.delete(`/peminjaman/${id}/batal-draft`);
    INVALIDASI_SETELAH_MUTASI_PEMINJAMAN();
  },

  async setujui(id: string, catatanAdmin?: string): Promise<Peminjaman> {
    const res = await api.patch(`/peminjaman/${id}/setujui`, { catatanAdmin });
    INVALIDASI_SETELAH_MUTASI_PEMINJAMAN();
    return res.data.data;
  },

  async tolak(id: string, catatanAdmin: string): Promise<Peminjaman> {
    const res = await api.patch(`/peminjaman/${id}/tolak`, { catatanAdmin });
    INVALIDASI_SETELAH_MUTASI_PEMINJAMAN();
    return res.data.data;
  },

  async serahkan(id: string): Promise<Peminjaman> {
    const res = await api.patch(`/peminjaman/${id}/serahkan`);
    // Serahkan menurunkan jumlahTersedia barang.
    INVALIDASI_SETELAH_MUTASI_PEMINJAMAN();
    return res.data.data;
  },

  // Buat Surat Pernyataan Pengembalian (PDF, data URL) untuk diunduh/cetak peminjam
  async getSuratPengembalian(id: string): Promise<string> {
    const res = await api.get(`/peminjaman/${id}/surat-pengembalian`);
    return res.data.data.suratUrl;
  },

  // Peminjam mengajukan pengembalian barang (menunggu konfirmasi admin).
  // Wajib melampirkan surat pernyataan pengembalian yang sudah ditandatangani (PDF).
  async mintaPengembalian(id: string, dokumen: File): Promise<Peminjaman> {
    const fd = new FormData();
    fd.append('dokumen', dokumen);
    const res = await api.patch(`/peminjaman/${id}/minta-pengembalian`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    INVALIDASI_SETELAH_MUTASI_PEMINJAMAN();
    return res.data.data;
  },

  // Konfirmasi pengembalian oleh admin.
  // dokumen (opsional): surat pengembalian bertanda tangan yang diunggah admin.
  async kembalikan(id: string, catatan?: string, dokumen?: File): Promise<Peminjaman> {
    const fd = new FormData();
    if (catatan) fd.append('catatan', catatan);
    if (dokumen) fd.append('dokumen', dokumen);
    const res = await api.patch(`/peminjaman/${id}/kembalikan`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    // Pengembalian meningkatkan jumlahTersedia barang.
    INVALIDASI_SETELAH_MUTASI_PEMINJAMAN();
    return res.data.data;
  },

  async stempel(id: string): Promise<Peminjaman> {
    const res = await api.post(`/peminjaman/${id}/stempel`);
    INVALIDASI_SETELAH_MUTASI_PEMINJAMAN();
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
    INVALIDASI_SETELAH_MUTASI_PEMINJAMAN();
  },

  // Hapus banyak peminjaman sekaligus (admin). Mengembalikan jumlah terhapus.
  async hapusMassal(ids: string[]): Promise<number> {
    const res = await api.post('/peminjaman/hapus-massal', { ids });
    INVALIDASI_SETELAH_MUTASI_PEMINJAMAN();
    return res.data.data?.dihapus ?? 0;
  },

  // Setujui banyak pengajuan sekaligus (admin). Mengembalikan ringkasan hasil.
  // catatanAdmin opsional: catatan yang sama dikirim ke tiap pengajuan yang disetujui.
  async setujuiMassal(ids: string[], catatanAdmin?: string): Promise<{ disetujui: number; dilewati: number }> {
    const res = await api.post('/peminjaman/setujui-massal', { ids, catatanAdmin });
    INVALIDASI_SETELAH_MUTASI_PEMINJAMAN();
    return { disetujui: res.data.data?.disetujui ?? 0, dilewati: res.data.data?.dilewati ?? 0 };
  },

  // Tandai banyak barang telah diserahkan sekaligus (admin). Mengembalikan ringkasan hasil.
  async serahkanMassal(ids: string[]): Promise<{ berhasil: number; dilewati: number }> {
    const res = await api.post('/peminjaman/serahkan-massal', { ids });
    INVALIDASI_SETELAH_MUTASI_PEMINJAMAN();
    return { berhasil: res.data.data?.berhasil ?? 0, dilewati: res.data.data?.dilewati ?? 0 };
  },

  // Konfirmasi pengembalian banyak peminjaman sekaligus (admin). Mengembalikan ringkasan hasil.
  async kembalikanMassal(ids: string[]): Promise<{ berhasil: number; dilewati: number }> {
    const res = await api.post('/peminjaman/kembalikan-massal', { ids });
    INVALIDASI_SETELAH_MUTASI_PEMINJAMAN();
    return { berhasil: res.data.data?.berhasil ?? 0, dilewati: res.data.data?.dilewati ?? 0 };
  },
};
