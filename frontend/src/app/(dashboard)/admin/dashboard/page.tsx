// ============================================================
//  Dashboard Admin — ringkasan statistik & grafik.
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { Package, Hourglass, ClipboardCheck, AlertTriangle, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { TabelPeminjaman } from '@/components/peminjaman/TabelPeminjaman';
import { notify } from '@/components/ui/toast';
import { dashboardService, type DashboardAdmin } from '@/services/dashboard.service';
import { ambilPesanError, cn } from '@/lib/utils';
import { STATUS_PEMINJAMAN } from '@/constants/status';
import { RUTE } from '@/constants/routes';

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardAdmin | null>(null);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    dashboardService
      .admin()
      .then(setData)
      .catch((e) => notify.gagal(ambilPesanError(e, 'Gagal memuat dashboard.')))
      .finally(() => setMemuat(false));
  }, []);

  if (memuat) return <LoadingSpinner layarPenuh />;
  if (!data) return null;

  const s = data.statistik;
  const kartu = [
    { label: 'Total Barang', nilai: s.totalBarang, ikon: Package, warna: 'bg-blue-500' },
    { label: 'Pengajuan Menunggu', nilai: s.pengajuanMenunggu, ikon: Hourglass, warna: 'bg-amber-500' },
    { label: 'Peminjaman Aktif', nilai: s.peminjamanAktif, ikon: ClipboardCheck, warna: 'bg-indigo-500' },
    { label: 'Barang Terlambat', nilai: s.barangTerlambat, ikon: AlertTriangle, warna: 'bg-rose-500' },
    { label: 'Total Peminjam', nilai: s.totalPeminjam, ikon: Users, warna: 'bg-emerald-500' },
  ];

  const maxGrafik = Math.max(1, ...data.grafikStatus.map((g) => g.jumlah));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard Admin</h1>
        <p className="text-muted-foreground">Ringkasan pengelolaan Barang Milik Negara.</p>
      </div>

      {/* Kartu statistik */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {kartu.map((k) => {
          const Ikon = k.ikon;
          return (
            <Card key={k.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={cn('flex h-11 w-11 items-center justify-center rounded-lg text-white', k.warna)}>
                  <Ikon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none text-foreground">{k.nilai}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{k.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Grafik ringkasan per status */}
      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Peminjaman per Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.grafikStatus.map((g) => {
            const info = STATUS_PEMINJAMAN[g.status];
            return (
              <div key={g.status} className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-sm text-muted-foreground">{info.label}</span>
                <div className="h-6 flex-1 overflow-hidden rounded-md bg-muted">
                  <div
                    className="flex h-full items-center justify-end rounded-md bg-primary px-2 text-xs font-semibold text-primary-foreground transition-all"
                    style={{ width: `${(g.jumlah / maxGrafik) * 100}%` }}
                  >
                    {g.jumlah > 0 && g.jumlah}
                  </div>
                </div>
                <span className="w-8 text-right text-sm font-semibold">{g.jumlah}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Peminjaman terbaru */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Peminjaman Terbaru</h2>
        {data.peminjamanTerbaru.length === 0 ? (
          <EmptyState judul="Belum ada peminjaman" deskripsi="Pengajuan peminjaman akan tampil di sini." />
        ) : (
          <TabelPeminjaman data={data.peminjamanTerbaru} hrefDetail={RUTE.adminPeminjamanDetail} tampilkanPeminjam />
        )}
      </div>
    </div>
  );
}
