// ============================================================
//  Timeline visual status peminjaman.
//  Alur normal: Menunggu → Disetujui → Dipinjam → Dikembalikan.
//  Status khusus: Ditolak & Terlambat ditangani tersendiri.
// ============================================================

'use client';

import { Check, Clock, ThumbsUp, PackageCheck, Undo2, XCircle, AlertTriangle, FileEdit } from 'lucide-react';
import { cn, formatTanggalLengkap } from '@/lib/utils';
import type { Peminjaman, StatusPeminjaman } from '@/types/peminjaman.type';

interface Langkah {
  kunci: StatusPeminjaman;
  label: string;
  ikon: typeof Clock;
}

const LANGKAH: Langkah[] = [
  { kunci: 'DRAFT', label: 'Draft Pengajuan', ikon: FileEdit },
  { kunci: 'MENUNGGU', label: 'Menunggu Persetujuan', ikon: Clock },
  { kunci: 'DISETUJUI', label: 'Disetujui', ikon: ThumbsUp },
  { kunci: 'DIPINJAM', label: 'Barang Dipinjam', ikon: PackageCheck },
  { kunci: 'DIKEMBALIKAN', label: 'Dikembalikan', ikon: Undo2 },
];

// Indeks langkah aktif berdasarkan status
function indeksAktif(status: StatusPeminjaman): number {
  switch (status) {
    case 'DRAFT':
      return 0;
    case 'MENUNGGU':
      return 1;
    case 'DISETUJUI':
      return 2;
    case 'DIPINJAM':
    case 'TERLAMBAT':
      return 3;
    case 'DIKEMBALIKAN':
      return 4;
    default:
      return -1;
  }
}

export function TimelineStatus({ peminjaman }: { peminjaman: Peminjaman }) {
  const { status } = peminjaman;

  // Kasus ditolak: tampilkan alur singkat
  if (status === 'DITOLAK') {
    return (
      <div className="space-y-4">
        <BarisTimeline aktif selesai ikon={Clock} label="Pengajuan Diterima" waktu={peminjaman.tanggalPengajuan} />
        <BarisTimeline
          aktif
          warna="merah"
          ikon={XCircle}
          label="Pengajuan Ditolak"
          waktu={peminjaman.updatedAt}
          catatan={peminjaman.catatanAdmin}
          terakhir
        />
      </div>
    );
  }

  const aktif = indeksAktif(status);
  const terlambat = status === 'TERLAMBAT';

  return (
    <div className="space-y-1">
      {LANGKAH.map((langkah, i) => {
        const selesai = i < aktif;
        const sedangBerjalan = i === aktif;
        const Ikon = terlambat && i === 3 ? AlertTriangle : langkah.ikon;
        // Waktu tiap langkah:
        //  0 Draft Pengajuan  -> tanggal record dibuat
        //  1 Menunggu         -> tanggal pengajuan dikirim ke admin (tanggalKirim);
        //                        untuk data lama tanpa tanggalKirim, pakai tanggalPengajuan
        //  4 Dikembalikan     -> tanggal kembali aktual
        const waktu =
          i === 0
            ? peminjaman.tanggalPengajuan
            : i === 1
            ? peminjaman.tanggalKirim ??
              (status !== 'DRAFT' ? peminjaman.tanggalPengajuan : undefined)
            : i === 4
            ? peminjaman.tanggalKembaliAktual
            : undefined;
        return (
          <BarisTimeline
            key={langkah.kunci}
            ikon={selesai ? Check : Ikon}
            label={terlambat && i === 3 ? 'Sedang Dipinjam (Terlambat)' : langkah.label}
            selesai={selesai}
            aktif={selesai || sedangBerjalan}
            warna={terlambat && sedangBerjalan ? 'merah' : undefined}
            terakhir={i === LANGKAH.length - 1}
            waktu={waktu}
          />
        );
      })}
    </div>
  );
}

interface BarisProps {
  ikon: typeof Clock;
  label: string;
  selesai?: boolean;
  aktif?: boolean;
  terakhir?: boolean;
  warna?: 'merah';
  waktu?: string | null;
  catatan?: string | null;
}

function BarisTimeline({ ikon: Ikon, label, selesai, aktif, terakhir, warna, waktu, catatan }: BarisProps) {
  const warnaLingkaran = warna === 'merah'
    ? 'bg-red-600 text-white'
    : aktif
    ? 'bg-primary text-primary-foreground'
    : 'bg-muted text-muted-foreground';

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-full', warnaLingkaran)}>
          <Ikon className="h-4 w-4" />
        </div>
        {!terakhir && <div className={cn('w-0.5 flex-1', selesai ? 'bg-primary' : 'bg-border')} />}
      </div>
      <div className={cn('pb-6', terakhir && 'pb-0')}>
        <p className={cn('text-sm font-semibold', aktif ? 'text-foreground' : 'text-muted-foreground')}>{label}</p>
        {waktu && <p className="text-xs text-muted-foreground">{formatTanggalLengkap(waktu)}</p>}
        {catatan && (
          <p className="mt-1 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">Catatan: {catatan}</p>
        )}
      </div>
    </div>
  );
}
