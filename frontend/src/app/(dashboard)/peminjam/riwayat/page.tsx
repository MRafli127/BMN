// ============================================================
//  Peminjam — Riwayat Peminjaman.
// ============================================================

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, History } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TabelPeminjaman } from '@/components/peminjaman/TabelPeminjaman';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { peminjamanService, type FilterPeminjaman } from '@/services/peminjaman.service';
import { useQuery } from '@/lib/cache';
import { OPSI_STATUS, FILTER_STATUS_AKTIF } from '@/constants/status';
import { RUTE } from '@/constants/routes';
import type { Peminjaman } from '@/types/peminjaman.type';
import type { MetaPagination } from '@/types/barang.type';

export default function RiwayatPage() {
  const [filter, setFilter] = useState<FilterPeminjaman>({ page: 1, limit: 10 });

  // Terapkan filter status dari query (?status=...) saat halaman dibuka — mis. ketika
  // datang dari kartu ringkasan di dashboard. Dibaca di useEffect agar render server
  // & klien identik (aman dari hydration mismatch).
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('status');
    if (status) setFilter((f) => ({ ...f, status: status as never, page: 1 }));
  }, []);

  const key = useMemo(() => `riwayat:${JSON.stringify(filter)}`, [filter]);
  const { data: hasil, sedangMemuat: memuat } = useQuery<{ data: Peminjaman[]; meta: MetaPagination | null }>(
    key,
    () => peminjamanService.getSemua(filter),
    { tampilkanCache: true } // tampilkan data lama saat navigasi pagination
  );
  const data = hasil?.data ?? [];
  const meta = hasil?.meta ?? null;

  return (
    <div className="space-y-gutter">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-2xl bg-brand-gradient text-white shadow-brand">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-44 w-44 rounded-full bg-blue-300/20 blur-3xl" />

        <div className="relative p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-jakarta text-2xl font-bold text-white sm:text-3xl">Riwayat Peminjaman</h1>
                <p className="text-sm text-white/80">Daftar seluruh pengajuan peminjaman Anda</p>
              </div>
            </div>
            <Button asChild variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white">
              <Link href={RUTE.peminjamAjukan}>
                <History className="h-4 w-4" />
                Ajukan Peminjaman
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="glass-card rounded-2xl p-stack-md">
        <Select
          value={filter.status || ''}
          onChange={(e) => setFilter((f) => ({ ...f, status: (e.target.value || undefined) as never, page: 1 }))}
          className="sm:max-w-xs"
        >
          <option value="">Semua Status</option>
          <option value={FILTER_STATUS_AKTIF}>Sedang Aktif</option>
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
                <Icon name="add" className="text-[18px]" /> Ajukan Sekarang
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
