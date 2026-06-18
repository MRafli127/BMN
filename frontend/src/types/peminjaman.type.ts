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
  tanggalPinjamRencana: string;
  tanggalKembaliRencana?: string | null;
  tanggalKembaliAktual?: string | null;
  status: StatusPeminjaman;
  alasanPeminjaman?: string | null;
  dokumenUrl?: string | null;
  dokumenStempelUrl?: string | null;
  qrCodeUrl?: string | null;
  catatanAdmin?: string | null;
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
  tanggalPinjamRencana: string;
  tanggalKembaliRencana?: string;
  items: ItemPengajuan[];
}
