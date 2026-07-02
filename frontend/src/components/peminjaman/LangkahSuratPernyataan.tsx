// ============================================================
//  Langkah Surat Pernyataan — "Formulir Pengajuan Peminjaman".
//   Tahap akhir & terkunci (mirip halaman pembayaran toko online):
//   peminjam tidak bisa kembali ke langkah sebelumnya, hanya fokus
//   mengunduh surat, menandatangani, lalu mengunggahnya kembali.
//   Layout: preview surat di area utama + sidebar unggah (sticky).
// ============================================================

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Loader2,
  Send,
  FileText,
  Download,
  ExternalLink,
  RefreshCw,
  Upload,
  CheckCircle2,
  Lock,
  Clock,
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
  pangkatGolongan?: string;
  tanggalPinjamRencana?: string;
  tanggalKembaliRencana?: string;
  onSelesai: (peminjaman: Peminjaman) => void;
}

export function LangkahSuratPernyataan({
  items,
  pangkatGolongan,
  tanggalPinjamRencana,
  tanggalKembaliRencana,
  onSelesai,
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
          pangkatGolongan,
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

  // Simpan pengajuan ke Riwayat tanpa mengunggah surat sekarang (status DRAFT).
  // Surat dapat diunduh & diunggah menyusul dari halaman Riwayat.
  const [sedangSimpanDraft, setSedangSimpanDraft] = useState(false);
  const simpanDraft = async () => {
    setSedangSimpanDraft(true);
    try {
      const p = await peminjamanService.create({
        items,
        pangkatGolongan,
        tanggalPinjamRencana,
        tanggalKembaliRencana,
        draft: true,
      });
      onSelesai(p);
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal menyimpan pengajuan.'));
    } finally {
      setSedangSimpanDraft(false);
    }
  };

  // Generate surat preview (dengan debounce agar tidak spam saat props berubah)
  const buatSurat = useCallback(() => {
    if (items.length === 0) return;
    setMemuatSurat(true);
    setGagalSurat(false);

    peminjamanService
      .previewSurat({ items, pangkatGolongan, tanggalPinjamRencana, tanggalKembaliRencana })
      .then(setSuratUrl)
      .catch(() => {
        setGagalSurat(true);
        notify.gagal('Gagal menyiapkan surat pernyataan.');
      })
      .finally(() => setMemuatSurat(false));
  }, [items, pangkatGolongan, tanggalPinjamRencana, tanggalKembaliRencana]);

  useEffect(() => {
    const timer = setTimeout(buatSurat, 300);
    return () => clearTimeout(timer);
  }, [buatSurat]);

  // Kunci tahap ini: cegah tombol "kembali" browser & peringatkan bila
  // peminjam mencoba menutup/segarkan halaman (mirip halaman pembayaran).
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const cegahKembali = () => {
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
    <div className="space-y-6">
      {/* Header — tanpa tombol kembali (tahap terkunci) */}
      <div>
        <h2 className="flex items-center gap-3 text-2xl font-bold text-foreground">
          <FileText className="h-7 w-7" />
          Formulir Pengajuan Peminjaman
        </h2>
        <p className="mt-1 text-base text-muted-foreground">
          Unduh surat pernyataan, tanda tangani, lalu unggah kembali untuk mengajukan peminjaman.
        </p>
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Anda berada di tahap akhir. Tombol kembali dinonaktifkan — fokus untuk meminta tanda
            tangan lalu mengunggah surat pada panel di samping.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Area utama: Data Peminjam + Preview Surat */}
        <div className="space-y-6 lg:col-span-2">
          {/* Data Peminjam */}
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Data Peminjam</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 text-base sm:grid-cols-2">
                <div>
                  <span className="text-sm text-muted-foreground">Nama</span>
                  <p className="font-semibold">{user?.nama ?? '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">NIP</span>
                  <p className="font-semibold">{user?.nip ?? '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Pangkat/Gol.</span>
                  <p className="font-semibold">{pangkatGolongan || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Unit Kerja</span>
                  <p className="font-semibold">{user?.unitKerja ?? user?.eselon3 ?? '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview Surat Pernyataan */}
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
        </div>

        {/* Sidebar unggah surat (sticky) */}
        <aside className="lg:col-span-1">
          <Card className="border-l-4 border-l-red-500 lg:sticky lg:top-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Tanda Tangan &amp; Unggah Surat</CardTitle>
                <span className="rounded bg-red-500 px-3 py-1 text-sm font-semibold text-white">
                  WAJIB
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Ikuti langkah berikut untuk menyelesaikan pengajuan.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Langkah 1 — unduh surat */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  1. Unduh Surat Pernyataan Peminjaman
                </p>
                {memuatSurat ? (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    <Loader2 className="h-4 w-4 animate-spin" /> Menyiapkan surat…
                  </Button>
                ) : suratUrl ? (
                  <Button asChild variant="outline" size="sm" className="w-full">
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
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-4 w-4" /> {berkas ? 'Ganti Berkas' : 'Pilih Berkas PDF'}
                </Button>
                {berkas && (
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 p-2 text-sm text-green-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">{berkas.name}</span>
                  </div>
                )}
              </div>

              {/* Aksi kirim */}
              <div className="space-y-2 border-t pt-4">
                <Button
                  onClick={ajukan}
                  disabled={!berkas || sedangKirim || diblokirSpam || sedangSimpanDraft}
                  size="lg"
                  className="w-full text-base"
                >
                  {sedangKirim || diblokirSpam ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                  {diblokirSpam ? 'Mohon Tunggu...' : 'Kirim Pengajuan'}
                </Button>
                {!berkas && (
                  <p className="text-center text-xs text-muted-foreground">
                    Belum bisa mengunggah surat sekarang? Simpan dulu ke Riwayat.
                  </p>
                )}
                {/* Simpan sebagai draft (unggah surat menyusul dari Riwayat) */}
                <Button
                  variant="outline"
                  onClick={simpanDraft}
                  disabled={sedangKirim || sedangSimpanDraft}
                  className="w-full"
                >
                  {sedangSimpanDraft ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Clock className="h-5 w-5" />
                  )}
                  Simpan &amp; Unggah Surat Nanti
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
