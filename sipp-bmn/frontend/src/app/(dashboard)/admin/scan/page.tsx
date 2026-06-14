// ============================================================
//  Admin — Scan QR untuk Pengembalian Barang.
// ============================================================

'use client';

import { useState } from 'react';
import { ScanLine, Undo2, Loader2, CheckCircle2, RotateCcw, User as UserIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScannerQR } from '@/components/qrcode/ScannerQR';
import { notify } from '@/components/ui/toast';
import { peminjamanService } from '@/services/peminjaman.service';
import { ambilPesanError, formatTanggal } from '@/lib/utils';
import { STATUS_PEMINJAMAN } from '@/constants/status';
import type { Peminjaman } from '@/types/peminjaman.type';

export default function ScanPage() {
  const [hasil, setHasil] = useState<Peminjaman | null>(null);
  const [memuatScan, setMemuatScan] = useState(false);
  const [sedangKembalikan, setSedangKembalikan] = useState(false);

  const tanganiScan = async (kode: string) => {
    setMemuatScan(true);
    try {
      const data = await peminjamanService.scan(kode);
      setHasil(data);
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Peminjaman tidak ditemukan.'));
    } finally {
      setMemuatScan(false);
    }
  };

  const kembalikan = async () => {
    if (!hasil) return;
    setSedangKembalikan(true);
    try {
      const updated = await peminjamanService.kembalikan(hasil.id);
      setHasil(updated);
      notify.sukses('Pengembalian dikonfirmasi. Stok telah diperbarui.');
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal mengonfirmasi pengembalian.'));
    } finally {
      setSedangKembalikan(false);
    }
  };

  const reset = () => setHasil(null);

  const bisaKembalikan = hasil && ['DISETUJUI', 'DIPINJAM', 'TERLAMBAT'].includes(hasil.status);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ScanLine className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Scan Pengembalian</h1>
        <p className="text-muted-foreground">
          Pindai via kamera, <span className="font-medium text-foreground">unggah gambar QR</span>, atau masukkan kode untuk memproses pengembalian.
        </p>
      </div>

      {!hasil ? (
        <Card>
          <CardContent className="p-5">
            {memuatScan ? (
              <div className="py-10 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                <p className="mt-2 text-sm text-muted-foreground">Mencari data peminjaman...</p>
              </div>
            ) : (
              <ScannerQR onHasil={tanganiScan} />
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-mono text-base text-primary">{hasil.kodePeminjaman}</CardTitle>
              <Badge className={STATUS_PEMINJAMAN[hasil.status].kelas}>{STATUS_PEMINJAMAN[hasil.status].label}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <UserIcon className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-foreground">{hasil.peminjam?.nama}</p>
                <p className="text-xs text-muted-foreground">{hasil.peminjam?.unitKerja || hasil.peminjam?.nip}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Barang Dipinjam</p>
              <div className="space-y-1.5">
                {hasil.detail?.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                    <span>{d.barang?.nama}</span>
                    <span className="font-semibold">{d.jumlahPinjam} unit</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Rencana kembali: <span className="font-medium text-foreground">{formatTanggal(hasil.tanggalKembaliRencana)}</span>
            </p>

            {/* Aksi */}
            {bisaKembalikan ? (
              <Button variant="sukses" className="w-full" onClick={kembalikan} disabled={sedangKembalikan}>
                {sedangKembalikan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                Konfirmasi Barang Dikembalikan
              </Button>
            ) : hasil.status === 'DIKEMBALIKAN' ? (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-green-50 py-3 text-sm font-medium text-green-700">
                <CheckCircle2 className="h-5 w-5" /> Barang sudah dikembalikan.
              </div>
            ) : (
              <p className="rounded-lg bg-amber-50 py-3 text-center text-sm text-amber-800">
                Peminjaman ini belum dapat dikembalikan (status: {STATUS_PEMINJAMAN[hasil.status].label}).
              </p>
            )}

            <Button variant="outline" className="w-full" onClick={reset}>
              <RotateCcw className="h-4 w-4" /> Scan Peminjaman Lain
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
