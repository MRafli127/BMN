// ============================================================
//  Tampilan keranjang dalam format folder berdasarkan nama barang.
//  Mirip tampilan katalog - barang dikelompokkan per nama/merk.
//  Setiap unit barang hanya berjumlah 1.
//  Responsive: compact layout untuk mobile.
// ============================================================

'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, urlFile } from '@/lib/utils';
import { useKeranjangStore } from '@/store/keranjangStore';
import { notify } from '@/components/ui/toast';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { ItemKeranjang } from '@/store/keranjangStore';
import { AlertTriangle, ChevronDown } from 'lucide-react';

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
  const isMobile = useIsMobile();

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
    <div className={isMobile ? 'space-y-2' : 'space-y-3'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {header ?? <span />}
        <Button
          variant="ghost"
          size="sm"
          onClick={bukaTutupSemua}
          className="text-muted-foreground hover:text-primary"
        >
          <Icon name={semuaTerbuka ? 'unfold_less' : 'unfold_more'} className="text-[18px]" />
          <span className="hidden sm:inline">{semuaTerbuka ? 'Tutup semua' : 'Buka semua'}</span>
        </Button>
      </div>

      <div className={isMobile ? 'space-y-2' : 'space-y-3'}>
        {grup.map((g) => {
          const aktif = terbuka.has(g.id);
          return (
            <div
              key={g.id}
              className={cn(
                'group overflow-hidden rounded-2xl border bg-gradient-to-br from-white to-primary/[0.04] shadow-soft transition-all duration-300',
                aktif
                  ? 'border-primary/25 shadow-card'
                  : 'border-primary/10 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card',
                isMobile && 'rounded-xl'
              )}
            >
              {/* Header folder */}
              <button
                type="button"
                onClick={() => toggle(g.id)}
                aria-expanded={aktif}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3.5 text-left',
                  isMobile && 'px-3 py-2.5'
                )}
              >
                <span
                  className={cn(
                    'flex shrink-0 items-center justify-center rounded-xl transition-colors duration-300',
                    aktif ? 'bg-primary text-white' : 'bg-primary/10 text-primary',
                    isMobile ? 'h-9 w-9' : 'h-11 w-11'
                  )}
                >
                  <Icon name={aktif ? 'folder_open' : 'folder'} fill className={isMobile ? 'text-[18px]' : 'text-[22px]'} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn('truncate font-jakarta font-bold text-foreground', isMobile ? 'text-sm' : '')}>{g.nama}</p>
                  <p className={cn('text-muted-foreground', isMobile ? 'text-[10px]' : 'text-xs')}>
                    {g.items.length} unit
                    {g.merk && ` • ${g.merk}`}
                  </p>
                </div>
                <Badge className={cn('border-primary/20 bg-primary/10 text-primary', isMobile ? 'text-[10px] px-1.5' : '')}>{g.totalUnit}</Badge>
                <span
                  className={cn(
                    'flex shrink-0 items-center justify-center rounded-full text-muted-foreground transition-all duration-300',
                    aktif ? 'rotate-180 bg-primary/10 text-primary' : 'group-hover:bg-muted',
                    isMobile ? 'h-6 w-6' : 'h-7 w-7'
                  )}
                >
                  <Icon name="expand_more" className={isMobile ? 'text-[16px]' : 'text-[20px]'} />
                </span>
              </button>

              {/* Isi folder: daftar items */}
              {aktif && (
                <ul className={cn('animate-fade-in border-t border-primary/10', isMobile ? 'space-y-2 p-3' : '')}>
                  {g.items.map((item) => {
                    const stokHabis = item.jumlahTersedia < 1;
                    const tidakTersedia = item.tidakTersedia ?? false;

                    return (
                      <li
                        key={item.barangId}
                        className={cn(
                          'flex items-center gap-3 border-b border-primary/5 px-4 py-3 transition-colors last:border-b-0 hover:bg-primary/[0.03]',
                          tidakTersedia && 'bg-red-50/50',
                          isMobile ? 'px-0 py-2' : ''
                        )}
                      >
                        <div className={cn('shrink-0 overflow-hidden rounded-lg border border-primary/10 bg-muted', isMobile ? 'h-10 w-10' : 'h-12 w-12')}>
                          {item.fotoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={urlFile(item.fotoUrl)}
                              alt={item.nama}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <Icon name="package_2" className={isMobile ? 'text-[16px]' : 'text-[20px]'} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn('break-all font-medium text-foreground', isMobile ? 'text-xs' : 'text-sm')}>{item.kodeBarang}</p>
                          {item.merk && <p className={cn('truncate text-muted-foreground', isMobile ? 'text-[10px]' : 'text-xs')}>{item.merk}</p>}
                          {tidakTersedia && (
                            <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-red-600">
                              <AlertTriangle className="h-3 w-3" />
                              Tidak tersedia
                            </p>
                          )}
                        </div>
                        <span
                          className={cn(
                            'shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold',
                            isMobile ? 'text-[10px]' : '',
                            tidakTersedia
                              ? 'border-red-200 bg-red-100 text-red-600'
                              : stokHabis
                              ? 'border-red-200 bg-red-50 text-red-600'
                              : 'border-primary/20 bg-primary/50 text-primary-700'
                          )}
                        >
                          {tidakTersedia ? 'Habis' : stokHabis ? 'Habis' : item.jumlahTersedia}
                        </span>
                        <Button
                          type="button"
                          size={isMobile ? 'sm' : 'icon'}
                          variant="ghost"
                          className={cn('shrink-0 text-muted-foreground hover:bg-red-50 hover:text-red-600', isMobile ? 'h-8 w-8 rounded-lg' : 'h-9 w-9 rounded-full')}
                          onClick={() => hapusItem(item)}
                          aria-label="Hapus"
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
