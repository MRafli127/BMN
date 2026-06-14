// ============================================================
//  Header dashboard — tombol menu (mobile), jam realtime,
//  dan identitas pengguna.
// ============================================================

'use client';

import { Menu } from 'lucide-react';
import { JamRealtime } from './JamRealtime';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/hooks/useAuth';
import { inisial } from '@/lib/utils';

export function Header() {
  const bukaSidebar = useUIStore((s) => s.bukaSidebar);
  const { user, isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b bg-white/80 px-4 shadow-soft backdrop-blur-md supports-[backdrop-filter]:bg-white/70 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={bukaSidebar}
          className="-ml-1 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted active:scale-95 lg:hidden"
          aria-label="Buka menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <JamRealtime className="hidden sm:flex" />
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold leading-tight text-foreground">{user?.nama || 'Pengguna'}</p>
          <p className="text-xs text-muted-foreground">{isAdmin ? 'Administrator' : 'Peminjam'}</p>
        </div>
        <div className="bg-brand-gradient flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white shadow-soft ring-2 ring-white">
          {inisial(user?.nama)}
        </div>
      </div>
    </header>
  );
}
