// ============================================================
//  Halaman Registrasi (khusus peminjam).
// ============================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldCheck, Loader2, UserPlus } from 'lucide-react';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { notify } from '@/components/ui/toast';
import { useAuth } from '@/hooks/useAuth';
import { ambilPesanError } from '@/lib/utils';
import { RUTE } from '@/constants/routes';

const schema = z.object({
  nama: z.string().min(3, 'Nama minimal 3 karakter.'),
  nip: z.string().min(5, 'NIP minimal 5 karakter.'),
  email: z.string().min(1, 'Email wajib diisi.').email('Format email tidak valid.'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter.'),
  jabatan: z.string().optional(),
  unitKerja: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: daftar } = useAuth();
  const [sedangProses, setSedangProses] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const kirim = handleSubmit(async (data) => {
    setSedangProses(true);
    try {
      const user = await daftar(data);
      notify.sukses(`Registrasi berhasil. Selamat datang, ${user.nama}!`);
      router.push(RUTE.peminjamDashboard);
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Registrasi gagal.'));
    } finally {
      setSedangProses(false);
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-50 p-6">
      <div className="w-full max-w-lg rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Daftar Akun Peminjam</h1>
          <p className="mt-1 text-sm text-muted-foreground">Lengkapi data diri Anda untuk membuat akun.</p>
        </div>

        <form onSubmit={kirim} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="nama">Nama Lengkap</Label>
            <Input id="nama" placeholder="Nama lengkap" {...register('nama')} className="mt-1" />
            {errors.nama && <p className="mt-1 text-xs text-red-600">{errors.nama.message}</p>}
          </div>
          <div>
            <Label htmlFor="nip">NIP</Label>
            <Input id="nip" placeholder="Nomor Induk Pegawai" {...register('nip')} className="mt-1" />
            {errors.nip && <p className="mt-1 text-xs text-red-600">{errors.nip.message}</p>}
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="nama@bmn.go.id" {...register('email')} className="mt-1" />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="jabatan">Jabatan</Label>
            <Input id="jabatan" placeholder="Contoh: Staf Analis" {...register('jabatan')} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="unitKerja">Unit Kerja</Label>
            <Input id="unitKerja" placeholder="Contoh: Bagian Umum" {...register('unitKerja')} className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="password">Kata Sandi</Label>
            <Input id="password" type="password" placeholder="Minimal 6 karakter" {...register('password')} className="mt-1" />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <div className="sm:col-span-2">
            <Button type="submit" className="w-full" disabled={sedangProses}>
              {sedangProses ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Daftar
            </Button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Sudah punya akun?{' '}
          <Link href={RUTE.login} className="font-medium text-primary hover:underline">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
