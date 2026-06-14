// ============================================================
//  Tabel daftar peminjaman (dipakai admin & peminjam).
// ============================================================

'use client';

import Link from 'next/link';
import { Eye } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatTanggal } from '@/lib/utils';
import { STATUS_PEMINJAMAN } from '@/constants/status';
import type { Peminjaman } from '@/types/peminjaman.type';

interface Props {
  data: Peminjaman[];
  hrefDetail: (id: string) => string;
  tampilkanPeminjam?: boolean;
}

export function TabelPeminjaman({ data, hrefDetail, tampilkanPeminjam }: Props) {
  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kode</TableHead>
            {tampilkanPeminjam && <TableHead>Peminjam</TableHead>}
            <TableHead>Barang</TableHead>
            <TableHead>Rencana Pinjam</TableHead>
            <TableHead>Rencana Kembali</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((p) => {
            const status = STATUS_PEMINJAMAN[p.status];
            const ringkasBarang =
              p.detail && p.detail.length > 0
                ? `${p.detail[0].barang?.nama ?? 'Barang'}${p.detail.length > 1 ? ` +${p.detail.length - 1} lainnya` : ''}`
                : '-';
            return (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-sm font-medium text-primary">{p.kodePeminjaman}</TableCell>
                {tampilkanPeminjam && (
                  <TableCell>
                    <p className="font-medium text-foreground">{p.peminjam?.nama ?? '-'}</p>
                    <p className="text-xs text-muted-foreground">{p.peminjam?.unitKerja ?? ''}</p>
                  </TableCell>
                )}
                <TableCell className="max-w-[200px] truncate text-sm">{ringkasBarang}</TableCell>
                <TableCell className="text-sm">{formatTanggal(p.tanggalPinjamRencana)}</TableCell>
                <TableCell className="text-sm">{formatTanggal(p.tanggalKembaliRencana)}</TableCell>
                <TableCell>
                  <Badge className={status.kelas}>{status.label}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={hrefDetail(p.id)}>
                      <Eye className="h-4 w-4" /> Detail
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
