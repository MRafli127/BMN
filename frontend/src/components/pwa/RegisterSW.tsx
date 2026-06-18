// ============================================================
//  Mendaftarkan Service Worker untuk PWA (installable + offline).
//  Dirender sekali di root layout.
// ============================================================

'use client';

import { useEffect } from 'react';

export function RegisterSW() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const daftar = () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Pendaftaran service worker gagal:', err);
      });
    };
    // Daftarkan setelah load agar tidak mengganggu render awal
    if (document.readyState === 'complete') daftar();
    else window.addEventListener('load', daftar, { once: true });
  }, []);

  return null;
}
