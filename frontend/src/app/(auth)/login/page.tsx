// ============================================================
//  Halaman Login.
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
import { RUTE, RUTE_DEFAULT } from '@/constants/routes';
import type { Role } from '@/types/user.type';

const schema = z.object({
  email: z.string().min(1, 'Email wajib diisi.').email('Format email tidak valid.'),
  password: z.string().min(1, 'Kata sandi wajib diisi.'),
});
type FormValues = z.infer<typeof schema>;

// Info tampilan tiap peran untuk layar pemilihan role.
const INFO_PERAN: Record<Role, { label: string; deskripsi: string; ikon: string }> = {
  ADMIN: { label: 'Administrator', deskripsi: 'Kelola barang, peminjaman & pengguna', ikon: 'admin_panel_settings' },
  PEMINJAM: { label: 'Peminjam', deskripsi: 'Ajukan & pantau peminjaman barang', ikon: 'person' },
};

export default function LoginPage() {
  const router = useRouter();
  const { login, gantiRole } = useAuth();
  const [sedangProses, setSedangProses] = useState(false);
  const [lihatPassword, setLihatPassword] = useState(false);
  // Akun multi-role: setelah login, tampilkan pilihan peran sebelum masuk dashboard.
  const [pilihanPeran, setPilihanPeran] = useState<{ nama: string; roles: Role[] } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const kirim = handleSubmit(async (data) => {
    setSedangProses(true);
    try {
      const user = await login(data);
      // Punya >1 peran → minta user memilih peran aktif dulu.
      if (user.roles.length > 1) {
        setPilihanPeran({ nama: user.nama, roles: user.roles });
        return;
      }
      notify.suksess(`Selamat datang, ${user.nama}!`);
      router.push(RUTE_DEFAULT[user.activeRole]);
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Login gagal. Periksa email & kata sandi.'));
    } finally {
      setSedangProses(false);
    }
  });

  // Pilih peran aktif (akun multi-role) → switch role lalu arahkan ke dashboard.
  const pilihPeran = async (role: Role) => {
    setSedangProses(true);
    try {
      await gantiRole(role);
      notify.suksess(`Masuk sebagai ${INFO_PERAN[role].label}.`);
      router.push(RUTE_DEFAULT[role]);
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal memilih peran. Coba lagi.'));
      setSedangProses(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-background text-on-surface md:flex-row">
      {/* Panel kiri: gradien mesh & ilustrasi */}
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
            Manajemen Aset Negara Menjadi Lebih Mudah
          </h1>
          <p className="mb-10 font-body-lg text-body-lg text-white/80">
            Transformasi tata kelola barang milik negara dengan platform terpadu, transparan, dan
            akuntabel untuk masa depan birokrasi yang lebih efisien.
          </p>
        </div>
      </section>

      {/* Panel kanan: form login */}
      <section className="flex min-h-screen w-full items-center justify-center bg-white p-6 md:w-1/2 md:p-12 lg:w-2/5">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-10 flex flex-col items-center gap-2 text-center md:hidden">
            <Image src="/images/logo-kemenkeu.png" alt="Logo Kementerian Keuangan" width={200} height={56} className="object-contain" />
          </div>

          {pilihanPeran ? (
            /* Layar pilih peran untuk akun dengan lebih dari satu role */
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 font-jakarta text-headline-md text-on-surface">Halo, {pilihanPeran.nama}</h3>
                <p className="font-body-md text-on-surface-variant">
                  Akun Anda memiliki lebih dari satu peran. Pilih peran yang ingin digunakan.
                </p>
              </div>

              <div className="space-y-3">
                {pilihanPeran.roles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    disabled={sedangProses}
                    onClick={() => pilihPeran(role)}
                    className="flex w-full items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-4 text-left transition-all hover:border-primary hover:bg-primary/5 active:scale-[0.98] disabled:opacity-60"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon name={INFO_PERAN[role].ikon} className="text-[26px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-jakarta text-headline-md text-on-surface">{INFO_PERAN[role].label}</p>
                      <p className="truncate font-body-sm text-on-surface-variant">{INFO_PERAN[role].deskripsi}</p>
                    </div>
                    <Icon name="chevron_right" className="text-on-surface-variant" />
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={sedangProses}
                onClick={() => setPilihanPeran(null)}
                className="font-label-sm text-on-surface-variant hover:text-primary hover:underline disabled:opacity-60"
              >
                ← Kembali ke login
              </button>
            </div>
          ) : (
          <>
          <form onSubmit={kirim} className="space-y-6">
            <div>
              <h3 className="mb-2 font-jakarta text-headline-md text-on-surface">Selamat Datang Kembali</h3>
              <p className="mb-2 font-body-md text-on-surface-variant">
                Silakan masuk dengan kredensial instansi Anda.
              </p>
            </div>

            <div className="floating-label-group">
              <input
                id="email"
                type="email"
                placeholder=" "
                {...register('email')}
                className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-4 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
              <label htmlFor="email" className="font-label-md text-on-surface-variant">
                NIP atau Email Pegawai
              </label>
            </div>
            {errors.email && <p className="-mt-3 text-xs text-error">{errors.email.message}</p>}

            <div className="floating-label-group relative">
              <input
                id="password"
                type={lihatPassword ? 'text' : 'password'}
                placeholder=" "
                {...register('password')}
                className="w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-4 pr-12 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
              />
              <label htmlFor="password" className="font-label-md text-on-surface-variant">
                Kata Sandi
              </label>
              <button
                type="button"
                onClick={() => setLihatPassword((tampil) => !tampil)}
                aria-label={lihatPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                aria-pressed={lihatPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-on-surface-variant transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <Icon name={lihatPassword ? 'visibility_off' : 'visibility'} className="text-[22px]" />
              </button>
            </div>
            {errors.password && <p className="-mt-3 text-xs text-error">{errors.password.message}</p>}

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
                />
                <span className="font-label-sm text-on-surface-variant">Ingat Saya</span>
              </label>
              <a href="#" className="font-label-sm text-primary hover:underline">
                Lupa kata sandi?
              </a>
            </div>

            <button
              type="submit"
              disabled={sedangProses}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-jakarta text-headline-md text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-container active:scale-[0.98] disabled:opacity-60"
            >
              {sedangProses ? (
                <Icon name="progress_activity" className="animate-spin" />
              ) : (
                <>
                  Masuk Aplikasi
                  <Icon name="login" className="text-[20px]" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex flex-col items-center gap-4 border-t border-outline-variant pt-8">
            <p className="text-center font-label-sm text-on-surface-variant">
              Belum punya akun?{' '}
              <Link href={RUTE.register} className="font-bold text-primary hover:underline">
                Daftar di sini
              </Link>
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-outline-variant bg-surface-container-low p-3 text-xs text-on-surface-variant">
            <p className="font-bold text-on-surface">Akun demo (setelah seeder dijalankan):</p>
            <p className="mt-1">Admin: admin@bmn.go.id / Bmn@2026</p>
            <p>Super admin: superadmin@bmn.go.id / SuperAdmin123!</p>
            <p>Peminjam: budi@bmn.go.id / Bmn@2026</p>
          </div>
          </>
          )}
        </div>
      </section>
    </main>
  );
}
