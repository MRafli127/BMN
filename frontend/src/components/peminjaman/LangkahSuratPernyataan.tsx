// ============================================================
//  Langkah Surat Pernyataan — "Formulir Pengajuan Peminjaman".
//   Tahap akhir & terkunci (mirip halaman pembayaran toko online):
//   peminjam tidak bisa kembali ke langkah sebelumnya, hanya fokus
//   mengunduh surat, menandatangani, lalu mengunggahnya kembali.
//   Layout: preview surat di area utama + sidebar unggah (sticky).
// ============================================================

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { notify } from '@/components/ui/toast';
import { peminjamanService, type DetailPeminjamanError } from '@/services/peminjaman.service';
import { DialogPeminjamanAktif } from '@/components/keranjang/DialogPeminjamanAktif';
import { ambilPesanError, cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useDebounceSubmit } from '@/hooks/useDebounceSubmit';
import { RUTE } from '@/constants/routes';
import type { ItemPengajuan, Peminjaman } from '@/types/peminjaman.type';

interface ItemDenganNama extends ItemPengajuan {
  namaBarang?: string;
}

interface Props {
  items: ItemPengajuan[] | ItemDenganNama[];
  pangkatGolongan?: string;
  tanggalPinjamRencana?: string;
  tanggalKembaliRencana?: string;
  onSelesai: (peminjaman: Peminjaman) => void;
  /** Tampilkan hero gradien + indikator langkah (dipakai alur keranjang,
   *  saat komponen ini menjadi konten utama halaman). */
  hero?: boolean;
  /** Label langkah sebelumnya pada indikator langkah di hero. */
  langkahSebelumnya?: string;
  /** Callback untuk tombol kembali. Jika tidak diberikan, default ke /peminjam/keranjang. */
  onKembali?: () => void;
}

/** Baris data peminjam dengan ikon kecil (tampil pada kartu Data Peminjam). */
function FieldPeminjam({ ikon, label, nilai }: { ikon: string; label: string; nilai: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary/70">
        <Icon name={ikon} className="text-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="break-words font-semibold text-foreground">{nilai}</p>
      </div>
    </div>
  );
}

