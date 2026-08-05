// ============================================================
//  Shared utility: kelompokkan barang berdasarkan kategori.
//  Kategori = kombinasi merk + tipe:
//    - Merk & Tipe ada          → "{merk} - {tipe}"
//    - Merk ada, Tipe kosong     → "{merk}"
//    - Merk kosong, Tipe ada    → "{tipe}"
//    - Keduanya kosong           → "Tanpa Kategori"
//
//  NOTE: Barang hasil import sebelum penambahan kolom `tipe`
//  akan tampil dengan kategorisasi lebih kasar (merk saja) sampai
//  data tersebut di-refresh lewat import berikutnya. Ini bukan
//  bug, melainkan by-design fallback behavior (Opsi A: tidak migrasi).
// ============================================================

import type { Barang } from '@/types/barang.type';

export interface GrupBarang {
  kategori: string; // label folder, misal "HP - ProBook 440" atau "Tanpa Kategori"
  items: Barang[];
  totalUnit: number;
  totalStok: number;
  totalTersedia: number;
}

/**
 * Tentukan label kategori untuk satu barang.
 * Urutan prioritas:
 *   1. merk + tipe ada → "{merk} - {tipe}"
 *   2. merk saja      → "{merk}"
 *   3. tipe saja     → "{tipe}"
 *   4. keduanya kosong → "Tanpa Kategori"
 */
function tentukanKategori(barang: Barang): string {
  const merk = barang.merk?.trim() || '';
  const tipe = barang.tipe?.trim() || '';

  if (merk && tipe) return `${merk} - ${tipe}`;
  if (merk) return merk;
  if (tipe) return tipe;
  return 'Tanpa Kategori';
}

/**
 * Kelompokkan array barang berdasarkan kategori.
 * Folder di-sort ascending berdasarkan label kategori (locale Indonesia).
 */
export function kelompokkanBarang(data: Barang[]): GrupBarang[] {
  const peta = new Map<string, { items: Barang[]; jumlahLabel: Map<string, number>; idTerlihat: Set<string> }>();

  for (const barang of data) {
    const kategori = tentukanKategori(barang);
    const kunci = kategori.toLowerCase().replace(/\s+/g, ' ');

    let grup = peta.get(kunci);
    if (!grup) {
      grup = { items: [], jumlahLabel: new Map(), idTerlihat: new Set() };
      peta.set(kunci, grup);
    }
    // Safety net: kalau input sudah punya id duplikat (mis. data dari
    // getSemuaLengkap yang menarik beberapa halaman pagination),
    // skip barang kedua agar tidak memicu React "duplicate key" warning.
    if (grup.idTerlihat.has(barang.id)) continue;
    grup.idTerlihat.add(barang.id);
    grup.items.push(barang);
    grup.jumlahLabel.set(kategori, (grup.jumlahLabel.get(kategori) || 0) + 1);
  }

  return Array.from(peta.values(), ({ items, jumlahLabel }) => {
    // Pilih label yang paling sering muncul sebagai label folder
    let labelUtama = 'Tanpa Kategori';
    let terbanyak = -1;
    for (const [label, jumlah] of jumlahLabel) {
      if (jumlah > terbanyak) {
        terbanyak = jumlah;
        labelUtama = label;
      }
    }
    return {
      kategori: labelUtama,
      items,
      totalUnit: items.length,
      totalStok: items.reduce((s, i) => s + i.jumlahTotal, 0),
      totalTersedia: items.reduce((s, i) => s + i.jumlahTersedia, 0),
    };
  }).sort((a, b) => a.kategori.localeCompare(b.kategori, 'id', { sensitivity: 'base' }));
}
