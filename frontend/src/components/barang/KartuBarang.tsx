// ============================================================
//  Kartu barang untuk katalog peminjam.
// ============================================================

'use client';

import { Package, MapPin, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn, urlFile } from '@/lib/utils';
import { JENIS_BARANG, KONDISI_BARANG } from '@/constants/status';
import type { Barang } from '@/types/barang.type';

interface Props {
  barang: Barang;
  aksi?: React.ReactNode; // tombol/footer kustom (mis. "Ajukan Pinjam")
}

export function KartuBarang({ barang, aksi }: Props) {
  const tersedia = barang.jumlahTersedia > 0;
  const kondisi = KONDISI_BARANG[barang.kondisi];

  return (
    <Card className="group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated">
      {/* Foto — dengan sapuan cahaya saat kartu di-hover */}
      <div className="shine-sweep relative h-40 w-full overflow-hidden bg-muted">
        {barang.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={urlFile(barang.fotoUrl)}
            alt={barang.nama}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Package className="h-12 w-12" />
          </div>
        )}
        <span
          className={cn(
            'absolute right-2 top-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
            tersedia ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          )}
        >
          {tersedia ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          {tersedia ? 'Tersedia' : 'Habis'}
        </span>
      </div>

      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-semibold leading-tight text-foreground">{barang.nama}</h3>
        </div>
        <p className="font-mono text-xs text-muted-foreground">{barang.kodeBarang}</p>
        {barang.merk && <p className="text-xs text-muted-foreground">Merk: <span className="font-medium text-foreground">{barang.merk}</span></p>}

        <div className="flex flex-wrap gap-1.5">
          <Badge className="border-primary/20 bg-primary/10 text-primary">{JENIS_BARANG[barang.jenis]}</Badge>
          <Badge className={kondisi.kelas}>{kondisi.label}</Badge>
        </div>

        {barang.lokasiPenyimpanan && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {barang.lokasiPenyimpanan}
          </p>
        )}

        <div className="mt-1 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Stok tersedia</span>
          <span className="font-semibold text-foreground">
            {barang.jumlahTersedia} / {barang.jumlahTotal}
          </span>
        </div>

        {aksi && <div className="mt-auto pt-3">{aksi}</div>}
      </CardContent>
    </Card>
  );
}
