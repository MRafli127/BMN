// ============================================================
//  Admin — Manajemen Peminjaman (daftar + filter status).
// ============================================================

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Trash2,
  X,
  CheckCheck,
  List,
  FolderTree,
  PackageCheck,
  Undo2,
  Upload,
  Plus,
  FileText,
} from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { Input, Select, Textarea, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TabelPeminjaman } from '@/components/peminjaman/TabelPeminjaman';
import { FolderPeminjaman } from '@/components/peminjaman/FolderPeminjaman';
import { FolderSatkerPeminjaman } from '@/components/peminjaman/FolderSatkerPeminjaman';
import { ImportPeminjamDialog } from '@/components/peminjaman/ImportPeminjamDialog';
import { ExportModal } from '@/components/export/ExportModal';
import { KonfirmasiDialog } from '@/components/shared/KonfirmasiDialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { notify } from '@/components/ui/toast';
import { peminjamanService, type FilterPeminjaman } from '@/services/peminjaman.service';
import { useQuery } from '@/lib/cache';
import { ambilPesanError, cn } from '@/lib/utils';
import { OPSI_STATUS, FILTER_STATUS_AKTIF, OPSI_FILTER_BARANG } from '@/constants/status';
import { RUTE } from '@/constants/routes';
import { invalidasiCache } from '@/lib/cache';
import type { Peminjaman } from '@/types/peminjaman.type';
import type { MetaPagination } from '@/types/barang.type';

// Pilihan jumlah baris yang ditampilkan per halaman
const OPSI_LIMIT = [12, 32, 64, 128, 256, 512];

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

