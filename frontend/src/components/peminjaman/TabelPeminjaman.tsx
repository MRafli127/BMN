// ============================================================
//  Tabel Daftar Pegawaian (dipakai admin & peminjam).
//  Mendukung pilihan baris (checkbox) untuk hapus massal — aktif
//  hanya bila prop onUbahTerpilih diberikan (khusus admin).
//  Responsive: Tabel di desktop, Card view di mobile.
// ============================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Eye, Trash2, AlertTriangle, Upload } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HapusPeminjamanDialog } from './HapusPeminjamanDialog';
import { formatTanggal, cn } from '@/lib/utils';
import { STATUS_PEMINJAMAN } from '@/constants/status';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { Peminjaman } from '@/types/peminjaman.type';

interface Props {
  data: Peminjaman[];
  hrefDetail: (id: string) => string;
  tampilkanPeminjam?: boolean;
  // Bila true, kolom "Merk" barang yang dipinjam ditampilkan (khusus admin).
  tampilkanMerk?: boolean;
  // Bila diberikan, tombol hapus per baris ditampilkan (khusus admin).
  onHapus?: (id: string) => Promise<void>;
  // Bila diberikan, kolom checkbox pilihan ditampilkan (untuk hapus massal).
  terpilih?: string[];
  onUbahTerpilih?: (ids: string[]) => void;
}

// ============================================================
//  Helper: Indikator Pensiun
// ============================================================

const BATAS_HARI_PENSIUN = 90; // Trigger warning jika <= 90 hari

interface InfoPensiun {
  sisaHari: number | null;
  isDanger: boolean;     // <= 30 hari -> merah
  isWarning: boolean;    // <= 90 hari -> kuning
  label: string;
}

/**
 * Hitung sisa hari menuju pensiun dari retirementDate.
 * retirementDate bisa string ISO atau null.
 */
function hitungInfoPensiun(retirementDate: string | null | undefined): InfoPensiun {
  if (!retirementDate) return { sisaHari: null, isDanger: false, isWarning: false, label: '' };

  const target = new Date(retirementDate);
  const sekarang = new Date();
  // Reset waktu ke tengah malam untuk perhitungan yang akurat
  target.setHours(0, 0, 0, 0);
  sekarang.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - sekarang.getTime();
  const diffHari = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Sudah pensiun atau tepat hari ini
  if (diffHari <= 0) {
    return {
      sisaHari: 0,
      isDanger: true,
      isWarning: false,
      label: 'Sudah pensiun',
    };
  }

  const isDanger = diffHari <= 30;
  const isWarning = diffHari <= BATAS_HARI_PENSIUN;

  return {
    sisaHari: diffHari,
    isDanger,
    isWarning,
    label: `${diffHari} hari`,
  };
}

// Checkbox native bergaya, mendukung kondisi indeterminate (sebagian terpilih).
function Kotak({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate && !checked;
  }, [indeterminate, checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      className="h-4 w-4 cursor-pointer rounded border-outline-variant accent-primary"
    />
  );
}

