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

interface GayaWarna {
  orb: string;
  ikonBox: string;
  nilai: string;
  gradasi: string;
  garis: string;
}

// Kelas literal per warna (agar terdeteksi JIT Tailwind)
const GAYA: Record<string, GayaWarna> = {
  primary: { orb: 'bg-primary/10 group-hover:bg-primary/20', ikonBox: 'bg-primary/10 text-primary', nilai: 'text-primary', gradasi: 'bg-gradient-to-br from-white via-white to-primary/10 hover:to-primary/20', garis: 'border-primary/20 hover:border-primary/30' },
  tertiary: { orb: 'bg-tertiary/10 group-hover:bg-tertiary/20', ikonBox: 'bg-tertiary/10 text-tertiary', nilai: 'text-tertiary', gradasi: 'bg-gradient-to-br from-white via-white to-tertiary/10 hover:to-tertiary/20', garis: 'border-tertiary/20 hover:border-tertiary/30' },
  secondary: { orb: 'bg-secondary/10 group-hover:bg-secondary/20', ikonBox: 'bg-secondary/10 text-secondary', nilai: 'text-secondary', gradasi: 'bg-gradient-to-br from-white via-white to-secondary/10 hover:to-secondary/20', garis: 'border-secondary/20 hover:border-secondary/30' },
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

      {/* Statistik */}
      <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
        {kartu.map((k, indeks) => {
          const g = GAYA[k.warna];
          return (
            <Link
              key={k.label}
              href={RUTE.peminjamRiwayatStatus(k.filter)}
              aria-label={`Lihat Riwayat Peminjaman: ${k.label}`}
              // Muncul berurutan saat halaman dimuat (stagger).
              style={{ animationDelay: `${indeks * 60}ms` }}
              className={cn(
                'group relative block overflow-hidden rounded-2xl border p-stack-lg transition-all duration-300 animate-page-in hover:-translate-y-1 hover:shadow-elevated active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                g.gradasi,
                g.garis,
              )}
            >
              <div className={cn('absolute -right-4 -top-4 h-24 w-24 rounded-full blur-2xl transition-colors', g.orb)} />
              <div className={cn('mb-4 flex h-12 w-12 items-center justify-center rounded-xl', g.ikonBox)}>
                <Icon name={k.ikon} fill />
              </div>
              <p className="font-label-md uppercase tracking-wider text-on-surface-variant">{k.label}</p>
              <h3 className={cn('mt-1 font-jakarta text-headline-lg', g.nilai)}>{k.nilai}</h3>
              <p className="mt-2 font-label-sm text-on-surface-variant">{k.keterangan}</p>
              <Icon
                name="arrow_forward"
                className="absolute bottom-4 right-4 text-[18px] text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100"
              />
            </Link>
          );
        })}
      </div>

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
