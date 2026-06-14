// ============================================================
//  Peminjam — Riwayat Peminjaman.
// ============================================================

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, History, PlusCircle } from 'lucide-react';
import { Select } from '@/components/ui/input';
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

export default function RiwayatPage() {
  const [data, setData] = useState<Peminjaman[]>([]);
  const [meta, setMeta] = useState<MetaPagination | null>(null);
  const [filter, setFilter] = useState<FilterPeminjaman>({ page: 1, limit: 10 });
  const [memuat, setMemuat] = useState(true);

  const muat = useCallback(async () => {
    setMemuat(true);
    try {
      const hasil = await peminjamanService.getSemua(filter);
      setData(hasil.data);
      setMeta(hasil.meta);
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal memuat riwayat.'));
    } finally {
      setMemuat(false);
    }
  }, [filter]);

  useEffect(() => {
    muat();
  }, [muat]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Riwayat Peminjaman</h1>
          <p className="text-muted-foreground">Daftar seluruh pengajuan peminjaman Anda.</p>
        </div>
        <Button asChild>
          <Link href={RUTE.peminjamAjukan}>
            <PlusCircle className="h-4 w-4" /> Ajukan Peminjaman
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <Select
          value={filter.status || ''}
          onChange={(e) => setFilter((f) => ({ ...f, status: (e.target.value || undefined) as never, page: 1 }))}
          className="sm:max-w-xs"
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
        <EmptyState
          ikon={History}
          judul="Belum ada riwayat"
          deskripsi="Anda belum pernah mengajukan peminjaman."
          aksi={
            <Button asChild>
              <Link href={RUTE.peminjamAjukan}>
                <PlusCircle className="h-4 w-4" /> Ajukan Sekarang
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <TabelPeminjaman data={data} hrefDetail={RUTE.peminjamRiwayatDetail} />
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
