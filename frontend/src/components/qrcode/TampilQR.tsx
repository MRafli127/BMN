// ============================================================
//  Menampilkan QR Code peminjaman + unduh & cetak.
// ============================================================

'use client';

import { useState } from 'react';
import { Download, Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notify } from '@/components/ui/toast';

interface Props {
  qrCodeUrl: string;
  kodePeminjaman: string;
  namaPeminjam?: string;
}

export function TampilQR({ qrCodeUrl, kodePeminjaman, namaPeminjam }: Props) {
  const [sedangUnduh, setSedangUnduh] = useState(false);

  // Unduh gambar QR (fetch blob agar berfungsi lintas-domain)
  const unduh = async () => {
    setSedangUnduh(true);
    try {
      const res = await fetch(qrCodeUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR-${kodePeminjaman}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      notify.gagal('Gagal mengunduh QR Code.');
    } finally {
      setSedangUnduh(false);
    }
  };

  // Cetak QR Code
  const cetak = () => {
    const w = window.open('', '_blank', 'width=480,height=640');
    if (!w) return notify.gagal('Popup diblokir. Izinkan popup untuk mencetak.');
    w.document.write(`
      <html>
        <head><title>QR Code ${kodePeminjaman}</title></head>
        <body style="font-family: sans-serif; text-align:center; padding:24px;">
          <h2 style="margin:0 0 4px;">SIPP-BMN</h2>
          <p style="margin:0 0 16px; color:#555;">Bukti Peminjaman Barang Milik Negara</p>
          <img src="${qrCodeUrl}" style="width:280px;height:280px;" />
          <h3 style="margin:16px 0 4px;">${kodePeminjaman}</h3>
          ${namaPeminjam ? `<p style="margin:0; color:#555;">${namaPeminjam}</p>` : ''}
          <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 300); }</script>
        </body>
      </html>
    `);
    w.document.close();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrCodeUrl} alt={`QR ${kodePeminjaman}`} className="h-56 w-56" />
      </div>
      <p className="font-mono text-sm font-semibold text-primary">{kodePeminjaman}</p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={unduh} disabled={sedangUnduh}>
          {sedangUnduh ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Unduh
        </Button>
        <Button variant="outline" onClick={cetak}>
          <Printer className="h-4 w-4" /> Cetak
        </Button>
      </div>
    </div>
  );
}
