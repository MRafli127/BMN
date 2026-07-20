// ============================================================
//  Hook useBarangFolder — memuat SELURUH barang yang cocok dengan
//  filter (tanpa pagination server) untuk tampilan folder per merk.
//  Pengelompokan & pagination folder dilakukan di sisi klien.
// ============================================================

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { barangService } from '@/services/barang.service';
import type { Barang, FilterBarang } from '@/types/barang.type';

export type FilterFolder = Omit<FilterBarang, 'page' | 'limit'>;

interface UseBarangFolderOptions {
  /** Sertakan data peminjam (untuk admin). Default false. */
  includePeminjam?: boolean;
}

export function useBarangFolder(filterAwal: FilterFolder = {}, options: UseBarangFolderOptions = {}) {
  const { includePeminjam = false } = options;
  const [data, setData] = useState<Barang[]>([]);
  const [sedangMemuat, setSedangMemuat] = useState(true);
  const [filter, setFilter] = useState<FilterFolder>(filterAwal);

  // Serialize filter untuk dependency useEffect
  // Ini adalah cara aman untuk membandingkan object tanpa reference equality issues
  const filterKey = useMemo(() => JSON.stringify(filter), [filter]);

  useEffect(() => {
    setSedangMemuat(true);

    const controller = new AbortController();

    barangService.getSemuaLengkap(filter, { includePeminjam, signal: controller.signal })
      .then((hasil) => {
        setData(hasil);
        setSedangMemuat(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        console.error('Gagal memuat barang:', err);
        setData([]);
        setSedangMemuat(false);
      });

    return () => controller.abort();
  }, [filterKey, includePeminjam]);

  const refetch = useCallback(() => {
    setSedangMemuat(true);
    barangService.getSemuaLengkap(filter, { includePeminjam })
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setSedangMemuat(false));
  }, [filter, includePeminjam]);

  // Ubah filter internal (untuk halaman admin)
  // Pakai functional update pattern agar tidak perlu filter sebagai dependency
  const ubahFilter = useCallback((sebagian: Partial<FilterFolder>) => {
    setFilter((lama) => ({ ...lama, ...sebagian }));
  }, []);

  return { data, filter, ubahFilter, sedangMemuat, refetch };
}
