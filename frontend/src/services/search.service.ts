// ============================================================
//  Service Pencarian Global
// ============================================================

import api from '@/lib/api';

export interface SearchBarang {
  id: string;
  kodeBarang: string;
  nama: string;
  merk: string | null;
  jumlahTersedia: number;
  jumlahTotal: number;
  kondisi: string;
}

export interface SearchPeminjaman {
  id: string;
  kodePeminjaman: string;
  status: string;
  tanggalPengajuan: string;
  tanggalKembaliRencana: string | null;
  peminjam: {
    id: string;
    nama: string;
    nip: string;
  };
}

export interface SearchPeminjam {
  id: string;
  nama: string;
  nip: string;
  email: string;
  unitKerja: string | null;
}

export interface SearchResult {
  barang: SearchBarang[];
  peminjaman: SearchPeminjaman[];
  peminjam: SearchPeminjam[];
}

export interface SearchResponse {
  data: SearchResult;
}

export const searchService = {
  /**
   * Pencarian global — mencari di Barang, Peminjaman, dan Peminjam.
   * Minimal 2 karakter untuk menghindari query berlebihan.
   */
  async cari(query: string): Promise<SearchResult> {
    if (!query || query.trim().length < 2) {
      return { barang: [], peminjaman: [], peminjam: [] };
    }
    const res = await api.get<SearchResponse>('/search', {
      params: { q: query.trim() },
    });
    return res.data.data;
  },
};
