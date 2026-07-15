// ============================================================
//  Manajemen Peminjaman — halaman Super Admin untuk lihat semua peminjaman.
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import api from '@/lib/api';

interface Peminjaman {
  id: string;
  kodeTransaksi?: string;
  kodePeminjaman: string;
  tanggalPengajuan: string;
  tanggalRencanaPinjam?: string;
  tanggalKembaliRencana?: string;
  status: string;
  namaPeminjam: string;
  nipPeminjam?: string;
  merkBarang?: string;
  jumlahItem?: number;
  peminjam?: {
    nama: string;
    nip?: string;
  };
  detail?: Array<{
    barang?: {
      merk?: string;
    };
  }>;
}

export default function SuperAdminPeminjamanPage() {
  const [halaman, setHalaman] = useState(1);
  const [limit, setLimit] = useState(20);
  const [cari, setCari] = useState('');
  const [cariDebounced, setCariDebounced] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSatker, setFilterSatker] = useState('');
  const [peminjaman, setPeminjaman] = useState<Peminjaman[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalHalaman: 1 });
  const [memuat, setMemuat] = useState(true);

  // Debounce pencarian
  useEffect(() => {
    const t = setTimeout(() => setCariDebounced(cari), 350);
    return () => clearTimeout(t);
  }, [cari]);

  // Reset halaman saat filter berubah
  useEffect(() => {
    setHalaman(1);
  }, [cariDebounced, filterStatus, filterSatker, limit]);

  // Ambil data peminjaman
  useEffect(() => {
    async function muatPeminjaman() {
      setMemuat(true);
      try {
        const params: any = { page: halaman, limit };
        if (cariDebounced) params.q = cariDebounced;
        if (filterStatus) params.status = filterStatus;
        if (filterSatker) params.kodeSatker = filterSatker;

        const res = await api.get('/peminjaman', { params });
        setPeminjaman(res.data.data || []);
        setMeta(res.data.meta || meta);
      } catch (err) {
        console.error('Gagal memuat peminjaman:', err);
      } finally {
        setMemuat(false);
      }
    }
    muatPeminjaman();
  }, [halaman, limit, cariDebounced, filterStatus, filterSatker]);

  // Badge status
  const badgeStatus = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      MENUNGGU: { label: 'Menunggu', className: 'bg-yellow-100 text-yellow-700' },
      DISETUJUI: { label: 'Disetujui', className: 'bg-blue-100 text-blue-700' },
      DITOLAK: { label: 'Ditolak', className: 'bg-red-100 text-red-700' },
      DIPINJAM: { label: 'Dipinjam', className: 'bg-orange-100 text-orange-700' },
      DIKEMBALIKAN: { label: 'Dikembalikan', className: 'bg-green-100 text-green-700' },
      TERLAMBAT: { label: 'Terlambat', className: 'bg-red-100 text-red-700' },
      DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
    };
    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  // Format tanggal
  const formatTanggal = (tanggal?: string) => {
    if (!tanggal) return '-';
    return new Date(tanggal).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Ambil merk dari data
  const ambilMerk = (item: Peminjaman) => {
    // Coba dari field merkBarang
    if (item.merkBarang) return item.merkBarang;
    // Coba dari detail
    if (item.detail?.[0]?.barang?.merk) return item.detail[0].barang.merk;
    // Fallback
    return '-';
  };

  // Ambil nama peminjam
  const ambilNamaPeminjam = (item: Peminjaman) => {
    if (item.namaPeminjam && item.namaPeminjam !== '-') return item.namaPeminjam;
    if (item.peminjam?.nama) return item.peminjam.nama;
    return '-';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-800 to-blue-600 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold">Manajemen Peminjaman</h1>
        <p className="mt-1 text-blue-100">Kelola seluruh peminjaman dari semua satker.</p>
      </div>

      {/* Filter */}
      <div className="rounded-2xl bg-white p-4 shadow-md">
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
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="">Semua Status</option>
            <option value="MENUNGGU">Menunggu</option>
            <option value="DISETUJUI">Disetujui</option>
            <option value="DITOLAK">Ditolak</option>
            <option value="DIPINJAM">Dipinjam</option>
            <option value="DIKEMBALIKAN">Dikembalikan</option>
            <option value="TERLAMBAT">Terlambat</option>
          </select>
          <Input
            placeholder="Filter Kode Satker..."
            value={filterSatker}
            onChange={(e) => setFilterSatker(e.target.value)}
            className="w-full lg:w-48"
          />
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value={20}>20 / halaman</option>
            <option value={50}>50 / halaman</option>
            <option value={100}>100 / halaman</option>
          </select>
        </div>
      </div>

      {/* Tabel */}
      <div className="rounded-2xl bg-white shadow-md">
        {memuat ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : peminjaman.length === 0 ? (
          <EmptyState
            ikon="sync_alt"
            judul="Tidak Ada Peminjaman"
            deskripsi="Belum ada peminjaman yang tercatat."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Kode</TableHead>
                  <TableHead>Peminjam</TableHead>
                  <TableHead>Merk</TableHead>
                  <TableHead>Rencana Pinjam</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {peminjaman.map((item) => (
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-xs">
                      {item.kodeTransaksi || item.kodePeminjaman}
                    </TableCell>
                    <TableCell className="font-medium">
                      {ambilNamaPeminjam(item)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {ambilMerk(item)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-gray-600">
                      {formatTanggal(item.tanggalRencanaPinjam)}
                    </TableCell>
                    <TableCell>{badgeStatus(item.status)}</TableCell>
                    <TableCell>
                      <Link href={`/super-admin/peminjaman/${item.id}`}>
                        <Button variant="outline" size="sm">
                          <Icon name="visibility" style={{ fontSize: 16 }} />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!memuat && peminjaman.length > 0 && (
          <div className="flex items-center justify-between border-t p-4">
            <p className="text-sm text-gray-500">
              Menampilkan {peminjaman.length} dari {meta.total} peminjaman
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setHalaman((p) => Math.max(1, p - 1))} disabled={halaman === 1}>
                <Icon name="chevron_left" style={{ fontSize: 16 }} />
              </Button>
              <span className="px-2 text-sm">Halaman {halaman} / {meta.totalHalaman}</span>
              <Button variant="outline" size="sm" onClick={() => setHalaman((p) => Math.min(meta.totalHalaman, p + 1))} disabled={halaman >= meta.totalHalaman}>
                <Icon name="chevron_right" style={{ fontSize: 16 }} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
