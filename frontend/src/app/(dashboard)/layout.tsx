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
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { RUTE } from '@/constants/routes';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, sedangMemuat } = useAuth();
  const router = useRouter();

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
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 p-4 md:p-6">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
