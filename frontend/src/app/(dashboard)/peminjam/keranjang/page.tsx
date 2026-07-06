// ============================================================
//  Peminjam — Keranjang & Checkout Peminjaman.
//   Langkah 1: Tinjau barang yang dipilih dari katalog.
//   Langkah 2: Tinjau Surat Pernyataan Peminjaman, unduh & cetak,
//              tanda tangan fisik, unggah kembali (PDF), lalu ajukan.
//  Tampilan folder per nama barang (mirip katalog).
//  Setiap unit barang hanya berjumlah 1.
//  Support polling real-time untuk cek stok barang.
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { notify } from '@/components/ui/toast';
import { FolderKeranjang } from '@/components/keranjang/FolderKeranjang';
import { KonfirmasiDialog } from '@/components/shared/KonfirmasiDialog';
import { DialogBarangTidakTersedia } from '@/components/keranjang/DialogBarangTidakTersedia';
import { LangkahSuratPernyataan } from '@/components/peminjaman/LangkahSuratPernyataan';
import { useKeranjangStore, useJumlahKeranjang, useTotalUnitKeranjang, usePollingStokKeranjang } from '@/store/keranjangStore';
import { RUTE } from '@/constants/routes';

type Langkah = 'tinjau' | 'surat';

export default function KeranjangPage() {
  const router = useRouter();
  const items = useKeranjangStore((s) => s.items);
  const kosongkan = useKeranjangStore((s) => s.kosongkan);
  const hapus = useKeranjangStore((s) => s.hapus);

  const [pangkatGol, setPangkatGol] = useState('');
  const [tglPinjam, setTglPinjam] = useState('');
  const [tglKembali, setTglKembali] = useState('');
  const [langkah, setLangkah] = useState<Langkah>('tinjau');
  const [konfirmasiTerbuka, setKonfirmasiTerbuka] = useState(false);

  // Hindari hydration mismatch: isi keranjang (persisted) baru dibaca setelah mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const daftar = Object.values(items);
  const jumlahKeranjang = useJumlahKeranjang();
  const totalUnit = useTotalUnitKeranjang();

  // Polling cek stok real-time (cek setiap 30 detik)
  const {
    barangYangDihapus,
    dialogTerbuka: dialogStokTerbuka,
    setDialogTerbuka: setDialogStokTerbuka,
    refresh: refreshStok,
  } = usePollingStokKeranjang({
    enabled: mounted && daftar.length > 0,
  });

  // Hapus barang yang tidak tersedia dari keranjang
  const handleHapusBarangTidakTersedia = () => {
    for (const item of barangYangDihapus) {
      hapus(item.barangId);
    }
    notify.warning(`${barangYangDihapus.length} barang yang tidak tersedia dihapus dari keranjang.`);
  };

  // Validasi isian keranjang, lalu minta konfirmasi terakhir sebelum masuk ke
  // formulir — di tahap berikutnya isi pinjaman tidak bisa diubah/dibatalkan.
  const mintaKonfirmasi = () => {
    if (daftar.length === 0) return notify.gagal('Keranjang masih kosong.');
    if (!pangkatGol.trim())
      return notify.gagal('Pangkat/Gol. wajib diisi sebelum melanjutkan ke formulir.');
    if (tglPinjam && tglKembali && new Date(tglKembali) <= new Date(tglPinjam))
      return notify.gagal('Tanggal kembali harus setelah tanggal pinjam.');
    setKonfirmasiTerbuka(true);
  };

  const keSurat = () => {
    setKonfirmasiTerbuka(false);
    setLangkah('surat');
  };

  if (!mounted) return <LoadingSpinner layarPenuh />;

  // === ALUR 1: KERANJANG (PILIH BARANG & TANGGAL) ===
  if (langkah === 'tinjau') {
    return (
      <div className="mx-auto max-w-5xl space-y-gutter">
        {/* Hero: identitas halaman + indikator langkah proses */}
        <section className="relative overflow-hidden rounded-2xl bg-brand-gradient text-white shadow-brand">
          {/* Orb dekoratif lembut sebagai latar */}
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-1/3 h-44 w-44 rounded-full bg-sky-400/20 blur-3xl" />

          <div className="relative space-y-5 p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href={RUTE.peminjamKatalog}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white/90 backdrop-blur transition-colors hover:bg-white/20 hover:text-white"
              >
                <Icon name="arrow_back" className="text-[16px]" />
                Kembali ke Katalog
              </Link>
              {daftar.length > 0 && (
                <button
                  type="button"
                  onClick={kosongkan}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white/90 backdrop-blur transition-colors hover:border-red-300/50 hover:bg-red-500/30 hover:text-white"
                >
                  <Icon name="delete" className="text-[16px]" />
                  Kosongkan Keranjang
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur sm:h-14 sm:w-14">
                <Icon name="shopping_cart" fill className="text-[24px] sm:text-[28px]" />
              </div>
              <div>
                <h1 className="font-jakarta text-headline-lg-mobile text-white sm:text-headline-lg">
                  Keranjang Peminjaman
                </h1>
                <p className="text-sm text-white/80 sm:text-base">
                  Tinjau barang yang dipilih, tentukan tanggal pinjam & kembali, lalu lanjut ke formulir.
                </p>
              </div>
            </div>

            {/* Indikator langkah proses pengajuan */}
            <ol className="flex flex-wrap items-center gap-2 text-sm">
              <li className="flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 font-semibold text-primary shadow-soft">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                  1
                </span>
                Tinjau Keranjang
              </li>
              <li aria-hidden className="h-px w-6 shrink-0 bg-white/40 sm:w-8" />
              <li className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 font-medium text-white/75">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/40 text-[11px] font-bold">
                  2
                </span>
                Surat Pernyataan
              </li>
            </ol>
          </div>
        </section>

        {daftar.length === 0 ? (
          <EmptyState
            ikon={ShoppingCart}
            judul="Keranjang masih kosong"
            deskripsi="Tambahkan barang dari katalog untuk mulai mengajukan peminjaman."
            aksi={
              <Button asChild>
                <Link href={RUTE.peminjamKatalog}>
                  <Icon name="inventory_2" className="text-[18px]" /> Telusuri Katalog
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
            {/* Folder barang */}
            <div className="lg:col-span-2">
              <FolderKeranjang
                header={
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon name="inventory_2" fill className="text-[18px]" />
                    </span>
                    <h2 className="font-jakarta text-base font-bold text-foreground">Barang Dipilih</h2>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-bold text-primary">
                      {jumlahKeranjang} unit
                    </span>
                  </div>
                }
              />
            </div>

            {/* Ringkasan & lanjut */}
            <div>
              <Card className="overflow-hidden border-primary/15 lg:sticky lg:top-4">
                {/* Kepala kartu dengan aksen gradien */}
                <div className="flex items-center gap-3 border-b border-primary/10 bg-gradient-to-r from-primary/[0.07] to-transparent px-5 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon name="assignment" fill className="text-[20px]" />
                  </div>
                  <div>
                    <h2 className="font-jakarta text-base font-bold leading-tight text-primary">Detail Pengajuan</h2>
                    <p className="text-xs text-muted-foreground">Lengkapi sebelum lanjut ke formulir.</p>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div>
                    <Label htmlFor="pangkatGol">
                      Pangkat/Gol. <span className="text-red-600">*</span>
                    </Label>
                    <div className="relative mt-1.5">
                      <Icon
                        name="badge"
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-muted-foreground"
                      />
                      <Input
                        id="pangkatGol"
                        type="text"
                        value={pangkatGol}
                        onChange={(e) => setPangkatGol(e.target.value)}
                        placeholder="Contoh: Penata Muda / III-a"
                        required
                        aria-required="true"
                        className="pl-10"
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Wajib diisi — akan tercantum pada Surat Pernyataan Peminjaman.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="tglPinjam">Tanggal Pinjam (opsional)</Label>
                    <div className="relative mt-1.5">
                      <Icon
                        name="today"
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-muted-foreground"
                      />
                      <Input
                        id="tglPinjam"
                        type="date"
                        value={tglPinjam}
                        onChange={(e) => setTglPinjam(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">Kosongkan untuk memakai tanggal hari ini.</p>
                  </div>

                  <div>
                    <Label htmlFor="tglKembali">Rencana Kembali (opsional)</Label>
                    <div className="relative mt-1.5">
                      <Icon
                        name="event_repeat"
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-muted-foreground"
                      />
                      <Input
                        id="tglKembali"
                        type="date"
                        value={tglKembali}
                        onChange={(e) => setTglKembali(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">Kosongkan bila peminjaman tanpa batas waktu.</p>
                  </div>

                  {/* Ringkasan total */}
                  <div className="flex items-center justify-between rounded-xl border border-primary/15 bg-gradient-to-br from-primary/5 to-primary/10 px-4 py-3">
                    <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Icon name="category" className="text-[18px] text-primary" />
                      Total unit dipilih
                    </span>
                    <span className="font-jakarta text-2xl font-bold text-primary">{totalUnit}</span>
                  </div>

                  <Button
                    className="group relative h-11 w-full overflow-hidden text-base shadow-brand transition-all hover:-translate-y-0.5 hover:shadow-elevated"
                    onClick={mintaKonfirmasi}
                  >
                    {/* Sapuan cahaya yang meluncur saat kursor menyorot */}
                    <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
                    <span className="relative z-10 flex items-center gap-2">
                      <Icon name="description" className="text-[18px]" />
                      Lanjut ke Formulir
                      <Icon name="arrow_forward" className="text-[18px] transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </Button>

                  <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                    <Icon name="info" className="mt-0.5 shrink-0 text-[14px]" />
                    Setelah lanjut ke formulir, isi keranjang tidak dapat diubah kembali.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        )}

        <KonfirmasiDialog
          terbuka={konfirmasiTerbuka}
          onUbahTerbuka={setKonfirmasiTerbuka}
          judul="Lanjut ke Formulir Pengajuan?"
          deskripsi="Pastikan barang dan tanggal peminjaman sudah benar. Setelah lanjut, Anda tidak dapat kembali atau mengubah isi pinjaman — hanya melanjutkan proses tanda tangan & unggah surat pernyataan."
          teksKonfirmasi="Ya, Lanjutkan"
          teksBatal="Periksa Lagi"
          onKonfirmasi={keSurat}
        />

        {/* Dialog popup barang tidak tersedia */}
        <DialogBarangTidakTersedia
          terbuka={dialogStokTerbuka}
          onUbahTerbuka={setDialogStokTerbuka}
          barangTidakTersedia={barangYangDihapus}
          onHapusSemua={handleHapusBarangTidakTersedia}
        />
      </div>
    );
  }

  // === ALUR 2: FORMULIR (SURAT PERNYATAAN) ===
  return (
    <div className="mx-auto max-w-6xl">
      <LangkahSuratPernyataan
        hero
        langkahSebelumnya="Tinjau Keranjang"
        items={daftar.map((it) => ({ barangId: it.barangId, jumlahPinjam: it.jumlah, namaBarang: it.nama }))}
        pangkatGolongan={pangkatGol.trim()}
        tanggalPinjamRencana={tglPinjam || undefined}
        tanggalKembaliRencana={tglKembali || undefined}
        onSelesai={(p) => {
          kosongkan();
          if (p.status === 'DRAFT') {
            notify.info('Pengajuan disimpan ke Riwayat. Unggah Surat Pernyataan kapan saja untuk melanjutkan.');
            router.push(RUTE.peminjamRiwayatDetail(p.id));
          } else {
            notify.suksess('Pengajuan peminjaman berhasil dikirim!');
            router.push(RUTE.peminjamRiwayatReview(p.id));
          }
        }}
      />
    </div>
  );
}
