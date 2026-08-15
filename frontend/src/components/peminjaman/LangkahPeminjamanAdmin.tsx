// ============================================================
//  Wizard 2 langkah untuk admin membuatkan peminjaman:
//   Langkah 1: Pilih peminjam + barang + detail form.
//   Langkah 2: Preview & upload surat, lalu submit (langsung DIPINJAM).
// ============================================================

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, ArrowLeft, FileText, Save, Send } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { notify } from '@/components/ui/toast';
import { peminjamanService } from '@/services/peminjaman.service';
import { PencarianPeminjam } from '@/components/shared/PencarianPeminjam';
import { PencarianBarangMulti } from '@/components/barang/PencarianBarangMulti';
import { useDebounceSubmit } from '@/hooks/useDebounceSubmit';
import { ambilPesanError, cn } from '@/lib/utils';
import { RUTE } from '@/constants/routes';
import type { UserItem } from '@/services/userManagement.service';
import type { Peminjaman } from '@/types/peminjaman.type';

const KODE_SATKER = [
  { kode: '015110199411868000KP', label: 'Sekretariat Badan Pendidikan dan Pelatihan Keuangan' },
  { kode: '015110199411868001KP', label: 'Pusat Pembinaan Jabatan Fungsional dan Peminjaman Mutu' },
  { kode: '015110199411868002KP', label: 'Pusat Pendidikan dan Pelatihan Anggaran dan Pembendaharaan' },
  { kode: '015110199411868003KP', label: 'Pusat Pendidikan dan Pelatihan Pajak' },
  { kode: '015110199411868004KP', label: 'Pusat Pendidikan dan Pelatihan Bea dan Cukai' },
  { kode: '015110199411868005KP', label: 'Pusat Pendidikan dan Pelatihan Keuangan Publik' },
  { kode: '015110199411868006KP', label: 'Pusat Pendidikan dan Pelatihan Kepemimpinan dan Manajemen' },
];

interface PilihanBarang {
  barang: import('@/types/barang.type').Barang;
  jumlah: number;
}

interface Props {
  /** Dipanggil saat wizard ditutup. */
  onTutup: () => void;
  /** Dipanggil setelah peminjaman berhasil dibuat. */
  onSelesai: (peminjaman: Peminjaman) => void;
}

type Langkah = 'form' | 'surat';

