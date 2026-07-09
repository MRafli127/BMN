// ============================================================
//  Tabel barang untuk admin (dengan aksi detail & hapus).
//  Responsive: Tabel di desktop, Card view compact di mobile.
//  Compact mobile design dengan touch targets 44px.
// ============================================================

'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Eye, Trash2, Package } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KonfirmasiDialog } from '@/components/shared/KonfirmasiDialog';
import { SwipeableRow, SwipeableList } from '@/components/ui/swipeable';
import { ConfirmationSheet } from '@/components/ui/bottom-sheet';
import { urlFile } from '@/lib/utils';
import { JENIS_BARANG, KONDISI_BARANG } from '@/constants/status';
import { RUTE } from '@/constants/routes';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { Barang } from '@/types/barang.type';

interface Props {
  data: Barang[];
  onHapus: (id: string) => Promise<void>;
}

export function TabelBarang({ data, onHapus }: Props) {
  const [target, setTarget] = useState<Barang | null>(null);
  const [sedangHapus, setSedangHapus] = useState(false);
  const [showMobileConfirm, setShowMobileConfirm] = useState(false);
  const isMobile = useIsMobile();

  const konfirmasiHapus = async () => {
    if (!target) return;
    setSedangHapus(true);
    try {
      await onHapus(target.id);
      setTarget(null);
      setShowMobileConfirm(false);
    } catch {
      // Error sudah ditampilkan via toast oleh parent
    } finally {
      setSedangHapus(false);
    }
  };

  const handleDeleteClick = useCallback((barang: Barang) => {
    setTarget(barang);
    if (isMobile) {
      setShowMobileConfirm(true);
    }
  }, [isMobile]);

  // Mobile: Instagram-like compact list
  if (isMobile) {
    return (
      <>
        <SwipeableList className="gap-0 -mx-1">
          {data.map((barang) => {
            const kondisi = KONDISI_BARANG[barang.kondisi];
            return (
              <SwipeableRow
                key={barang.id}
                actions={[
                  {
                    label: 'Hapus',
                    icon: 'delete',
                    onClick: () => handleDeleteClick(barang),
                    variant: 'destructive',
                  },
                ]}
              >
                <Link
                  href={RUTE.adminBarangDetail(barang.id)}
                  className="flex items-center gap-2 border-b border-gray-100 bg-white px-1 py-2.5"
                >
                  {/* Image */}
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {barang.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={urlFile(barang.fotoUrl)} alt={barang.nama} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-400">
                        <Package className="h-5 w-5" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-gray-900">{barang.nama}</p>
                    <p className="text-[10px] text-gray-400">{barang.kodeBarang}</p>
                  </div>

                  {/* Stock */}
                  <div className="flex items-center gap-1">
                    <span className={
                      barang.jumlahTersedia > 0
                        ? 'text-[11px] font-medium text-green-500'
                        : 'text-[11px] font-medium text-red-500'
                    }>
                      {barang.jumlahTersedia}/{barang.jumlahTotal}
                    </span>
                    <span className={'text-[9px] px-1.5 py-0.5 rounded ' + kondisi.kelas}>
                      {kondisi.label}
                    </span>
                  </div>
                </Link>
              </SwipeableRow>
            );
          })}
        </SwipeableList>

        {data.length === 0 && (
          <div className="border-t border-gray-100 bg-white p-8 text-center">
            <Package className="mx-auto mb-2 h-10 w-10 text-gray-300" />
            <p className="text-[11px] text-gray-400">Tidak ada data barang.</p>
          </div>
        )}

        {/* Mobile Confirmation Sheet */}
        <ConfirmationSheet
          isOpen={showMobileConfirm}
          onClose={() => {
            setShowMobileConfirm(false);
            setTarget(null);
          }}
          onConfirm={konfirmasiHapus}
          title="Hapus Barang"
          message={`Hapus "${target?.nama}"? Tindakan tidak dapat dibatalkan.`}
          confirmLabel="Ya, Hapus"
          cancelLabel="Batal"
          confirmVariant="destructive"
          isLoading={sedangHapus}
        />
      </>
    );
  }

  // Desktop: Normal table
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
                    <p className="font-mono text-xs break-all text-muted-foreground">{barang.kodeBarang}</p>
                    {barang.nup && (
                      <p className="text-xs text-muted-foreground">NUP {barang.nup}</p>
                    )}
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
                      <Button variant="destructive" size="icon" onClick={() => handleDeleteClick(barang)} aria-label="Hapus">
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

      {/* Desktop Confirmation Dialog */}
      <KonfirmasiDialog
        terbuka={!!target && !showMobileConfirm}
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
