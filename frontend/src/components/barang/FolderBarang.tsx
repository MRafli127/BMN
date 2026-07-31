// ============================================================
//  Daftar barang admin dalam bentuk folder per merk.
//  Setiap merk yang sama menjadi satu folder; saat dibuka,
//  menampilkan tiap unit beserta kode barang dan NUP-nya.
//  Responsive: Card view di mobile dengan swipe actions.
//  Compact mobile design dengan touch targets 44px.
// ============================================================

'use client';

import { useState, useCallback, memo } from 'react';
import Link from 'next/link';
import { Folder, FolderOpen, ChevronDown, Eye, Trash2, Package } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KonfirmasiDialog } from '@/components/shared/KonfirmasiDialog';
import { SwipeableRow, SwipeableList } from '@/components/ui/swipeable';
import { ConfirmationSheet } from '@/components/ui/bottom-sheet';
import { cn, urlFile } from '@/lib/utils';
import { kelompokkanBarang, type GrupBarang } from '@/lib/kelompokkanBarang';
import { JENIS_BARANG, KONDISI_BARANG } from '@/constants/status';
import { RUTE } from '@/constants/routes';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { Barang } from '@/types/barang.type';

interface Props {
  grup: GrupBarang[];
  onHapus: (id: string) => Promise<void>;
  terbuka?: Set<string>;
  onToggle?: (merk: string) => void;
  bukaTutupSemua?: () => void;
  semuaTerbuka?: boolean;
}

