// ============================================================
//  Super Admin Dashboard - ringkasan statistik sistem
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { RUTE } from '@/constants/routes';
import { dashboardService } from '@/services/dashboard.service';
import { useQuery } from '@/lib/cache';

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [filterTanggal, setFilterTanggal] = useState({});

  // Ambil data statistik admin
  const { data: adminStats, isLoading: adminLoading } = useQuery(
    'stats-admin',
    () => dashboardService.getStatistikAdmin()
  );

  // Ambil data statistik satker
  const { data: satkerStats, isLoading: satkerLoading } = useQuery(
    'stats-satker',
    () => dashboardService.getStatistikSatker()
  );

  // Ambil grafik peminjaman
  const { data: grafikData } = useQuery(
    `grafik-admin:${JSON.stringify(filterTanggal)}`,
    () => dashboardService.admin(filterTanggal)
  );

  const isLoading = adminLoading || satkerLoading;

  if (isLoading) return <LoadingSpinner layarPenuh />;

  return (
    <div className="space-y-gutter">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-stack-lg text-white shadow-xl">
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-1/4 h-56 w-56 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-purple-900/30 to-transparent" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-lg">
              <Icon name="admin_panel_settings" className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-white/70">Control Center</p>
              <h1 className="font-jakarta text-headline-lg-mobile text-white sm:text-headline-lg">
                Super Admin Dashboard
              </h1>
            </div>
          </div>
          <p className="text-white/80 max-w-xl">
            Kelola administrator, satker, dan pantau aktivitas seluruh sistem dari satu tempat.
          </p>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="rounded-2xl border border-slate-200/50 bg-white p-6 shadow-md">
        <h2 className="mb-4 flex items-center gap-2 font-jakarta text-lg font-bold text-slate-800">
          <Icon name="flash_on" className="h-5 w-5 text-amber-500" />
          Aksi Cepat
        </h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Button
            variant="outline"
            className="h-auto flex-col gap-2 py-4"
            onClick={() => router.push(RUTE.superAdminAdmin)}
          >
            <Icon name="person_add" className="h-6 w-6 text-primary" />
            <span className="text-sm font-medium">Kelola Admin</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col gap-2 py-4"
            onClick={() => router.push(RUTE.superAdminSatker)}
          >
            <Icon name="location_city" className="h-6 w-6 text-primary" />
            <span className="text-sm font-medium">Kelola Satker</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col gap-2 py-4"
            onClick={() => router.push(RUTE.superAdminLogs)}
          >
            <Icon name="history" className="h-6 w-6 text-primary" />
            <span className="text-sm font-medium">Log Aktivitas</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col gap-2 py-4"
            onClick={() => router.push(RUTE.adminDashboard)}
          >
            <Icon name="dashboard" className="h-6 w-6 text-primary" />
            <span className="text-sm font-medium">Dashboard Admin</span>
          </Button>
        </div>
      </section>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Admin */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/50 bg-white p-6 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r from-violet-500 to-purple-600 opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Administrator</p>
              <p className="mt-2 font-jakarta text-4xl font-bold text-violet-600">
                {adminStats?.totalAdmin ?? 0}
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30">
              <Icon name="admin_panel_settings" className="h-7 w-7 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Icon name="group" className="h-4 w-4" />
            <span>{adminStats?.totalPeminjam ?? 0} total peminjam</span>
          </div>
        </div>

        {/* Total Satker */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/50 bg-white p-6 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r from-emerald-500 to-teal-600 opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Satker</p>
              <p className="mt-2 font-jakarta text-4xl font-bold text-emerald-600">
                {satkerStats?.total ?? 0}
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
              <Icon name="location_city" className="h-7 w-7 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Icon name="check_circle" className="h-4 w-4 text-emerald-500" />
            <span>{satkerStats?.aktif ?? 0} satker aktif</span>
          </div>
        </div>

        {/* Total User */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/50 bg-white p-6 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Pengguna</p>
              <p className="mt-2 font-jakarta text-4xl font-bold text-blue-600">
                {adminStats?.totalUser ?? 0}
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30">
              <Icon name="people" className="h-7 w-7 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Icon name="trending_up" className="h-4 w-4 text-blue-500" />
            <span>{adminStats?.totalAdmin ?? 0} admin, {adminStats?.totalPeminjam ?? 0} peminjam</span>
          </div>
        </div>

        {/* Log Aktivitas */}
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/50 bg-white p-6 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r from-amber-500 to-orange-600 opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Log Aktivitas</p>
              <p className="mt-2 font-jakarta text-4xl font-bold text-amber-600">
                {adminStats?.totalLog ?? 0}
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30">
              <Icon name="history" className="h-7 w-7 text-white" />
            </div>
          </div>
          <div className="mt-4">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-sm text-primary hover:bg-transparent hover:underline"
              onClick={() => router.push(RUTE.superAdminLogs)}
            >
              Lihat semua log
              <Icon name="chevron_right" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Activity Chart */}
      <section className="rounded-2xl border border-slate-200/50 bg-white p-6 shadow-md">
        <h2 className="mb-6 flex items-center gap-2 font-jakarta text-lg font-bold text-slate-800">
          <Icon name="bar_chart" className="h-5 w-5 text-primary" />
          Aktivitas Peminjaman
        </h2>
        <div className="grid gap-4 md:grid-cols-7">
          {grafikData?.grafikStatus?.map((item: any) => {
            const maxJumlah = Math.max(...(grafikData.grafikStatus?.map((g: any) => g.jumlah) || [1]));
            const height = maxJumlah > 0 ? (item.jumlah / maxJumlah) * 100 : 0;
            return (
              <div key={item.status} className="flex flex-col items-center gap-2">
                <div className="flex h-40 w-full items-end justify-center">
                  <div
                    className={cn(
                      'w-10 rounded-t-lg transition-all duration-500',
                      item.status === 'MENUNGGU' ? 'bg-amber-400' :
                      item.status === 'DISETUJUI' ? 'bg-emerald-400' :
                      item.status === 'DITOLAK' ? 'bg-red-400' :
                      item.status === 'DIPINJAM' ? 'bg-pink-400' :
                      item.status === 'DIKEMBALIKAN' ? 'bg-teal-400' :
                      item.status === 'TERLAMBAT' ? 'bg-orange-400' :
                      'bg-slate-400'
                    )}
                    style={{ height: `${Math.max(height, item.jumlah > 0 ? 10 : 0)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-600 text-center">
                  {item.jumlah}
                </span>
                <span className="text-center text-[10px] text-slate-400 leading-tight">
                  {item.status === 'MENUNGGU' ? 'Tunggu' :
                   item.status === 'DISETUJUI' ? 'Setuju' :
                   item.status === 'DITOLAK' ? 'Tolak' :
                   item.status === 'DIPINJAM' ? 'Dipinjam' :
                   item.status === 'DIKEMBALIKAN' ? 'Kembali' :
                   item.status === 'TERLAMBAT' ? 'Telat' : item.status}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Activity */}
      <section className="rounded-2xl border border-slate-200/50 bg-white p-6 shadow-md">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-jakarta text-lg font-bold text-slate-800">
            <Icon name="schedule" className="h-5 w-5 text-primary" />
            Aktivitas Terbaru
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary"
            onClick={() => router.push(RUTE.superAdminLogs)}
          >
            Lihat semua
            <Icon name="chevron_right" className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-4">
          {grafikData?.recentEntries?.slice(0, 5).map((entry: any, i: number) => (
            <div key={entry.id || i} className="flex items-start gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <div className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                entry.entitas === 'USER' ? 'bg-blue-100 text-blue-600' :
                entry.entitas === 'PEMINJAMAN' ? 'bg-amber-100 text-amber-600' :
                entry.entitas === 'BARANG' ? 'bg-emerald-100 text-emerald-600' :
                'bg-slate-100 text-slate-600'
              )}>
                <Icon name={
                  entry.entitas === 'USER' ? 'person' :
                  entry.entitas === 'PEMINJAMAN' ? 'swap_horiz' :
                  entry.entitas === 'BARANG' ? 'inventory' :
                  'history'
                } className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-800">
                  {entry.labelAksi || entry.aksi}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {entry.userNama || 'System'} - {entry.labelEntitas || entry.entitas}
                </p>
              </div>
              <span className="shrink-0 text-xs text-slate-400">
                {new Date(entry.timestamp).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          ))}
          {(!grafikData?.recentEntries || grafikData.recentEntries.length === 0) && (
            <p className="py-8 text-center text-slate-500">Belum ada aktivitas terbaru</p>
          )}
        </div>
      </section>
    </div>
  );
}
