// ============================================================
//  Peminjam — Katalog Barang.
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { KartuBarang } from '@/components/barang/KartuBarang';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useBarang } from '@/hooks/useBarang';
import { OPSI_JENIS } from '@/constants/status';
import { RUTE } from '@/constants/routes';

export default function KatalogPage() {
  const { data, meta, filter, setFilter, ubahFilter, sedangMemuat } = useBarang({ page: 1, limit: 12 });
  const [cari, setCari] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => ubahFilter({ q: cari || undefined }), 400);
    return () => clearTimeout(timer);
  }, [cari, ubahFilter]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Katalog Barang</h1>
        <p className="text-muted-foreground">Telusuri barang yang tersedia untuk dipinjam.</p>
      </div>

      {/* Filter */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari barang..." className="pl-9" />
        </div>
        <Select value={filter.jenis || ''} onChange={(e) => ubahFilter({ jenis: (e.target.value || undefined) as never })}>
          <option value="">Semua Jenis</option>
          {OPSI_JENIS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      {sedangMemuat ? (
        <LoadingSpinner />
      ) : data.length === 0 ? (
        <EmptyState judul="Barang tidak ditemukan" deskripsi="Coba ubah kata kunci atau filter pencarian." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.map((barang) => (
              <KartuBarang
                key={barang.id}
                barang={barang}
                aksi={
                  barang.jumlahTersedia < 1 ? (
                    <Button className="w-full" disabled>
                      Stok Habis
                    </Button>
                  ) : (
                    <Button asChild className="w-full">
                      <Link href={`${RUTE.peminjamAjukan}?barangId=${barang.id}`}>
                        <PlusCircle className="h-4 w-4" /> Ajukan Pinjam
                      </Link>
                    </Button>
                  )
                }
              />
            ))}
          </div>

          {meta && meta.totalHalaman > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Halaman {meta.page} dari {meta.totalHalaman}
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
