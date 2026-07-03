// ============================================================
//  Peminjam — Detail & Lacak Status Peminjaman.
// ============================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  Download,
  CalendarDays,
  Boxes,
  Undo2,
  Clock,
  ExternalLink,
  Upload,
  Loader2,
  CheckCircle2,
  Send,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KonfirmasiDialog } from '@/components/shared/KonfirmasiDialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { TimelineStatus } from '@/components/peminjaman/TimelineStatus';
import { FolderBarangDipinjam } from '@/components/peminjaman/FolderBarangDipinjam';
import { TampilQR } from '@/components/qrcode/TampilQR';
import { notify } from '@/components/ui/toast';
import { peminjamanService } from '@/services/peminjaman.service';
import { ambilPesanError, formatTanggalLengkap } from '@/lib/utils';
import { STATUS_PEMINJAMAN } from '@/constants/status';
import { RUTE } from '@/constants/routes';
import type { Peminjaman } from '@/types/peminjaman.type';

export default function DetailRiwayatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Peminjaman | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [dialogKembali, setDialogKembali] = useState(false);
  const [proses, setProses] = useState(false);
  const [suratUrl, setSuratUrl] = useState<string | null>(null);
  const [memuatSurat, setMemuatSurat] = useState(false);
  const [fileKembali, setFileKembali] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // --- Penyelesaian pengajuan DRAFT (unggah Surat Pernyataan menyusul) ---
  const [suratPengajuanUrl, setSuratPengajuanUrl] = useState<string | null>(null);
  const [memuatSuratPengajuan, setMemuatSuratPengajuan] = useState(false);
  const [fileSurat, setFileSurat] = useState<File | null>(null);
  const [prosesUnggah, setProsesUnggah] = useState(false);
  const [dialogBatal, setDialogBatal] = useState(false);
  const [prosesBatal, setProsesBatal] = useState(false);
  const fileSuratRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    peminjamanService
      .getById(id)
      .then(setData)
      .catch((e) => notify.gagal(ambilPesanError(e, 'Gagal memuat detail.')))
      .finally(() => setMemuat(false));
  }, [id]);

  // Hasilkan Surat Pernyataan Pengembalian (PDF) saat pengembalian masih bisa diajukan.
  useEffect(() => {
    if (!data) return;
    const bisa = ['DIPINJAM', 'TERLAMBAT'].includes(data.status) && !data.tanggalPermintaanKembali;
    if (!bisa || suratUrl) return;
    setMemuatSurat(true);
    peminjamanService
      .getSuratPengembalian(data.id)
      .then(setSuratUrl)
      .catch((e) => notify.gagal(ambilPesanError(e, 'Gagal membuat surat pengembalian.')))
      .finally(() => setMemuatSurat(false));
  }, [data, suratUrl]);

  // Siapkan Surat Pernyataan (PDF) untuk pengajuan DRAFT agar bisa diunduh & ditandatangani.
  useEffect(() => {
    if (!data || data.status !== 'DRAFT' || suratPengajuanUrl) return;
    setMemuatSuratPengajuan(true);
    peminjamanService
      .getSuratPernyataan(data.id)
      .then(setSuratPengajuanUrl)
      .catch((e) => notify.gagal(ambilPesanError(e, 'Gagal menyiapkan surat pernyataan.')))
      .finally(() => setMemuatSuratPengajuan(false));
  }, [data, suratPengajuanUrl]);

  const pilihFileSurat = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.type !== 'application/pdf') {
      notify.gagal('Berkas harus berformat PDF.');
      e.target.value = '';
      return;
    }
    setFileSurat(f);
  };

  const kirimDraft = async () => {
    if (!data || !fileSurat) return;
    setProsesUnggah(true);
    try {
      const hasil = await peminjamanService.unggahSurat(data.id, fileSurat);
      setData(hasil);
      setFileSurat(null);
      notify.suksess('Surat pernyataan terunggah. Pengajuan kini menunggu persetujuan admin.');
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal mengunggah surat pernyataan.'));
    } finally {
      setProsesUnggah(false);
    }
  };

  const batalkanDraft = async () => {
    if (!data) return;
    setProsesBatal(true);
    try {
      await peminjamanService.batalDraft(data.id);
      notify.suksess('Pengajuan draft dibatalkan.');
      router.push(RUTE.peminjamRiwayat);
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal membatalkan draft.'));
      setProsesBatal(false);
    }
  };

  const pilihFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.type !== 'application/pdf') {
      notify.gagal('Berkas harus berformat PDF.');
      e.target.value = '';
      return;
    }
    setFileKembali(f);
  };

  const ajukanPengembalian = async () => {
    if (!data || !fileKembali) return;
    setProses(true);
    try {
      const hasil = await peminjamanService.mintaPengembalian(data.id, fileKembali);
      setData(hasil);
      setDialogKembali(false);
      setFileKembali(null);
      notify.suksess('Permintaan pengembalian terkirim. Menunggu konfirmasi admin.');
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal mengajukan pengembalian.'));
    } finally {
      setProses(false);
    }
  };

  if (memuat) return <LoadingSpinner layarPenuh />;
  if (!data) return null;

  const status = STATUS_PEMINJAMAN[data.status];
  const isDraft = data.status === 'DRAFT';
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
                <p className="mb-2 text-xs text-muted-foreground">
                  Klik tiap barang untuk melihat Label &amp; QR Identitas Barang.
                </p>
                <FolderBarangDipinjam detail={data.detail} />
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
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" /> Surat Pernyataan
              </CardTitle>
              {data.dokumenUrl && (
                <div className="flex flex-wrap justify-end gap-2">
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
                  {data.dokumenStempelUrl && (
                    <Button asChild variant="sukses" size="sm">
                      <a href={data.dokumenStempelUrl} download={`surat-berstempel-${data.kodePeminjaman}.pdf`}>
                        <Download className="h-4 w-4" /> Surat Berstempel
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {data.dokumenUrl ? (
                <iframe
                  src={data.dokumenUrl}
                  title="Surat Pernyataan Peminjaman"
                  className="h-[520px] w-full rounded-lg border"
                />
              ) : (
                <p className="text-sm text-muted-foreground">Surat pernyataan belum tersedia.</p>
              )}
              {data.dokumenPengembalianUrl && (
                <Button asChild variant="outline" size="sm">
                  <a href={data.dokumenPengembalianUrl} target="_blank" rel="noreferrer">
                    <FileText className="h-4 w-4" /> Surat Pengembalian (Ditandatangani)
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: timeline + QR */}
        <div className="space-y-5">
          {/* Penyelesaian pengajuan DRAFT: unduh surat, tanda tangan, unggah */}
          {isDraft && (
            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Selesaikan Pengajuan</CardTitle>
                  <span className="rounded bg-red-500 px-3 py-1 text-xs font-semibold text-white">WAJIB</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Pengajuan ini belum dikirim ke admin. Unggah Surat Pernyataan yang sudah
                  ditandatangani untuk melanjutkan.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Langkah 1 — unduh surat */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">1. Unduh Surat Pernyataan</p>
                  <div className="flex flex-wrap gap-2">
                    {memuatSuratPengajuan ? (
                      <Button variant="outline" size="sm" disabled>
                        <Loader2 className="h-4 w-4 animate-spin" /> Menyiapkan surat…
                      </Button>
                    ) : suratPengajuanUrl ? (
                      <>
                        <Button asChild variant="outline" size="sm">
                          <a href={suratPengajuanUrl} download={`surat-pernyataan-${data.kodePeminjaman}.pdf`}>
                            <Download className="h-4 w-4" /> Unduh Surat
                          </a>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <a href={suratPengajuanUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4" /> Lihat
                          </a>
                        </Button>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">Surat belum tersedia.</p>
                    )}
                  </div>
                </div>

                {/* Langkah 2 — tanda tangani */}
                <div className="space-y-1 border-t pt-3">
                  <p className="text-sm font-medium text-foreground">
                    2. Tanda tangani surat secara manual/elektronik
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Bubuhkan tanda tangan Anda sebagai persetujuan peminjaman.
                  </p>
                </div>

                {/* Langkah 3 — unggah surat */}
                <div className="space-y-2 border-t pt-3">
                  <p className="text-sm font-medium text-foreground">
                    3. Unggah surat yang sudah ditandatangani (PDF)
                  </p>
                  <input
                    ref={fileSuratRef}
                    type="file"
                    accept="application/pdf"
                    onChange={pilihFileSurat}
                    className="hidden"
                  />
                  <Button variant="outline" size="sm" className="w-full" onClick={() => fileSuratRef.current?.click()}>
                    <Upload className="h-4 w-4" /> {fileSurat ? 'Ganti Berkas' : 'Pilih Berkas PDF'}
                  </Button>
                  {fileSurat && (
                    <div className="flex items-center gap-2 rounded-lg bg-green-50 p-2 text-xs text-green-800">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">{fileSurat.name}</span>
                    </div>
                  )}
                </div>

                {/* Aksi */}
                <div className="space-y-2 border-t pt-3">
                  <Button className="w-full" disabled={!fileSurat || prosesUnggah} onClick={kirimDraft}>
                    {prosesUnggah ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Kirim Pengajuan
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-red-600 hover:text-red-700"
                    disabled={prosesUnggah || prosesBatal}
                    onClick={() => setDialogBatal(true)}
                  >
                    <Trash2 className="h-4 w-4" /> Batalkan Pengajuan
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {(bisaAjukanKembali || menungguKonfirmasi) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pengembalian Barang</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {bisaAjukanKembali && (
                  <>
                    {/* Langkah 1 — unduh & cetak surat */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        1. Unduh &amp; cetak Surat Pernyataan Pengembalian
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Cetak surat, lalu minta tanda tangan <strong>&quot;Yang menerima BMN&quot;</strong> secara fisik.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {memuatSurat ? (
                          <Button variant="outline" size="sm" disabled>
                            <Loader2 className="h-4 w-4 animate-spin" /> Menyiapkan surat…
                          </Button>
                        ) : suratUrl ? (
                          <>
                            <Button asChild variant="outline" size="sm">
                              <a href={suratUrl} download={`surat-pengembalian-${data.kodePeminjaman}.pdf`}>
                                <Download className="h-4 w-4" /> Unduh Surat
                              </a>
                            </Button>
                            <Button asChild variant="outline" size="sm">
                              <a href={suratUrl} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-4 w-4" /> Lihat
                              </a>
                            </Button>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">Surat belum tersedia.</p>
                        )}
                      </div>
                    </div>

                    {/* Langkah 2 — unggah surat yang sudah ditandatangani */}
                    <div className="space-y-2 border-t pt-3">
                      <p className="text-sm font-medium text-foreground">
                        2. Unggah surat yang sudah ditandatangani (PDF)
                      </p>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="application/pdf"
                        onChange={pilihFile}
                        className="hidden"
                      />
                      <Button variant="outline" size="sm" className="w-full" onClick={() => fileRef.current?.click()}>
                        <Upload className="h-4 w-4" /> {fileKembali ? 'Ganti Berkas' : 'Pilih Berkas PDF'}
                      </Button>
                      {fileKembali && (
                        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-2 text-xs text-green-800">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span className="truncate">{fileKembali.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Langkah 3 — ajukan pengembalian */}
                    <Button
                      className="w-full"
                      disabled={!fileKembali}
                      onClick={() => setDialogKembali(true)}
                    >
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
        deskripsi="Surat pernyataan pengembalian yang sudah ditandatangani akan diunggah dan permintaan dikirim ke admin untuk dikonfirmasi. Pastikan barang sudah siap dikembalikan."
        teksKonfirmasi="Ya, Ajukan Pengembalian"
        variantKonfirmasi="sukses"
        sedangProses={proses}
        onKonfirmasi={ajukanPengembalian}
      />

      {/* Dialog konfirmasi pembatalan draft */}
      <KonfirmasiDialog
        terbuka={dialogBatal}
        onUbahTerbuka={(o) => !o && setDialogBatal(false)}
        judul="Batalkan Pengajuan"
        deskripsi="Pengajuan draft ini akan dihapus dan barang yang dikunci akan dibebaskan. Tindakan ini tidak dapat dibatalkan."
        teksKonfirmasi="Ya, Batalkan"
        variantKonfirmasi="destructive"
        sedangProses={prosesBatal}
        onKonfirmasi={batalkanDraft}
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
