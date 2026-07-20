// ============================================================
//  Dashboard Super Admin — ringkasan statistik sistem.
//  Optimized: Suspense boundary, streaming, prefetch on hover
// ============================================================

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { StatCardsSkeleton } from '@/components/shared/SuperAdminSkeleton';
import { dashboardService } from '@/services/dashboard.service';
import { RUTE } from '@/constants/routes';
import { cn } from '@/lib/utils';

// Data kartu kode satker - semua 7 satker dengan nama lengkap
const KODE_SATKER = [
  { kode: '015110199411868000KP', label: 'Sekretariat Badan Pendidikan dan Pelatihan Keuangan' },
  { kode: '015110199411868001KP', label: 'Pusat Pembinaan Jabatan Fungsional dan Peminjaman Mutu' },
  { kode: '015110199411868002KP', label: 'Pusat Pendidikan dan Pelatihan Anggaran dan Pembendaharaan' },
  { kode: '015110199411868003KP', label: 'Pusat Pendidikan dan Pelatihan Pajak' },
  { kode: '015110199411868004KP', label: 'Pusat Pendidikan dan Pelatihan Bea dan Cukai' },
  { kode: '015110199411868005KP', label: 'Pusat Pendidikan dan Pelatihan Keuangan Publik' },
  { kode: '015110199411868006KP', label: 'Pusat Pendidikan dan Pelatihan Kepemimpinan dan Manajemen' },
];

// ============================================================
//  Stat Card Component - mengikuti gaya admin dashboard
// ============================================================
function StatCardItem({
  stat,
  index,
}: {
  stat: { label: string; value: number; ikon: string; warna: string; href?: string };
  index: number;
}) {
  return (
    <Link
      href={stat.href || '#'}
      className="group relative rounded-2xl border-2 border-slate-200/50 bg-white p-5 shadow-md transition-all duration-300 hover:border-slate-300/70 hover:shadow-xl hover:-translate-y-1 animate-page-in"
      style={{ animationDelay: `${index * 50}ms` }}
      prefetch={true}
    >
      {/* Gradient top border on hover */}
      <div className={cn(
        'absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100',
        stat.warna.includes('blue') ? 'from-blue-400 to-blue-600' :
        stat.warna.includes('green') ? 'from-green-400 to-green-600' :
        stat.warna.includes('purple') ? 'from-purple-400 to-purple-600' :
        stat.warna.includes('teal') ? 'from-teal-400 to-teal-600' :
        stat.warna.includes('orange') ? 'from-orange-400 to-orange-600' :
        stat.warna.includes('yellow') ? 'from-yellow-400 to-yellow-600' :
        stat.warna.includes('red') ? 'from-red-400 to-red-600' :
        stat.warna.includes('indigo') ? 'from-indigo-400 to-indigo-600' : 'from-primary to-indigo-600'
      )} />

      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-500">{stat.label}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{stat.value.toLocaleString('id-ID')}</p>
        </div>
        <div className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:shadow-xl',
          stat.warna
        )}>
          <Icon name={stat.ikon} style={{ fontSize: 24 }} />
        </div>
      </div>
    </Link>
  );
}

