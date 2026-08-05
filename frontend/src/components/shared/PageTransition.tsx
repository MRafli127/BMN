// ============================================================
//  Pembungkus transisi antar halaman (fade + slide-up halus).
//  Dipakai oleh file `template.tsx` di tiap grup rute. Karena
//  `template.tsx` membuat instance baru tiap navigasi, animasi
//  CSS `animate-page-in` otomatis berjalan ulang setiap pindah
//  halaman tanpa perlu trik `key`.
//  Animasi otomatis nonaktif bila pengguna memilih gerak minimal
//  (prefers-reduced-motion) — diatur global di globals.css.
// ============================================================

import { cn } from '@/lib/utils';

export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('animate-page-in', className)}>{children}</div>;
}
