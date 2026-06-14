// ============================================================
//  Hook useJamRealtime — mengembalikan waktu saat ini yang
//  diperbarui setiap detik. Mengembalikan null pada render
//  pertama untuk menghindari ketidaksesuaian hidrasi (SSR).
// ============================================================

'use client';

import { useEffect, useState } from 'react';

export function useJamRealtime() {
  const [waktu, setWaktu] = useState<Date | null>(null);

  useEffect(() => {
    setWaktu(new Date()); // set setelah mount (client only)
    const timer = setInterval(() => setWaktu(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return waktu;
}
