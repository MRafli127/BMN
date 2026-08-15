// ============================================================
//  Hook useBarangFolder — memuat SELURUH barang yang cocok dengan
//  filter (tanpa pagination server) untuk tampilan folder per merk.
//  Pengelompokan & pagination folder dilakukan di sisi klien.
//
//  Cache: pakai useQuery dengan TTL 15 detik (segarMs). Navigasi antar
//  halaman yang sama menampilkan data cache instan, lalu disegarkan
//  di latar belakang. Mutasi yang relevan harus memanggil
//  invalidasiCache('barang-folder:') agar data basi langsung diganti.
// ============================================================

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { barangService } from '@/services/barang.service';
import { useQuery } from '@/lib/cache';
import type { Barang, FilterBarang } from '@/types/barang.type';

export type FilterFolder = Omit<FilterBarang, 'page' | 'limit'>;

interface UseBarangFolderOptions {
  /** Sertakan data peminjam (untuk admin). Default false. */
  includePeminjam?: boolean;
}

// Bandingkan dua object filter berdasarkan NILAI, bukan referensi.
// Diperlukan karena parent (admin/barang/page.tsx) membuat literal object
// baru tiap render; bila kita pakai referensi sebagai dependency useEffect,
// sync prop->state akan jalan tanpa henti -> "Maximum update depth exceeded".
function filterSama(a: FilterFolder, b: FilterFolder): boolean {
  const kunci: (keyof FilterFolder)[] = ['q', 'kodeSatker', 'kondisi', 'ketersediaan', 'jenis'];
  for (const k of kunci) {
    const va = a?.[k];
    const vb = b?.[k];
    if ((va ?? null) !== (vb ?? null)) return false;
  }
  return true;
}

export function useBarangFolder(filterAwal: FilterFolder = {}, options: UseBarangFolderOptions = {}) {
  const { includePeminjam = false } = options;
  const [filter, setFilter] = useState<FilterFolder>(filterAwal);

  // Sync filter saat filterAwal berubah (misal dari URL di super admin).
  //
  // FIX infinite loop: efek ini dulu memuat `filterAwal` sebagai dependency
  // langsung. Karena parent membuat literal object baru tiap render, React
  // menganggap prop "berubah" tiap render -> efek jalan tiap render ->
  // setFilter() -> re-render -> efek jalan lagi -> loop.
  //
  // Solusi: simpan filterAwal TERAKHIR yang sudah diproses di ref, dan
  // bandingkan NILAI-nya (bukan referensi). Hanya sync bila nilai berubah.
  const filterAwalRef = useRef<FilterFolder>(filterAwal);
  useEffect(() => {
    if (!filterSama(filterAwalRef.current, filterAwal)) {
      filterAwalRef.current = filterAwal;
      setFilter((lama) => (filterSama(lama, filterAwal) ? lama : filterAwal));
    }
  }, [filterAwal]);

  // Serialize filter untuk dependency key cache (sehingga key stabil
  // meskipun referensi object berubah tiap render).
  const filterKey = useMemo(
    () => `barang-folder:${includePeminjam ? 'p' : 'n'}:${JSON.stringify(filter)}`,
    [filter, includePeminjam]
  );

  // Cache layer: TTL 15 detik. Cache TIDAK memicu re-fetch dalam rentang
  // itu. Mutasi barang/peminaman harus panggil invalidasiCache('barang-folder:')
  // agar cache langsung di-drop dan re-fetch terjadi.
  const {
    data: dataCache,
    sedangMemuat: sedangMemuatCache,
    refetch: refetchCache,
  } = useQuery<Barang[]>(
    filterKey,
    () => barangService.getSemuaLengkap(filter, { includePeminjam }),
    { segarMs: 15000, tampilkanCache: true }
  );

  const data = dataCache ?? [];
  // tampilkanCache=true + useQuery sudah mengelola loading-nya; kita hanya
  // mapping status loading dari cache hook.
  const sedangMemuat = sedangMemuatCache && data.length === 0;

  const refetch = useCallback(() => {
    refetchCache();
  }, [refetchCache]);

  // Ubah filter internal (untuk halaman admin)
  // Pakai functional update pattern agar tidak perlu filter sebagai dependency
  const ubahFilter = useCallback((sebagian: Partial<FilterFolder>) => {
    setFilter((lama) => ({ ...lama, ...sebagian }));
  }, []);

  return { data, filter, ubahFilter, sedangMemuat, refetch };
}
