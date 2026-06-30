// ============================================================
//  Peminjam — Keranjang & Checkout Peminjaman.
//   Langkah 1: Tinjau barang yang dipilih dari katalog.
//   Langkah 2: Tinjau Surat Pernyataan Peminjaman, unduh & cetak,
//              tanda tangan fisik, unggah kembali (PDF), lalu ajukan.
//  Tampilan folder per nama barang (mirip katalog).
//  Setiap unit barang hanya berjumlah 1.
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Trash2, ArrowLeft, ArrowRight, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { notify } from '@/components/ui/toast';
import { FolderKeranjang } from '@/components/keranjang/FolderKeranjang';
import { LangkahSuratPernyataan } from '@/components/peminjaman/LangkahSuratPernyataan';
import { useKeranjangStore, useJumlahKeranjang, useTotalUnitKeranjang } from '@/store/keranjangStore';
import { RUTE } from '@/constants/routes';

type Langkah = 'tinjau' | 'surat';

export default function KeranjangPage() {
  const router = useRouter();
  const items = useKeranjangStore((s) => s.items);
  const kosongkan = useKeranjangStore((s) => s.kosongkan);

  const [tglPinjam, setTglPinjam] = useState('');
  const [tglKembali, setTglKembali] = useState('');
  const [langkah, setLangkah] = useState<Langkah>('tinjau');

  // Hindari hydration mismatch: isi keranjang (persisted) baru dibaca setelah mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const daftar = Object.values(items);
  const jumlahKeranjang = useJumlahKeranjang();
  const totalUnit = useTotalUnitKeranjang();

  const keSurat = () => {
    if (daftar.length === 0) return notify.gagal('Keranjang masih kosong.');
    if (tglPinjam && tglKembali && new Date(tglKembali) <= new Date(tglPinjam))
      return notify.gagal('Tanggal kembali harus setelah tanggal pinjam.');
    setLangkah('surat');
  };

  if (!mounted) return <LoadingSpinner layarPenuh />;

  // === ALUR 1: KERANJANG (PILIH BARANG & TANGGAL) ===
  if (langkah === 'tinjau') {
    return (
      <div className="mx-auto max-w-5xl space-y-5">
        <Button asChild variant="ghost" size="sm">
          <Link href={RUTE.peminjamKatalog}>
            <ArrowLeft className="h-4 w-4" /> Kembali ke Katalog
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <ShoppingCart className="h-6 w-6" /> Keranjang Peminjaman
            </h1>
            <p className="text-muted-foreground">
              Tinjau barang yang dipilih, tentukan tanggal pinjam & kembali, lalu lanjut ke formulir.
            </p>
          </div>
          {daftar.length > 0 && (
            <Button variant="ghost" size="sm" className="text-red-600" onClick={kosongkan}>
              <Trash2 className="h-4 w-4" /> Kosongkan Keranjang
            </Button>
          )}
        </div>

        {daftar.length === 0 ? (
          <EmptyState
            judul="Keranjang masih kosong"
            deskripsi="Tambahkan barang dari katalog untuk mulai mengajukan peminjaman."
            aksi={
              <Button asChild>
                <Link href={RUTE.peminjamKatalog}>Telusuri Katalog</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Folder barang */}
            <div className="lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <Label className="text-base font-semibold">
                  {jumlahKeranjang} unit barang dipilih
                </Label>
              </div>
              <FolderKeranjang />
            </div>

            {/* Ringkasan & lanjut */}
            <div>
              <Card className="lg:sticky lg:top-4">
                <CardHeader>
                  <CardTitle className="text-base">Detail Pengajuan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="tglPinjam">Tanggal Pinjam (opsional)</Label>
                    <Input id="tglPinjam" type="date" value={tglPinjam} onChange={(e) => setTglPinjam(e.target.value)} className="mt-1" />
                    <p className="mt-1 text-xs text-muted-foreground">Kosongkan untuk memakai tanggal hari ini.</p>
                  </div>
                  <div>
                    <Label htmlFor="tglKembali">Rencana Kembali (opsional)</Label>
                    <Input id="tglKembali" type="date" value={tglKembali} onChange={(e) => setTglKembali(e.target.value)} className="mt-1" />
                    <p className="mt-1 text-xs text-muted-foreground">Kosongkan bila peminjaman tanpa batas waktu.</p>
                  </div>

                  <div className="flex items-center justify-between border-t pt-3 text-sm">
                    <span className="text-muted-foreground">Total unit dipilih</span>
                    <span className="font-semibold text-foreground">{totalUnit}</span>
                  </div>

                  <Button className="w-full" onClick={keSurat}>
                    <FileText className="h-4 w-4" /> Lanjut ke Formulir
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    );
  }

  // === ALUR 2: FORMULIR (SURAT PERNYATAAN) ===
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <LangkahSuratPernyataan
        items={daftar.map((it) => ({ barangId: it.barangId, jumlahPinjam: it.jumlah, namaBarang: it.nama }))}
        tanggalPinjamRencana={tglPinjam || undefined}
        tanggalKembaliRencana={tglKembali || undefined}
        onKembali={() => setLangkah('tinjau')}
        onSelesai={(p) => {
          notify.sukes('Pengajuan peminjaman berhasil dikirim!');
          kosongkan();
          router.push(RUTE.peminjamRiwayatReview(p.id));
        }}
      />
    </div>
  );
}
