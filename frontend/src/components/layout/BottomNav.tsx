// Bottom Navigation untuk mobile
// Mengikuti desain SIPP-BMN stitch

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useRef } from 'react';
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

const buatNavItems = (isAdmin: boolean, jumlahKeranjang: number): NavItem[] => {
  const items: NavItem[] = [
    { label: 'Dashboard', href: isAdmin ? RUTE.adminDashboard : RUTE.peminjamDashboard, icon: 'dashboard', iconFilled: 'dashboard' },
    { label: isAdmin ? 'Barang' : 'Katalog', href: isAdmin ? RUTE.adminBarang : RUTE.peminjamKatalog, icon: 'inventory_2', iconFilled: 'inventory_2' },
  ];
  if (isAdmin) {
    items.push({ label: 'Peminjaman', href: RUTE.adminPeminjaman, icon: 'sync_alt', iconFilled: 'sync_alt' });
    items.push({ label: 'Pengguna', href: RUTE.adminKategori('peminjam'), icon: 'group', iconFilled: 'group' });
  } else {
    items.push({ label: 'Keranjang', href: RUTE.peminjamKeranjang, icon: 'shopping_cart', iconFilled: 'shopping_cart', badge: jumlahKeranjang > 0 ? jumlahKeranjang : undefined });
    items.push({ label: 'Riwayat', href: RUTE.peminjamRiwayat, icon: 'history', iconFilled: 'history' });
  }
  return items;
};

export function BottomNav() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  const jumlahKeranjang = useJumlahKeranjang();
  const navItems = buatNavItems(isAdmin, jumlahKeranjang);

  const isAktif = useCallback((href: string) => pathname === href || (href !== '/' && pathname.startsWith(href)), [pathname]);

  return (
    <nav className={cn('fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 bg-white border-t border-gray-200 md:hidden')}>
      {navItems.map((item) => {
        const aktif = isAktif(item.href);
        return (
          <Link key={item.href} href={item.href} className={cn('relative flex flex-col items-center justify-center px-3 py-1 rounded-xl transition-all', aktif ? 'text-primary bg-blue-100 scale-95' : 'text-gray-500 opacity-70')}>
            <Icon name={aktif && item.iconFilled ? item.iconFilled : item.icon} fill={aktif ? 1 : 0} style={{ fontSize: 24 }} />
            <span className="text-[12px] font-medium mt-1">{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span className="absolute -top-0.5 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-medium text-white">
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