export function TabelPeminjaman({
  data,
  hrefDetail,
  tampilkanPeminjam,
  tampilkanMerk,
  onHapus,
  terpilih,
  onUbahTerpilih,
}: Props) {
  const [target, setTarget] = useState<Peminjaman | null>(null);
  const [sedangHapus, setSedangHapus] = useState(false);
  const isMobile = useIsMobile();

  const konfirmasiHapus = async () => {
    if (!target || !onHapus) return;
    setSedangHapus(true);
    try {
      await onHapus(target.id);
      setTarget(null);
    } catch {
      // Error sudah ditampilkan via toast oleh parent; dialog dibiarkan terbuka.
    } finally {
      setSedangHapus(false);
    }
  };

  // --- Logika pilihan (checkbox) ---
  const pilihAktif = !!onUbahTerpilih;
  const set = new Set(terpilih ?? []);
  const idsHalaman = data.map((p) => p.id);
  const semuaTerpilih = data.length > 0 && idsHalaman.every((id) => set.has(id));
  const sebagianTerpilih = idsHalaman.some((id) => set.has(id));

  const toggleSatu = (id: string) => {
    if (!onUbahTerpilih) return;
    const baru = new Set(set);
    if (baru.has(id)) baru.delete(id);
    else baru.add(id);
    onUbahTerpilih([...baru]);
  };

  const toggleSemua = () => {
    if (!onUbahTerpilih) return;
    if (semuaTerpilih) {
      onUbahTerpilih((terpilih ?? []).filter((id) => !idsHalaman.includes(id)));
    } else {
      const baru = new Set(terpilih ?? []);
      idsHalaman.forEach((id) => baru.add(id));
      onUbahTerpilih([...baru]);
    }
  };

  const jumlahKolom =
    (pilihAktif ? 1 : 0) + (tampilkanPeminjam ? 1 : 0) + (tampilkanMerk ? 1 : 0) + 6; // kode, barang, tgl pinjam, PIC/admin, status, aksi

  // Mobile View - Instagram-like
  if (isMobile) {
    return (
      <>
        <div className="-mx-1">
          {data.map((p) => {
            const status = STATUS_PEMINJAMAN[p.status];
            const infoPensiun = hitungInfoPensiun(p.peminjam?.retirementDate);
            return (
              <Link
                key={p.id}
                href={hrefDetail(p.id)}
                className={cn(
                  'flex items-center gap-2 border-b border-gray-100 bg-white px-1 py-3',
                  infoPensiun.isDanger && 'bg-red-50/50',
                  !infoPensiun.isDanger && infoPensiun.isWarning && 'bg-amber-50/50'
                )}
              >
                {/* Icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <span className="text-[11px] font-medium text-gray-500">{p.kodePeminjaman.slice(-4)}</span>
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-gray-900">{p.kodePeminjaman}</p>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                    {tampilkanPeminjam && p.peminjam?.nama && (
                      <span>{p.peminjam.nama}</span>
                    )}
                    <span>•</span>
                    <span>{formatTanggal(p.tanggalPinjamRencana)}</span>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-1.5">
                  <span className={'text-[9px] px-1.5 py-0.5 rounded ' + status.kelas}>
                    {status.label}
                  </span>
                  {infoPensiun.isWarning && (
                    <span className={cn(
                      'text-[9px] px-1 py-0.5 rounded',
                      infoPensiun.isDanger ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                    )}>
                      {infoPensiun.sisaHari}d
                    </span>
                  )}
                </div>
              </Link>
            );
          })}

          {data.length === 0 && (
            <div className="border-t border-gray-100 bg-white p-8 text-center">
              <p className="text-[11px] text-gray-400">Tidak ada data peminjaman.</p>
            </div>
          )}
        </div>

        {onHapus && (
          <HapusPeminjamanDialog
            terbuka={!!target}
            onUbahTerbuka={(o) => !o && setTarget(null)}
            target={target}
            sedangProses={sedangHapus}
            onKonfirmasi={konfirmasiHapus}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {pilihAktif && (
                <TableHead className="w-10">
                  <Kotak
                    checked={semuaTerpilih}
                    indeterminate={sebagianTerpilih}
                    onChange={toggleSemua}
                    label="Pilih semua di halaman ini"
                  />
                </TableHead>
              )}
              <TableHead>Kode</TableHead>
              {tampilkanPeminjam && <TableHead>Peminjam</TableHead>}
              <TableHead>Barang</TableHead>
              {tampilkanMerk && <TableHead>Merk/Tipe</TableHead>}
              <TableHead>Rencana Pinjam</TableHead>
              <TableHead>Aksi PIC</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((p) => {
              const status = STATUS_PEMINJAMAN[p.status];
              const dipilih = set.has(p.id);
              const ringkasBarang =
                p.detail && p.detail.length > 0
                  ? `${p.detail[0].barang?.nama ?? 'Barang'}${p.detail.length > 1 ? ` +${p.detail.length - 1} lainnya` : ''}`
                  : '-';
              const merkBarang = p.detail?.[0]?.barang?.merk || '-';
              return (
                <TableRow key={p.id} className={cn(
                  dipilih ? 'bg-primary/5' : undefined,
                  // Row berwarna merah/kuning jika peminjam mendekati pensiun
                  hitungInfoPensiun(p.peminjam?.retirementDate).isDanger && 'border-l-4 border-l-error bg-error/5',
                  !hitungInfoPensiun(p.peminjam?.retirementDate).isDanger && hitungInfoPensiun(p.peminjam?.retirementDate).isWarning && 'border-l-4 border-l-warning bg-warning/5'
                )}>
                  {pilihAktif && (
                    <TableCell>
                      <Kotak checked={dipilih} onChange={() => toggleSatu(p.id)} label={`Pilih ${p.kodePeminjaman}`} />
                    </TableCell>
                  )}
                  <TableCell className="font-mono text-sm font-medium text-primary">{p.kodePeminjaman}</TableCell>
                  {tampilkanPeminjam && (
                    <TableCell>
                      <p className="font-medium text-foreground">{p.peminjam?.nama ?? '-'}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-xs text-muted-foreground">{p.peminjam?.eselon3 ?? ''}</p>
                        {/* Indikator Alasan Peminjaman */}
                        {p.alasanPeminjaman && (
                          <span
                            className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                            title={p.alasanPeminjaman}
                          >
                            <Upload className="h-3 w-3" />
                            Import
                          </span>
                        )}
                        {/* Indikator Pensiun */}
                        {(() => {
                          const info = hitungInfoPensiun(p.peminjam?.retirementDate);
                          if (!info.isWarning) return null;
                          return (
                            <span
                              className={cn(
                                'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium',
                                info.isDanger
                                  ? 'bg-error/10 text-error'
                                  : 'bg-warning/10 text-warning'
                              )}
                              title={`Pensiun dalam ${info.label}`}
                            >
                              <AlertTriangle className="h-3 w-3" />
                              {info.label}
                            </span>
                          );
                        })()}
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="max-w-[200px] truncate text-sm">{ringkasBarang}</TableCell>
                  {tampilkanMerk && (
                    <TableCell className="text-sm text-muted-foreground">{merkBarang}</TableCell>
                  )}
                  <TableCell className="text-sm">{formatTanggal(p.tanggalPinjamRencana)}</TableCell>
                  <TableCell className="text-sm">
                    {p.admin?.nama || p.pengembalianAdmin?.nama ? (
                      <div className="flex flex-col gap-0.5">
                        {p.admin?.nama && (
                          <span className="font-medium text-blue-600 dark:text-blue-400">{p.admin.nama}</span>
                        )}
                        {p.pengembalianAdmin?.nama && (
                          <span className="font-medium text-green-600 dark:text-green-400">{p.pengembalianAdmin.nama}</span>
                        )}
                      </div>
                    ) : p.status === 'MENUNGGU' ? (
                      <span className="text-muted-foreground">Belum diproses</span>
                    ) : p.status === 'DITOLAK' && p.admin?.nama ? (
                      <span className="font-medium text-red-600 dark:text-red-400">{p.admin.nama}</span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={status.kelas}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button asChild variant="outline" size="icon">
                        <Link href={hrefDetail(p.id)} aria-label="Detail">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {onHapus && (
                        <Button variant="destructive" size="icon" onClick={() => setTarget(p)} aria-label="Hapus">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={jumlahKolom} className="py-6 text-center text-sm text-muted-foreground">
                  Tidak ada data.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {onHapus && (
        <HapusPeminjamanDialog
          terbuka={!!target}
          onUbahTerbuka={(o) => !o && setTarget(null)}
          target={target}
          sedangProses={sedangHapus}
          onKonfirmasi={konfirmasiHapus}
        />
      )}
    </>
  );
}

// Export helper untuk dipakai komponen lain (FolderPeminjaman)
export { hitungInfoPensiun };
export type { InfoPensiun };
