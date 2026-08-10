// ============================================================
//  Halaman Panduan (publik) — langkah peminjaman & pengembalian,
//  serta FAQ dengan accordion.
// ============================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldCheck,
  LogIn,
  Boxes,
  FileUp,
  Hourglass,
  PackageCheck,
  QrCode,
  ScanLine,
  CheckCircle2,
  ChevronDown,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RUTE } from '@/constants/routes';

const langkahPeminjaman = [
  { ikon: LogIn, judul: 'Login', teks: 'Masuk ke akun Anda. Belum punya akun? Daftar terlebih dahulu sebagai peminjam.' },
  { ikon: Boxes, judul: 'Pilih Barang', teks: 'Telusuri katalog dan pilih barang beserta jumlah yang ingin dipinjam.' },
  { ikon: FileUp, judul: 'Isi Form & Unggah Dokumen', teks: 'Lengkapi tanggal, alasan peminjaman, dan unggah dokumen pendukung.' },
  { ikon: Hourglass, judul: 'Tunggu Persetujuan', teks: 'Admin akan memverifikasi pengajuan Anda. Pantau statusnya secara realtime.' },
  { ikon: PackageCheck, judul: 'Ambil Barang + QR Code', teks: 'Setelah disetujui, ambil barang dan simpan QR Code peminjaman Anda.' },
];

const langkahPengembalian = [
  { ikon: PackageCheck, judul: 'Bawa Barang', teks: 'Bawa kembali barang yang dipinjam ke petugas BMN.' },
  { ikon: QrCode, judul: 'Tunjukkan QR Code', teks: 'Tampilkan QR Code peminjaman dari aplikasi atau hasil cetak.' },
  { ikon: ScanLine, judul: 'Admin Scan', teks: 'Petugas memindai QR Code untuk memverifikasi data peminjaman.' },
  { ikon: CheckCircle2, judul: 'Selesai', teks: 'Status diperbarui menjadi "Dikembalikan" dan stok otomatis bertambah.' },
];

const faq = [
  {
    t: 'Siapa yang dapat mengajukan peminjaman?',
    j: 'Seluruh pegawai yang telah memiliki akun peminjam.',
  },
  {
    t: 'Berapa lama proses persetujuan?',
    j: 'Persetujuan bergantung pada verifikasi admin. Anda akan melihat perubahan status secara langsung pada halaman riwayat.',
  },
  {
    t: 'Apa yang terjadi jika terlambat mengembalikan?',
    j: 'Sistem otomatis menandai peminjaman sebagai "Terlambat" bila melewati tanggal rencana kembali. Segera kembalikan barang untuk menghindari sanksi administratif.',
  },
  {
    t: 'Bagaimana jika QR Code hilang?',
    j: 'QR Code dapat dilihat & dicetak kembali kapan saja melalui halaman detail peminjaman. Petugas juga dapat mencari peminjaman dengan memasukkan kode secara manual.',
  },
  {
    t: 'Format dokumen apa yang didukung?',
    j: 'Dokumen peminjaman dapat berupa PDF, JPG, atau PNG dengan ukuran maksimum 5 MB.',
  },
];

export default function PanduanPage() {
  const [buka, setBuka] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-brand-50 animate-page-in">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container flex h-16 items-center justify-between">
          <Link href={RUTE.beranda} className="flex items-center gap-2">
            <Image src="/images/logo-kemenkeu.png" alt="Logo Kementerian Keuangan" width={180} height={48} className="object-contain" />
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link href={RUTE.beranda}>
              <ArrowLeft className="h-4 w-4" /> Beranda
            </Link>
          </Button>
        </div>
      </header>

      <main className="container space-y-14 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Panduan Penggunaan</h1>
          <p className="mt-2 text-muted-foreground">
            Ikuti langkah-langkah berikut untuk meminjam dan mengembalikan Barang Milik Negara.
          </p>
        </div>

        {/* Alur peminjaman */}
        <section>
          <h2 className="mb-6 text-xl font-bold text-foreground">Langkah Peminjaman</h2>
          <Timeline langkah={langkahPeminjaman} warna="primary" />
        </section>

        {/* Alur pengembalian */}
        <section>
          <h2 className="mb-6 text-xl font-bold text-foreground">Langkah Pengembalian</h2>
          <Timeline langkah={langkahPengembalian} warna="hijau" />
        </section>

        {/* FAQ */}
        <section>
          <h2 className="mb-6 text-xl font-bold text-foreground">Pertanyaan yang Sering Diajukan (FAQ)</h2>
          <div className="mx-auto max-w-3xl space-y-3">
            {faq.map((item, i) => (
              <div key={i} className="overflow-hidden rounded-xl border bg-white">
                <button
                  onClick={() => setBuka(buka === i ? null : i)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left font-medium text-foreground hover:bg-muted/40"
                >
                  {item.t}
                  <ChevronDown className={cn('h-5 w-5 shrink-0 text-muted-foreground transition-transform', buka === i && 'rotate-180')} />
                </button>
                {buka === i && <div className="border-t px-5 py-4 text-sm text-muted-foreground">{item.j}</div>}
              </div>
            ))}
          </div>
        </section>

        <div className="rounded-2xl bg-primary px-8 py-10 text-center text-primary-foreground">
          <h3 className="text-2xl font-bold">Siap memulai peminjaman?</h3>
          <p className="mt-2 text-primary-foreground/80">Masuk ke akun Anda dan ajukan peminjaman sekarang.</p>
          <Button asChild size="lg" variant="secondary" className="mt-5">
            <Link href={RUTE.login}>Masuk ke Aplikasi</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

// Komponen timeline langkah bernomor
function Timeline({
  langkah,
  warna,
}: {
  langkah: { ikon: typeof LogIn; judul: string; teks: string }[];
  warna: 'primary' | 'hijau';
}) {
  const kelasLingkaran = warna === 'hijau' ? 'bg-hijau-600' : 'bg-primary';
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-5">
      {langkah.map((l, i) => {
        const Ikon = l.ikon;
        return (
          <div key={i} className="relative rounded-xl border bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className={cn('flex h-11 w-11 items-center justify-center rounded-full text-white', kelasLingkaran)}>
                <Ikon className="h-5 w-5" />
              </div>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground">
                {i + 1}
              </span>
            </div>
            <h3 className="font-semibold text-foreground">{l.judul}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{l.teks}</p>
          </div>
        );
      })}
    </div>
  );
}
