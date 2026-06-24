'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Package } from 'lucide-react';
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { TabelPeminjaman } from '@/components/peminjaman/TabelPeminjaman';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { urlFile } from '@/lib/utils';
import { JENIS_BARANG, KONDISI_BARANG } from '@/constants/status';
import { dashboardService, type KategoriDashboard, type ResponseKategori } from '@/services/dashboard.service';
import { useQuery } from '@/lib/cache';
import { RUTE } from '@/constants/routes';
import type { Barang } from '@/types/barang.type';
import type { Peminjaman } from '@/types/peminjaman.type';

// Info kategori untuk judul dan ikon
const INFO_KATEGORI: Record<string, { judul: string; ikon: string; deskripsi: string }> = {
  semua: { judul: 'Semua Peminjaman', ikon: 'inventory_2', deskripsi: 'Daftar seluruh peminjaman' },
  barang: { judul: 'Daftar Barang', ikon: 'inventory', deskripsi: 'Seluruh aset terdaftar' },
  pengajuan_menunggu: { judul: 'Pengajuan Menunggu', ikon: 'pending_actions', deskripsi: 'Menunggu persetujuan admin' },
  peminjaman_aktif: { judul: 'Peminjaman Aktif', ikon: 'sync_alt', deskripsi: 'Barang sedang digunakan' },
  barang_terlambat: { judul: 'Barang Terlambat', ikon: 'report', deskripsi: 'Melebihi batas tempo pengembalian' },
  peminjam: { judul: 'Daftar Peminjam', ikon: 'group', deskripsi: 'Pengguna terdaftar' },
};

