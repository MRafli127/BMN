// ============================================================
//  Tipe data Peminjaman
// ============================================================

import type { Barang } from './barang.type';
import type { User } from './user.type';

export type StatusPeminjaman =
  | 'MENUNGGU'
  | 'DISETUJUI'
  | 'DITOLAK'
  | 'DIPINJAM'
  | 'DIKEMBALIKAN'
  | 'TERLAMBAT';

export type StatusItem = 'DIPINJAM' | 'DIKEMBALIKAN';

export interface DetailPeminjaman {
  id: string;
  peminjamanId: string;
  barangId: string;
  jumlahPinjam: number;
  statusItem: StatusItem;
  barang?: Barang;
}

export interface Peminjaman {
  id: string;
  kodePeminjaman: string;
  userId: string;
  tanggalPengajuan: string;
  tanggalPinjamRencana?: string | null;
  tanggalKembaliRencana?: string | null;
  tanggalKembaliAktual?: string | null;
  tanggalPermintaanKembali?: string | null;
  status: StatusPeminjaman;
  alasanPeminjaman?: string | null;
  dokumenUrl?: string | null;
  dokumenStempelUrl?: string | null;
  dokumenPengembalianUrl?: string | null;
  qrCodeUrl?: string | null;
  catatanAdmin?: string | null;
  catatanPengembalian?: string | null; // Catatan admin saat konfirmasi pengembalian — hanya untuk admin
  disetujuiOleh?: string | null;
  createdAt?: string;
  updatedAt?: string;
  peminjam?: Partial<User>;
  admin?: Partial<User> | null;
  detail?: DetailPeminjaman[];
}

export interface ItemPengajuan {
  barangId: string;
  jumlahPinjam: number;
}

export interface DataPengajuan {
  tanggalPinjamRencana?: string;
  tanggalKembaliRencana?: string;
  items: ItemPengajuan[];
  dokumen?: File; // Surat pernyataan yang sudah ditandatangani peminjam (PDF) - WAJIB
}

// Payload pratinjau surat pernyataan (sebelum pengajuan dibuat).
export interface DataPreviewSurat {
  pangkatGolongan?: string; // Pangkat/Gol. peminjam — tercantum pada surat
  tanggalPinjamRencana?: string;
  tanggalKembaliRencana?: string;
  items: ItemPengajuan[];
}

// Payload pengajuan peminjaman (multipart: items JSON + dokumen surat
// pernyataan yang sudah ditandatangani).
export interface DataPengajuan {
  tanggalPinjamRencana?: string;
  tanggalKembaliRencana?: string;
  items: ItemPengajuan[];
  dokumen?: File; // Surat pernyataan yang sudah ditandatangani peminjam (PDF) - WAJIB
}
