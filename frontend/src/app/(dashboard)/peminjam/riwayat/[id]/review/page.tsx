// ============================================================
//  Peminjam — Tinjau Pengajuan (setelah surat diunggah & diajukan).
//   - Ringkasan barang yang dipinjam.
//   - Pratinjau Surat Pernyataan yang sudah ditandatangani & diunggah.
//   - Lanjut ke detail peminjaman.
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, FileText, Download, ExternalLink, Boxes, CalendarDays, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { notify } from '@/components/ui/toast';
import { peminjamanService } from '@/services/peminjaman.service';
import { ambilPesanError, formatTanggalLengkap } from '@/lib/utils';
import { STATUS_PEMINJAMAN, JENIS_BARANG } from '@/constants/status';
import { RUTE } from '@/constants/routes';
import type { Peminjaman } from '@/types/peminjaman.type';

export default function ReviewPengajuanPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Peminjaman | null>(null);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    if (!id) return;
    peminjamanService
      .getById(id)
      .then(setData)
      .catch((e) => notify.gagal(ambilPesanError(e, 'Gagal memuat data pengajuan.')))
      .finally(() => setMemuat(false));
  }, [id]);

  if (memuat) return <LoadingSpinner layarPenuh />;
  if (!data) return null;

  const status = STATUS_PEMINJAMAN[data.status];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Banner sukses */}
      <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-600" />
        <div>
          <p className="font-semibold text-green-900">Pengajuan berhasil dikirim</p>
          <p className="text-sm text-green-800">
            Surat pernyataan yang Anda unggah sedang menunggu verifikasi admin. Silakan tinjau kembali sebelum melanjutkan.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-primary">{data.kodePeminjaman}</p>
          <h1 className="text-xl font-bold text-foreground">Tinjau Pengajuan</h1>
        </div>
        <Badge className={`${status.kelas} px-3 py-1 text-sm`}>{status.label}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Ringkasan barang */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Boxes className="h-4 w-4" /> Barang yang Dipinjam ({data.detail?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Rencana Pinjam</p>
                <p className="font-medium text-foreground">{formatTanggalLengkap(data.tanggalPinjamRencana)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rencana Kembali</p>
                <p className="font-medium text-foreground">
                  {data.tanggalKembaliRencana ? formatTanggalLengkap(data.tanggalKembaliRencana) : 'Tanpa batas waktu'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {data.detail?.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{d.barang?.nama}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Merk: <span className="font-medium text-foreground">{d.barang?.merk || '-'}</span>
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {d.barang?.kodeBarang} • {d.barang ? JENIS_BARANG[d.barang.jenis] : ''}
                    </p>
                  </div>
                  <Badge className="border-primary/20 bg-primary/10 text-primary">{d.jumlahPinjam} unit</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Surat Pernyataan */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" /> Surat Pernyataan
            </CardTitle>
            {data.dokumenUrl && (
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href={data.dokumenUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" /> Tab Baru
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={data.dokumenUrl} download={`surat-pernyataan-${data.kodePeminjaman}.pdf`}>
                    <Download className="h-4 w-4" /> Unduh
                  </a>
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {data.dokumenUrl ? (
              <iframe
                src={data.dokumenUrl}
                title="Surat Pernyataan Peminjaman"
                className="h-[520px] w-full rounded-lg border"
              />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Surat pernyataan belum tersedia. Anda tetap dapat melanjutkan; dokumen dapat dibuka dari detail nanti.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Aksi lanjut */}
      <div className="flex flex-wrap items-center justify-end gap-3 rounded-xl border bg-card p-4">
        <Button asChild variant="ghost">
          <Link href={RUTE.peminjamKatalog}>
            <CalendarDays className="h-4 w-4" /> Kembali ke Katalog
          </Link>
        </Button>
        <Button onClick={() => router.push(RUTE.peminjamRiwayatDetail(data.id))}>
          Lanjut ke Detail Peminjaman <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
