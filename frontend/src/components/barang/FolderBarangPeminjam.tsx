// ============================================================
//  Daftar barang untuk PEMINJAM dalam bentuk folder per merk.
//  Mirip FolderBarang admin, tapi dengan aksi "Tambah ke Keranjang".
//  Support multi barang - user bisa memilih banyak barang sekaligus.
//  Setiap unit barang hanya berjumlah 1.
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Folder, FolderOpen, ChevronDown, Eye, ShoppingCart, Check, Plus, Package, Trash2, Loader2 } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, urlFile } from '@/lib/utils';
import { JENIS_BARANG, KONDISI_BARANG } from '@/constants/status';
import { RUTE } from '@/constants/routes';
import { useKeranjangStore } from '@/store/keranjangStore';
import { notify } from '@/components/ui/toast';
import type { Barang } from '@/types/barang.type';

export interface GrupMerk {
  merk: string;
  items: Barang[];
  totalUnit: number;
  totalStok: number;
  totalTersedia: number;
}

export function kelompokkanPerMerk(data: Barang[]): GrupMerk[] {
  const peta = new Map<string, { items: Barang[]; jumlahLabel: Map<string, number> }>();

  for (const barang of data) {
    const asli = barang.merk?.trim() || 'Tanpa Merk';
    const kunci = asli.toLowerCase().replace(/\s+/g, ' ');
    let grup = peta.get(kunci);
    if (!grup) {
      grup = { items: [], jumlahLabel: new Map() };
      peta.set(kunci, grup);
    }
    grup.items.push(barang);
    grup.jumlahLabel.set(asli, (grup.jumlahLabel.get(asli) || 0) + 1);
  }

  return Array.from(peta.values(), ({ items, jumlahLabel }) => {
    let merk = 'Tanpa Merk';
    let terbanyak = -1;
    for (const [label, jumlah] of jumlahLabel) {
      if (jumlah > terbanyak) {
        terbanyak = jumlah;
        merk = label;
      }
    }
    return {
      merk,
      items,
      totalUnit: items.length,
      totalStok: items.reduce((s, i) => s + i.jumlahTotal, 0),
      totalTersedia: items.reduce((s, i) => s + i.jumlahTersedia, 0),
    };
  }).sort((a, b) => a.merk.localeCompare(b.merk, 'id', { sensitivity: 'base' }));
}

interface Props {
  grup: GrupMerk[];
}

