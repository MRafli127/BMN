// ============================================================
//  Hook useBarangFolder — memuat SELURUH barang yang cocok dengan
//  filter (tanpa pagination server) untuk tampilan folder per merk.
//  Pengelompokan & pagination folder dilakukan di sisi klien.
//  Memakai cache stale-while-revalidate agar navigasi terasa instan.
// ============================================================

'use client';

import { useCallback, useMemo, useState } from 'react';
import { barangService } from '@/services/barang.service';
import { useQuery } from '@/lib/cache';
import type { Barang, FilterBarang } from '@/types/barang.type';

export type FilterFolder = Omit<FilterBarang, 'page' | 'limit'>;

export function useBarangFolder(filterAwal: FilterFolder = {}) {
  const [filter, setFilter] = useState<FilterFolder>(filterAwal);

  const key = useMemo(() => `barang-folder:${JSON.stringify(filter)}`, [filter]);

  // refetch memaksa pemuatan ulang sambil tetap menampilkan data lama (tanpa kedip).
  const { data, sedangMemuat, refetch } = useQuery<Barang[]>(
    key,
    () => barangService.getSemuaLengkap(filter)
  );

  const ubahFilter = useCallback((sebagian: Partial<FilterFolder>) => {
    setFilter((lama) => ({ ...lama, ...sebagian }));
  }, []);

  return { data: data ?? [], filter, ubahFilter, sedangMemuat, refetch };
}
