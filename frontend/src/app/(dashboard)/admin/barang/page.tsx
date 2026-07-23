// ============================================================
//  Admin — Manajemen Barang (folder per merk, cari, filter).
//  Barang dikelompokkan ke dalam folder berdasarkan merk yang sama;
//  tiap folder memuat unit beserta kode barang dan NUP-nya.
// ============================================================

'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Plus, ChevronLeft, ChevronRight, List } from 'lucide-react';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FolderBarang } from '@/components/barang/FolderBarang';
import { kelompokkanBarang } from '@/lib/kelompokkanBarang';
import { ImportBarangDialog } from '@/components/barang/ImportBarangDialog';
import { ExportModal } from '@/components/export/ExportModal';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { notify } from '@/components/ui/toast';
import { useBarangFolder } from '@/hooks/useBarangFolder';
import { barangService } from '@/services/barang.service';
import { ambilPesanError } from '@/lib/utils';
import { OPSI_FILTER_BARANG, OPSI_KONDISI } from '@/constants/status';
import { RUTE } from '@/constants/routes';

// Pilihan jumlah folder yang ditampilkan per halaman
const OPSI_FOLDER = [8, 16, 32, 64];

function KontenBarang() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter ketersediaan dari query URL (?stok=tersedia|habis), mis. saat datang
  // dari kartu "Inventaris Barang" di dashboard.
  const stok = searchParams.get('stok');
  const ketersediaanUrl = stok === 'tersedia' || stok === 'habis' ? stok : undefined;

  // Filter kode satker dari query URL (?kodeSatker=...), mis. saat datang dari popup dashboard.
  const kodeSatkerUrl = searchParams.get('kodeSatker') || undefined;

  // Pakai nilai URL sebagai filter AWAL. Karena `template.tsx` me-mount ulang
  // konten tiap navigasi, halaman yang dibuka dari dashboard langsung memuat
  // filter yang dimaksud tanpa menunggu effect.
  // OPTIMASI: includePeminjam=true agar data siapa yang meminjam ikut dimuat
  const { data, filter, ubahFilter, sedangMemuat, refetch } = useBarangFolder(
    {
      ...(ketersediaanUrl ? { ketersediaan: ketersediaanUrl } : {}),
      ...(kodeSatkerUrl ? { kodeSatker: kodeSatkerUrl } : {}),
    },
    { includePeminjam: true }
  );
  const [cari, setCari] = useState('');
  const [halaman, setHalaman] = useState(1);
  const [perHalaman, setPerHalaman] = useState(8);

  // Cadangan bila konten TIDAK di-mount ulang (perubahan query pada rute yang
  // sama): selaraskan filter saat ?stok berubah agar tak balik ke "Semua Stok".
  useEffect(() => {
    ubahFilter({ ketersediaan: ketersediaanUrl, kodeSatker: kodeSatkerUrl });
  }, [ketersediaanUrl, kodeSatkerUrl, ubahFilter]);

  // Ubah filter ketersediaan dari dropdown: perbarui filter + URL sekaligus,
  // sehingga konsisten dan bertahan saat refresh.
  const ubahKetersediaan = useCallback(
    (nilai: string) => {
      ubahFilter({ ketersediaan: (nilai || undefined) as 'tersedia' | 'habis' | undefined });
      const params = new URLSearchParams(window.location.search);
      if (nilai) params.set('stok', nilai);
      else params.delete('stok');
      const qs = params.toString();
      router.replace(qs ? `${RUTE.adminBarang}?${qs}` : RUTE.adminBarang, { scroll: false });
    },
    [router, ubahFilter]
  );

  // Debounce pencarian
  useEffect(() => {
    const timer = setTimeout(() => ubahFilter({ q: cari || undefined }), 400);
    return () => clearTimeout(timer);
  }, [cari, ubahFilter]);

  // Kelompokkan barang menjadi folder per merk+type
  const grup = useMemo(() => kelompokkanBarang(data), [data]);

  // Kunci filter berdasarkan NILAI untuk dipakai di dependency useEffect.
  // Pakai object `filter` langsung sebagai dependency akan selalu berubah
  // referensinya tiap render (object literal baru dari hook), memicu loop.
  const filterKey = useMemo(() => JSON.stringify(filter), [filter]);

  // Kembali ke halaman 1 bila filter / jumlah per halaman berubah
  useEffect(() => {
    setHalaman(1);
  }, [filterKey, perHalaman]);

  const totalHalaman = Math.max(1, Math.ceil(grup.length / perHalaman));
  const halamanAman = Math.min(halaman, totalHalaman);
  const grupHalaman = grup.slice((halamanAman - 1) * perHalaman, halamanAman * perHalaman);

  const hapus = async (id: string) => {
    try {
      await barangService.remove(id);
      notify.suksess('Barang berhasil dihapus.');
      refetch();
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal menghapus barang.'));
      throw error; // biarkan dialog tetap terbuka
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manajemen Barang</h1>
          <p className="text-muted-foreground">Kelola data Barang Milik Negara, dikelompokkan per merk.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportModal />
          <ImportBarangDialog onSelesai={refetch} />
          <Button asChild variant="default">
            <Link href={RUTE.adminBarangBulk}>
              <List className="h-4 w-4" /> Tambah Barang Massal
            </Link>
          </Button>
        </div>
      </div>

      {/* Panel search + filter */}
      <div className="overflow-hidden rounded-xl border bg-card">
        {/* Search — lebar penuh, baris sendiri */}
        <div className="border-b border-outline-variant p-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari kode / nama barang / merk / nama peminjam..." className="pl-9" />
          </div>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap items-center gap-3 bg-muted/20 p-4">
          <Select value={filter.kodeSatker || ''} onChange={(e) => ubahFilter({ kodeSatker: (e.target.value || undefined) as never })} className="w-52">
            <option value="">Semua Kode Satker</option>
            {OPSI_FILTER_BARANG.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select value={filter.kondisi || ''} onChange={(e) => ubahFilter({ kondisi: (e.target.value || undefined) as never })} className="w-40">
            <option value="">Semua Kondisi</option>
            {OPSI_KONDISI.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select value={filter.ketersediaan || ''} onChange={(e) => ubahKetersediaan(e.target.value)} className="w-40">
            <option value="">Semua Stok</option>
            <option value="tersedia">Tersedia</option>
            <option value="habis">Habis</option>
          </Select>
        </div>
      </div>

      {/* Folder per merk */}
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
          <FolderBarang grup={grupHalaman} onHapus={hapus} />

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

export default function AdminBarangPage() {
  // useSearchParams butuh batas Suspense agar tidak memaksa render statis gagal.
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <KontenBarang />
    </Suspense>
  );
}