export function FolderBarangPeminjam({ grup }: Props) {
  const [terbuka, setTerbuka] = useState<Set<string>>(new Set());
  const items = useKeranjangStore((s) => s.items);
  const tambah = useKeranjangStore((s) => s.tambah);
  const hapus = useKeranjangStore((s) => s.hapus);

  // Hindari hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const toggle = (merk: string) =>
    setTerbuka((lama) => {
      const baru = new Set(lama);
      if (baru.has(merk)) baru.delete(merk);
      else baru.add(merk);
      return baru;
    });

  const semuaTerbuka = grup.length > 0 && grup.every((g) => terbuka.has(g.merk));
  const bukaTutupSemua = () =>
    setTerbuka((lama) => {
      const baru = new Set(lama);
      for (const g of grup) {
        if (semuaTerbuka) baru.delete(g.merk);
        else baru.add(g.merk);
      }
      return baru;
    });

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
      tambah(barang);
      notify.sukses(`"${barang.nama}" ditambahkan ke keranjang.`);
    }
  };

  // Tambah semua unit tersedia di folder ke keranjang
  const [sedangTambahSemua, setSedangTambahSemua] = useState<Set<string>>(new Set());
  const tambahSemuaFolder = (g: GrupMerk) => {
    if (!mounted) return;
    setSedangTambahSemua((lama) => new Set(lama).add(g.merk));

    const tersedia = g.items.filter((b) => b.jumlahTersedia > 0);
    let berhasil = 0;
    let gagal = 0;

    for (const barang of tersedia) {
      if (!items[barang.id]) {
        if (barang.jumlahTersedia > 0) {
          tambah(barang);
          berhasil++;
        }
      } else {
        // Sudah ada, skip (tidak overwrite)
        gagal++;
      }
    }

    setTimeout(() => {
      setSedangTambahSemua((lama) => {
        const baru = new Set(lama);
        baru.delete(g.merk);
        return baru;
      });

      if (berhasil > 0) {
        notify.sukses(`Berhasil menambahkan ${berhasil} unit dari folder "${g.merk}" ke keranjang.`);
      }
      if (gagal > 0) {
        notify.info(`${gagal} unit sudah ada di keranjang, dilewati.`);
      }
      if (berhasil === 0 && gagal === 0) {
        notify.gagal('Tidak ada unit yang tersedia di folder ini.');
      }
    }, 100);
  };

  // Cek apakah semua unit di folder sudah di keranjang
  const semuaSudahDiKeranjang = (g: GrupMerk) => {
    return g.items.every((b) => b.jumlahTersedia < 1 || !!items[b.id]);
  };

  return (
    <>
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={bukaTutupSemua}>
          {semuaTerbuka ? 'Tutup semua folder' : 'Buka semua folder'}
        </Button>
      </div>

      <div className="space-y-3">
        {grup.map((g) => {
          const aktif = terbuka.has(g.merk);
          return (
            <div key={g.merk} className="overflow-hidden rounded-xl border bg-card">
              {/* Header folder */}
              <button
                type="button"
                onClick={() => toggle(g.merk)}
                aria-expanded={aktif}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
              >
                <span className="text-primary">
                  {aktif ? <FolderOpen className="h-5 w-5" /> : <Folder className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{g.merk}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.totalUnit} unit • {g.totalTersedia} tersedia / {g.totalStok}
                  </p>
                </div>
                <Badge className="border-primary/20 bg-primary/10 text-primary">{g.totalUnit} unit</Badge>
                {aktif && g.totalTersedia > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant={semuaSudahDiKeranjang(g) ? 'secondary' : 'default'}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!semuaSudahDiKeranjang(g)) {
                        tambahSemuaFolder(g);
                      }
                    }}
                    disabled={sedangTambahSemua.has(g.merk)}
                    className="shrink-0"
                  >
                    {sedangTambahSemua.has(g.merk) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : semuaSudahDiKeranjang(g) ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {sedangTambahSemua.has(g.merk) ? 'Memuat...' : semuaSudahDiKeranjang(g) ? 'Semua Ditambahkan' : 'Tambah Semua'}
                  </Button>
                )}
                <ChevronDown
                  className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', aktif && 'rotate-180')}
                />
              </button>

              {/* Isi folder: daftar unit dengan aksi tambah ke keranjang */}
              {aktif && (
                <div className="border-t">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14">Foto</TableHead>
                        <TableHead>Kode / Nama</TableHead>
                        <TableHead>NUP</TableHead>
                        <TableHead>Jenis</TableHead>
                        <TableHead>Kondisi</TableHead>
                        <TableHead className="text-center">Stok</TableHead>
                        <TableHead>Lokasi</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {g.items.map((barang) => {
                        const kondisi = KONDISI_BARANG[barang.kondisi];
                        const diKeranjang = mounted && !!items[barang.id];
                        const habis = barang.jumlahTersedia < 1;

                        return (
                          <TableRow key={barang.id} className={diKeranjang ? 'bg-green-50 dark:bg-green-950/20' : ''}>
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
                            <TableCell className="text-sm text-muted-foreground">{barang.lokasiPenyimpanan || '-'}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1.5">
                                <Button asChild variant="outline" size="sm">
                                  <Link href={RUTE.peminjamKatalogDetail(barang.id)}>
                                    <Eye className="h-4 w-4" /> Detail
                                  </Link>
                                </Button>

                                {habis ? (
                                  <Button className="flex-1" disabled size="sm">
                                    Stok Habis
                                  </Button>
                                ) : diKeranjang ? (
                                  // Mode: di keranjang - tampilkan tombol hapus
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => tanganiKeranjang(barang)}
                                  >
                                    <Check className="h-4 w-4" /> Ditambahkan
                                  </Button>
                                ) : (
                                  // Mode: belum di keranjang
                                  <Button
                                    size="sm"
                                    onClick={() => tanganiKeranjang(barang)}
                                  >
                                    <ShoppingCart className="h-4 w-4" /> Tambah
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
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
