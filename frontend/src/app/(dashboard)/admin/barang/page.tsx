// ============================================================
//  Admin — Manajemen Barang (daftar, cari, filter, pagination).
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TabelBarang } from '@/components/barang/TabelBarang';
import { ImportBarangDialog } from '@/components/barang/ImportBarangDialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { notify } from '@/components/ui/toast';
import { useBarang } from '@/hooks/useBarang';
import { barangService } from '@/services/barang.service';
import { ambilPesanError } from '@/lib/utils';
import { OPSI_JENIS, OPSI_KONDISI } from '@/constants/status';
import { RUTE } from '@/constants/routes';

// Pilihan jumlah baris yang ditampilkan per halaman
const OPSI_LIMIT = [12, 50, 100, 200];

export default function AdminBarangPage() {
  const { data, meta, filter, setFilter, ubahFilter, sedangMemuat, refetch } = useBarang({ page: 1, limit: 12 });
  const [cari, setCari] = useState('');

  // Debounce pencarian
  useEffect(() => {
    const timer = setTimeout(() => ubahFilter({ q: cari || undefined }), 400);
    return () => clearTimeout(timer);
  }, [cari, ubahFilter]);

  const hapus = async (id: string) => {
    try {
      await barangService.remove(id);
      notify.sukses('Barang berhasil dihapus.');
      refetch();
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal menghapus barang.'));
      throw error; // biarkan dialog tetap terbuka
    }
  };

  const gantiHalaman = (page: number) => setFilter((f) => ({ ...f, page }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manajemen Barang</h1>
          <p className="text-muted-foreground">Kelola data Barang Milik Negara.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ImportBarangDialog onSelesai={refetch} />
          <Button asChild>
            <Link href={RUTE.adminBarangTambah}>
              <Plus className="h-4 w-4" /> Tambah Barang
            </Link>
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border bg-card p-4 sm:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari kode / nama / merk / lokasi..." className="pl-9" />
        </div>
        <Select value={filter.jenis || ''} onChange={(e) => ubahFilter({ jenis: (e.target.value || undefined) as never })}>
          <option value="">Semua Jenis</option>
          {OPSI_JENIS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select value={filter.kondisi || ''} onChange={(e) => ubahFilter({ kondisi: (e.target.value || undefined) as never })}>
          <option value="">Semua Kondisi</option>
          {OPSI_KONDISI.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Tabel */}
      {sedangMemuat ? (
        <LoadingSpinner />
      ) : data.length === 0 ? (
        <EmptyState
          judul="Belum ada barang"
          deskripsi="Tambahkan barang pertama Anda untuk mulai mengelola BMN."
          aksi={
            <Button asChild>
              <Link href={RUTE.adminBarangTambah}>
                <Plus className="h-4 w-4" /> Tambah Barang
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <TabelBarang data={data} onHapus={hapus} />

          {/* Footer: jumlah per halaman + navigasi */}
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Tampilkan</span>
              <Select
                value={String(filter.limit ?? 12)}
                onChange={(e) => ubahFilter({ limit: Number(e.target.value) })}
                className="h-9 w-[4.5rem]"
                aria-label="Jumlah barang per halaman"
              >
                {OPSI_LIMIT.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
              <span>per halaman{meta ? ` • ${meta.total} barang` : ''}</span>
            </div>

            {meta && meta.totalHalaman > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Halaman {meta.page} dari {meta.totalHalaman}
                </span>
                <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => gantiHalaman(meta.page - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Sebelumnya
                </Button>
                <Button variant="outline" size="sm" disabled={meta.page >= meta.totalHalaman} onClick={() => gantiHalaman(meta.page + 1)}>
                  Berikutnya <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
