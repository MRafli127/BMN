// ============================================================
//  Admin — Detail Peminjaman.
//  Aksi: Setujui, Tolak, Stempel Dokumen, Serahkan, Pengembalian.
// ============================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  X,
  Stamp,
  PackageCheck,
  Undo2,
  Clock,
  FileText,
  Download,
  Loader2,
  ExternalLink,
  User as UserIcon,
  CalendarDays,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea, Label } from '@/components/ui/input';
import { KonfirmasiDialog } from '@/components/shared/KonfirmasiDialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { KepalaKartu, InfoIkon, LangkahItem } from '@/components/shared/KartuDetail';
import { TimelineStatus } from '@/components/peminjaman/TimelineStatus';
import { FolderBarangDipinjam } from '@/components/peminjaman/FolderBarangDipinjam';
import { TampilQR } from '@/components/qrcode/TampilQR';
import { notify } from '@/components/ui/toast';
import { peminjamanService } from '@/services/peminjaman.service';
import { ambilPesanError, formatTanggalLengkap, cn } from '@/lib/utils';
import { invalidasiCache } from '@/lib/cache';
import { hitungInfoPensiun } from '@/components/peminjaman/TabelPeminjaman';
import { STATUS_PEMINJAMAN } from '@/constants/status';
import { RUTE } from '@/constants/routes';
import type { Peminjaman } from '@/types/peminjaman.type';

type Aksi = 'setujui' | 'tolak' | 'serahkan' | 'kembalikan' | null;
type AksiDraft = 'serahDraft' | null;

export default function DetailPeminjamanAdminPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Peminjaman | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [aksi, setAksi] = useState<Aksi>(null);
  const [catatan, setCatatan] = useState('');
  const [proses, setProses] = useState(false);
  const [sedangStempel, setSedangStempel] = useState(false);
  // Upload surat untuk menyerahkan DRAFT via admin
  const [fileSuratDraft, setFileSuratDraft] = useState<File | null>(null);
  const [aksiDraft, setAksiDraft] = useState<AksiDraft>(null);
  const [prosesDraft, setProsesDraft] = useState(false);
  const fileSuratDraftRef = useRef<HTMLInputElement>(null);

  // --- Return letter (surat pengembalian) state ---
  const [suratUrl, setSuratUrl] = useState<string | null>(null);
  const [memuatSurat, setMemuatSurat] = useState(false);
  const [fileKembali, setFileKembali] = useState<File | null>(null);
  const fileKembaliRef = useRef<HTMLInputElement>(null);

  // Muat ulang data terkini dari server. Dipakai saat halaman pertama kali dimuat
  // dan saat perlu menyinkronkan state lokal dengan kondisi di server
  // (mis. setelah cache basi atau race condition antar tab).
  const muat = () => {
    setMemuat(true);
    peminjamanService
      .getById(id)
      .then((fresh) => {
        setData(fresh);
        return fresh;
      })
      .catch((e) => {
        notify.gagal(ambilPesanError(e, 'Gagal memuat detail.'));
        router.push(RUTE.adminPeminjaman);
      })
      .finally(() => setMemuat(false));
  };

  // Muat ulang data sebagai Promise — dipanggil dari jalankanAksi agar setiap
  // aksi dimulai dari data terkini di server (menjamin konsistensi status).
  const muatSegar = (): Promise<Peminjaman> =>
    peminjamanService.getById(id);

  useEffect(() => {
    if (id) muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Hasilkan Surat Pengembalian (PDF) saat admin memulai proses pengembalian
  // (kondisi: status aktif, belum ada surat dari peminjam, belum ada suratUrl).
  useEffect(() => {
    if (!data) return;
    const suratSudahAda = !!data.dokumenPengembalianUrl;
    if (suratSudahAda || suratUrl) return;
    if (!['DIPINJAM', 'TERLAMBAT'].includes(data.status)) return;
    setMemuatSurat(true);
    peminjamanService
      .getSuratPengembalian(data.id)
      .then(setSuratUrl)
      .catch((e) => notify.gagal(ambilPesanError(e, 'Gagal membuat surat pengembalian.')))
      .finally(() => setMemuatSurat(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const pilihFileKembali = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.type !== 'application/pdf') {
      notify.gagal('Berkas harus berformat PDF.');
      e.target.value = '';
      return;
    }
    setFileKembali(f);
  };

  const pilihFileSuratDraft = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.type !== 'application/pdf') {
      notify.gagal('Berkas harus berformat PDF.');
      e.target.value = '';
      return;
    }
    setFileSuratDraft(f);
  };

  // Submit penolakan DRAFT via admin (upload signed surat).
  const serahkanDraft = async () => {
    if (!fileSuratDraft) {
      notify.gagal('Unggah Surat Pernyataan yang sudah ditandatangani terlebih dahulu.');
      return;
    }
    setProsesDraft(true);
    try {
      const hasil = await peminjamanService.serahkanDraftAdmin(id, fileSuratDraft);
      setData(hasil);
      setAksiDraft(null);
      setFileSuratDraft(null);
      invalidasiCache('peminjaman');
      invalidasiCache('folder-peminjaman');
      invalidasiCache('barang');
      invalidasiCache('dashboard-admin');
      invalidasiCache('dashboard-peminjam');
      notify.suksess('Peminjaman berhasil diserahkan. Barang siap diambil peminjam.');
    } catch (err) {
      notify.gagal(ambilPesanError(err, 'Gagal menyerahkan peminjaman.'));
      const kode = (err as { response?: { status?: number } })?.response?.status;
      if (kode === 400 || kode === 404 || kode === 409) {
        invalidasiCache('peminjaman');
        invalidasiCache('folder-peminjaman');
        muat();
      }
    } finally {
      setProsesDraft(false);
    }
  };

  // Jalankan aksi sesuai pilihan. Selalu muat data terkini dari server
  // sebelum memvalidasi & mengirim request agar status lokal tidak basi.
  const jalankanAksi = async () => {
    if (!data || !aksi) return;

    // Ambil data terkini dari server agar status lokal tidak basi
    // (mencegah race condition saat halaman dibuka di tab lain).
    let segar: Peminjaman;
    try {
      segar = await muatSegar();
    } catch {
      notify.gagal('Gagal mengambil data terbaru. Silakan coba lagi.');
      return;
    }

    // Penolakan wajib disertai catatan
    if (aksi === 'tolak' && catatan.trim().length < 3) {
      notify.gagal('Catatan penolakan wajib diisi (minimal 3 karakter).');
      return;
    }
    // Pengembalian: jika admin yang mengunggah surat, file WAJIB dipilih.
    if (aksi === 'kembalikan' && !segar.dokumenPengembalianUrl && !fileKembali) {
      notify.gagal('Unggah surat pengembalian yang sudah ditandatangani (PDF) sebelum melanjutkan.');
      return;
    }
    setProses(true);
    try {
      let hasil: Peminjaman;
      if (aksi === 'setujui') hasil = await peminjamanService.setujui(segar.id, catatan);
      else if (aksi === 'tolak') hasil = await peminjamanService.tolak(segar.id, catatan);
      else if (aksi === 'serahkan') hasil = await peminjamanService.serahkan(segar.id);
      else hasil = await peminjamanService.kembalikan(segar.id, catatan, fileKembali ?? undefined);

      setData(hasil);
      setAksi(null);
      setCatatan('');
      setFileKembali(null);
      invalidasiCache('peminjaman');
      invalidasiCache('folder-peminjaman');
      notify.suksess('Tindakan berhasil dilakukan.');
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal melakukan tindakan.'));
      const kode = (error as { response?: { status?: number } })?.response?.status;
      if (kode === 400 || kode === 404 || kode === 409) {
        invalidasiCache('peminjaman');
        invalidasiCache('folder-peminjaman');
        setAksi(null);
        setCatatan('');
        muat();
      }
    } finally {
      setProses(false);
    }
  };

  const stempel = async () => {
    if (!data) return;
    setSedangStempel(true);
    try {
      const hasil = await peminjamanService.stempel(data.id);
      setData(hasil);
      invalidasiCache('peminjaman');
      invalidasiCache('folder-peminjaman');
      notify.suksess('Dokumen berhasil distempel & ditandatangani digital.');
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal menstempel dokumen.'));
      // Sinkronkan ulang bila kondisi di server sudah berubah (halaman basi).
      const kode = (error as { response?: { status?: number } })?.response?.status;
      if (kode === 400 || kode === 404 || kode === 409) {
        invalidasiCache('peminjaman');
        invalidasiCache('folder-peminjaman');
        muat();
      }
    } finally {
      setSedangStempel(false);
    }
  };

  if (memuat) return <LoadingSpinner layarPenuh />;
  if (!data) return null;

  const status = STATUS_PEMINJAMAN[data.status];
  const bisaStempel = !['MENUNGGU', 'DITOLAK'].includes(data.status) && !!data.dokumenUrl;
  const bisaKembalikan = ['DISETUJUI', 'DIPINJAM', 'TERLAMBAT'].includes(data.status);
  const tanpaTindakan = data.status === 'DIKEMBALIKAN' || data.status === 'DITOLAK';

  // Apakah peminjam sudah mengunggah surat pengembalian?
  const adaSuratPeminjam = !!data.dokumenPengembalianUrl;
  // Apakah admin sedang dalam proses: aktif (bisaKembalikan) DAN belum ada surat peminjam
  const adminLewatiSurat = bisaKembalikan && !adaSuratPeminjam;

  // Nama berkas unduhan surat pengembalian.
  const namaBerkas = (data.peminjam?.nama || data.kodePeminjaman)
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9._-]/g, '');
  const namaFilePeminjaman = `Surat-Peminjaman-Laptop_${namaBerkas}.pdf`;
  const namaFilePeminjamanStempel = `Surat-Peminjaman-Berstempel-Laptop_${namaBerkas}.pdf`;
  const namaFilePengembalian = `Surat-Pengembalian-Laptop_${namaBerkas}.pdf`;

  // Info pensiun peminjam
  const infoPensiun = hitungInfoPensiun(data.peminjam?.retirementDate);

  return (
    <div className="mx-auto max-w-5xl space-y-gutter">
      {/* Hero: identitas peminjaman + status terkini */}
      <section className="relative overflow-hidden rounded-2xl bg-brand-gradient text-white shadow-brand">
        {/* Orb dekoratif lembut sebagai latar */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-44 w-44 rounded-full bg-sky-400/20 blur-3xl" />

        <div className="relative space-y-5 p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={RUTE.adminPeminjaman}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white/90 backdrop-blur transition-colors hover:bg-white/20 hover:text-white"
            >
              <Icon name="arrow_back" className="text-[16px]" />
              Kembali ke Daftar
            </Link>
            {data.peminjam?.nama && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white/90 backdrop-blur">
                <Icon name="person" fill className="text-[15px]" />
                {data.peminjam.nama}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur sm:h-14 sm:w-14">
                <Icon name="receipt_long" fill className="text-[24px] sm:text-[28px]" />
              </div>
              <div>
                <p className="font-mono text-sm font-semibold text-white/80">{data.kodePeminjaman}</p>
                <h1 className="font-jakarta text-headline-lg-mobile text-white sm:text-headline-lg">
                  Detail Peminjaman
                </h1>
                <p className="text-sm text-white/80 sm:text-base">
                  Diajukan {formatTanggalLengkap(data.tanggalPengajuan)}
                </p>
              </div>
            </div>
            {/* Hero berlatar biru — paksa pill putih solid agar teks aksen status
                (mis. "Disetujui"/biru, "Dipinjam"/indigo) tak menyatu dengan latar. */}
            <Badge className={cn(status.kelas, 'border-transparent bg-white px-3.5 py-1.5 text-sm shadow-soft')}>{status.label}</Badge>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
        {/* Kolom utama */}
        <div className="space-y-gutter lg:col-span-2">
          {/* Info peminjam */}
          <Card className={cn(
            infoPensiun.isDanger && 'border-l-4 border-l-error',
            infoPensiun.isWarning && !infoPensiun.isDanger && 'border-l-4 border-l-warning'
          )}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserIcon className="h-4 w-4" /> Data Peminjam
                {infoPensiun.isDanger && (
                  <span className="ml-auto flex items-center gap-1 rounded-full bg-error/10 px-2 py-0.5 text-xs font-medium text-error">
                    <AlertTriangle className="h-3 w-3" /> Pensiun: {infoPensiun.label}
                  </span>
                )}
                {infoPensiun.isWarning && !infoPensiun.isDanger && (
                  <span className="ml-auto flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                    <AlertTriangle className="h-3 w-3" /> Pensiun: {infoPensiun.label}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Nama" nilai={data.peminjam?.nama} />
              <Info label="NIP" nilai={data.peminjam?.nip} />
              <Info label="Eselon IV" nilai={data.peminjam?.eselon4} />
              <Info label="Eselon III" nilai={data.peminjam?.eselon3} />
              {/* Info pensiun */}
              {infoPensiun.isWarning && (
                <div className={cn(
                  'col-span-2 rounded-lg p-3',
                  infoPensiun.isDanger ? 'bg-error/5' : 'bg-warning/5'
                )}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={cn('h-4 w-4 mt-0.5 shrink-0', infoPensiun.isDanger ? 'text-error' : 'text-warning')} />
                    <div>
                      <p className={cn('font-medium', infoPensiun.isDanger ? 'text-error' : 'text-warning')}>
                        {infoPensiun.isDanger ? 'Pensiun Mendesak!' : 'Pensiun Mendekati'}
                      </p>
                      <p className="mt-0.5 text-sm text-on-surface-variant">
                        {infoPensiun.sisaHari === 0
                          ? 'Pegawai sudah memasuki tanggal pensiun.'
                          : `Pegawai akan pensiun dalam ${infoPensiun.label} pada tanggal ${data.peminjam?.retirementDate ? formatTanggalLengkap(data.peminjam.retirementDate) : '-'}. `
                        }
                        {!infoPensiun.isDanger && 'Pastikan '}Pastikan barang dikembalikan sebelum tanggal pensiun.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Detail peminjaman */}
          <Card className="overflow-hidden border-primary/15">
            <KepalaKartu ikon="event_note" judul="Rincian Peminjaman" deskripsi="Tanggal & barang yang diajukan." />
            <div className="space-y-5 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoIkon ikon="today" label="Rencana Pinjam" nilai={formatTanggalLengkap(data.tanggalPinjamRencana)} />
                <InfoIkon
                  ikon="event_repeat"
                  label="Rencana Kembali"
                  nilai={data.tanggalKembaliRencana ? formatTanggalLengkap(data.tanggalKembaliRencana) : 'Tanpa batas waktu'}
                />
                {data.tanggalKembaliAktual && (
                  <InfoIkon
                    ikon="event_available"
                    label="Dikembalikan Pada"
                    nilai={formatTanggalLengkap(data.tanggalKembaliAktual)}
                  />
                )}
              </div>

              {data.alasanPeminjaman && (
                <InfoIkon ikon="notes" label="Alasan Peminjaman" nilai={data.alasanPeminjaman} />
              )}

              {/* Daftar barang — folder per unit, buka untuk QR identitas */}
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Icon name="package_2" className="text-[18px] text-primary" /> Barang Dipinjam
                </p>
                <p className="mb-2 mt-0.5 text-xs text-muted-foreground">
                  Klik tiap barang untuk melihat Label &amp; QR Identitas Barang.
                </p>
                <FolderBarangDipinjam detail={data.detail} />
              </div>

              {data.catatanAdmin && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 dark:bg-amber-950/20">
                  <Icon name="sticky_note_2" fill className="mt-0.5 shrink-0 text-[18px] text-amber-600" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-amber-900">Catatan Admin</p>
                    <p className="mt-0.5 text-sm text-amber-800">{data.catatanAdmin}</p>
                  </div>
                </div>
              )}

              {data.admin && (
                <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3.5 dark:bg-blue-950/20">
                  <Icon name="admin_panel_settings" fill className="mt-0.5 shrink-0 text-[18px] text-blue-600" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-blue-900">Disetujui/Ditolak Oleh</p>
                    <p className="mt-0.5 text-sm text-blue-800">
                      {data.admin.nama}
                      {data.admin.jabatan && <span className="text-blue-600"> — {data.admin.jabatan}</span>}
                    </p>
                  </div>
                </div>
              )}

              {data.catatanPengembalian && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 dark:bg-amber-950/20">
                  <Icon name="visibility_off" fill className="mt-0.5 shrink-0 text-[18px] text-amber-600" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-amber-900">Catatan Pengembalian (internal)</p>
                    <p className="mt-0.5 text-sm text-amber-800">{data.catatanPengembalian}</p>
                  </div>
                </div>
              )}

              {data.status === 'DIKEMBALIKAN' && data.pengembalianAdmin && (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 dark:bg-emerald-950/20">
                  <Icon name="how_to_reg" fill className="mt-0.5 shrink-0 text-[18px] text-emerald-600" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-emerald-900">Dikembalikan Oleh</p>
                    <p className="mt-0.5 text-sm text-emerald-800">
                      {data.pengembalianAdmin.nama}
                      {data.pengembalianAdmin.jabatan && <span className="text-emerald-600"> — {data.pengembalianAdmin.jabatan}</span>}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Surat Pernyataan */}
          <Card className="overflow-hidden border-primary/15">
            <KepalaKartu
              ikon="description"
              judul="Surat Pernyataan"
              deskripsi="Surat pengajuan yang telah ditandatangani peminjam."
              aksi={
                data.dokumenUrl && (
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                      <a href={data.dokumenUrl} target="_blank" rel="noreferrer" aria-label="Buka surat di tab baru">
                        <Icon name="open_in_new" className="text-[18px]" />
                      </a>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <a href={data.dokumenUrl} download={namaFilePeminjaman}>
                        <Icon name="download" className="text-[18px]" /> Unduh
                      </a>
                    </Button>
                    {data.dokumenStempelUrl && (
                      <Button asChild variant="sukses" size="sm">
                        <a href={data.dokumenStempelUrl} download={namaFilePeminjamanStempel}>
                          <Icon name="verified" fill className="text-[18px]" /> Surat Berstempel
                        </a>
                      </Button>
                    )}
                  </div>
                )
              }
            />
            <div className="p-5">
              {data.dokumenUrl ? (
                <iframe
                  src={data.dokumenUrl}
                  title="Surat Pernyataan Peminjaman"
                  className="h-[520px] w-full rounded-xl border border-primary/10"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <Icon name="draft" className="text-[24px]" />
                  </div>
                  <p className="text-sm text-muted-foreground">Surat pernyataan belum tersedia.</p>
                </div>
              )}
            </div>
          </Card>

          {/* Surat Pernyataan Pengembalian (diunggah peminjam) */}
          {data.dokumenPengembalianUrl && (
            <Card className="overflow-hidden border-primary/15">
              <KepalaKartu
                ikon="assignment_return"
                judul="Surat Pengembalian"
                deskripsi="Ditandatangani fisik oleh peminjam — periksa sebelum konfirmasi."
                aksi={
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                      <a
                        href={data.dokumenPengembalianUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Buka surat pengembalian di tab baru"
                      >
                        <Icon name="open_in_new" className="text-[18px]" />
                      </a>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <a href={data.dokumenPengembalianUrl} download={namaFilePengembalian}>
                        <Icon name="download" className="text-[18px]" /> Unduh
                      </a>
                    </Button>
                  </div>
                }
              />
              <div className="p-5">
                <iframe
                  src={data.dokumenPengembalianUrl}
                  title="Surat Pernyataan Pengembalian"
                  className="h-[520px] w-full rounded-xl border border-primary/10"
                />
              </div>
            </Card>
          )}

          {/* Upload Surat untuk DRAFT via admin */}
          {data.status === 'DRAFT' && (
            <Card className="overflow-hidden border-primary/15">
              <KepalaKartu
                ikon="upload_file"
                judul="Serahkan Draf"
                deskripsi="Unggah Surat Pernyataan yang sudah ditandatangani untuk menyerahkan barang."
              />
              <div className="space-y-4 p-5">
                <div className="rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] p-4">
                  <input
                    ref={fileSuratDraftRef}
                    type="file"
                    accept="application/pdf"
                    onChange={pilihFileSuratDraft}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileSuratDraftRef.current?.click()}
                    >
                      <Icon name="upload_file" className="text-[18px]" />
                      {fileSuratDraft ? 'Ganti Berkas' : 'Pilih Berkas PDF'}
                    </Button>
                    {fileSuratDraft && (
                      <div className="flex w-full items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/20">
                        <Icon name="check_circle" fill className="shrink-0 text-[18px] text-emerald-600" />
                        <span className="min-w-0 flex-1 truncate font-medium">{fileSuratDraft.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  onClick={serahkanDraft}
                  disabled={!fileSuratDraft || prosesDraft}
                  size="lg"
                  className="w-full shadow-brand transition-all hover:-translate-y-0.5 hover:shadow-elevated"
                >
                  {prosesDraft ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Icon name="send" className="text-[18px]" />
                  )}
                  {prosesDraft ? 'Mohon Tunggu...' : 'Serahkan Sekarang'}
                </Button>

                <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                  <Icon name="info" className="mt-0.5 shrink-0 text-[14px]" />
                  Setelah diserahkan, stok barang akan dikurangi dan status berubah menjadi "Sedang Dipinjam".
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar aksi */}
        <div className="space-y-gutter">
          {/* Tindakan */}
          <Card className="overflow-hidden border-primary/15">
            <KepalaKartu ikon="gavel" judul="Tindakan" deskripsi="Aksi sesuai status pengajuan." />
            <div className="space-y-2.5 p-5">
              {data.status === 'MENUNGGU' && (
                <>
                  <Button
                    variant="sukses"
                    className="group relative w-full overflow-hidden shadow-brand transition-all hover:-translate-y-0.5 hover:shadow-elevated disabled:opacity-60"
                    disabled={proses}
                    onClick={() => setAksi('setujui')}
                  >
                    {/* Sapuan cahaya yang meluncur saat kursor menyorot */}
                    <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
                    <span className="relative z-10 flex items-center gap-2">
                      {proses ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Icon name="check_circle" fill className="text-[18px]" />
                      )}{' '}
                      Setujui (ACC)
                    </span>
                  </Button>
                  <Button variant="destructive" className="w-full disabled:opacity-60" disabled={proses} onClick={() => setAksi('tolak')}>
                    <Icon name="cancel" fill className="text-[18px]" /> Tolak
                  </Button>
                </>
              )}

              {data.status === 'DISETUJUI' && (
                <Button
                  className="group relative w-full overflow-hidden shadow-brand transition-all hover:-translate-y-0.5 hover:shadow-elevated disabled:opacity-60"
                  disabled={proses}
                  onClick={() => setAksi('serahkan')}
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
                  <span className="relative z-10 flex items-center gap-2">
                    {proses ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icon name="handshake" fill className="text-[18px]" />
                    )}{' '}
                    Tandai Barang Diserahkan
                  </span>
                </Button>
              )}

              {bisaStempel && (
                <Button variant="outline" className="w-full disabled:opacity-60" disabled={proses || sedangStempel} onClick={stempel}>
                  {sedangStempel ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon name="approval" fill className="text-[18px]" />
                  )}
                  {data.dokumenStempelUrl ? 'Stempel Ulang Dokumen' : 'Stempel Dokumen'}
                </Button>
              )}

              {bisaKembalikan && data.tanggalPermintaanKembali && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-800 dark:bg-amber-950/20">
                  <Icon name="hourglass_top" fill className="mt-0.5 shrink-0 text-[18px] text-amber-600" />
                  <span>
                    Peminjam mengajukan pengembalian pada {formatTanggalLengkap(data.tanggalPermintaanKembali)}.
                    Mohon konfirmasi penerimaan barang.
                  </span>
                </div>
              )}

              {bisaKembalikan && (
                <Button
                  variant="secondary"
                  className="group relative w-full overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-card disabled:opacity-60"
                  disabled={proses}
                  onClick={() => setAksi('kembalikan')}
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
                  <span className="relative z-10 flex items-center gap-2">
                    {proses ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icon name="assignment_return" fill className="text-[18px]" />
                    )}{' '}
                    Konfirmasi Pengembalian
                  </span>
                </Button>
              )}

              {tanpaTindakan && (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <Icon name="task_alt" className="text-[22px]" />
                  </div>
                  <p className="text-sm text-muted-foreground">Tidak ada tindakan yang tersedia.</p>
                </div>
              )}
            </div>
          </Card>

          {/* Pengembalian Barang oleh Admin (apabila peminjam belum mengunggah surat) */}
          {adminLewatiSurat && (
            <Card className="overflow-hidden border-primary/15">
              <KepalaKartu
                ikon="assignment_return"
                judul="Pengembalian Barang"
                deskripsi="Peminjam belum mengunggah surat. Ikuti langkah berikut."
              />
              <div className="p-5">
                <ol>
                  <LangkahItem nomor={1} judul="Unduh & cetak Surat Pengembalian">
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Cetak surat, lalu minta tanda tangan <strong>&quot;Yang menerima BMN&quot;</strong> secara fisik.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {memuatSurat ? (
                        <Button variant="outline" size="sm" disabled>
                          <Loader2 className="h-4 w-4 animate-spin" /> Menyiapkan surat…
                        </Button>
                      ) : suratUrl ? (
                        <>
                          <Button asChild variant="outline" size="sm">
                            <a href={suratUrl} download={namaFilePengembalian}>
                              <Icon name="download" className="text-[18px]" /> Unduh Surat
                            </a>
                          </Button>
                          <Button asChild variant="outline" size="sm">
                            <a href={suratUrl} target="_blank" rel="noreferrer">
                              <Icon name="open_in_new" className="text-[18px]" /> Lihat
                            </a>
                          </Button>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">Surat belum tersedia.</p>
                      )}
                    </div>
                  </LangkahItem>

                  <LangkahItem nomor={2} judul="Unggah surat bertanda tangan (PDF)" selesai={!!fileKembali} terakhir>
                    <input
                      ref={fileKembaliRef}
                      type="file"
                      accept="application/pdf"
                      onChange={pilihFileKembali}
                      className="hidden"
                    />
                    <div className="mt-2 space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => fileKembaliRef.current?.click()}
                      >
                        <Icon name="upload_file" className="text-[18px]" />
                        {fileKembali ? 'Ganti Berkas' : 'Pilih Berkas PDF'}
                      </Button>
                      {fileKembali && (
                        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/20">
                          <Icon name="check_circle" fill className="shrink-0 text-[18px] text-emerald-600" />
                          <span className="min-w-0 flex-1 truncate font-medium">{fileKembali.name}</span>
                        </div>
                      )}
                    </div>
                  </LangkahItem>
                </ol>

                <div className="mt-5 border-t border-primary/10 pt-4">
                  <Button
                    className="group relative w-full overflow-hidden shadow-brand transition-all hover:-translate-y-0.5 hover:shadow-elevated"
                    disabled={!fileKembali}
                    onClick={() => setAksi('kembalikan')}
                  >
                    <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
                    <span className="relative z-10 flex items-center gap-2">
                      <Icon name="assignment_return" fill className="text-[18px]" /> Kembalikan Barang
                    </span>
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Timeline */}
          <Card className="overflow-hidden border-primary/15">
            <KepalaKartu ikon="timeline" judul="Status Peminjaman" deskripsi="Perjalanan pengajuan." />
            <div className="p-5">
              <TimelineStatus peminjaman={data} />
            </div>
          </Card>

          {/* QR Code */}
          {data.qrCodeUrl && (
            <Card className="overflow-hidden border-primary/15">
              <KepalaKartu ikon="qr_code_2" judul="QR Code" deskripsi="Identitas peminjaman ini." />
              <div className="p-5">
                <TampilQR
                  qrCodeUrl={data.qrCodeUrl}
                  kodePeminjaman={data.kodePeminjaman}
                  namaPeminjam={data.peminjam?.nama}
                />
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog konfirmasi aksi */}
      <KonfirmasiDialog
        terbuka={aksi !== null}
        onUbahTerbuka={(o) => {
          if (!o) {
            setAksi(null);
            setCatatan('');
            setFileKembali(null);
          }
        }}
        judul={
          aksi === 'setujui'
            ? 'Setujui Peminjaman'
            : aksi === 'tolak'
            ? 'Tolak Peminjaman'
            : aksi === 'serahkan'
            ? 'Serahkan Barang'
            : 'Konfirmasi Pengembalian'
        }
        deskripsi={
          aksi === 'setujui'
            ? 'Stok barang akan berkurang otomatis dan QR Code akan dibuat.'
            : aksi === 'tolak'
            ? 'Mohon isi alasan penolakan. Peminjam akan melihat catatan ini.'
            : aksi === 'serahkan'
            ? 'Tandai bahwa barang telah diserahkan kepada peminjam.'
            : 'Stok barang akan dikembalikan otomatis ke sistem.'
        }
        teksKonfirmasi={aksi === 'tolak' ? 'Ya, Tolak' : 'Ya, Lanjutkan'}
        variantKonfirmasi={aksi === 'tolak' ? 'destructive' : 'sukses'}
        disabledKonfirmasi={aksi === 'kembalikan' && !data.dokumenPengembalianUrl && !fileKembali}
        sedangProses={proses}
        onKonfirmasi={jalankanAksi}
      >
        {(aksi === 'setujui' || aksi === 'tolak' || aksi === 'kembalikan') && (
          <div>
            <Label htmlFor="catatan">
              Catatan {aksi === 'tolak' ? '(wajib)' : '(opsional)'}
            </Label>
            <Textarea
              id="catatan"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder={aksi === 'tolak' ? 'Alasan penolakan...' : 'Catatan tambahan...'}
              className="mt-1"
            />
            {aksi === 'kembalikan' && !data.dokumenPengembalianUrl && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-300">
                  <Icon name="check_circle" fill className="shrink-0 text-[18px] text-emerald-600" />
                  <span className="font-medium">
                    {fileKembali ? `Surat terpilih: ${fileKembali.name}` : 'Belum ada surat yang diunggah.'}
                  </span>
                </div>
                {fileKembali && (
                  <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                    Surat pengembalian bertanda tangan akan diunggah saat konfirmasi.
                  </p>
                )}
              </div>
            )}
            {aksi === 'kembalikan' && data.dokumenPengembalianUrl && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Surat pengembalian dari peminjam sudah tersimpan dan akan digunakan.
              </p>
            )}
          </div>
        )}
      </KonfirmasiDialog>
    </div>
  );
}

// Komponen Info sederhana
function Info({ label, nilai }: { label: string; nilai?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="font-medium">{nilai || '-'}</p>
    </div>
  );
}
