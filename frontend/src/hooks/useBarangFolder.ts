// ============================================================
//  Hook useBarangFolder — memuat SELURUH barang yang cocok dengan
//  filter (tanpa pagination server) untuk tampilan folder per merk.
//  Pengelompokan & pagination folder dilakukan di sisi klien.
//  Memakai cache stale-while-revalidate agar navigasi terasa instan.
//  OPTIMASI: caching 30 detik + concurrent fetch + error retry
// ============================================================

'use client';

import { useCallback, useMemo, useState } from 'react';
import { barangService } from '@/services/barang.service';
import { useQuery } from '@/lib/cache';
import type { Barang, FilterBarang } from '@/types/barang.type';

export type FilterFolder = Omit<FilterBarang, 'page' | 'limit'>;

interface UseBarangFolderOptions {
  /** Sertakan data peminjam (untuk admin). Default false. */
  includePeminjam?: boolean;
}

export function useBarangFolder(filterAwal: FilterFolder = {}, options: UseBarangFolderOptions = {}) {
  const { includePeminjam = false } = options;
  const [filter, setFilter] = useState<FilterFolder>(filterAwal);

  const key = useMemo(() => `barang-folder:${includePeminjam}:${JSON.stringify(filter)}`, [filter, includePeminjam]);

  // refetch memaksa pemuatan ulang sambil tetap menampilkan data lama (tanpa kedip).
  // Cache 30 detik agar navigasi terasa instan, tapi tetap fresh saat reload.
  const { data, sedangMemuat, refetch } = useQuery<Barang[]>(
    key,
    () => barangService.getSemuaLengkap(filter, { includePeminjam }),
    { segarMs: 30000 } // cache 30 detik
  );

  const ubahFilter = useCallback((sebagian: Partial<FilterFolder>) => {
    setFilter((lama) => ({ ...lama, ...sebagian }));
  }, []);

  return { data: data ?? [], filter, ubahFilter, sedangMemuat, refetch };
}
