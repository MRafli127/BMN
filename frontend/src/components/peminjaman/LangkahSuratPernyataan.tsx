// ============================================================
//  Langkah Surat Pernyataan - Design User-Friendly.
//   Layout: Data peminjam & form tanda tangan bersebelahan,
//   preview surat pernyataan full-width di bawah.
// ============================================================

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Loader2,
  Send,
  FileText,
  Download,
  ExternalLink,
  RefreshCw,
  Upload,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { notify } from '@/components/ui/toast';
import { peminjamanService } from '@/services/peminjaman.service';
import { ambilPesanError } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useDebounceSubmit } from '@/hooks/useDebounceSubmit';
import type { ItemPengajuan, Peminjaman } from '@/types/peminjaman.type';

interface ItemDenganNama extends ItemPengajuan {
  namaBarang?: string;
}

interface Props {
  items: ItemPengajuan[] | ItemDenganNama[];
  tanggalPinjamRencana?: string;
  tanggalKembaliRencana?: string;
  onSelesai: (peminjaman: Peminjaman) => void;
  onKembali?: () => void;
}

export function LangkahSuratPernyataan({
  items,
  tanggalPinjamRencana,
  tanggalKembaliRencana,
  onSelesai,
  onKembali,
}: Props) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [suratUrl, setSuratUrl] = useState<string | null>(null);
  const [memuatSurat, setMemuatSurat] = useState(false);
  const [gagalSurat, setGagalSurat] = useState(false);
  const [sedangKirim, setSedangKirim] = useState(false);
  const [berkas, setBerkas] = useState<File | null>(null);

  // Anti-spam: cegah submit berkali-kali dalam 2 detik
  const { callback: ajukan, sedangDiblokir: diblokirSpam } = useDebounceSubmit(
    async () => {
      if (!berkas) {
        notify.gagal('Unggah surat pernyataan yang sudah ditandatangani terlebih dahulu.');
        return;
      }
      setSedangKirim(true);
      try {
        const p = await peminjamanService.create({
          items,
          tanggalPinjamRencana,
          tanggalKembaliRencana,
          dokumen: berkas,
        });
        onSelesai(p);
      } catch (error) {
        notify.gagal(ambilPesanError(error, 'Gagal mengirim pengajuan.'));
      } finally {
        setSedangKirim(false);
      }
    },
    { jeda: 2000 }
  );

  // Generate surat preview (dengan debounce agar tidak spam saat props berubah)
  const buatSurat = useCallback(() => {
    if (items.length === 0) return;
    setMemuatSurat(true);
    setGagalSurat(false);

    peminjamanService
      .previewSurat({ items, tanggalPinjamRencana, tanggalKembaliRencana })
      .then(setSuratUrl)
      .catch(() => {
        setGagalSurat(true);
        notify.gagal('Gagal menyiapkan surat pernyataan.');
      })
      .finally(() => setMemuatSurat(false));
  }, [items, tanggalPinjamRencana, tanggalKembaliRencana]);

  useEffect(() => {
    const timer = setTimeout(buatSurat, 300);
    return () => clearTimeout(timer);
  }, [buatSurat]);

  const pilihBerkas = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.type !== 'application/pdf') {
      notify.gagal('Berkas harus berformat PDF.');
      e.target.value = '';
      return;
    }
    setBerkas(f);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground">
            <FileText className="h-7 w-7" />
            Formulir Pengajuan Peminjaman
          </h2>
          <p className="mt-1 text-base text-muted-foreground">
            Unduh surat pernyataan, tanda tangani, lalu unggah kembali untuk mengajukan peminjaman.
          </p>
        </div>
        {onKembali && (
          <Button variant="outline" size="lg" onClick={onKembali}>
            <ArrowLeft className="h-5 w-5" />
            Kembali
          </Button>
        )}
      </div>

      {/* Data Peminjam & Tanda Tangan - Side by Side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Data Peminjam */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Data Peminjam</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 text-base sm:grid-cols-3 lg:grid-cols-1">
              <div>
                <span className="text-sm text-muted-foreground">Nama</span>
                <p className="font-semibold">{user?.nama ?? '-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">NIP</span>
                <p className="font-semibold">{user?.nip ?? '-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Unit Kerja</span>
                <p className="font-semibold">{user?.unitKerjaPegawai ?? user?.unitKerja ?? '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tanda Tangan & Unggah Surat */}
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Tanda Tangan &amp; Unggah Surat</CardTitle>
              <span className="rounded bg-red-500 px-3 py-1 text-sm font-semibold text-white">WAJIB</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Unduh surat pernyataan, tanda tangani secara manual/elektronik, lalu unggah kembali.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Langkah 1 — unduh surat */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                1. Unduh Surat Pernyataan Peminjaman
              </p>
              {memuatSurat ? (
                <Button variant="outline" size="sm" disabled>
                  <Loader2 className="h-4 w-4 animate-spin" /> Menyiapkan surat…
                </Button>
              ) : suratUrl ? (
                <Button asChild variant="outline" size="sm">
                  <a href={suratUrl} download="surat-pernyataan-peminjaman.pdf">
                    <Download className="h-4 w-4" /> Unduh Surat
                  </a>
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">Surat belum tersedia.</p>
              )}
            </div>

            {/* Langkah 2 — tanda tangani */}
            <div className="space-y-1 border-t pt-3">
              <p className="text-sm font-medium text-foreground">
                2. Tanda tangani surat secara manual/elektronik
              </p>
              <p className="text-xs text-muted-foreground">
                Bubuhkan tanda tangan Anda pada surat sebagai persetujuan peminjaman.
              </p>
            </div>

            {/* Langkah 3 — unggah surat yang sudah ditandatangani */}
            <div className="space-y-2 border-t pt-3">
              <p className="text-sm font-medium text-foreground">
                3. Unggah surat yang sudah ditandatangani (PDF)
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                onChange={pilihBerkas}
                className="hidden"
              />
              <Button variant="outline" size="sm" className="w-full" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" /> {berkas ? 'Ganti Berkas' : 'Pilih Berkas PDF'}
              </Button>
              {berkas && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 p-2 text-sm text-green-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">{berkas.name}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Surat Pernyataan - Full Width, Larger */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Preview Surat Pernyataan</CardTitle>
            <div className="flex gap-2">
              {suratUrl && (
                <>
                  <Button asChild variant="ghost" size="sm">
                    <a href={suratUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href={suratUrl} download="surat-pernyataan-peminjaman.pdf">
                      <Download className="h-4 w-4" />
                      Unduh
                    </a>
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {memuatSurat ? (
            <div className="flex h-[500px] items-center justify-center">
              <span className="flex items-center gap-3 text-base text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Menyiapkan surat...
              </span>
            </div>
          ) : gagalSurat ? (
            <div className="flex h-[300px] flex-col items-center justify-center gap-4">
              <p className="text-base text-muted-foreground">Surat gagal dibuat.</p>
              <Button variant="outline" onClick={buatSurat}>
                <RefreshCw className="h-4 w-4" />
                Coba Lagi
              </Button>
            </div>
          ) : suratUrl ? (
            <iframe
              src={suratUrl}
              title="Surat Pernyataan Peminjaman"
              className="h-[700px] w-full rounded-b-lg border-0"
            />
          ) : null}
        </CardContent>
      </Card>

      {/* Action */}
      <div className="flex items-center justify-end border-t pt-6">
        <Button
          onClick={ajukan}
          disabled={!berkas || sedangKirim || diblokirSpam}
          size="lg"
          className="px-8 text-base"
        >
          {sedangKirim || diblokirSpam ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
          {diblokirSpam ? 'Mohon Tunggu...' : 'Kirim Pengajuan'}
        </Button>
      </div>
    </div>
  );
}
