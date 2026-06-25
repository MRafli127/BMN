// ============================================================
//  Peminjam — Detail & Lacak Status Peminjaman.
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, FileText, Download, CalendarDays, Boxes, Undo2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KonfirmasiDialog } from '@/components/shared/KonfirmasiDialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { TimelineStatus } from '@/components/peminjaman/TimelineStatus';
import { TampilQR } from '@/components/qrcode/TampilQR';
import { notify } from '@/components/ui/toast';
import { peminjamanService } from '@/services/peminjaman.service';
import { ambilPesanError, formatTanggalLengkap } from '@/lib/utils';
import { STATUS_PEMINJAMAN, JENIS_BARANG } from '@/constants/status';
import { RUTE } from '@/constants/routes';
import type { Peminjaman } from '@/types/peminjaman.type';

export default function DetailRiwayatPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Peminjaman | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [dialogKembali, setDialogKembali] = useState(false);
  const [proses, setProses] = useState(false);

  useEffect(() => {
    if (!id) return;
    peminjamanService
      .getById(id)
      .then(setData)
      .catch((e) => notify.gagal(ambilPesanError(e, 'Gagal memuat detail.')))
      .finally(() => setMemuat(false));
  }, [id]);

  const ajukanPengembalian = async () => {
    if (!data) return;
    setProses(true);
    try {
      const hasil = await peminjamanService.mintaPengembalian(data.id);
      setData(hasil);
      setDialogKembali(false);
      notify.sukses('Permintaan pengembalian terkirim. Menunggu konfirmasi admin.');
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal mengajukan pengembalian.'));
    } finally {
      setProses(false);
    }
  };

  if (memuat) return <LoadingSpinner layarPenuh />;
  if (!data) return null;

  const status = STATUS_PEMINJAMAN[data.status];
  const sedangDipinjam = ['DIPINJAM', 'TERLAMBAT'].includes(data.status);
  const bisaAjukanKembali = sedangDipinjam && !data.tanggalPermintaanKembali;
  const menungguKonfirmasi = sedangDipinjam && !!data.tanggalPermintaanKembali;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Button asChild variant="ghost" size="sm">
        <Link href={RUTE.peminjamRiwayat}>
          <ArrowLeft className="h-4 w-4" /> Kembali ke Riwayat
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-5">
        <div>
          <p className="font-mono text-sm text-primary">{data.kodePeminjaman}</p>
          <h1 className="text-xl font-bold text-foreground">Detail Peminjaman</h1>
          <p className="text-sm text-muted-foreground">Diajukan {formatTanggalLengkap(data.tanggalPengajuan)}</p>
        </div>
        <Badge className={`${status.kelas} px-3 py-1 text-sm`}>{status.label}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Kolom utama */}
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4" /> Rincian Peminjaman
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Info label="Rencana Pinjam" nilai={formatTanggalLengkap(data.tanggalPinjamRencana)} />
                <Info
                  label="Rencana Kembali"
                  nilai={data.tanggalKembaliRencana ? formatTanggalLengkap(data.tanggalKembaliRencana) : 'Tanpa batas waktu'}
                />
                {data.tanggalKembaliAktual && (
                  <Info label="Dikembalikan Pada" nilai={formatTanggalLengkap(data.tanggalKembaliAktual)} />
                )}
              </div>
              {data.alasanPeminjaman && (
                <div>
                  <p className="font-medium text-foreground">Alasan Peminjaman</p>
                  <p className="mt-1 text-muted-foreground">{data.alasanPeminjaman}</p>
                </div>
              )}

              <div>
                <p className="mb-2 flex items-center gap-2 font-medium text-foreground">
                  <Boxes className="h-4 w-4" /> Barang Dipinjam
                </p>
                <div className="space-y-2">
                  {data.detail?.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                      <div>
                        <p className="font-medium text-foreground">{d.barang?.nama}</p>
                        <p className="text-xs text-muted-foreground">
                          Merk: <span className="font-medium text-foreground">{d.barang?.merk || '-'}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {d.barang?.kodeBarang} • {d.barang ? JENIS_BARANG[d.barang.jenis] : ''}
                        </p>
                      </div>
                      <Badge className="border-primary/20 bg-primary/10 text-primary">{d.jumlahPinjam} unit</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {data.catatanAdmin && (
                <div className="rounded-lg bg-amber-50 p-3">
                  <p className="font-medium text-amber-900">Catatan Admin</p>
                  <p className="mt-1 text-amber-800">{data.catatanAdmin}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dokumen */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" /> Surat Pernyataan
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {data.dokumenUrl ? (
                <Button asChild variant="outline">
                  <a href={data.dokumenUrl} target="_blank" rel="noreferrer">
                    <FileText className="h-4 w-4" /> Lihat Surat Pernyataan
                  </a>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">Surat pernyataan belum tersedia.</p>
              )}
              {data.dokumenStempelUrl && (
                <Button asChild variant="sukses">
                  <a href={data.dokumenStempelUrl} target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4" /> Unduh Surat Berstempel
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: timeline + QR */}
        <div className="space-y-5">
          {(bisaAjukanKembali || menungguKonfirmasi) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pengembalian Barang</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {bisaAjukanKembali && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Sudah selesai meminjam? Ajukan pengembalian, lalu admin akan mengkonfirmasi penerimaan barang.
                    </p>
                    <Button className="w-full" onClick={() => setDialogKembali(true)}>
                      <Undo2 className="h-4 w-4" /> Kembalikan Barang
                    </Button>
                  </>
                )}
                {menungguKonfirmasi && (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      Permintaan pengembalian sudah dikirim
                      {data.tanggalPermintaanKembali ? ` pada ${formatTanggalLengkap(data.tanggalPermintaanKembali)}` : ''}.
                      Menunggu konfirmasi pengembalian oleh admin.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lacak Status</CardTitle>
            </CardHeader>
            <CardContent>
              <TimelineStatus peminjaman={data} />
            </CardContent>
          </Card>

          {data.qrCodeUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">QR Code Peminjaman</CardTitle>
                <p className="text-xs text-muted-foreground">Tunjukkan QR ini saat mengembalikan barang.</p>
              </CardHeader>
              <CardContent>
                <TampilQR qrCodeUrl={data.qrCodeUrl} kodePeminjaman={data.kodePeminjaman} namaPeminjam={data.peminjam?.nama} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog konfirmasi pengembalian */}
      <KonfirmasiDialog
        terbuka={dialogKembali}
        onUbahTerbuka={(o) => !o && setDialogKembali(false)}
        judul="Kembalikan Barang"
        deskripsi="Ajukan pengembalian barang ini. Permintaan akan dikirim ke admin untuk dikonfirmasi. Pastikan barang sudah siap dikembalikan."
        teksKonfirmasi="Ya, Ajukan Pengembalian"
        variantKonfirmasi="sukses"
        sedangProses={proses}
        onKonfirmasi={ajukanPengembalian}
      />
    </div>
  );
}

function Info({ label, nilai }: { label: string; nilai?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{nilai || '-'}</p>
    </div>
  );
}
