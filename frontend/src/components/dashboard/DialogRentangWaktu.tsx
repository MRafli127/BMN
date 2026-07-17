// ============================================================
//  Dialog filter rentang waktu untuk dashboard.
//  Dipisah dari halaman utama untuk lazy loading.
// ============================================================

'use client';

import { useState } from 'react';
import { X, CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { DashboardFilter } from '@/services/dashboard.service';

interface DialogRentangWaktuProps {
  terbuka: boolean;
  onUbahTerbuka: (o: boolean) => void;
  filterAktif: DashboardFilter;
  onFilter: (f: DashboardFilter) => void;
}

export function DialogRentangWaktu({
  terbuka,
  onUbahTerbuka,
  filterAktif,
  onFilter,
}: DialogRentangWaktuProps) {
  const [dari, setDari] = useState(filterAktif.dari || '');
  const [sampai, setSampai] = useState(filterAktif.sampai || '');

  const handleTerapkan = () => {
    onFilter({ dari: dari || undefined, sampai: sampai || undefined });
    onUbahTerbuka(false);
  };

  const handleReset = () => {
    setDari('');
    setSampai('');
    onFilter({});
    onUbahTerbuka(false);
  };

  if (!terbuka) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="font-jakarta text-lg font-semibold text-primary">Rentang Waktu</h2>
          </div>
          <button onClick={() => onUbahTerbuka(false)} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          Filter data dashboard berdasarkan rentang waktu pengajuan peminjaman.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="dari" className="text-sm font-medium">
              Dari Tanggal
            </label>
            <Input
              id="dari"
              type="date"
              value={dari}
              onChange={(e) => setDari(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="sampai" className="text-sm font-medium">
              Sampai Tanggal
            </label>
            <Input
              id="sampai"
              type="date"
              value={sampai}
              onChange={(e) => setSampai(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button onClick={handleTerapkan}>Terapkan</Button>
        </div>
      </div>
    </div>
  );
}
