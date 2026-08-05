// ============================================================
//  Provider tingkat aplikasi (client).
//   - Memuat sesi pengguna dari localStorage saat aplikasi dibuka.
//   - Menyegarkan profil dari server bila ada token.
//   - Menyediakan komponen notifikasi (react-hot-toast).
// ============================================================

'use client';

import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import NextTopLoader from 'nextjs-toploader';
import { useAuthStore } from '@/store/authStore';
import { ambilToken } from '@/lib/auth';

export function Providers({ children }: { children: React.ReactNode }) {
  const muatDariSesi = useAuthStore((s) => s.muatDariSesi);
  const segarkanProfil = useAuthStore((s) => s.segarkanProfil);

  useEffect(() => {
    muatDariSesi();
    if (ambilToken()) {
      segarkanProfil();
    }
  }, [muatDariSesi, segarkanProfil]);

  return (
    <>
      {/* Progress bar di atas — muncul seketika saat berpindah halaman */}
      <NextTopLoader
        color="#1e40af"
        height={3}
        shadow="0 0 10px #1e40af,0 0 5px #1e40af"
        showSpinner={false}
        speed={250}
        crawlSpeed={150}
      />
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { fontSize: '14px' },
          success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
          error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />
    </>
  );
}
