// ============================================================
//  Peminjam — Katalog Barang.
//   - Cari berdasarkan nama / kode / merk.
//   - Atur jumlah barang per halaman (50/100/200).
//   - Tambah barang ke keranjang sebelum mengajukan peminjaman.
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight, Eye, ShoppingCart, Check } from 'lucide-react';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { KartuBarang } from '@/components/barang/KartuBarang';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { notify } from '@/components/ui/toast';
import { useBarang } from '@/hooks/useBarang';
import { useKeranjangStore, useJumlahKeranjang } from '@/store/keranjangStore';
import { OPSI_JENIS } from '@/constants/status';
import { RUTE } from '@/constants/routes';
import type { Barang } from '@/types/barang.type';

const OPSI_PER_HALAMAN = [12, 50, 100, 200];

export default function KatalogPage() {
  const { data, meta, filter, setFilter, ubahFilter, sedangMemuat } = useBarang({ page: 1, limit: 12 });
  const [cari, setCari] = useState('');

  const items = useKeranjangStore((s) => s.items);
  const tambah = useKeranjangStore((s) => s.tambah);
  const hapus = useKeranjangStore((s) => s.hapus);
  const jumlahKeranjang = useJumlahKeranjang();

  // Hindari hydration mismatch: status keranjang baru dibaca setelah mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const timer = setTimeout(() => ubahFilter({ q: cari || undefined }), 400);
    return () => clearTimeout(timer);
  }, [cari, ubahFilter]);

  const tanganiKeranjang = (barang: Barang) => {
    if (mounted && items[barang.id]) {
      hapus(barang.id);
      notify.info(`"${barang.nama}" dihapus dari keranjang.`);
    } else {
      tambah(barang);
      notify.sukses(`"${barang.nama}" ditambahkan ke keranjang.`);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Katalog Barang</h1>
          <p className="text-muted-foreground">Telusuri barang yang tersedia untuk dipinjam.</p>
        </div>
        <Button asChild variant={jumlahKeranjang > 0 ? 'default' : 'outline'}>
          <Link href={RUTE.peminjamKeranjang}>
            <ShoppingCart className="h-4 w-4" /> Keranjang{jumlahKeranjang > 0 ? ` (${jumlahKeranjang})` : ''}
          </Link>
        </Button>
      </div>

      {/* Filter */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border bg-card p-4 sm:grid-cols-3">
        <div className="relative sm:col-span-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari kode / nama / merk / lokasi..."
            className="pl-9"
          />
        </div>
        <Select value={filter.jenis || ''} onChange={(e) => ubahFilter({ jenis: (e.target.value || undefined) as never })}>
          <option value="">Semua Jenis</option>
          {OPSI_JENIS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select
          value={String(filter.limit ?? 12)}
          onChange={(e) => ubahFilter({ limit: Number(e.target.value) })}
        >
          {OPSI_PER_HALAMAN.map((n) => (
            <option key={n} value={n}>
              {n} per halaman
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
          {meta && (
            <p className="text-sm text-muted-foreground">
              Menampilkan {data.length} dari {meta.total} barang.
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.map((barang) => {
              const diKeranjang = mounted && !!items[barang.id];
              const habis = barang.jumlahTersedia < 1;
              return (
                <KartuBarang
                  key={barang.id}
                  barang={barang}
                  aksi={
                    <div className="flex gap-2">
                      <Button asChild variant="outline" className="flex-1">
                        <Link href={RUTE.peminjamKatalogDetail(barang.id)}>
                          <Eye className="h-4 w-4" /> Detail
                        </Link>
                      </Button>
                      {habis ? (
                        <Button className="flex-1" disabled>
                          Stok Habis
                        </Button>
                      ) : (
                        <Button
                          className="flex-1"
                          variant={diKeranjang ? 'secondary' : 'default'}
                          onClick={() => tanganiKeranjang(barang)}
                        >
                          {diKeranjang ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                          {diKeranjang ? 'Di Keranjang' : 'Keranjang'}
                        </Button>
                      )}
                    </div>
                  }
                />
              );
            })}
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