export function LangkahSuratPernyataan({
  items,
  pangkatGolongan,
  tanggalPinjamRencana,
  tanggalKembaliRencana,
  onSelesai,
  hero = false,
  langkahSebelumnya = 'Pilih Barang',
  onKembali,
}: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [suratUrl, setSuratUrl] = useState<string | null>(null);
  const [memuatSurat, setMemuatSurat] = useState(false);
  const [gagalSurat, setGagalSurat] = useState(false);
  const [sedangKirim, setSedangKirim] = useState(false);
  const [berkas, setBerkas] = useState<File | null>(null);
  // Track apakah sedang menampilkan error date
  const [errorTanggal, setErrorTanggal] = useState<string | null>(null);
  // Track retry attempt untuk mencegah infinite loop
  const retryCountRef = useRef(0);
  // Flag untuk menandai sedang navigasi internal (bukan back button browser)
  const isNavigatingRef = useRef(false);

  // State untuk dialog info peminjaman aktif
  const [dialogAktifTerbuka, setDialogAktifTerbuka] = useState(false);
  const [daftarPeminjamanAktif, setDaftarPeminjamanAktif] = useState<DetailPeminjamanError[]>([]);
  const [kodeErrorAktif, setKodeErrorAktif] = useState<string>('');
  const [pesanErrorAktif, setPesanErrorAktif] = useState<string>('');

  // Handler untuk tombol kembali
  const handleKembali = () => {
    // Flag untuk mencegah popstate listener menampilkan notification
    isNavigatingRef.current = true;
    // Delay kecil untuk memastikan flag set sebelum popstate event
    setTimeout(() => {
      if (onKembali) {
        onKembali();
      } else {
        router.push(RUTE.peminjamKeranjang);
      }
    }, 0);
  };

  // Anti-spam: cegah submit berkali-kali dalam 2 detik
  const { callback: ajukan, sedangDiblokir: diblokirSpam } = useDebounceSubmit(
    async () => {
      if (!berkas) {
        notify.gagal('Unggah surat pernyataan yang sudah ditandatangani terlebih dahulu.');
        return;
      }
      setSedangKirim(true);
      try {
        // Trim barangId sebelum dikirim agar whitespace tersembunyi (mis. dari
        // salin-tempel dari spreadsheet) tidak bikin lookup DB gagal. Service
        // layer backend juga .trim() via validator, tapi trim di sini
        // menghindari round-trip yang sia-sia.
        const payload = {
          items: items.map((it) => ({ ...it, barangId: it.barangId.trim() })),
          pangkatGolongan,
          tanggalPinjamRencana,
          tanggalKembaliRencana,
          dokumen: berkas,
        };
        const p = await peminjamanService.create(payload);
        onSelesai(p);
      } catch (error) {
        // Cek apakah ini error peminjaman aktif (dengan detail)
        const err = error as { response?: { data?: { pesan?: string; errors?: { kodeError?: string; detailPeminjaman?: DetailPeminjamanError[] } } }; message?: string };
        const errorData = err?.response?.data;
        const kodeError = errorData?.errors?.kodeError;
        const detailPeminjaman = errorData?.errors?.detailPeminjaman;

        if ((kodeError === 'MAX_PEMINJAMAN_AKTIF' || kodeError === 'BARANG_SUDAH_ADAKTIF' || kodeError === 'BARANG_SEDANG_DIPEGANG_LAIN') && detailPeminjaman) {
          // Tampilkan dialog info peminjaman aktif
          setKodeErrorAktif(kodeError);
          setPesanErrorAktif(errorData.pesan || 'Tidak dapat membuat pengajuan.');
          setDaftarPeminjamanAktif(Array.isArray(detailPeminjaman) ? detailPeminjaman : [detailPeminjaman]);
          setDialogAktifTerbuka(true);
          return;
        }

        notify.gagal(ambilPesanError(error, 'Gagal mengirim pengajuan.'));
      } finally {
        setSedangKirim(false);
      }
    },
    { jeda: 2000 }
  );

  // Simpan pengajuan ke Riwayat tanpa mengunggah surat sekarang (status DRAFT).
  // Surat dapat diunduh & diunggah menyusul dari halaman Riwayat.
  const [sedangSimpanDraft, setSedangSimpanDraft] = useState(false);
  const simpanDraft = async () => {
    setSedangSimpanDraft(true);
    try {
      // Trim barangId sebelum dikirim (lihat komentar di `kirim()` di atas).
      const payload = {
        items: items.map((it) => ({ ...it, barangId: it.barangId.trim() })),
        pangkatGolongan,
        tanggalPinjamRencana,
        tanggalKembaliRencana,
        draft: true,
      };
      const p = await peminjamanService.create(payload);
      onSelesai(p);
    } catch (error) {
      // Cek apakah ini error peminjaman aktif (dengan detail)
      const err = error as { response?: { data?: { pesan?: string; errors?: { kodeError?: string; detailPeminjaman?: DetailPeminjamanError[] } } }; message?: string };
      const errorData = err?.response?.data;
      const kodeError = errorData?.errors?.kodeError;
      const detailPeminjaman = errorData?.errors?.detailPeminjaman;

      if ((kodeError === 'MAX_PEMINJAMAN_AKTIF' || kodeError === 'BARANG_SUDAH_ADAKTIF' || kodeError === 'BARANG_SEDANG_DIPEGANG_LAIN') && detailPeminjaman) {
        // Tampilkan dialog info peminjaman aktif
        setKodeErrorAktif(kodeError);
        setPesanErrorAktif(errorData.pesan || 'Tidak dapat menyimpan draft.');
        setDaftarPeminjamanAktif(Array.isArray(detailPeminjaman) ? detailPeminjaman : [detailPeminjaman]);
        setDialogAktifTerbuka(true);
        return;
      }

      notify.gagal(ambilPesanError(error, 'Gagal menyimpan pengajuan.'));
    } finally {
      setSedangSimpanDraft(false);
    }
  };

  // Generate surat preview (dengan debounce agar tidak spam saat props berubah)
  // OPTIMASI: retry dengan backoff eksponensial, logging error detail
  const buatSurat = useCallback(() => {
    if (items.length === 0) return;
    setMemuatSurat(true);
    setGagalSurat(false);
    setErrorTanggal(null);

    console.log('[Surat] Generating preview for items:', items.length);

    // Trim barangId sebelum dikirim untuk hindari whitespace tersembunyi.
    const previewPayload = {
      items: items.map((it) => ({ ...it, barangId: it.barangId.trim() })),
      pangkatGolongan,
      tanggalPinjamRencana,
      tanggalKembaliRencana,
    };
    peminjamanService
      .previewSurat(previewPayload)
      .then((url) => {
        console.log('[Surat] Preview generated successfully');
        setSuratUrl(url);
        retryCountRef.current = 0; // Reset retry counter on success
      })
      .catch((err) => {
        // Log full error untuk debugging
        console.error('[Surat] Preview failed:', {
          status: err?.response?.status,
          message: err?.response?.data?.message || err?.message,
          data: err?.response?.data,
        });

        const msg = err?.response?.data?.message || err?.message || '';
        // Tangkap error tanggal dari backend
        if (msg.toLowerCase().includes('tanggal')) {
          setErrorTanggal(msg);
          setGagalSurat(true);
          notify.gagal(msg);
          retryCountRef.current = 999; // Stop retry for date errors
        } else if (msg.toLowerCase().includes('tidak ditemukan') || msg.toLowerCase().includes('barang')) {
          // Error data tidak valid
          setErrorTanggal(msg);
          setGagalSurat(true);
          notify.gagal(msg);
          retryCountRef.current = 999; // Stop retry for data errors
        } else if (err?.response?.status === 401) {
          // Sesi berakhir - redirect ke login
          notify.gagal('Sesi Anda telah berakhir. Mengalihkan ke halaman login...');
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
        } else if (err?.response?.status === 404) {
          // 404 bisa berarti barang tidak ditemukan atau user tidak valid
          setErrorTanggal('Data tidak ditemukan. Silakan刷新 halaman dan coba lagi.');
          setGagalSurat(true);
          notify.gagal('Data tidak ditemukan. Silakan pilih barang ulang.');
        } else {
          console.warn('[Surat] Preview gagal dengan error tidak terduga:', msg);
          setGagalSurat(true);
          // Biarkan retry ber chance untuk coba lagi
        }
      })
      .finally(() => {
        setMemuatSurat(false);
      });
  }, [items, pangkatGolongan, tanggalPinjamRencana, tanggalKembaliRencana]);

  // Retry on failure after a short delay (max 3 retries dengan backoff)
  useEffect(() => {
    if (gagalSurat && !errorTanggal && !memuatSurat && retryCountRef.current < 3) {
      retryCountRef.current += 1;
      console.log(`[Surat] Retrying preview... (attempt ${retryCountRef.current})`);
      // Backoff: 2 detik, 4 detik, 8 detik
      const delay = Math.min(2000 * Math.pow(2, retryCountRef.current - 1), 8000);
      const timer = setTimeout(() => {
        buatSurat();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [gagalSurat, errorTanggal, memuatSurat, buatSurat]);

  useEffect(() => {
    const timer = setTimeout(buatSurat, 300);
    return () => clearTimeout(timer);
  }, [buatSurat]);

  // Kunci tahap ini: cegah tombol "kembali" browser & peringatkan bila
  // peminjam mencoba menutup/segarkan halaman (mirip halaman pembayaran).
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const cegahKembali = () => {
      // Jika sedang navigasi internal (dari tombol kembali kami), abaikan
      if (isNavigatingRef.current) {
        isNavigatingRef.current = false;
        return;
      }
      window.history.pushState(null, '', window.location.href);
      notify.info(
        'Anda berada di tahap akhir pengajuan. Selesaikan unggah surat untuk melanjutkan.'
      );
    };
    const cegahTutup = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('popstate', cegahKembali);
    window.addEventListener('beforeunload', cegahTutup);
    return () => {
      window.removeEventListener('popstate', cegahKembali);
      window.removeEventListener('beforeunload', cegahTutup);
    };
  }, []);

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
    <div className="space-y-gutter">
      {/* Header — tanpa tombol kembali (tahap terkunci) */}
      {hero ? (
        <section className="relative overflow-hidden rounded-2xl bg-brand-gradient text-white shadow-brand">
          {/* Orb dekoratif lembut sebagai latar */}
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-1/3 h-44 w-44 rounded-full bg-sky-400/20 blur-3xl" />

          <div className="relative space-y-5 p-5 sm:p-7">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white/90 backdrop-blur">
              <Icon name="lock" fill className="text-[15px]" />
              Tahap akhir — isi pinjaman terkunci
            </span>

            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur sm:h-14 sm:w-14">
                <Icon name="history_edu" fill className="text-[24px] sm:text-[28px]" />
              </div>
              <div>
                <h1 className="font-jakarta text-headline-lg-mobile text-white sm:text-headline-lg">
                  Formulir Pengajuan Peminjaman
                </h1>
                <p className="text-sm text-white/80 sm:text-base">
                  Unduh surat pernyataan, tanda tangani, lalu unggah kembali untuk mengajukan peminjaman.
                </p>
              </div>
            </div>

            {/* Indikator langkah proses pengajuan (langkah 1 selesai) */}
            <ol className="flex flex-wrap items-center gap-2 text-sm">
              <li className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 font-medium text-white/75">
                <Icon name="check_circle" fill className="text-[16px] text-emerald-300" />
                {langkahSebelumnya}
              </li>
              <li aria-hidden className="h-px w-6 shrink-0 bg-white/40 sm:w-8" />
              <li className="flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 font-semibold text-primary shadow-soft">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                  2
                </span>
                Surat Pernyataan
              </li>
            </ol>
          </div>
        </section>
      ) : (
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon name="history_edu" fill className="text-[24px]" />
          </span>
          <div>
            <h2 className="font-jakarta text-xl font-bold text-foreground">Formulir Pengajuan Peminjaman</h2>
            <p className="text-sm text-muted-foreground">
              Unduh surat pernyataan, tanda tangani, lalu unggah kembali untuk mengajukan peminjaman.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
        {/* Area utama: Data Peminjam + Preview Surat */}
        <div className="space-y-gutter lg:col-span-2">
          {/* Data Peminjam */}
          <Card className="overflow-hidden border-primary/15">
            <div className="flex items-center gap-3 border-b border-primary/10 bg-gradient-to-r from-primary/[0.07] to-transparent px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon name="person" fill className="text-[20px]" />
              </div>
              <div>
                <h2 className="font-jakarta text-base font-bold leading-tight text-primary">Data Peminjam</h2>
                <p className="text-xs text-muted-foreground">Tercantum otomatis pada surat pernyataan.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <FieldPeminjam ikon="person" label="Nama" nilai={user?.nama ?? '-'} />
              <FieldPeminjam ikon="fingerprint" label="NIP" nilai={user?.nip ?? '-'} />
              <FieldPeminjam ikon="military_tech" label="Pangkat/Gol." nilai={pangkatGolongan || '-'} />
              <FieldPeminjam ikon="corporate_fare" label="Unit Kerja" nilai={user?.unitKerja ?? user?.eselon3 ?? '-'} />
            </div>
          </Card>

          {/* Preview Surat Pernyataan */}
          <Card className="overflow-hidden border-primary/15">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/10 bg-gradient-to-r from-primary/[0.07] to-transparent px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon name="description" fill className="text-[20px]" />
                </div>
                <div>
                  <h2 className="font-jakarta text-base font-bold leading-tight text-primary">
                    Preview Surat Pernyataan
                  </h2>
                  <p className="text-xs text-muted-foreground">Periksa isi surat sebelum diunduh.</p>
                </div>
              </div>
              {suratUrl && (
                <div className="flex shrink-0 gap-2">
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <a href={suratUrl} target="_blank" rel="noreferrer" aria-label="Buka surat di tab baru">
                      <Icon name="open_in_new" className="text-[18px]" />
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href={suratUrl} download="surat-pernyataan-peminjaman.pdf">
                      <Icon name="download" className="text-[18px]" /> Unduh
                    </a>
                  </Button>
                </div>
              )}
            </div>
            <div>
              {memuatSurat ? (
                <div className="flex h-[500px] flex-col items-center justify-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                  <p className="text-sm text-muted-foreground">Menyiapkan surat pernyataan…</p>
                </div>
              ) : gagalSurat ? (
                <div className="flex h-[300px] flex-col items-center justify-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500 dark:bg-red-950/20">
                    <Icon name="error" fill className="text-[24px]" />
                  </div>
                  <div className="text-center">
                    {errorTanggal ? (
                      <>
                        <p className="font-semibold text-red-600">{errorTanggal}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Kembali ke Keranjang untuk mengubah tanggal.</p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold">Gagal menyiapkan surat pernyataan.</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Coba lagi dalam beberapa detik atau klik tombol di bawah.
                        </p>
                      </>
                    )}
                  </div>
                  {errorTanggal ? (
                    <Button variant="outline" size="sm" onClick={handleKembali}>
                      <ArrowLeft className="h-4 w-4" /> Kembali ke Keranjang
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={buatSurat}>
                        <Icon name="refresh" className="h-4 w-4" /> Coba Lagi
                      </Button>
                      {hero && (
                        <Button variant="outline" size="sm" onClick={handleKembali}>
                          <ArrowLeft className="h-4 w-4" /> Kembali
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ) : suratUrl ? (
                <iframe
                  src={suratUrl}
                  title="Surat Pernyataan Peminjaman"
                  className="h-[700px] w-full border-0"
                />
              ) : null}
            </div>
          </Card>
        </div>

        {/* Sidebar unggah surat (sticky) */}
        <aside className="lg:col-span-1">
          <Card className="overflow-hidden border-primary/15 lg:sticky lg:top-4">
            <div className="flex items-center gap-3 border-b border-primary/10 bg-gradient-to-r from-primary/[0.07] to-transparent px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon name="draw" fill className="text-[20px]" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-jakarta text-base font-bold leading-tight text-primary">
                  Tanda Tangan &amp; Unggah
                </h2>
                <p className="text-xs text-muted-foreground">Selesaikan 3 langkah berikut.</p>
              </div>
              <span className="shrink-0 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white shadow-soft">
                WAJIB
              </span>
            </div>

            <div className="p-5">
              <ol>
                {/* Langkah 1 — unduh surat */}
                <li className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary ring-1 ring-primary/20">
                      1
                    </span>
                    <span aria-hidden className="mt-1 w-px flex-1 bg-primary/15" />
                  </div>
                  <div className="min-w-0 flex-1 pb-5">
                    <p className="text-sm font-semibold text-foreground">Unduh Surat Pernyataan</p>
                    <div className="mt-2">
                      {memuatSurat ? (
                        <Button variant="outline" size="sm" className="w-full" disabled>
                          <Loader2 className="h-4 w-4 animate-spin" /> Menyiapkan surat…
                        </Button>
                      ) : suratUrl ? (
                        <Button asChild variant="outline" size="sm" className="w-full">
                          <a href={suratUrl} download="surat-pernyataan-peminjaman.pdf">
                            <Icon name="download" className="text-[18px]" /> Unduh Surat
                          </a>
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground">Surat belum tersedia.</p>
                      )}
                    </div>
                  </div>
                </li>

                {/* Langkah 2 — tanda tangani */}
                <li className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary ring-1 ring-primary/20">
                      2
                    </span>
                    <span aria-hidden className="mt-1 w-px flex-1 bg-primary/15" />
                  </div>
                  <div className="min-w-0 flex-1 pb-5">
                    <p className="text-sm font-semibold text-foreground">Tanda tangani surat</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Bubuhkan tanda tangan Anda (manual/elektronik) pada surat sebagai persetujuan peminjaman.
                    </p>
                  </div>
                </li>

                {/* Langkah 3 — unggah surat yang sudah ditandatangani */}
                <li className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 transition-colors',
                        berkas
                          ? 'bg-emerald-100 text-emerald-700 ring-emerald-300 dark:bg-emerald-950/30'
                          : 'bg-primary/10 text-primary ring-primary/20'
                      )}
                    >
                      {berkas ? <Icon name="check" className="text-[16px]" /> : '3'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">Unggah kembali (PDF)</p>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="application/pdf"
                      onChange={pilihBerkas}
                      className="hidden"
                    />
                    <div className="mt-2 space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => fileRef.current?.click()}
                      >
                        <Icon name="upload_file" className="text-[18px]" />
                        {berkas ? 'Ganti Berkas' : 'Pilih Berkas PDF'}
                      </Button>
                      {berkas && (
                        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/20">
                          <Icon name="check_circle" fill className="shrink-0 text-[18px] text-emerald-600" />
                          <span className="min-w-0 flex-1 truncate font-medium">{berkas.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              </ol>

              {/* Aksi kirim */}
              <div className="mt-5 space-y-2.5 border-t border-primary/10 pt-4">
                <Button
                  onClick={ajukan}
                  disabled={!berkas || sedangKirim || diblokirSpam || sedangSimpanDraft}
                  size="lg"
                  className="group relative w-full overflow-hidden text-base shadow-brand transition-all hover:-translate-y-0.5 hover:shadow-elevated"
                >
                  {/* Sapuan cahaya yang meluncur saat kursor menyorot */}
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
                  <span className="relative z-10 flex items-center gap-2">
                    {sedangKirim || diblokirSpam ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Icon name="send" fill className="text-[18px]" />
                    )}
                    {diblokirSpam ? 'Mohon Tunggu...' : 'Kirim Pengajuan'}
                  </span>
                </Button>

                {/* Simpan sebagai draft (unggah surat menyusul dari Riwayat) */}
                <Button
                  variant="outline"
                  onClick={simpanDraft}
                  disabled={sedangKirim || sedangSimpanDraft}
                  className="w-full"
                >
                  {sedangSimpanDraft ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon name="schedule" className="text-[18px]" />
                  )}
                  Simpan &amp; Unggah Surat Nanti
                </Button>

                <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                  <Icon name="info" className="mt-0.5 shrink-0 text-[14px]" />
                  Belum bisa mengunggah sekarang? Simpan dulu — pengajuan masuk ke Riwayat dan surat dapat
                  diunggah menyusul.
                </p>
              </div>
            </div>
          </Card>
        </aside>
      </div>

      {/* Dialog info peminjaman aktif */}
      <DialogPeminjamanAktif
        terbuka={dialogAktifTerbuka}
        onUbahTerbuka={setDialogAktifTerbuka}
        daftarPeminjaman={daftarPeminjamanAktif}
        kodeError={kodeErrorAktif}
        pesanError={pesanErrorAktif}
      />
    </div>
  );
}
