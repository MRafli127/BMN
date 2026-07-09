// ============================================================
//  Tipe data Notifikasi
// ============================================================

export type PrioritasNotifikasi = 'TINGGI' | 'SEDANG' | 'RENDAH';

export interface Notifikasi {
  id: string;
  userId: string;
  tipe: string;
  judul: string;
  pesan: string;
  prioritas: PrioritasNotifikasi;
  isBaca: boolean;
  referenceId?: string | null;
  referenceType?: string | null;
  createdAt: string;
}

export interface ResponseNotifikasi {
  notifikasi: Notifikasi[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalHalaman: number;
  };
}

export interface ResponseJumlahBelumBaca {
  jumlah: number;
}

// Tipe notifikasi
export const TIPE_NOTIFIKASI = {
  PEMINJAMAN_BARU: 'PEMINJAMAN_BARU',
  PEMINJAMAN_DISETUJUI: 'PEMINJAMAN_DISETUJUI',
  PEMINJAMAN_DITOLAK: 'PEMINJAMAN_DITOLAK',
  BARANG_DISERAHKAN: 'BARANG_DISERAHKAN',
  PENGEMBALIAN: 'PENGEMBALIAN',
  TERLAMBAT: 'TERLAMBAT',
  KERUSAKAN: 'KERUSAKAN',
  KEHILANGAN: 'KEHILANGAN',
  EXPORT_SELESAI: 'EXPORT_SELESAI',
  IMPORT_SELESAI: 'IMPORT_SELESAI',
  SISTEM: 'SISTEM',
  PENSIUN_MENDEKATI: 'PENSIUN_MENDEKATI',
} as const;

// Ikon untuk setiap tipe notifikasi
export const IKON_NOTIFIKASI: Record<string, string> = {
  [TIPE_NOTIFIKASI.PEMINJAMAN_BARU]: 'request_quote',
  [TIPE_NOTIFIKASI.PEMINJAMAN_DISETUJUI]: 'check_circle',
  [TIPE_NOTIFIKASI.PEMINJAMAN_DITOLAK]: 'cancel',
  [TIPE_NOTIFIKASI.BARANG_DISERAHKAN]: 'inventory_2',
  [TIPE_NOTIFIKASI.PENGEMBALIAN]: 'assignment_return',
  [TIPE_NOTIFIKASI.TERLAMBAT]: 'schedule',
  [TIPE_NOTIFIKASI.KERUSAKAN]: 'report_problem',
  [TIPE_NOTIFIKASI.KEHILANGAN]: 'warning',
  [TIPE_NOTIFIKASI.EXPORT_SELESAI]: 'file_download_done',
  [TIPE_NOTIFIKASI.IMPORT_SELESAI]: 'upload_file',
  [TIPE_NOTIFIKASI.SISTEM]: 'info',
  [TIPE_NOTIFIKASI.PENSIUN_MENDEKATI]: 'elderly',
};