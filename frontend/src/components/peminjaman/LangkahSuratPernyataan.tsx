// ============================================================
//  Langkah Surat Pernyataan Peminjaman (sebelum pengajuan dibuat).
//   1. Tinjau & unduh/cetak Surat Pernyataan Peminjaman (PDF).
//   2. Tanda tangan secara FISIK.
//   3. Unggah kembali surat yang sudah ditandatangani (PDF).
//   4. Ajukan pinjaman.
//  Dipakai bersama oleh halaman Keranjang dan Form Ajukan.
// ============================================================

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileText,
  Download,
  ExternalLink,
  Upload,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Send,
  ArrowLeft,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { notify } from '@/components/ui/toast';
import { peminjamanService } from '@/services/peminjaman.service';
import { ambilPesanError } from '@/lib/utils';
import type { ItemPengajuan, Peminjaman } from '@/types/peminjaman.type';

interface Props {
  items: ItemPengajuan[];
  tanggalPinjamRencana?: string;
  tanggalKembaliRencana?: string;
  /** Dipanggil setelah pengajuan berhasil dibuat. */
  onSelesai: (peminjaman: Peminjaman) => void;
  /** Kembali ke langkah pemilihan barang (opsional). */
  onKembali?: () => void;
}

export function LangkahSuratPernyataan({
  items,
  tanggalPinjamRencana,
  tanggalKembaliRencana,
  onSelesai,
  onKembali,
}: Props) {
  const [suratUrl, setSuratUrl] = useState<string | null>(null);
  const [memuatSurat, setMemuatSurat] = useState(false);
  const [gagalSurat, setGagalSurat] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [sedangKirim, setSedangKirim] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const buatSurat = useCallback(() => {
    if (items.length === 0) return;
    setMemuatSurat(true);
    setGagalSurat(false);
    peminjamanService
      .previewSurat({ items, tanggalPinjamRencana, tanggalKembaliRencana })
      .then(setSuratUrl)
      .catch((e) => {
        setGagalSurat(true);
        notify.gagal(ambilPesanError(e, 'Gagal menyiapkan surat pernyataan.'));
      })
      .finally(() => setMemuatSurat(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items), tanggalPinjamRencana, tanggalKembaliRencana]);

  useEffect(() => {
    buatSurat();
  }, [buatSurat]);

  const pilihFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.type !== 'application/pdf') {
      notify.gagal('Berkas harus berformat PDF.');
      e.target.value = '';
      return;
    }
    setFile(f);
  };

  const ajukan = async () => {
    if (!file) return notify.gagal('Unggah surat pernyataan yang sudah ditandatangani (PDF) terlebih dahulu.');
    setSedangKirim(true);
    try {
      const p = await peminjamanService.create({
        items,
        tanggalPinjamRencana,
        tanggalKembaliRencana,
        dokumen: file,
      });
      onSelesai(p);
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal mengirim pengajuan.'));
    } finally {
      setSedangKirim(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Langkah 1: Tinjau & unduh surat */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileText className="h-4 w-4" /> 1. Tinjau &amp; unduh Surat Pernyataan Peminjaman
            </p>
            {suratUrl && (
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href={suratUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" /> Tab Baru
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={suratUrl} download="surat-pernyataan-peminjaman.pdf">
                    <Download className="h-4 w-4" /> Unduh / Cetak
                  </a>
                </Button>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Cetak surat, lalu <strong>tanda tangani secara fisik</strong> pada kolom &quot;Peminjam BMN&quot;.
          </p>

          {memuatSurat ? (
            <div className="flex h-[480px] items-center justify-center rounded-lg border bg-muted/30">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Menyiapkan surat pernyataan…
              </span>
            </div>
          ) : gagalSurat ? (
            <div className="flex h-[200px] flex-col items-center justify-center gap-3 rounded-lg border bg-muted/30">
              <p className="text-sm text-muted-foreground">Surat pernyataan gagal dibuat.</p>
              <Button variant="outline" size="sm" onClick={buatSurat}>
                <RefreshCw className="h-4 w-4" /> Coba Lagi
              </Button>
            </div>
          ) : suratUrl ? (
            <iframe
              src={suratUrl}
              title="Surat Pernyataan Peminjaman"
              className="h-[480px] w-full rounded-lg border"
            />
          ) : null}
        </CardContent>
      </Card>

      {/* Langkah 2: Unggah surat ber-tanda tangan */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Upload className="h-4 w-4" /> 2. Unggah surat yang sudah ditandatangani (PDF)
          </p>
          <input ref={fileRef} type="file" accept="application/pdf" onChange={pilihFile} className="hidden" />
          <Button variant="outline" size="sm" className="w-full" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> {file ? 'Ganti Berkas' : 'Pilih Berkas PDF'}
          </Button>
          {file && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 p-2 text-xs text-green-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{file.name}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Langkah 3: Ajukan */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {onKembali && (
          <Button variant="ghost" onClick={onKembali} disabled={sedangKirim}>
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Button>
        )}
        <Button onClick={ajukan} disabled={!file || sedangKirim}>
          {sedangKirim ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Ajukan Pinjaman
        </Button>
      </div>
    </div>
  );
}
