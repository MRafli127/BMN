// ============================================================
//  Manajemen Peminjaman — halaman Super Admin untuk lihat semua peminjaman.
//  Tampilan folder per satker.
//  Auto-open folder berdasarkan query param ?kodeSatker=
// ============================================================

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { FolderSatkerSuperAdmin } from '@/components/peminjaman/FolderSatkerSuperAdmin';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

function KontenPeminjaman() {
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
      {/* Header - ungu elegan */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900 via-violet-800 to-indigo-800 p-6 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-purple-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-1/3 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm shadow-lg ring-1 ring-white/20">
            <Icon name="sync_alt" className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Manajemen Peminjaman</h1>
            <p className="text-purple-100">Kelola seluruh peminjaman dari semua satker</p>
          </div>
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
              placeholder="Cari kode / nama barang / merk / nama peminjam / NIP..."
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
