// ============================================================
//  Daftar "Barang Dipinjam" dalam bentuk folder per unit barang.
//  Setiap barang yang dipinjam menjadi satu folder; saat dibuka,
//  menampilkan Label & QR Identitas Barang (meniru stiker aset BMN)
//  yang diambil dari data barang di Manajemen Barang.
//
//  Isi QR = kunci unik aset: "Kode Satker-Kode Barang-NUP".
//  Dipakai bersama oleh Detail Peminjaman admin & peminjam.
// ============================================================

'use client';

import { useState } from 'react';
import { Folder, FolderOpen, ChevronDown, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { QrBarang } from '@/components/barang/QrBarang';
import { cn } from '@/lib/utils';
import { JENIS_BARANG } from '@/constants/status';
import type { DetailPeminjaman } from '@/types/peminjaman.type';

interface Props {
  detail?: DetailPeminjaman[];
}

export function FolderBarangDipinjam({ detail }: Props) {
  const [terbuka, setTerbuka] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setTerbuka((lama) => {
      const baru = new Set(lama);
      if (baru.has(id)) baru.delete(id);
      else baru.add(id);
      return baru;
    });

  if (!detail || detail.length === 0) {
    return <p className="text-sm text-muted-foreground">Tidak ada barang.</p>;
  }

  return (
    <div className="space-y-2">
      {detail.map((d) => {
        const aktif = terbuka.has(d.id);
        const barang = d.barang;
        return (
          <div key={d.id} className="overflow-hidden rounded-lg border bg-muted/30">
            {/* Header folder — klik untuk buka/tutup identitas barang */}
            <button
              type="button"
              onClick={() => toggle(d.id)}
              aria-expanded={aktif}
              className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/60"
            >
              <span className="text-primary">
                {barang ? (
                  aktif ? (
                    <FolderOpen className="h-5 w-5" />
                  ) : (
                    <Folder className="h-5 w-5" />
                  )
                ) : (
                  <Package className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{barang?.nama || 'Barang tidak ditemukan'}</p>
                <p className="text-xs text-muted-foreground">
                  Merk: <span className="font-medium text-foreground">{barang?.merk || '-'}</span>
                </p>
                <p className="break-all font-mono text-xs text-muted-foreground">
                  {barang?.kodeBarang}
                  {barang ? ` • ${JENIS_BARANG[barang.jenis]}` : ''}
                </p>
              </div>
              <Badge className="border-primary/20 bg-primary/10 text-primary">{d.jumlahPinjam} unit</Badge>
              {barang && (
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                    aktif && 'rotate-180'
                  )}
                />
              )}
            </button>

            {/* Isi folder: Label & QR identitas barang */}
            {aktif && barang && (
              <div className="border-t bg-card p-3">
                <QrBarang barang={barang} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
