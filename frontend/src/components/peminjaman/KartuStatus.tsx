// ============================================================
//  Kartu ringkas status peminjaman (untuk dashboard & daftar).
// ============================================================

'use client';

import Link from 'next/link';
import { CalendarDays, ArrowRight, Boxes } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatTanggal } from '@/lib/utils';
import { STATUS_PEMINJAMAN } from '@/constants/status';
import type { Peminjaman } from '@/types/peminjaman.type';

interface Props {
  peminjaman: Peminjaman;
  hrefDetail: string;
  tampilkanPeminjam?: boolean;
}

export function KartuStatus({ peminjaman, hrefDetail, tampilkanPeminjam }: Props) {
  const status = STATUS_PEMINJAMAN[peminjaman.status];
  const jumlahBarang = peminjaman.detail?.length ?? 0;

  return (
    <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-mono text-sm font-semibold text-primary">{peminjaman.kodePeminjaman}</p>
            {tampilkanPeminjam && peminjaman.peminjam?.nama && (
              <p className="text-xs text-muted-foreground">{peminjaman.peminjam.nama}</p>
            )}
          </div>
          <Badge className={status.kelas}>{status.label}</Badge>
        </div>

        <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <Boxes className="h-4 w-4" /> {jumlahBarang} jenis barang
          </p>
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {formatTanggal(peminjaman.tanggalPinjamRencana)} —{' '}
            {peminjaman.tanggalKembaliRencana ? formatTanggal(peminjaman.tanggalKembaliRencana) : 'tanpa batas'}
          </p>
        </div>

        <Link
          href={hrefDetail}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Lihat detail <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
