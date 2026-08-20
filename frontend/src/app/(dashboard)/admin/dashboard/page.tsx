// ============================================================
//  Dashboard Admin - ringkasan statistik & grafik.
//  OPTIMASI: Dialog di-lazy-load menggunakan next/dynamic
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Icon } from '@/components/ui/icon';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { TabelPeminjaman } from '@/components/peminjaman/TabelPeminjaman';
import { ExportModal } from '@/components/export/ExportModal';
import { dashboardService, type DashboardFilter } from '@/services/dashboard.service';
import { useQuery } from '@/lib/cache';
import { cn } from '@/lib/utils';
import { STATUS_PEMINJAMAN, FILTER_STATUS_AKTIF } from '@/constants/status';
import { RUTE } from '@/constants/routes';
import type { KategoriDashboard } from '@/services/dashboard.service';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { peminjamanService } from '@/services/peminjaman.service';
import { barangService } from '@/services/barang.service';

// ============================================================
//  LAZY LOADED COMPONENTS
//  Dialog di-load saat dibutuhkan, bukan saat page mount
// ============================================================
const DialogRentangWaktu = dynamic(
  () => import('@/components/dashboard/DialogRentangWaktu').then(m => m.DialogRentangWaktu),
  { loading: () => null, ssr: false }
);

const DialogKonfirmasiSatker = dynamic(
  () => import('@/components/dashboard/DialogKonfirmasiSatker').then(m => m.DialogKonfirmasiSatker),
  { loading: () => null, ssr: false }
);

// Data kartu kode satker
const KODE_SATKER = [
  { kode: '015110199411868000KP', label: 'Sekretariat Badan Pendidikan dan Pelatihan Keuangan' },
  { kode: '015110199411868001KP', label: 'Pusat Pembinaan Jabatan Fungsional dan Peminjaman Mutu' },
  { kode: '015110199411868002KP', label: 'Pusat Pendidikan dan Pelatihan Anggaran dan Pembendaharaan' },
  { kode: '015110199411868003KP', label: 'Pusat Pendidikan dan Pelatihan Pajak' },
  { kode: '015110199411868004KP', label: 'Pusat Pendidikan dan Pelatihan Bea dan Cukai' },
  { kode: '015110199411868005KP', label: 'Pusat Pendidikan dan Pelatihan Keuangan Publik' },
  { kode: '015110199411868006KP', label: 'Pusat Pendidikan dan Pelatihan Kepemimpinan dan Manajemen' },
];

// Fungsi untuk mengambil jumlah data berdasarkan kode satker
async function ambilJumlahSatker(kodeSatker: string) {
  try {
    // Ambil semua data peminjaman untuk satker ini
    const semuaPeminjaman: any[] = [];
    let page = 1;
    const limit = 100;

    while (true) {
      const res = await peminjamanService.getSemua({ kodeSatker, page, limit });
      semuaPeminjaman.push(...res.data);
      if (page >= res.meta.totalHalaman) break;
      page++;
    }

    // Ambil semua barang untuk satker ini
    const semuaBarang = await barangService.getSemuaLengkap({ kodeSatker });

    const counts = {
      menunggu: semuaPeminjaman.filter((p) => p.status === 'MENUNGGU').length,
      disetujui: semuaPeminjaman.filter((p) => p.status === 'DISETUJUI').length,
      dipinjam: semuaPeminjaman.filter((p) => p.status === 'DIPINJAM').length,
      dikembalikan: semuaPeminjaman.filter((p) => p.status === 'DIKEMBALIKAN').length,
      terlambat: semuaPeminjaman.filter((p) => p.status === 'TERLAMBAT').length,
      ditolak: semuaPeminjaman.filter((p) => p.status === 'DITOLAK').length,
      totalBarang: semuaBarang.length,
      stokTersedia: semuaBarang.filter((b) => (b.jumlahTersedia ?? 0) > 0).length,
      stokHabis: semuaBarang.filter((b) => (b.jumlahTersedia ?? 0) === 0).length,
    };

    return counts;
  } catch (error) {
    console.error('Gagal mengambil jumlah satker:', error);
    return null;
  }
}

