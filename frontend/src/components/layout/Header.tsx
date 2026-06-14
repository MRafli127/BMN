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
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b bg-white/90 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={bukaSidebar}
          className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
          aria-label="Buka menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <JamRealtime className="hidden sm:flex" />
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-foreground">{user?.nama || 'Pengguna'}</p>
          <p className="text-xs text-muted-foreground">{isAdmin ? 'Administrator' : 'Peminjam'}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
          {inisial(user?.nama)}
        </div>
      </div>
    </header>
  );
}
