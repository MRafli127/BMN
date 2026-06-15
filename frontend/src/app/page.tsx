// ============================================================
//  Halaman beranda (publik).
// ============================================================

import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldCheck,
  FileCheck2,
  QrCode,
  Clock,
  ArrowRight,
  Boxes,
  Stamp,
  Route as RouteIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RUTE } from '@/constants/routes';

const fitur = [
  { ikon: FileCheck2, judul: 'Pengajuan Online', deskripsi: 'Ajukan peminjaman barang kapan saja, unggah dokumen pendukung secara digital.' },
  { ikon: Stamp, judul: 'Stempel Digital', deskripsi: 'Dokumen disetujui otomatis dibubuhi cap & tanda tangan digital.' },
  { ikon: QrCode, judul: 'QR Code', deskripsi: 'Setiap peminjaman memiliki QR Code unik untuk verifikasi pengembalian.' },
  { ikon: Clock, judul: 'Lacak Realtime', deskripsi: 'Pantau status pengajuan secara langsung melalui timeline visual.' },
];

export default function BerandaPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-brand-50 via-white to-white">
      {/* Header publik */}
      <header className="sticky top-0 z-20 border-b bg-white/75 shadow-soft backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link href={RUTE.beranda} className="flex items-center gap-2">
            <Image src="/images/logo-kemenkeu.png" alt="Logo Kementerian Keuangan" width={180} height={48} className="object-contain" />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href={RUTE.panduan}>Panduan</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={RUTE.login}>Masuk</Link>
            </Button>
            <Button asChild className="hidden xs:inline-flex">
              <Link href={RUTE.register}>Daftar</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Cahaya latar dekoratif */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="container flex flex-1 flex-col items-center justify-center py-16 text-center sm:py-24 md:py-28">
          <span className="mb-5 inline-flex animate-fade-in items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Boxes className="h-4 w-4" /> Pengelolaan Barang Milik Negara
          </span>
          <h1 className="max-w-3xl animate-fade-up text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
            Sistem Informasi Peminjaman & Pengembalian{' '}
            <span className="bg-gradient-to-r from-brand-600 to-primary bg-clip-text text-transparent">
              Barang Milik Negara
            </span>
          </h1>
          <p className="mt-5 max-w-2xl animate-fade-up text-pretty text-base text-muted-foreground sm:text-lg">
            Kelola peminjaman BMN secara cepat, transparan, dan akuntabel — mulai dari pengajuan, persetujuan,
            stempel digital, hingga pengembalian dengan QR Code.
          </p>
          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="lg" className="shadow-brand">
              <Link href={RUTE.login}>
                Mulai Sekarang <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={RUTE.panduan}>
                <RouteIcon className="h-4 w-4" /> Lihat Panduan
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Fitur */}
      <section className="container pb-20">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {fitur.map((f, i) => {
            const Ikon = f.ikon;
            return (
              <div
                key={f.judul}
                style={{ animationDelay: `${i * 80}ms` }}
                className="group animate-fade-up rounded-2xl border bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <Ikon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-foreground">{f.judul}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.deskripsi}</p>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t bg-white py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} SIPP-BMN — Dikelola oleh Bagian Umum & Pengelolaan BMN.
      </footer>
    </div>
  );
}
