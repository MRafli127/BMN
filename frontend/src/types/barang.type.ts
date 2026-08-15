// ============================================================
//  Tipe data Barang
// ============================================================

export type JenisBarang = 'ELEKTRONIK' | 'FURNITUR' | 'KENDARAAN' | 'ATK' | 'LAINNYA';
export type KondisiBarang = 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT';
export type SumberBarang = 'MANUAL' | 'IMPORT';

// Data peminjam yang sedang meminjam barang
export interface Peminjam {
  id: string;
  nama: string;
  nip?: string | null;
  jabatan?: string | null;
  unitKerja?: string | null;
}

export interface Barang {
  id: string;
  kodeBarang: string;
  nama: string;
  merk?: string | null;
  tipe?: string | null;
  jenis: JenisBarang;
  jumlahTotal: number;
  jumlahTersedia: number;
  kondisi: KondisiBarang;
  lokasiPenyimpanan?: string | null;
  deskripsi?: string | null;
  fotoUrl?: string | null;
  sumber?: SumberBarang;
  // Identitas aset register BMN (hanya untuk barang hasil import)
  kodeSatker?: string | null;
  namaSatker?: string | null;
  kodeBarangBmn?: string | null;
  nup?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // Data peminjam aktif (null jika barang tersedia/tidak dipinjam)
  peminjam?: Peminjam | null;
}

export interface MetaPagination {
  total: number;
  page: number;
  limit: number;
  totalHalaman: number;
}

export type Ketersediaan = 'tersedia' | 'habis';

export interface FilterBarang {
  q?: string;
  jenis?: JenisBarang | '';
  kondisi?: KondisiBarang | '';
  ketersediaan?: Ketersediaan | '';
  kodeSatker?: string | '';
  page?: number;
  limit?: number;
  includePeminjam?: boolean;
}
