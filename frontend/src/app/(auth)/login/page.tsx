// ============================================================
//  Halaman Login.
// ============================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldCheck, Loader2, LogIn } from 'lucide-react';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { notify } from '@/components/ui/toast';
import { useAuth } from '@/hooks/useAuth';
import { ambilPesanError } from '@/lib/utils';
import { RUTE, RUTE_DEFAULT } from '@/constants/routes';

const schema = z.object({
  email: z.string().min(1, 'Email wajib diisi.').email('Format email tidak valid.'),
  password: z.string().min(1, 'Kata sandi wajib diisi.'),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [sedangProses, setSedangProses] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const kirim = handleSubmit(async (data) => {
    setSedangProses(true);
    try {
      const user = await login(data);
      notify.sukses(`Selamat datang, ${user.nama}!`);
      router.push(RUTE_DEFAULT[user.role]);
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Login gagal. Periksa email & kata sandi.'));
    } finally {
      setSedangProses(false);
    }
  });

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panel branding */}
      <div className="bg-brand-gradient relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl"
        />
        <Link href={RUTE.beranda} className="relative flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold">SIPP-BMN</span>
        </Link>
        <div className="relative">
          <h1 className="text-3xl font-bold leading-tight xl:text-4xl">
            Sistem Informasi Peminjaman & Pengembalian Barang Milik Negara
          </h1>
          <p className="mt-4 max-w-md text-white/80">
            Kelola peminjaman BMN secara digital — cepat, transparan, dan akuntabel.
          </p>
        </div>
        <p className="relative text-sm text-white/60">© {new Date().getFullYear()} SIPP-BMN</p>
      </div>

      {/* Form login */}
      <div className="flex items-center justify-center bg-gradient-to-b from-brand-50/60 to-white p-6 lg:bg-none">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-8 text-center lg:hidden">
            <div className="bg-brand-gradient mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-soft">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold">SIPP-BMN</h1>
          </div>

          <h2 className="text-2xl font-bold text-foreground">Masuk ke Akun</h2>
          <p className="mt-1 text-sm text-muted-foreground">Silakan masuk untuk melanjutkan.</p>

          <form onSubmit={kirim} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="nama@bmn.go.id" {...register('email')} className="mt-1" />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="password">Kata Sandi</Label>
              <Input id="password" type="password" placeholder="••••••••" {...register('password')} className="mt-1" />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={sedangProses}>
              {sedangProses ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Masuk
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Belum punya akun?{' '}
            <Link href={RUTE.register} className="font-medium text-primary hover:underline">
              Daftar di sini
            </Link>
          </p>

          <div className="mt-6 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Akun demo (setelah seeder dijalankan):</p>
            <p className="mt-1">Admin: admin@bmn.go.id / Admin123!</p>
            <p>Peminjam: budi@bmn.go.id / Peminjam123!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
