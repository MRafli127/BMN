// ============================================================
//  Log Aktivitas — halaman Super Admin untuk melihat semua aktivitas.
//  Optimized: useDeferredValue, memo, skeleton loading
// ============================================================

'use client';

import { useEffect, useState, useCallback, useRef, memo, useDeferredValue } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { EmptyState } from '@/components/shared/EmptyState';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { TableSkeleton } from '@/components/shared/SuperAdminSkeleton';

interface AuditLog {
  id: string;
  userId?: string;
  userEmail?: string;
  userNama?: string;
  aksi: string;
  entitas: string;
  entitasId?: string;
  dataLama?: any;
  dataBaru?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  labelAksi?: string;
  labelEntitas?: string;
  deskripsi?: string;
  kodeBarang?: string;
}

// ============================================================
//  Mapping aksi ke warna badge
// ============================================================
const AKSI_WARNA: Record<string, { bg: string; text: string; icon?: string }> = {
  // Peminjaman
  PEMINJAMAN_MENUNGGU: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '📝' },
  PEMINJAMAN_DISETUJUI: { bg: 'bg-green-100', text: 'text-green-700', icon: '✅' },
  PEMINJAMAN_DITOLAK: { bg: 'bg-red-100', text: 'text-red-700', icon: '❌' },
  PEMINJAMAN_DISERAHKAN: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '📦' },
  PEMINJAMAN_MEMINTA_PENGEMBALIAN: { bg: 'bg-orange-100', text: 'text-orange-700', icon: '🔄' },
  PEMINJAMAN_DIKEMBALIKAN: { bg: 'bg-teal-100', text: 'text-teal-700', icon: '🏁' },
  PEMINJAMAN_DIBATALKAN: { bg: 'bg-gray-100', text: 'text-gray-700', icon: '🚫' },
  // Barang
  BARANG_CREATE: { bg: 'bg-green-100', text: 'text-green-700', icon: '➕' },
  BARANG_UPDATE: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '✏️' },
  BARANG_DELETE: { bg: 'bg-red-100', text: 'text-red-700', icon: '🗑️' },
  BARANG_STOK_CHANGE: { bg: 'bg-purple-100', text: 'text-purple-700', icon: '📊' },
  BARANG_IMPORT: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: '📥' },
  // User
  USER_CREATE: { bg: 'bg-green-100', text: 'text-green-700', icon: '👤' },
  USER_UPDATE: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '👤' },
  USER_DELETE: { bg: 'bg-red-100', text: 'text-red-700', icon: '👤' },
  // Auth
  LOGIN: { bg: 'bg-purple-100', text: 'text-purple-700', icon: '🔑' },
  LOGOUT: { bg: 'bg-gray-100', text: 'text-gray-700', icon: '🔒' },
  LOGIN_FAILED: { bg: 'bg-red-100', text: 'text-red-700', icon: '⚠️' },
  REGISTER: { bg: 'bg-green-100', text: 'text-green-700', icon: '📝' },
  // Satker
  SATKER_CREATE: { bg: 'bg-green-100', text: 'text-green-700', icon: '🏢' },
  SATKER_UPDATE: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '🏢' },
  SATKER_DELETE: { bg: 'bg-red-100', text: 'text-red-700', icon: '🏢' },
};

// ============================================================
//  Memoized Action Badge
// ============================================================
const ActionBadge = memo(function ActionBadge({ aksi }: { aksi: string }) {
  const config = AKSI_WARNA[aksi] || { bg: 'bg-gray-100', text: 'text-gray-700' };
  return (
    <Badge className={cn(config.bg, config.text)}>
      {config.icon && <span className="mr-1">{config.icon}</span>}
      {aksi.replace(/_/g, ' ')}
    </Badge>
  );
});

// ============================================================
//  Memoized Log Row
// ============================================================
const LogTableRow = memo(function LogTableRow({ log }: { log: AuditLog }) {
  const formatTanggal = (tanggal: string) => {
    const date = new Date(tanggal);
    return {
      tanggal: date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      jam: date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };
  };
  const { tanggal, jam } = formatTanggal(log.timestamp);

  return (
    <TableRow className="transition-colors hover:bg-gray-50">
      <TableCell className="whitespace-nowrap">
        <div className="text-xs">
          <p className="font-medium text-gray-900">{tanggal}</p>
          <p className="text-gray-500">{jam}</p>
        </div>
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium text-sm">{log.userNama || 'Sistem'}</p>
          <p className="text-xs text-gray-500">{log.userEmail}</p>
        </div>
      </TableCell>
      <TableCell>
        <ActionBadge aksi={log.aksi} />
      </TableCell>
      <TableCell className="text-sm text-gray-700">
        {log.deskripsi || log.labelAksi || '-'}
      </TableCell>
      <TableCell className="max-w-xs truncate text-xs font-mono text-gray-600">
        {log.kodeBarang || '-'}
      </TableCell>
    </TableRow>
  );
});

