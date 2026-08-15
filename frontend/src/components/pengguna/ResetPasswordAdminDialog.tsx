// ============================================================
//  Dialog reset password khusus pengguna ADMIN.
//  3-step: Konfirmasi → Proses (loading) → Berhasil (tampilkan password).
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
import { cn, inisial } from '@/lib/utils';
import type { UserItem } from '@/services/userManagement.service';

interface Props {
  terbuka: boolean;
  onUbahTerbuka: (terbuka: boolean) => void;
  user: UserItem | null;
  onKonfirmasi: () => Promise<{ passwordBaru: string }>;
}

type Langkah = 'konfirmasi' | 'proses' | 'berhasil';

export function ResetPasswordAdminDialog({
  terbuka,
  onUbahTerbuka,
  user,
  onKonfirmasi,
}: Props) {
  const [langkah, setLangkah] = useState<Langkah>('konfirmasi');
  const [passwordBaru, setPasswordBaru] = useState('');
  const [sudahSalin, setSudahSalin] = useState(false);

  useEffect(() => {
    if (terbuka) {
      setLangkah('konfirmasi');
      setPasswordBaru('');
      setSudahSalin(false);
    }
  }, [terbuka]);

  const handleKonfirmasi = async () => {
    if (!user) return;
    setLangkah('proses');
    try {
      const hasil = await onKonfirmasi();
      setPasswordBaru(hasil.passwordBaru);
      setLangkah('berhasil');
    } catch {
      setLangkah('konfirmasi');
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

  if (!user) return null;

  return (
    <Dialog
      open={terbuka}
      onOpenChange={(o) => {
        if (langkah !== 'proses') {
          if (!o) handleSelesai();
        }
      }}
    >
      <DialogContent className="max-w-md overflow-hidden p-0">
        {/* Card Header */}
        <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-violet-700 p-6 text-white shadow-lg">
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-white/10 blur-xl" />

          <div className="relative z-10">
            {langkah === 'konfirmasi' && (
              <>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg ring-4 ring-white/20">
                  <AlertTriangle className="h-7 w-7 text-white" />
                </div>
                <DialogTitle className="text-xl font-bold text-white">
                  Konfirmasi Reset Password
                </DialogTitle>
                <DialogDescription className="mt-1 text-indigo-100">
                  Reset password untuk akun administrator.
                </DialogDescription>
              </>
            )}
            {langkah === 'proses' && (
              <>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg ring-4 ring-white/20">
                  <Loader2 className="h-7 w-7 animate-spin text-white" />
                </div>
                <DialogTitle className="text-xl font-bold text-white">
                  Mereset Password...
                </DialogTitle>
                <DialogDescription className="mt-1 text-indigo-100">
                  Mohon tunggu, password sedang direset.
                </DialogDescription>
              </>
            )}
            {langkah === 'berhasil' && (
              <>
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg ring-4 ring-white/20">
                  <CheckCircle className="h-7 w-7 text-white" />
                </div>
                <DialogTitle className="text-xl font-bold text-white">
                  Password Berhasil Direset
                </DialogTitle>
                <DialogDescription className="mt-1 text-indigo-100">
                  Password baru telah dibuat untuk administrator.
                </DialogDescription>
              </>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6">
          {/* User Info Card */}
          <div className="mb-5 flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4 shadow-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-sm font-bold text-white shadow-md ring-4 ring-indigo-100">
              {inisial(user.nama)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-jakarta text-base font-bold text-gray-900">
                {user.nama}
              </p>
              <p className="font-mono text-xs text-gray-500">{user.nip}</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {(user.roles || []).map((role) => {
                  if (role === 'SUPER_ADMIN')
                    return (
                      <span
                        key={role}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700"
                      >
                        Super Admin
                      </span>
                    );
                  if (role === 'ADMIN')
                    return (
                      <span
                        key={role}
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700"
                      >
                        Admin
                      </span>
                    );
                  return (
                    <span
                      key={role}
                      className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-600"
                    >
                      {role}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Step: Konfirmasi */}
          {langkah === 'konfirmasi' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Anda yakin ingin mereset password untuk{' '}
                <span className="font-semibold text-gray-900">{user.nama}</span>{' '}
                (NIP {user.nip})? Password baru akan dibuatkan secara otomatis.
              </p>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="flex items-start gap-2 text-xs text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 flex-shrink-0" />
                  <span>
                    Password lama tidak dapat dipulihkan setelah reset dilakukan.
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Step: Proses */}
          {langkah === 'proses' && (
            <div className="flex flex-col items-center justify-center py-6">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
              <p className="mt-3 text-sm text-gray-500">
                Sedang mereset password...
              </p>
            </div>
          )}

          {/* Step: Berhasil */}
          {langkah === 'berhasil' && passwordBaru && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Password baru untuk{' '}
                <span className="font-semibold text-gray-900">{user.nama}</span>:
              </p>

              {/* Password Card */}
              <div className="relative overflow-hidden rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 shadow-sm">
                <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-indigo-200/30 blur-xl" />
                <div className="relative">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-indigo-500">
                    Password Baru
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="flex-1 font-mono text-2xl font-bold tracking-wider text-indigo-800 break-all">
                      {passwordBaru}
                    </span>
                    <button
                      onClick={handleSalin}
                      className={cn(
                        'shrink-0 rounded-xl p-2.5 transition-all duration-200',
                        sudahSalin
                          ? 'bg-green-100 text-green-600 hover:bg-green-200'
                          : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                      )}
                      title="Salin password"
                      aria-label="Salin password"
                    >
                      {sudahSalin ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {sudahSalin && (
                    <p className="mt-2 text-xs font-medium text-green-600">
                      Password berhasil disalin!
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="flex items-start gap-2 text-xs text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 flex-shrink-0" />
                  <span>
                    <span className="font-semibold">Penting:</span> Segera
                    sampaikan password ini ke{' '}
                    <span className="font-semibold">{user.nama}</span>. Password
                    tidak disimpan dan tidak dapat dilihat kembali setelah dialog
                    ditutup.
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Card Footer */}
        <DialogFooter className="gap-2 border-t border-gray-100 bg-gray-50/60 p-4">
          {langkah === 'konfirmasi' && (
            <>
              <Button variant="outline" onClick={handleSelesai}>
                Batal
              </Button>
              <Button
                variant="default"
                onClick={handleKonfirmasi}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Ya, Reset Password
              </Button>
            </>
          )}
          {langkah === 'proses' && (
            <Button variant="default" className="bg-indigo-600 hover:bg-indigo-700" disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Mereset...
            </Button>
          )}
          {langkah === 'berhasil' && (
            <Button
              variant="default"
              onClick={handleSelesai}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              Tutup
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
