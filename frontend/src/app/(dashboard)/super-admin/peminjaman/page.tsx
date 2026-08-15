// ============================================================
//  Manajemen Peminjaman — halaman Super Admin untuk lihat semua peminjaman.
//  Tampilan folder per satker.
//  Auto-open folder berdasarkan query param ?kodeSatker=
// ============================================================

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FolderSatkerSuperAdmin } from '@/components/peminjaman/FolderSatkerSuperAdmin';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { RUTE } from '@/constants/routes';

function KontenPeminjaman() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kodeSatkerDariUrl = searchParams.get('kodeSatker');
  const [cari, setCari] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [satkerAwal, setSatkerAwal] = useState<string | null>(null);

  // Ambil kodeSatker dari URL dan set sebagai folder yang harus dibuka
  useEffect(() => {
    if (kodeSatkerDariUrl) {
      setSatkerAwal(kodeSatkerDariUrl);
    } else {
      setSatkerAwal(null);
    }
  }, [kodeSatkerDariUrl]);

  return (
    <div className="space-y-6">
      {/* Hero Header - gradient ungu modern */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-700 via-violet-600 to-fuchsia-500 p-6 text-white shadow-lg shadow-violet-700/20 animate-page-in sm:p-8">
        {/* Dekorasi blob & grid pattern */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-fuchsia-300/30 blur-3xl" />
          <div className="absolute -right-32 -bottom-32 h-80 w-80 rounded-full bg-violet-400/25 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
        </div>

        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md">
              <Icon name="sync_alt" className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="font-jakarta text-2xl font-bold tracking-tight sm:text-3xl">
                Manajemen Peminjaman
              </h1>
              <p className="mt-0.5 text-sm text-white/85">
                Kelola seluruh peminjaman dari semua satker
              </p>
            </div>
          </div>

          <Button
            onClick={() => router.push(RUTE.superAdminPeminjamanBuat)}
            variant="outline"
            className="gap-2 bg-white text-purple-700 hover:bg-white border-white/20"
          >
            <Plus className="h-4 w-4" /> Tambah Peminjaman
          </Button>
        </div>
      </section>

      {/* Filter */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
        {/* Search */}
        <div className="border-b border-slate-100 p-4">
          <div className="relative w-full">
            <Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari kode / nama barang / merk / nama peminjam..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-50/50 p-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm transition-all focus:border-primary focus:outline-none"
          >
            <option value="">Semua Status</option>
            <option value="MENUNGGU">Menunggu</option>
            <option value="DISETUJUI">Disetujui</option>
            <option value="DITOLAK">Ditolak</option>
            <option value="DIPINJAM">Dipinjam</option>
            <option value="DIKEMBALIKAN">Dikembalikan</option>
            <option value="TERLAMBAT">Terlambat</option>
          </select>
        </div>
      </div>

      {/* Folder Peminjaman.
          `key={satkerAwal ?? 'all'}` memaksa REMOUNT komponen setiap kali
          ?kodeSatker= berubah, supaya state internal (terbuka, dataPerSatker,
          counts) di-reset dan useEffect auto-open berjalan ulang untuk satker
          baru. Tanpa remount, useEffect akan skip karena sudahDibukaRef.current
          masih true dari satker sebelumnya (auto-open jadi gagal untuk satker
          kedua dan seterusnya). */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-md">
        <FolderSatkerSuperAdmin
          key={satkerAwal ?? 'all'}
          cari={cari}
          filterStatus={filterStatus}
          satkerAwal={satkerAwal}
        />
      </div>
    </div>
  );
}

export default function SuperAdminPeminjamanPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <KontenPeminjaman />
    </Suspense>
  );
}
