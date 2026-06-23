// ============================================================
//  Admin — Manajemen Barang (folder per merk, cari, filter).
//  Barang dikelompokkan ke dalam folder berdasarkan merk yang sama;
//  tiap folder memuat unit beserta kode barang dan NUP-nya.
// ============================================================

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FolderBarang, kelompokkanPerMerk } from '@/components/barang/FolderBarang';
import { ImportBarangDialog } from '@/components/barang/ImportBarangDialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { notify } from '@/components/ui/toast';
import { useBarangFolder } from '@/hooks/useBarangFolder';
import { barangService } from '@/services/barang.service';
import { ambilPesanError } from '@/lib/utils';
import { OPSI_JENIS, OPSI_KONDISI } from '@/constants/status';
import { RUTE } from '@/constants/routes';

// Pilihan jumlah folder yang ditampilkan per halaman
const OPSI_FOLDER = [8, 16, 32, 64];

export default function AdminBarangPage() {
  const { data, filter, ubahFilter, sedangMemuat, refetch } = useBarangFolder();
  const [cari, setCari] = useState('');
  const [halaman, setHalaman] = useState(1);
  const [perHalaman, setPerHalaman] = useState(8);

  // Debounce pencarian
  useEffect(() => {
    const timer = setTimeout(() => ubahFilter({ q: cari || undefined }), 400);
    return () => clearTimeout(timer);
  }, [cari, ubahFilter]);

  // Kelompokkan barang menjadi folder per merk
  const grup = useMemo(() => kelompokkanPerMerk(data), [data]);

  // Kembali ke halaman 1 bila filter / jumlah per halaman berubah
  useEffect(() => {
    setHalaman(1);
  }, [filter, perHalaman]);

  const totalHalaman = Math.max(1, Math.ceil(grup.length / perHalaman));
  const halamanAman = Math.min(halaman, totalHalaman);
  const grupHalaman = grup.slice((halamanAman - 1) * perHalaman, halamanAman * perHalaman);

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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manajemen Barang</h1>
          <p className="text-muted-foreground">Kelola data Barang Milik Negara, dikelompokkan per merk.</p>
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
