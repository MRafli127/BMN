// ============================================================
//  Panduan Penggunaan DALAM APLIKASI (/bantuan).
//  Tampilan berbeda & lebih kaya dari panduan publik (landing):
//  menyesuaikan peran pengguna (admin / peminjam), dengan
//  stepper vertikal, kartu tips, aksi cepat, dan FAQ.
// ============================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Boxes,
  FileUp,
  Hourglass,
  QrCode,
  PackageCheck,
  ScanLine,
  CheckCircle2,
  ClipboardList,
  ThumbsUp,
  Stamp,
  Lightbulb,
  ChevronDown,
  Sparkles,
  PlusCircle,
  Undo2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { RUTE } from '@/constants/routes';

type Langkah = { ikon: typeof Boxes; judul: string; teks: string };

// ---------- Data konten per peran ----------
const peminjamPinjam: Langkah[] = [
  { ikon: Boxes, judul: 'Telusuri Katalog', teks: 'Buka menu Katalog untuk melihat barang yang tersedia beserta sisa stoknya.' },
  { ikon: FileUp, judul: 'Cetak, Tanda Tangani & Unggah Surat', teks: 'Pilih barang + jumlah & tanggal, cetak Surat Pernyataan Peminjaman, tanda tangani secara fisik, lalu unggah kembali (PDF) untuk mengajukan.' },
  { ikon: Hourglass, judul: 'Tunggu Persetujuan', teks: 'Admin memverifikasi pengajuan Anda. Pantau perubahan status secara realtime di menu Riwayat.' },
  { ikon: QrCode, judul: 'Ambil Barang & Simpan QR', teks: 'Setelah disetujui, QR Code dibuat otomatis. Unduh/cetak QR untuk dibawa saat pengembalian.' },
];

const peminjamKembali: Langkah[] = [
  { ikon: PackageCheck, judul: 'Bawa Barang & QR', teks: 'Bawa barang yang dipinjam beserta QR Code (dari aplikasi atau hasil cetak).' },
  { ikon: ScanLine, judul: 'Petugas Memindai', teks: 'Admin memindai QR Code Anda — bisa lewat kamera atau mengunggah gambar QR.' },
  { ikon: CheckCircle2, judul: 'Selesai', teks: 'Status berubah menjadi "Dikembalikan" dan stok barang bertambah otomatis.' },
];

const adminKelola: Langkah[] = [
  { ikon: ClipboardList, judul: 'Tinjau Pengajuan', teks: 'Buka Manajemen Peminjaman, periksa detail & dokumen yang diunggah peminjam.' },
  { ikon: ThumbsUp, judul: 'Setujui atau Tolak', teks: 'Setujui (stok berkurang & QR dibuat otomatis) atau tolak dengan menyertakan catatan.' },
  { ikon: Stamp, judul: 'Stempel Dokumen', teks: 'Bubuhkan cap "DISETUJUI" + tanda tangan digital ke dokumen PDF, lalu dapat diunduh.' },
  { ikon: PackageCheck, judul: 'Serahkan Barang', teks: 'Tandai barang telah diserahkan kepada peminjam (status menjadi Dipinjam).' },
  { ikon: ScanLine, judul: 'Proses Pengembalian', teks: 'Scan QR via kamera / unggah gambar QR / masukkan kode, lalu konfirmasi pengembalian.' },
];

const faqPeminjam = [
  { t: 'Apa yang terjadi jika saya terlambat mengembalikan?', j: 'Sistem otomatis menandai peminjaman sebagai "Terlambat" bila melewati tanggal rencana kembali. Segera kembalikan barang untuk menghindari sanksi administratif.' },
  { t: 'Bagaimana jika QR Code saya hilang?', j: 'QR Code dapat dibuka & dicetak ulang kapan saja melalui menu Riwayat → detail peminjaman.' },
  { t: 'Dokumen apa yang perlu saya unggah?', j: 'Surat Pernyataan Peminjaman yang sudah dicetak dan ditandatangani secara fisik, dalam format PDF (maksimum 5 MB).' },
];

const faqAdmin = [
  { t: 'Apakah catatan wajib saat menolak?', j: 'Ya. Saat menolak pengajuan, catatan penolakan wajib diisi agar peminjam memahami alasannya.' },
  { t: 'Bagaimana stok dijaga agar tidak minus?', j: 'Stok berkurang otomatis saat persetujuan dan bertambah saat pengembalian, diproses dalam transaksi database yang aman.' },
  { t: 'Bisakah memindai QR tanpa kamera?', j: 'Bisa. Di halaman Scan Pengembalian tersedia opsi unggah gambar QR dan input kode peminjaman manual.' },
];

