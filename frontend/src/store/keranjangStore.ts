// ============================================================
//  Store Keranjang Peminjaman (Zustand + persist).
//  Menyimpan barang yang dipilih peminjam sebelum diajukan.
//  Bertahan di localStorage agar tidak hilang saat refresh.
//  Support MULTI BARANG - user bisa meminjam banyak barang sekaligus.
//  Setiap unit barang hanya berjumlah 1.
//  Support polling untuk cek stok real-time.
// ============================================================

'use client';

import { useEffect, useState, useCallback } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { barangService } from '@/services/barang.service';
import { useAuthStore } from '@/store/authStore';
import type { Barang } from '@/types/barang.type';

export interface ItemKeranjang {
  barangId: string;
  nama: string;
  merk?: string | null;
  kodeBarang: string;
  fotoUrl?: string | null;
  jumlahTersedia: number;
  jumlah: number; // selalu 1
  /** Flag: barang ini sudah tidak tersedia lagi (stok habis) */
  tidakTersedia?: boolean;
}

interface KeranjangState {
  items: Record<string, ItemKeranjang>;
  /** Tambah barang ke keranjang (selalu 1 unit). */
  tambah: (barang: Barang) => void;
  /** Hapus satu barang dari keranjang. */
  hapus: (barangId: string) => void;
  /** Kosongkan seluruh keranjang. */
  kosongkan: () => void;
  /** Cek stok barang di keranjang dan tandai yang tidak tersedia. */
  cekStokTersedia: () => Promise<ItemKeranjang[]>;
}

// Helper: interval polling dalam milidetik
const POLLING_INTERVAL = 30000; // 30 detik

export const useKeranjangStore = create<KeranjangState>()(
  persist(
    (set, get) => ({
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
                tidakTersedia: false,
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

      // Cek stok dan kembalikan daftar barang yang tidak tersedia
      cekStokTersedia: async () => {
        const items = get().items;
        const barangIds = Object.keys(items);
        if (barangIds.length === 0) return [];

        try {
          const tidakTersedia = await barangService.cekStokKeranjang(barangIds);
          const idTidakTersedia = new Set(tidakTersedia.map((b) => b.id));

          // Update state: tandai barang yang tidak tersedia
          set((s) => {
            const itemsBaru = { ...s.items };
            let adaPerubahan = false;

            for (const id of barangIds) {
              if (idTidakTersedia.has(id)) {
                if (!itemsBaru[id].tidakTersedia) {
                  itemsBaru[id] = { ...itemsBaru[id], tidakTersedia: true, jumlahTersedia: 0 };
                  adaPerubahan = true;
                }
              } else {
                if (itemsBaru[id].tidakTersedia) {
                  // Stok kembali tersedia, reset flag
                  itemsBaru[id] = { ...itemsBaru[id], tidakTersedia: false };
                  adaPerubahan = true;
                }
              }
            }

            return adaPerubahan ? { items: itemsBaru } : s;
          });

          return tidakTersedia.map((b) => ({
            barangId: b.id,
            nama: b.nama,
            merk: b.merk ?? null,
            kodeBarang: b.kodeBarang,
            fotoUrl: b.fotoUrl ?? null,
            jumlahTersedia: b.jumlahTersedia,
            jumlah: 1,
            tidakTersedia: true,
          }));
        } catch {
          return [];
        }
      },
    }),
    {
      name: 'keranjang-peminjam',
      storage: {
        getItem: (name) => {
          const userId = useAuthStore.getState().user?.id;
          const key = userId ? `${name}:${userId}` : name;
          const value = localStorage.getItem(key);
          return value ? JSON.parse(value) : null;
        },
        setItem: (name, value) => {
          const userId = useAuthStore.getState().user?.id;
          const key = userId ? `${name}:${userId}` : name;
          localStorage.setItem(key, JSON.stringify(value));
        },
        removeItem: (name) => {
          const userId = useAuthStore.getState().user?.id;
          const key = userId ? `${name}:${userId}` : name;
          localStorage.removeItem(key);
        },
      },
    }
  )
);

/**
 * Hook untuk auto-polling cek stok keranjang.
 * - cekStokInterval: interval polling dalam ms (default 30 detik)
 * - enabled: aktifkan/nonaktifkan polling
 * - onBarangTidakTersedia: callback ketika ada barang yang tidak tersedia
 */
export function usePollingStokKeranjang(options?: {
  cekStokInterval?: number;
  enabled?: boolean;
  onBarangTidakTersedia?: (items: ItemKeranjang[]) => void;
}) {
  const { cekStokInterval = POLLING_INTERVAL, enabled = true, onBarangTidakTersedia } = options ?? {};
  const [barangYangDihapus, setBarangYangDihapus] = useState<ItemKeranjang[]>([]);
  const [dialogTerbuka, setDialogTerbuka] = useState(false);
  const [sedangMemuat, setSedangMemuat] = useState(false);
  const cekStok = useKeranjangStore((s) => s.cekStokTersedia);
  const items = useKeranjangStore((s) => s.items);

  const muatStok = useCallback(async () => {
    const itemsDiKeranjang = Object.keys(items);
    if (itemsDiKeranjang.length === 0) return;

    setSedangMemuat(true);
    try {
      const tidakTersedia = await cekStok();
      if (tidakTersedia.length > 0) {
        setBarangYangDihapus(tidakTersedia);
        setDialogTerbuka(true);
        onBarangTidakTersedia?.(tidakTersedia);
      }
    } finally {
      setSedangMemuat(false);
    }
  }, [cekStok, items, onBarangTidakTersedia]);

  // Polling interval
  useEffect(() => {
    if (!enabled) return;

    // Cek langsung saat mount
    muatStok();

    const interval = setInterval(muatStok, cekStokInterval);
    return () => clearInterval(interval);
  }, [enabled, cekStokInterval, muatStok]);

  return {
    barangYangDihapus,
    dialogTerbuka,
    sedangMemuat,
    setDialogTerbuka,
    refresh: muatStok,
  };
}

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