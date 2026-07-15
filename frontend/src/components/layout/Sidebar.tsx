// ============================================================
//  Sidebar navigasi — menu menyesuaikan peran pengguna.
//  Tema biru royal (lebih cerah dari navy) dengan aksen hijau;
//  item aktif tampil sebagai pill putih + efek riak saat klik.
// ============================================================

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { cn, ambilPesanError, inisial } from '@/lib/utils';
import { buatRipple } from '@/lib/ripple';
import { notify } from '@/components/ui/toast';
import { RUTE, RUTE_DEFAULT } from '@/constants/routes';
import { LABEL_ROLE } from '@/constants/roles';
import { useAuth } from '@/hooks/useAuth';
import { useUIStore } from '@/store/uiStore';
import { useJumlahKeranjang } from '@/store/keranjangStore';
import type { Role } from '@/types/user.type';

// Label peran untuk tampilan tombol beralih.
const LABEL_PERAN: Record<Role, string> = {
  ADMIN: LABEL_ROLE.ADMIN,
  PEMINJAM: LABEL_ROLE.PEMINJAM,
  SUPER_ADMIN: LABEL_ROLE.SUPER_ADMIN,
};

interface ItemMenu {
  label: string;
  href: string;
  ikon: string;
}

const menuSuperAdmin: ItemMenu[] = [
  { label: 'Dashboard', href: RUTE.superAdminDashboard, ikon: 'dashboard' },
  { label: 'Manajemen Admin', href: RUTE.superAdminAdmin, ikon: 'admin_panel_settings' },
  { label: 'Manajemen Barang', href: RUTE.superAdminBarang, ikon: 'inventory_2' },
  { label: 'Pengguna Terdaftar', href: RUTE.superAdminPengguna, ikon: 'group' },
  { label: 'Manajemen Peminjaman', href: RUTE.superAdminPeminjaman, ikon: 'sync_alt' },
  { label: 'Manajemen Satker', href: RUTE.superAdminSatker, ikon: 'location_city' },
  { label: 'Log Aktivitas', href: RUTE.superAdminLogs, ikon: 'history' },
];

const menuAdmin: ItemMenu[] = [
  { label: 'Dashboard', href: RUTE.adminDashboard, ikon: 'dashboard' },
  { label: 'Manajemen Barang', href: RUTE.adminBarang, ikon: 'inventory_2' },
  { label: 'Manajemen Peminjaman', href: RUTE.adminPeminjaman, ikon: 'sync_alt' },
  { label: 'Pengguna Terdaftar', href: RUTE.adminKategori('peminjam'), ikon: 'group' },
  { label: 'Scan Pengembalian', href: RUTE.adminScan, ikon: 'qr_code_scanner' },
  { label: 'Log Import', href: RUTE.adminLogImport, ikon: 'upload_file' },
];

