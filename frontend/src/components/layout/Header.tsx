// ============================================================
//  Header dashboard — tombol menu (mobile), jam realtime,
//  pencarian, dan identitas pengguna dengan menu profil
//  (pengaturan akun & keluar).
// ============================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { JamRealtime } from './JamRealtime';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/hooks/useAuth';
import { inisial } from '@/lib/utils';
import { RUTE } from '@/constants/routes';

export function Header() {
  const bukaSidebar = useUIStore((s) => s.bukaSidebar);
  const { user, isAdmin, logout } = useAuth();
  const router = useRouter();

  const [menuBuka, setMenuBuka] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Tutup menu saat klik di luar atau menekan Escape
  useEffect(() => {
    if (!menuBuka) return;
    const tanganiKlikLuar = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuBuka(false);
      }
    };
    const tanganiEsc = (e: KeyboardEvent) => e.key === 'Escape' && setMenuBuka(false);
    document.addEventListener('mousedown', tanganiKlikLuar);
    document.addEventListener('keydown', tanganiEsc);
    return () => {
      document.removeEventListener('mousedown', tanganiKlikLuar);
      document.removeEventListener('keydown', tanganiEsc);
    };
  }, [menuBuka]);

  const tanganiKeluar = async () => {
    setMenuBuka(false);
    await logout();
    router.push(RUTE.login);
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-white/20 bg-white/80 px-4 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/70 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={bukaSidebar}
          className="-ml-1 rounded-lg p-2 text-primary transition-all hover:bg-primary/5 active:scale-90 lg:hidden"
          aria-label="Buka menu"
        >
          <Icon name="menu" />
        </button>
        <JamRealtime className="hidden sm:flex" />
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        {/* Pencarian */}
        <div className="relative hidden md:block">
          <input
            type="text"
            placeholder="Cari data aset..."
            className="w-56 rounded-full border-none bg-surface-container-low px-5 py-2 font-body-md text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 lg:w-64"
          />
          <Icon
            name="search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
        </div>

        {/* Notifikasi & pengaturan */}
        <div className="hidden items-center gap-1 sm:flex">
          <button className="relative rounded-full p-2 text-on-surface-variant transition-all hover:bg-primary/5">
            <Icon name="notifications" />
            <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-error" />
          </button>
          <Link
            href={RUTE.pengaturan}
            className="rounded-full p-2 text-on-surface-variant transition-all hover:bg-primary/5"
            aria-label="Pengaturan akun"
          >
            <Icon name="settings" />
          </Link>
        </div>

        {/* Menu profil pengguna */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuBuka((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuBuka}
            className="flex items-center gap-3 rounded-full p-1 transition-all hover:bg-primary/5"
          >
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold leading-tight text-on-surface">{user?.nama || 'Pengguna'}</p>
              <p className="text-xs text-on-surface-variant">{isAdmin ? 'Administrator' : 'Peminjam'}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-sm ring-2 ring-primary/20">
              {inisial(user?.nama)}
            </div>
            <Icon
              name="expand_more"
              className={`hidden text-on-surface-variant transition-transform sm:block ${menuBuka ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown */}
          {menuBuka && (
            <div
              role="menu"
              className="absolute right-0 top-full z-30 mt-2 w-64 origin-top-right animate-fade-up overflow-hidden rounded-2xl border border-outline-variant/60 bg-white shadow-xl"
            >
              {/* Identitas */}
              <div className="flex items-center gap-3 border-b border-outline-variant/60 bg-surface-container-low/60 px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {inisial(user?.nama)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-on-surface">{user?.nama || 'Pengguna'}</p>
                  <p className="truncate text-xs text-on-surface-variant">{user?.email}</p>
                </div>
              </div>

              {/* Aksi */}
              <div className="p-1.5">
                <Link
                  href={RUTE.pengaturan}
                  role="menuitem"
                  onClick={() => setMenuBuka(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-on-surface transition-colors hover:bg-primary/5"
                >
                  <Icon name="manage_accounts" className="text-on-surface-variant" />
                  Pengaturan Akun
                </Link>
                <Link
                  href={RUTE.bantuan}
                  role="menuitem"
                  onClick={() => setMenuBuka(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-on-surface transition-colors hover:bg-primary/5"
                >
                  <Icon name="help" className="text-on-surface-variant" />
                  Panduan Penggunaan
                </Link>
                <button
                  onClick={tanganiKeluar}
                  role="menuitem"
                  className="mt-1 flex w-full items-center gap-3 rounded-lg border-t border-outline-variant/60 px-3 py-2.5 text-sm font-medium text-error transition-colors hover:bg-error/5"
                >
                  <Icon name="logout" />
                  Keluar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
