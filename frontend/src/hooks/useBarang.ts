// ============================================================
//  Hook useBarang — memuat daftar barang dengan filter,
//  pencarian, dan pagination. Menyediakan fungsi refetch.
//  Memakai cache stale-while-revalidate agar navigasi terasa instan.
// ============================================================

'use client';

import { useCallback, useMemo, useState } from 'react';
import { barangService } from '@/services/barang.service';
import { useQuery } from '@/lib/cache';
import type { Barang, FilterBarang, MetaPagination } from '@/types/barang.type';

interface HasilBarang {
  data: Barang[];
  meta: MetaPagination | null;
}

export function useBarang(filterAwal: FilterBarang = { page: 1, limit: 12 }) {
  const [filter, setFilter] = useState<FilterBarang>(filterAwal);

  const key = useMemo(() => `barang:${JSON.stringify(filter)}`, [filter]);

  const { data: hasil, sedangMemuat, refetch } = useQuery<HasilBarang>(
    key,
    () => barangService.getSemua(filter)
  );

  // Ubah sebagian filter (otomatis kembali ke halaman 1 bila filter berubah)
  const ubahFilter = useCallback((sebagian: Partial<FilterBarang>, resetHalaman = true) => {
    setFilter((lama) => ({ ...lama, ...sebagian, ...(resetHalaman ? { page: 1 } : {}) }));
  }, []);

  return {
    data: hasil?.data ?? [],
    meta: hasil?.meta ?? null,
    filter,
    setFilter,
    ubahFilter,
    sedangMemuat,
    refetch,
  };
}