const menuPeminjam: ItemMenu[] = [
  { label: 'Dashboard', href: RUTE.peminjamDashboard, ikon: 'dashboard' },
  { label: 'Katalog Barang', href: RUTE.peminjamKatalog, ikon: 'inventory_2' },
  { label: 'Keranjang', href: RUTE.peminjamKeranjang, ikon: 'shopping_cart' },
  { label: 'Riwayat Peminjaman', href: RUTE.peminjamRiwayat, ikon: 'history' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isSuperAdmin, isAdmin, logout, user, roles, bisaGantiRole, gantiRole } = useAuth();
  const { sidebarTerbuka, tutupSidebar } = useUIStore();
  const jumlahKeranjang = useJumlahKeranjang();

  // Tentukan menu berdasarkan role aktif
  const menu = isSuperAdmin ? menuSuperAdmin : isAdmin ? menuAdmin : menuPeminjam;
  // Label untuk badge role
  const labelRole = LABEL_PERAN[user.activeRole];
  // Panduan selalu tampil untuk semua peran → digabung agar satu pemetaan.
  const semuaMenu: ItemMenu[] = [...menu, { label: 'Panduan Penggunaan', href: RUTE.bantuan, ikon: 'menu_book' }];

  // Logo mengarah ke dashboard sesuai peran (bukan landing page)
  const berandaHref = isSuperAdmin ? RUTE.superAdminDashboard : isAdmin ? RUTE.adminDashboard : RUTE.peminjamDashboard;

  // Keluar lalu arahkan ke halaman login
  const tanganiKeluar = async () => {
    await logout();
    router.push(RUTE.login);
  };

  // Ganti peran aktif (akun multi-role) lalu arahkan ke dashboard peran tsb.
  const gantiPeran = async (role: Role) => {
    tutupSidebar();
    try {
      await gantiRole(role);
      notify.suksess(`Beralih ke ${LABEL_PERAN[role]}.`);
      router.push(RUTE_DEFAULT[role]);
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal mengganti peran.'));
    }
  };

  const isAktif = (href: string) =>
    pathname === href ||
    (href !== RUTE.adminDashboard && href !== RUTE.peminjamDashboard && pathname.startsWith(href));

  // Kelas satu item navigasi (aktif = pill putih kontras di atas biru).
  const kelasItem = (aktif: boolean) =>
    cn(
      'group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 transition-all duration-200 active:scale-[0.99]',
      aktif
        ? 'bg-white font-bold text-primary shadow-lg shadow-blue-950/30 [--ripple-c:rgba(30,64,175,0.14)]'
        : 'text-white/80 hover:translate-x-1 hover:bg-white/10 hover:text-white'
    );

  return (
    <>
      {/* Overlay untuk mobile */}
      {sidebarTerbuka && (
        <div
          className="fixed inset-0 z-30 bg-on-surface/50 backdrop-blur-sm md:hidden"
          onClick={tutupSidebar}
          aria-hidden
        />
      )}

      <aside
        style={{ backgroundImage: 'linear-gradient(180deg, #1e3a8a 0%, #1d4ed8 52%, #2563eb 100%)' }}
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-[17rem] max-w-[85vw] flex-col overflow-hidden py-stack-lg text-white shadow-2xl transition-transform duration-300 ease-out',
          // Desktop: tetap diam saat halaman di-scroll (sticky setinggi layar).
          // md+ = desktop, di bawah itu = mobile dengan BottomNav
          'md:sticky md:top-0 md:h-screen md:max-h-screen md:max-w-none md:translate-x-0 md:self-start',
          sidebarTerbuka ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Aksen dekoratif: glow lembut cyan & hijau di atas biru royal */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="absolute -right-24 top-1/3 h-56 w-56 rounded-full bg-secondary-container/20 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-blue-950/30 to-transparent" />
        </div>

        {/* Konten (di atas aksen dekoratif) */}
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          {/* Header logo — panel putih agar teks logo tetap terbaca */}
          <div className="mb-5 flex items-center justify-between gap-2 px-4">
            <Link
              href={berandaHref}
              className="flex flex-1 items-center overflow-hidden rounded-2xl bg-white px-3 py-2 shadow-lg shadow-blue-950/25 ring-1 ring-white/40 transition-transform duration-200 hover:scale-[1.02] active:scale-[0.99]"
            >
              <Image
                src="/images/logo-kemenkeu.png"
                alt="Logo Kementerian Keuangan"
                width={200}
                height={56}
                style={{ width: 'auto', height: 'auto' }}
                className="object-contain"
              />
            </Link>
            <button
              onClick={tutupSidebar}
              className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white md:hidden"
              aria-label="Tutup menu"
            >
              <Icon name="close" />
            </button>
          </div>

          {/* Identitas pengguna */}
          <div className="mx-3 mb-3 flex animate-page-in items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-3 py-3 shadow-lg shadow-blue-950/10 backdrop-blur-md">
            <div className="relative shrink-0">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-white/30 to-white/5 text-sm font-bold ring-2 ring-white/25">
                {inisial(user?.nama)}
              </div>
              {/* Titik status online (ping halus) */}
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary-container opacity-60" />
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-blue-800 bg-secondary-container" />
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight">{user?.nama || 'Pengguna'}</p>
              <span className="mt-1 inline-flex max-w-full items-center truncate rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-bold text-white/90 ring-1 ring-white/20">
                {labelRole}
              </span>
            </div>
          </div>

          {/* Beralih peran (akun multi-role) — tepat di bawah logo & identitas */}
          {/* SUPER_ADMIN tidak bisa beralih ke role lain */}
          {bisaGantiRole && !isSuperAdmin && (
            <div className="mx-3 mb-3 animate-page-in" style={{ animationDelay: '60ms' }}>
              {roles
                .filter((r) => r !== user?.activeRole)
                .map((r) => (
                  <button
                    key={r}
                    onClick={(e) => {
                      buatRipple(e);
                      gantiPeran(r);
                    }}
                    className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:border-secondary-container/60 hover:bg-white/15 active:scale-[0.99]"
                  >
                    <Icon
                      name="swap_horiz"
                      className="text-secondary-container transition-transform duration-300 group-hover:rotate-180"
                      style={{ fontSize: 20 }}
                    />
                    Beralih ke {LABEL_PERAN[r]}
                  </button>
                ))}
            </div>
          )}

          {/* Label seksi menu */}
          <p className="mb-1 px-5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Menu Utama</p>

          {/* Menu navigasi */}
          <nav className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3 pb-2">
            {semuaMenu.map((item, indeks) => {
              const aktif = isAktif(item.href);
              const badge = item.href === RUTE.peminjamKeranjang ? jumlahKeranjang : undefined;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => {
                    buatRipple(e);
                    tutupSidebar();
                  }}
                  aria-current={aktif ? 'page' : undefined}
                  // Muncul berurutan saat sidebar dimuat (stagger).
                  style={{ animationDelay: `${100 + indeks * 45}ms` }}
                  className={cn(kelasItem(aktif), 'animate-page-in')}
                >
                  {/* Aksen kiri hijau menyala saat aktif */}
                  {aktif && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-secondary shadow-[0_0_10px_rgba(0,108,73,0.6)]"
                    />
                  )}
                  <span
                    className={cn(
                      'grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-all duration-200',
                      aktif
                        ? 'bg-gradient-to-br from-primary to-primary-container text-white shadow-md'
                        : 'bg-white/10 text-white/90 ring-1 ring-white/10 group-hover:scale-110 group-hover:bg-white group-hover:text-primary'
                    )}
                  >
                    <Icon name={item.ikon} fill={aktif} style={{ fontSize: 22 }} />
                  </span>
                  <span className="font-label-md">{item.label}</span>
                  {badge != null && badge > 0 ? (
                    <span
                      className={cn(
                        'ml-auto inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold shadow transition-transform duration-200 group-hover:scale-110',
                        aktif
                          ? 'bg-primary text-white'
                          : 'bg-secondary-container text-on-secondary-container'
                      )}
                    >
                      {badge}
                    </span>
                  ) : (
                    !aktif && (
                      <Icon
                        name="chevron_right"
                        className="ml-auto -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                        style={{ fontSize: 18 }}
                      />
                    )
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Tombol keluar */}
          <div className="mt-2 px-3 pt-3">
            <div className="mb-2 h-px bg-white/15" />
            <button
              onClick={(e) => {
                buatRipple(e);
                tanganiKeluar();
              }}
              className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-white/80 transition-all duration-200 hover:bg-error/25 hover:text-white active:scale-[0.99]"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-error-container ring-1 ring-white/10 transition-all duration-200 group-hover:scale-110 group-hover:bg-error group-hover:text-white">
                <Icon name="logout" style={{ fontSize: 22 }} />
              </span>
              <span className="font-label-md font-semibold">Keluar Sesi</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
