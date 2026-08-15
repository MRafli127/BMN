// ============================================================
//  Dialog hapus massal peminjaman dengan verifikasi 2 langkah:
//  1. Konfirmasi yakin.
//  2. Ketik "saya yakin" untuk konfirmasi.
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, ShieldCheck, Type } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  terbuka: boolean;
  onUbahTerbuka: (terbuka: boolean) => void;
  jumlah: number;
  sedangProses?: boolean;
  onKonfirmasi: () => Promise<void>;
}

type Langkah = 'yakin' | 'ketik';

const KUNCI_VERIFIKASI = 'saya yakin';

export function HapusMassalPeminjamanDialog({
  terbuka,
  onUbahTerbuka,
  jumlah,
  sedangProses = false,
  onKonfirmasi,
}: Props) {
  const [langkah, setLangkah] = useState<Langkah>('yakin');
  const [kodeInput, setKodeInput] = useState('');
  const [sedangHapus, setSedangHapus] = useState(false);

  useEffect(() => {
    if (terbuka) {
      setLangkah('yakin');
      setKodeInput('');
      setSedangHapus(false);
    }
  }, [terbuka]);

  const cocok = kodeInput.trim().toLowerCase() === KUNCI_VERIFIKASI;
  const isProcessing = sedangHapus || sedangProses;

  const handleKonfirmasi = async () => {
    if (!cocok || isProcessing) return;
    setSedangHapus(true);
    try {
      await onKonfirmasi();
    } catch {
      // Error sudah ditampilkan via toast; biarkan dialog terbuka
    } finally {
      setSedangHapus(false);
    }
  };

  const handleBatal = () => {
    if (isProcessing) return;
    onUbahTerbuka(false);
  };

  return (
    <Dialog open={terbuka} onOpenChange={(o) => !isProcessing && o === false && handleBatal()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          {langkah === 'yakin' ? (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <DialogTitle>Yakin Hapus {jumlah} Peminjaman?</DialogTitle>
              </div>
              <DialogDescription className="pt-2">
                Hapus {jumlah} data peminjaman yang dipilih? Untuk barang yang masih dipinjam,
                stok dikembalikan otomatis. Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <ShieldCheck className="h-5 w-5 text-red-600" />
                </div>
                <DialogTitle>Verifikasi Penghapusan Massal</DialogTitle>
              </div>
              <DialogDescription className="pt-2">
                Ketik <span className="font-semibold text-foreground">"{KUNCI_VERIFIKASI}"</span>{' '}
                di bawah ini untuk melanjutkan penghapusan {jumlah} peminjaman.
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        {langkah === 'ketik' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-muted-foreground" />
              <label htmlFor="kode-verifikasi-massal" className="text-sm font-medium">
                Ketik untuk konfirmasi
              </label>
            </div>
            <Input
              id="kode-verifikasi-massal"
              value={kodeInput}
              onChange={(e) => setKodeInput(e.target.value)}
              placeholder={KUNCI_VERIFIKASI}
              autoComplete="off"
              disabled={isProcessing}
            />
            {kodeInput.length > 0 && !cocok && (
              <p className="text-xs text-destructive">
                Teks tidak cocok. Ketik persis "{KUNCI_VERIFIKASI}".
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleBatal} disabled={isProcessing}>
            Batal
          </Button>

          {langkah === 'yakin' ? (
            <Button variant="destructive" onClick={() => setLangkah('ketik')} disabled={isProcessing}>
              Yakin, Lanjutkan
            </Button>
          ) : (
            <Button variant="destructive" onClick={handleKonfirmasi} disabled={!cocok || isProcessing}>
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
              Hapus {jumlah} Data
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