export default function LogAktivitasPage() {
  const [halaman, setHalaman] = useState(1);
  const [limit, setLimit] = useState(20);
  const [cari, setCari] = useState('');
  const cariDeferred = useDeferredValue(cari);
  const [filterAksi, setFilterAksi] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [tanggalDari, setTanggalDari] = useState('');
  const [tanggalSampai, setTanggalSampai] = useState('');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalHalaman: 1 });
  const [memuat, setMemuat] = useState(true);
  const isMounted = useRef(true);

  // Reset halaman saat filter berubah
  useEffect(() => {
    setHalaman(1);
  }, [cariDeferred, filterAksi, filterRole, limit, tanggalDari, tanggalSampai]);

  // Ambil data log
  const muatLog = useCallback(async () => {
    setMemuat(true);
    try {
      const params: Record<string, unknown> = { page: halaman, limit };
      if (cariDeferred) params.q = cariDeferred;
      if (filterAksi) params.aksi = filterAksi;
      if (filterRole) params.role = filterRole;
      if (tanggalDari) params.dari = tanggalDari;
      if (tanggalSampai) params.sampai = tanggalSampai;

      const res = await api.get('/audit-logs', { params });
      if (isMounted.current) {
        setLogs(res.data.data || []);
        setMeta(res.data.meta || { total: 0, page: 1, limit: 20, totalHalaman: 1 });
      }
    } catch (err) {
      console.error('Gagal memuat log:', err);
    } finally {
      if (isMounted.current) {
        setMemuat(false);
      }
    }
  }, [cariDeferred, filterAksi, filterRole, halaman, limit, tanggalDari, tanggalSampai]);

  useEffect(() => {
    isMounted.current = true;
    muatLog();
    return () => { isMounted.current = false; };
  }, [muatLog]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-800 to-purple-600 p-6 text-white shadow-lg animate-page-in">
        <h1 className="text-2xl font-bold">Log Aktivitas</h1>
        <p className="mt-1 text-purple-100">Riwayat aktivitas semua pengguna dalam sistem.</p>
      </div>

      {/* Filter */}
      <div className="rounded-2xl bg-white p-4 shadow-md animate-page-in" style={{ animationDelay: '50ms' }}>
        {/* Baris 1: Search */}
        <div className="relative mb-4">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: 20 }} />
          <Input
            placeholder="Cari nama atau email..."
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Baris 2: Filter tanggal + aksi (kiri), limit (kanan) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4 text-gray-400 shrink-0" />
              <input
                type="date"
                value={tanggalDari}
                onChange={(e) => setTanggalDari(e.target.value)}
                className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm transition-all focus:border-primary focus:outline-none w-36"
              />
              <span className="text-xs text-gray-400">s/d</span>
              <input
                type="date"
                value={tanggalSampai}
                onChange={(e) => setTanggalSampai(e.target.value)}
                className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm transition-all focus:border-primary focus:outline-none w-36"
              />
              {(tanggalDari || tanggalSampai) && (
                <button
                  onClick={() => { setTanggalDari(''); setTanggalSampai(''); }}
                  className="rounded p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  title="Hapus filter tanggal"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <select
              value={filterAksi}
              onChange={(e) => setFilterAksi(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm transition-all focus:border-primary focus:outline-none"
            >
              <option value="">Semua Aksi</option>
              <optgroup label="Peminjaman">
                <option value="PEMINJAMAN_MENUNGGU">Pengajuan Masuk</option>
                <option value="PEMINJAMAN_DISETUJUI">Menyetujui</option>
                <option value="PEMINJAMAN_DITOLAK">Menolak</option>
                <option value="PEMINJAMAN_DISERAHKAN">Menyerahkan Barang</option>
                <option value="PEMINJAMAN_MEMINTA_PENGEMBALIAN">Meminta Pengembalian</option>
                <option value="PEMINJAMAN_DIKEMBALIKAN">Mengembalikan</option>
                <option value="PEMINJAMAN_DIBATALKAN">Membatalkan</option>
              </optgroup>
              <optgroup label="Barang">
                <option value="BARANG_CREATE">Menambah Barang</option>
                <option value="BARANG_UPDATE">Memperbarui Barang</option>
                <option value="BARANG_DELETE">Menghapus Barang</option>
                <option value="BARANG_STOK_CHANGE">Mengubah Stok</option>
                <option value="BARANG_IMPORT">Import Barang</option>
              </optgroup>
              <optgroup label="User">
                <option value="USER_CREATE">Membuat User</option>
                <option value="USER_UPDATE">Memperbarui User</option>
                <option value="USER_DELETE">Menghapus User</option>
              </optgroup>
            </select>
          </div>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm transition-all focus:border-primary focus:outline-none"
          >
            <option value={20}>20 / halaman</option>
            <option value={50}>50 / halaman</option>
            <option value={100}>100 / halaman</option>
          </select>
        </div>
      </div>

      {/* Tabel Log */}
      <div className="rounded-2xl bg-white shadow-md animate-page-in" style={{ animationDelay: '100ms' }}>
        {memuat ? (
          <div className="p-6">
            <TableSkeleton columns={5} rows={8} />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-6">
            <EmptyState
              ikon="history"
              judul="Tidak Ada Log"
              deskripsi="Belum ada aktivitas yang tercatat."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Waktu</TableHead>
                  <TableHead>Pengguna</TableHead>
                  <TableHead>Aksi</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead>Kode</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <LogTableRow key={log.id} log={log} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!memuat && logs.length > 0 && (
          <div className="flex items-center justify-between border-t p-4">
            <p className="text-sm text-gray-500">
              Menampilkan {logs.length} dari {meta.total} log
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHalaman((p) => Math.max(1, p - 1))}
                disabled={halaman === 1}
                className="transition-transform active:scale-95"
              >
                <Icon name="chevron_left" style={{ fontSize: 16 }} />
              </Button>
              <span className="px-2 text-sm">
                Halaman {halaman} / {meta.totalHalaman}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHalaman((p) => Math.min(meta.totalHalaman, p + 1))}
                disabled={halaman >= meta.totalHalaman}
                className="transition-transform active:scale-95"
              >
                <Icon name="chevron_right" style={{ fontSize: 16 }} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
