// ============================================================
//  Manajemen Barang — halaman Super Admin untuk lihat semua barang.
//  Optimized: useDeferredValue, memo, skeleton loading
// ============================================================

'use client';

import { useEffect, useState, useCallback, useRef, memo, useDeferredValue } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { EmptyState } from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { TableSkeleton } from '@/components/shared/SuperAdminSkeleton';

interface Barang {
  id: string;
  kodeBarang: string;
  nama: string;
  merk?: string;
  jenis: string;
  jumlahTotal: number;
  jumlahTersedia: number;
  kondisi: string;
  namaSatker?: string;
}

// ============================================================
//  Memoized Badge Components
// ============================================================
const BadgeKondisi = memo(function BadgeKondisi({ kondisi }: { kondisi: string }) {
  if (kondisi === 'BAIK') return <Badge className="bg-green-100 text-green-700">Baik</Badge>;
  if (kondisi === 'RUSAK_RINGAN') return <Badge className="bg-yellow-100 text-yellow-700">Rusak Ringan</Badge>;
  if (kondisi === 'RUSAK_BERAT') return <Badge className="bg-red-100 text-red-700">Rusak Berat</Badge>;
  return <Badge variant="secondary">{kondisi}</Badge>;
});

const BadgeJenis = memo(function BadgeJenis({ jenis }: { jenis: string }) {
  const warna: Record<string, string> = {
    ELEKTRONIK: 'bg-blue-100 text-blue-700',
    FURNITUR: 'bg-amber-100 text-amber-700',
    KENDARAAN: 'bg-purple-100 text-purple-700',
    ATK: 'bg-green-100 text-green-700',
    LAINNYA: 'bg-gray-100 text-gray-700',
  };
  return <Badge className={cn(warna[jenis] || 'bg-gray-100 text-gray-700')}>{jenis}</Badge>;
});

// ============================================================
//  Memoized Table Row
// ============================================================
const BarangTableRow = memo(function BarangTableRow({ item }: { item: Barang }) {
  return (
    <TableRow className="transition-colors hover:bg-gray-50">
      <TableCell className="font-mono text-xs">{item.kodeBarang}</TableCell>
      <TableCell className="font-medium">{item.nama}</TableCell>
      <TableCell className="text-sm text-gray-500">{item.merk || '-'}</TableCell>
      <TableCell>
        <BadgeJenis jenis={item.jenis} />
      </TableCell>
      <TableCell>
        <BadgeKondisi kondisi={item.kondisi} />
      </TableCell>
      <TableCell>
        <span className="font-medium">{item.jumlahTersedia.toLocaleString('id-ID')}</span>
        <span className="text-gray-400"> / {item.jumlahTotal.toLocaleString('id-ID')}</span>
      </TableCell>
      <TableCell className="max-w-[150px] truncate text-sm">{item.namaSatker || '-'}</TableCell>
      <TableCell>
        <Link href={`/super-admin/barang/${item.id}`} prefetch={true}>
          <Button variant="outline" size="sm" className="transition-transform active:scale-95">
            <Icon name="visibility" style={{ fontSize: 16 }} />
          </Button>
        </Link>
      </TableCell>
    </TableRow>
  );
});

export default function SuperAdminBarangPage() {
  const [halaman, setHalaman] = useState(1);
  const [limit, setLimit] = useState(20);
  const [cari, setCari] = useState('');
  const cariDeferred = useDeferredValue(cari);
  const [filterSatker, setFilterSatker] = useState('');
  const [barang, setBarang] = useState<Barang[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalHalaman: 1 });
  const [memuat, setMemuat] = useState(true);
  const isMounted = useRef(true);

  useEffect(() => {
    setHalaman(1);
  }, [cariDeferred, filterSatker, limit]);

  const muatBarang = useCallback(async () => {
    setMemuat(true);
    try {
      const params: Record<string, unknown> = { page: halaman, limit };
      if (cariDeferred) params.q = cariDeferred;
      if (filterSatker) params.kodeSatker = filterSatker;

      const res = await api.get('/barang', { params });
      if (isMounted.current) {
        setBarang(res.data.data || []);
        setMeta(res.data.meta || { total: 0, page: 1, limit: 20, totalHalaman: 1 });
      }
    } catch (err) {
      console.error('Gagal memuat barang:', err);
    } finally {
      if (isMounted.current) {
        setMemuat(false);
      }
    }
  }, [cariDeferred, filterSatker, halaman, limit]);

  useEffect(() => {
    isMounted.current = true;
    muatBarang();
    return () => { isMounted.current = false; };
  }, [muatBarang]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-800 to-blue-600 p-6 text-white shadow-lg animate-page-in">
        <h1 className="text-2xl font-bold">Manajemen Barang</h1>
        <p className="mt-1 text-blue-100">Kelola seluruh barang BMN dari semua satker.</p>
      </div>

      {/* Filter */}
      <div className="rounded-2xl bg-white p-4 shadow-md animate-page-in" style={{ animationDelay: '50ms' }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 20 }} />
            <Input
              placeholder="Cari kode, nama, atau merk..."
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              className="pl-10"
            />
          </div>
          <Input
            placeholder="Filter Satker..."
            value={filterSatker}
            onChange={(e) => setFilterSatker(e.target.value)}
            className="w-full lg:w-48"
          />
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm transition-all focus:border-primary focus:outline-none"
          >
            <option value={20}>20 / halaman</option>
            <option value={50}>50 / halaman</option>
            <option value={100}>100 / halaman</option>
          </select>
        </div>
      </div>

      {/* Tabel */}
      <div className="rounded-2xl bg-white shadow-md animate-page-in" style={{ animationDelay: '100ms' }}>
        {memuat ? (
          <div className="p-6">
            <TableSkeleton columns={8} rows={8} />
          </div>
        ) : barang.length === 0 ? (
          <div className="p-6">
            <EmptyState
              ikon="inventory_2"
              judul="Tidak Ada Barang"
              deskripsi="Belum ada barang yang terdaftar."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Kode Barang</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Merk</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Kondisi</TableHead>
                  <TableHead>Stok</TableHead>
                  <TableHead>Satker</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {barang.map((item) => (
                  <BarangTableRow key={item.id} item={item} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!memuat && barang.length > 0 && (
          <div className="flex items-center justify-between border-t p-4">
            <p className="text-sm text-gray-500">
              Menampilkan {barang.length} dari {meta.total} barang
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHalaman((p) => Math.max(1, p - 1))}
                disabled={halaman === 1}
                className="transition-transform active:scale-95"
              >
                <Icon name="chevron_left" style={{ fontSize: 16 }} />
              </Button>
              <span className="px-2 text-sm">
                Halaman {halaman} / {meta.totalHalaman}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHalaman((p) => Math.min(meta.totalHalaman, p + 1))}
                disabled={halaman >= meta.totalHalaman}
                className="transition-transform active:scale-95"
              >
                <Icon name="chevron_right" style={{ fontSize: 16 }} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
