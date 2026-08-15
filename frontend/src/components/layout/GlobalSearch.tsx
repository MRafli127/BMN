// ============================================================
//  Pencarian Global - dropdown pencarian di Header.
// ============================================================

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { searchService } from '@/services/search.service';
import { RUTE } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

type SearchResult = {
  barang: Array<{
    id: string;
    kodeBarang: string;
    nama: string;
    merk: string | null;
    jumlahTersedia: number;
    jumlahTotal: number;
    kondisi: string;
  }>;
  peminjaman: Array<{
    id: string;
    kodePeminjaman: string;
    status: string;
    tanggalPengajuan: string;
    peminjam: { id: string; nama: string; nip: string };
  }>;
  peminjam: Array<{
    id: string;
    nama: string;
    nip: string;
    email: string;
    unitKerja: string | null;
  }>;
};

type TabKategori = 'semua' | 'barang' | 'peminjaman' | 'peminjam';

const LABEL_KATEGORI: Record<TabKategori, string> = {
  semua: 'Semua',
  barang: 'Barang',
  peminjaman: 'Peminjaman',
  peminjam: 'Peminjam',
};

function labelStatus(status: string) {
  switch (status) {
    case 'DRAFT': return { teks: 'Draft', warna: 'bg-surface-container-high' };
    case 'MENUNGGU': return { teks: 'Menunggu', warna: 'bg-amber-50 text-amber-700' };
    case 'DISETUJUI': return { teks: 'Disetujui', warna: 'bg-blue-50 text-blue-700' };
    case 'DITOLAK': return { teks: 'Ditolak', warna: 'bg-red-50 text-red-700' };
    case 'DIPINJAM': return { teks: 'Dipinjam', warna: 'bg-purple-50 text-purple-700' };
    case 'DIKEMBALIKAN': return { teks: 'Dikembalikan', warna: 'bg-green-50 text-green-700' };
    case 'TERLAMBAT': return { teks: 'Terlambat', warna: 'bg-red-50 text-red-700' };
    default: return { teks: status, warna: 'bg-surface-container-high' };
  }
}

export function GlobalSearch() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [query, setQuery] = useState('');
  const [hasil, setHasil] = useState<SearchResult | null>(null);
  const [sedangCari, setSedangCari] = useState(false);
  const [terbuka, setTerbuka] = useState(false);
  const [tabAktif, setTabAktif] = useState<TabKategori>('semua');

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  const handleInput = useCallback((val: string) => {
    setQuery(val);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (val.trim().length < 2) {
      setHasil(null);
      setTerbuka(false);
      return;
    }
    timeoutRef.current = setTimeout(async () => {
      setSedangCari(true);
      try {
        const data = await searchService.cari(val);
        setHasil(data);
        setTerbuka(true);
        if (data.barang.length > 0) setTabAktif('semua');
        else if (data.peminjaman.length > 0) setTabAktif('peminjaman');
        else if (data.peminjam.length > 0) setTabAktif('peminjam');
      } finally {
        setSedangCari(false);
      }
    }, 300);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!terbuka) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setTerbuka(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [terbuka]);

  // Close on Escape
  useEffect(() => {
    if (!terbuka) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTerbuka(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [terbuka]);

  const navigasiKe = useCallback((href: string) => {
    setTerbuka(false);
    setQuery('');
    setHasil(null);
    router.push(href);
  }, [router]);

  // Filtered results based on tab
  const filteredBarang = tabAktif === 'semua' || tabAktif === 'barang' ? (hasil?.barang ?? []) : [];
  const filteredPeminjaman = tabAktif === 'semua' || tabAktif === 'peminjaman' ? (hasil?.peminjaman ?? []) : [];
  const filteredPeminjam = tabAktif === 'semua' || tabAktif === 'peminjam' ? (hasil?.peminjam ?? []) : [];
  const totalHasil = filteredBarang.length + filteredPeminjaman.length + filteredPeminjam.length;

  const tabs: TabKategori[] = ['semua', 'barang', 'peminjaman', ...(isAdmin ? ['peminjam' as TabKategori] : [])];

  return (
    <div className="relative hidden md:block" ref={containerRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => query.trim().length >= 2 && hasil && setTerbuka(true)}
          placeholder="Cari barang, peminjaman..."
          className={cn(
            'w-56 rounded-full border-none bg-surface-container-low px-5 py-2 pr-10 font-body-md text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 lg:w-64',
            terbuka && 'ring-2 ring-primary/20'
          )}
        />
        <Icon
          name={sedangCari ? 'hourglass_empty' : 'search'}
          className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2 transition-colors',
            sedangCari ? 'animate-spin text-primary' : 'text-on-surface-variant'
          )}
        />
      </div>

      {terbuka && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[28rem] origin-top-left animate-fade-up overflow-hidden rounded-2xl border border-outline-variant/60 bg-white shadow-2xl">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-outline-variant/40 bg-surface-container-low/50 p-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setTabAktif(tab)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  tabAktif === tab
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                )}
              >
                {LABEL_KATEGORI[tab]}
              </button>
            ))}
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto p-2">
            {totalHasil === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Icon name="search_off" className="text-4xl text-on-surface-variant/40" />
                <p className="text-sm text-on-surface-variant">Tidak ada hasil untuk &quot;{query}&quot;</p>
              </div>
            ) : (
              <>
                {/* Barang */}
                {filteredBarang.length > 0 && (
                  <div className="mb-2">
                    <p className="mb-1 px-2 py-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Barang</p>
                    {filteredBarang.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => navigasiKe(RUTE.adminBarangDetail(item.id))}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-container-high"
                      >
                        <Icon name="inventory_2" className="shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-on-surface">{item.nama}</p>
                          <p className="text-xs text-on-surface-variant">{item.kodeBarang} - {item.jumlahTersedia} tersedia</p>
                        </div>
                        <span className={cn(
                          'shrink-0 rounded px-1.5 py-0.5 text-xs font-medium',
                          item.jumlahTersedia > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        )}>
                          {item.jumlahTersedia > 0 ? 'Tersedia' : 'Habis'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Peminjaman */}
                {filteredPeminjaman.length > 0 && (
                  <div className="mb-2">
                    <p className="mb-1 px-2 py-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Peminjaman</p>
                    {filteredPeminjaman.map((item) => {
                      const status = labelStatus(item.status);
                      return (
                        <button
                          key={item.id}
                          onClick={() => navigasiKe(RUTE.adminPeminjamanDetail(item.id))}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-container-high"
                        >
                          <Icon name="sync_alt" className="shrink-0 text-secondary" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-on-surface">{item.kodePeminjaman}</p>
                            <p className="text-xs text-on-surface-variant">{item.peminjam.nama}</p>
                          </div>
                          <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-xs font-medium', status.warna)}>
                            {status.teks}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Peminjam */}
                {filteredPeminjam.length > 0 && (
                  <div>
                    <p className="mb-1 px-2 py-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Peminjam</p>
                    {filteredPeminjam.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => navigasiKe(RUTE.adminKategori('peminjam'))}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-container-high"
                      >
                        <Icon name="person" className="shrink-0 text-tertiary" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-on-surface">{item.nama}</p>
                          <p className="text-xs text-on-surface-variant">{item.nip} - {item.unitKerja || '-'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-outline-variant/40 bg-surface-container-low/50 px-4 py-2">
            <p className="text-xs text-on-surface-variant">
              Tekan <kbd className="rounded bg-surface-container-high px-1 py-0.5 font-mono text-[10px]">Esc</kbd> untuk menutup
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
