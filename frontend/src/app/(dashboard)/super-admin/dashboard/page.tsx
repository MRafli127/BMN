// ============================================================
//  Dashboard Super Admin — ringkasan statistik sistem.
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { dashboardService } from '@/services/dashboard.service';
import { LABEL_ROLE } from '@/constants/roles';
import { RUTE } from '@/constants/routes';
import { usePermission } from '@/lib/usePermission';

interface StatCard {
  label: string;
  value: number;
  ikon: string;
  warna: string;
  href?: string;
}

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [statistikSatker, setStatistikSatker] = useState<Array<{
    kodeSatker: string;
    jumlahBarang: number;
    jumlahPeminjaman: number;
  }>>([]);
  const [jumlahSatker, setJumlahSatker] = useState(0);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    muatStatistik();
  }, []);

  async function muatStatistik() {
    try {
      const data = await dashboardService.superAdmin();

      setJumlahSatker(data.jumlahSatker || 0);
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
    } finally {
      setMemuat(false);
    }
  }

  if (memuat) {
    return <LoadingSpinner layarPenuh teks="Memuat dashboard..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-800 to-purple-600 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">Dashboard Super Admin</h1>
        <p className="mt-1 text-purple-100">Selamat datang di panel {LABEL_ROLE.SUPER_ADMIN}. Kelola seluruh sistem di sini.</p>
      </div>

      {/* Statistik Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <a
            key={i}
            href={stat.href}
            className="group rounded-2xl bg-white p-5 shadow-md transition-all hover:scale-[1.02] hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg ${stat.warna}`}>
                <Icon name={stat.ikon} style={{ fontSize: 24 }} />
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Statistik Per Satker */}
      {statistikSatker.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Statistik Per Satker</h2>
            <a href={RUTE.superAdminSatker} className="text-sm font-medium text-primary hover:underline">
              Lihat semua →
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Kode Satker</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Jumlah Barang</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Jumlah Peminjaman</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {statistikSatker.slice(0, 5).map((satker) => (
                  <tr key={satker.kodeSatker} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">{satker.kodeSatker}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600">{satker.jumlahBarang}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-600">{satker.jumlahPeminjaman}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {statistikSatker.length > 5 && (
              <p className="mt-2 text-center text-sm text-gray-500">
                dan {statistikSatker.length - 5} satker lainnya...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="rounded-2xl bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Aksi Cepat</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: 'Kelola Admin', href: RUTE.superAdminAdmin, ikon: 'admin_panel_settings', warna: 'bg-blue-500' },
            { label: 'Kelola Barang', href: RUTE.superAdminBarang, ikon: 'inventory_2', warna: 'bg-green-500' },
            { label: 'Kelola Peminjaman', href: RUTE.superAdminPeminjaman, ikon: 'sync_alt', warna: 'bg-purple-500' },
            { label: 'Kelola Satker', href: RUTE.superAdminSatker, ikon: 'location_city', warna: 'bg-teal-500' },
            { label: 'Lihat Log Aktivitas', href: RUTE.superAdminLogs, ikon: 'history', warna: 'bg-orange-500' },
            { label: 'Kelola Pengguna', href: RUTE.superAdminPengguna, ikon: 'group', warna: 'bg-indigo-500' },
          ].map((action, i) => (
            <a
              key={i}
              href={action.href}
              className="flex flex-col items-center gap-2 rounded-xl bg-gray-50 p-4 text-center transition-all hover:bg-gray-100 hover:shadow-md"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-white shadow ${action.warna}`}>
                <Icon name={action.ikon} style={{ fontSize: 24 }} />
              </div>
              <span className="text-sm font-medium text-gray-700">{action.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