export default function KategoriDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const kategori = params.kategori as KategoriDashboard;

  const [halaman, setHalaman] = useState(1);
  const [limit, setLimit] = useState(10);
  const [cari, setCari] = useState('');
  const [cariDebounced, setCariDebounced] = useState('');

  const info = INFO_KATEGORI[kategori] || INFO_KATEGORI.semua;
  const adalahBarang = kategori === 'barang';
  const adalahPeminjam = kategori === 'peminjam';

  // Debounce input pencarian agar tidak memanggil API tiap ketukan.
  useEffect(() => {
    const t = setTimeout(() => setCariDebounced(cari), 350);
    return () => clearTimeout(t);
  }, [cari]);

  // Kembali ke halaman 1 saat filter/ukuran data berubah.
  useEffect(() => {
    setHalaman(1);
  }, [cariDebounced, limit, kategori]);

  const qCari = adalahPeminjam ? cariDebounced : '';
  const key = useMemo(
    () => `kategori:${kategori}:${halaman}:${limit}:${qCari}`,
    [kategori, halaman, limit, qCari]
  );
  const { data, sedangMemuat: memuat, error } = useQuery<ResponseKategori>(
    key,
    () => dashboardService.ambilKategori(kategori, halaman, limit, qCari)
  );

  // Gagal memuat → kembali ke dashboard.
  useEffect(() => {
    if (error) router.push(RUTE.adminDashboard);
  }, [error, router]);

  // Spinner layar penuh hanya saat pemuatan awal; saat mencari, biarkan
  // toolbar tetap terpasang agar fokus input tidak hilang.
  if (memuat && !data) return <LoadingSpinner layarPenuh />;

  const meta = data?.meta;
  const items = data?.items || [];
  const totalHalaman = meta?.totalHalaman || 1;

  return (
    <div className="space-y-gutter">
      {/* Header */}
      <section className="flex items-center gap-4">
        <button
          onClick={() => router.push(RUTE.adminDashboard)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant bg-white transition-all hover:bg-surface-container-low"
        >
          <ArrowLeft className="h-5 w-5 text-on-surface" />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon name={info.ikon} fill className="text-[24px]" />
          </div>
          <div>
            <h1 className="font-jakarta text-headline-lg text-primary">{info.judul}</h1>
            <p className="text-sm text-on-surface-variant">{info.deskripsi}</p>
          </div>
        </div>
      </section>

      {/* Toolbar pencarian & ukuran halaman (khusus daftar peminjam) */}
      {adalahPeminjam && (
        <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
            />
            <input
              type="text"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari nama, NIP, Eselon III / IV..."
              className="w-full rounded-xl border border-outline-variant bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="ukuran-halaman" className="shrink-0 text-sm text-on-surface-variant">
              Tampilkan
            </label>
            <select
              id="ukuran-halaman"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded-xl border border-outline-variant bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {[10, 50, 100, 200].map((n) => (
                <option key={n} value={n}>
                  {n} data
                </option>
              ))}
            </select>
          </div>
        </section>
      )}

      {/* Statistik */}
      {meta && (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-on-surface-variant">
            Menampilkan <span className="font-semibold">{items.length}</span> dari{' '}
            <span className="font-semibold">{meta.total}</span> data
            {adalahPeminjam && cariDebounced && (
              <>
                {' '}untuk pencarian &ldquo;<span className="font-semibold">{cariDebounced}</span>&rdquo;
              </>
            )}
          </p>
        </div>
      )}

      {/* Konten berdasarkan kategori */}
      {items.length === 0 ? (
        <EmptyState judul="Tidak ada data" deskripsi={`Tidak ada data untuk kategori "${info.judul}".`} />
      ) : adalahBarang ? (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Foto</TableHead>
                <TableHead>Kode / Nama</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Kondisi</TableHead>
                <TableHead className="text-center">Stok</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(items as Barang[]).map((barang) => {
                const kondisi = KONDISI_BARANG[barang.kondisi];
                return (
                  <TableRow key={barang.id}>
                    <TableCell>
                      <div className="h-10 w-10 overflow-hidden rounded-md bg-muted">
                        {barang.fotoUrl ? (
                          <img src={urlFile(barang.fotoUrl)} alt={barang.nama} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">{barang.nama}</p>
                      <p className="font-mono text-xs break-all text-muted-foreground">{barang.kodeBarang}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className="border-primary/20 bg-primary/10 text-primary">{JENIS_BARANG[barang.jenis]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={kondisi.kelas}>{kondisi.label}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      <span className={barang.jumlahTersedia > 0 ? 'text-green-700' : 'text-red-600'}>
                        {barang.jumlahTersedia}
                      </span>
                      <span className="text-muted-foreground"> / {barang.jumlahTotal}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{barang.lokasiPenyimpanan || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={RUTE.adminBarangDetail(barang.id)}>
                          Detail
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : adalahPeminjam ? (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>NIP</TableHead>
                <TableHead>Eselon III</TableHead>
                <TableHead>Eselon IV</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(items as { id: string; nama: string; nip: string; email: string; jabatan: string | null; unitKerja: string | null }[]).map(
                (user, index) => (
                  <TableRow key={user.id}>
                    <TableCell className="text-muted-foreground">{(halaman - 1) * limit + index + 1}</TableCell>
                    <TableCell className="font-medium text-on-surface">{user.nama}</TableCell>
                    <TableCell className="font-mono text-sm text-primary">{user.nip}</TableCell>
                    <TableCell className="text-sm text-on-surface-variant">{user.unitKerja || '-'}</TableCell>
                    <TableCell className="text-sm text-on-surface-variant">{user.jabatan || '-'}</TableCell>
                    <TableCell className="text-sm text-on-surface-variant">{user.email}</TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-4">
          <TabelPeminjaman
            data={items as Peminjaman[]}
            hrefDetail={RUTE.adminPeminjamanDetail}
            tampilkanPeminjam
          />
        </div>
      )}

      {/* Pagination */}
      {totalHalaman > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setHalaman((h) => Math.max(1, h - 1))}
            disabled={halaman === 1}
            className="rounded-lg border border-outline-variant bg-white px-4 py-2 font-label-md transition-all hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 font-label-md text-on-surface-variant">
            Halaman {halaman} dari {totalHalaman}
          </span>
          <button
            onClick={() => setHalaman((h) => Math.min(totalHalaman, h + 1))}
            disabled={halaman === totalHalaman}
            className="rounded-lg border border-outline-variant bg-white px-4 py-2 font-label-md transition-all hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
