// ============================================================
//  Bottom Navigation untuk mobile
//  Mengikuti desain SIPP-BMN stitch
//  Ergonomis: touch target ≥ 56px, aria-current, safe-area
// ============================================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { useAuth } from '@/hooks/useAuth';
import { useJumlahKeranjang } from '@/store/keranjangStore';
import { RUTE } from '@/constants/routes';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  iconFilled?: string;
  badge?: number;
}

const buatNavItems = (role: 'ADMIN' | 'PEMINJAM' | 'SUPER_ADMIN', jumlahKeranjang: number): NavItem[] => {
  const items: NavItem[] = [];

  if (role === 'SUPER_ADMIN') {
    // Super Admin
    items.push(
      { label: 'Dashboard', href: RUTE.superAdminDashboard, icon: 'dashboard', iconFilled: 'dashboard' },
      { label: 'Admin', href: RUTE.superAdminAdmin, icon: 'admin_panel_settings', iconFilled: 'admin_panel_settings' },
      { label: 'Barang', href: RUTE.superAdminBarang, icon: 'inventory_2', iconFilled: 'inventory_2' },
      { label: 'Pengguna', href: RUTE.superAdminPengguna, icon: 'group', iconFilled: 'group' },
    );
  } else if (role === 'ADMIN') {
    // Admin
    items.push(
      { label: 'Dashboard', href: RUTE.adminDashboard, icon: 'dashboard', iconFilled: 'dashboard' },
      { label: 'Barang', href: RUTE.adminBarang, icon: 'inventory_2', iconFilled: 'inventory_2' },
      { label: 'Peminjaman', href: RUTE.adminPeminjaman, icon: 'sync_alt', iconFilled: 'sync_alt' },
      { label: 'Pengguna', href: RUTE.adminKategori('peminjam'), icon: 'group', iconFilled: 'group' },
    );
  } else {
    // Peminjam
    items.push(
      { label: 'Dashboard', href: RUTE.peminjamDashboard, icon: 'dashboard', iconFilled: 'dashboard' },
      { label: 'Katalog', href: RUTE.peminjamKatalog, icon: 'inventory_2', iconFilled: 'inventory_2' },
      { label: 'Keranjang', href: RUTE.peminjamKeranjang, icon: 'shopping_cart', iconFilled: 'shopping_cart', badge: jumlahKeranjang > 0 ? jumlahKeranjang : undefined },
      { label: 'Riwayat', href: RUTE.peminjamRiwayat, icon: 'history', iconFilled: 'history' },
    );
  }

  return items;
};

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const jumlahKeranjang = useJumlahKeranjang();
  const activeRole = user?.activeRole ?? 'PEMINJAM';
  const navItems = buatNavItems(activeRole, jumlahKeranjang);

  const isAktif = useCallback((href: string) => pathname === href || (href !== '/' && pathname.startsWith(href)), [pathname]);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-stretch bg-white border-t border-gray-200 pb-safe md:hidden"
      role="navigation"
      aria-label="Navigasi utama"
    >
      {navItems.map((item) => {
        const aktif = isAktif(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={aktif ? 'page' : undefined}
            className={cn(
              'relative flex flex-col-1 flex-col items-center justify-center gap-0.5 min-h-[56px] flex-1 px-2 py-2 transition-all duration-200',
              aktif
                ? 'text-primary font-semibold'
                : 'text-gray-500 hover:text-gray-700 active:text-gray-900'
            )}
          >
            {/* Ikon container */}
            <span
              className={cn(
                'flex items-center justify-center rounded-xl transition-all duration-200',
                aktif ? 'scale-110' : 'opacity-80'
              )}
            >
              <Icon
                name={aktif && item.iconFilled ? item.iconFilled : item.icon}
                fill={!!aktif}
                style={{ fontSize: 24 }}
              />
            </span>
            {/* Label */}
            <span
              className={cn(
                'text-[11px] tracking-tight transition-all duration-200',
                aktif ? 'font-bold' : 'font-medium'
              )}
            >
              {item.label}
            </span>
            {/* Badge */}
            {item.badge != null && item.badge > 0 && (
              <span className="absolute top-1 right-1/4 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white shadow-sm">
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
            {/* Indikator aktif */}
            {aktif && (
              <span className="absolute bottom-1 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-primary/80" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
