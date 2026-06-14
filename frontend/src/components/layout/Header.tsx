// ============================================================
//  Header dashboard — tombol menu (mobile), jam realtime,
//  pencarian, dan identitas pengguna.
// ============================================================

'use client';

import { Icon } from '@/components/ui/icon';
import { JamRealtime } from './JamRealtime';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/hooks/useAuth';
import { inisial } from '@/lib/utils';

export function Header() {
  const bukaSidebar = useUIStore((s) => s.bukaSidebar);
  const { user, isAdmin } = useAuth();

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
          <button className="rounded-full p-2 text-on-surface-variant transition-all hover:bg-primary/5">
            <Icon name="settings" />
          </button>
        </div>

        {/* Identitas pengguna */}
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold leading-tight text-on-surface">{user?.nama || 'Pengguna'}</p>
            <p className="text-xs text-on-surface-variant">{isAdmin ? 'Administrator' : 'Peminjam'}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-sm ring-2 ring-primary/20">
            {inisial(user?.nama)}
          </div>
        </div>
      </div>
    </header>
  );
}
