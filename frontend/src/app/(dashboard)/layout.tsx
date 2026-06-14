// ============================================================
//  Layout area dashboard (admin & peminjam).
//  Menampilkan sidebar, header, dan footer. Memastikan
//  pengguna sudah login (proteksi sisi klien sebagai pelengkap
//  middleware.ts).
// ============================================================

'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { RUTE } from '@/constants/routes';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, sedangMemuat } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!sedangMemuat && !user) {
      router.replace(RUTE.login);
    }
  }, [sedangMemuat, user, router]);

  if (sedangMemuat) {
    return <LoadingSpinner layarPenuh teks="Memuat aplikasi..." />;
  }
  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 p-margin-mobile sm:p-6 lg:p-margin-desktop">
          <div key={pathname} className="mx-auto max-w-container-max animate-fade-up space-y-gutter">
            {children}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
