// ============================================================
//  Sidebar navigasi — menu menyesuaikan peran pengguna.
// ============================================================

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  ScanLine,
  BookOpen,
  LogOut,
  Boxes,
  History,
  PlusCircle,
  ShieldCheck,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RUTE } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';

interface ItemMenu {
  label: string;
  href: string;
  ikon: typeof LayoutDashboard;
}

const menuAdmin: ItemMenu[] = [
  { label: 'Dashboard', href: RUTE.adminDashboard, ikon: LayoutDashboard },
  { label: 'Manajemen Barang', href: RUTE.adminBarang, ikon: Package },
  { label: 'Manajemen Peminjaman', href: RUTE.adminPeminjaman, ikon: ClipboardList },
  { label: 'Scan Pengembalian', href: RUTE.adminScan, ikon: ScanLine },
];

const menuPeminjam: ItemMenu[] = [
  { label: 'Dashboard', href: RUTE.peminjamDashboard, ikon: LayoutDashboard },
  { label: 'Katalog Barang', href: RUTE.peminjamKatalog, ikon: Boxes },
  { label: 'Ajukan Peminjaman', href: RUTE.peminjamAjukan, ikon: PlusCircle },
  { label: 'Riwayat Peminjaman', href: RUTE.peminjamRiwayat, ikon: History },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, logout, user } = useAuth();
  const { sidebarTerbuka, tutupSidebar } = useUIStore();

  const menu = isAdmin ? menuAdmin : menuPeminjam;

  // Logo mengarah ke dashboard sesuai peran (bukan landing page)
  const berandaHref = isAdmin ? RUTE.adminDashboard : RUTE.peminjamDashboard;

  // Keluar lalu arahkan ke halaman login
  const tanganiKeluar = async () => {
    await logout();
    router.push(RUTE.login);
  };

  const isAktif = (href: string) =>
    pathname === href || (href !== RUTE.adminDashboard && href !== RUTE.peminjamDashboard && pathname.startsWith(href));

  return (
    <>
      {/* Overlay untuk mobile */}
      {sidebarTerbuka && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={tutupSidebar} aria-hidden />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-brand-700 text-white transition-transform duration-300 lg:static lg:translate-x-0',
          sidebarTerbuka ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header logo */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-5 py-4">
          <Link href={berandaHref} className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-base font-bold leading-tight">SIPP-BMN</p>
              <p className="text-[11px] text-white/70">Peminjaman Barang Milik Negara</p>
            </div>
          </Link>
          <button onClick={tutupSidebar} className="rounded-md p-1 hover:bg-white/10 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Identitas pengguna */}
        <div className="mx-4 mt-4 rounded-lg bg-white/10 px-4 py-3">
          <p className="truncate text-sm font-semibold">{user?.nama || 'Pengguna'}</p>
          <p className="text-xs text-white/70">{isAdmin ? 'Administrator' : 'Peminjam'}</p>
        </div>

        {/* Menu navigasi */}
        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3">
          {menu.map((item) => {
            const Ikon = item.ikon;
            const aktif = isAktif(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={tutupSidebar}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  aktif ? 'bg-white text-brand-700 shadow' : 'text-white/85 hover:bg-white/10'
                )}
              >
                <Ikon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}

          <div className="my-3 border-t border-white/10" />

          <Link
            href={RUTE.bantuan}
            onClick={tutupSidebar}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              pathname === RUTE.bantuan ? 'bg-white text-brand-700 shadow' : 'text-white/85 hover:bg-white/10'
            )}
          >
            <BookOpen className="h-5 w-5 shrink-0" />
            Panduan Penggunaan
          </Link>
        </nav>

        {/* Tombol keluar */}
        <div className="border-t border-white/10 p-3">
          <button
            onClick={tanganiKeluar}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/85 transition-colors hover:bg-red-500/80 hover:text-white"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Keluar
          </button>
        </div>
      </aside>
    </>
  );
}
