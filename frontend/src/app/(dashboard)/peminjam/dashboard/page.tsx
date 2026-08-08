// ============================================================
//  Dashboard Peminjam — ringkasan peminjaman pribadi.
// ============================================================

'use client';

import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { KartuStatus } from '@/components/peminjaman/KartuStatus';
import { dashboardService } from '@/services/dashboard.service';
import { useQuery } from '@/lib/cache';
import { cn } from '@/lib/utils';
import { STATUS_PEMINJAMAN, FILTER_STATUS_AKTIF } from '@/constants/status';
import { RUTE } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';

// Palet gradasi per kategori
interface GayaWarna {
  gradient: string;
  iconGradient: string;
  nilai: string;
  hoverBorder: string;
}
const GAYA: Record<string, GayaWarna> = {
  secondary: {
    gradient: 'from-green-400/20 to-emerald-600/20',
    iconGradient: 'from-green-400 to-emerald-600',
    nilai: 'text-green-600',
    hoverBorder: 'hover:border-green-300/50',
  },
  tertiary: {
    gradient: 'from-amber-400/20 to-orange-500/20',
    iconGradient: 'from-amber-400 to-orange-500',
    nilai: 'text-amber-600',
    hoverBorder: 'hover:border-amber-300/50',
  },
  primary: {
    gradient: 'from-primary/20 to-indigo-600/20',
    iconGradient: 'from-primary to-indigo-600',
    nilai: 'text-primary',
    hoverBorder: 'hover:border-primary/50',
  },
};

// Ikon Material per status untuk kartu "Pengajuan terakhir".
const IKON_STATUS: Record<string, string> = {
  DRAFT: 'edit_document',
  MENUNGGU: 'pending_actions',
  DISETUJUI: 'check_circle',
  DITOLAK: 'cancel',
  DIPINJAM: 'sync_alt',
  DIKEMBALIKAN: 'task_alt',
  TERLAMBAT: 'warning',
};

