// ============================================================
//  Template area dashboard — membungkus konten halaman dengan
//  transisi masuk (fade + slide-up). Sidebar/Header/Footer di
//  layout tetap diam; hanya konten <main> yang beranimasi tiap
//  navigasi antar halaman dashboard.
// ============================================================

import { PageTransition } from '@/components/shared/PageTransition';

export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return (
    <PageTransition className="mx-auto max-w-container-max space-y-gutter">
      {children}
    </PageTransition>
  );
}
