// ============================================================
//  Tabel daftar peminjaman (dipakai admin & peminjam).
// ============================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, Trash2 } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KonfirmasiDialog } from '@/components/shared/KonfirmasiDialog';
import { formatTanggal } from '@/lib/utils';
import { STATUS_PEMINJAMAN } from '@/constants/status';
import type { Peminjaman } from '@/types/peminjaman.type';

interface Props {
  data: Peminjaman[];
  hrefDetail: (id: string) => string;
  tampilkanPeminjam?: boolean;
  // Bila diberikan, tombol hapus ditampilkan (khusus admin).
  onHapus?: (id: string) => Promise<void>;
}

export function TabelPeminjaman({ data, hrefDetail, tampilkanPeminjam, onHapus }: Props) {
  const [target, setTarget] = useState<Peminjaman | null>(null);
  const [sedangHapus, setSedangHapus] = useState(false);

  const konfirmasiHapus = async () => {
    if (!target || !onHapus) return;
    setSedangHapus(true);
    try {
      await onHapus(target.id);
      setTarget(null);
    } catch {
      // Error sudah ditampilkan via toast oleh parent; dialog dibiarkan terbuka.
    } finally {
      setSedangHapus(false);
    }
  };

  return (
    <>
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
                  <div className="flex justify-end gap-1.5">
                    <Button asChild variant="outline" size="sm">
                      <Link href={hrefDetail(p.id)}>
                        <Eye className="h-4 w-4" /> Detail
                      </Link>
                    </Button>
                    {onHapus && (
                      <Button variant="destructive" size="icon" onClick={() => setTarget(p)} aria-label="Hapus">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>

    {onHapus && (
      <KonfirmasiDialog
        terbuka={!!target}
        onUbahTerbuka={(o) => !o && setTarget(null)}
        judul="Hapus Peminjaman"
        deskripsi={`Hapus data peminjaman "${target ? kodePeminjamanRingkas(target) : ''}"? Jika barang masih dipinjam, stok akan dikembalikan otomatis. Tindakan ini tidak dapat dibatalkan.`}
        teksKonfirmasi="Ya, Hapus"
        variantKonfirmasi="destructive"
        sedangProses={sedangHapus}
        onKonfirmasi={konfirmasiHapus}
      />
    )}
    </>
  );
}

// Label ringkas untuk dialog konfirmasi: kode + nama peminjam (bila ada).
function kodePeminjamanRingkas(p: Peminjaman): string {
  return p.peminjam?.nama ? `${p.kodePeminjaman} — ${p.peminjam.nama}` : p.kodePeminjaman;
}
