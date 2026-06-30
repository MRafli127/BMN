// ============================================================
//  Hook anti-spam: debounce & throttle untuk action user.
//  Mencegah double-click, rapid-click, dan request spam.
// ============================================================

'use client';

import { useCallback, useRef, useState } from 'react';

interface OpsiDebounce {
  /** Jeda minimum antar-panggilan (ms). Default 1000ms. */
  jeda?: number;
  /** Tekan enter juga ikut di-debounce. Default true. */
  jugaTekanEnter?: boolean;
}

/**
 * Hook debounce untuk submit button.
 * Mencegah spam click dengan jeda minimum antar-panggilan.
 *
 * @example
 * const { callback, sedangDiblokir } = useDebounceSubmit(ajukan, { jeda: 2000 });
 * <Button onClick={callback} disabled={sedangDiblokir}>Kirim</Button>
 */
export function useDebounceSubmit(
  fn: () => Promise<void> | void,
  opsi: OpsiDebounce = {}
) {
  const { jeda = 1000 } = opsi;
  const [sedangDiblokir, setSedangDiblokir] = useState(false);
  const waktuTerakhir = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const callback = useCallback(async () => {
    const sekarang = Date.now();
    const selisih = sekarang - waktuTerakhir.current;

    // Masih dalam jeda? Abaikan.
    if (selisih < jeda) {
      setSedangDiblokir(true);
      return;
    }

    // Set waktu & jalankan
    waktuTerakhir.current = sekarang;
    setSedangDiblokir(true);

    try {
      await fn();
    } finally {
      // Lepas blokir setelah jeda
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setSedangDiblokir(false);
      }, jeda);
    }
  }, [fn, jeda]);

  return { callback, sedangDiblokir };
}

/**
 * Hook throttle: batasi frekuensi panggilan.
 * Cocok untuk scroll handler, resize, dll.
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  jeda: number
) {
  const terakhir = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      const sekarang = Date.now();
      const selisih = sekarang - terakhir.current;

      if (selisih >= jeda) {
        terakhir.current = sekarang;
        fn(...args);
      } else if (!timeoutRef.current) {
        // Jadwalkan pemanggilan terakhir dalam antrian
        timeoutRef.current = setTimeout(() => {
          terakhir.current = Date.now();
          fn(...args);
          timeoutRef.current = null;
        }, jeda - selisih);
      }
    },
    [fn, jeda]
  );
}
