// ============================================================
//  Template area dashboard — membungkus konten halaman dengan
//  transisi masuk (fade + slide-up). Sidebar/Header/Footer di
//  layout tetap diam; hanya konten <main> yang beranimasi tiap
//  navigasi antar halaman dashboard.
//
//  Container responsif:
//  - Mobile: lebar penuh
//  - Tablet (sm+): max-w-3xl
//  - Desktop (lg+): max-w-6xl
//  - Wide (2xl+): max-w-7xl
// ============================================================

import { PageTransition } from '@/components/shared/PageTransition';

export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return (
    <PageTransition className="mx-auto w-full sm:max-w-3xl lg:max-w-6xl xl:max-w-7xl space-y-gutter">
      {children}
    </PageTransition>
  );
}
