// ============================================================
//  Dialog Popup - Barang Tidak Tersedia di Keranjang.
//  Muncul saat polling mendeteksi barang di keranjang sudah tidak
//  tersedia lagi (stok habis atau dipinjam user lain).
// ============================================================

'use client';

import { PackageX, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { urlFile } from '@/lib/utils';
import type { ItemKeranjang } from '@/store/keranjangStore';

interface Props {
  terbuka: boolean;
  onUbahTerbuka: (terbuka: boolean) => void;
  barangTidakTersedia: ItemKeranjang[];
  onHapusSemua: () => void;
}

export function DialogBarangTidakTersedia({
  terbuka,
  onUbahTerbuka,
  barangTidakTersedia,
  onHapusSemua,
}: Props) {
  const handleKonfirmasi = () => {
    onHapusSemua();
    onUbahTerbuka(false);
  };

  return (
    <Dialog open={terbuka} onOpenChange={onUbahTerbuka}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-3 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <PackageX className="h-7 w-7 text-amber-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-lg">Barang Tidak Tersedia</DialogTitle>
          <DialogDescription className="text-center">
            {barangTidakTersedia.length === 1 ? (
              <>
                1 barang di keranjang Anda sudah{' '}
                <span className="font-semibold text-amber-600">tidak tersedia lagi</span> dan akan dihapus
                dari keranjang.
              </>
            ) : (
              <>
                <span className="font-semibold text-amber-600">{barangTidakTersedia.length} barang</span> di
                keranjang Anda sudah{' '}
                <span className="font-semibold text-amber-600">tidak tersedia lagi</span> dan akan dihapus
                dari keranjang.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Daftar barang yang tidak tersedia */}
        <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50 p-3">
          {barangTidakTersedia.map((item) => (
            <div key={item.barangId} className="flex items-center gap-3 rounded-lg bg-white p-2 shadow-sm">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-amber-200 bg-muted">
                {item.fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urlFile(item.fotoUrl)} alt={item.nama} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <PackageX className="h-5 w-5 text-amber-400" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.nama}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {item.kodeBarang}
                  {item.merk && ` • ${item.merk}`}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                Stok Habis
              </span>
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
          <p>
            ⚠️ Barang mungkin sudah dipinjam oleh pengguna lain atau stok telah diperbarui oleh administrator.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onUbahTerbuka(false)}>
            <X className="h-4 w-4 mr-1" /> Tutup
          </Button>
          <Button variant="default" onClick={handleKonfirmasi}>
            Hapus dari Keranjang
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
