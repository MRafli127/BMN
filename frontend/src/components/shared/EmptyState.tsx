// ============================================================
//  Tampilan kondisi data kosong.
// ============================================================

import { Inbox, Package } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  judul?: string;
  deskripsi?: string;
  /** Lucide icon component atau nama Material Symbol (string) */
  ikon?: LucideIcon | string;
  aksi?: React.ReactNode;
}

export function EmptyState({
  judul = 'Belum ada data',
  deskripsi = 'Data yang Anda cari belum tersedia.',
  ikon: Ikon,
  aksi,
}: Props) {
  const isMaterialSymbol = typeof Ikon === 'string';
  const IconComponent = Ikon as LucideIcon | undefined;

  return (
    <div className="flex animate-page-in flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-6 py-14 text-center transition-colors duration-300 hover:border-primary/30 hover:bg-primary/[0.03]">
      <div className="animate-float mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 ring-4 ring-primary/5">
        {isMaterialSymbol ? (
          <span className="material-symbols-outlined text-3xl text-primary">{Ikon}</span>
        ) : (
          IconComponent && <IconComponent className="h-7 w-7 text-primary" />
        )}
      </div>
      <h3 className="text-base font-semibold text-foreground">{judul}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{deskripsi}</p>
      {aksi && <div className="mt-5">{aksi}</div>}
    </div>
  );
}

export { Package };
