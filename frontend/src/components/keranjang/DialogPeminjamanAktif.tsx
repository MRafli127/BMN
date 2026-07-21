// ============================================================
//  Dialog Info Peminjaman Aktif.
//  Muncul saat user gagal mengajukan peminjaman karena:
//  1. Sudah mencapai batas maksimal peminjaman aktif
//  2. Barang yang sama sudah ada di peminjaman aktif lain
// ============================================================

'use client';

import Link from 'next/link';
import { Clock, Package, Calendar, Hash, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RUTE } from '@/constants/routes';
import type { DetailPeminjamanError } from '@/services/peminjaman.service';

interface Props {
  terbuka: boolean;
  onUbahTerbuka: (terbuka: boolean) => void;
  /** Array detail peminjaman aktif (dari error backend) */
  daftarPeminjaman: DetailPeminjamanError[];
  /** Kode error untuk menentukan judulPesan */
  kodeError: string;
  /** Pesan error utama dari backend */
  pesanError: string;
}

/** Badge warna berdasarkan status */
function StatusBadge({ status }: { status: string }) {
  const warna = {
    DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
    MENUNGGU: 'bg-amber-100 text-amber-700 border-amber-200',
    DISETUJUI: 'bg-blue-100 text-blue-700 border-blue-200',
    DIPINJAM: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    TERLAMBAT: 'bg-red-100 text-red-700 border-red-200',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        warna[status as keyof typeof warna] || 'bg-gray-100 text-gray-700 border-gray-200'
      )}
    >
      {status}
    </span>
  );
}

/** Format tanggal Indonesia */
function formatTanggal(tanggal: string | null | undefined): string {
  if (!tanggal) return '-';
  try {
    const date = new Date(tanggal);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

export function DialogPeminjamanAktif({
  terbuka,
  onUbahTerbuka,
  daftarPeminjaman,
  kodeError,
  pesanError,
}: Props) {
  // Judul & ikon dibedakan per skenario agar peminjam paham konteks
  // (apakah bentrok dengan miliknya sendiri atau dengan peminjam lain).
  const judulPesan = kodeError === 'MAX_PEMINJAMAN_AKTIF'
    ? 'Batas Maksimal Tercapai'
    : kodeError === 'BARANG_SEDANG_DIPEGANG_LAIN'
      ? 'Barang Sedang Dipegang Peminjam Lain'
      : 'Barang Sudah Ada di Pengajuan Aktif';

  const iconColor = kodeError === 'MAX_PEMINJAMAN_AKTIF'
    ? 'bg-amber-100 text-amber-600'
    : kodeError === 'BARANG_SEDANG_DIPEGANG_LAIN'
      ? 'bg-purple-100 text-purple-600'
      : 'bg-orange-100 text-orange-600';

  // Pesan bantuan konteks: untuk BARANG_SEDANG_DIPEGANG_LAIN, peminjam tidak
  // bisa menunggu/batalkan punya orang lain — beri opsi pilih barang lain.
  const infoPembantu = kodeError === 'BARANG_SEDANG_DIPEGANG_LAIN'
    ? 'Silakan pilih barang lain dari katalog, atau tunggu hingga pengajuan tersebut selesai.'
    : 'Selesaikan atau batalkan pengajuan di bawah ini terlebih dahulu sebelum membuat pengajuan baru. Klik pada salah satu pengajuan untuk melihat detail dan opsi tindakan.';

  return (
    <Dialog open={terbuka} onOpenChange={onUbahTerbuka}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="mb-3 flex items-center justify-center">
            <div className={`flex h-14 w-14 items-center justify-center rounded-full ${iconColor}`}>
              <AlertCircle className="h-7 w-7" />
            </div>
          </div>
          <DialogTitle className="text-center text-lg">{judulPesan}</DialogTitle>
          <DialogDescription className="text-center">{pesanError}</DialogDescription>
        </DialogHeader>

        {/* Scrollable list peminjaman aktif */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
            <p className="flex items-start gap-2">
              <span className="shrink-0 mt-0.5">💡</span>
              <span>{infoPembantu}</span>
            </p>
          </div>

          <div className="space-y-3">
            {daftarPeminjaman.map((p, index) => {
              // Tampilkan banner nama pemilik bila barang dipegang user lain.
              // Peminjam tidak punya akses ke detail punya orang lain, jadi
              // banner ini hanya info tekstual (tanpa link).
              const milikiLain = p.dimilikiOleh === 'peminjam_lain';
              return (
                <div
                  key={p.id}
                  className="block rounded-xl border border-primary/20 bg-gradient-to-br from-white to-primary/5 p-4 transition-all"
                >
                  {/* Header: kode transaksi + status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="font-mono text-sm font-semibold text-foreground truncate">
                        {p.kodeTransaksi}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-base">{p.statusIcon}</span>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>

                  {/* Info status */}
                  <p className="text-sm font-medium text-primary mb-2">{p.statusLabel}</p>

                  {/* Banner pemilik lain (hanya info, tidak ada link karena
                      peminjam tidak boleh lihat detail punya orang lain). */}
                  {milikiLain && p.pemilikNama && (
                    <div className="mb-2 rounded-md bg-purple-50 border border-purple-200 px-2 py-1 text-xs text-purple-700">
                      Sedang diproses oleh <strong>{p.pemilikNama}</strong>
                    </div>
                  )}

                  {/* Detail barang */}
                  <div className="flex items-start gap-2 mb-2">
                    <Package className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                    <p className="text-sm text-foreground">{p.barangList}</p>
                  </div>

                  {/* Tanggal-tanggal penting */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {p.tanggalKirim && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Diajukan: {formatTanggal(p.tanggalKirim)}</span>
                      </div>
                    )}
                    {p.tanggalPinjamRencana && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Pinjam: {formatTanggal(p.tanggalPinjamRencana)}</span>
                      </div>
                    )}
                    {p.tanggalKembaliRencana && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Kembali: {formatTanggal(p.tanggalKembaliRencana)}</span>
                      </div>
                    )}
                  </div>

                  {/* Tombol lihat detail — hanya untuk peminjaman milik sendiri */}
                  {!milikiLain && (
                    <Link
                      href={RUTE.peminjamRiwayatDetail(p.id)}
                      onClick={() => onUbahTerbuka(false)}
                      className="mt-3 pt-2 border-t border-primary/10 block text-xs font-medium text-primary hover:underline"
                    >
                      Klik untuk melihat detail →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer action */}
        <div className="shrink-0 pt-4 border-t border-primary/10 mt-4">
          <Button variant="outline" className="w-full" onClick={() => onUbahTerbuka(false)}>
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
