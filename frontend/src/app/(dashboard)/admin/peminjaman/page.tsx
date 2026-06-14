// ============================================================
//  Admin — Manajemen Peminjaman (daftar + filter status).
// ============================================================

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TabelPeminjaman } from '@/components/peminjaman/TabelPeminjaman';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { notify } from '@/components/ui/toast';
import { peminjamanService, type FilterPeminjaman } from '@/services/peminjaman.service';
import { ambilPesanError } from '@/lib/utils';
import { OPSI_STATUS } from '@/constants/status';
import { RUTE } from '@/constants/routes';
import type { Peminjaman } from '@/types/peminjaman.type';
import type { MetaPagination } from '@/types/barang.type';

export default function AdminPeminjamanPage() {
  const [data, setData] = useState<Peminjaman[]>([]);
  const [meta, setMeta] = useState<MetaPagination | null>(null);
  const [filter, setFilter] = useState<FilterPeminjaman>({ page: 1, limit: 10 });
  const [cari, setCari] = useState('');
  const [memuat, setMemuat] = useState(true);

  const muat = useCallback(async () => {
    setMemuat(true);
    try {
      const hasil = await peminjamanService.getSemua(filter);
      setData(hasil.data);
      setMeta(hasil.meta);
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal memuat daftar peminjaman.'));
    } finally {
      setMemuat(false);
    }
  }, [filter]);

  useEffect(() => {
    muat();
  }, [muat]);

  // Debounce pencarian
  useEffect(() => {
    const timer = setTimeout(() => setFilter((f) => ({ ...f, q: cari || undefined, page: 1 })), 400);
    return () => clearTimeout(timer);
  }, [cari]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Manajemen Peminjaman</h1>
        <p className="text-muted-foreground">Tinjau, setujui, atau tolak pengajuan peminjaman.</p>
      </div>

      {/* Filter */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari kode / nama peminjam..." className="pl-9" />
        </div>
        <Select
          value={filter.status || ''}
          onChange={(e) => setFilter((f) => ({ ...f, status: (e.target.value || undefined) as never, page: 1 }))}
        >
          <option value="">Semua Status</option>
          {OPSI_STATUS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      {memuat ? (
        <LoadingSpinner />
      ) : data.length === 0 ? (
        <EmptyState ikon={ClipboardList} judul="Belum ada peminjaman" deskripsi="Tidak ada data peminjaman yang cocok dengan filter." />
      ) : (
        <>
          <TabelPeminjaman data={data} hrefDetail={RUTE.adminPeminjamanDetail} tampilkanPeminjam />
          {meta && meta.totalHalaman > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Halaman {meta.page} dari {meta.totalHalaman} • {meta.total} data
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => setFilter((f) => ({ ...f, page: (f.page || 1) - 1 }))}>
                  <ChevronLeft className="h-4 w-4" /> Sebelumnya
                </Button>
                <Button variant="outline" size="sm" disabled={meta.page >= meta.totalHalaman} onClick={() => setFilter((f) => ({ ...f, page: (f.page || 1) + 1 }))}>
                  Berikutnya <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
