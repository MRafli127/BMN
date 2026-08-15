// ============================================================
//  Label & QR identitas barang (meniru label aset fisik BMN).
//
//  Tata letak mengikuti stiker aset Kementerian Keuangan:
//    Header  : logo + "KEMENTERIAN KEUANGAN" + kode lengkap
//              (Kode Satker-Kode Barang-NUP).
//    Badan   : Kode Barang BMN, NUP, nama/merk, dan QR Code.
//
//  Isi QR = kunci unik aset: "Kode Satker-Kode Barang-NUP"
//  (mis. "015110199411868006KP-3100102002-87"). Untuk barang
//  input manual yang tidak punya komponen register lengkap, dipakai
//  kodeBarang yang tersimpan. QR digenerate sepenuhnya di sisi klien
//  (offline) sehingga otomatis tersedia untuk semua barang — data
//  lama maupun hasil import baru.
// ============================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { Download, QrCode as QrCodeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { kodeUnikBarang } from '@/lib/utils';
import type { Barang } from '@/types/barang.type';

interface QrBarangProps {
  barang: Pick<Barang, 'kodeBarang' | 'kodeSatker' | 'kodeBarangBmn' | 'nup' | 'nama' | 'merk'>;
}

export function QrBarang({ barang }: QrBarangProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const kartuRef = useRef<HTMLDivElement>(null);
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
      { width: 160, margin: 1, errorCorrectionLevel: 'M' },
      (err) => {
        if (err) setGagal(true);
      }
    );
  }, [kode]);

  const unduh = async () => {
    const kartu = kartuRef.current;
    if (!kartu) return;
    const canvas = await html2canvas(kartu, {
      scale: 3,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });
    const tautan = document.createElement('a');
    tautan.href = canvas.toDataURL('image/png');
    tautan.download = `Label-${kode.replace(/[^a-zA-Z0-9-]/g, '_') || 'barang'}.png`;
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

  const kodeBmn = barang.kodeBarangBmn || barang.kodeBarang || '-';
  const namaMerk = [barang.nama, barang.merk].filter(Boolean).join(' ');

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Label &amp; QR Identitas Barang</p>

      {/* Kartu label aset — meniru stiker BMN fisik (hitam-putih). */}
      <div ref={kartuRef} className="mx-auto w-full max-w-md overflow-hidden rounded-md border-2 border-black bg-white text-black">
        {/* Header: logo + judul instansi + kode lengkap */}
        <div className="flex items-stretch border-b-2 border-black">
          <div className="flex w-16 shrink-0 items-center justify-center border-r-2 border-black p-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo_surat.png" alt="Logo Kementerian Keuangan" className="h-11 w-11 object-contain" />
          </div>
          <div className="flex flex-1 flex-col items-center justify-center px-2 py-1.5 text-center">
            <p className="text-base font-bold uppercase leading-tight tracking-wide sm:text-lg">
              Kementerian Keuangan
            </p>
            <p className="mt-0.5 break-all font-mono text-[11px] font-semibold leading-tight sm:text-xs">
              {kode}
            </p>
          </div>
        </div>

        {/* Badan: identitas aset (kiri) + QR (kanan) */}
        <div className="flex items-stretch">
          <div className="flex flex-1 flex-col justify-between gap-4 p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="font-mono text-sm font-semibold sm:text-base">{kodeBmn}</p>
              {barang.nup && <p className="text-sm font-semibold sm:text-base">NUP: {barang.nup}</p>}
            </div>
            <p className="break-words text-sm font-medium leading-snug">{namaMerk || '-'}</p>
          </div>
          <div className="flex shrink-0 items-center justify-center border-l-2 border-black p-2">
            <canvas ref={canvasRef} className="h-[120px] w-[120px]" aria-label={`QR Code ${barang.nama}`} />
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <Button variant="outline" size="sm" onClick={unduh}>
          <Download className="h-4 w-4" /> Unduh Label
        </Button>
      </div>
    </div>
  );
}
