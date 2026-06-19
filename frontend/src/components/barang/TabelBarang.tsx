// ============================================================
//  Tabel barang untuk admin (dengan aksi detail & hapus).
// ============================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, Trash2, Package } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KonfirmasiDialog } from '@/components/shared/KonfirmasiDialog';
import { urlFile } from '@/lib/utils';
import { JENIS_BARANG, KONDISI_BARANG } from '@/constants/status';
import { RUTE } from '@/constants/routes';
import type { Barang } from '@/types/barang.type';

interface Props {
  data: Barang[];
  onHapus: (id: string) => Promise<void>;
}

export function TabelBarang({ data, onHapus }: Props) {
  const [target, setTarget] = useState<Barang | null>(null);
  const [sedangHapus, setSedangHapus] = useState(false);

  const konfirmasiHapus = async () => {
    if (!target) return;
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
              <TableHead className="w-16">Foto</TableHead>
              <TableHead>Kode / Nama</TableHead>
              <TableHead>Merk</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Kondisi</TableHead>
              <TableHead className="text-center">Stok</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((barang) => {
              const kondisi = KONDISI_BARANG[barang.kondisi];
              return (
                <TableRow key={barang.id}>
                  <TableCell>
                    <div className="h-10 w-10 overflow-hidden rounded-md bg-muted">
                      {barang.fotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={urlFile(barang.fotoUrl)} alt={barang.nama} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Package className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-foreground">{barang.nama}</p>
                    <p className="font-mono text-xs text-muted-foreground">{barang.kodeBarang}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{barang.merk || '-'}</TableCell>
                  <TableCell>
                    <Badge className="border-primary/20 bg-primary/10 text-primary">{JENIS_BARANG[barang.jenis]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={kondisi.kelas}>{kondisi.label}</Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    <span className={barang.jumlahTersedia > 0 ? 'text-green-700' : 'text-red-600'}>
                      {barang.jumlahTersedia}
                    </span>
                    <span className="text-muted-foreground"> / {barang.jumlahTotal}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{barang.lokasiPenyimpanan || '-'}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1.5">
                      <Button asChild variant="outline" size="sm">
                        <Link href={RUTE.adminBarangDetail(barang.id)}>
                          <Eye className="h-4 w-4" /> Detail
                        </Link>
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => setTarget(barang)} aria-label="Hapus">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <KonfirmasiDialog
        terbuka={!!target}
        onUbahTerbuka={(o) => !o && setTarget(null)}
        judul="Hapus Barang"
        deskripsi={`Apakah Anda yakin ingin menghapus "${target?.nama}"? Tindakan ini tidak dapat dibatalkan.`}
        teksKonfirmasi="Ya, Hapus"
        variantKonfirmasi="destructive"
        sedangProses={sedangHapus}
        onKonfirmasi={konfirmasiHapus}
      />
    </>
  );
}
