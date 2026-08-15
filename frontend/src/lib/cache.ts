// ============================================================
//  Cache data ringan ala stale-while-revalidate (tanpa dependency).
//  Tujuan: navigasi antar halaman terasa instan — data yang sudah
//  pernah dimuat ditampilkan seketika dari cache, lalu disegarkan
//  di latar belakang. Menghilangkan spinner penuh saat berpindah
//  halaman yang sama berulang kali.
// ============================================================

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface Entri<T = unknown> {
  data?: T;
  ts: number; // waktu terakhir berhasil dimuat (ms)
  promise?: Promise<unknown>; // request yang sedang berjalan (dedupe)
}

const cache = new Map<string, Entri>();
const pendengar = new Map<string, Set<() => void>>();

function beriTahu(key: string) {
  pendengar.get(key)?.forEach((cb) => cb());
}

/** Hapus entri cache (atau berdasarkan awalan) agar dimuat ulang. */
export function invalidasiCache(awalan?: string) {
  if (!awalan) {
    cache.clear();
  } else {
    for (const key of cache.keys()) {
      if (key.startsWith(awalan)) cache.delete(key);
    }
  }
  // Picu render ulang konsumen terkait
  for (const key of pendengar.keys()) {
    if (!awalan || key.startsWith(awalan)) beriTahu(key);
  }
}

/**
 * Invalidasi cache berdasarkan NAMA TIPE, bukan awalan key teknis.
 *
 * Daftar `namaCache` adalah alias yang terdaftar di `KUNCI_CACHE` di bawah.
 * Helper ini merangkai semua awalan key cache yang terkait sehingga pemanggil
 * tinggal menyebut "barang" tanpa harus tahu prefix internal ('barang-folder:').
 *
 * Pakai ini di titik-titik mutasi agar cache konsisten dengan data server.
 */
const KUNCI_CACHE = {
  // Folder barang (admin/super-admin/peminjam katalog).
  //   - useBarangFolder  -> prefix 'barang-folder:'
  //   - useBarang        -> prefix 'barang:'
  // Saat mutasi barang, kedua prefix harus di-invalidate agar SEMUA halaman
  // yang menampilkan daftar/katalog barang ikut refresh.
  barang: ['barang-folder:', 'barang:'],

  // Folder/list peminjaman admin & super-admin: 'folder-peminjaman:'.
  // Mutasi peminjaman (setujui/tolak/serahkan/kembalikan/dst.) membuat angka
  // & status di folder basi jika tidak di-invalidate.
  'folder-peminjaman': ['folder-peminjaman:'],

  // Dashboard admin (statistik global + grafik): prefix 'dashboard-admin:'.
  // Cache key literal penuh: 'dashboard-peminjam' (tanpa ':') di halaman
  // dashboard peminjam. Mutasi peminjaman/barang dapat mengubah metrik.
  'dashboard-admin': ['dashboard-admin:'],
  'dashboard-peminjam': ['dashboard-peminjam'],

  // Halaman kategori dashboard admin (mis. Daftar Pegawai). Awalan key
  // tergantung kategori; yang penting di sini hanya slot peminjam.
  'kategori:peminjam': ['kategori:peminjam:'],

  // Halaman manajemen satker (super-admin): prefix 'satker:'.
  satker: ['satker:'],
};

export function invalidasiCacheDenganNama(...namaCache: Array<keyof typeof KUNCI_CACHE>) {
  for (const nama of namaCache) {
    const awalanList = KUNCI_CACHE[nama];
    if (!awalanList) continue;
    for (const awalan of awalanList) {
      invalidasiCache(awalan);
    }
  }
}

