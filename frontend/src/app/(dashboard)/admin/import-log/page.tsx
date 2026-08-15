'use client';

// ============================================================
//  Halaman Riwayat Log Import — Admin only
//  Menampilkan catatan hasil import (peminjam/pegawai/barang)
// ============================================================

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { cn, formatTanggal } from '@/lib/utils';
import { HapusLogImportDialog } from '@/components/import-log/HapusLogImportDialog';
import { ambilSemuaLog, ambilStatistikImport, hapusLog, type ImportLog, type StatistikImport } from '@/services/importLog.service';
import { notify } from '@/components/ui/toast';
import { useRouter } from 'next/navigation';

export default function ImportLogPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [statistik, setStatistik] = useState<StatistikImport | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [logTerpilih, setLogTerpilih] = useState<ImportLog | null>(null);
  const [logTargetHapus, setLogTargetHapus] = useState<ImportLog | null>(null);
  const [sedangHapus, setSedangHapus] = useState(false);
  const [tabAktif, setTabAktif] = useState<'ditambahkan' | 'diperbarui' | 'peminjaman' | 'gagal'>('gagal');

  useEffect(() => {
    muatData();
  }, [page]);

  const muatData = async () => {
    setLoading(true);
    try {
      const [responseLog, responseStat] = await Promise.all([
        ambilSemuaLog(page, 10),
        ambilStatistikImport(),
      ]);
      const { data: logsData = [], meta } = responseLog ?? {};
      setLogs(logsData);
      setTotalPages(meta?.pagination?.totalPages ?? 1);
      setStatistik(responseStat ?? null);
    } catch (error) {
      console.error('Gagal memuat data log import:', error);
      notify.gagal('Gagal memuat data log import.');
    } finally {
      setLoading(false);
    }
  };

  const tanganiHapus = async () => {
    if (!logTargetHapus) return;
    setSedangHapus(true);
    try {
      await hapusLog(logTargetHapus.id);
      notify.suksess('Log berhasil dihapus.');
      setLogTargetHapus(null);
      muatData();
    } catch {
      notify.gagal('Gagal menghapus log.');
    } finally {
      setSedangHapus(false);
    }
  };

  const labelJenis: Record<string, string> = {
    PEMINJAM: 'Import Peminjam',
    BARANG: 'Import Barang',
    PEGAWAI: 'Import Pegawai',
  };

  const badgeColor: Record<string, string> = {
    PEMINJAM: 'bg-blue-100 text-blue-800',
    BARANG: 'bg-green-100 text-green-800',
    PEGAWAI: 'bg-purple-100 text-purple-800',
  };

  const getDetailList = (log: ImportLog) => {
    switch (tabAktif) {
      case 'ditambahkan':
        return log.detailDitambahkan?.data || [];
      case 'diperbarui':
        return log.detailDiperbarui?.data || [];
      case 'peminjaman':
        return log.detailPeminjaman?.data || [];
      case 'gagal':
        return [...(log.detailGagal?.data || []), ...(log.detailBarangTidakDitemukan?.data || [])];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Hero Header - gradient biru modern */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-6 text-white shadow-lg shadow-blue-700/20 animate-page-in sm:p-8">
        {/* Dekorasi blob & grid pattern */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-cyan-300/30 blur-3xl" />
          <div className="absolute -right-32 -bottom-32 h-80 w-80 rounded-full bg-blue-400/25 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
        </div>

        <div className="relative z-10 flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md">
            <Icon name="upload_file" className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="font-jakarta text-2xl font-bold tracking-tight sm:text-3xl">
              Riwayat Import
            </h1>
            <p className="mt-0.5 text-sm text-white/85">
              Catatan hasil import data peminjam, pegawai, dan barang
            </p>
          </div>
        </div>
      </section>

      {/* Statistik Ringkasan */}
      {statistik && (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
          <StatCard
            label="Total Import"
            value={statistik.totalImport}
            icon="upload_file"
            color="bg-blue-50 border-blue-200"
            iconColor="text-blue-600"
          />
          <StatCard
            label="Akun Ditambahkan"
            value={statistik.totalAkunDitambahkan}
            icon="person_add"
            color="bg-green-50 border-green-200"
            iconColor="text-green-600"
          />
          <StatCard
            label="Akun Diperbarui"
            value={statistik.totalAkunDiperbarui}
            icon="edit"
            color="bg-amber-50 border-amber-200"
            iconColor="text-amber-600"
          />
          <StatCard
            label="Peminjaman Dibuat"
            value={statistik.totalPeminjamanDibuat}
            icon="assignment"
            color="bg-purple-50 border-purple-200"
            iconColor="text-purple-600"
          />
          <StatCard
            label="Total Gagal"
            value={statistik.totalGagal}
            icon="error"
            color="bg-red-50 border-red-200"
            iconColor="text-red-600"
          />
        </div>
      )}

      {/* Daftar Log */}
      <div className="rounded-2xl border border-outline-variant bg-surface shadow-sm">
        <div className="border-b border-outline-variant p-4">
          <h2 className="font-semibold text-on-surface">Daftar Log Import</h2>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-on-surface-variant">
            <Icon name="upload_file" className="text-5xl opacity-30" />
            <p>Belum ada log import.</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant">
            {logs.map((log) => (
              <div
                key={log.id}
                className={cn(
                  'p-4 transition-colors hover:bg-surface-variant/30',
                  logTerpilih?.id === log.id && 'bg-surface-variant/50'
                )}
              >
                {/* Header Log */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', badgeColor[log.jenisImport])}>
                        {labelJenis[log.jenisImport]}
                      </span>
                      <span className="text-sm text-on-surface-variant">{log.namaFile}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <Icon name="person" style={{ fontSize: 16 }} />
                        {log.userNama}
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon name="email" style={{ fontSize: 16 }} />
                        {log.userEmail}
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon name="schedule" style={{ fontSize: 16 }} />
                        {formatTanggal(log.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setLogTargetHapus(log)}
                      className="rounded-lg p-2 text-error transition-colors hover:bg-error/10"
                      title="Hapus log"
                    >
                      <Icon name="delete" />
                    </button>
                    <button
                      onClick={() => setLogTerpilih(logTerpilih?.id === log.id ? null : log)}
                      className="rounded-lg p-2 text-primary transition-colors hover:bg-primary/10"
                    >
                      <Icon name={logTerpilih?.id === log.id ? 'expand_less' : 'expand_more'} />
                    </button>
                  </div>
                </div>

                {/* Ringkasan */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {log.akunDitambahkan > 0 && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      +{log.akunDitambahkan} ditambahkan
                    </span>
                  )}
                  {log.akunDiperbarui > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      ~{log.akunDiperbarui} diperbarui
                    </span>
                  )}
                  {log.peminjamanDibuat > 0 && (
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                      @{log.peminjamanDibuat} peminjaman
                    </span>
                  )}
                  {log.peminjamanDipertahankan > 0 && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                      {log.peminjamanDipertahankan} dipertahankan
                    </span>
                  )}
                  {log.dilewatiTanpaNup > 0 && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      {log.dilewatiTanpaNup} tanpa NUP
                    </span>
                  )}
                  {(log.gagal > 0 || log.barangTidakDitemukan > 0) && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                      {log.gagal + log.barangTidakDitemukan} gagal
                    </span>
                  )}
                </div>

                {/* Detail Dropdown */}
                {logTerpilih?.id === log.id && (
                  <div className="mt-4 rounded-xl border border-outline-variant bg-surface-container-low p-4">
                    {/* Tabs */}
                    <div className="mb-4 flex flex-wrap gap-2 border-b border-outline-variant pb-3">
                      {[
                        { key: 'ditambahkan', label: 'Ditambahkan', count: log.akunDitambahkan, color: 'text-green-600' },
                        { key: 'diperbarui', label: 'Diperbarui', count: log.akunDiperbarui, color: 'text-amber-600' },
                        { key: 'peminjaman', label: 'Peminjaman', count: log.peminjamanDibuat, color: 'text-purple-600' },
                        { key: 'gagal', label: 'Gagal', count: log.gagal + log.barangTidakDitemukan, color: 'text-red-600' },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setTabAktif(tab.key as typeof tabAktif)}
                          className={cn(
                            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                            tabAktif === tab.key
                              ? 'bg-primary text-white'
                              : 'text-on-surface-variant hover:bg-surface-variant'
                          )}
                        >
                          {tab.label} ({tab.count})
                        </button>
                      ))}
                    </div>

                    {/* List Detail */}
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                      {getDetailList(log).length === 0 ? (
                        <p className="py-4 text-center text-sm text-on-surface-variant">Tidak ada data.</p>
                      ) : (
                        getDetailList(log).map((item, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              'rounded-lg p-3 text-sm',
                              tabAktif === 'gagal' ? 'bg-red-50' : 'bg-surface-variant/50'
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium text-on-surface">{item.nama}</p>
                                {item.nip && <p className="text-xs text-on-surface-variant">NIP: {item.nip}</p>}
                                {item.email && <p className="text-xs text-on-surface-variant">{item.email}</p>}
                                {item.merk && item.nup && (
                                  <p className="text-xs text-on-surface-variant">
                                    {item.merk} / NUP {item.nup}
                                  </p>
                                )}
                                {item.kodeBarang && (
                                  <p className="text-xs text-on-surface-variant">Kode: {item.kodeBarang}</p>
                                )}
                                {item.perubahan && item.perubahan.length > 0 && (
                                  <p className="text-xs text-amber-600">Diubah: {item.perubahan.join(', ')}</p>
                                )}
                              </div>
                              {item.baris && (
                                <span className="rounded bg-slate-700 px-1.5 py-0.5 text-xs font-semibold text-white">
                                  Baris {item.baris}
                                </span>
                              )}
                            </div>
                            {item.pesan && (
                              <p className={cn('mt-1 text-xs', tabAktif === 'gagal' ? 'text-red-600' : 'text-on-surface-variant')}>
                                {item.pesan}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-outline-variant p-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <Icon name="chevron_left" />
              Sebelumnya
            </button>
            <span className="text-sm text-on-surface-variant">
              Halaman {page} dari {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50 disabled:hover:bg-transparent"
            >
              Selanjutnya
              <Icon name="chevron_right" />
            </button>
          </div>
        )}
      </div>

      <HapusLogImportDialog
        terbuka={!!logTargetHapus}
        onUbahTerbuka={(o) => !o && setLogTargetHapus(null)}
        target={logTargetHapus}
        sedangProses={sedangHapus}
        onKonfirmasi={tanganiHapus}
      />
    </div>
  );
}

// Komponen StatCard
function StatCard({
  label,
  value,
  icon,
  color,
  iconColor,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
  iconColor: string;
}) {
  return (
    <div className={cn('rounded-xl border p-4', color)}>
      <div className="flex items-center gap-3">
        <div className={cn('grid h-10 w-10 place-items-center rounded-lg bg-white', iconColor)}>
          <Icon name={icon} style={{ fontSize: 20 }} />
        </div>
        <div>
          <p className="text-2xl font-bold text-on-surface">{value}</p>
          <p className="text-xs text-on-surface-variant">{label}</p>
        </div>
      </div>
    </div>
  );
}
