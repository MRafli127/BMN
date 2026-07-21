// ============================================================
//  Folder Peminjaman untuk Super Admin
//  Tampilan folder per satker dengan kolom sederhana:
//  Kode, Peminjam, Merk, Rencana Pinjam, Status, Aksi
//  Responsif: mobile-first dengan collapse columns
//  Optimized: sequential loading, debounce, caching
// ============================================================

'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { ChevronRight, Folder, FolderOpen, Eye, ChevronRight as ChevronRightIcon, Loader2, AlertCircle } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { OPSI_FILTER_BARANG } from '@/constants/status';
import api from '@/lib/api';
import type { Peminjaman } from '@/types/peminjaman.type';

interface Props {
  cari?: string;
  filterStatus?: string;
  satkerAwal?: string | null;
}

interface GrupSatker {
  kodeSatker: string;
  label: string;
}

// Status badge
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    MENUNGGU: { label: 'Menunggu', className: 'bg-yellow-100 text-yellow-700' },
    DISETUJUI: { label: 'Disetujui', className: 'bg-blue-100 text-blue-700' },
    DIPINJAM: { label: 'Dipinjam', className: 'bg-orange-100 text-orange-700' },
    DIKEMBALIKAN: { label: 'Dikembalikan', className: 'bg-green-100 text-green-700' },
    DITOLAK: { label: 'Ditolak', className: 'bg-red-100 text-red-700' },
    TERLAMBAT: { label: 'Terlambat', className: 'bg-red-100 text-red-700' },
    DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
  };
  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
  return <Badge className={config.className}>{config.label}</Badge>;
}

