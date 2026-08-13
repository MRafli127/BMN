// ============================================================
//  Admin — Manajemen Barang (folder per merk, cari, filter).
//  Barang dikelompokkan ke dalam folder berdasarkan merk yang sama;
//  tiap folder memuat unit beserta kode barang dan NUP-nya.
// ============================================================

'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Plus, ChevronLeft, ChevronRight, List, Package, Box, Layers, Tag, ChevronsUpDown } from 'lucide-react';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FolderBarang } from '@/components/barang/FolderBarang';
import { kelompokkanBarang } from '@/lib/kelompokkanBarang';
import { ImportBarangDialog } from '@/components/barang/ImportBarangDialog';
import { ExportModal } from '@/components/export/ExportModal';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { notify } from '@/components/ui/toast';
import { useBarangFolder } from '@/hooks/useBarangFolder';
import { barangService } from '@/services/barang.service';
import { ambilPesanError, cn } from '@/lib/utils';
import { OPSI_FILTER_BARANG, OPSI_KONDISI } from '@/constants/status';
import { RUTE } from '@/constants/routes';

// Pilihan jumlah folder yang ditampilkan per halaman
const OPSI_FOLDER = [8, 16, 32, 64];

// ============================================================
//  Mini kartu statistik
// ============================================================
interface MiniStatProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  gradient: string;
  ring: string;
  delay?: number;
}
function MiniStat({ label, value, icon, gradient, ring, delay = 0 }: MiniStatProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/60 bg-white p-4 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated animate-page-in'
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-md ring-2',
            gradient,
            ring
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            {label}
          </p>
          <p className="truncate font-jakarta text-2xl font-bold leading-tight text-gray-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function KontenBarang() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter ketersediaan dari query URL (?stok=tersedia|habis), mis. saat datang
  // dari kartu "Inventaris Barang" di dashboard.
  const stok = searchParams.get('stok');
  const ketersediaanUrl = stok === 'tersedia' || stok === 'habis' ? stok : undefined;

  // Filter kode satker dari query URL (?kodeSatker=...), mis. saat datang dari popup dashboard.
  const kodeSatkerUrl = searchParams.get('kodeSatker') || undefined;

  // Pakai nilai URL sebagai filter AWAL. Karena `template.tsx` me-mount ulang
  // konten tiap navigasi, halaman yang dibuka dari dashboard langsung memuat
  // filter yang dimaksud tanpa menunggu effect.
  // OPTIMASI: includePeminjam=true agar data siapa yang meminjam ikut dimuat
  const { data, filter, ubahFilter, sedangMemuat, refetch } = useBarangFolder(
    {
      ...(ketersediaanUrl ? { ketersediaan: ketersediaanUrl } : {}),
      ...(kodeSatkerUrl ? { kodeSatker: kodeSatkerUrl } : {}),
    },
    { includePeminjam: true }
  );
  const [cari, setCari] = useState('');
  const [halaman, setHalaman] = useState(1);
  const [perHalaman, setPerHalaman] = useState(8);

  // Cadangan bila konten TIDAK di-mount ulang (perubahan query pada rute yang
  // sama): selaraskan filter saat ?stok berubah agar tak balik ke "Semua Stok".
  useEffect(() => {
    ubahFilter({ ketersediaan: ketersediaanUrl, kodeSatker: kodeSatkerUrl });
  }, [ketersediaanUrl, kodeSatkerUrl, ubahFilter]);

  // Ubah filter ketersediaan dari dropdown: perbarui filter + URL sekaligus,
  // sehingga konsisten dan bertahan saat refresh.
  const ubahKetersediaan = useCallback(
    (nilai: string) => {
      ubahFilter({ ketersediaan: (nilai || undefined) as 'tersedia' | 'habis' | undefined });
      const params = new URLSearchParams(window.location.search);
      if (nilai) params.set('stok', nilai);
      else params.delete('stok');
      const qs = params.toString();
      router.replace(qs ? `${RUTE.adminBarang}?${qs}` : RUTE.adminBarang, { scroll: false });
    },
    [router, ubahFilter]
  );

  // Debounce pencarian
  useEffect(() => {
    const timer = setTimeout(() => ubahFilter({ q: cari || undefined }), 400);
    return () => clearTimeout(timer);
  }, [cari, ubahFilter]);

  // Kelompokkan barang menjadi folder per merk+type
  const grup = useMemo(() => kelompokkanBarang(data), [data]);

  // Kunci filter berdasarkan NILAI untuk dipakai di dependency useEffect.
  // Pakai object `filter` langsung sebagai dependency akan selalu berubah
  // referensinya tiap render (object literal baru dari hook), memicu loop.
  const filterKey = useMemo(() => JSON.stringify(filter), [filter]);

  // Kembali ke halaman 1 bila filter / jumlah per halaman berubah
  useEffect(() => {
    setHalaman(1);
  }, [filterKey, perHalaman]);

  const totalHalaman = Math.max(1, Math.ceil(grup.length / perHalaman));
  const halamanAman = Math.min(halaman, totalHalaman);
  const grupHalaman = grup.slice((halamanAman - 1) * perHalaman, halamanAman * perHalaman);

  const [terbuka, setTerbuka] = useState<Set<string>>(new Set());
  const semuaTerbuka = grup.length > 0 && grup.every((g) => terbuka.has(g.kategori));

  const toggleFolder = (merk: string) =>
    setTerbuka((prev) => {
      const next = new Set(prev);
      if (next.has(merk)) next.delete(merk);
      else next.add(merk);
      return next;
    });

  const bukaTutupSemua = () => {
    const allOpen = grup.length > 0 && grup.every((g) => terbuka.has(g.kategori));
    const next = new Set(terbuka);
    for (const g of grup) {
      if (allOpen) next.delete(g.kategori);
      else next.add(g.kategori);
    }
    setTerbuka(next);
  };

  const hapus = async (id: string) => {
    try {
      await barangService.remove(id);
      notify.suksess('Barang berhasil dihapus.');
      refetch();
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal menghapus barang.'));
      throw error; // biarkan dialog tetap terbuka
    }
  };

  // Statistik dari data
  const totalBarang = data.length;
  const totalMerk = grup.length;
  const totalSatker = new Set(
    data.map((b) => b.kodeSatker).filter((k): k is string => !!k)
  ).size;

  return (
    <div className="space-y-5">
      {/* Hero Header — gradient + dekorasi blob */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-6 text-white shadow-lg shadow-blue-700/20 animate-page-in sm:p-8">
        {/* Dekorasi blob & grid pattern */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-cyan-300/30 blur-3xl" />
          <div className="absolute -right-32 -bottom-32 h-80 w-80 rounded-full bg-indigo-400/25 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
        </div>

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md">
              <Package className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-jakarta text-2xl font-bold tracking-tight sm:text-3xl">
                  Manajemen Barang
                </h1>
                {data.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold ring-1 ring-white/25 backdrop-blur-md">
                    <Package className="h-3.5 w-3.5" />
                    {totalBarang} total
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-white/85">
                Kelola data Barang Milik Negara, dikelompokkan per merk.
              </p>
            </div>
          </div>

          {/* Tombol aksi */}
          <div className="flex flex-wrap gap-2">
            <ExportModal />
            <ImportBarangDialog onSelesai={refetch} />
            <Button asChild variant="outline" className="bg-white text-primary hover:bg-white">
              <Link href={RUTE.adminBarangBulk}>
                <List className="h-4 w-4" /> Tambah Barang Massal
              </Link>
            </Button>
          </div>
        </div>

        {/* Mini Stat Cards */}
        {data.length > 0 && (
          <div className="relative z-10 mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MiniStat
              label="Total Barang"
              value={totalBarang}
              icon={<Box className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
              ring="ring-blue-300/40"
              delay={80}
            />
            <MiniStat
              label="Total Merk"
              value={totalMerk}
              icon={<Tag className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-cyan-500 to-blue-600"
              ring="ring-cyan-300/40"
              delay={140}
            />
            <MiniStat
              label="Satker"
              value={totalSatker}
              icon={<Layers className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-indigo-500 to-blue-600"
              ring="ring-indigo-300/40"
              delay={200}
            />
          </div>
        )}
      </section>

      {/* Panel search + filter */}
      <div className="overflow-hidden rounded-xl border bg-card">
        {/* Search — lebar penuh, baris sendiri */}
        <div className="border-b border-outline-variant p-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari kode / nama barang / merk / nama peminjam..." className="pl-9" />
          </div>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/20 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={filter.kodeSatker || ''} onChange={(e) => ubahFilter({ kodeSatker: (e.target.value || undefined) as never })} className="w-52">
              <option value="">Semua Kode Satker</option>
              {OPSI_FILTER_BARANG.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select value={filter.kondisi || ''} onChange={(e) => ubahFilter({ kondisi: (e.target.value || undefined) as never })} className="w-40">
              <option value="">Semua Kondisi</option>
              {OPSI_KONDISI.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select value={filter.ketersediaan || ''} onChange={(e) => ubahKetersediaan(e.target.value)} className="w-40">
              <option value="">Semua Stok</option>
              <option value="tersedia">Tersedia</option>
              <option value="habis">Habis</option>
            </Select>
          </div>
          <Button variant="ghost" size="sm" onClick={bukaTutupSemua} className="text-blue-600 hover:text-blue-700 shrink-0">
            <ChevronsUpDown className="h-4 w-4" />
            {semuaTerbuka ? 'Tutup semua folder' : 'Buka semua folder'}
          </Button>
        </div>
      </div>

      {/* Folder per merk */}
      {sedangMemuat ? (
        <LoadingSpinner />
      ) : data.length === 0 ? (
        <EmptyState
          judul="Belum ada barang"
          deskripsi="Tambahkan barang pertama Anda untuk mulai mengelola BMN."
          aksi={
            <Button asChild>
              <Link href={RUTE.adminBarangTambah}>
                <Plus className="h-4 w-4" /> Tambah Barang
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <FolderBarang grup={grupHalaman} onHapus={hapus} terbuka={terbuka} onToggle={toggleFolder} />

          {/* Footer: jumlah folder per halaman + navigasi */}
          <div className="overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-card">
            {/* Progress bar */}
            {totalHalaman > 1 && (
              <div className="h-1 bg-gray-100">
                <div
                  className="h-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-500"
                  style={{ width: `${(halamanAman / totalHalaman) * 100}%` }}
                />
              </div>
            )}
            <div className="flex flex-col items-center justify-between gap-4 px-6 py-4 sm:flex-row">
              {/* Info stat */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="rounded-lg bg-primary/10 px-3 py-1.5 font-medium text-primary">
                    {data.length}
                  </span>
                  <span className="text-muted-foreground">barang</span>
                </div>
                <div className="h-5 w-px bg-gray-200" />
                <div className="flex items-center gap-2 text-sm">
                  <span className="rounded-lg bg-blue-50 px-3 py-1.5 font-medium text-blue-600">
                    {grup.length}
                  </span>
                  <span className="text-muted-foreground">merk</span>
                </div>
              </div>

              {/* Page size selector */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Tampilkan</span>
                <Select
                  value={String(perHalaman)}
                  onChange={(e) => setPerHalaman(Number(e.target.value))}
                  className="h-9 w-[4.5rem]"
                  aria-label="Jumlah folder per halaman"
                >
                  {OPSI_FOLDER.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
                <span>folder / halaman</span>
              </div>

              {/* Navigasi halaman */}
              {totalHalaman > 1 && (
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700">
                    <span className="text-primary">{halamanAman}</span>
                    <span className="text-muted-foreground"> / {totalHalaman}</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={halamanAman <= 1}
                      onClick={() => setHalaman(halamanAman - 1)}
                      className="h-8 w-8 p-0 transition-all active:scale-95"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={halamanAman >= totalHalaman}
                      onClick={() => setHalaman(halamanAman + 1)}
                      className="h-8 gap-1.5 px-3 transition-all active:scale-95"
                    >
                      Berikutnya
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminBarangPage() {
  // useSearchParams butuh batas Suspense agar tidak memaksa render statis gagal.
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <KontenBarang />
    </Suspense>
  );
}
