// ============================================================
//  Tampilan keranjang dalam format folder berdasarkan nama barang.
//  Mirip tampilan katalog - barang dikelompokkan per nama/merk.
//  Setiap unit barang hanya berjumlah 1.
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { Folder, FolderOpen, ChevronDown, Package, Trash2, Check } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, urlFile } from '@/lib/utils';
import { useKeranjangStore } from '@/store/keranjangStore';
import { notify } from '@/components/ui/toast';
import type { ItemKeranjang } from '@/store/keranjangStore';

export interface GrupBarang {
  id: string; // identifier unik untuk grup (kombinasi nama + merk)
  nama: string;
  merk?: string | null;
  items: ItemKeranjang[];
  totalUnit: number;
}

export function kelompokkanPerNama(items: ItemKeranjang[]): GrupBarang[] {
  const peta = new Map<string, { items: ItemKeranjang[]; nama: string; merk: string | null }>();

  for (const item of items) {
    // Gunakan nama + merk sebagai kunci grup
    const kunci = `${item.nama}|${item.merk || ''}`;
    let grup = peta.get(kunci);
    if (!grup) {
      grup = { items: [], nama: item.nama, merk: item.merk ?? null };
      peta.set(kunci, grup);
    }
    grup.items.push(item);
  }

  return Array.from(peta.values(), ({ items, nama, merk }) => ({
    id: `${nama}|${merk || ''}`,
    nama,
    merk,
    items,
    totalUnit: items.length, // setiap item = 1 unit
  })).sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
}

export function FolderKeranjang() {
  const [terbuka, setTerbuka] = useState<Set<string>>(new Set());
  const items = useKeranjangStore((s) => s.items);
  const hapus = useKeranjangStore((s) => s.hapus);

  // Hindari hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const daftar = Object.values(items);
  const grup = kelompokkanPerNama(daftar);

  const toggle = (id: string) =>
    setTerbuka((lama) => {
      const baru = new Set(lama);
      if (baru.has(id)) baru.delete(id);
      else baru.add(id);
      return baru;
    });

  const semuaTerbuka = grup.length > 0 && grup.every((g) => terbuka.has(g.id));
  const bukaTutupSemua = () =>
    setTerbuka((lama) => {
      const baru = new Set(lama);
      for (const g of grup) {
        if (semuaTerbuka) baru.delete(g.id);
        else baru.add(g.id);
      }
      return baru;
    });

  const hapusItem = (item: ItemKeranjang) => {
    hapus(item.barangId);
    notify.info(`"${item.nama}" dihapus dari keranjang.`);
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
          const aktif = terbuka.has(g.id);
          return (
            <div key={g.id} className="overflow-hidden rounded-xl border bg-card">
              {/* Header folder */}
              <button
                type="button"
                onClick={() => toggle(g.id)}
                aria-expanded={aktif}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
              >
                <span className="text-primary">
                  {aktif ? <FolderOpen className="h-5 w-5" /> : <Folder className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{g.nama}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.items.length} unit
                    {g.merk && ` • Merk: ${g.merk}`}
                  </p>
                </div>
                <Badge className="border-primary/20 bg-primary/10 text-primary">{g.totalUnit} unit</Badge>
                <ChevronDown
                  className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', aktif && 'rotate-180')}
                />
              </button>

              {/* Isi folder: daftar items */}
              {aktif && (
                <div className="border-t">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14">Foto</TableHead>
                        <TableHead>Kode / Merk</TableHead>
                        <TableHead className="text-center">Stok</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {g.items.map((item) => {
                        const stokHabis = item.jumlahTersedia < 1;

                        return (
                          <TableRow key={item.barangId} className="bg-green-50/50 dark:bg-green-950/20">
                            <TableCell>
                              <div className="h-10 w-10 overflow-hidden rounded-md bg-muted">
                                {item.fotoUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={urlFile(item.fotoUrl)} alt={item.nama} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                    <Package className="h-5 w-5" />
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-mono text-xs break-all text-muted-foreground">{item.kodeBarang}</p>
                              {item.merk && <p className="text-sm text-muted-foreground">{item.merk}</p>}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              <span className={stokHabis ? 'text-red-600' : 'text-green-700'}>
                                {item.jumlahTersedia}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-red-600"
                                  onClick={() => hapusItem(item)}
                                  aria-label="Hapus dari keranjang"
                                >
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
    </>
  );
}