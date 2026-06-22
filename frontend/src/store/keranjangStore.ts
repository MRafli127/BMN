// ============================================================
//  Store Keranjang Peminjaman (Zustand + persist).
//  Menyimpan barang yang dipilih peminjam sebelum diajukan.
//  Bertahan di localStorage agar tidak hilang saat refresh.
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Barang } from '@/types/barang.type';

export interface ItemKeranjang {
  barangId: string;
  nama: string;
  merk?: string | null;
  kodeBarang: string;
  fotoUrl?: string | null;
  jumlahTersedia: number;
  jumlah: number; // jumlah yang ingin dipinjam
}

interface KeranjangState {
  items: Record<string, ItemKeranjang>;
  /** Tambah barang ke keranjang (default 1 unit, tidak melebihi stok). */
  tambah: (barang: Barang, jumlah?: number) => void;
  /** Hapus satu barang dari keranjang. */
  hapus: (barangId: string) => void;
  /** Ubah jumlah unit suatu barang (dibatasi 1..stok). */
  ubahJumlah: (barangId: string, jumlah: number) => void;
  /** Kosongkan seluruh keranjang. */
  kosongkan: () => void;
}

export const useKeranjangStore = create<KeranjangState>()(
  persist(
    (set) => ({
      items: {},

      // Hanya boleh 1 barang per pengajuan — menambah barang baru
      // menggantikan seluruh isi keranjang sebelumnya.
      tambah: (b, jumlah = 1) =>
        set((s) => {
          if (b.jumlahTersedia < 1) return s; // stok habis
          const baru = Math.min(b.jumlahTersedia, Math.max(1, jumlah));
          return {
            items: {
              [b.id]: {
                barangId: b.id,
                nama: b.nama,
                merk: b.merk ?? null,
                kodeBarang: b.kodeBarang,
                fotoUrl: b.fotoUrl ?? null,
                jumlahTersedia: b.jumlahTersedia,
                jumlah: baru,
              },
            },
          };
        }),

      hapus: (id) =>
        set((s) => {
          const salin = { ...s.items };
          delete salin[id];
          return { items: salin };
        }),

      ubahJumlah: (id, jumlah) =>
        set((s) => {
          const it = s.items[id];
          if (!it) return s;
          const j = Math.min(it.jumlahTersedia, Math.max(1, jumlah));
          return { items: { ...s.items, [id]: { ...it, jumlah: j } } };
        }),

      kosongkan: () => set({ items: {} }),
    }),
    { name: 'keranjang-peminjam' }
  )
);

/**
 * Jumlah jenis barang di keranjang, aman dari hydration mismatch
 * (mengembalikan 0 sampai komponen ter-mount di klien).
 */
export function useJumlahKeranjang(): number {
  const items = useKeranjangStore((s) => s.items);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? Object.keys(items).length : 0;
}
