// ============================================================
//  Hook useBarangFolder — memuat SELURUH barang yang cocok dengan
//  filter (tanpa pagination server) untuk tampilan folder per merk.
//  Pengelompokan & pagination folder dilakukan di sisi klien.
// ============================================================

'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { barangService } from '@/services/barang.service';
import { ambilPesanError } from '@/lib/utils';
import type { Barang, FilterBarang } from '@/types/barang.type';

export type FilterFolder = Omit<FilterBarang, 'page' | 'limit'>;

export function useBarangFolder(filterAwal: FilterFolder = {}) {
  const [data, setData] = useState<Barang[]>([]);
  const [filter, setFilter] = useState<FilterFolder>(filterAwal);
  const [sedangMemuat, setSedangMemuat] = useState(true);

  const muat = useCallback(async () => {
    setSedangMemuat(true);
    try {
      const semua = await barangService.getSemuaLengkap(filter);
      setData(semua);
    } catch (error) {
      toast.error(ambilPesanError(error, 'Gagal memuat data barang.'));
    } finally {
      setSedangMemuat(false);
    }
  }, [filter]);

  useEffect(() => {
    muat();
  }, [muat]);

  const ubahFilter = useCallback((sebagian: Partial<FilterFolder>) => {
    setFilter((lama) => ({ ...lama, ...sebagian }));
  }, []);

  return { data, filter, ubahFilter, sedangMemuat, refetch: muat };
}
