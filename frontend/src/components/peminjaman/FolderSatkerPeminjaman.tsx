// ============================================================
//  Tampilan folder peminjaman — dikelompokkan per kode satker.
//  Tiap folder berisi daftar peminjaman dari satker tersebut.
//  (memakai ulang TabelPeminjaman di dalamnya).
// ============================================================

'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Folder, FolderOpen } from 'lucide-react';
import { TabelPeminjaman } from '@/components/peminjaman/TabelPeminjaman';
import { cn } from '@/lib/utils';
import { OPSI_FILTER_BARANG } from '@/constants/status';
import type { Peminjaman } from '@/types/peminjaman.type';

interface Props {
  data: Peminjaman[];
  hrefDetail: (id: string) => string;
  // Bila diberikan, tombol hapus per baris ditampilkan (khusus admin).
  onHapus?: (id: string) => Promise<void>;
  // Pilihancheckbox massal (khusus admin)
  terpilih?: string[];
  onUbahTerpilih?: (ids: string[]) => void;
}

interface GrupSatker {
  kodeSatker: string;
  label: string;
  items: Peminjaman[];
}

// Ambil kode satker dari peminjaman (dari barang pertama yang dipinjam)
function ambilKodeSatker(p: Peminjaman): string | null {
  return p.detail?.[0]?.barang?.kodeSatker ?? null;
}

export function FolderSatkerPeminjaman({
  data,
  hrefDetail,
  onHapus,
  terpilih,
  onUbahTerpilih,
}: Props) {
  // Kumpulan folder yang sedang terbuka (key = kode satker).
  const [terbuka, setTerbuka] = useState<Set<string>>(new Set());

  // Otomatis buka folder yang memiliki item terpilih
  useEffect(() => {
    if (!terpilih || terpilih.length === 0) return;
    const baru = new Set<string>();
    for (const p of data) {
      if (terpilih.includes(p.id)) {
        const kode = ambilKodeSatker(p);
        if (kode) baru.add(kode);
      }
    }
    if (baru.size > 0) {
      setTerbuka((prev) => {
        const digabung = new Set(prev);
        baru.forEach((k) => digabung.add(k));
        return digabung;
      });
    }
  }, [terpilih, data]);

  // Label nama satker berdasarkan kode
  const labelSatker = (kode: string): string => {
    const found = OPSI_FILTER_BARANG.find((s) => s.value === kode);
    return found ? found.label : kode;
  };

  // Kelompokkan peminjaman per kode satker
  const grup = useMemo<GrupSatker[]>(() => {
    // Buat peta semua satker dari OPSI_FILTER_BARANG
    const petaSatker = new Map<string, GrupSatker>();
    for (const satker of OPSI_FILTER_BARANG) {
      petaSatker.set(satker.value, {
        kodeSatker: satker.value,
        label: satker.label,
        items: [],
      });
    }

    // Masukkan peminjaman ke grup satkernya masing-masing
    for (const p of data) {
      const kode = ambilKodeSatker(p);
      if (kode && petaSatker.has(kode)) {
        petaSatker.get(kode)!.items.push(p);
      } else if (kode) {
        // Kode satker tidak ada di daftar OPSI_FILTER_BARANG, buat grup baru
        petaSatker.set(kode, {
          kodeSatker: kode,
          label: labelSatker(kode),
          items: [p],
        });
      } else {
        // Tidak ada kode satker, masukkan ke grup "Tanpa Satker"
        const kunci = '_tanpa_satker';
        if (!petaSatker.has(kunci)) {
          petaSatker.set(kunci, {
            kodeSatker: kunci,
            label: 'Tanpa Kode Satker',
            items: [],
          });
        }
        petaSatker.get(kunci)!.items.push(p);
      }
    }

    // Urutkan: satker dengan item di atas, kosong di bawah
    return [...petaSatker.values()].sort((a, b) => {
      // Prioritaskan yang ada itemnya
      if (a.items.length > 0 && b.items.length === 0) return -1;
      if (a.items.length === 0 && b.items.length > 0) return 1;
      // Urutkan alfabetis berdasarkan label
      return a.label.localeCompare(b.label, 'id');
    });
  }, [data]);

  // Hitung total item per grup
  const totalItemPerGrup = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of grup) {
      map.set(g.kodeSatker, g.items.length);
    }
    return map;
  }, [grup]);

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
        const buka = terbuka.has(g.kodeSatker);
        const jumlahItem = totalItemPerGrup.get(g.kodeSatker) ?? 0;

        // Jangan tampilkan folder kosong (opsional, bisa dihilangkan jika ingin tampilkan semua)
        // if (jumlahItem === 0) return null;

        return (
          <div
            key={g.kodeSatker}
            className={cn(
              'overflow-hidden rounded-xl border bg-card transition-colors',
              buka ? 'border-blue-400 ring-1 ring-blue-400' : 'border-outline-variant'
            )}
          >
            {/* Header folder satker */}
            <button
              type="button"
              onClick={() => toggle(g.kodeSatker)}
              aria-expanded={buka}
              className={cn(
                'flex w-full items-center gap-3 p-stack-md text-left transition-colors',
                buka ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-primary/5'
              )}
            >
              <ChevronRight
                className={cn(
                  'h-5 w-5 shrink-0 text-on-surface-variant transition-transform',
                  buka && 'rotate-90',
                  'text-blue-600'
                )}
              />
              {buka ? (
                <FolderOpen className="h-6 w-6 shrink-0 text-blue-600" />
              ) : (
                <Folder className="h-6 w-6 shrink-0 text-primary" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{g.label}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">{g.kodeSatker}</p>
              </div>
              <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {jumlahItem} peminjaman
              </span>
            </button>

            {/* Isi folder — daftar peminjaman */}
            {buka && (
              <div className="border-t border-outline-variant p-stack-md">
                <TabelPeminjaman
                  data={g.items}
                  hrefDetail={hrefDetail}
                  tampilkanPeminjam
                  tampilkanMerk
                  onHapus={onHapus}
                  terpilih={terpilih}
                  onUbahTerpilih={onUbahTerpilih}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
