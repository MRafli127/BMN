// ============================================================
//  Halaman Registrasi (khusus peminjam).
// ============================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Icon } from '@/components/ui/icon';
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

const inputClass =
  'w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-4 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10';

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
    <main className="flex min-h-screen flex-col bg-background text-on-surface md:flex-row">
      {/* Panel kiri: gradien mesh */}
      <section className="gradient-mesh relative hidden items-center justify-center overflow-hidden p-12 md:flex md:w-1/2 lg:w-3/5">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute -left-[10%] -top-[10%] h-[40%] w-[40%] animate-pulse rounded-full bg-white blur-[120px]" />
          <div className="absolute -bottom-[10%] -right-[10%] h-[50%] w-[50%] animate-pulse rounded-full bg-secondary blur-[120px]" />
        </div>
        <div className="relative z-10 max-w-xl text-center">
          <div className="glass-panel mb-12 inline-flex items-center gap-3 rounded-full px-6 py-3">
            <Image src="/images/logo-kemenkeu.png" alt="Logo Kementerian Keuangan" width={220} height={60} className="object-contain" />
          </div>
          <h1 className="mb-6 font-display-lg text-display-lg leading-tight text-white">
            Bergabung dalam Ekosistem Aset Negara
          </h1>
          <p className="mb-10 font-body-lg text-body-lg text-white/80">
            Buat akun peminjam untuk mengajukan, memantau, dan mengelola peminjaman Barang Milik
            Negara secara digital dan akuntabel.
          </p>
        </div>
      </section>

      {/* Panel kanan: form daftar */}
      <section className="flex min-h-screen w-full items-center justify-center bg-white p-6 md:w-1/2 md:p-12 lg:w-2/5">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-8 flex flex-col items-center gap-2 text-center md:hidden">
            <Image src="/images/logo-kemenkeu.png" alt="Logo Kementerian Keuangan" width={200} height={56} className="object-contain" />
          </div>

          <form onSubmit={kirim} className="space-y-5">
            <div>
              <h3 className="mb-2 font-jakarta text-headline-md text-on-surface">Registrasi Peminjam</h3>
              <p className="font-body-md text-on-surface-variant">
                Lengkapi data diri untuk pengajuan peminjaman aset.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="floating-label-group">
                  <input id="nama" placeholder=" " {...register('nama')} className={inputClass} />
                  <label htmlFor="nama" className="font-label-md text-on-surface-variant">Nama Lengkap</label>
                </div>
                {errors.nama && <p className="mt-1 text-xs text-error">{errors.nama.message}</p>}
              </div>
              <div>
                <div className="floating-label-group">
                  <input id="nip" placeholder=" " {...register('nip')} className={inputClass} />
                  <label htmlFor="nip" className="font-label-md text-on-surface-variant">NIP</label>
                </div>
                {errors.nip && <p className="mt-1 text-xs text-error">{errors.nip.message}</p>}
              </div>
            </div>

            <div>
              <div className="floating-label-group">
                <input id="email" type="email" placeholder=" " {...register('email')} className={inputClass} />
                <label htmlFor="email" className="font-label-md text-on-surface-variant">Alamat Email Kedinasan</label>
              </div>
              {errors.email && <p className="mt-1 text-xs text-error">{errors.email.message}</p>}
            </div>

            <div className="floating-label-group">
              <input id="jabatan" placeholder=" " {...register('jabatan')} className={inputClass} />
              <label htmlFor="jabatan" className="font-label-md text-on-surface-variant">Jabatan</label>
            </div>

            <div className="floating-label-group">
              <input id="unitKerja" placeholder=" " {...register('unitKerja')} className={inputClass} />
              <label htmlFor="unitKerja" className="font-label-md text-on-surface-variant">Unit Kerja</label>
            </div>

            <div>
              <div className="floating-label-group">
                <input id="password" type="password" placeholder=" " {...register('password')} className={inputClass} />
                <label htmlFor="password" className="font-label-md text-on-surface-variant">Kata Sandi</label>
              </div>
              {errors.password && <p className="mt-1 text-xs text-error">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={sedangProses}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-jakarta text-headline-md text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-container active:scale-[0.98] disabled:opacity-60"
            >
              {sedangProses ? (
                <Icon name="progress_activity" className="animate-spin" />
              ) : (
                'Buat Akun Peminjam'
              )}
            </button>
          </form>

          <p className="mt-8 border-t border-outline-variant pt-8 text-center font-label-sm text-on-surface-variant">
            Sudah punya akun?{' '}
            <Link href={RUTE.login} className="font-bold text-primary hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
