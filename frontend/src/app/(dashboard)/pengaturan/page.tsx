// ============================================================
//  Halaman Pengaturan Akun (/pengaturan).
//  Dua bagian: ubah data profil & ganti kata sandi.
//  Tersedia untuk semua peran (admin & peminjam).
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import { notify } from '@/components/ui/toast';
import { useAuth } from '@/hooks/useAuth';
import { ambilPesanError, inisial } from '@/lib/utils';

// ---------- Skema validasi ----------
const profilSchema = z.object({
  nama: z.string().min(3, 'Nama minimal 3 karakter.'),
  nip: z.string().min(5, 'NIP minimal 5 karakter.').max(30, 'NIP maksimal 30 karakter.'),
  email: z.string().min(1, 'Email wajib diisi.').email('Format email tidak valid.'),
  jabatan: z.string().optional(),
  unitKerja: z.string().optional(),
});
type ProfilValues = z.infer<typeof profilSchema>;

const passwordSchema = z
  .object({
    passwordLama: z.string().min(1, 'Kata sandi lama wajib diisi.'),
    passwordBaru: z.string().min(6, 'Kata sandi baru minimal 6 karakter.'),
    konfirmasi: z.string().min(1, 'Konfirmasi kata sandi wajib diisi.'),
  })
  .refine((d) => d.passwordBaru === d.konfirmasi, {
    message: 'Konfirmasi kata sandi tidak cocok.',
    path: ['konfirmasi'],
  });
type PasswordValues = z.infer<typeof passwordSchema>;

export default function PengaturanPage() {
  const { user, isAdmin, perbaruiProfil, gantiPassword } = useAuth();
  const [simpanProfil, setSimpanProfil] = useState(false);
  const [simpanPassword, setSimpanPassword] = useState(false);

  // --- Form profil ---
  const {
    register: regProfil,
    handleSubmit: submitProfil,
    reset: resetProfil,
    formState: { errors: errProfil, isDirty },
  } = useForm<ProfilValues>({ resolver: zodResolver(profilSchema) });

  // Isi form dengan data pengguna saat tersedia
  useEffect(() => {
    if (user) {
      resetProfil({
        nama: user.nama ?? '',
        nip: user.nip ?? '',
        email: user.email ?? '',
        jabatan: user.jabatan ?? '',
        unitKerja: user.unitKerja ?? '',
      });
    }
  }, [user, resetProfil]);

  const kirimProfil = submitProfil(async (data) => {
    setSimpanProfil(true);
    try {
      const pembaruan = await perbaruiProfil(data);
      notify.sukses('Profil berhasil diperbarui.');
      resetProfil({
        nama: pembaruan.nama,
        nip: pembaruan.nip,
        email: pembaruan.email,
        jabatan: pembaruan.jabatan ?? '',
        unitKerja: pembaruan.unitKerja ?? '',
      });
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal memperbarui profil.'));
    } finally {
      setSimpanProfil(false);
    }
  });

  // --- Form kata sandi ---
  const {
    register: regPassword,
    handleSubmit: submitPassword,
    reset: resetPassword,
    formState: { errors: errPassword },
  } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  const kirimPassword = submitPassword(async (data) => {
    setSimpanPassword(true);
    try {
      await gantiPassword({ passwordLama: data.passwordLama, passwordBaru: data.passwordBaru });
      notify.sukses('Kata sandi berhasil diperbarui.');
      resetPassword({ passwordLama: '', passwordBaru: '', konfirmasi: '' });
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal mengganti kata sandi.'));
    } finally {
      setSimpanPassword(false);
    }
  });

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-primary to-brand-600 p-7 text-white shadow-sm">
        <Icon name="manage_accounts" className="absolute -right-3 -top-3 !text-[7rem] text-white/10" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl font-bold ring-2 ring-white/30 backdrop-blur">
            {inisial(user?.nama)}
          </div>
          <div>
            <h1 className="font-jakarta text-2xl font-bold md:text-3xl">Pengaturan Akun</h1>
            <p className="mt-1 text-white/85">
              {user?.nama} &middot; {isAdmin ? 'Administrator' : 'Peminjam'}
            </p>
          </div>
        </div>
      </div>

      {/* Data Profil */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon name="badge" />
            </div>
            <div>
              <h2 className="font-jakarta text-lg font-bold text-primary">Data Diri</h2>
              <p className="text-sm text-muted-foreground">Perbarui nama, NIP, email, dan unit kerja Anda.</p>
            </div>
          </div>

          <form onSubmit={kirimProfil} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nama">Nama Lengkap</Label>
                <Input id="nama" {...regProfil('nama')} />
                {errProfil.nama && <p className="text-xs text-error">{errProfil.nama.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nip">NIP</Label>
                <Input id="nip" {...regProfil('nip')} />
                {errProfil.nip && <p className="text-xs text-error">{errProfil.nip.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Alamat Email</Label>
              <Input id="email" type="email" {...regProfil('email')} />
              {errProfil.email && <p className="text-xs text-error">{errProfil.email.message}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="jabatan">Jabatan</Label>
                <Input id="jabatan" placeholder="Opsional" {...regProfil('jabatan')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unitKerja">Unit Kerja</Label>
                <Input id="unitKerja" placeholder="Opsional" {...regProfil('unitKerja')} />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={simpanProfil || !isDirty}>
                {simpanProfil ? (
                  <>
                    <Icon name="progress_activity" className="animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Icon name="save" /> Simpan Perubahan
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Ganti Kata Sandi */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <Icon name="lock" />
            </div>
            <div>
              <h2 className="font-jakarta text-lg font-bold text-primary">Ganti Kata Sandi</h2>
              <p className="text-sm text-muted-foreground">Gunakan kata sandi yang kuat dan mudah Anda ingat.</p>
            </div>
          </div>

          <form onSubmit={kirimPassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="passwordLama">Kata Sandi Lama</Label>
              <Input id="passwordLama" type="password" autoComplete="current-password" {...regPassword('passwordLama')} />
              {errPassword.passwordLama && <p className="text-xs text-error">{errPassword.passwordLama.message}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="passwordBaru">Kata Sandi Baru</Label>
                <Input id="passwordBaru" type="password" autoComplete="new-password" {...regPassword('passwordBaru')} />
                {errPassword.passwordBaru && <p className="text-xs text-error">{errPassword.passwordBaru.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="konfirmasi">Konfirmasi Kata Sandi Baru</Label>
                <Input id="konfirmasi" type="password" autoComplete="new-password" {...regPassword('konfirmasi')} />
                {errPassword.konfirmasi && <p className="text-xs text-error">{errPassword.konfirmasi.message}</p>}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={simpanPassword}>
                {simpanPassword ? (
                  <>
                    <Icon name="progress_activity" className="animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Icon name="lock_reset" /> Perbarui Kata Sandi
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
