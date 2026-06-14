// ============================================================
//  Tipe data Barang
// ============================================================

export type JenisBarang = 'ELEKTRONIK' | 'FURNITUR' | 'KENDARAAN' | 'ATK' | 'LAINNYA';
export type KondisiBarang = 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT';

export interface Barang {
  id: string;
  kodeBarang: string;
  nama: string;
  jenis: JenisBarang;
  jumlahTotal: number;
  jumlahTersedia: number;
  kondisi: KondisiBarang;
  lokasiPenyimpanan?: string | null;
  deskripsi?: string | null;
  fotoUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MetaPagination {
  total: number;
  page: number;
  limit: number;
  totalHalaman: number;
}

export interface FilterBarang {
  q?: string;
  jenis?: JenisBarang | '';
  kondisi?: KondisiBarang | '';
  page?: number;
  limit?: number;
}
