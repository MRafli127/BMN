// ============================================================
//  Dialog konfirmasi sebelum navigasi ke halaman kode satker.
//  Dipisah dari halaman utama untuk lazy loading.
// ============================================================

'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { peminjamanService } from '@/services/peminjaman.service';
import { barangService } from '@/services/barang.service';

interface DialogKonfirmasiSatkerProps {
  terbuka: boolean;
  onUbahTerbuka: (o: boolean) => void;
  kodeSatker: string;
  label: string;
  onPilih: (tujuan: string) => void;
  counts: SatkerCounts | null;
  memuat: boolean;
}

interface SatkerCounts {
  menunggu: number;
  disetujui: number;
  dipinjam: number;
  dikembalikan: number;
  terlambat: number;
  ditolak: number;
  totalBarang: number;
  stokTersedia: number;
  stokHabis: number;
}

export function DialogKonfirmasiSatker({
  terbuka,
  onUbahTerbuka,
  kodeSatker,
  label,
  onPilih,
  counts,
  memuat,
}: DialogKonfirmasiSatkerProps) {
  const statusOptions = [
    { label: 'Menunggu Persetujuan', ikon: 'pending_actions', gradient: 'from-amber-400 to-orange-500', countKey: 'menunggu' as const },
    { label: 'Disetujui', ikon: 'check_circle', gradient: 'from-green-400 to-emerald-600', countKey: 'disetujui' as const },
    { label: 'Sedang Dipinjam', ikon: 'sync_alt', gradient: 'from-pink-400 to-rose-600', countKey: 'dipinjam' as const },
    { label: 'Dikembalikan', ikon: 'assignment_return', gradient: 'from-teal-400 to-cyan-600', countKey: 'dikembalikan' as const },
    { label: 'Terlambat', ikon: 'report', gradient: 'from-orange-400 to-red-600', countKey: 'terlambat' as const },
    { label: 'Ditolak', ikon: 'cancel', gradient: 'from-red-400 to-red-700', countKey: 'ditolak' as const },
  ];

  const barangOptions = [
    { label: 'Total Barang', ikon: 'inventory', gradient: 'from-primary to-indigo-600', countKey: 'totalBarang' as const },
    { label: 'Stok Tersedia', ikon: 'check_circle', gradient: 'from-green-400 to-emerald-600', countKey: 'stokTersedia' as const },
    { label: 'Stok Habis', ikon: 'error', gradient: 'from-red-400 to-red-700', countKey: 'stokHabis' as const },
  ];

  if (!terbuka) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative max-h-[95vh] w-full max-w-6xl overflow-auto rounded-3xl bg-gradient-to-br from-white via-white to-slate-50 p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-primary/30">
              <Icon name="location_city" className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="font-jakarta text-2xl font-bold bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">{label}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Kode Satker: <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-primary">{kodeSatker}</span>
              </p>
            </div>
          </div>
          <button onClick={() => onUbahTerbuka(false)} className="rounded-xl p-3 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-6">
          <h3 className="mb-4 font-jakarta text-lg font-bold text-slate-800">Manajemen Peminjaman</h3>
          <div className="grid grid-cols-3 gap-4 lg:grid-cols-6">
            {statusOptions.map((opt) => (
              <button key={opt.countKey} onClick={() => { onUbahTerbuka(false); onPilih('peminjaman:' + opt.countKey.toUpperCase()); }} className="group relative flex flex-col items-center gap-3 rounded-2xl border border-slate-200/50 bg-white p-4 shadow transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className={cn('flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br shadow-md transition-transform duration-300 group-hover:scale-105', opt.gradient)}>
                  <Icon name={opt.ikon} className="h-8 w-8 text-white" />
                </div>
                <span className="text-center text-xs font-semibold text-slate-600">{opt.label}</span>
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br shadow-md transition-transform duration-300 group-hover:scale-110', opt.gradient)}>
                  {memuat ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-[2px] border-white border-t-transparent" />
                  ) : (
                    <span className="text-sm font-bold text-white">{counts?.[opt.countKey] ?? 0}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-4 font-jakarta text-lg font-bold text-slate-800">Manajemen Barang</h3>
          <div className="grid grid-cols-3 gap-4">
            {barangOptions.map((opt) => (
              <button key={opt.countKey} onClick={() => { onUbahTerbuka(false); onPilih('barang:' + opt.countKey); }} className="group relative flex flex-col items-center gap-3 rounded-2xl border border-slate-200/50 bg-white p-4 shadow transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className={cn('flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br shadow-md transition-transform duration-300 group-hover:scale-105', opt.gradient)}>
                  <Icon name={opt.ikon} className="h-8 w-8 text-white" />
                </div>
                <span className="text-center text-xs font-semibold text-slate-600">{opt.label}</span>
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br shadow-md transition-transform duration-300 group-hover:scale-110', opt.gradient)}>
                  {memuat ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-[2px] border-white border-t-transparent" />
                  ) : (
                    <span className="text-sm font-bold text-white">{counts?.[opt.countKey] ?? 0}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export type { SatkerCounts };