export default function BantuanPage() {
  const { user, isAdmin } = useAuth();
  const [buka, setBuka] = useState<number | null>(0);

  const faq = isAdmin ? faqAdmin : faqPeminjam;

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-primary to-brand-600 p-7 text-white shadow-sm">
        <Sparkles className="absolute -right-4 -top-4 h-28 w-28 text-white/10" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
            <Lightbulb className="h-3.5 w-3.5" /> Pusat Panduan
          </span>
          <h1 className="mt-3 font-jakarta text-2xl font-bold md:text-3xl">
            Panduan {isAdmin ? 'Administrator' : 'Peminjam'} SIPP-BMN
          </h1>
          <p className="mt-2 max-w-2xl text-white/85">
            Halo {user?.nama?.split(' ')[0] || 'Pengguna'}, berikut langkah-langkah penggunaan aplikasi sesuai peran Anda.
            Ikuti panduan ini agar proses {isAdmin ? 'pengelolaan' : 'peminjaman'} berjalan lancar.
          </p>
        </div>
      </div>

      {/* Konten per peran */}
      {isAdmin ? (
        <SeksiStepper
          judul="Alur Pengelolaan Peminjaman"
          deskripsi="Dari verifikasi pengajuan hingga konfirmasi pengembalian."
          warna="primary"
          langkah={adminKelola}
        />
      ) : (
        <>
          <SeksiStepper
            judul="Cara Meminjam Barang"
            deskripsi="Empat langkah mudah untuk mengajukan peminjaman."
            warna="primary"
            langkah={peminjamPinjam}
          />
          <SeksiStepper
            judul="Cara Mengembalikan Barang"
            deskripsi="Proses pengembalian cukup dengan QR Code."
            warna="hijau"
            langkah={peminjamKembali}
          />
        </>
      )}

      {/* Tips */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(isAdmin
          ? [
              'Selalu isi catatan yang jelas saat menolak pengajuan.',
              'Gunakan stempel digital sebelum menyerahkan barang.',
              'Saat pengembalian, QR bisa dipindai kamera atau diunggah gambarnya.',
            ]
          : [
              'Kembalikan barang tepat waktu agar tidak berstatus Terlambat.',
              'Simpan atau cetak QR Code segera setelah disetujui.',
              'Pastikan dokumen yang diunggah jelas terbaca (maks 5 MB).',
            ]
        ).map((tip, i) => (
          <Card key={i} className="border-amber-200 bg-amber-50">
            <CardContent className="flex items-start gap-3 p-4">
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-900">{tip}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Aksi cepat */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h3 className="font-semibold text-foreground">Siap memulai?</h3>
            <p className="text-sm text-muted-foreground">Akses cepat ke tindakan utama Anda.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin ? (
              <>
                <Button asChild variant="outline">
                  <Link href={RUTE.adminPeminjaman}>
                    <ClipboardList className="h-4 w-4" /> Kelola Peminjaman
                  </Link>
                </Button>
                <Button asChild>
                  <Link href={RUTE.adminScan}>
                    <Undo2 className="h-4 w-4" /> Scan Pengembalian
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link href={RUTE.peminjamKatalog}>
                    <Boxes className="h-4 w-4" /> Lihat Katalog
                  </Link>
                </Button>
                <Button asChild>
                  <Link href={RUTE.peminjamAjukan}>
                    <PlusCircle className="h-4 w-4" /> Ajukan Peminjaman
                  </Link>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <div>
        <h2 className="mb-4 font-jakarta text-lg font-bold text-primary">Pertanyaan yang Sering Diajukan</h2>
        <div className="space-y-3">
          {faq.map((item, i) => (
            <div key={i} className="overflow-hidden rounded-xl border bg-card">
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
      </div>
    </div>
  );
}

// ---------- Stepper vertikal ----------
function SeksiStepper({
  judul,
  deskripsi,
  langkah,
  warna,
}: {
  judul: string;
  deskripsi: string;
  langkah: Langkah[];
  warna: 'primary' | 'hijau';
}) {
  const badge = warna === 'hijau' ? 'bg-hijau-600' : 'bg-primary';
  const garis = warna === 'hijau' ? 'bg-hijau-600/30' : 'bg-primary/30';

  return (
    <section>
      <h2 className="font-jakarta text-lg font-bold text-primary">{judul}</h2>
      <p className="mb-4 text-sm text-on-surface-variant">{deskripsi}</p>
      <div className="space-y-0">
        {langkah.map((l, i) => {
          const Ikon = l.ikon;
          const terakhir = i === langkah.length - 1;
          return (
            <div key={i} className="flex gap-4">
              {/* Nomor + garis penghubung */}
              <div className="flex flex-col items-center">
                <div className={cn('flex h-11 w-11 items-center justify-center rounded-full font-bold text-white shadow', badge)}>
                  {i + 1}
                </div>
                {!terakhir && <div className={cn('w-0.5 flex-1', garis)} />}
              </div>
              {/* Kartu langkah */}
              <Card className={cn('mb-4 flex-1 transition-shadow hover:shadow-md', terakhir && 'mb-0')}>
                <CardContent className="flex items-start gap-3 p-4">
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white', badge)}>
                    <Ikon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{l.judul}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">{l.teks}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </section>
  );
}
