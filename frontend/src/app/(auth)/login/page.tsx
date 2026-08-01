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
import { LABEL_ROLE, IKON_ROLE } from '@/constants/roles';
import type { Role } from '@/types/user.type';

const schema = z.object({
  email: z.string().min(1, 'Email wajib diisi.').email('Format email tidak valid.'),
  password: z.string().min(1, 'Kata sandi wajib diisi.'),
});
type FormValues = z.infer<typeof schema>;

// Info tampilan tiap peran untuk layar pemilihan role.
const INFO_PERAN: Record<Role, { label: string; deskripsi: string; ikon: string }> = {
  ADMIN: { label: LABEL_ROLE.ADMIN, deskripsi: 'Kelola barang, peminjaman & pengguna', ikon: IKON_ROLE.ADMIN },
  PEMINJAM: { label: LABEL_ROLE.PEMINJAM, deskripsi: 'Ajukan & pantau peminjaman barang', ikon: IKON_ROLE.PEMINJAM },
  SUPER_ADMIN: { label: LABEL_ROLE.SUPER_ADMIN, deskripsi: 'Kelola seluruh sistem & administrator', ikon: IKON_ROLE.SUPER_ADMIN },
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

        {/* Ilustrasi background: aset BMN (laptop, tablet, koper/dokumen) */}
        <svg
          aria-hidden
          viewBox="0 0 600 800"
          className="pointer-events-none absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="asset-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.10" />
            </linearGradient>
            <linearGradient id="screen-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.18" />
            </linearGradient>
            <linearGradient id="flow-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.05" />
              <stop offset="50%" stopColor="#7dd3fc" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Laptop (kiri atas) */}
          <g className="animate-float" style={{ transformOrigin: '110px 200px' }}>
            {/* Layar */}
            <rect x="40" y="140" width="140" height="90" rx="8" fill="url(#asset-grad)" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" />
            <rect x="50" y="150" width="120" height="70" rx="4" fill="url(#screen-grad)" />
            {/* Garis konten di layar */}
            <rect x="60" y="162" width="60" height="4" rx="2" fill="#ffffff" fillOpacity="0.45" />
            <rect x="60" y="174" width="100" height="3" rx="1.5" fill="#ffffff" fillOpacity="0.25" />
            <rect x="60" y="184" width="80" height="3" rx="1.5" fill="#ffffff" fillOpacity="0.25" />
            <rect x="60" y="194" width="70" height="3" rx="1.5" fill="#ffffff" fillOpacity="0.25" />
            {/* Keyboard */}
            <rect x="28" y="230" width="164" height="14" rx="3" fill="#ffffff" fillOpacity="0.18" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="1" />
            <rect x="100" y="244" width="20" height="3" rx="1.5" fill="#ffffff" fillOpacity="0.35" />
          </g>

          {/* Tablet/iPad (kanan atas, portrait) */}
          <g className="animate-float" style={{ transformOrigin: '460px 220px', animationDelay: '0.8s' }}>
            <rect x="410" y="130" width="100" height="130" rx="10" fill="url(#asset-grad)" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" />
            <rect x="418" y="142" width="84" height="106" rx="4" fill="url(#screen-grad)" />
            <circle cx="460" cy="254" r="2.5" fill="#ffffff" fillOpacity="0.35" />
            {/* Konten tablet */}
            <rect x="426" y="152" width="50" height="4" rx="2" fill="#ffffff" fillOpacity="0.45" />
            <rect x="426" y="164" width="68" height="3" rx="1.5" fill="#ffffff" fillOpacity="0.25" />
            <rect x="426" y="174" width="68" height="3" rx="1.5" fill="#ffffff" fillOpacity="0.25" />
            <rect x="426" y="184" width="50" height="3" rx="1.5" fill="#ffffff" fillOpacity="0.25" />
            {/* Ikon kecil di tablet */}
            <rect x="430" y="200" width="20" height="20" rx="4" fill="#ffffff" fillOpacity="0.20" />
            <rect x="456" y="200" width="20" height="20" rx="4" fill="#ffffff" fillOpacity="0.20" />
            <rect x="430" y="226" width="46" height="14" rx="3" fill="#ffffff" fillOpacity="0.18" />
          </g>

          {/* Koper / tas kantor (kiri bawah) */}
          <g className="animate-float" style={{ transformOrigin: '140px 640px', animationDelay: '0.4s' }}>
            {/* Handle */}
            <path d="M 90 580 Q 90 562 110 562 L 150 562 Q 170 562 170 580" fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="2.5" strokeLinecap="round" />
            {/* Body */}
            <rect x="70" y="580" width="120" height="92" rx="10" fill="url(#asset-grad)" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" />
            {/* Detail tengah */}
            <rect x="120" y="600" width="20" height="14" rx="3" fill="#ffffff" fillOpacity="0.30" />
            {/* Kancing/kunci */}
            <circle cx="130" cy="650" r="3" fill="#ffffff" fillOpacity="0.45" />
            {/* Label nama */}
            <rect x="84" y="638" width="60" height="6" rx="3" fill="#ffffff" fillOpacity="0.30" />
            <rect x="84" y="650" width="40" height="4" rx="2" fill="#ffffff" fillOpacity="0.20" />
          </g>

          {/* Bundel dokumen / map (kanan bawah) */}
          <g className="animate-float" style={{ transformOrigin: '440px 660px', animationDelay: '1.2s' }}>
            {/* Map di belakang */}
            <path d="M 400 600 L 460 590 L 500 600 L 500 680 L 440 690 L 400 680 Z" fill="url(#asset-grad)" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" />
            {/* Dokumen di dalam */}
            <rect x="416" y="612" width="68" height="52" rx="4" fill="#ffffff" fillOpacity="0.18" />
            <rect x="424" y="622" width="52" height="3" rx="1.5" fill="#ffffff" fillOpacity="0.40" />
            <rect x="424" y="630" width="44" height="2.5" rx="1.25" fill="#ffffff" fillOpacity="0.25" />
            <rect x="424" y="638" width="52" height="2.5" rx="1.25" fill="#ffffff" fillOpacity="0.25" />
            <rect x="424" y="646" width="40" height="2.5" rx="1.25" fill="#ffffff" fillOpacity="0.25" />
            {/* Cap/stempel di dokumen */}
            <circle cx="468" cy="654" r="8" fill="none" stroke="#7dd3fc" strokeOpacity="0.55" strokeWidth="1.5" />
            <circle cx="468" cy="654" r="3" fill="#7dd3fc" fillOpacity="0.35" />
          </g>

          {/* Alur panah peminjaman (laptop → tablet, melengkung ke atas) */}
          <path
            d="M 180 195 Q 300 110 410 195"
            fill="none"
            stroke="url(#flow-grad)"
            strokeWidth="2.5"
            strokeDasharray="6 8"
            strokeLinecap="round"
            className="login-flow"
          />
          {/* Alur panah pengembalian (tablet → koper, melengkung) */}
          <path
            d="M 460 270 Q 300 540 190 625"
            fill="none"
            stroke="url(#flow-grad)"
            strokeWidth="2.5"
            strokeDasharray="6 8"
            strokeLinecap="round"
            className="login-flow"
          />

          {/* Ikon peminjaman: panah keluar dari kotak (di tengah atas) */}
          <g transform="translate(295, 100)" opacity="0.55">
            <circle cx="0" cy="0" r="22" fill="#ffffff" fillOpacity="0.12" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" />
            <path d="M -7 -8 L -7 8 L 7 8" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 7 -8 L -7 -8 L -7 8" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </g>

          {/* Ikon pengembalian: panah kembali ke kotak (di tengah) */}
          <g transform="translate(295, 530)" opacity="0.55">
            <circle cx="0" cy="0" r="22" fill="#ffffff" fillOpacity="0.12" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.5" />
            <path d="M 7 8 L 7 -8 L -7 -8" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M -7 8 L 7 8 L 7 -8" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>

        <div className="relative z-10 max-w-xl text-center">
          <div className="glass-panel mb-12 inline-flex animate-float items-center gap-3 rounded-full px-6 py-3">
            <Image src="/images/logo-kemenkeu.png" alt="Logo Kementerian Keuangan" width={220} height={60} className="object-contain" />
          </div>
          <h1 className="login-hero-title mx-auto mb-6 max-w-full text-balance text-center font-display-lg text-display-lg leading-tight text-white">
            <span className="block">Manajemen Barang Milik Negara</span>
            <span className="block">(BMN)</span>
          </h1>
          <p className="login-hero-sub mb-10 font-body-lg text-body-lg text-white/80">
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
              <h3 className="mb-2 font-jakarta text-headline-md text-on-surface">Selamat Datang</h3>
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
                Email Pegawai
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
                  Masuk
                  <Icon name="login" className="text-[20px]" />
                </>
              )}
            </button>
          </form>
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
