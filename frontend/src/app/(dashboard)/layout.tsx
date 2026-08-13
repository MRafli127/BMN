// ============================================================
//  Layout area dashboard (admin & peminjam).
//  Menampilkan sidebar, header, dan footer. Memastikan
//  pengguna sudah login (proteksi sisi klien sebagai pelengkap
//  middleware.ts).
// ============================================================

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { Header } from '@/components/layout/Header';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { useSessionSecurity } from '@/hooks/useSessionSecurity';
import { RUTE } from '@/constants/routes';
import { useIsMobile } from '@/hooks/useIsMobile';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, sedangMemuat } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();

  // Aktifkan keamanan sesi (tab close detection & inactivity timeout)
  useSessionSecurity();

  useEffect(() => {
    if (!sedangMemuat && !user) {
      router.replace(RUTE.login);
    }
  }, [sedangMemuat, user, router]);

  // Cegah drag & drop dengan event listener
  useEffect(() => {
    const events = [
      'dragstart', 'drag', 'dragend', 'dragover', 'dragenter', 'dragleave', 'drop'
    ];

    const handler = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    events.forEach(event => {
      document.addEventListener(event, handler, true);
    });

    // Nonaktifkan draggable secara berkala
    const interval = setInterval(() => {
      document.querySelectorAll('[draggable="true"]').forEach((el) => {
        (el as HTMLElement).setAttribute('draggable', 'false');
      });
    }, 500);

    const observer = new MutationObserver(() => {
      document.querySelectorAll('[draggable="true"]').forEach((el) => {
        (el as HTMLElement).setAttribute('draggable', 'false');
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handler, true);
      });
      clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  if (sedangMemuat) {
    return <LoadingSpinner layarPenuh teks="Memuat aplikasi..." />;
  }
  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-background" aria-label="Layout aplikasi dashboard">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main
          className={
            'flex-1 px-5 sm:px-6 lg:px-8 xl:px-10'
            // Mobile: extra padding bottom untuk BottomNav
            + (isMobile ? ' pb-safe' : '')
          }
        >
          {children}
        </main>
      </div>
      {/* Bottom Navigation untuk Mobile */}
      <BottomNav />
    </div>
  );
}
