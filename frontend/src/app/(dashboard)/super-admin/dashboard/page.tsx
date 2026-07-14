// ============================================================
//  Dashboard Super Admin — ringkasan statistik sistem.
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import api from '@/lib/api';

interface StatCard {
  label: string;
  value: number;
  ikon: string;
  warna: string;
}

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    muatStatistik();
  }, []);

  async function muatStatistik() {
    try {
      const res = await api.get('/dashboard/admin');
      const data = res.data.data;

      setStats([
        { label: 'Total Admin', value: data.totalAdmin || 0, ikon: 'admin_panel_settings', warna: 'bg-blue-500' },
        { label: 'Total Peminjam', value: data.totalPeminjam || 0, ikon: 'group', warna: 'bg-green-500' },
        { label: 'Total Barang', value: data.totalBarang || 0, ikon: 'inventory_2', warna: 'bg-purple-500' },
        { label: 'Peminjaman Aktif', value: data.peminjamanAktif || 0, ikon: 'sync_alt', warna: 'bg-orange-500' },
        { label: 'Peminjaman Pending', value: data.peminjamanPending || 0, ikon: 'pending_actions', warna: 'bg-yellow-500' },
        { label: 'Barang Terlambat', value: data.barangTerlambat || 0, ikon: 'warning', warna: 'bg-red-500' },
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
      <div className="rounded-2xl bg-gradient-to-r from-blue-800 to-blue-600 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">Dashboard Super Admin</h1>
        <p className="mt-1 text-blue-100">Selamat datang di panel Super Admin. Kelola seluruh sistem di sini.</p>
      </div>

      {/* Statistik Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="rounded-2xl bg-white p-5 shadow-md transition-transform hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg">
                <Icon name={stat.ikon} style={{ fontSize: 24 }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Aksi Cepat</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: 'Kelola Admin', href: '/super-admin/admin', ikon: 'admin_panel_settings', warna: 'bg-blue-500' },
            { label: 'Kelola Barang', href: '/super-admin/barang', ikon: 'inventory_2', warna: 'bg-green-500' },
            { label: 'Kelola Peminjaman', href: '/super-admin/peminjaman', ikon: 'sync_alt', warna: 'bg-purple-500' },
            { label: 'Lihat Log Aktivitas', href: '/super-admin/logs', ikon: 'history', warna: 'bg-orange-500' },
          ].map((action, i) => (
            <a
              key={i}
              href={action.href}
              className="flex flex-col items-center gap-2 rounded-xl bg-gray-50 p-4 text-center transition-all hover:bg-gray-100 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow">
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