export default function PeminjamDashboardPage() {
  const { user } = useAuth();
  const { data, sedangMemuat } = useQuery('dashboard-peminjam', () => dashboardService.peminjam());

  if (sedangMemuat && !data) return <LoadingSpinner layarPenuh />;
  if (!data) return null;

  const s = data.statistik;
  const kartu = [
    { label: 'Peminjaman Aktif', nilai: s.peminjamanAktif, ikon: 'sync_alt', warna: 'secondary', keterangan: 'Sedang berjalan', filter: FILTER_STATUS_AKTIF },
    { label: 'Menunggu Persetujuan', nilai: s.menunggu, ikon: 'pending_actions', warna: 'tertiary', keterangan: 'Dalam verifikasi', filter: 'MENUNGGU' },
    { label: 'Sudah Dikembalikan', nilai: s.dikembalikan, ikon: 'task_alt', warna: 'secondary', keterangan: 'Selesai dengan baik', filter: 'DIKEMBALIKAN' },
    { label: 'Total Riwayat', nilai: s.totalRiwayat, ikon: 'history', warna: 'primary', keterangan: 'Seluruh aktivitas', filter: undefined },
  ] as const;

  return (
    <div className="space-y-gutter">
      {/* Hero sapaan + aksi cepat */}
      <section className="relative overflow-hidden rounded-2xl bg-brand-gradient p-stack-lg text-white shadow-brand">
        {/* Orb dekoratif lembut sebagai latar */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 right-1/3 h-44 w-44 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-jakarta text-headline-lg text-white">Halo, {user?.nama?.split(' ')[0]} 👋</h1>
            <p className="text-white/80">Berikut ringkasan aktivitas peminjaman Anda.</p>
          </div>
          <Button
            asChild
            className="group relative overflow-hidden bg-white px-5 text-primary shadow-lg hover:-translate-y-0.5 hover:bg-white hover:shadow-xl"
          >
            <Link href={RUTE.peminjamKatalog}>
              {/* Sapuan cahaya yang meluncur saat kursor menyorot */}
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/10 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
              <span className="relative z-10 flex items-center gap-2">
                <Icon name="inventory_2" className="text-[18px] transition-transform duration-300 group-hover:scale-110" fill />
                Jelajahi Katalog
                <Icon name="arrow_forward" className="text-[18px] transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Link>
          </Button>
        </div>
      </section>

      {/* Statistik - gaya Dashboard Overview admin */}
      <section className="rounded-3xl border-2 border-slate-200/50 bg-gradient-to-br from-white to-slate-50 p-8 shadow-lg">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-primary/30">
            <Icon name="space_dashboard" className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="font-jakarta text-xl font-bold text-slate-800">Ringkasan Aktivitas</h2>
            <p className="text-sm text-muted-foreground">Statistik peminjaman Anda</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kartu.map((k, indeks) => {
            const g = GAYA[k.warna];
            return (
              <Link
                key={k.label}
                href={RUTE.peminjamRiwayatStatus(k.filter)}
                aria-label={`Lihat Riwayat Peminjaman: ${k.label}`}
                style={{ animationDelay: `${indeks * 60}ms` }}
                className={cn(
                  'group relative animate-page-in',
                )}
              >
                {/* Glow effect */}
                <div className={cn(
                  'absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-100',
                  g.gradient
                )} />

                {/* Card */}
                <div className={cn(
                  'relative flex flex-col items-center gap-3 rounded-2xl border-2 border-slate-200/50 bg-white p-5 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]',
                  g.hoverBorder
                )}>
                  {/* Gradient top border on hover */}
                  <div className={cn(
                    'absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100',
                    g.iconGradient
                  )} />

                  {/* Icon */}
                  <div className={cn(
                    'flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg transition-transform duration-300 group-hover:scale-110',
                    g.iconGradient
                  )}>
                    <Icon name={k.ikon} className="h-7 w-7 text-white" />
                  </div>

                  {/* Number */}
                  <span className={cn('font-jakarta text-3xl font-bold', g.nilai)}>{k.nilai}</span>

                  {/* Label */}
                  <span className="text-center text-sm font-semibold text-slate-600">{k.label}</span>

                  {/* Arrow */}
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 transition-all duration-300 group-hover:translate-x-1 group-hover:bg-slate-200 opacity-0 group-hover:opacity-100">
                    <Icon name="chevron_right" className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Status terkini */}
      {data.statusTerkini && (
        <div className="flex flex-wrap items-center gap-4 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-white via-white to-primary/5 p-4 shadow-soft transition-shadow hover:shadow-card">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon name={IKON_STATUS[data.statusTerkini.status] ?? 'assignment'} fill />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Pengajuan terakhir Anda</p>
            <p className="truncate font-mono font-semibold text-primary">{data.statusTerkini.kodePeminjaman}</p>
          </div>
          <Badge className={STATUS_PEMINJAMAN[data.statusTerkini.status].kelas}>
            {STATUS_PEMINJAMAN[data.statusTerkini.status].label}
          </Badge>
          <Button asChild variant="outline" size="sm">
            <Link href={RUTE.peminjamRiwayatDetail(data.statusTerkini.id)}>Lihat Detail</Link>
          </Button>
        </div>
      )}

      {/* Peminjaman aktif */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 font-jakarta text-headline-md text-primary">
          <Icon name="assignment_turned_in" className="text-[24px]" />
          Peminjaman Aktif
          {data.daftarAktif.length > 0 && (
            <span className="ml-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-bold text-primary">
              {data.daftarAktif.length}
            </span>
          )}
        </h2>
        {data.daftarAktif.length === 0 ? (
          <EmptyState
            judul="Tidak ada peminjaman aktif"
            deskripsi="Ajukan peminjaman barang untuk memulai."
            aksi={
              <Button asChild>
                <Link href={RUTE.peminjamKatalog}>
                  <PlusCircle className="h-4 w-4" /> Ajukan Sekarang
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.daftarAktif.map((p) => (
              <KartuStatus key={p.id} peminjaman={p} hrefDetail={RUTE.peminjamRiwayatDetail(p.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
