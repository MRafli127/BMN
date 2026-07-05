// ============================================================
//  Tampilan keranjang dalam format folder berdasarkan nama barang.
//  Mirip tampilan katalog - barang dikelompokkan per nama/merk.
//  Setiap unit barang hanya berjumlah 1.
// ============================================================

'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
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

interface Props {
  /** Judul/heading yang tampil sejajar dengan tombol buka-tutup folder. */
  header?: React.ReactNode;
}

export function FolderKeranjang({ header }: Props) {
  const [terbuka, setTerbuka] = useState<Set<string>>(new Set());
  const items = useKeranjangStore((s) => s.items);
  const hapus = useKeranjangStore((s) => s.hapus);

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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {header ?? <span />}
        <Button
          variant="ghost"
          size="sm"
          onClick={bukaTutupSemua}
          className="text-muted-foreground hover:text-primary"
        >
          <Icon name={semuaTerbuka ? 'unfold_less' : 'unfold_more'} className="text-[18px]" />
          {semuaTerbuka ? 'Tutup semua folder' : 'Buka semua folder'}
        </Button>
      </div>

      <div className="space-y-3">
        {grup.map((g) => {
          const aktif = terbuka.has(g.id);
          return (
            <div
              key={g.id}
              className={cn(
                'group overflow-hidden rounded-2xl border bg-gradient-to-br from-white to-primary/[0.04] shadow-soft transition-all duration-300',
                aktif
                  ? 'border-primary/25 shadow-card'
                  : 'border-primary/10 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card'
              )}
            >
              {/* Header folder */}
              <button
                type="button"
                onClick={() => toggle(g.id)}
                aria-expanded={aktif}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <span
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-300',
                    aktif ? 'bg-primary text-white' : 'bg-primary/10 text-primary group-hover:bg-primary/15'
                  )}
                >
                  <Icon name={aktif ? 'folder_open' : 'folder'} fill className="text-[22px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-jakarta font-bold text-foreground">{g.nama}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.items.length} unit
                    {g.merk && ` • Merk: ${g.merk}`}
                  </p>
                </div>
                <Badge className="border-primary/20 bg-primary/10 text-primary">{g.totalUnit} unit</Badge>
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-all duration-300',
                    aktif ? 'rotate-180 bg-primary/10 text-primary' : 'group-hover:bg-muted'
                  )}
                >
                  <Icon name="expand_more" className="text-[20px]" />
                </span>
              </button>

              {/* Isi folder: daftar items */}
              {aktif && (
                <ul className="animate-fade-in border-t border-primary/10">
                  {g.items.map((item) => {
                    const stokHabis = item.jumlahTersedia < 1;

                    return (
                      <li
                        key={item.barangId}
                        className="flex items-center gap-3 border-b border-primary/5 px-4 py-3 transition-colors last:border-b-0 hover:bg-primary/[0.03]"
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-primary/10 bg-muted">
                          {item.fotoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={urlFile(item.fotoUrl)}
                              alt={item.nama}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <Icon name="package_2" className="text-[20px]" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="break-all font-mono text-xs font-medium text-foreground">{item.kodeBarang}</p>
                          {item.merk && <p className="truncate text-xs text-muted-foreground">Merk: {item.merk}</p>}
                        </div>
                        <span
                          className={cn(
                            'shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                            stokHabis
                              ? 'border-red-200 bg-red-50 text-red-600 dark:bg-red-950/20'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20'
                          )}
                        >
                          {stokHabis ? 'Stok habis' : `Stok ${item.jumlahTersedia}`}
                        </span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:bg-red-50 hover:text-red-600"
                          onClick={() => hapusItem(item)}
                          aria-label="Hapus dari keranjang"
                        >
                          <Icon name="delete" className="text-[18px]" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