function formatTanggal(tanggal?: string | null) {
  if (!tanggal) return '-';
  return new Date(tanggal).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function ambilMerk(p: Peminjaman): string {
  if (p.merkBarang) return p.merkBarang;
  if (p.detail?.[0]?.barang?.merk) return p.detail[0].barang.merk;
  return '-';
}

function ambilNamaPeminjam(p: Peminjaman): string {
  if (p.namaPeminjam && p.namaPeminjam !== '-') return p.namaPeminjam;
  if (p.peminjam?.nama) return p.peminjam.nama;
  return '-';
}

// Skeleton row untuk desktop
function SkeletonRow() {
  return (
    <TableRow className="animate-pulse">
      <TableCell><div className="h-4 w-16 rounded bg-gray-200" /></TableCell>
      <TableCell><div className="h-4 w-24 rounded bg-gray-200" /></TableCell>
      <TableCell><div className="h-4 w-20 rounded bg-gray-200" /></TableCell>
      <TableCell className="hidden lg:table-cell"><div className="h-4 w-16 rounded bg-gray-200" /></TableCell>
      <TableCell><div className="h-5 w-16 rounded-full bg-gray-200" /></TableCell>
      <TableCell><div className="h-8 w-8 rounded bg-gray-200" /></TableCell>
    </TableRow>
  );
}

export function FolderSatkerSuperAdmin({ cari, filterStatus, satkerAwal }: Props) {
  const [terbuka, setTerbuka] = useState<Set<string>>(new Set());
  const [dataPerSatker, setDataPerSatker] = useState<Record<string, Peminjaman[]>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loadingSatker, setLoadingSatker] = useState<Set<string>>(new Set());
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [pagePerSatker, setPagePerSatker] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Refs untuk prevent duplicate calls
  const loadingSatkerRef = useRef<Set<string>>(new Set());

  // Auto-open folder berdasarkan satkerAwal.
  //
  // Catatan tentang parent: parent memberikan `key={satkerAwal ?? 'all'}` agar
  // komponen ini di-REMOUNT penuh setiap kali ?kodeSatker= berubah. Dengan
  // remount, state (termasuk apapun yang dulu disimpan di sudahDibukaRef) di-
  // reset otomatis, sehingga useEffect ini SELALU berjalan untuk satker baru.
  //
  // Sebelumnya dipakai sudahDibukaRef.current = true supaya auto-open cuma
  // jalan sekali per-mount. Setelah remount-based strategy, flag itu sudah
  // tidak diperlukan — komponen "baru" setiap navigasi satker, jadi auto-open
  // untuk satker yang ditunjuk pasti berjalan.
  useEffect(() => {
    if (satkerAwal) {
      setTerbuka(new Set([satkerAwal]));
      // Load data untuk satker tersebut
      if (!dataPerSatker[satkerAwal] && !loadingSatkerRef.current.has(satkerAwal)) {
        loadSatker(satkerAwal, 1);
      }
    }
    // Sengaja TIDAK memasukkan `dataPerSatker` sebagai dependency: perubahan
    // data satker lain boleh me-re-render komponen, tapi tidak boleh memicu
    // auto-open ulang untuk satker yang sama.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [satkerAwal]);

  const grupSatker: GrupSatker[] = useMemo(() =>
    OPSI_FILTER_BARANG.map((s) => ({
      kodeSatker: s.value,
      label: s.label,
    })),
    []
  );

  // Load count per satker SEQUENTIAL - tidak blocking folder toggle
  useEffect(() => {
    let isCancelled = false;

    const loadCounts = async () => {
      // Reset state tapi JANGAN set loadingCounts=true agar folder tetap bisa di-click
      setCounts({});
      setErrors({});

      // Load counts SEQUENTIALLY tanpa blocking UI
      for (let i = 0; i < OPSI_FILTER_BARANG.length; i++) {
        if (isCancelled) break;

        const satker = OPSI_FILTER_BARANG[i];

        try {
          const params: Record<string, unknown> = {
            limit: 1,
            page: 1,
            kodeSatker: satker.value,
          };
          if (cari) params.q = cari;
          if (filterStatus) params.status = filterStatus;

          const res = await api.get('/peminjaman', { params });
          if (!isCancelled) {
            setCounts(prev => ({ ...prev, [satker.value]: res.data.meta?.total || 0 }));
          }
        } catch (err: unknown) {
          if (isCancelled) break;
          console.error(`Gagal count satker ${satker.value}:`, err);
          if (!isCancelled) {
            setCounts(prev => ({ ...prev, [satker.value]: 0 }));
            setErrors(prev => ({ ...prev, [satker.value]: 'Gagal' }));
          }
        }
        // NO DELAY - load as fast as possible
      }

      if (!isCancelled) {
        setLoadingCounts(false);
      }
    };

    loadCounts();

    return () => {
      isCancelled = true;
    };
  }, [cari, filterStatus]);

  // Load data untuk satu satker (paginated)
  // Limit 20 untuk load lebih cepat dan konsisten
  const loadSatker = useCallback(async (kodeSatker: string, page: number = 1) => {
    // Prevent duplicate calls
    if (loadingSatkerRef.current.has(kodeSatker)) return;
    loadingSatkerRef.current.add(kodeSatker);

    setLoadingSatker(prev => new Set([...prev, kodeSatker]));
    setErrors(prev => ({ ...prev, [kodeSatker]: '' }));

    try {
      const params: Record<string, unknown> = {
        limit: 20, // Reduced from 50 for faster loading
        page,
        kodeSatker,
      };
      if (cari) params.q = cari;
      if (filterStatus) params.status = filterStatus;

      const res = await api.get('/peminjaman', { params });
      const data = res.data.data || [];

      setDataPerSatker(prev => ({
        ...prev,
        [kodeSatker]: page === 1 ? data : [...(prev[kodeSatker] || []), ...data],
      }));
      setPagePerSatker(prev => ({ ...prev, [kodeSatker]: page }));
    } catch (err: unknown) {
      console.error('Gagal memuat satker:', kodeSatker, err);
      const errorMessage = err instanceof Error ? err.message : 'Gagal memuat data';
      setErrors(prev => ({ ...prev, [kodeSatker]: errorMessage }));
    } finally {
      loadingSatkerRef.current.delete(kodeSatker);
      setLoadingSatker(prev => {
        const baru = new Set(prev);
        baru.delete(kodeSatker);
        return baru;
      });
    }
  }, [cari, filterStatus]);

  const toggle = useCallback((kunci: string) => {
    setTerbuka(prev => {
      const baru = new Set(prev);
      if (baru.has(kunci)) {
        baru.delete(kunci);
      } else {
        baru.add(kunci);
        // Load data saat folder dibuka (halaman 1)
        if (!dataPerSatker[kunci] && !loadingSatkerRef.current.has(kunci)) {
          loadSatker(kunci, 1);
        }
      }
      return baru;
    });
  }, [dataPerSatker, loadSatker]);

  const loadMore = useCallback((kodeSatker: string) => {
    const nextPage = (pagePerSatker[kodeSatker] || 1) + 1;
    loadSatker(kodeSatker, nextPage);
  }, [pagePerSatker, loadSatker]);

  const retryLoadSatker = useCallback((kodeSatker: string) => {
    setErrors(prev => ({ ...prev, [kodeSatker]: '' }));
    loadSatker(kodeSatker, 1);
  }, [loadSatker]);

  const totalSemua = Object.values(counts).reduce((a, b) => a + b, 0);

  // Urutkan: satker dengan data lebih dulu, yang kosong di bawah
  const sortedGrupSatker = useMemo(() => {
    return [...grupSatker].sort((a, b) => {
      const countA = counts[a.kodeSatker] || 0;
      const countB = counts[b.kodeSatker] || 0;
      if (countA === 0 && countB > 0) return 1;
      if (countB === 0 && countA > 0) return -1;
      return 0;
    });
  }, [grupSatker, counts]);

  return (
    <div className="space-y-3">
      {/* Header info total */}
      <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
        <span className="font-semibold">{totalSemua}</span> total peminjaman dari seluruh satker
      </div>

      <div className="space-y-2">
        {sortedGrupSatker.map((g) => {
          const buka = terbuka.has(g.kodeSatker);
          const loading = loadingSatker.has(g.kodeSatker);
          const items = dataPerSatker[g.kodeSatker] || [];
          const totalCount = counts[g.kodeSatker] || 0;
          const hasMore = items.length < totalCount;
          const error = errors[g.kodeSatker];

          return (
            <div
              key={g.kodeSatker}
              className={cn(
                'overflow-hidden rounded-xl border-2 bg-card transition-colors',
                buka ? 'border-primary/50 ring-1 ring-primary/20' : 'border-slate-200/50'
              )}
            >
              {/* Header folder */}
              <button
                type="button"
                onClick={() => toggle(g.kodeSatker)}
                aria-expanded={buka}
                className={cn(
                  'flex w-full items-center gap-3 p-4 text-left transition-colors',
                  buka ? 'bg-gradient-to-r from-primary/10 to-indigo-500/10 hover:from-primary/15 hover:to-indigo-500/15' : 'hover:bg-slate-50'
                )}
              >
                <div className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300',
                  buka ? 'bg-gradient-to-br from-primary to-indigo-600 shadow-lg' : 'bg-slate-100'
                )}>
                  {buka ? (
                    <FolderOpen className="h-5 w-5 text-white" />
                  ) : (
                    <Folder className="h-5 w-5 text-slate-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate font-semibold text-sm text-slate-700">{g.label}</p>
                  <p className="truncate font-mono text-xs text-slate-400">{g.kodeSatker}</p>
                </div>
                <span className={cn(
                  'shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors',
                  totalCount > 0 ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
                )}>
                  {loadingCounts && !counts[g.kodeSatker] ? '...' : totalCount}
                </span>
                <div className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-300',
                  buka ? 'bg-primary/20' : 'bg-slate-100'
                )}>
                  <svg
                    className={cn('h-4 w-4 transition-transform', buka ? 'rotate-180 text-primary' : 'text-slate-400')}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </button>

              {/* Isi folder */}
              {buka && (
                <div className="border-t border-outline-variant">
                  {loading && items.length === 0 ? (
                    // Initial loading
                    <div className="p-3 sm:p-4">
                      <div className="hidden md:block">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead>Kode</TableHead>
                              <TableHead>Peminjam</TableHead>
                              <TableHead>Merk</TableHead>
                              <TableHead>Rencana Pinjam</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Aksi</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <SkeletonRow key={i} />
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="md:hidden space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="animate-pulse rounded-lg border p-3">
                            <div className="flex justify-between">
                              <div className="h-4 w-20 rounded bg-gray-200" />
                              <div className="h-5 w-16 rounded-full bg-gray-200" />
                            </div>
                            <div className="mt-2 h-3 w-32 rounded bg-gray-200" />
                            <div className="mt-1 h-3 w-24 rounded bg-gray-200" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : error ? (
                    // Error state
                    <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
                      <AlertCircle className="h-8 w-8 text-red-400" />
                      <p className="text-sm text-red-600">{error}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retryLoadSatker(g.kodeSatker)}
                        className="mt-2"
                      >
                        <Loader2 className="h-4 w-4" />
                        Coba Lagi
                      </Button>
                    </div>
                  ) : items.length === 0 ? (
                    // Empty state
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {totalCount === 0 ? 'Tidak ada peminjaman di satker ini' : 'Memuat data...'}
                    </div>
                  ) : (
                    // Data loaded
                    <>
                      {/* Desktop Table */}
                      <div className="hidden md:block">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead>Kode</TableHead>
                              <TableHead>Peminjam</TableHead>
                              <TableHead>Merk</TableHead>
                              <TableHead>Rencana Pinjam</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Aksi</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((p) => (
                              <TableRow key={p.id} className="transition-colors hover:bg-gray-50">
                                <TableCell className="font-mono text-xs">
                                  {p.kodeTransaksi || p.kodePeminjaman}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {ambilNamaPeminjam(p)}
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">
                                  {ambilMerk(p)}
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-sm text-gray-600">
                                  {formatTanggal(p.tanggalRencanaPinjam || p.tanggalPinjamRencana)}
                                </TableCell>
                                <TableCell>
                                  <StatusBadge status={p.status} />
                                </TableCell>
                                <TableCell>
                                  <Link href={`/super-admin/peminjaman/${p.id}`} prefetch={true}>
                                    <button
                                      type="button"
                                      className="rounded-lg border border-gray-300 p-1.5 transition-colors hover:bg-gray-100 active:scale-95"
                                    >
                                      <Eye className="h-4 w-4 text-gray-600" />
                                    </button>
                                  </Link>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="md:hidden space-y-2 p-3">
                        {items.map((p) => (
                          <Link
                            key={p.id}
                            href={`/super-admin/peminjaman/${p.id}`}
                            prefetch={true}
                            className="block"
                          >
                            <div className="rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50 active:scale-[0.99]">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-mono text-xs text-gray-500">
                                    {p.kodeTransaksi || p.kodePeminjaman}
                                  </p>
                                  <p className="mt-0.5 truncate font-medium text-gray-900">
                                    {ambilNamaPeminjam(p)}
                                  </p>
                                </div>
                                <StatusBadge status={p.status} />
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                                <span className="truncate">{ambilMerk(p)}</span>
                                <span className="text-gray-300">•</span>
                                <span className="whitespace-nowrap">{formatTanggal(p.tanggalRencanaPinjam || p.tanggalPinjamRencana)}</span>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>

                      {/* Load more button */}
                      {hasMore && (
                        <div className="flex items-center justify-center border-t p-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadMore(g.kodeSatker)}
                            disabled={loading}
                            className="w-full sm:w-auto"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Memuat...
                              </>
                            ) : (
                              <>
                                <ChevronRightIcon className="h-4 w-4" />
                                Lihat Lebih Banyak ({totalCount - items.length})
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
