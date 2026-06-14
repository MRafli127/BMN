// ============================================================
//  Dashboard Peminjam — ringkasan peminjaman pribadi.
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, Hourglass, CheckCircle2, History, Boxes, PlusCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { KartuStatus } from '@/components/peminjaman/KartuStatus';
import { notify } from '@/components/ui/toast';
import { dashboardService, type DashboardPeminjam } from '@/services/dashboard.service';
import { ambilPesanError, cn } from '@/lib/utils';
import { STATUS_PEMINJAMAN } from '@/constants/status';
import { RUTE } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';

export default function PeminjamDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardPeminjam | null>(null);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    dashboardService
      .peminjam()
      .then(setData)
      .catch((e) => notify.gagal(ambilPesanError(e, 'Gagal memuat dashboard.')))
      .finally(() => setMemuat(false));
  }, []);

  if (memuat) return <LoadingSpinner layarPenuh />;
  if (!data) return null;

  const s = data.statistik;
  const kartu = [
    { label: 'Peminjaman Aktif', nilai: s.peminjamanAktif, ikon: ClipboardCheck, warna: 'bg-indigo-500' },
    { label: 'Menunggu Persetujuan', nilai: s.menunggu, ikon: Hourglass, warna: 'bg-amber-500' },
    { label: 'Sudah Dikembalikan', nilai: s.dikembalikan, ikon: CheckCircle2, warna: 'bg-emerald-500' },
    { label: 'Total Riwayat', nilai: s.totalRiwayat, ikon: History, warna: 'bg-blue-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Sapaan + aksi cepat */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Halo, {user?.nama?.split(' ')[0]} 👋</h1>
          <p className="text-muted-foreground">Berikut ringkasan aktivitas peminjaman Anda.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={RUTE.peminjamKatalog}>
              <Boxes className="h-4 w-4" /> Katalog
            </Link>
          </Button>
          <Button asChild>
            <Link href={RUTE.peminjamAjukan}>
              <PlusCircle className="h-4 w-4" /> Ajukan Peminjaman
            </Link>
          </Button>
        </div>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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

      {/* Status terkini */}
      {data.statusTerkini && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-xs text-muted-foreground">Pengajuan terakhir Anda</p>
              <p className="font-mono font-semibold text-primary">{data.statusTerkini.kodePeminjaman}</p>
            </div>
            <Badge className={STATUS_PEMINJAMAN[data.statusTerkini.status].kelas}>
              {STATUS_PEMINJAMAN[data.statusTerkini.status].label}
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link href={RUTE.peminjamRiwayatDetail(data.statusTerkini.id)}>Lihat Detail</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Peminjaman aktif */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Peminjaman Aktif</h2>
        {data.daftarAktif.length === 0 ? (
          <EmptyState
            judul="Tidak ada peminjaman aktif"
            deskripsi="Ajukan peminjaman barang untuk memulai."
            aksi={
              <Button asChild>
                <Link href={RUTE.peminjamAjukan}>
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