// ============================================================
//  Quick Action Button - mengikuti gaya admin dashboard
// ============================================================
function QuickActionButton({
  label,
  href,
  ikon,
  warna,
  index,
}: {
  label: string;
  href: string;
  ikon: string;
  warna: string;
  index: number;
}) {
  return (
    <Link
      href={href}
      prefetch={true}
      className="group relative flex flex-col items-center gap-3 rounded-2xl border-2 border-slate-200/50 bg-white p-4 shadow-md transition-all duration-300 hover:border-slate-300/70 hover:shadow-xl hover:-translate-y-1 animate-page-in"
      style={{ animationDelay: `${400 + index * 50}ms` }}
    >
      {/* Gradient top border on hover */}
      <div className={cn(
        'absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100',
        warna.replace('bg-', 'from-').replace('-500', '-400').replace('-600', '-500'),
        warna.replace('bg-', 'to-').replace('-500', '-600')
      )} />

      <div className={cn(
        'flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:shadow-xl',
        warna
      )}>
        <Icon name={ikon} style={{ fontSize: 24 }} />
      </div>
      <span className="text-center text-sm font-semibold text-slate-600 transition-colors group-hover:text-primary">{label}</span>
    </Link>
  );
}

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Array<{ label: string; value: number; ikon: string; warna: string; href?: string }>>([]);
  const [statistikSatker, setStatistikSatker] = useState<Array<{
    kodeSatker: string;
    jumlahBarang: number;
    jumlahPeminjaman: number;
  }>>([]);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  // Map statistik satker dengan nama - TAMPILKAN SEMUA 7 SATKER
  const statistikSatkerDenganNama = KODE_SATKER.map(satker => {
    const data = statistikSatker.find(s => s.kodeSatker === satker.kode);
    return {
      kodeSatker: satker.kode,
      nama: satker.label,
      jumlahBarang: data?.jumlahBarang ?? 0,
      jumlahPeminjaman: data?.jumlahPeminjaman ?? 0,
    };
  });

  const muatStatistik = useCallback(async () => {
    setMemuat(true);
    setError(null);
    try {
      const data = await dashboardService.superAdmin();
      if (!isMounted.current) return;

      setStatistikSatker(data.statistikSatker || []);

      setStats([
        { label: 'Total Admin', value: data.totalAdmin || 0, ikon: 'admin_panel_settings', warna: 'bg-blue-500', href: RUTE.superAdminAdmin },
        { label: 'Total Peminjam', value: data.totalPeminjam || 0, ikon: 'group', warna: 'bg-green-500', href: RUTE.superAdminPengguna },
        { label: 'Total Barang', value: data.totalBarang || 0, ikon: 'inventory_2', warna: 'bg-purple-500', href: RUTE.superAdminBarang },
        { label: 'Total Satker', value: data.jumlahSatker || 0, ikon: 'location_city', warna: 'bg-teal-500', href: RUTE.superAdminSatker },
        { label: 'Peminjaman Aktif', value: data.peminjamanAktif || 0, ikon: 'sync_alt', warna: 'bg-orange-500', href: RUTE.superAdminPeminjaman },
        { label: 'Menunggu Persetujuan', value: data.peminjamanPending || 0, ikon: 'pending_actions', warna: 'bg-yellow-500', href: RUTE.superAdminPeminjaman },
        { label: 'Barang Terlambat', value: data.barangTerlambat || 0, ikon: 'warning', warna: 'bg-red-500', href: RUTE.superAdminPeminjaman },
        { label: 'Total Peminjaman', value: data.totalPeminjaman || 0, ikon: 'history', warna: 'bg-indigo-500', href: RUTE.superAdminPeminjaman },
      ]);
    } catch (err) {
      console.error('Gagal memuat statistik:', err);
      if (isMounted.current) {
        setError('Gagal memuat statistik. Silakan coba lagi.');
      }
    } finally {
      if (isMounted.current) {
        setMemuat(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    muatStatistik();
    return () => { isMounted.current = false; };
  }, [muatStatistik]);

  if (memuat) {
    return (
      <div className="space-y-gutter">
        {/* Hero skeleton */}
        <div className="rounded-2xl bg-brand-gradient p-stack-lg text-white shadow-brand animate-pulse">
          <div className="h-8 w-48 rounded-lg bg-white/20" />
          <div className="mt-2 h-6 w-96 max-w-full rounded-lg bg-white/20" />
        </div>
        <StatCardsSkeleton count={8} />
      </div>
    );
  }

  return (
    <div className="space-y-gutter">
      {/* Hero eksekutif - ungu elegan */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900 via-violet-800 to-indigo-800 p-6 text-white shadow-xl">
        {/* Orbs dekoratif */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-purple-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-1/3 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="pointer-events-none absolute right-1/4 top-1/2 h-32 w-32 rounded-full bg-indigo-400/20 blur-2xl" />

        <div className="relative flex flex-col items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm shadow-lg ring-1 ring-white/20">
              <Icon name="space_dashboard" className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-label-sm text-sm font-medium uppercase tracking-wider text-purple-200">
                Dashboard Super Admin
              </p>
              <h1 className="text-2xl font-bold tracking-tight">Ringkasan Sistem</h1>
            </div>
          </div>
          <p className="text-base text-purple-100">
            Monitoring seluruh data aset dan peminjaman BMN di Kementerian Keuangan.
          </p>
        </div>
      </section>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-medium">{error}</p>
          <button onClick={muatStatistik} className="mt-2 text-sm underline hover:no-underline">
            Coba lagi
          </button>
        </div>
      )}

      {/* Statistik Grid */}
      {!error && (
        <section className="rounded-3xl border-2 border-slate-200/50 bg-gradient-to-br from-white to-slate-50 p-8 shadow-lg">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-primary/30">
              <Icon name="space_dashboard" className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-jakarta text-xl font-bold text-slate-800">Statistik Overview</h2>
              <p className="text-sm text-muted-foreground">Ringkasan data sistem</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, i) => (
              <StatCardItem key={stat.label} stat={stat} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Statistik Per Satker - Single Column List */}
      <section className="rounded-3xl border-2 border-slate-200/50 bg-gradient-to-br from-white to-slate-50 p-8 shadow-lg animate-page-in" style={{ animationDelay: '200ms' }}>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-primary/30">
              <Icon name="location_city" className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-jakarta text-xl font-bold text-slate-800">Statistik Per Satker</h2>
              <p className="text-sm text-muted-foreground">Ringkasan barang dan peminjaman per unit</p>
            </div>
          </div>
          <Link href={RUTE.superAdminSatker} className="flex items-center gap-1 text-sm font-medium text-primary hover:underline" prefetch={true}>
            Lihat semua
            <Icon name="arrow_forward" className="h-4 w-4" />
          </Link>
        </div>

        <div className="space-y-3">
          {statistikSatkerDenganNama.map((satker, indeks) => (
            <button
              key={satker.kodeSatker}
              onClick={() => router.push(`${RUTE.superAdminBarang}?kodeSatker=${satker.kodeSatker}`)}
              style={{ animationDelay: `${250 + indeks * 60}ms` }}
              className="group relative flex w-full items-center gap-4 rounded-2xl border-2 border-slate-200/50 bg-white p-4 shadow-md transition-all duration-300 hover:border-primary/30 hover:shadow-xl active:scale-[0.98]"
            >
              {/* Gradient top border on hover */}
              <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r from-primary to-indigo-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              {/* Icon */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 transition-transform duration-300 group-hover:scale-105">
                <Icon name="domain" className="h-5 w-5 text-blue-600" />
              </div>

              {/* Nama Satker */}
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate font-semibold text-sm text-slate-700 transition-colors group-hover:text-primary">{satker.nama}</p>
                <p className="text-xs text-slate-400">{satker.kodeSatker}</p>
              </div>

              {/* Stats - Clickable */}
              <div className="flex items-center gap-4">
                <Link
                  href={`${RUTE.superAdminBarang}?kodeSatker=${satker.kodeSatker}`}
                  onClick={(e) => e.stopPropagation()}
                  className="group/stat flex flex-col items-center rounded-lg px-3 py-1 transition-all hover:bg-purple-50"
                >
                  <span className="text-base font-bold text-purple-600 transition-colors group-hover/stat:text-purple-700">
                    {satker.jumlahBarang.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs text-slate-500">Barang</span>
                </Link>
                <div className="h-8 w-px bg-slate-200" />
                <Link
                  href={`${RUTE.superAdminPeminjaman}?kodeSatker=${satker.kodeSatker}`}
                  onClick={(e) => e.stopPropagation()}
                  className="group/stat flex flex-col items-center rounded-lg px-3 py-1 transition-all hover:bg-orange-50"
                >
                  <span className={cn(
                    "text-base font-bold transition-colors",
                    satker.jumlahPeminjaman > 0 ? "text-orange-600 group-hover/stat:text-orange-700" : "text-slate-400"
                  )}>
                    {satker.jumlahPeminjaman.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs text-slate-500">Peminjaman</span>
                </Link>
              </div>

              {/* Arrow */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:bg-primary/10 group-hover:opacity-100">
                <Icon name="arrow_forward" className="h-4 w-4 text-slate-400 transition-colors group-hover:text-primary" />
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
