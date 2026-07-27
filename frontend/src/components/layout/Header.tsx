// ============================================================
//  Header dashboard — tombol menu (mobile), jam realtime,
//  pencarian, dan identitas pengguna dengan menu profil
//  (pengaturan akun & keluar).
//  Ergonomis: search breakpoint md+, identitas md+, jam realtime md+,
//  touch target ≥ 40px, Esc tutup overlay.
// ============================================================

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { JamRealtime } from './JamRealtime';
import { NotificationDropdown } from './NotificationDropdown';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationStore } from '@/store/notificationStore';
import { useIsMobile } from '@/hooks/useIsMobile';
import { inisial, ambilPesanError } from '@/lib/utils';
import { notify } from '@/components/ui/toast';
import { RUTE, RUTE_DEFAULT } from '@/constants/routes';
import { LABEL_ROLE } from '@/constants/roles';
import { searchService } from '@/services/search.service';
import type { Role } from '@/types/user.type';

// Label peran untuk tampilan.
const LABEL_PERAN: Record<Role, string> = {
  ADMIN: LABEL_ROLE.ADMIN,
  PEMINJAM: LABEL_ROLE.PEMINJAM,
  SUPER_ADMIN: LABEL_ROLE.SUPER_ADMIN,
};

export function Header() {
  const bukaSidebar = useUIStore((s) => s.bukaSidebar);
  const { user, isAdmin, logout, roles, bisaGantiRole, gantiRole } = useAuth();
  const notifikasiStore = useNotificationStore();
  const jumlahBelumBaca = notifikasiStore.jumlahBelumBaca ?? 0;
  const init = notifikasiStore.init;
  const router = useRouter();
  const isMobile = useIsMobile();

  const [menuBuka, setMenuBuka] = useState(false);
  const [notifikasiBuka, setNotifikasiBuka] = useState(false);
  const [searchTerbuka, setSearchTerbuka] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHasil, setSearchHasil] = useState<{
    barang: Array<{ id: string; nama: string; kodeBarang: string }>;
    peminjaman: Array<{ id: string; kodePeminjaman: string }>;
  } | null>(null);
  const [sedangCari, setSedangCari] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const notifikasiRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus search input when opened on mobile
  useEffect(() => {
    if (searchTerbuka && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchTerbuka]);

  // Search handler with debounce
  const tanganiSearch = useCallback(async (query: string) => {
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length < 2) {
      setSearchHasil(null);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSedangCari(true);
      try {
        const hasil = await searchService.cari(query);
        setSearchHasil(hasil);
      } catch {
        setSearchHasil(null);
      } finally {
        setSedangCari(false);
      }
    }, 300);
  }, []);

  // Navigate to search result
  const navigasiSearch = (href: string) => {
    setSearchTerbuka(false);
    setSearchQuery('');
    setSearchHasil(null);
    router.push(href);
  };

  // Inisialisasi notifikasi saat mount
  useEffect(() => {
    init();
  }, [init]);

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

  // Ganti peran aktif (akun multi-role) lalu arahkan ke dashboard peran tsb.
  const gantiPeran = async (role: Role) => {
    setMenuBuka(false);
    try {
      await gantiRole(role);
      notify.suksess(`Beralih ke ${LABEL_PERAN[role]}.`);
      router.push(RUTE_DEFAULT[role]);
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal mengganti peran.'));
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-2 border-b border-white/20 bg-white/80 px-4 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/70 sm:gap-4 md:px-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={bukaSidebar}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-primary transition-all hover:bg-primary/5 active:scale-90 md:hidden"
          aria-label="Buka menu navigasi"
        >
          <Icon name="menu" />
        </button>
        {/* Jam realtime: tampil mulai md (tablet) */}
        <JamRealtime className="hidden md:flex" />
      </div>

      <div className="flex items-center gap-2 sm:gap-3 md:gap-5">
        {/* Pencarian — md+ inline, di bawah lg masih inline tapi lebih sempit */}
        <div className="relative hidden md:block">
          <input
            type="text"
            placeholder="Cari data aset..."
            className="w-40 rounded-full border-none bg-surface-container-low px-4 py-2 pr-9 font-body-md text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 lg:w-52 xl:w-64"
          />
          <Icon
            name="search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
        </div>

        {/* Pencarian — Mobile/tablet: icon button */}
        <button
          onClick={() => setSearchTerbuka(true)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-all hover:bg-primary/5 md:hidden"
          aria-label="Buka pencarian"
        >
          <Icon name="search" />
        </button>

        {/* Notifikasi & pengaturan */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <div className="relative" ref={notifikasiRef}>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setNotifikasiBuka((v) => !v);
              }}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-all hover:bg-primary/5"
              aria-label={`Notifikasi${jumlahBelumBaca > 0 ? ` (${jumlahBelumBaca} belum dibaca)` : ''}`}
              aria-haspopup="menu"
              aria-expanded={notifikasiBuka}
            >
              <Icon name="notifications" />
              {jumlahBelumBaca > 0 && (
                <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-error px-1 text-xs font-bold text-white">
                  {jumlahBelumBaca > 9 ? '9+' : jumlahBelumBaca}
                </span>
              )}
            </button>
            <NotificationDropdown
              terbuka={notifikasiBuka}
              onTutup={() => setNotifikasiBuka(false)}
            />
          </div>
          <Link
            href={RUTE.pengaturan}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-all hover:bg-primary/5"
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
              <p className="text-xs text-on-surface-variant">{LABEL_PERAN[user?.activeRole ?? 'PEMINJAM']}</p>
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

              {/* Ganti peran (akun multi-role) */}
              {bisaGantiRole && (
                <div className="border-b border-outline-variant/60 px-3 py-2.5">
                  <p className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-wide text-on-surface-variant">
                    Peran aktif: {LABEL_PERAN[user?.activeRole ?? 'PEMINJAM']}
                  </p>
                  {roles
                    .filter((r) => r !== user?.activeRole)
                    .map((r) => (
                      <button
                        key={r}
                        role="menuitem"
                        onClick={() => gantiPeran(r)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-on-surface transition-colors hover:bg-primary/5"
                      >
                        <Icon name="swap_horiz" className="text-on-surface-variant" />
                        Beralih ke {LABEL_PERAN[r]}
                      </button>
                    ))}
                </div>
              )}

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

      {/* Mobile Search Overlay */}
      {searchTerbuka && isMobile && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-white md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Pencarian"
        >
          {/* Search Header */}
          <div className="flex items-center gap-2 border-b p-4">
            <button
              onClick={() => {
                setSearchTerbuka(false);
                setSearchQuery('');
                setSearchHasil(null);
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high"
              aria-label="Tutup pencarian"
            >
              <Icon name="arrow_back" />
            </button>
            <div className="relative flex-1">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => tanganiSearch(e.target.value)}
                placeholder="Cari barang, peminjaman..."
                className="w-full rounded-full border border-outline-variant bg-surface-container-low py-3 pl-4 pr-10 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                autoComplete="off"
              />
              {sedangCari && (
                <Icon name="progress_activity" className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-primary" />
              )}
            </div>
          </div>

          {/* Search Results */}
          <div className="flex-1 overflow-y-auto p-4">
            {!searchQuery || searchQuery.length < 2 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Icon name="search" className="mb-3 text-5xl opacity-30" />
                <p className="text-sm">Ketik minimal 2 karakter untuk mencari</p>
              </div>
            ) : searchHasil && (searchHasil.barang.length > 0 || searchHasil.peminjaman.length > 0) ? (
              <div className="space-y-4">
                {/* Barang */}
                {searchHasil.barang.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Barang ({searchHasil.barang.length})
                    </p>
                    {searchHasil.barang.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => navigasiSearch(RUTE.adminBarangDetail(item.id))}
                        className="mb-2 flex w-full items-center gap-3 rounded-lg bg-surface-container-low p-3 text-left transition-colors hover:bg-surface-container-high"
                      >
                        <Icon name="inventory_2" className="text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-on-surface">{item.nama}</p>
                          <p className="truncate text-xs text-muted-foreground">{item.kodeBarang}</p>
                        </div>
                        <Icon name="chevron_right" className="text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Peminjaman */}
                {searchHasil.peminjaman.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Peminjaman ({searchHasil.peminjaman.length})
                    </p>
                    {searchHasil.peminjaman.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => navigasiSearch(RUTE.adminPeminjamanDetail(item.id))}
                        className="mb-2 flex w-full items-center gap-3 rounded-lg bg-surface-container-low p-3 text-left transition-colors hover:bg-surface-container-high"
                      >
                        <Icon name="sync_alt" className="text-secondary" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-on-surface">{item.kodePeminjaman}</p>
                        </div>
                        <Icon name="chevron_right" className="text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Icon name="search_off" className="mb-3 text-5xl opacity-30" />
                <p className="text-sm">Tidak ada hasil untuk &quot;{searchQuery}&quot;</p>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