export default function AdminPeminjamanPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterPeminjaman>({ page: 1, limit: 12 });
  const [cari, setCari] = useState('');
  const [mode, setMode] = useState<'list' | 'folder'>('list');
  const [terpilih, setTerpilih] = useState<string[]>([]);
  const [dialogMassal, setDialogMassal] = useState(false);
  const [sedangMassal, setSedangMassal] = useState(false);
  const [dialogSetujui, setDialogSetujui] = useState(false);
  const [sedangSetujui, setSedangSetujui] = useState(false);
  const [catatanSetujui, setCatatanSetujui] = useState('');
  const [dialogSerahkan, setDialogSerahkan] = useState(false);
  const [sedangSerahkan, setSedangSerahkan] = useState(false);
  const [dialogKembalikan, setDialogKembalikan] = useState(false);
  const [sedangKembalikan, setSedangKembalikan] = useState(false);

  // Filter untuk query - saat mode folder, ambil semua data (limit besar)
  // Mode folder langsung pakai limit 10000, tidak terpengaruh filter.limit yang mungkin 12
  const filterQuery = useMemo(() => {
    if (mode === 'folder') {
      // Mode folder: ambil semua data tanpa pagination
      return { ...filter, limit: 10000, page: 1 };
    }
    return { ...filter };
  }, [filter, mode]);

  // Terapkan filter status dan kode satker dari query saat halaman dibuka — mis. ketika
  // datang dari kartu dashboard. Mendukung gabungan dipisah koma (Sedang Aktif).
  // Dibaca di useEffect agar render server & klien identik (aman dari hydration mismatch).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const kodeSatker = params.get('kodeSatker');
    if (status) setFilter((f) => ({ ...f, status: status as never, page: 1 }));
    if (kodeSatker) setFilter((f) => ({ ...f, kodeSatker: kodeSatker as never }));
  }, []);

  const key = useMemo(() => {
    // Gunakan prefix berbeda untuk folder agar cache terpisah dari list
    const prefix = mode === 'folder' ? 'folder-peminjaman' : 'peminjaman';
    return `${prefix}:${JSON.stringify(filterQuery)}`;
  }, [filterQuery, mode]);

  // muat (refetch) memaksa pemuatan ulang sambil tetap menampilkan data lama.
  // Untuk mode folder, langsung gunakan limit 10000 tanpa bergantung pada filter state
  const { data: hasil, sedangMemuat: memuat, refetch: muat } = useQuery<{ data: Peminjaman[]; meta: MetaPagination | null }>(
    key,
    async () => {
      // Untuk mode folder, pastikan limit besar
      const queryFilter = mode === 'folder'
        ? { ...filterQuery, limit: 10000, page: 1 }
        : filterQuery;
      return peminjamanService.getSemua(queryFilter);
    },
    { tampilkanCache: true } // tampilkan data lama saat navigasi pagination
  );
  const data = hasil?.data ?? [];
  const meta = hasil?.meta ?? null;

  // Hitung statistik dari data yang dimuat
  const jumlahMenunggu = data.filter((p) => p.status === 'MENUNGGU').length;
  const jumlahDisetujui = data.filter((p) => p.status === 'DISETUJUI').length;
  const jumlahAktif = data.filter((p) => p.status === 'DIPINJAM' || p.status === 'TERLAMBAT').length;
  // Jumlah satker unik yang muncul di data yang dimuat (berdasarkan kodeSatker di barang).
  const totalSatker = new Set(
    data.flatMap((p) =>
      (p.detail ?? [])
        .map((d) => d.barang?.kodeSatker)
        .filter((k): k is string => !!k)
    )
  ).size;

  // Reset pilihan setiap kali data dimuat ulang
  useEffect(() => {
    setTerpilih([]);
  }, [hasil]);

  // Fetch ulang saat mode berubah ke folder untuk ambil semua data
  useEffect(() => {
    if (mode === 'folder') {
      // Reset pagination dan invalidasi cache folder
      setFilter((f) => ({ ...f, page: 1 }));
      invalidasiCache('folder-peminjaman');
      // Trigger refetch dengan delay kecil untuk memastikan state sudah update
      const timer = setTimeout(() => muat(), 100);
      return () => clearTimeout(timer);
    }
  }, [mode, muat]);

  // Jumlah pengajuan berstatus MENUNGGU di antara yang dipilih (yang bisa di-ACC).
  const jumlahBisaSetujui = data.filter(
    (p) => terpilih.includes(p.id) && p.status === 'MENUNGGU'
  ).length;

  // Jumlah yang bisa ditandai diserahkan (DISETUJUI) & dikonfirmasi kembali (DIPINJAM/TERLAMBAT).
  const jumlahBisaSerahkan = data.filter(
    (p) => terpilih.includes(p.id) && p.status === 'DISETUJUI'
  ).length;
  const jumlahBisaKembalikan = data.filter(
    (p) => terpilih.includes(p.id) && (p.status === 'DIPINJAM' || p.status === 'TERLAMBAT')
  ).length;

  const hapus = async (id: string) => {
    try {
      await peminjamanService.hapus(id);
      notify.suksess('Data peminjaman berhasil dihapus.');
      await muat();
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal menghapus data peminjaman.'));
      throw error; // biar dialog tetap terbuka saat gagal
    }
  };

  const setujuiMassal = async () => {
    setSedangSetujui(true);
    try {
      const { disetujui, dilewati } = await peminjamanService.setujuiMassal(terpilih, catatanSetujui.trim() || undefined);
      if (disetujui > 0) {
        notify.suksess(
          dilewati > 0
            ? `${disetujui} pengajuan disetujui, ${dilewati} dilewati (stok kurang / bukan menunggu).`
            : `${disetujui} pengajuan berhasil disetujui.`
        );
      } else {
        notify.gagal('Tidak ada pengajuan yang dapat disetujui (stok kurang / bukan status menunggu).');
      }
      setDialogSetujui(false);
      setCatatanSetujui('');
      invalidasiCache('peminjaman');
      invalidasiCache('folder-peminjaman');
      await muat();
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal menyetujui data terpilih.'));
    } finally {
      setSedangSetujui(false);
    }
  };

  const serahkanMassal = async () => {
    setSedangSerahkan(true);
    try {
      const { berhasil, dilewati } = await peminjamanService.serahkanMassal(terpilih);
      if (berhasil > 0) {
        notify.suksess(
          dilewati > 0
            ? `${berhasil} barang ditandai diserahkan, ${dilewati} dilewati (bukan status disetujui).`
            : `${berhasil} barang berhasil ditandai diserahkan.`
        );
      } else {
        notify.gagal('Tidak ada peminjaman yang dapat diserahkan (bukan status disetujui).');
      }
      setDialogSerahkan(false);
      invalidasiCache('peminjaman');
      invalidasiCache('folder-peminjaman');
      await muat();
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal menyerahkan barang terpilih.'));
    } finally {
      setSedangSerahkan(false);
    }
  };

  const kembalikanMassal = async () => {
    setSedangKembalikan(true);
    try {
      const { berhasil, dilewati } = await peminjamanService.kembalikanMassal(terpilih);
      if (berhasil > 0) {
        notify.suksess(
          dilewati > 0
            ? `${berhasil} pengembalian dikonfirmasi, ${dilewati} dilewati (tidak sedang dipinjam).`
            : `${berhasil} pengembalian berhasil dikonfirmasi.`
        );
      } else {
        notify.gagal('Tidak ada peminjaman yang dapat dikembalikan (tidak sedang dipinjam).');
      }
      setDialogKembalikan(false);
      invalidasiCache('peminjaman');
      invalidasiCache('folder-peminjaman');
      await muat();
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal mengonfirmasi pengembalian terpilih.'));
    } finally {
      setSedangKembalikan(false);
    }
  };

  const hapusMassal = async () => {
    setSedangMassal(true);
    try {
      const jumlah = await peminjamanService.hapusMassal(terpilih);
      notify.suksess(`${jumlah} data peminjaman berhasil dihapus.`);
      setDialogMassal(false);
      invalidasiCache('peminjaman');
      invalidasiCache('folder-peminjaman');
      await muat();
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal menghapus data terpilih.'));
    } finally {
      setSedangMassal(false);
    }
  };

  // Debounce pencarian
  useEffect(() => {
    const timer = setTimeout(() => setFilter((f) => ({ ...f, q: cari || undefined, page: 1 })), 400);
    return () => clearTimeout(timer);
  }, [cari]);

  return (
    <div className="space-y-gutter">
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
              <ClipboardList className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-jakarta text-2xl font-bold tracking-tight sm:text-3xl">
                  Manajemen Peminjaman
                </h1>
                {meta && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold ring-1 ring-white/25 backdrop-blur-md">
                    <ClipboardList className="h-3.5 w-3.5" />
                    {meta.total} total
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-white/85">Tinjau, setujui, atau tolak pengajuan peminjaman.</p>
            </div>
          </div>

          {/* Tombol aksi */}
          <div className="flex flex-wrap gap-2">
            <ExportModal />
            <ImportPeminjamDialog onSelesai={muat} />
            <Button variant="outline" className="bg-white text-primary hover:bg-white" onClick={() => router.push(RUTE.adminPeminjamanBuat)}>
              <Plus className="h-4 w-4" /> Tambah Peminjaman
            </Button>
          </div>
        </div>

        {/* Mini Stat Cards */}
        {meta && (
          <div className="relative z-10 mt-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <MiniStat
              label="Total Peminjaman"
              value={meta.total}
              icon={<ClipboardList className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
              ring="ring-blue-300/40"
              delay={80}
            />
            <MiniStat
              label="Ditampilkan"
              value={`${data.length} / ${meta.total}`}
              icon={<FileText className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-cyan-500 to-blue-600"
              ring="ring-cyan-300/40"
              delay={140}
            />
            <MiniStat
              label="Menunggu"
              value={jumlahMenunggu}
              icon={<PackageCheck className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-indigo-500 to-blue-600"
              ring="ring-indigo-300/40"
              delay={200}
            />
            <MiniStat
              label="Aktif / Terlambat"
              value={jumlahAktif}
              icon={<PackageCheck className="h-5 w-5" />}
              gradient="bg-gradient-to-br from-blue-600 to-indigo-700"
              ring="ring-blue-300/40"
              delay={260}
            />
          </div>
        )}
      </section>

      {/* Panel tabel */}
      <div className="glass-card overflow-hidden rounded-2xl border border-outline-variant">
        {/* Search di atas sendiri -lebarnya penuh */}
        <div className="border-b border-outline-variant p-stack-md">
          <div className="relative w-full">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
            />
            <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari kode / nama barang / merk / nama peminjam..." className="pl-10" />
          </div>
        </div>

        {/* Filter baris: Status, Asal Data, Kode Satker, Toggle */}
        <div className="flex flex-wrap items-center gap-2 border-b border-outline-variant bg-muted/20 px-stack-md py-2">
          <Select
            value={filter.status || ''}
            onChange={(e) => setFilter((f) => ({ ...f, status: (e.target.value || undefined) as never, page: 1 }))}
            className="w-40"
          >
            <option value="">Semua Status</option>
            <option value={FILTER_STATUS_AKTIF}>Sedang Aktif</option>
            {OPSI_STATUS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select
            value={filter.importMode || ''}
            onChange={(e) => setFilter((f) => ({ ...f, importMode: (e.target.value || undefined) as never, page: 1 }))}
            className="w-32"
          >
            <option value="">Semua Asal</option>
            <option value="import">Import</option>
            <option value="manual">Manual</option>
          </Select>
          <Select
            value={filter.kodeSatker || ''}
            onChange={(e) => setFilter((f) => ({ ...f, kodeSatker: (e.target.value || undefined) as never, page: 1 }))}
            className="w-52"
          >
            <option value="">Semua Kode Satker</option>
            {OPSI_FILTER_BARANG.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>

          {/* Switch tampilan: list ↔ folder */}
          <button
            type="button"
            role="switch"
            aria-checked={mode === 'folder'}
            onClick={() => {
              setMode((m) => (m === 'list' ? 'folder' : 'list'));
              setTerpilih([]);
            }}
            className="ml-auto flex h-9 shrink-0 items-center gap-2 rounded-lg border border-input bg-background px-3 transition-colors hover:bg-primary/5"
          >
            <span className="text-sm text-on-surface-variant">
              {mode === 'list' ? 'List' : 'Folder'}
            </span>
            <span
              className={cn(
                'relative flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
                mode === 'folder' ? 'bg-primary' : 'bg-outline-variant'
              )}
            >
              <span
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-full bg-white shadow transition-transform',
                  mode === 'folder' ? 'translate-x-4' : 'translate-x-0.5'
                )}
              >
                {mode === 'folder' ? (
                  <FolderTree className="h-2.5 w-2.5 text-primary" />
                ) : (
                  <List className="h-2.5 w-2.5 text-on-surface-variant" />
                )}
              </span>
            </span>
          </button>
        </div>

        {/* Legenda: import / migrasi data */}
        <div className="flex flex-wrap items-center gap-4 border-b border-outline-variant bg-muted/20 px-stack-md py-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
              <Upload className="h-3 w-3" />
              Import
            </span>
            = Data migrasi
          </span>
        </div>

        {/* Bilah aksi massal — muncul saat ada baris terpilih */}
        {!memuat && data.length > 0 && terpilih.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant bg-primary/5 p-stack-md">
            <span className="text-sm font-medium text-on-surface">{terpilih.length} peminjaman dipilih</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setTerpilih([])}>
                <X className="h-4 w-4" /> Batal
              </Button>
              {jumlahBisaSetujui > 0 && (
                <Button variant="sukses" size="sm" onClick={() => setDialogSetujui(true)}>
                  <CheckCheck className="h-4 w-4" /> Setujui ({jumlahBisaSetujui})
                </Button>
              )}
              {jumlahBisaSerahkan > 0 && (
                <Button size="sm" onClick={() => setDialogSerahkan(true)}>
                  <PackageCheck className="h-4 w-4" /> Serahkan ({jumlahBisaSerahkan})
                </Button>
              )}
              {jumlahBisaKembalikan > 0 && (
                <Button variant="secondary" size="sm" onClick={() => setDialogKembalikan(true)}>
                  <Undo2 className="h-4 w-4" /> Konfirmasi Pengembalian ({jumlahBisaKembalikan})
                </Button>
              )}
              <Button variant="destructive" size="sm" onClick={() => setDialogMassal(true)}>
                <Trash2 className="h-4 w-4" /> Hapus Terpilih
              </Button>
            </div>
          </div>
        )}

        {memuat ? (
          <div className="p-stack-lg">
            <LoadingSpinner />
          </div>
        ) : data.length === 0 ? (
          <div className="p-stack-lg">
            <EmptyState ikon={ClipboardList} judul="Belum ada peminjaman" deskripsi="Tidak ada data peminjaman yang cocok dengan filter." />
          </div>
        ) : (
          <div className="p-stack-md">
            {mode === 'list' ? (
              <TabelPeminjaman
                data={data}
                hrefDetail={RUTE.adminPeminjamanDetail}
                tampilkanPeminjam
                tampilkanMerk
                onHapus={hapus}
                terpilih={terpilih}
                onUbahTerpilih={setTerpilih}
              />
            ) : (
              <FolderSatkerPeminjaman
                data={data}
                hrefDetail={RUTE.adminPeminjamanDetail}
                onHapus={hapus}
                terpilih={terpilih}
                onUbahTerpilih={setTerpilih}
              />
            )}
            {mode === 'list' && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-card">
                {/* Progress bar */}
                {meta && meta.totalHalaman > 1 && (
                  <div className="h-1 bg-gray-100">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-500"
                      style={{ width: `${(meta.page / meta.totalHalaman) * 100}%` }}
                    />
                  </div>
                )}
                <div className="flex flex-col items-center justify-between gap-4 px-6 py-4 sm:flex-row">
                  {/* Info stat */}
                  <div className="flex items-center gap-4">
                    {meta && (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="rounded-lg bg-primary/10 px-3 py-1.5 font-medium text-primary">
                            {meta.total}
                          </span>
                          <span className="text-muted-foreground">total peminjaman</span>
                        </div>
                        <div className="h-5 w-px bg-gray-200" />
                        <div className="flex items-center gap-2 text-sm">
                          <span className="rounded-lg bg-blue-50 px-3 py-1.5 font-medium text-blue-600">
                            {data.length}
                          </span>
                          <span className="text-muted-foreground">ditampilkan</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Page size selector */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Tampilkan</span>
                    <Select
                      value={String(filter.limit ?? 12)}
                      onChange={(e) => setFilter((f) => ({ ...f, limit: Number(e.target.value), page: 1 }))}
                      className="h-9 w-[4.5rem]"
                      aria-label="Jumlah peminjaman per halaman"
                    >
                      {OPSI_LIMIT.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </Select>
                    <span>/ halaman</span>
                  </div>

                  {/* Navigasi halaman */}
                  {meta && meta.totalHalaman > 1 && (
                    <div className="flex items-center gap-3">
                      <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700">
                        <span className="text-primary">{meta.page}</span>
                        <span className="text-muted-foreground"> / {meta.totalHalaman}</span>
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={meta.page <= 1}
                          onClick={() => setFilter((f) => ({ ...f, page: (f.page || 1) - 1 }))}
                          className="h-8 w-8 p-0 transition-all active:scale-95"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={meta.page >= meta.totalHalaman}
                          onClick={() => setFilter((f) => ({ ...f, page: (f.page || 1) + 1 }))}
                          className="h-8 gap-1.5 px-4 transition-all active:scale-95"
                        >
                          Berikutnya
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <KonfirmasiDialog
        terbuka={dialogSetujui}
        onUbahTerbuka={(o) => {
          if (!o) {
            setDialogSetujui(false);
            setCatatanSetujui('');
          }
        }}
        judul="Setujui Pengajuan Terpilih"
        deskripsi={`Setujui ${jumlahBisaSetujui} pengajuan berstatus "Menunggu"? Stok barang akan dikurangi dan QR Code dibuat untuk tiap peminjaman. Pengajuan dengan stok tidak mencukupi akan dilewati.`}
        teksKonfirmasi={`Ya, Setujui ${jumlahBisaSetujui}`}
        variantKonfirmasi="sukses"
        sedangProses={sedangSetujui}
        onKonfirmasi={setujuiMassal}
      >
        <div>
          <Label htmlFor="catatan-setujui-massal">Catatan (opsional)</Label>
          <Textarea
            id="catatan-setujui-massal"
            value={catatanSetujui}
            onChange={(e) => setCatatanSetujui(e.target.value)}
            placeholder="Catatan tambahan untuk peminjam..."
            className="mt-1"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Catatan ini dikirim ke seluruh {jumlahBisaSetujui} peminjaman yang disetujui dan dapat dilihat peminjam.
          </p>
        </div>
      </KonfirmasiDialog>

      <KonfirmasiDialog
        terbuka={dialogSerahkan}
        onUbahTerbuka={(o) => !o && setDialogSerahkan(false)}
        judul="Serahkan Barang Terpilih"
        deskripsi={`Tandai ${jumlahBisaSerahkan} peminjaman berstatus "Disetujui" sebagai telah diserahkan kepada peminjam? Peminjaman dengan status lain akan dilewati.`}
        teksKonfirmasi={`Ya, Serahkan ${jumlahBisaSerahkan}`}
        variantKonfirmasi="sukses"
        sedangProses={sedangSerahkan}
        onKonfirmasi={serahkanMassal}
      />

      <KonfirmasiDialog
        terbuka={dialogKembalikan}
        onUbahTerbuka={(o) => !o && setDialogKembalikan(false)}
        judul="Konfirmasi Pengembalian Terpilih"
        deskripsi={`Konfirmasi pengembalian ${jumlahBisaKembalikan} peminjaman yang sedang dipinjam? Stok barang akan dikembalikan otomatis ke sistem. Peminjaman dengan status lain akan dilewati.`}
        teksKonfirmasi={`Ya, Kembalikan ${jumlahBisaKembalikan}`}
        variantKonfirmasi="sukses"
        sedangProses={sedangKembalikan}
        onKonfirmasi={kembalikanMassal}
      />

      <KonfirmasiDialog
        terbuka={dialogMassal}
        onUbahTerbuka={(o) => !o && setDialogMassal(false)}
        judul="Hapus Peminjaman Terpilih"
        deskripsi={`Hapus ${terpilih.length} data peminjaman yang dipilih? Untuk barang yang masih dipinjam, stok dikembalikan otomatis. Tindakan ini tidak dapat dibatalkan.`}
        teksKonfirmasi={`Ya, Hapus ${terpilih.length} Data`}
        variantKonfirmasi="destructive"
        sedangProses={sedangMassal}
        onKonfirmasi={hapusMassal}
      />
    </div>
  );
}
