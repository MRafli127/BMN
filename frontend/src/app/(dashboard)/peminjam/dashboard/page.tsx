// ============================================================
//  Dashboard Peminjam — ringkasan peminjaman pribadi.
// ============================================================

'use client';

import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { Card, CardContent } from '@/components/ui/card';
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
}

// Kelas literal per warna (agar terdeteksi JIT Tailwind)
const GAYA: Record<string, GayaWarna> = {
  primary: { orb: 'bg-primary/10 group-hover:bg-primary/20', ikonBox: 'bg-primary/10 text-primary', nilai: 'text-primary' },
  tertiary: { orb: 'bg-tertiary/10 group-hover:bg-tertiary/20', ikonBox: 'bg-tertiary/10 text-tertiary', nilai: 'text-tertiary' },
  secondary: { orb: 'bg-secondary/10 group-hover:bg-secondary/20', ikonBox: 'bg-secondary/10 text-secondary', nilai: 'text-secondary' },
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
      {/* Sapaan + aksi cepat */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-jakarta text-headline-lg text-primary">Halo, {user?.nama?.split(' ')[0]} 👋</h1>
          <p className="text-on-surface-variant">Berikut ringkasan aktivitas peminjaman Anda.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={RUTE.peminjamKatalog}>
              <Icon name="inventory_2" className="text-[18px]" /> Katalog
            </Link>
          </Button>
          <Button asChild>
            <Link href={RUTE.peminjamAjukan}>
              <Icon name="add" className="text-[18px]" /> Ajukan Peminjaman
            </Link>
          </Button>
        </div>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
        {kartu.map((k) => {
          const g = GAYA[k.warna];
          return (
            <Link
              key={k.label}
              href={RUTE.peminjamRiwayatStatus(k.filter)}
              aria-label={`Lihat Riwayat Peminjaman: ${k.label}`}
              className="glass-card group relative block overflow-hidden rounded-2xl p-stack-lg transition-all duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
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
        <h2 className="mb-3 font-jakarta text-headline-md text-primary">Peminjaman Aktif</h2>
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