interface OpsiQuery {
  /** Jangan jalankan query bila false. */
  aktif?: boolean;
  /**
   * Anggap data masih segar selama (ms) ini; dalam rentang itu pemuatan
   * dilewati. Default 0 → selalu segarkan di latar belakang setiap mount
   * (stale-while-revalidate): data cache tampil instan, lalu diperbarui.
   */
  segarMs?: number;
  /**
   * Bila true, tampilkan data cache (bila ada) sambil tetap menyegarkan
   * di latar belakang — tidak pernah tampilkan loading spinner penuh.
   * Default false (perilaku standar: tampilkan spinner jika belum ada cache).
   */
  tampilkanCache?: boolean;
}

/**
 * Hook query dengan cache stale-while-revalidate.
 * Mengembalikan data cache (bila ada) seketika, lalu menyegarkan.
 */
export function useQuery<T>(
  key: string | null,
  pengambil: () => Promise<T>,
  opsi: OpsiQuery = {}
) {
  const { aktif = true, segarMs = 0, tampilkanCache = false } = opsi;

  const entriAwal = key ? (cache.get(key) as Entri<T> | undefined) : undefined;
  const [data, setData] = useState<T | undefined>(entriAwal?.data);
  // Hanya tampilkan loading penuh bila belum ada data cache sama sekali DAN tidak pakai tampilkanCache
  const [sedangMemuat, setSedangMemuat] = useState(!tampilkanCache && !entriAwal?.data && aktif && !!key);
  const [error, setError] = useState<unknown>(null);

  // Simpan pengambil terbaru tanpa memicu efek berulang
  const refPengambil = useRef(pengambil);
  refPengambil.current = pengambil;

  const jalankan = useCallback(
    async (paksa = false) => {
      if (!key || !aktif) return;
      const entri = cache.get(key) as Entri<T> | undefined;

      // Dedupe: ikut request yang sedang berjalan
      if (entri?.promise) {
        try {
          await entri.promise;
          const segar = cache.get(key) as Entri<T> | undefined;
          if (segar?.data !== undefined) setData(segar.data);
        } catch {
          /* error sudah ditangani oleh pemicu asli */
        } finally {
          setSedangMemuat(false);
        }
        return;
      }

      // Lewati bila data masih segar dan tidak dipaksa
      if (!paksa && entri?.data !== undefined && Date.now() - entri.ts < segarMs) {
        setData(entri.data);
        setSedangMemuat(false);
        return;
      }

      // Dengan tampilkanCache, TIDAK pernah tampilkan spinner — fetch diam-diam
      if (entri?.data === undefined && !tampilkanCache) setSedangMemuat(true);

      const promise = refPengambil.current();
      cache.set(key, { ...(entri ?? { ts: 0 }), promise });

      try {
        const hasil = await promise;
        cache.set(key, { data: hasil, ts: Date.now() });
        setData(hasil);
        setError(null);
        beriTahu(key);
      } catch (e) {
        // Bersihkan promise agar bisa dicoba lagi
        const lama = cache.get(key) as Entri<T> | undefined;
        cache.set(key, { data: lama?.data, ts: lama?.ts ?? 0 });
        setError(e);
      } finally {
        setSedangMemuat(false);
      }
    },
    [key, aktif, segarMs, tampilkanCache]
  );

  // Berlangganan perubahan cache untuk key ini
  useEffect(() => {
    if (!key) return;
    const cb = () => {
      const entri = cache.get(key) as Entri<T> | undefined;
      setData(entri?.data);
    };
    let set = pendengar.get(key);
    if (!set) {
      set = new Set();
      pendengar.set(key, set);
    }
    set.add(cb);
    return () => {
      set!.delete(cb);
      if (set!.size === 0) pendengar.delete(key);
    };
  }, [key]);

  // Muat saat key/aktif berubah
  useEffect(() => {
    if (!key || !aktif) return;
    // Tampilkan data cache segera bila ada
    const entri = cache.get(key) as Entri<T> | undefined;
    if (entri?.data !== undefined) setData(entri.data);
    jalankan();
  }, [key, aktif, jalankan]);

  const refetch = useCallback(() => jalankan(true), [jalankan]);

  return { data, sedangMemuat, error, refetch };
}
