// ============================================================
//  Manajemen Peminjaman — halaman Super Admin untuk lihat semua peminjaman.
//  Tampilan folder per satker.
// ============================================================

'use client';

import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { FolderSatkerSuperAdmin } from '@/components/peminjaman/FolderSatkerSuperAdmin';

export default function SuperAdminPeminjamanPage() {
  const [cari, setCari] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-800 to-blue-600 p-6 text-white shadow-lg animate-page-in">
        <h1 className="text-2xl font-bold">Manajemen Peminjaman</h1>
        <p className="mt-1 text-blue-100">Kelola seluruh peminjaman dari semua satker.</p>
      </div>

      {/* Filter */}
      <div className="rounded-2xl bg-white p-4 shadow-md animate-page-in" style={{ animationDelay: '50ms' }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 20 }} />
            <Input
              placeholder="Cari kode / nama barang / merk / nama peminjam..."
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm transition-all focus:border-primary focus:outline-none"
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

      {/* Folder Peminjaman */}
      <div className="rounded-2xl bg-white shadow-md animate-page-in" style={{ animationDelay: '100ms' }}>
        <div className="p-stack-md">
          <FolderSatkerSuperAdmin cari={cari} filterStatus={filterStatus} />
        </div>
      </div>
    </div>
  );
}
