// ============================================================
//  Dialog hapus peminjaman dengan verifikasi 2 langkah:
//  1. Konfirmasi yakin.
//  2. Ketik kode peminjaman untuk konfirmasi.
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
import type { Peminjaman } from '@/types/peminjaman.type';

interface Props {
  terbuka: boolean;
  onUbahTerbuka: (terbuka: boolean) => void;
  target: Peminjaman | null;
  sedangProses?: boolean;
  onKonfirmasi: () => Promise<void>;
}

type Langkah = 'yakin' | 'ketik';

export function HapusPeminjamanDialog({
  terbuka,
  onUbahTerbuka,
  target,
  sedangProses = false,
  onKonfirmasi,
}: Props) {
  const [langkah, setLangkah] = useState<Langkah>('yakin');
  const [kodeInput, setKodeInput] = useState('');
  const [sedangHapus, setSedangHapus] = useState(false);

  // Reset state setiap dialog dibuka ulang
  useEffect(() => {
    if (terbuka) {
      setLangkah('yakin');
      setKodeInput('');
      setSedangHapus(false);
    }
  }, [terbuka]);

  // Kunci dialog = kode peminjaman yang akan dihapus (case-insensitive)
  const kodeTarget = target?.kodePeminjaman ?? '';
  const cocok = kodeInput.trim().toLowerCase() === kodeTarget.toLowerCase();

  const handleKonfirmasi = async () => {
    if (!cocok || sedangHapus) return;
    setSedangHapus(true);
    try {
      await onKonfirmasi();
      // onKonfirmasi melakukan notify & muat di parent; dialog ditutup oleh parent via terbuka=false
    } catch {
      // Error sudah ditampilkan via toast; biarkan dialog terbuka
    } finally {
      setSedangHapus(false);
    }
  };

  const handleBatal = () => {
    if (sedangHapus || sedangProses) return;
    onUbahTerbuka(false);
  };

  const isProcessing = sedangHapus || sedangProses;

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
                <DialogTitle>Yakin Hapus Peminjaman?</DialogTitle>
              </div>
              <DialogDescription className="pt-2">
                Hapus data peminjaman{' '}
                <span className="font-semibold text-foreground">{kodeTarget}</span>
                {target?.peminjam?.nama ? (
                  <> — {target.peminjam.nama}</>
                ) : null}
                ? Jika barang masih dipinjam, stok akan dikembalikan otomatis. Tindakan ini
                tidak dapat dibatalkan.
              </DialogDescription>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <ShieldCheck className="h-5 w-5 text-red-600" />
                </div>
                <DialogTitle>Verifikasi Penghapusan</DialogTitle>
              </div>
              <DialogDescription className="pt-2">
                Untuk melanjutkan, ketik kode peminjaman{' '}
                <span className="font-mono font-semibold text-foreground">{kodeTarget}</span>{' '}
                di bawah ini.
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        {langkah === 'ketik' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-muted-foreground" />
              <label htmlFor="kode-verifikasi" className="text-sm font-medium">
                Ketik kode peminjaman
              </label>
            </div>
            <Input
              id="kode-verifikasi"
              value={kodeInput}
              onChange={(e) => setKodeInput(e.target.value)}
              placeholder={kodeTarget}
              autoComplete="off"
              className="font-mono"
              disabled={isProcessing}
            />
            {kodeInput.length > 0 && !cocok && (
              <p className="text-xs text-destructive">
                Kode tidak cocok. Pastikan sama persis dengan &quot;{kodeTarget}&quot;.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleBatal}
            disabled={isProcessing}
          >
            Batal
          </Button>

          {langkah === 'yakin' ? (
            <Button
              variant="destructive"
              onClick={() => setLangkah('ketik')}
              disabled={isProcessing}
            >
              Yakin, Lanjutkan
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={handleKonfirmasi}
              disabled={!cocok || isProcessing}
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
              Hapus
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
