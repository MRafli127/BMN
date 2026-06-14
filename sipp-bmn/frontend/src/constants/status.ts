// ============================================================
//  Konstanta label & warna untuk status, jenis, dan kondisi.
//  Dipakai pada badge, tabel, timeline, dan filter.
// ============================================================

import type { StatusPeminjaman } from '@/types/peminjaman.type';
import type { JenisBarang, KondisiBarang } from '@/types/barang.type';

interface InfoStatus {
  label: string;
  kelas: string; // kelas Tailwind untuk badge
  deskripsi: string;
}

export const STATUS_PEMINJAMAN: Record<StatusPeminjaman, InfoStatus> = {
  MENUNGGU: {
    label: 'Menunggu Persetujuan',
    kelas: 'bg-amber-100 text-amber-800 border-amber-200',
    deskripsi: 'Pengajuan sedang menunggu verifikasi admin.',
  },
  DISETUJUI: {
    label: 'Disetujui',
    kelas: 'bg-blue-100 text-blue-800 border-blue-200',
    deskripsi: 'Pengajuan disetujui. Barang siap diambil.',
  },
  DITOLAK: {
    label: 'Ditolak',
    kelas: 'bg-red-100 text-red-800 border-red-200',
    deskripsi: 'Pengajuan ditolak oleh admin.',
  },
  DIPINJAM: {
    label: 'Sedang Dipinjam',
    kelas: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    deskripsi: 'Barang sedang dalam masa peminjaman.',
  },
  DIKEMBALIKAN: {
    label: 'Dikembalikan',
    kelas: 'bg-green-100 text-green-800 border-green-200',
    deskripsi: 'Barang telah dikembalikan dengan baik.',
  },
  TERLAMBAT: {
    label: 'Terlambat',
    kelas: 'bg-rose-100 text-rose-800 border-rose-200',
    deskripsi: 'Melewati batas tanggal pengembalian.',
  },
};

// Urutan status untuk timeline visual (alur normal)
export const ALUR_TIMELINE: StatusPeminjaman[] = [
  'MENUNGGU',
  'DISETUJUI',
  'DIPINJAM',
  'DIKEMBALIKAN',
];

export const JENIS_BARANG: Record<JenisBarang, string> = {
  ELEKTRONIK: 'Elektronik',
  FURNITUR: 'Furnitur',
  KENDARAAN: 'Kendaraan',
  ATK: 'ATK',
  LAINNYA: 'Lainnya',
};

export const KONDISI_BARANG: Record<KondisiBarang, { label: string; kelas: string }> = {
  BAIK: { label: 'Baik', kelas: 'bg-green-100 text-green-800 border-green-200' },
  RUSAK_RINGAN: { label: 'Rusak Ringan', kelas: 'bg-amber-100 text-amber-800 border-amber-200' },
  RUSAK_BERAT: { label: 'Rusak Berat', kelas: 'bg-red-100 text-red-800 border-red-200' },
};

// Opsi untuk dropdown filter
export const OPSI_JENIS = Object.entries(JENIS_BARANG).map(([value, label]) => ({ value, label }));
export const OPSI_KONDISI = Object.entries(KONDISI_BARANG).map(([value, info]) => ({
  value,
  label: info.label,
}));
export const OPSI_STATUS = Object.entries(STATUS_PEMINJAMAN).map(([value, info]) => ({
  value,
  label: info.label,
}));
