// ============================================================
//  Peminjam — Katalog Barang.
//  Tampilan FOLDER PER MERK seperti admin (mudah mencari barang).
//  Support MULTI BARANG - user bisa memilih banyak barang sekaligus.
// ============================================================

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FolderBarangPeminjam } from '@/components/barang/FolderBarangPeminjam';
import { kelompokkanBarang } from '@/lib/kelompokkanBarang';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { useBarangFolder } from '@/hooks/useBarangFolder';
import { useJumlahKeranjang, useTotalUnitKeranjang } from '@/store/keranjangStore';
import { OPSI_FILTER_BARANG, OPSI_KONDISI } from '@/constants/status';
import { RUTE } from '@/constants/routes';

const OPSI_FOLDER = [8, 16, 32, 64];

export default function KatalogPage() {
  const { data, filter, ubahFilter, sedangMemuat } = useBarangFolder();
  const [cari, setCari] = useState('');
  const [halaman, setHalaman] = useState(1);
  const [perHalaman, setPerHalaman] = useState(8);

  const jumlahKeranjang = useJumlahKeranjang();
  const totalUnit = useTotalUnitKeranjang();

  // Debounce pencarian
  useEffect(() => {
    const timer = setTimeout(() => ubahFilter({ q: cari || undefined }), 400);
    return () => clearTimeout(timer);
  }, [cari, ubahFilter]);

  // Kelompokkan barang menjadi folder per merk+type
  const grup = useMemo(() => kelompokkanBarang(data), [data]);

  // Kunci filter berdasarkan NILAI untuk dependency useEffect.
  // Pakai object `filter` langsung selalu berubah referensinya tiap render,
  // memicu loop. Pakai JSON.stringify agar stabil.
  const filterKey = useMemo(() => JSON.stringify(filter), [filter]);

  // Kembali ke halaman 1 bila filter / jumlah per halaman berubah
  useEffect(() => {
    setHalaman(1);
  }, [filterKey, perHalaman]);

  const totalHalaman = Math.max(1, Math.ceil(grup.length / perHalaman));
  const halamanAman = Math.min(halaman, totalHalaman);
  const grupHalaman = grup.slice((halamanAman - 1) * perHalaman, halamanAman * perHalaman);

  return (
    <div className="space-y-5">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-2xl bg-brand-gradient text-white shadow-brand">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-44 w-44 rounded-full bg-blue-300/20 blur-3xl" />

        <div className="relative space-y-5 p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-jakarta text-2xl font-bold text-white sm:text-3xl">Katalog Barang</h1>
                <p className="text-sm text-white/80">
                  Telusuri & pilih barang yang ingin dipinjam
                </p>
              </div>
            </div>
            <Button asChild variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white">
              <Link href={RUTE.peminjamKeranjang}>
                <ShoppingCart className="h-4 w-4" />
                Keranjang
                {jumlahKeranjang > 0 && (
                  <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
                    {jumlahKeranjang} jenis ({totalUnit} unit)
                  </span>
                )}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Filter */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari kode / nama / merk / lokasi..."
            className="pl-9"
          />
        </div>
        <Select value={filter.kodeSatker || ''} onChange={(e) => ubahFilter({ kodeSatker: (e.target.value || undefined) as never })}>
          <option value="">Semua Kode Satker</option>
          {OPSI_FILTER_BARANG.map((o) => (
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
        <Select
          value={filter.ketersediaan || ''}
          onChange={(e) => ubahFilter({ ketersediaan: (e.target.value || undefined) as never })}
        >
          <option value="">Semua Stok</option>
          <option value="tersedia">Tersedia (mis. 1/1)</option>
          <option value="habis">Stok Habis (mis. 0/1)</option>
        </Select>
      </div>

      {/* Folder per merk */}
      {sedangMemuat ? (
        <LoadingSpinner />
      ) : data.length === 0 ? (
        <EmptyState
          judul="Barang tidak ditemukan"
          deskripsi="Coba ubah kata kunci atau filter pencarian."
        />
      ) : (
        <>
          <FolderBarangPeminjam grup={grupHalaman} />

          {/* Footer: jumlah folder per halaman + navigasi */}
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Tampilkan</span>
              <Select
                value={String(perHalaman)}
                onChange={(e) => setPerHalaman(Number(e.target.value))}
                className="h-9 w-[4.5rem]"
                aria-label="Jumlah folder per halaman"
              >
                {OPSI_FOLDER.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
              <span>folder per halaman • {grup.length} merk • {data.length} barang</span>
            </div>

            {totalHalaman > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Halaman {halamanAman} dari {totalHalaman}
                </span>
                <Button variant="outline" size="sm" disabled={halamanAman <= 1} onClick={() => setHalaman(halamanAman - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Sebelumnya
                </Button>
                <Button variant="outline" size="sm" disabled={halamanAman >= totalHalaman} onClick={() => setHalaman(halamanAman + 1)}>
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