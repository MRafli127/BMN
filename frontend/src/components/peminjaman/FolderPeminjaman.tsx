// ============================================================
//  Tampilan folder peminjaman — dikelompokkan per nama peminjam.
//  Tiap folder berisi daftar barang/peminjaman milik orang tersebut
//  (memakai ulang TabelPeminjaman di dalamnya).
// ============================================================

'use client';

import { useMemo, useState } from 'react';
import { ChevronRight, Folder, FolderOpen, AlertTriangle } from 'lucide-react';
import { TabelPeminjaman, hitungInfoPensiun } from '@/components/peminjaman/TabelPeminjaman';
import { cn } from '@/lib/utils';
import type { Peminjaman } from '@/types/peminjaman.type';

interface Props {
  data: Peminjaman[];
  hrefDetail: (id: string) => string;
  // Bila diberikan, tombol hapus per baris ditampilkan (khusus admin).
  onHapus?: (id: string) => Promise<void>;
}

interface Grup {
  kunci: string;
  nama: string;
  nip?: string; // NIP peminjam (info sekunder di header folder)
  eselon3?: string; // Eselon III (info sekunder di header folder)
  retirementDate?: string | null; // Tanggal pensiun peminjam
  items: Peminjaman[];
}

export function FolderPeminjaman({ data, hrefDetail, onHapus }: Props) {
  // Kumpulan folder yang sedang terbuka (key = nama peminjam).
  const [terbuka, setTerbuka] = useState<Set<string>>(new Set());

  // Kelompokkan peminjaman per nama peminjam, urut alfabetis.
  const grup = useMemo<Grup[]>(() => {
    const peta = new Map<string, Grup>();
    for (const p of data) {
      const nama = p.peminjam?.nama?.trim() || 'Tanpa Nama';
      const kunci = nama.toLowerCase();
      const ada = peta.get(kunci);
      if (ada) {
        ada.items.push(p);
      } else {
        peta.set(kunci, {
          kunci,
          nama,
          nip: p.peminjam?.nip ?? undefined,
          eselon3: p.peminjam?.eselon3 ?? undefined,
          retirementDate: p.peminjam?.retirementDate ?? undefined,
          items: [p]
        });
      }
    }
    return [...peta.values()].sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
  }, [data]);

  const toggle = (kunci: string) => {
    setTerbuka((prev) => {
      const baru = new Set(prev);
      if (baru.has(kunci)) baru.delete(kunci);
      else baru.add(kunci);
      return baru;
    });
  };

  return (
    <div className="space-y-3">
      {grup.map((g) => {
        const buka = terbuka.has(g.kunci);
        const infoPensiun = hitungInfoPensiun(g.retirementDate ?? null);
        const adaWarningPensiun = infoPensiun.isWarning;

        return (
          <div
            key={g.kunci}
            className={cn(
              'overflow-hidden rounded-xl border bg-card transition-colors',
              // Border kiri menandai status pensiun
              adaWarningPensiun && infoPensiun.isDanger && 'border-l-4 border-l-error',
              adaWarningPensiun && !infoPensiun.isDanger && 'border-l-4 border-l-warning',
              !adaWarningPensiun && (buka ? 'border-blue-400 ring-1 ring-blue-400' : 'border-outline-variant')
            )}
          >
            {/* Header folder */}
            <button
              type="button"
              onClick={() => toggle(g.kunci)}
              aria-expanded={buka}
              className={cn(
                'flex w-full items-center gap-3 p-stack-md text-left transition-colors',
                adaWarningPensiun && infoPensiun.isDanger && 'bg-error/5 hover:bg-error/10',
                adaWarningPensiun && !infoPensiun.isDanger && 'bg-warning/5 hover:bg-warning/10',
                !adaWarningPensiun && (buka ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-primary/5')
              )}
            >
              <ChevronRight
                className={cn(
                  'h-5 w-5 shrink-0 text-on-surface-variant transition-transform',
                  buka && 'rotate-90',
                  !adaWarningPensiun && 'text-blue-600'
                )}
              />
              {!adaWarningPensiun && (buka ? (
                <FolderOpen className="h-6 w-6 shrink-0 text-blue-600" />
              ) : (
                <Folder className="h-6 w-6 shrink-0 text-primary" />
              ))}
              {adaWarningPensiun && (
                <AlertTriangle className={cn('h-6 w-6 shrink-0', infoPensiun.isDanger ? 'text-error' : 'text-warning')} />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{g.nama}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {g.nip && <p className="truncate font-mono text-xs text-muted-foreground">NIP {g.nip}</p>}
                  {g.eselon3 && <p className="truncate text-xs text-muted-foreground">{g.eselon3}</p>}
                  {/* Indikator pensiun di header folder */}
                  {adaWarningPensiun && (
                    <span
                      className={cn(
                        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium',
                        infoPensiun.isDanger ? 'bg-error/10 text-error' : 'bg-warning/10 text-warning'
                      )}
                      title={`Pensiun dalam ${infoPensiun.label}`}
                    >
                      Pensiun: {infoPensiun.label}
                    </span>
                  )}
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {g.items.length} peminjaman
              </span>
            </button>

            {/* Isi folder — daftar barang yang dipinjam */}
            {buka && (
              <div className="border-t border-outline-variant p-stack-md">
                <TabelPeminjaman data={g.items} hrefDetail={hrefDetail} tampilkanMerk onHapus={onHapus} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
