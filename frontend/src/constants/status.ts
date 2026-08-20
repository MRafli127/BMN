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
  DRAFT: {
    label: 'Draft — Surat Belum Diunggah',
    kelas: 'bg-slate-100 text-slate-700 border-slate-200',
    deskripsi: 'Surat Pernyataan belum diunggah. Unggah untuk menyerahkan barang.',
  },
  MENUNGGU: {
    label: 'Menunggu Persetujuan',
    kelas: 'bg-amber-100 text-amber-700 border-amber-200',
    deskripsi: 'Pengajuan sedang menunggu verifikasi admin.',
  },
  DISETUJUI: {
    label: 'Disetujui',
    kelas: 'bg-green-100 text-green-700 border-green-200',
    deskripsi: 'Pengajuan disetujui. Barang siap diambil.',
  },
  DITOLAK: {
    label: 'Ditolak',
    kelas: 'bg-red-100 text-red-700 border-red-200',
    deskripsi: 'Pengajuan ditolak oleh admin.',
  },
  DIPINJAM: {
    label: 'Sedang Dipinjam',
    kelas: 'bg-pink-100 text-pink-700 border-pink-200',
    deskripsi: 'Barang sedang dalam masa peminjaman.',
  },
  DIKEMBALIKAN: {
    label: 'Dikembalikan',
    kelas: 'bg-teal-100 text-teal-700 border-teal-200',
    deskripsi: 'Barang telah dikembalikan dengan baik.',
  },
  TERLAMBAT: {
    label: 'Terlambat',
    kelas: 'bg-orange-100 text-orange-700 border-orange-200',
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

// Status yang dihitung sebagai "peminjaman aktif" (selaras dengan backend STATUS_AKTIF).
export const STATUS_AKTIF: StatusPeminjaman[] = ['DISETUJUI', 'DIPINJAM', 'TERLAMBAT'];
// Nilai query gabungan untuk filter "sedang aktif" — dipakai di kartu dashboard & dropdown riwayat.
export const FILTER_STATUS_AKTIF = STATUS_AKTIF.join(',');

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
// Opsi untuk dropdown filter - berdasarkan kode satker
export const OPSI_FILTER_BARANG = [
  { value: '015110199411868000KP', label: '0KP — Sekretariat Badan Pendidikan dan Pelatihan Keuangan' },
  { value: '015110199411868001KP', label: '1KP — Pusat Pembinaan Jabatan Fungsional dan Peminjaman Mutu' },
  { value: '015110199411868002KP', label: '2KP — Pusat Pendidikan dan Pelatihan Anggaran dan Pembendaharaan' },
  { value: '015110199411868003KP', label: '3KP — Pusat Pendidikan dan Pelatihan Pajak' },
  { value: '015110199411868004KP', label: '4KP — Pusat Pendidikan dan Pelatihan Bea dan Cukai' },
  { value: '015110199411868005KP', label: '5KP — Pusat Pendidikan dan Pelatihan Keuangan Publik' },
  { value: '015110199411868006KP', label: '6KP — Pusat Pendidikan dan Pelatihan Kepemimpinan dan Manajemen' },
];

// DRAFT: admin bisa lihat draft yang dia sendiri yang buat.
export const OPSI_STATUS = Object.entries(STATUS_PEMINJAMAN)
  .map(([value, info]) => ({ value, label: info.label }));
