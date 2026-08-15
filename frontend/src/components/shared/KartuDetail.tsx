// ============================================================
//  Elemen kartu detail bergaya seragam (desain SIPP-BMN):
//   - KepalaKartu : kepala kartu beraksen gradien + ikon
//   - InfoIkon    : baris info berlabel dengan ikon kecil
//   - LangkahItem : butir langkah bernomor dengan garis penghubung
//  Dipakai di halaman keranjang, formulir pengajuan, & detail
//  peminjaman (peminjam maupun admin).
// ============================================================

import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

/** Kepala kartu beraksen gradien + ikon, dengan slot aksi di kanan. */
export function KepalaKartu({
  ikon,
  judul,
  deskripsi,
  aksi,
}: {
  ikon: string;
  judul: string;
  deskripsi?: string;
  aksi?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/10 bg-gradient-to-r from-primary/[0.07] to-transparent px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon name={ikon} fill className="text-[20px]" />
        </div>
        <div>
          <h2 className="font-jakarta text-base font-bold leading-tight text-primary">{judul}</h2>
          {deskripsi && <p className="text-xs text-muted-foreground">{deskripsi}</p>}
        </div>
      </div>
      {aksi}
    </div>
  );
}

/** Baris info berlabel dengan ikon kecil. */
export function InfoIkon({ ikon, label, nilai }: { ikon: string; label: string; nilai?: string | null }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary/70">
        <Icon name={ikon} className="text-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="break-words font-semibold text-foreground">{nilai || '-'}</p>
      </div>
    </div>
  );
}

/** Butir langkah bernomor dengan garis penghubung (timeline vertikal).
 *  Saat `selesai`, lingkaran nomor berubah menjadi centang hijau. */
export function LangkahItem({
  nomor,
  judul,
  selesai = false,
  terakhir = false,
  children,
}: {
  nomor: number;
  judul: string;
  selesai?: boolean;
  terakhir?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 transition-colors',
            selesai
              ? 'bg-emerald-100 text-emerald-700 ring-emerald-300 dark:bg-emerald-950/30'
              : 'bg-primary/10 text-primary ring-primary/20'
          )}
        >
          {selesai ? <Icon name="check" className="text-[16px]" /> : nomor}
        </span>
        {!terakhir && <span aria-hidden className="mt-1 w-px flex-1 bg-primary/15" />}
      </div>
      <div className={cn('min-w-0 flex-1', !terakhir && 'pb-5')}>
        <p className="text-sm font-semibold text-foreground">{judul}</p>
        {children}
      </div>
    </li>
  );
}
