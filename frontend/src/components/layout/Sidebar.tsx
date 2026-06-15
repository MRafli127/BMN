// ============================================================
//  Sidebar navigasi — menu menyesuaikan peran pengguna.
// ============================================================

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { RUTE } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';

interface ItemMenu {
  label: string;
  href: string;
  ikon: string;
}

const menuAdmin: ItemMenu[] = [
  { label: 'Dashboard', href: RUTE.adminDashboard, ikon: 'dashboard' },
  { label: 'Manajemen Barang', href: RUTE.adminBarang, ikon: 'inventory_2' },
  { label: 'Manajemen Peminjaman', href: RUTE.adminPeminjaman, ikon: 'sync_alt' },
  { label: 'Scan Pengembalian', href: RUTE.adminScan, ikon: 'qr_code_scanner' },
];

const menuPeminjam: ItemMenu[] = [
  { label: 'Dashboard', href: RUTE.peminjamDashboard, ikon: 'dashboard' },
  { label: 'Katalog Barang', href: RUTE.peminjamKatalog, ikon: 'inventory_2' },
  { label: 'Ajukan Peminjaman', href: RUTE.peminjamAjukan, ikon: 'post_add' },
  { label: 'Riwayat Peminjaman', href: RUTE.peminjamRiwayat, ikon: 'history' },
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
    pathname === href ||
    (href !== RUTE.adminDashboard && href !== RUTE.peminjamDashboard && pathname.startsWith(href));

  return (
    <>
      {/* Overlay untuk mobile */}
      {sidebarTerbuka && (
        <div
          className="fixed inset-0 z-30 bg-on-surface/50 backdrop-blur-sm lg:hidden"
          onClick={tutupSidebar}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[17rem] max-w-[85vw] flex-col bg-primary py-stack-lg text-white shadow-xl transition-transform duration-300 ease-out lg:static lg:max-w-none lg:translate-x-0',
          sidebarTerbuka ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header logo */}
        <div className="mb-8 flex items-center justify-between gap-2 px-6">
          <Link href={berandaHref} className="flex items-center overflow-hidden">
            <Image src="/images/logo-kemenkeu.png" alt="Logo Kementerian Keuangan" width={200} height={56} className="object-contain" />
          </Link>
          <button onClick={tutupSidebar} className="rounded-md p-1 hover:bg-white/10 lg:hidden">
            <Icon name="close" className="text-white" />
          </button>
        </div>

        {/* Identitas pengguna */}
        <div className="mx-4 mb-2 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-md">
          <p className="truncate text-sm font-bold">{user?.nama || 'Pengguna'}</p>
          <p className="text-xs text-white/70">{isAdmin ? 'Administrator' : 'Peminjam'}</p>
        </div>

        {/* Menu navigasi */}
        <nav className="custom-scrollbar mt-4 flex flex-1 flex-col gap-1 overflow-y-auto">
          {menu.map((item) => {
            const aktif = isAktif(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={tutupSidebar}
                aria-current={aktif ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-4 px-6 py-4 transition-all hover:translate-x-1',
                  aktif
                    ? 'border-l-4 border-secondary bg-white/10 font-bold text-white backdrop-blur-lg'
                    : 'text-white/70 hover:bg-white/5'
                )}
              >
                <Icon name={item.ikon} fill={aktif} />
                <span className="font-label-md">{item.label}</span>
              </Link>
            );
          })}

          <Link
            href={RUTE.bantuan}
            onClick={tutupSidebar}
            aria-current={pathname === RUTE.bantuan ? 'page' : undefined}
            className={cn(
              'flex items-center gap-4 px-6 py-4 transition-all hover:translate-x-1',
              pathname === RUTE.bantuan
                ? 'border-l-4 border-secondary bg-white/10 font-bold text-white backdrop-blur-lg'
                : 'text-white/70 hover:bg-white/5'
            )}
          >
            <Icon name="menu_book" fill={pathname === RUTE.bantuan} />
            <span className="font-label-md">Panduan Penggunaan</span>
          </Link>
        </nav>

        {/* Tombol keluar */}
        <div className="mt-auto border-t border-white/10 pt-4">
          <button
            onClick={tanganiKeluar}
            className="flex w-full items-center gap-4 px-6 py-4 text-white/70 transition-all hover:translate-x-1 hover:bg-white/5"
          >
            <Icon name="logout" className="text-error-container" />
            <span className="font-label-md">Keluar Sesi</span>
          </button>
        </div>
      </aside>
    </>
  );
}
