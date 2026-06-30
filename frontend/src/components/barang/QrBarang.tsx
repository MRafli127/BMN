// ============================================================
//  QR Code identitas barang.
//
//  Isi QR = kunci unik aset BMN: "Kode Satker-Kode Barang-NUP"
//  (mis. "015110199411868006KP-3100102002-87"). Untuk barang input
//  manual yang tidak punya komponen register lengkap, dipakai
//  kodeBarang yang tersimpan. QR digenerate sepenuhnya di sisi
//  klien (offline) sehingga otomatis tersedia untuk semua barang —
//  data lama maupun hasil import baru.
// ============================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, QrCode as QrCodeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { kodeUnikBarang } from '@/lib/utils';
import type { Barang } from '@/types/barang.type';

interface QrBarangProps {
  barang: Pick<Barang, 'kodeBarang' | 'kodeSatker' | 'kodeBarangBmn' | 'nup' | 'nama'>;
  ukuran?: number;
}

export function QrBarang({ barang, ukuran = 180 }: QrBarangProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gagal, setGagal] = useState(false);
  const kode = kodeUnikBarang(barang);

  useEffect(() => {
    if (!canvasRef.current || !kode) {
      setGagal(!kode);
      return;
    }
    setGagal(false);
    QRCode.toCanvas(
      canvasRef.current,
      kode,
      { width: ukuran, margin: 1, errorCorrectionLevel: 'M' },
      (err) => {
        if (err) setGagal(true);
      }
    );
  }, [kode, ukuran]);

  // Nama file unduhan diturunkan dari kode (aman untuk filesystem).
  const namaFile = `QR-${kode.replace(/[^a-zA-Z0-9-]/g, '_') || 'barang'}.png`;

  const unduh = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const tautan = document.createElement('a');
    tautan.href = canvas.toDataURL('image/png');
    tautan.download = namaFile;
    tautan.click();
  };

  if (!kode || gagal) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        <QrCodeIcon className="h-5 w-5" />
        QR tidak tersedia (kode unik barang belum lengkap).
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center">
      <canvas
        ref={canvasRef}
        className="rounded-md bg-white p-1"
        aria-label={`QR Code untuk ${barang.nama}`}
      />
      <div className="min-w-0 flex-1 text-center sm:text-left">
        <p className="text-sm font-medium text-foreground">QR Identitas Barang</p>
        <p className="mt-0.5 break-all font-mono text-xs text-muted-foreground">{kode}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={unduh}>
          <Download className="h-4 w-4" /> Unduh QR
        </Button>
      </div>
    </div>
  );
}
