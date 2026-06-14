// ============================================================
//  Halaman beranda (publik).
// ============================================================

import Link from 'next/link';
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
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-brand-50 to-white">
      {/* Header publik */}
      <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href={RUTE.beranda} className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-foreground">SIPP-BMN</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href={RUTE.panduan}>Panduan</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={RUTE.login}>Masuk</Link>
            </Button>
            <Button asChild>
              <Link href={RUTE.register}>Daftar</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="container flex flex-1 flex-col items-center justify-center py-16 text-center md:py-24">
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Boxes className="h-4 w-4" /> Pengelolaan Barang Milik Negara
        </span>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          Sistem Informasi Peminjaman & Pengembalian{' '}
          <span className="text-primary">Barang Milik Negara</span>
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Kelola peminjaman BMN secara cepat, transparan, dan akuntabel — mulai dari pengajuan, persetujuan,
          stempel digital, hingga pengembalian dengan QR Code.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
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
      </section>

      {/* Fitur */}
      <section className="container pb-20">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {fitur.map((f) => {
            const Ikon = f.ikon;
            return (
              <div key={f.judul} className="rounded-xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
