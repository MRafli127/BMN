// ============================================================
//  Mendaftarkan Service Worker untuk PWA (installable + offline).
//  Dirender sekali di root layout.
// ============================================================

'use client';

import { useEffect } from 'react';

export function RegisterSW() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // Di development: JANGAN aktifkan service worker. SW cache-first pada
    // bundle _next/static membuat kode lama tersaji (mis. merk hilang) dan
    // baru pulih setelah refresh. Bersihkan SW + cache yang mungkin sudah ada.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
      if ('caches' in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
      }
      return;
    }

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