// FolderBarang dibungkus memo untuk mencegah re-render tidak perlu
// saat parent component re-render tapi props tidak berubah.
export const FolderBarang = memo(function FolderBarang({
  grup,
  onHapus,
  terbuka: terbukaProp,
  onToggle,
  bukaTutupSemua: bukaTutupSemuaProp,
  semuaTerbuka: semuaTerbukaProp,
}: Props) {
  const [terbukaInternal, setTerbukaInternal] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<Barang | null>(null);
  const [sedangHapus, setSedangHapus] = useState(false);
  const [showMobileConfirm, setShowMobileConfirm] = useState(false);
  const isMobile = useIsMobile();

  const terbuka = terbukaProp !== undefined ? terbukaProp : terbukaInternal;

  const semuaTerbuka = semuaTerbukaProp ?? (grup.length > 0 && grup.every((g) => terbuka.has(g.kategori)));

  const toggle = (merk: string) => {
    if (onToggle) {
      onToggle(merk);
    } else {
      setTerbukaInternal((prev) => {
        const next = new Set(prev);
        if (next.has(merk)) next.delete(merk);
        else next.add(merk);
        return next;
      });
    }
  };

  const handleBukaTutupSemua = () => {
    if (bukaTutupSemuaProp) {
      bukaTutupSemuaProp();
    } else {
      const allOpen = grup.length > 0 && grup.every((g) => terbuka.has(g.kategori));
      const next = new Set(terbuka);
      for (const g of grup) {
        if (allOpen) next.delete(g.kategori);
        else next.add(g.kategori);
      }
      setTerbukaInternal(next);
    }
  };

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

  // Mobile View - Instagram-like
  if (isMobile) {
    return (
      <>
        {/* Header bar */}
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-xs font-medium text-gray-500">{grup.length} folder</span>
          <button
            onClick={handleBukaTutupSemua}
            className="text-[11px] font-medium text-blue-500"
          >
            {semuaTerbuka ? 'Tutup' : 'Buka'}
          </button>
        </div>

        {/* List */}
        <SwipeableList className="gap-0">
          {grup.map((g) => {
            const aktif = terbuka.has(g.kategori);
            return (
              <div key={g.kategori}>
                {/* Folder header - Instagram style */}
                <button
                  type="button"
                  onClick={() => toggle(g.kategori)}
                  className={cn(
                    'flex w-full items-center gap-2 px-1 py-2 text-left border-b border-gray-100',
                    aktif ? 'bg-gray-50' : 'bg-white'
                  )}
                >
                  <span className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    aktif ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                  )}>
                    {aktif ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-gray-900">{g.kategori}</p>
                    <p className="text-[10px] text-gray-400">
                      {g.totalUnit} item
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-gray-400 transition-transform',
                      aktif && 'rotate-180'
                    )}
                  />
                </button>

                {/* Items - compact list */}
                {aktif && (
                  <div className="bg-gray-50">
                    {g.items.map((barang) => {
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
                            className="flex items-center gap-2 border-b border-gray-100 bg-white px-1 py-2"
                          >
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-gray-100">
                              {barang.fotoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={urlFile(barang.fotoUrl)} alt={barang.nama} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-gray-400">
                                  <Package className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[11px] font-medium text-gray-900">{barang.nama}</p>
                              <p className="text-[10px] text-gray-400">{barang.kodeBarang}</p>
                              {barang.peminjam ? (
                                <p className="flex items-center gap-1 text-[10px] text-orange-500 truncate" title={`NIP: ${barang.peminjam.nip || '-'}`}>
                                  <span className="text-orange-400">→</span>
                                  <span className="truncate">{barang.peminjam.nama}</span>
                                </p>
                              ) : barang.jumlahTersedia === 0 && (
                                <p className="text-[10px] font-medium text-red-500">Stok habis</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={barang.jumlahTersedia > 0 ? 'text-[10px] font-medium text-green-500' : 'text-[10px] font-medium text-red-500'}>
                                {barang.jumlahTersedia}/{barang.jumlahTotal}
                              </span>
                            </div>
                          </Link>
                        </SwipeableRow>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </SwipeableList>

        {/* Confirmation Sheet */}
        <ConfirmationSheet
          isOpen={showMobileConfirm}
          onClose={() => { setShowMobileConfirm(false); setTarget(null); }}
          onConfirm={konfirmasiHapus}
          title="Hapus Barang"
          message={`Hapus "${target?.nama}"?`}
          confirmLabel="Hapus"
          cancelLabel="Batal"
          confirmVariant="destructive"
          isLoading={sedangHapus}
        />

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

  // Desktop View
  return (
    <>
      <div className="space-y-3">
        {grup.map((g) => {
          const aktif = terbuka.has(g.kategori);
          return (
            <div
              key={g.kategori}
              className={cn(
                'overflow-hidden rounded-xl border bg-card transition-colors',
                aktif && 'border-blue-400 ring-1 ring-blue-400'
              )}
            >
              {/* Header folder */}
              <button
                type="button"
                onClick={() => toggle(g.kategori)}
                aria-expanded={aktif}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                  aktif ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-muted/40'
                )}
              >
                <span className={aktif ? 'text-blue-600' : 'text-primary'}>
                  {aktif ? <FolderOpen className="h-5 w-5" /> : <Folder className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{g.kategori}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.totalUnit} unit • {g.totalTersedia} tersedia / {g.totalStok}
                  </p>
                </div>
                <Badge className="border-primary/20 bg-primary/10 text-primary">{g.totalUnit} unit</Badge>
                <ChevronDown
                  className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', aktif && 'rotate-180')}
                />
              </button>

              {/* Isi folder */}
              {aktif && (
                <div className="border-t">
                  <Table containerClassName="max-h-[420px]">
                    <TableHeader className="sticky top-0 z-10 bg-card shadow-sm">
                      <TableRow>
                        <TableHead className="w-14">Foto</TableHead>
                        <TableHead>Kode / Nama</TableHead>
                        <TableHead>NUP</TableHead>
                        <TableHead>Jenis</TableHead>
                        <TableHead>Kondisi</TableHead>
                        <TableHead className="text-center">Stok</TableHead>
                        <TableHead>Peminjam</TableHead>
                        <TableHead>Lokasi</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {g.items.map((barang) => {
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
                            </TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">{barang.nup || '-'}</TableCell>
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
                            <TableCell className="text-sm">
                              {barang.peminjam ? (
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-medium text-orange-600" title={`NIP: ${barang.peminjam.nip || '-'}`}>
                                    {barang.peminjam.nama}
                                  </span>
                                  {barang.peminjam.nip && (
                                    <span className="text-xs text-muted-foreground">{barang.peminjam.nip}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
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
              )}
            </div>
          );
        })}
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
});
