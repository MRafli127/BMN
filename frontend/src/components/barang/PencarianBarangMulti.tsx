// ============================================================
//  PencarianBarangMulti — Multi-select searchable barang picker.
//  Admin bisa pilih banyak barang sekaligus dalam 1 transaksi.
// ============================================================

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Package, Plus, Minus, Trash2, Loader2, Check } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { barangService } from '@/services/barang.service';
import { urlFile, kodeUnikBarang } from '@/lib/utils';
import type { Barang } from '@/types/barang.type';

interface PilihanBarang {
  barang: Barang;
  jumlah: number;
}

interface Props {
  /** Dipanggil setiap kali daftar pilihan berubah. */
  onPilihanUbah: (pilihan: PilihanBarang[]) => void;
  /** Daftar barang yang sedang terpilih. */
  pilihan?: PilihanBarang[];
  /** Teks label utama. */
  label?: string;
  /** Helper text di bawah label. */
  helperText?: string;
  className?: string;
}

export function PencarianBarangMulti({
  onPilihanUbah,
  pilihan = [],
  label = 'Pilih Barang',
  helperText,
  className,
}: Props) {
  const [cari, setCari] = useState('');
  const [hasil, setHasil] = useState<Barang[]>([]);
  const [memuat, setMemuat] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Map barangId -> pilihan untuk lookup cepat
  const pilihanMap = useMemo(() => {
    const m = new Map<string, PilihanBarang>();
    pilihan.forEach((p) => m.set(p.barang.id, p));
    return m;
  }, [pilihan]);

  // Set ID terpilih untuk exclude dari search
  const terpilihIds = useMemo(() => new Set(pilihan.map((p) => p.barang.id)), [pilihan]);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handleClickDiLuar = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setCari('');
        setHasil([]);
      }
    };
    document.addEventListener('mousedown', handleClickDiLuar);
    return () => document.removeEventListener('mousedown', handleClickDiLuar);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!cari.trim()) {
        setHasil([]);
        setMemuat(false);
        return;
      }
      setMemuat(true);
      try {
        const res = await barangService.getSemua({ q: cari.trim(), limit: 20 });
        // Filter out yang sudah terpilih dan yang stoknya habis
        const tersedia = res.data.filter((b) => !terpilihIds.has(b.id) && b.jumlahTersedia > 0);
        setHasil(tersedia);
      } catch {
        setHasil([]);
      } finally {
        setMemuat(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [cari, terpilihIds]);

  const tambah = (barang: Barang) => {
    if (barang.jumlahTersedia < 1) return;
    const baru: PilihanBarang = { barang, jumlah: 1 };
    onPilihanUbah([...pilihan, baru]);
    setCari('');
    setHasil([]);
  };

  const ubahJumlah = (barangId: string, delta: number) => {
    onPilihanUbah(
      pilihan.map((p) => {
        if (p.barang.id !== barangId) return p;
        const maks = p.barang.jumlahTersedia;
        const baru = Math.min(maks, Math.max(1, p.jumlah + delta));
        return { ...p, jumlah: baru };
      })
    );
  };

  const hapus = (barangId: string) => {
    onPilihanUbah(pilihan.filter((p) => p.barang.id !== barangId));
  };

  return (
    <div ref={containerRef} className={className}>
      {/* Label */}
      <div className="mb-2">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Ketik nama, merk, tipe, kode, atau NUP..."
          className="pl-9"
        />
        {memuat && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Dropdown hasil pencarian — layout tabel */}
      {cari.trim() && (
        <div className="mt-1 max-h-80 overflow-y-auto rounded-lg border bg-white shadow-md dark:bg-slate-900">
          {memuat ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Mencari...
            </div>
          ) : hasil.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Icon name="search_off" className="text-[18px]" />
              Barang tidak ditemukan atau sudah dipilih.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-xs font-medium text-muted-foreground">
                  <th className="px-3 py-2 text-left">NUP</th>
                  <th className="px-3 py-2 text-left">Nama Barang</th>
                  <th className="px-3 py-2 text-left">Merk</th>
                  <th className="px-3 py-2 text-center">Tersedia</th>
                  <th className="px-3 py-2 text-center w-20">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {hasil.map((barang) => {
                  const dipilih = pilihanMap.has(barang.id);
                  const habis = barang.jumlahTersedia < 1;
                  const nup = barang.nup || '-';
                  const kodeUnik = kodeUnikBarang(barang);
                  return (
                    <tr
                      key={barang.id}
                      className="border-b last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                    >
                      {/* NUP — text angka/code */}
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs font-semibold text-primary">{nup}</span>
                      </td>
                      {/* Nama + Kode Unik */}
                      <td className="px-3 py-2">
                        <p className="font-semibold leading-tight">{barang.nama}</p>
                        <p className="font-mono text-xs text-muted-foreground">{kodeUnik}</p>
                      </td>
                      {/* Merk + tipe */}
                      <td className="px-3 py-2">
                        <p className="text-xs text-muted-foreground">
                          {barang.merk || barang.tipe
                            ? `${barang.merk ?? ''}${barang.merk && barang.tipe ? ' • ' : ''}${barang.tipe ?? ''}`
                            : '-'}
                        </p>
                      </td>
                      {/* Tersedia */}
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs font-semibold ${habis ? 'text-red-500' : 'text-emerald-600'}`}>
                          {barang.jumlahTersedia}
                        </span>
                      </td>
                      {/* Aksi */}
                      <td className="px-3 py-2 text-center">
                        <Button
                          type="button"
                          size="sm"
                          variant={dipilih ? 'secondary' : 'outline'}
                          disabled={habis || dipilih}
                          onClick={() => tambah(barang)}
                          className="h-7 w-14 gap-1 px-0 justify-center"
                        >
                          {dipilih ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Plus className="h-3 w-3" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Daftar barang terpilih */}
      {pilihan.length > 0 && (
        <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border bg-white shadow-sm dark:bg-slate-900">
          <div className="border-b bg-slate-50 px-3 py-2 text-xs font-semibold text-muted-foreground">
            Barang Dipilih ({pilihan.length})
          </div>
          <div className="divide-y">
            {pilihan.map((p) => (
              <div key={p.barang.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                {/* Foto */}
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded bg-muted">
                  {p.barang.fotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={urlFile(p.barang.fotoUrl)} alt={p.barang.nama} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Package className="h-4 w-4" />
                    </div>
                  )}
                </div>
                {/* Nama + NUP */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-tight">{p.barang.nama}</p>
                  <p className="font-mono text-xs text-muted-foreground">{kodeUnikBarang(p.barang)}</p>
                </div>
                {/* Merk/tipe */}
                <div className="hidden min-w-0 flex-1 text-xs text-muted-foreground sm:block">
                  <p className="truncate">
                    {p.barang.merk || p.barang.tipe
                      ? `${p.barang.merk ?? ''}${p.barang.merk && p.barang.tipe ? ' • ' : ''}${p.barang.tipe ?? ''}`
                      : '-'}
                  </p>
                </div>
                {/* Stepper */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => ubahJumlah(p.barang.id, -1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm font-semibold">{p.jumlah}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => ubahJumlah(p.barang.id, 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                {/* Hapus */}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 text-red-600"
                  onClick={() => hapus(p.barang.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
