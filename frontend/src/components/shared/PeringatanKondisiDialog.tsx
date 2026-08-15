// ============================================================
//  Dialog Peringatan Kondisi Rusak Berat.
//  Muncul saat user ingin meminjam barang dengan kondisi rusak berat.
// ============================================================

'use client';

import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  terbuka: boolean;
  onUbahTerbuka: (terbuka: boolean) => void;
  namaBarang: string;
  onKonfirmasi: () => void;
}

export function PeringatanKondisiDialog({
  terbuka,
  onUbahTerbuka,
  namaBarang,
  onKonfirmasi,
}: Props) {
  const handleKonfirmasi = () => {
    onKonfirmasi();
    onUbahTerbuka(false);
  };

  return (
    <Dialog open={terbuka} onOpenChange={onUbahTerbuka}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-3 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-7 w-7 text-red-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-lg">Peringatan Kondisi Barang</DialogTitle>
          <DialogDescription className="text-center">
            Barang <strong>&quot;{namaBarang}&quot;</strong> memiliki kondisi{' '}
            <span className="font-semibold text-red-600">Rusak Berat</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">Barang rusak berat mungkin memiliki keterbatasan:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Fungsi barang terbatas atau tidak optimal</li>
            <li>Butuh perawatan khusus sebelum digunakan</li>
            <li>Risiko kerusakan lebih lanjut jika dipinjam</li>
          </ul>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onUbahTerbuka(false)}>
            Batal - Kembali
          </Button>
          <Button variant="default" onClick={handleKonfirmasi}>
            Ya, Tetap Pinjam
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
