// ============================================================
//  Admin — Manajemen Peminjaman (daftar + filter status).
// ============================================================

'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TabelPeminjaman } from '@/components/peminjaman/TabelPeminjaman';
import { ImportPeminjamDialog } from '@/components/peminjaman/ImportPeminjamDialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { notify } from '@/components/ui/toast';
import { peminjamanService, type FilterPeminjaman } from '@/services/peminjaman.service';
import { ambilPesanError } from '@/lib/utils';
import { OPSI_STATUS } from '@/constants/status';
import { RUTE } from '@/constants/routes';
import type { Peminjaman } from '@/types/peminjaman.type';
import type { MetaPagination } from '@/types/barang.type';

// Pilihan jumlah baris yang ditampilkan per halaman
const OPSI_LIMIT = [12, 50, 100, 200];

export default function AdminPeminjamanPage() {
  const [data, setData] = useState<Peminjaman[]>([]);
  const [meta, setMeta] = useState<MetaPagination | null>(null);
  const [filter, setFilter] = useState<FilterPeminjaman>({ page: 1, limit: 12 });
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

  const hapus = async (id: string) => {
    try {
      await peminjamanService.hapus(id);
      notify.sukses('Data peminjaman berhasil dihapus.');
      await muat();
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal menghapus data peminjaman.'));
      throw error; // biar dialog tetap terbuka saat gagal
    }
  };

  // Debounce pencarian
  useEffect(() => {
    const timer = setTimeout(() => setFilter((f) => ({ ...f, q: cari || undefined, page: 1 })), 400);
    return () => clearTimeout(timer);
  }, [cari]);

  return (
    <div className="space-y-gutter">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-jakarta text-headline-lg text-primary">Manajemen Peminjaman</h1>
          <p className="text-on-surface-variant">Tinjau, setujui, atau tolak pengajuan peminjaman.</p>
        </div>
        <ImportPeminjamDialog onSelesai={muat} />
      </div>

      {/* Panel tabel */}
      <div className="glass-card overflow-hidden rounded-2xl border border-outline-variant">
        {/* Filter */}
        <div className="grid grid-cols-1 gap-3 border-b border-outline-variant p-stack-md sm:grid-cols-2">
          <div className="relative">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
            />
            <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari kode / nama barang / nama peminjam..." className="pl-10" />
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
          <div className="p-stack-lg">
            <LoadingSpinner />
          </div>
        ) : data.length === 0 ? (
          <div className="p-stack-lg">
            <EmptyState ikon={ClipboardList} judul="Belum ada peminjaman" deskripsi="Tidak ada data peminjaman yang cocok dengan filter." />
          </div>
        ) : (
          <div className="p-stack-md">
            <TabelPeminjaman data={data} hrefDetail={RUTE.adminPeminjamanDetail} tampilkanPeminjam onHapus={hapus} />
            <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
              <div className="flex items-center gap-2 text-sm text-on-surface-variant">
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
                <span>per halaman{meta ? ` • ${meta.total} data` : ''}</span>
              </div>

              {meta && meta.totalHalaman > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-on-surface-variant">
                    Halaman {meta.page} dari {meta.totalHalaman}
                  </span>
                  <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => setFilter((f) => ({ ...f, page: (f.page || 1) - 1 }))}>
                    <ChevronLeft className="h-4 w-4" /> Sebelumnya
                  </Button>
                  <Button variant="outline" size="sm" disabled={meta.page >= meta.totalHalaman} onClick={() => setFilter((f) => ({ ...f, page: (f.page || 1) + 1 }))}>
                    Berikutnya <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
