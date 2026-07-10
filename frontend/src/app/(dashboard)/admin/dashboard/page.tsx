// ============================================================
//  Dashboard Admin — ringkasan statistik & grafik.
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Input } from '@/components/ui/input';
import { X, CalendarDays } from 'lucide-react';
import { peminjamanService } from '@/services/peminjaman.service';
import { barangService } from '@/services/barang.service';

// Data kartu kode satker
const KODE_SATKER = [
  { kode: '015110199411868000KP', label: 'Kode Satker 000' },
  { kode: '015110199411868001KP', label: 'Kode Satker 001' },
  { kode: '015110199411868002KP', label: 'Kode Satker 002' },
  { kode: '015110199411868003KP', label: 'Kode Satker 003' },
  { kode: '015110199411868004KP', label: 'Kode Satker 004' },
  { kode: '015110199411868005KP', label: 'Kode Satker 005' },
  { kode: '015110199411868006KP', label: 'Kode Satker 006' },
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

interface GayaWarna {
  orb: string;
  ikonBox: string;
  nilai: string;
  gradasi: string;
  garis: string;
}

// Kelas literal per warna (agar terdeteksi JIT Tailwind, bukan dirakit runtime)
const GAYA: Record<string, GayaWarna> = {
  primary: { orb: 'bg-primary/10 group-hover:bg-primary/20', ikonBox: 'bg-primary/10 text-primary', nilai: 'text-primary', gradasi: 'bg-gradient-to-br from-white via-white to-primary/10 hover:to-primary/20', garis: 'border-primary/20 hover:border-primary/30' },
  tertiary: { orb: 'bg-tertiary/10 group-hover:bg-tertiary/20', ikonBox: 'bg-tertiary/10 text-tertiary', nilai: 'text-tertiary', gradasi: 'bg-gradient-to-br from-white via-white to-tertiary/10 hover:to-tertiary/20', garis: 'border-tertiary/20 hover:border-tertiary/30' },
  secondary: { orb: 'bg-secondary/10 group-hover:bg-secondary/20', ikonBox: 'bg-secondary/10 text-secondary', nilai: 'text-secondary', gradasi: 'bg-gradient-to-br from-white via-white to-secondary/10 hover:to-secondary/20', garis: 'border-secondary/20 hover:border-secondary/30' },
  error: { orb: 'bg-error/10 group-hover:bg-error/20', ikonBox: 'bg-error/10 text-error', nilai: 'text-error', gradasi: 'bg-gradient-to-br from-white via-white to-error/10 hover:to-error/20', garis: 'border-error/20 hover:border-error/30' },
};

interface KartuStat {
  label: string;
  nilai: number;
  ikon: string;
  warna: keyof typeof GAYA;
  keterangan: string;
  kategori: KategoriDashboard;
}

// Palet gradasi batang grafik "Ringkasan Aktivitas" — warna semantik per status
// (bar = isian batang, teks = angka di kanan, titik = penanda bulat di label).
interface GayaBar {
  bar: string;
  teks: string;
  titik: string;
}
const WARNA_BAR: Record<string, GayaBar> = {
  DRAFT: { bar: 'from-slate-400 to-slate-500', teks: 'text-slate-600', titik: 'bg-slate-400' },
  MENUNGGU: { bar: 'from-amber-400 to-amber-500', teks: 'text-amber-700', titik: 'bg-amber-400' },
  DISETUJUI: { bar: 'from-green-400 to-green-600', teks: 'text-green-700', titik: 'bg-green-500' },
  DITOLAK: { bar: 'from-red-400 to-red-600', teks: 'text-red-700', titik: 'bg-red-500' },
  DIPINJAM: { bar: 'from-pink-400 to-pink-600', teks: 'text-pink-700', titik: 'bg-pink-500' },
  DIKEMBALIKAN: { bar: 'from-teal-400 to-teal-600', teks: 'text-teal-700', titik: 'bg-teal-500' },
  TERLAMBAT: { bar: 'from-orange-400 to-orange-600', teks: 'text-orange-700', titik: 'bg-orange-500' },
};

function DialogRentangWaktu({
  terbuka,
  onUbahTerbuka,
  filterAktif,
  onFilter,
}: {
  terbuka: boolean;
  onUbahTerbuka: (o: boolean) => void;
  filterAktif: DashboardFilter;
  onFilter: (f: DashboardFilter) => void;
}) {
  const [dari, setDari] = useState(filterAktif.dari || '');
  const [sampai, setSampai] = useState(filterAktif.sampai || '');

  const handleTerapkan = () => {
    onFilter({ dari: dari || undefined, sampai: sampai || undefined });
    onUbahTerbuka(false);
  };

  const handleReset = () => {
    setDari('');
    setSampai('');
    onFilter({});
    onUbahTerbuka(false);
  };

  if (!terbuka) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="font-jakarta text-lg font-semibold text-primary">Rentang Waktu</h2>
          </div>
          <button onClick={() => onUbahTerbuka(false)} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          Filter data dashboard berdasarkan rentang waktu pengajuan peminjaman.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="dari" className="text-sm font-medium">
              Dari Tanggal
            </label>
            <Input
              id="dari"
              type="date"
              value={dari}
              onChange={(e) => setDari(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="sampai" className="text-sm font-medium">
              Sampai Tanggal
            </label>
            <Input
              id="sampai"
              type="date"
              value={sampai}
              onChange={(e) => setSampai(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button onClick={handleTerapkan}>Terapkan</Button>
        </div>
      </div>
    </div>
  );
}

// Dialog konfirmasi sebelum navigasi ke halaman kode satker
function DialogKonfirmasiSatker({
  terbuka,
  onUbahTerbuka,
  kodeSatker,
  label,
  onPilih,
  counts,
  memuat,
}: {
  terbuka: boolean;
  onUbahTerbuka: (o: boolean) => void;
  kodeSatker: string;
  label: string;
  onPilih: (tujuan: string) => void;
  counts: {
    menunggu: number;
    disetujui: number;
    dipinjam: number;
    dikembalikan: number;
    terlambat: number;
    ditolak: number;
    totalBarang: number;
    stokTersedia: number;
    stokHabis: number;
  } | null;
  memuat: boolean;
}) {
  if (!terbuka) return null;

  const statusOptions = [
    { label: 'Menunggu Persetujuan', ikon: 'pending_actions', warna: 'text-amber-600', bg: 'bg-amber-100', countKey: 'menunggu' as const },
    { label: 'Disetujui', ikon: 'check_circle', warna: 'text-green-600', bg: 'bg-green-100', countKey: 'disetujui' as const },
    { label: 'Sedang Dipinjam', ikon: 'sync_alt', warna: 'text-pink-600', bg: 'bg-pink-100', countKey: 'dipinjam' as const },
    { label: 'Dikembalikan', ikon: 'assignment_return', warna: 'text-teal-600', bg: 'bg-teal-100', countKey: 'dikembalikan' as const },
    { label: 'Terlambat', ikon: 'report', warna: 'text-orange-600', bg: 'bg-orange-100', countKey: 'terlambat' as const },
    { label: 'Ditolak', ikon: 'cancel', warna: 'text-red-600', bg: 'bg-red-100', countKey: 'ditolak' as const },
  ];

  const barangOptions = [
    { label: 'Total Barang', ikon: 'inventory', warna: 'text-primary', bg: 'bg-primary/10', countKey: 'totalBarang' as const },
    { label: 'Stok Tersedia', ikon: 'check_circle', warna: 'text-green-600', bg: 'bg-green-100', countKey: 'stokTersedia' as const },
    { label: 'Stok Habis', ikon: 'error', warna: 'text-red-600', bg: 'bg-red-100', countKey: 'stokHabis' as const },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Icon name="location_city" className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="font-jakarta text-2xl font-bold text-primary">{label}</h2>
              <p className="text-base text-muted-foreground">
                Kode Satker: <code className="rounded bg-muted px-2 py-0.5 font-mono text-sm">{kodeSatker}</code>
              </p>
            </div>
          </div>
          <button
            onClick={() => onUbahTerbuka(false)}
            className="rounded-xl p-3 hover:bg-muted transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Manajemen Peminjaman */}
        <div className="mb-10">
          <h3 className="mb-6 flex items-center gap-3 font-jakarta text-lg font-semibold text-on-surface">
            <Icon name="swap_horiz" className="text-[24px] text-primary" />
            Manajemen Peminjaman
          </h3>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
            {statusOptions.map((opt) => (
              <button
                key={opt.countKey}
                onClick={() => {
                  onUbahTerbuka(false);
                  onPilih(`peminjaman:${opt.countKey.toUpperCase()}`);
                }}
                className="group relative flex flex-col items-center gap-4 rounded-3xl border-2 border-outline-variant bg-white p-6 text-center transition-all hover:border-primary/50 hover:shadow-xl hover:-translate-y-2 active:scale-[0.98]"
              >
                {/* Count Badge */}
                <div className="absolute -top-3 -right-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-lg">
                  {memuat ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    counts?.[opt.countKey] ?? 0
                  )}
                </div>
                <div className={cn('flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110', opt.bg)}>
                  <Icon name={opt.ikon} className={cn('text-[32px]', opt.warna)} />
                </div>
                <span className="text-sm font-semibold leading-tight">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Manajemen Barang */}
        <div>
          <h3 className="mb-6 flex items-center gap-3 font-jakarta text-lg font-semibold text-on-surface">
            <Icon name="inventory_2" className="text-[24px] text-primary" />
            Manajemen Barang
          </h3>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-3">
            {barangOptions.map((opt) => (
              <button
                key={opt.countKey}
                onClick={() => {
                  onUbahTerbuka(false);
                  const routeMap: Record<string, string> = {
                    totalBarang: 'barang:totalBarang',
                    stokTersedia: 'barang:stokTersedia',
                    stokHabis: 'barang:stokHabis',
                  };
                  onPilih(routeMap[opt.countKey] || `barang:${opt.countKey}`);
                }}
                className="group relative flex flex-col items-center gap-4 rounded-3xl border-2 border-outline-variant bg-white p-6 text-center transition-all hover:border-primary/50 hover:shadow-xl hover:-translate-y-2 active:scale-[0.98]"
              >
                {/* Count Badge */}
                <div className="absolute -top-3 -right-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-lg">
                  {memuat ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    counts?.[opt.countKey] ?? 0
                  )}
                </div>
                <div className={cn('flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110', opt.bg)}>
                  <Icon name={opt.ikon} className={cn('text-[32px]', opt.warna)} />
                </div>
                <span className="text-sm font-semibold leading-tight">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

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

  // Cache key berdasarkan filter agar data berubah saat filter berubah
  const cacheKey = `dashboard-admin:${JSON.stringify(filterTanggal)}`;
  const { data, sedangMemuat } = useQuery(cacheKey, () => dashboardService.admin(filterTanggal));

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
  const kartu: KartuStat[] = [
    { label: 'Total Barang', nilai: s.totalBarang, ikon: 'inventory', warna: 'primary', keterangan: 'Aset terdaftar aktif', kategori: 'barang' },
    { label: 'Pengajuan Menunggu', nilai: s.pengajuanMenunggu, ikon: 'pending_actions', warna: 'tertiary', keterangan: 'Menunggu persetujuan', kategori: 'pengajuan_menunggu' },
    { label: 'Peminjaman Aktif', nilai: s.peminjamanAktif, ikon: 'sync_alt', warna: 'secondary', keterangan: 'Sedang digunakan', kategori: 'peminjaman_aktif' },
    { label: 'Barang Terlambat', nilai: s.barangTerlambat, ikon: 'report', warna: 'error', keterangan: 'Melebihi batas tempo', kategori: 'barang_terlambat' },
    { label: 'Total Peminjam', nilai: s.totalPeminjam, ikon: 'group', warna: 'primary', keterangan: 'Pengguna terdaftar', kategori: 'peminjam' },
  ];

  // Ringkasan stok inventaris (data dari Manajemen Barang).
  const inventaris = [
    { label: 'Total Barang', nilai: s.totalBarang, ikon: 'inventory', warna: 'primary', keterangan: 'Aset terdaftar aktif', tujuan: RUTE.adminBarang },
    { label: 'Stok Tersedia', nilai: s.stokTersedia, ikon: 'check_circle', warna: 'secondary', keterangan: '', tujuan: RUTE.adminBarangStok('tersedia') },
    { label: 'Stok Habis', nilai: s.stokHabis, ikon: 'error', warna: 'error', keterangan: '', tujuan: RUTE.adminBarangStok('habis') },
  ] as const;

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
      <section className="relative overflow-hidden rounded-2xl bg-brand-gradient p-stack-lg text-white shadow-brand">
        {/* Orb dekoratif lembut sebagai latar */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-1/4 h-48 w-48 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
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
                  : 'border border-white/30 bg-white/10 text-white hover:bg-white/20',
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
                <Button className="w-full border border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 sm:w-auto">
                  <Icon name="download" className="text-[18px]" />
                  <span className="hidden sm:inline">Ekspor</span>
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

      {/* Kartu statistik */}
      <section className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-5">
        {kartu.map((k, indeks) => {
          const g = GAYA[k.warna];
          return (
            <div
              key={k.label}
              onClick={() => router.push(tujuanKategori(k.kategori))}
              // Muncul berurutan saat halaman dimuat (stagger).
              style={{ animationDelay: `${indeks * 60}ms` }}
              className={cn(
                'group relative cursor-pointer overflow-hidden rounded-2xl border p-stack-lg transition-all duration-300 animate-page-in hover:-translate-y-1 hover:shadow-elevated active:scale-[0.98]',
                g.gradasi,
                g.garis,
              )}
            >
              <div className={cn('absolute -right-4 -top-4 h-24 w-24 rounded-full blur-2xl transition-colors', g.orb)} />
              <div className="mb-4 flex items-start justify-between">
                <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', g.ikonBox)}>
                  <Icon name={k.ikon} fill />
                </div>
                <Icon name="chevron_right" className="h-5 w-5 text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="font-label-md uppercase tracking-wider text-on-surface-variant">{k.label}</p>
              <h3 className={cn('mt-1 font-jakarta text-headline-lg', g.nilai)}>{k.nilai}</h3>
              <p className="mt-2 font-label-sm text-on-surface-variant">{k.keterangan}</p>
            </div>
          );
        })}
      </section>

      {/* Kartu Kode Satker */}
      <section className="glass-card rounded-2xl p-stack-lg">
        <div className="mb-6">
          <h3 className="flex items-center gap-2 font-jakarta text-headline-md text-primary">
            <Icon name="location_city" className="text-[22px]" />
            Pilih Kode Satker
          </h3>
          <p className="text-on-surface-variant">Klik kartu untuk memilih kode satker yang akan diakses</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {KODE_SATKER.map((satker, indeks) => (
            <div
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
              className="group relative cursor-pointer overflow-hidden rounded-xl border border-outline-variant bg-gradient-to-br from-white via-white to-primary/5 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated hover:border-primary/30 active:scale-[0.98] animate-page-in"
            >
              <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-primary/10 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                  <Icon name="badge" className="text-[24px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-label-md text-on-surface-variant">{satker.label}</p>
                  <p className="mt-1 break-all font-mono text-sm font-medium text-primary">{satker.kode}</p>
                </div>
                <Icon name="chevron_right" className="h-5 w-5 shrink-0 text-on-surface-variant transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Grafik & info */}
      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
        {/* Grafik ringkasan per status */}
        <section className="glass-card flex flex-col gap-6 rounded-2xl p-stack-lg lg:col-span-2">
          <div>
            <h3 className="flex items-center gap-2 font-jakarta text-headline-md text-primary">
              <Icon name="bar_chart" className="text-[22px]" />
              Ringkasan Aktivitas
            </h3>
            <p className="text-on-surface-variant">Distribusi peminjaman berdasarkan status</p>
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
                  className="group flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-container/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <span className="flex w-20 shrink-0 items-center gap-2 font-label-md text-on-surface-variant sm:w-40">
                    <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white transition-transform group-hover:scale-125', w.titik)} />
                    <span className="hidden text-xs sm:inline">{info.label}</span>
                    <span className="text-xs sm:hidden">{info.label.split(' ')[0]}</span>
                  </span>
                  <div className="h-6 flex-1 overflow-hidden rounded-full bg-surface-container/70">
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
                  <Icon name="chevron_right" className="h-4 w-4 shrink-0 text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              );
            })}
          </div>
        </section>

        {/* Inventaris Barang — ringkasan stok dari Manajemen Barang */}
        <section className="glass-card rounded-2xl p-stack-lg">
          <h3 className="mb-6 flex items-center gap-2 font-jakarta text-headline-md text-primary">
            <Icon name="inventory_2" className="text-[22px]" />
            Inventaris Barang
          </h3>
          <div className="space-y-4">
            {inventaris.map((it) => {
              const g = GAYA[it.warna];
              return (
                <div
                  key={it.label}
                  onClick={() => router.push(it.tujuan)}
                  className={cn(
                    'group relative flex cursor-pointer items-center gap-4 overflow-hidden rounded-xl border p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated',
                    g.gradasi,
                    g.garis,
                  )}
                >
                  {/* Orb cahaya yang mengambang muncul saat kursor menyorot */}
                  <div className={cn('pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100', g.orb)} />
                  <div className={cn('relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110', g.ikonBox)}>
                    <Icon name={it.ikon} className="text-[22px]" fill />
                  </div>
                  <div className="relative min-w-0 flex-1">
                    <p className="font-label-md uppercase tracking-wider text-on-surface-variant">{it.label}</p>
                    <p className={cn('font-jakarta text-headline-md', g.nilai)}>{it.nilai}</p>
                    {it.keterangan && <p className="font-label-sm text-on-surface-variant">{it.keterangan}</p>}
                  </div>
                  <Icon name="chevron_right" className="relative h-5 w-5 shrink-0 text-on-surface-variant transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Peminjaman terbaru */}
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
