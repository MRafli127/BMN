// ============================================================
//  Template area autentikasi (login & register) — transisi
//  masuk fade + slide-up tiap berpindah antar halaman auth.
// ============================================================

import { PageTransition } from '@/components/shared/PageTransition';

export default function AuthTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
