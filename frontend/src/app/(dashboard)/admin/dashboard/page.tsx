// ============================================================
//  Dashboard Admin — ringkasan statistik & grafik.
// ============================================================

'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { TabelPeminjaman } from '@/components/peminjaman/TabelPeminjaman';
import { dashboardService } from '@/services/dashboard.service';
import { useQuery } from '@/lib/cache';
import { cn } from '@/lib/utils';
import { STATUS_PEMINJAMAN, FILTER_STATUS_AKTIF } from '@/constants/status';
import { RUTE } from '@/constants/routes';
import type { KategoriDashboard } from '@/services/dashboard.service';

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
}

// Kelas literal per warna (agar terdeteksi JIT Tailwind, bukan dirakit runtime)
const GAYA: Record<string, GayaWarna> = {
  primary: { orb: 'bg-primary/10 group-hover:bg-primary/20', ikonBox: 'bg-primary/10 text-primary', nilai: 'text-primary' },
  tertiary: { orb: 'bg-tertiary/10 group-hover:bg-tertiary/20', ikonBox: 'bg-tertiary/10 text-tertiary', nilai: 'text-tertiary' },
  secondary: { orb: 'bg-secondary/10 group-hover:bg-secondary/20', ikonBox: 'bg-secondary/10 text-secondary', nilai: 'text-secondary' },
  error: { orb: 'bg-error/10 group-hover:bg-error/20', ikonBox: 'bg-error/10 text-error', nilai: 'text-error' },
};

interface KartuStat {
  label: string;
  nilai: number;
  ikon: string;
  warna: keyof typeof GAYA;
  keterangan: string;
  kategori: KategoriDashboard;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { data, sedangMemuat } = useQuery('dashboard-admin', () => dashboardService.admin());

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

  return (
    <div className="space-y-gutter">
      {/* Header eksekutif */}
      <section className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-jakarta text-headline-lg text-primary">Ringkasan Eksekutif</h1>
          <p className="text-on-surface-variant">
            Monitoring real-time aset dan inventaris Kementerian Keuangan.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-outline-variant bg-white px-4 py-2 font-label-md transition-all hover:bg-surface-container-low">
            <Icon name="calendar_today" className="text-[18px] text-primary" />
            <span>Rentang Waktu</span>
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-label-md text-white transition-all hover:brightness-110">
            <Icon name="download" className="text-[18px]" />
            <span>Ekspor Laporan</span>
          </button>
        </div>
      </section>

      {/* Kartu statistik */}
      <section className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-5">
        {kartu.map((k) => {
          const g = GAYA[k.warna];
          return (
            <div
              key={k.label}
              onClick={() => router.push(tujuanKategori(k.kategori))}
              className="glass-card group relative cursor-pointer overflow-hidden rounded-2xl p-stack-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated"
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

      {/* Grafik & info */}
      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
        {/* Grafik ringkasan per status */}
        <section className="glass-card flex flex-col gap-6 rounded-2xl p-stack-lg lg:col-span-2">
          <div>
            <h3 className="font-jakarta text-headline-md text-primary">Ringkasan Aktivitas</h3>
            <p className="text-on-surface-variant">Distribusi peminjaman berdasarkan status</p>
          </div>
          <div className="flex flex-1 flex-col justify-end gap-4 pt-4">
            {data.grafikStatus.map((g) => {
              const info = STATUS_PEMINJAMAN[g.status];
              return (
                <div key={g.status} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 font-label-md text-on-surface-variant">{info.label}</span>
                  <div className="h-6 flex-1 overflow-hidden rounded-full bg-surface-container">
                    <div
                      className="flex h-full items-center justify-end rounded-full bg-primary px-2 text-xs font-bold text-white transition-all"
                      style={{ width: `${Math.max((g.jumlah / maxGrafik) * 100, g.jumlah > 0 ? 8 : 0)}%` }}
                    >
                      {g.jumlah > 0 && g.jumlah}
                    </div>
                  </div>
                  <span className="w-8 text-right text-sm font-bold text-primary">{g.jumlah}</span>
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
                  className="group flex cursor-pointer items-center gap-4 rounded-xl bg-surface-container/40 p-4 transition-all hover:bg-primary/5"
                >
                  <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', g.ikonBox)}>
                    <Icon name={it.ikon} className="text-[22px]" fill />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-label-md uppercase tracking-wider text-on-surface-variant">{it.label}</p>
                    <p className={cn('font-jakarta text-headline-md', g.nilai)}>{it.nilai}</p>
                    {it.keterangan && <p className="font-label-sm text-on-surface-variant">{it.keterangan}</p>}
                  </div>
                  <Icon name="chevron_right" className="h-5 w-5 shrink-0 text-on-surface-variant" />
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Peminjaman terbaru */}
      <section className="glass-card overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-outline-variant bg-white/40 p-stack-lg">
          <h3 className="font-jakarta text-headline-md text-primary">Peminjaman Terbaru</h3>
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
