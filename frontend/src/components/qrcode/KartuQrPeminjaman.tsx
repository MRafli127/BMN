// ============================================================
//  Kartu QR Peminjaman — menampilkan QR sesuai tahap siklus:
//   - DISETUJUI            -> QR Pengambilan (tersimpan di qrCodeUrl)
//   - DIPINJAM / TERLAMBAT -> QR Pengembalian (diambil on-demand)
//  Dipakai di halaman detail peminjam & admin.
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { Loader2, PackageCheck, Undo2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TampilQR } from '@/components/qrcode/TampilQR';
import { notify } from '@/components/ui/toast';
import { peminjamanService } from '@/services/peminjaman.service';
import { ambilPesanError } from '@/lib/utils';
import type { Peminjaman } from '@/types/peminjaman.type';

export function KartuQrPeminjaman({ peminjaman }: { peminjaman: Peminjaman }) {
  const [qrKembali, setQrKembali] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);

  const sedangDipinjam = ['DIPINJAM', 'TERLAMBAT'].includes(peminjaman.status);

  // Ambil QR Pengembalian saat barang sedang dipinjam.
  useEffect(() => {
    if (!sedangDipinjam) {
      setQrKembali(null);
      return;
    }
    let aktif = true;
    setMemuat(true);
    peminjamanService
      .getQrcode(peminjaman.id)
      .then((d) => {
        if (aktif) setQrKembali(d.qrCodeUrl);
      })
      .catch((e) => notify.gagal(ambilPesanError(e, 'Gagal memuat QR pengembalian.')))
      .finally(() => {
        if (aktif) setMemuat(false);
      });
    return () => {
      aktif = false;
    };
  }, [peminjaman.id, sedangDipinjam]);

  // QR Pengambilan — saat sudah disetujui & belum diserahkan.
  if (peminjaman.status === 'DISETUJUI' && peminjaman.qrCodeUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageCheck className="h-4 w-4" /> QR Pengambilan Barang
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Tunjukkan ke admin saat mengambil barang. Status akan menjadi &quot;Sedang Dipinjam&quot;.
          </p>
        </CardHeader>
        <CardContent>
          <TampilQR
            qrCodeUrl={peminjaman.qrCodeUrl}
            kodePeminjaman={peminjaman.kodePeminjaman}
            namaPeminjam={peminjaman.peminjam?.nama}
          />
        </CardContent>
      </Card>
    );
  }

  // QR Pengembalian — saat sedang dipinjam.
  if (sedangDipinjam) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Undo2 className="h-4 w-4" /> QR Pengembalian Barang
          </CardTitle>
          <p className="text-xs text-muted-foreground">Tunjukkan ke admin saat mengembalikan barang.</p>
        </CardHeader>
        <CardContent>
          {memuat ? (
            <div className="py-10 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">Menyiapkan QR pengembalian...</p>
            </div>
          ) : qrKembali ? (
            <TampilQR
              qrCodeUrl={qrKembali}
              kodePeminjaman={peminjaman.kodePeminjaman}
              namaPeminjam={peminjaman.peminjam?.nama}
            />
          ) : (
            <p className="text-center text-sm text-muted-foreground">QR pengembalian belum tersedia.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Status lain (MENUNGGU/DITOLAK/DIKEMBALIKAN): tidak ada QR.
  return null;
}