// Kartu yang mewakili status peminjaman diarahkan ke Manajemen Peminjaman
// dengan filter status terkait (alih-alih halaman kategori dashboard).
const STATUS_KARTU: Partial<Record<KategoriDashboard, string>> = {
  pengajuan_menunggu: 'MENUNGGU',
  peminjaman_aktif: FILTER_STATUS_AKTIF,
  barang_terlambat: 'TERLAMBAT',
};

// Tentukan tujuan navigasi untuk sebuah kartu/baris dashboard.
function tujuanKategori(kategori: KategoriDashboard): string {
  if (kategori === 'barang') return RUTE.adminBarang;
  const status = STATUS_KARTU[kategori];
  if (status) return RUTE.adminPeminjamanStatus(status);
  return RUTE.adminKategori(kategori);
}

// Palet gradasi batang grafik "Ringkasan Aktivitas" - warna semantik per status
// (bar = isian batang, teks = angka di kanan, titik = penanda bulat di label).
interface GayaBar {
  bar: string;
  teks: string;
  titik: string;
  ikon: string;
}
const WARNA_BAR: Record<string, GayaBar> = {
  DRAFT: { bar: 'from-slate-400 to-slate-500', teks: 'text-slate-600', titik: 'bg-slate-400', ikon: 'edit' },
  MENUNGGU: { bar: 'from-amber-400 to-amber-500', teks: 'text-amber-700', titik: 'bg-amber-400', ikon: 'pending_actions' },
  DISETUJUI: { bar: 'from-green-400 to-green-600', teks: 'text-green-700', titik: 'bg-green-500', ikon: 'check_circle' },
  DITOLAK: { bar: 'from-red-400 to-red-600', teks: 'text-red-700', titik: 'bg-red-500', ikon: 'cancel' },
  DIPINJAM: { bar: 'from-pink-400 to-pink-600', teks: 'text-pink-700', titik: 'bg-pink-500', ikon: 'sync_alt' },
  DIKEMBALIKAN: { bar: 'from-teal-400 to-teal-600', teks: 'text-teal-700', titik: 'bg-teal-500', ikon: 'assignment_return' },
  TERLAMBAT: { bar: 'from-orange-400 to-orange-600', teks: 'text-orange-700', titik: 'bg-orange-500', ikon: 'report' },
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [filterTanggal, setFilterTanggal] = useState<DashboardFilter>({});
  const [dialogTerbuka, setDialogTerbuka] = useState(false);
  const [dialogSatkerTerbuka, setDialogSatkerTerbuka] = useState(false);
  const [satkerTerpilih, setSatkerTerpilih] = useState<{ kode: string; label: string } | null>(null);
  const [countsMemuat, setCountsMemuat] = useState(false);
  const [countsData, setCountsData] = useState<{
    menunggu: number;
    disetujui: number;
    dipinjam: number;
    dikembalikan: number;
    terlambat: number;
    ditolak: number;
    totalBarang: number;
    stokTersedia: number;
    stokHabis: number;
  } | null>(null);

  // State untuk filter satker di Ringkasan Aktivitas
  const [satkerAktivitasTerpilih, setSatkerAktivitasTerpilih] = useState<string>('');
  const [dialogPilihSatkerAktivitasTerbuka, setDialogPilihSatkerAktivitasTerbuka] = useState(false);

  // Ambil label satker berdasarkan kode
  const getLabelSatker = (kode: string) => {
    if (!kode) return 'Semua Satker';
    const satker = KODE_SATKER.find(s => s.kode === kode);
    return satker?.label || kode;
  };

  // Cache key berdasarkan filter agar data berubah saat filter berubah
  const cacheKey = `dashboard-admin:${JSON.stringify(filterTanggal)}:${satkerAktivitasTerpilih}`;
  const { data, sedangMemuat } = useQuery(cacheKey, () =>
    dashboardService.admin({
      ...filterTanggal,
      kodeSatker: satkerAktivitasTerpilih || undefined
    })
  );

  // Animasi "tumbuh" batang grafik: mulai dari 0, lalu melebar ke nilai sebenarnya.
  const [barTampil, setBarTampil] = useState(false);
  useEffect(() => {
    if (sedangMemuat) return;
    const id = setTimeout(() => setBarTampil(true), 80);
    return () => clearTimeout(id);
  }, [sedangMemuat]);

  if (sedangMemuat && !data) return <LoadingSpinner layarPenuh />;
  if (!data) return null;

  const s = data.statistik;

  const maxGrafik = Math.max(1, ...data.grafikStatus.map((g) => g.jumlah));

  const adaFilter = filterTanggal.dari || filterTanggal.sampai;

  return (
    <div className="space-y-gutter">
      <DialogRentangWaktu
        terbuka={dialogTerbuka}
        onUbahTerbuka={setDialogTerbuka}
        filterAktif={filterTanggal}
        onFilter={setFilterTanggal}
      />

      <DialogKonfirmasiSatker
        terbuka={dialogSatkerTerbuka}
        onUbahTerbuka={setDialogSatkerTerbuka}
        kodeSatker={satkerTerpilih?.kode || ''}
        label={satkerTerpilih?.label || ''}
        counts={countsData}
        memuat={countsMemuat}
        onPilih={(tujuan) => {
          if (!satkerTerpilih) return;
          const kodeSatker = satkerTerpilih.kode;

          if (tujuan.startsWith('peminjaman:')) {
            const status = tujuan.replace('peminjaman:', '');
            // Navigasi ke halaman peminjaman dengan filter status dan kode satker
            router.push(`${RUTE.adminPeminjaman}?status=${status}&kodeSatker=${kodeSatker}`);
          } else if (tujuan.startsWith('barang:')) {
            const jenis = tujuan.replace('barang:', '');
            // Navigasi ke halaman barang dengan filter sesuai jenis
            if (jenis === 'totalBarang') {
              router.push(`${RUTE.adminBarang}?kodeSatker=${kodeSatker}`);
            } else if (jenis === 'stokTersedia') {
              router.push(`${RUTE.adminBarang}?kodeSatker=${kodeSatker}&stok=tersedia`);
            } else if (jenis === 'stokHabis') {
              router.push(`${RUTE.adminBarang}?kodeSatker=${kodeSatker}&stok=habis`);
            }
          }
        }}
      />

      {/* Hero eksekutif */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-6 text-white shadow-lg shadow-blue-700/20 animate-page-in sm:p-8">
        {/* Dekorasi blob & grid pattern */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-cyan-300/30 blur-3xl" />
          <div className="absolute -right-32 -bottom-32 h-80 w-80 rounded-full bg-indigo-400/25 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
        </div>

        <div className="relative z-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="mb-1 flex items-center gap-2 font-label-sm uppercase tracking-widest text-white/70">
              <Icon name="space_dashboard" className="text-[16px]" fill />
              Dashboard Admin
            </p>
            <h1 className="font-jakarta text-headline-lg-mobile text-white sm:text-headline-lg">Ringkasan Eksekutif</h1>
            <p className="text-white/80">
              Monitoring real-time aset dan inventaris Kementerian Keuangan.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              onClick={() => setDialogTerbuka(true)}
              className={cn(
                'w-full backdrop-blur-sm sm:w-auto',
                adaFilter
                  ? 'gap-2 bg-white text-primary hover:bg-white/90'
                  : 'bg-white text-primary hover:bg-white/90',
              )}
            >
              <Icon name="calendar_today" className="text-[18px]" />
              <span className="hidden sm:inline">Rentang Waktu</span>
              <span className="sm:hidden">Filter</span>
              {adaFilter && (
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-xs">
                  <X className="h-3 w-3" onClick={(e) => {
                    e.stopPropagation();
                    setFilterTanggal({});
                  }} />
                </span>
              )}
            </Button>
            <ExportModal
              trigger={
                <Button className="w-full bg-white text-primary backdrop-blur-sm hover:bg-white/90 sm:w-auto">
                  <Icon name="download" className="text-[18px]" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              }
            />
          </div>
        </div>
      </section>

      {/* Label filter aktif */}
      {adaFilter && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon name="filter_list" className="text-[16px]" />
          <span>
            Menampilkan data dari{' '}
            <strong>{filterTanggal.dari || 'tanggal awal'}</strong>
            {' '}sampai{' '}
            <strong>{filterTanggal.sampai || 'sekarang'}</strong>
          </span>
        </div>
      )}

      {/* Kartu Ringkasan Dashboard */}
      <section className="rounded-3xl border-2 border-slate-200/50 bg-gradient-to-br from-white to-slate-50 p-8 shadow-lg">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-primary/30">
            <Icon name="space_dashboard" className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="font-jakarta text-xl font-bold text-slate-800">Dashboard Overview</h2>
            <p className="text-sm text-muted-foreground">Ringkasan data peminjaman dan inventaris</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Kolom Kiri: Ringkasan General */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-500/30">
                <Icon name="swap_horiz" className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-jakarta text-base font-bold text-slate-800">Ringkasan General</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Card 1: Pengajuan Menunggu */}
              <button
                onClick={() => router.push(RUTE.adminPeminjamanStatus('MENUNGGU'))}
                className="group relative"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative flex flex-col items-center gap-3 rounded-2xl border-2 border-slate-200/50 bg-white p-5 shadow-md transition-all duration-300 hover:border-amber-300/50 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]">
                  <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r from-amber-400 to-orange-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-xl">
                    <Icon name="pending_actions" className="h-7 w-7 text-white" />
                  </div>
                  <span className="font-jakarta text-3xl font-bold text-amber-600">{s.pengajuanMenunggu}</span>
                  <span className="text-center text-sm font-semibold text-slate-600">Pengajuan Menunggu</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 transition-all duration-300 group-hover:translate-x-1 group-hover:bg-amber-100 opacity-0 group-hover:opacity-100">
                    <Icon name="chevron_right" className="h-4 w-4 text-amber-500" />
                  </div>
                </div>
              </button>

              {/* Card 2: Penyetujuan Pinjaman */}
              <button
                onClick={() => router.push(RUTE.adminPeminjamanStatus('DISETUJUI'))}
                className="group relative"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-teal-600/20 opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative flex flex-col items-center gap-3 rounded-2xl border-2 border-slate-200/50 bg-white p-5 shadow-md transition-all duration-300 hover:border-emerald-300/50 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]">
                  <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r from-emerald-400 to-teal-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/30 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-xl">
                    <Icon name="verified" className="h-7 w-7 text-white" />
                  </div>
                  <span className="font-jakarta text-3xl font-bold text-emerald-600">
                    {data.grafikStatus.find(g => g.status === 'DISETUJUI')?.jumlah ?? 0}
                  </span>
                  <span className="text-center text-sm font-semibold text-slate-600">Penyetujuan Pinjaman</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 transition-all duration-300 group-hover:translate-x-1 group-hover:bg-emerald-100 opacity-0 group-hover:opacity-100">
                    <Icon name="chevron_right" className="h-4 w-4 text-emerald-500" />
                  </div>
                </div>
              </button>

              {/* Card 3: Peminjaman Aktif */}
              <button
                onClick={() => router.push(RUTE.adminPeminjamanStatus('DIPINJAM'))}
                className="group relative"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-400/20 to-rose-600/20 opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative flex flex-col items-center gap-3 rounded-2xl border-2 border-slate-200/50 bg-white p-5 shadow-md transition-all duration-300 hover:border-pink-300/50 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]">
                  <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r from-pink-400 to-rose-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-pink-400 to-rose-600 shadow-lg shadow-pink-500/30 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-xl">
                    <Icon name="sync_alt" className="h-7 w-7 text-white" />
                  </div>
                  <span className="font-jakarta text-3xl font-bold text-pink-600">{s.peminjamanAktif}</span>
                  <span className="text-center text-sm font-semibold text-slate-600">Peminjaman Aktif</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 transition-all duration-300 group-hover:translate-x-1 group-hover:bg-pink-100 opacity-0 group-hover:opacity-100">
                    <Icon name="chevron_right" className="h-4 w-4 text-pink-500" />
                  </div>
                </div>
              </button>

              {/* Card 4: Barang Dikembalikan */}
              <button
                onClick={() => router.push(RUTE.adminPeminjamanStatus('DIKEMBALIKAN'))}
                className="group relative"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-blue-600/20 opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative flex flex-col items-center gap-3 rounded-2xl border-2 border-slate-200/50 bg-white p-5 shadow-md transition-all duration-300 hover:border-cyan-300/50 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]">
                  <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r from-cyan-400 to-blue-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/30 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-xl">
                    <Icon name="assignment_return" className="h-7 w-7 text-white" />
                  </div>
                  <span className="font-jakarta text-3xl font-bold text-blue-600">
                    {data.grafikStatus.find(g => g.status === 'DIKEMBALIKAN')?.jumlah ?? 0}
                  </span>
                  <span className="text-center text-sm font-semibold text-slate-600">Barang Dikembalikan</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 transition-all duration-300 group-hover:translate-x-1 group-hover:bg-cyan-100 opacity-0 group-hover:opacity-100">
                    <Icon name="chevron_right" className="h-4 w-4 text-cyan-500" />
                  </div>
                </div>
              </button>
            </div>

          </div>

          {/* Kolom Kanan: Inventaris Barang */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/30">
                <Icon name="inventory_2" className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-jakarta text-base font-bold text-slate-800">Inventaris Barang</h3>
            </div>

            <div className="space-y-4">
              {/* Total Barang */}
              <button
                onClick={() => router.push(RUTE.adminBarang)}
                className="group relative w-full"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-indigo-600/20 opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative flex items-center justify-between rounded-2xl border-2 border-slate-200/50 bg-white p-4 shadow-md transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]">
                  <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r from-primary to-indigo-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-primary/30 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-xl">
                      <Icon name="inventory" className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-semibold text-slate-500">Total Barang</span>
                      <p className="font-jakarta text-2xl font-bold text-primary">{s.totalBarang}</p>
                    </div>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 transition-all duration-300 group-hover:translate-x-1 group-hover:bg-primary/10 opacity-0 group-hover:opacity-100">
                    <Icon name="chevron_right" className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </button>

              {/* Stok Tersedia */}
              <button
                onClick={() => router.push(RUTE.adminBarangStok('tersedia'))}
                className="group relative w-full"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-green-400/20 to-emerald-600/20 opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative flex items-center justify-between rounded-2xl border-2 border-slate-200/50 bg-white p-4 shadow-md transition-all duration-300 hover:border-green-300/50 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]">
                  <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r from-green-400 to-emerald-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg shadow-green-500/30 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-xl">
                      <Icon name="check_circle" className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-semibold text-slate-500">Stok Tersedia</span>
                      <p className="font-jakarta text-2xl font-bold text-secondary">{s.stokTersedia}</p>
                    </div>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 transition-all duration-300 group-hover:translate-x-1 group-hover:bg-green-100 opacity-0 group-hover:opacity-100">
                    <Icon name="chevron_right" className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              </button>

              {/* Stok Habis */}
              <button
                onClick={() => router.push(RUTE.adminBarangStok('habis'))}
                className="group relative w-full"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-400/20 to-rose-600/20 opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative flex items-center justify-between rounded-2xl border-2 border-slate-200/50 bg-white p-4 shadow-md transition-all duration-300 hover:border-red-300/50 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]">
                  <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r from-red-400 to-rose-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-400 to-rose-600 shadow-lg shadow-red-500/30 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-xl">
                      <Icon name="error" className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-semibold text-slate-500">Stok Habis</span>
                      <p className="font-jakarta text-2xl font-bold text-error">{s.stokHabis}</p>
                    </div>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 transition-all duration-300 group-hover:translate-x-1 group-hover:bg-red-100 opacity-0 group-hover:opacity-100">
                    <Icon name="chevron_right" className="h-5 w-5 text-red-500" />
                  </div>
                </div>
              </button>

              {/* Total Peminjam */}
              <button
                onClick={() => router.push(RUTE.adminKategori('peminjam'))}
                className="group relative w-full"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative flex items-center justify-between rounded-2xl border-2 border-slate-200/50 bg-white p-4 shadow-md transition-all duration-300 hover:border-violet-300/50 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]">
                  <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r from-violet-500 to-purple-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-xl">
                      <Icon name="group" className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-semibold text-slate-500">Total Peminjam</span>
                      <p className="font-jakarta text-2xl font-bold text-violet-600">{s.totalPeminjam}</p>
                    </div>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 transition-all duration-300 group-hover:translate-x-1 group-hover:bg-violet-100 opacity-0 group-hover:opacity-100">
                    <Icon name="chevron_right" className="h-5 w-5 text-violet-500" />
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Kartu Kode Satker */}
      <section className="rounded-3xl border-2 border-slate-200/50 bg-gradient-to-br from-white to-slate-50 p-8 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-primary/30">
            <Icon name="location_city" className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-jakarta text-xl font-bold text-slate-800">Pilih Kode Satker</h3>
            <p className="text-sm text-muted-foreground">Klik kartu untuk memilih kode satker yang akan diakses</p>
          </div>
        </div>
        <div className="grid auto-fit min-h-[120px] grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
          {KODE_SATKER.map((satker, indeks) => (
            <button
              key={satker.kode}
              onClick={async () => {
                setSatkerTerpilih(satker);
                setCountsMemuat(true);
                setCountsData(null);
                setDialogSatkerTerbuka(true);
                // Ambil data jumlah
                const counts = await ambilJumlahSatker(satker.kode);
                setCountsData(counts);
                setCountsMemuat(false);
              }}
              style={{ animationDelay: `${indeks * 60}ms` }}
              className="group relative flex min-h-[108px] animate-page-in items-center rounded-2xl border-2 border-slate-200/50 bg-white p-4 shadow-md transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:-translate-y-2 active:scale-[0.98]"
            >
              {/* Gradient top border on hover */}
              <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r from-primary to-indigo-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              {/* Icon */}
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-primary/30 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-xl">
                <Icon name="domain" className="h-7 w-7 text-white" />
              </div>

              {/* Text */}
              <div className="ml-4 min-w-0 flex-1 text-left">
                <p className="break-words font-semibold leading-snug text-slate-700 transition-colors group-hover:text-primary">{satker.label}</p>
                <p className="mt-1 font-mono text-xs font-medium text-slate-500">{satker.kode}</p>
              </div>

              {/* Arrow - only visible on hover */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:bg-primary/10 group-hover:opacity-100">
                <Icon name="arrow_forward" className="h-5 w-5 text-slate-400 transition-colors group-hover:text-primary" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Ringkasan Aktivitas */}
      <section className="rounded-3xl border-2 border-slate-200/50 bg-gradient-to-br from-white to-slate-50 p-8 shadow-lg">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-primary/30">
              <Icon name="bar_chart" className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-jakarta text-xl font-bold text-slate-800">Ringkasan Aktivitas</h3>
              <p className="text-sm text-muted-foreground">Distribusi peminjaman berdasarkan status</p>
            </div>
          </div>

          {/* Dropdown Pilih Satker */}
          <div className="relative">
            <button
              onClick={() => setDialogPilihSatkerAktivitasTerbuka(!dialogPilihSatkerAktivitasTerbuka)}
              className={cn(
                'flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:text-primary',
                satkerAktivitasTerpilih && 'border-primary/30 bg-primary/5 text-primary'
              )}
            >
              <Icon name="filter_list" className="h-4 w-4 text-primary" />
              <span>{getLabelSatker(satkerAktivitasTerpilih)}</span>
              <Icon
                name={dialogPilihSatkerAktivitasTerbuka ? 'expand_less' : 'expand_more'}
                className="h-4 w-4 text-slate-400"
              />
            </button>

            {/* Dropdown Menu */}
            {dialogPilihSatkerAktivitasTerbuka && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDialogPilihSatkerAktivitasTerbuka(false)}
                />

                {/* Menu */}
                <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-slate-200/50 bg-white shadow-xl">
                  {/* Header */}
                  <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-primary/5 to-indigo-500/5 px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-indigo-600 shadow-md">
                      <Icon name="location_city" className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">Filter Satker</span>
                  </div>

                  {/* Semua Satker */}
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setSatkerAktivitasTerpilih('');
                        setDialogPilihSatkerAktivitasTerbuka(false);
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200',
                        !satkerAktivitasTerpilih
                          ? 'bg-primary/10 text-primary'
                          : 'text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      <Icon name="globe" className="h-5 w-5 shrink-0" />
                      <span>Semua Satker</span>
                      {!satkerAktivitasTerpilih && (
                        <Icon name="check" className="ml-auto h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  </div>

                  <div className="mx-3 h-px bg-slate-100" />

                  {/* Label */}
                  <div className="px-4 py-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Atau pilih satker tertentu
                    </span>
                  </div>

                  {/* Daftar Satker */}
                  <div className="max-h-64 overflow-y-auto p-2 pt-0">
                    {KODE_SATKER.map((satker, indeks) => (
                      <button
                        key={satker.kode}
                        onClick={() => {
                          setSatkerAktivitasTerpilih(satker.kode);
                          setDialogPilihSatkerAktivitasTerbuka(false);
                        }}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200',
                          satkerAktivitasTerpilih === satker.kode
                            ? 'bg-primary/10 text-primary'
                            : 'text-slate-600 hover:bg-slate-50'
                        )}
                      >
                        {/* Number badge */}
                        <div className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                          satkerAktivitasTerpilih === satker.kode
                            ? 'bg-primary text-white'
                            : 'bg-slate-100 text-slate-500'
                        )}>
                          {indeks}
                        </div>

                        <div className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{satker.label}</span>
                          <span className="block truncate font-mono text-[10px] text-slate-400">
                            {satker.kode.slice(-3)}
                          </span>
                        </div>

                        {satkerAktivitasTerpilih === satker.kode && (
                          <Icon name="check" className="h-4 w-4 shrink-0 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-end gap-3 pt-4">
          {data.grafikStatus.map((g) => {
            const info = STATUS_PEMINJAMAN[g.status];
            const w = WARNA_BAR[g.status] ?? WARNA_BAR.DIPINJAM;
            const persen = Math.max((g.jumlah / maxGrafik) * 100, g.jumlah > 0 ? 8 : 0);
            return (
              <div
                key={g.status}
                onClick={() => router.push(RUTE.adminPeminjamanStatus(g.status))}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(RUTE.adminPeminjamanStatus(g.status));
                  }
                }}
                title={`Lihat peminjaman berstatus ${info.label}`}
                className="group relative flex cursor-pointer items-center gap-3 rounded-xl border-2 border-slate-200/50 bg-white px-4 py-3 shadow-sm transition-all duration-300 hover:border-slate-300/70 hover:shadow-md hover:-translate-y-0.5"
              >
                {/* Gradient top border on hover */}
                <div className={cn(
                  'absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100',
                  w.bar
                )} />

                <span className="flex w-32 shrink-0 items-center gap-2 sm:w-40">
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br shadow-md transition-transform duration-300 group-hover:scale-110', w.bar)}>
                    <Icon name={info.icon} className="h-5 w-5 text-white" />
                  </div>
                  <span className="hidden text-sm font-semibold text-slate-600 sm:inline">{info.label}</span>
                  <span className="text-xs font-medium text-slate-500 sm:hidden">{info.label.split(' ')[0]}</span>
                </span>
                <div className="h-6 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn(
                      'flex h-full items-center justify-end rounded-full bg-gradient-to-r px-2 text-xs font-bold text-white shadow-sm transition-[width,filter] duration-700 ease-out group-hover:brightness-110',
                      w.bar,
                    )}
                    style={{ width: barTampil ? `${persen}%` : '0%' }}
                  >
                    {g.jumlah > 0 && g.jumlah}
                  </div>
                </div>
                <span className={cn('w-10 text-right text-sm font-bold tabular-nums', w.teks)}>{g.jumlah}</span>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 transition-all duration-300 group-hover:translate-x-1 group-hover:bg-slate-200">
                  <Icon name="chevron_right" className="h-5 w-5 text-slate-400" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Peminjaman Terbaru */}
      <section className="glass-card overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-outline-variant bg-white/40 p-stack-lg">
          <h3 className="flex items-center gap-2 font-jakarta text-headline-md text-primary">
            <Icon name="receipt_long" className="text-[22px]" />
            Peminjaman Terbaru
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="group gap-1 text-primary hover:bg-primary/10"
            onClick={() => router.push(RUTE.adminPeminjaman)}
          >
            Lihat Semua
            <Icon name="arrow_forward" className="text-[16px] transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
        <div className="p-stack-md">
          {data.peminjamanTerbaru.length === 0 ? (
            <EmptyState judul="Belum ada peminjaman" deskripsi="Pengajuan peminjaman akan tampil di sini." />
          ) : (
            <TabelPeminjaman
              data={data.peminjamanTerbaru}
              hrefDetail={RUTE.adminPeminjamanDetail}
              tampilkanPeminjam
            />
          )}
        </div>
      </section>
    </div>
  );
}
























//