// ============================================================
//  Dialog reset password pengguna:
//  1. Konfirmasi reset.
//  2. Reset → tampilkan password baru + tombol salin.
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, CheckCircle, Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { notify } from '@/components/ui/toast';
import type { UserItem } from '@/services/userManagement.service';

interface Props {
  terbuka: boolean;
  onUbahTerbuka: (terbuka: boolean) => void;
  user: UserItem | null;
  onKonfirmasi: () => Promise<{ passwordBaru: string }>;
}

type Langkah = 'yakin' | 'berhasil';

export function ResetPasswordDialog({
  terbuka,
  onUbahTerbuka,
  user,
  onKonfirmasi,
}: Props) {
  const [langkah, setLangkah] = useState<Langkah>('yakin');
  const [sedangReset, setSedangReset] = useState(false);
  const [passwordBaru, setPasswordBaru] = useState('');
  const [sudahSalin, setSudahSalin] = useState(false);

  useEffect(() => {
    if (terbuka) {
      setLangkah('yakin');
      setPasswordBaru('');
      setSedangReset(false);
      setSudahSalin(false);
    }
  }, [terbuka]);

  const handleKonfirmasi = async () => {
    if (!user || sedangReset) return;
    setSedangReset(true);
    try {
      const hasil = await onKonfirmasi();
      setPasswordBaru(hasil.passwordBaru);
      setLangkah('berhasil');
    } catch {
      // Error sudah ditampilkan via toast; biarkan dialog terbuka
    } finally {
      setSedangReset(false);
    }
  };

  const handleSalin = async () => {
    try {
      await navigator.clipboard.writeText(passwordBaru);
      setSudahSalin(true);
      notify.suksess('Password berhasil disalin.');
      setTimeout(() => setSudahSalin(false), 2000);
    } catch {
      notify.gagal('Gagal menyalin password.');
    }
  };

  const handleSelesai = () => {
    onUbahTerbuka(false);
  };

  return (
    <Dialog open={terbuka} onOpenChange={(o) => !sedangReset && o === false && handleSelesai()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          {langkah === 'yakin' ? (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <DialogTitle>Reset Password</DialogTitle>
              </div>
              <DialogDescription className="pt-2">
                Reset password untuk akun{' '}
                <span className="font-semibold text-foreground">{user?.nama ?? ''}</span>{' '}
                (NIP {user?.nip ?? ''})? Password baru akan dibuatkan secara otomatis.
              </DialogDescription>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <DialogTitle>Password Berhasil Direset</DialogTitle>
              </div>
              <DialogDescription className="pt-2">
                Password untuk{' '}
                <span className="font-semibold text-foreground">{user?.nama ?? ''}</span>{' '}
                telah berhasil direset. Gunakan password baru di bawah ini untuk login.
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        {langkah === 'berhasil' && passwordBaru && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Password baru akun ini:
            </p>
            <div className="relative">
              <div className="flex items-center gap-2 rounded-xl border-2 border-green-200 bg-green-50 px-4 py-3">
                <span className="flex-1 font-mono text-lg font-bold tracking-wide text-green-800 break-all">
                  {passwordBaru}
                </span>
                <button
                  onClick={handleSalin}
                  className="shrink-0 rounded-lg p-2 text-green-600 transition-colors hover:bg-green-100"
                  title="Salin password"
                  aria-label="Salin password"
                >
                  {sudahSalin ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </button>
              </div>
              {sudahSalin && (
                <p className="mt-1 text-xs text-green-600 font-medium">
                  Tersalin!
                </p>
              )}
            </div>
            <p className="text-xs text-amber-600">
              Segera sampaikan password ini ke pengguna. Password tidak disimpan
              dan tidak dapat dilihat kembali setelah dialog ditutup.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={langkah === 'yakin' ? handleSelesai : handleSelesai} disabled={sedangReset}>
            {langkah === 'yakin' ? 'Batal' : 'Tutup'}
          </Button>

          {langkah === 'yakin' ? (
            <Button variant="default" onClick={handleKonfirmasi} disabled={sedangReset}>
              {sedangReset && <Loader2 className="h-4 w-4 animate-spin" />}
              Reset Password
            </Button>
          ) : (
            <Button variant="default" onClick={handleSelesai}>
              Selesai
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
