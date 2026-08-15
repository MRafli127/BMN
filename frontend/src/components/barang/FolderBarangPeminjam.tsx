// ============================================================
//  Daftar barang untuk PEMINJAM dalam bentuk folder per merk.
//  Mirip FolderBarang admin, tapi dengan aksi "Tambah ke Keranjang".
//  Support multi barang - user bisa memilih banyak barang sekaligus.
//  Responsive: Card view di mobile, Tabel di desktop.
// ============================================================

'use client';

import { useState, useEffect, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { Folder, FolderOpen, ChevronDown, Eye, ShoppingCart, Check, Plus, Package, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, urlFile } from '@/lib/utils';
import { kelompokkanBarang, type GrupBarang } from '@/lib/kelompokkanBarang';
import { JENIS_BARANG, KONDISI_BARANG } from '@/constants/status';
import { RUTE } from '@/constants/routes';
import { useKeranjangStore, usePollingStokKeranjang } from '@/store/keranjangStore';
import { notify } from '@/components/ui/toast';
import { PeringatanKondisiDialog } from '@/components/shared/PeringatanKondisiDialog';
import { DialogBarangTidakTersedia } from '@/components/keranjang/DialogBarangTidakTersedia';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { Barang } from '@/types/barang.type';

interface Props {
  grup: GrupBarang[];
  terbuka: Set<string>;
  onToggle: (merk: string) => void;
}

export function FolderBarangPeminjam({ grup, terbuka, onToggle }: Props) {
  const items = useKeranjangStore((s) => s.items);
  const tambah = useKeranjangStore((s) => s.tambah);
  const hapus = useKeranjangStore((s) => s.hapus);
  const isMobile = useIsMobile();

  // Hindari hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Dialog peringatan kondisi rusak berat
  const [dialogRusakBerat, setDialogRusakBerat] = useState<{ terbuka: boolean; barang: Barang | null }>({
    terbuka: false,
    barang: null,
  });

  // Dialog barang tidak tersedia (dari polling)
  const {
    barangYangDihapus,
    dialogTerbuka: dialogStokTerbuka,
    setDialogTerbuka: setDialogStokTerbuka,
  } = usePollingStokKeranjang({
    enabled: mounted && Object.keys(items).length > 0,
  });

  // Hapus barang tidak tersedia dari keranjang
  const handleHapusBarangTidakTersedia = () => {
    for (const item of barangYangDihapus) {
      hapus(item.barangId);
    }
    notify.warning(`${barangYangDihapus.length} barang yang tidak tersedia dihapus dari keranjang.`);
  };

  const tanganiKeranjang = (barang: Barang) => {
    if (!mounted) return;
    if (items[barang.id]) {
      hapus(barang.id);
      notify.info(`"${barang.nama}" dihapus dari keranjang.`);
    } else {
      if (barang.jumlahTersedia < 1) {
        notify.gagal('Stok barang ini sudah habis.');
        return;
      }
      if (barang.kondisi === 'RUSAK_BERAT') {
        setDialogRusakBerat({ terbuka: true, barang });
        return;
      }
      tambah(barang);
      notify.suksess(`"${barang.nama}" ditambahkan ke keranjang.`);
    }
  };

  const handleKonfirmasiRusakBerat = () => {
    if (dialogRusakBerat.barang) {
      tambah(dialogRusakBerat.barang);
      notify.suksess(`"${dialogRusakBerat.barang.nama}" ditambahkan ke keranjang.`);
    }
    setDialogRusakBerat({ terbuka: false, barang: null });
  };

  // Tambah semua unit tersedia di folder ke keranjang
  const [sedangProses, setSedangProses] = useState<Set<string>>(new Set());
  const tambahSemuaFolder = (g: GrupBarang) => {
    if (!mounted) return;
    setSedangProses((lama) => new Set(lama).add(g.kategori));

    const tersedia = g.items.filter((b) => b.jumlahTersedia > 0);
    let berhasil = 0;
    let gagal = 0;

    for (const barang of tersedia) {
      if (!items[barang.id]) {
        if (barang.jumlahTersedia > 0) {
          if (barang.kondisi === 'RUSAK_BERAT') {
            setDialogRusakBerat({ terbuka: true, barang });
            setSedangProses((lama) => {
              const baru = new Set(lama);
              baru.delete(g.kategori);
              return baru;
            });
            return;
          }
          tambah(barang);
          berhasil++;
        }
      } else {
        gagal++;
      }
    }

    setTimeout(() => {
      setSedangProses((lama) => {
        const baru = new Set(lama);
        baru.delete(g.kategori);
        return baru;
      });

      if (berhasil > 0) {
        notify.suksess(`Berhasil menambahkan ${berhasil} unit dari folder "${g.kategori}" ke keranjang.`);
      }
      if (gagal > 0) {
        notify.info(`${gagal} unit sudah ada di keranjang, dilewati.`);
      }
      if (berhasil === 0 && gagal === 0) {
        notify.gagal('Tidak ada unit yang tersedia di folder ini.');
      }
    }, 100);
  };

  // Hapus semua unit dari folder di keranjang
  const hapusSemuaFolder = (g: GrupBarang) => {
    if (!mounted) return;
    setSedangProses((lama) => new Set(lama).add(g.kategori));

    let berhasil = 0;
    for (const barang of g.items) {
      if (items[barang.id]) {
        hapus(barang.id);
        berhasil++;
      }
    }

    setTimeout(() => {
      setSedangProses((lama) => {
        const baru = new Set(lama);
        baru.delete(g.kategori);
        return baru;
      });

      if (berhasil > 0) {
        notify.suksess(`Berhasil menghapus ${berhasil} unit dari folder "${g.kategori}" dari keranjang.`);
      }
    }, 100);
  };

  const adaDiKeranjang = (g: GrupBarang) => g.items.some((b) => !!items[b.id]);
  const semuaSudahDiKeranjang = (g: GrupBarang) => g.items.every((b) => b.jumlahTersedia < 1 || !!items[b.id]);

  // Folder Header Button (reusable)
  const FolderHeader = ({ g, aktif }: { g: GrupBarang; aktif: boolean }) => {
    const adaDiKeranjangFolder = adaDiKeranjang(g);
    const semuaDiKeranjangFolder = semuaSudahDiKeranjang(g);
    const dalamProses = sedangProses.has(g.kategori);

    const handleToggle = () => onToggle(g.kategori);
    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        handleToggle();
      }
    };

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleToggle}
        aria-expanded={aktif}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors',
          aktif ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-muted/40'
        )}
      >
        <span className={aktif ? 'text-primary' : 'text-primary'}>
          {aktif ? <FolderOpen className="h-5 w-5" /> : <Folder className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{g.kategori}</p>
          <p className="text-xs text-muted-foreground">
            {g.totalUnit} unit • {g.totalTersedia} tersedia / {g.totalStok}
          </p>
        </div>
        {/* Mobile: show badge only */}
        {isMobile ? (
          <Badge className="border-primary/20 bg-primary/10 text-primary">{g.totalUnit}</Badge>
        ) : (
          aktif && g.totalTersedia > 0 && (
            <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
              {dalamProses ? (
                <Button size="sm" variant="secondary" disabled className="min-w-[120px]">
                  <Loader2 className="h-4 w-4 animate-spin" /> Memuat...
                </Button>
              ) : adaDiKeranjangFolder ? (
                <Button size="sm" variant="destructive" onClick={() => hapusSemuaFolder(g)} className="min-w-[120px]">
                  <Trash2 className="h-4 w-4" /> Hapus Semua
                </Button>
              ) : semuaDiKeranjangFolder ? (
                <Button size="sm" variant="secondary" disabled className="min-w-[120px]">
                  <Check className="h-4 w-4" /> Semua Ditambahkan
                </Button>
              ) : (
                <Button size="sm" variant="default" onClick={() => tambahSemuaFolder(g)} className="min-w-[120px]">
                  <Plus className="h-4 w-4" /> Tambah Semua
                </Button>
              )}
            </div>
          )
        )}
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', aktif && 'rotate-180')}
        />
      </div>
    );
  };

  // Mobile Card Item
  const MobileCardItem = ({ barang }: { barang: Barang }) => {
    const kondisi = KONDISI_BARANG[barang.kondisi];
    const diKeranjang = mounted && !!items[barang.id];
    const itemDiKeranjang = diKeranjang ? items[barang.id] : null;
    const tidakTersedia = diKeranjang && (itemDiKeranjang?.tidakTersedia ?? false);
    const habis = barang.jumlahTersedia < 1;

    return (
      <div
        className={cn(
          'rounded-lg border bg-white p-3 shadow-sm',
          diKeranjang && !tidakTersedia && 'border-green-400 bg-green-50/50',
          tidakTersedia && 'border-red-400 bg-red-50/50'
        )}
      >
        <div className="flex gap-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
            {barang.fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urlFile(barang.fotoUrl)} alt={barang.nama} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <Package className="h-6 w-6" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground line-clamp-1">{barang.nama}</p>
            <p className="font-mono text-xs text-muted-foreground">{barang.kodeBarang}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge className="border-primary/20 bg-primary/10 text-primary">{JENIS_BARANG[barang.jenis]}</Badge>
              <Badge className={kondisi.kelas}>{kondisi.label}</Badge>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={cn('text-sm font-semibold', habis ? 'text-red-600' : 'text-green-700')}>
              {barang.jumlahTersedia}
            </span>
            <span className="text-xs text-muted-foreground">/ {barang.jumlahTotal}</span>
          </div>
        </div>

        {tidakTersedia && (
          <div className="mt-2 flex items-center gap-1 text-xs font-medium text-red-600">
            <AlertTriangle className="h-3 w-3" />
            Tidak tersedia - akan dihapus
          </div>
        )}

        <div className="mt-2.5 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{barang.lokasiPenyimpanan || '-'}</p>
          <div className="flex gap-1.5">
            <Button asChild variant="outline" size="sm">
              <Link href={RUTE.peminjamKatalogDetail(barang.id)}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            {habis ? (
              <Button disabled size="sm" className="px-3">
                Habis
              </Button>
            ) : tidakTersedia || diKeranjang ? (
              <Button variant="destructive" size="sm" onClick={() => tanganiKeranjang(barang)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => tanganiKeranjang(barang)}>
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <PeringatanKondisiDialog
        terbuka={dialogRusakBerat.terbuka}
        onUbahTerbuka={(o) => setDialogRusakBerat({ terbuka: o, barang: dialogRusakBerat.barang })}
        namaBarang={dialogRusakBerat.barang?.nama || ''}
        onKonfirmasi={handleKonfirmasiRusakBerat}
      />

      <DialogBarangTidakTersedia
        terbuka={dialogStokTerbuka}
        onUbahTerbuka={setDialogStokTerbuka}
        barangTidakTersedia={barangYangDihapus}
        onHapusSemua={handleHapusBarangTidakTersedia}
      />

      {/* Mobile View */}
      {isMobile ? (
        <div className="flex flex-col gap-3">
          {grup.map((g) => {
            const aktif = terbuka.has(g.kategori);
            return (
              <div
                key={g.kategori}
                className={cn(
                  'overflow-hidden rounded-xl border bg-card',
                  aktif && 'border-blue-400'
                )}
              >
                <FolderHeader g={g} aktif={aktif} />

                {/* Mobile card view items */}
                {aktif && (
                  <div className="border-t p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {g.totalTersedia} unit tersedia
                      </p>
                      <Button
                        size="sm"
                        variant={adaDiKeranjang(g) ? 'destructive' : 'default'}
                        onClick={() => adaDiKeranjang(g) ? hapusSemuaFolder(g) : tambahSemuaFolder(g)}
                        disabled={sedangProses.has(g.kategori) || g.totalTersedia === 0}
                      >
                        {sedangProses.has(g.kategori) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : adaDiKeranjang(g) ? (
                          <>
                            <Trash2 className="h-4 w-4" /> Hapus Semua
                          </>
                        ) : semuaSudahDiKeranjang(g) ? (
                          <>
                            <Check className="h-4 w-4" /> Semua Ditambahkan
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" /> Tambah Semua
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="flex flex-col gap-2">
                      {g.items.map((barang) => (
                        <MobileCardItem key={barang.id} barang={barang} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // Desktop: Table view
        <div className="space-y-3">
          {grup.map((g) => {
            const aktif = terbuka.has(g.kategori);
            return (
              <div
                key={g.kategori}
                className={cn(
                  'overflow-hidden rounded-xl border bg-card',
                  aktif && 'border-blue-400 ring-1 ring-blue-400'
                )}
              >
                <FolderHeader g={g} aktif={aktif} />

                {aktif && (
                  <div className="border-t">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10 bg-card shadow-sm">
                          <tr className="border-b">
                            <th className="w-14 p-3 text-left font-semibold text-muted-foreground">Foto</th>
                            <th className="p-3 text-left font-semibold text-muted-foreground">Kode / Nama</th>
                            <th className="p-3 text-left font-semibold text-muted-foreground">NUP</th>
                            <th className="p-3 text-left font-semibold text-muted-foreground">Jenis</th>
                            <th className="p-3 text-left font-semibold text-muted-foreground">Kondisi</th>
                            <th className="p-3 text-center font-semibold text-muted-foreground">Stok</th>
                            <th className="p-3 text-left font-semibold text-muted-foreground">Lokasi</th>
                            <th className="w-48 p-3 text-right font-semibold text-muted-foreground">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.items.map((barang) => {
                            const kondisi = KONDISI_BARANG[barang.kondisi];
                            const diKeranjang = mounted && !!items[barang.id];
                            const itemDiKeranjang = diKeranjang ? items[barang.id] : null;
                            const tidakTersedia = diKeranjang && (itemDiKeranjang?.tidakTersedia ?? false);
                            const habis = barang.jumlahTersedia < 1;

                            return (
                              <tr
                                key={barang.id}
                                className={cn(
                                  'border-b transition-colors',
                                  diKeranjang && !tidakTersedia && 'bg-green-50',
                                  tidakTersedia && 'bg-red-50'
                                )}
                              >
                                <td className="p-3">
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
                                </td>
                                <td className="p-3">
                                  <p className="font-medium">{barang.nama}</p>
                                  <p className="font-mono text-xs text-muted-foreground">{barang.kodeBarang}</p>
                                  {tidakTersedia && (
                                    <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-red-600">
                                      <AlertTriangle className="h-3 w-3" />
                                      Tidak tersedia - akan dihapus
                                    </p>
                                  )}
                                </td>
                                <td className="p-3 font-mono text-muted-foreground">{barang.nup || '-'}</td>
                                <td className="p-3">
                                  <Badge className="border-primary/20 bg-primary/10 text-primary">{JENIS_BARANG[barang.jenis]}</Badge>
                                </td>
                                <td className="p-3">
                                  <Badge className={kondisi.kelas}>{kondisi.label}</Badge>
                                </td>
                                <td className="p-3 text-center">
                                  <span className={barang.jumlahTersedia > 0 ? 'text-green-700' : 'text-red-600'}>
                                    {barang.jumlahTersedia}
                                  </span>
                                  <span className="text-muted-foreground"> / {barang.jumlahTotal}</span>
                                </td>
                                <td className="p-3 text-muted-foreground">{barang.lokasiPenyimpanan || '-'}</td>
                                <td className="p-3">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button asChild variant="outline" size="sm">
                                      <Link href={RUTE.peminjamKatalogDetail(barang.id)}>
                                        <Eye className="h-4 w-4" />
                                      </Link>
                                    </Button>
                                    {habis ? (
                                      <Button disabled size="sm">Stok Habis</Button>
                                    ) : tidakTersedia || diKeranjang ? (
                                      <Button variant="destructive" size="sm" onClick={() => tanganiKeranjang(barang)}>
                                        <Trash2 className="h-4 w-4" /> Hapus
                                      </Button>
                                    ) : (
                                      <Button size="sm" onClick={() => tanganiKeranjang(barang)}>
                                        <Plus className="h-4 w-4" /> Tambah
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