export function LangkahPeminjamanAdmin({ onTutup, onSelesai }: Props) {
  const router = useRouter();

  // --- State ---
  const [langkah, setLangkah] = useState<Langkah>('form');

  // Form fields
  const [peminjam, setPeminjam] = useState<UserItem | null>(null);
  const [kodeSatker, setKodeSatker] = useState('');
  const [pilihanBarang, setPilihanBarang] = useState<PilihanBarang[]>([]);
  const [pangkatGol, setPangkatGol] = useState('');
  const [tglPinjam, setTglPinjam] = useState('');
  const [tglKembali, setTglKembali] = useState('');

  // Surat state
  const [suratUrl, setSuratUrl] = useState<string | null>(null);
  const [memuatSurat, setMemuatSurat] = useState(false);
  const [gagalSurat, setGagalSurat] = useState(false);
  const [berkas, setBerkas] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const retryCountRef = useRef(0);

  // Validation errors
  const [errorPeminjam, setErrorPeminjam] = useState('');
  const [errorSatker, setErrorSatker] = useState('');
  const [errorBarang, setErrorBarang] = useState('');
  const [errorPangkatGol, setErrorPangkatGol] = useState('');

  // --- Generate Preview Surat ---
  const generatePreview = useCallback(async () => {
    if (!peminjam || pilihanBarang.length === 0 || !pangkatGol.trim()) return;

    setMemuatSurat(true);
    setGagalSurat(false);

    try {
      const url = await peminjamanService.previewSuratAdmin({
        userId: peminjam.id,
        items: pilihanBarang.map((p) => ({ barangId: p.barang.id, jumlahPinjam: p.jumlah })),
        pangkatGolongan: pangkatGol.trim(),
        tanggalPinjamRencana: tglPinjam || undefined,
        tanggalKembaliRencana: tglKembali || undefined,
      });
      setSuratUrl(url);
      retryCountRef.current = 0;
    } catch (err) {
      console.error('[PreviewSuratAdmin] Gagal:', err);
      setGagalSurat(true);
      retryCountRef.current += 1;
    } finally {
      setMemuatSurat(false);
    }
  }, [peminjam, pilihanBarang, pangkatGol, tglPinjam, tglKembali]);

  // Retry on failure
  useEffect(() => {
    if (gagalSurat && retryCountRef.current < 3 && memuatSurat === false) {
      const delay = Math.min(2000 * Math.pow(2, retryCountRef.current - 1), 8000);
      const timer = setTimeout(generatePreview, delay);
      return () => clearTimeout(timer);
    }
  }, [gagalSurat, generatePreview, memuatSurat]);

  // Auto-generate preview saat masuk ke langkah surat
  useEffect(() => {
    if (langkah === 'surat') {
      generatePreview();
    }
  }, [langkah, generatePreview]);

  // --- Validasi langkah 1 ---
  const keSurat = () => {
    let valid = true;
    if (!peminjam) {
      setErrorPeminjam('Pilih peminjam terlebih dahulu.');
      valid = false;
    } else {
      setErrorPeminjam('');
    }
    if (!kodeSatker) {
      setErrorSatker('Pilih Satker terlebih dahulu.');
      valid = false;
    } else {
      setErrorSatker('');
    }
    if (pilihanBarang.length === 0) {
      setErrorBarang('Pilih minimal satu barang.');
      valid = false;
    } else {
      setErrorBarang('');
    }
    if (!pangkatGol.trim()) {
      setErrorPangkatGol('Pangkat/Gol. wajib diisi.');
      valid = false;
    } else {
      setErrorPangkatGol('');
    }
    if (!valid) return;

    // Validasi tanggal
    if (tglPinjam && tglKembali && new Date(tglKembali) <= new Date(tglPinjam)) {
      notify.gagal('Tanggal kembali harus setelah tanggal pinjam.');
      return;
    }

    setLangkah('surat');
  };

  const keForm = () => {
    setLangkah('form');
  };

  // --- File upload ---
  const pilihBerkas = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.type !== 'application/pdf') {
      notify.gagal('Berkas harus berformat PDF.');
      e.target.value = '';
      return;
    }
    setBerkas(f);
  };

  // --- Submit ---
  const { callback: simpanDraf, sedangDiblokir: sedangSimpanDraf } = useDebounceSubmit(
    async () => {
      if (!peminjam) return;
      try {
        const p = await peminjamanService.createByAdmin({
          userId: peminjam.id,
          pangkatGolongan: pangkatGol.trim(),
          tanggalPinjamRencana: tglPinjam || undefined,
          tanggalKembaliRencana: tglKembali || undefined,
          items: pilihanBarang.map((pb) => ({ barangId: pb.barang.id, jumlahPinjam: pb.jumlah })),
          draft: true,
        });
        notify.suksess('Peminjaman disimpan sebagai draft. Upload Surat Pernyataan untuk diserahkan.');
        onSelesai(p);
      } catch (err) {
        notify.gagal(ambilPesanError(err, 'Gagal menyimpan draft.'));
      }
    },
    { jeda: 2000 }
  );

  const { callback: serahkan, sedangDiblokir: sedangMenyerahkan } = useDebounceSubmit(
    async () => {
      if (!berkas) {
        notify.gagal('Unggah Surat Pernyataan yang sudah ditandatangani terlebih dahulu.');
        return;
      }
      if (!peminjam) return;
      try {
        const p = await peminjamanService.createByAdmin({
          userId: peminjam.id,
          pangkatGolongan: pangkatGol.trim(),
          tanggalPinjamRencana: tglPinjam || undefined,
          tanggalKembaliRencana: tglKembali || undefined,
          items: pilihanBarang.map((pb) => ({ barangId: pb.barang.id, jumlahPinjam: pb.jumlah })),
          dokumen: berkas,
        });
        notify.suksess('Peminjaman berhasil dibuat dan langsung berstatus Dipinjam.');
        onSelesai(p);
      } catch (err) {
        notify.gagal(ambilPesanError(err, 'Gagal menyerahkan peminjaman.'));
      }
    },
    { jeda: 2000 }
  );

  // --- Render ---
  if (langkah === 'surat') {
    return (
      <div className="space-y-gutter">
        {/* Header + tombol kembali */}
        <section className="relative overflow-hidden rounded-2xl bg-brand-gradient text-white shadow-brand">
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-1/3 h-44 w-44 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="relative space-y-4 p-5 sm:p-7">
            <Button
              type="button"
              variant="ghost"
              onClick={keForm}
              className="text-white/80 hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Kembali
            </Button>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur sm:h-14 sm:w-14">
                <Icon name="history_edu" fill className="text-[24px] sm:text-[28px]" />
              </div>
              <div>
                <h2 className="font-jakarta text-headline-md-mobile text-white sm:text-headline-md">
                  Surat Pernyataan
                </h2>
                <p className="text-sm text-white/80">
                  Preview, unduh, tanda tangani, lalu upload surat.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
          {/* Area utama: data peminjam + preview */}
          <div className="space-y-gutter lg:col-span-2">
            {/* Data Peminjam (read-only summary) */}
            {peminjam && (
              <Card className="overflow-hidden border-primary/15">
                <div className="flex items-center gap-3 border-b border-primary/10 bg-gradient-to-r from-primary/[0.07] to-transparent px-5 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon name="person" fill className="text-[20px]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-primary">Data Peminjam</h3>
                    <p className="text-xs text-muted-foreground">Peminjam yang akan tercatat di surat.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 p-5">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nama</p>
                    <p className="font-semibold">{peminjam.nama}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">NIP</p>
                    <p className="font-semibold">{peminjam.nip}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pangkat/Gol.</p>
                    <p className="font-semibold">{pangkatGol}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Unit Kerja</p>
                    <p className="font-semibold">{peminjam.unitKerja ?? '-'}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Preview Surat */}
            <Card className="overflow-hidden border-primary/15">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/10 bg-gradient-to-r from-primary/[0.07] to-transparent px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon name="description" fill className="text-[20px]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-primary">Preview Surat Pernyataan</h3>
                    <p className="text-xs text-muted-foreground">Periksa isi surat sebelum diunduh.</p>
                  </div>
                </div>
                {suratUrl && (
                  <div className="flex shrink-0 gap-2">
                    <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                      <a href={suratUrl} target="_blank" rel="noreferrer" aria-label="Buka surat di tab baru">
                        <Icon name="open_in_new" className="text-[18px]" />
                      </a>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <a href={suratUrl} download={`Surat-Peminjaman-Laptop_${(peminjam?.nama ?? '').trim().replace(/\s+/g, '-').replace(/[^A-Za-z0-9._-]/g, '') || 'Tanpa-Nama'}.pdf`}>
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
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
                      <Icon name="error" fill className="text-[24px]" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">Gagal menyiapkan surat.</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Coba lagi dalam beberapa detik.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={generatePreview}>
                      <Icon name="refresh" className="h-4 w-4" /> Coba Lagi
                    </Button>
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

          {/* Sidebar upload + submit */}
          <aside className="lg:col-span-1">
            <Card className="overflow-hidden border-primary/15 lg:sticky lg:top-4">
              <div className="flex items-center gap-3 border-b border-primary/10 bg-gradient-to-r from-primary/[0.07] to-transparent px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon name="draw" fill className="text-[20px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-primary">Tanda Tangan &amp; Unggah</h3>
                  <p className="text-xs text-muted-foreground">Selesaikan 3 langkah berikut.</p>
                </div>
                <span className="shrink-0 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white shadow-soft">
                  WAJIB
                </span>
              </div>

              <div className="p-5">
                <ol>
                  {/* Step 1: Download */}
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
                            <Loader2 className="h-4 w-4 animate-spin" /> Menyiapkan…
                          </Button>
                        ) : suratUrl ? (
                          <Button asChild variant="outline" size="sm" className="w-full">
                            <a href={suratUrl} download={`Surat-Peminjaman-Laptop_${(peminjam?.nama ?? '').trim().replace(/\s+/g, '-').replace(/[^A-Za-z0-9._-]/g, '') || 'Tanpa-Nama'}.pdf`}>
                              <Icon name="download" className="text-[18px]" /> Unduh Surat
                            </a>
                          </Button>
                        ) : (
                          <p className="text-xs text-muted-foreground">Surat belum tersedia.</p>
                        )}
                      </div>
                    </div>
                  </li>

                  {/* Step 2: Sign */}
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
                        Tanda tangani surat oleh peminjam dan admin.
                      </p>
                    </div>
                  </li>

                  {/* Step 3: Upload */}
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

                {/* Submit */}
                <div className="mt-5 space-y-2.5 border-t border-primary/10 pt-4">
                  {/* Simpan Draf — tanpa upload surat, stok tidak dikurangi */}
                  <Button
                    onClick={simpanDraf}
                    disabled={sedangSimpanDraf || sedangMenyerahkan}
                    size="lg"
                    variant="outline"
                    className="group relative w-full overflow-hidden text-base transition-all hover:-translate-y-0.5 hover:shadow-elevated"
                  >
                    <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
                    <span className="relative z-10 flex items-center gap-2">
                      {sedangSimpanDraf ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Save className="h-5 w-5" />
                      )}
                      {sedangSimpanDraf ? 'Mohon Tunggu...' : 'Simpan Draf'}
                    </span>
                  </Button>

                  {/* Serahkan Sekarang — wajib upload surat, langsung DIPINJAM */}
                  <Button
                    onClick={serahkan}
                    disabled={!berkas || sedangSimpanDraf || sedangMenyerahkan}
                    size="lg"
                    className="group relative w-full overflow-hidden text-base shadow-brand transition-all hover:-translate-y-0.5 hover:shadow-elevated"
                  >
                    <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
                    <span className="relative z-10 flex items-center gap-2">
                      {sedangMenyerahkan ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                      {sedangMenyerahkan ? 'Mohon Tunggu...' : 'Serahkan Sekarang'}
                    </span>
                  </Button>

                  <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                    <Icon name="info" className="mt-0.5 shrink-0 text-[14px]" />
                    Simpan Draf = tanpa potong stok. Serahkan = potong stok langsung.
                  </p>
                </div>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    );
  }

  // --- Langkah 1: Form ---
  return (
    <div className="space-y-gutter">
      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl bg-brand-gradient text-white shadow-brand">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-44 w-44 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="relative space-y-3 p-5 sm:p-7">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur sm:h-14 sm:w-14">
              <Icon name="person_add" fill className="text-[24px] sm:text-[28px]" />
            </div>
            <div>
              <h2 className="font-jakarta text-headline-md-mobile text-white sm:text-headline-md">
                Tambah Peminjaman
              </h2>
              <p className="text-sm text-white/80">
                Buat peminjaman atas nama peminjam yang terdaftar.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-2">
        {/* Kiri: Pilih peminjam + barang */}
        <div className="space-y-5">
          {/* Pilih Peminjam */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Icon name="person" fill className="text-[20px] text-primary" />
              <p className="text-sm font-semibold text-foreground">1. Pilih Peminjam</p>
            </div>
            <PencarianPeminjam
              onPilih={setPeminjam}
              terpilih={peminjam}
              className="w-full"
            />
            {errorPeminjam && <p className="mt-1 text-xs text-red-600">{errorPeminjam}</p>}
          </div>

          {/* Pilih Satker */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Icon name="corporate_fare" fill className="text-[20px] text-primary" />
              <p className="text-sm font-semibold text-foreground">2. Pilih Satker</p>
            </div>
            <select
              value={kodeSatker}
              onChange={(e) => {
                setKodeSatker(e.target.value);
                setPilihanBarang([]);
                if (e.target.value) setErrorSatker('');
              }}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-all focus:border-primary focus:outline-none"
            >
              <option value="">-- Pilih Satker --</option>
              {KODE_SATKER.map((s) => (
                <option key={s.kode} value={s.kode}>
                  {s.kode.slice(-3)} - {s.label}
                </option>
              ))}
            </select>
            {errorSatker && <p className="mt-1 text-xs text-red-600">{errorSatker}</p>}
          </div>

          {/* Pilih Barang */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Icon name="inventory_2" fill className="text-[20px] text-primary" />
              <p className="text-sm font-semibold text-foreground">3. Pilih Barang</p>
            </div>
            <PencarianBarangMulti
              onPilihanUbah={setPilihanBarang}
              pilihan={pilihanBarang}
              kodeSatker={kodeSatker || undefined}
              label=""
              helperText="Cari barang lalu klik &quot;+ Tambah&quot;. Boleh pilih lebih dari satu."
            />
            {errorBarang && <p className="mt-1 text-xs text-red-600">{errorBarang}</p>}
          </div>
        </div>

        {/* Kanan: Detail form */}
        <div className="space-y-4">
          <Card className="overflow-hidden border-primary/15">
            <div className="flex items-center gap-3 border-b border-primary/10 bg-gradient-to-r from-primary/[0.07] to-transparent px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon name="history_edu" fill className="text-[20px]" />
              </div>
              <div>
                <h3 className="font-bold text-primary">Detail Peminjaman</h3>
                <p className="text-xs text-muted-foreground">Isi informasi tambahan.</p>
              </div>
            </div>
            <CardContent className="space-y-4 p-5">
              {/* Pangkat/Gol. WAJIB */}
              <div>
                <Label htmlFor="pangkatGol">
                  Pangkat/Gol. <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="pangkatGol"
                  value={pangkatGol}
                  onChange={(e) => {
                    setPangkatGol(e.target.value);
                    if (errorPangkatGol) setErrorPangkatGol('');
                  }}
                  placeholder="Contoh: III/c atau Penata Muda / III/c"
                  className="mt-1"
                />
                {errorPangkatGol && <p className="mt-1 text-xs text-red-600">{errorPangkatGol}</p>}
                <p className="mt-1 text-xs text-muted-foreground">Wajib diisi. Tercantum pada surat pernyataan.</p>
              </div>

              {/* Tanggal */}
              <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
                <div>
                  <Label htmlFor="tglPinjam">Tanggal Pinjam</Label>
                  <Input
                    id="tglPinjam"
                    type="date"
                    value={tglPinjam}
                    onChange={(e) => setTglPinjam(e.target.value)}
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Opsional.</p>
                </div>
                <div>
                  <Label htmlFor="tglKembali">Rencana Kembali</Label>
                  <Input
                    id="tglKembali"
                    type="date"
                    value={tglKembali}
                    onChange={(e) => setTglKembali(e.target.value)}
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Opsional.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ringkasan */}
          <Card className="overflow-hidden border-primary/15">
            <div className="border-b border-primary/10 bg-gradient-to-r from-primary/[0.07] to-transparent px-5 py-3">
              <h3 className="font-bold text-primary">Ringkasan</h3>
            </div>
            <CardContent className="space-y-2 p-5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Peminjam</span>
                <span className="font-medium">{peminjam?.nama ?? '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Jumlah Barang</span>
                <span className="font-medium">{pilihanBarang.length} item</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Unit</span>
                <span className="font-medium">
                  {pilihanBarang.reduce((sum, p) => sum + p.jumlah, 0)} unit
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pangkat/Gol.</span>
                <span className="font-medium">{pangkatGol || '-'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Tombol lanjut */}
          <Button
            type="button"
            onClick={keSurat}
            size="lg"
            className="w-full shadow-brand transition-all hover:-translate-y-0.5 hover:shadow-elevated"
          >
            <FileText className="h-4 w-4" /> Lanjut ke Surat Pernyataan
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
