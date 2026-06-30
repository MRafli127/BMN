// ============================================================
//  Store Keranjang Peminjaman (Zustand + persist).
//  Menyimpan barang yang dipilih peminjam sebelum diajukan.
//  Bertahan di localStorage agar tidak hilang saat refresh.
//  Support MULTI BARANG - user bisa meminjam banyak barang sekaligus.
//  Setiap unit barang hanya berjumlah 1.
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
  jumlah: number; // selalu 1
}

interface KeranjangState {
  items: Record<string, ItemKeranjang>;
  /** Tambah barang ke keranjang (selalu 1 unit). */
  tambah: (barang: Barang) => void;
  /** Hapus satu barang dari keranjang. */
  hapus: (barangId: string) => void;
  /** Kosongkan seluruh keranjang. */
  kosongkan: () => void;
}

export const useKeranjangStore = create<KeranjangState>()(
  persist(
    (set) => ({
      items: {},

      // MULTI BARANG: menambahkan barang tidak menggantikan yang sudah ada.
      tambah: (b) =>
        set((s) => {
          if (b.jumlahTersedia < 1) return s; // stok habis

          // Jika barang sudah ada, tidak perlu tambahkan lagi
          if (s.items[b.id]) {
            return s;
          }

          // Barang baru, tambahkan ke keranjang
          return {
            items: {
              ...s.items,
              [b.id]: {
                barangId: b.id,
                nama: b.nama,
                merk: b.merk ?? null,
                kodeBarang: b.kodeBarang,
                fotoUrl: b.fotoUrl ?? null,
                jumlahTersedia: b.jumlahTersedia,
                jumlah: 1, // selalu 1
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

      kosongkan: () => set({ items: {} }),
    }),
    { name: 'keranjang-peminjam' }
  )
);

/**
 * Jumlah unit di keranjang, aman dari hydration mismatch
 * (mengembalikan 0 sampai komponen ter-mount di klien).
 */
export function useJumlahKeranjang(): number {
  const items = useKeranjangStore((s) => s.items);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? Object.keys(items).length : 0;
}

/**
 * Alias untuk useJumlahKeranjang - total unit = jumlah item
 */
export function useTotalUnitKeranjang(): number {
  return useJumlahKeranjang();
}