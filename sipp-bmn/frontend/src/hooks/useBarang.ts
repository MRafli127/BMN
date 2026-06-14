// ============================================================
//  Hook useBarang — memuat daftar barang dengan filter,
//  pencarian, dan pagination. Menyediakan fungsi refetch.
// ============================================================

'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { barangService } from '@/services/barang.service';
import { ambilPesanError } from '@/lib/utils';
import type { Barang, FilterBarang, MetaPagination } from '@/types/barang.type';

export function useBarang(filterAwal: FilterBarang = { page: 1, limit: 12 }) {
  const [data, setData] = useState<Barang[]>([]);
  const [meta, setMeta] = useState<MetaPagination | null>(null);
  const [filter, setFilter] = useState<FilterBarang>(filterAwal);
  const [sedangMemuat, setSedangMemuat] = useState(true);

  const muat = useCallback(async () => {
    setSedangMemuat(true);
    try {
      const hasil = await barangService.getSemua(filter);
      setData(hasil.data);
      setMeta(hasil.meta);
    } catch (error) {
      toast.error(ambilPesanError(error, 'Gagal memuat data barang.'));
    } finally {
      setSedangMemuat(false);
    }
  }, [filter]);

  useEffect(() => {
    muat();
  }, [muat]);

  // Ubah sebagian filter (otomatis kembali ke halaman 1 bila filter berubah)
  const ubahFilter = useCallback((sebagian: Partial<FilterBarang>, resetHalaman = true) => {
    setFilter((lama) => ({ ...lama, ...sebagian, ...(resetHalaman ? { page: 1 } : {}) }));
  }, []);

  return { data, meta, filter, setFilter, ubahFilter, sedangMemuat, refetch: muat };
}
