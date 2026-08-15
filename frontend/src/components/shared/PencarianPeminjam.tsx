// ============================================================
//  PencarianPeminjam — Searchable dropdown untuk pilih peminjam.
//  Debounced search → dropdown results → select.
// ============================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, User, X, Loader2 } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { userManagementService, type UserItem } from '@/services/userManagement.service';

interface Props {
  /** Dipanggil saat peminjam dipilih. */
  onPilih: (peminjam: UserItem) => void;
  /** Peminjam yang sedang terpilih. */
  terpilih?: UserItem | null;
  /** Label placeholder. Default: "Cari nama atau NIP peminjam..." */
  placeholder?: string;
  className?: string;
}

export function PencarianPeminjam({ onPilih, terpilih, placeholder = 'Cari nama atau NIP peminjam...', className }: Props) {
  const [cari, setCari] = useState('');
  const [hasil, setHasil] = useState<UserItem[]>([]);
  const [memuat, setMemuat] = useState(false);
  const [terbuka, setTerbuka] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handleClickDiLuar = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setTerbuka(false);
      }
    };
    document.addEventListener('mousedown', handleClickDiLuar);
    return () => document.removeEventListener('mousedown', handleClickDiLuar);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!cari.trim()) {
      setHasil([]);
      setTerbuka(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setMemuat(true);
      try {
        const res = await userManagementService.getSemua({ q: cari.trim(), role: 'PEMINJAM', limit: 10 });
        setHasil(res.data);
        setTerbuka(true);
      } catch {
        setHasil([]);
      } finally {
        setMemuat(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [cari]);

  const handlePilih = (p: UserItem) => {
    onPilih(p);
    setCari('');
    setHasil([]);
    setTerbuka(false);
  };

  const handleHapus = () => {
    onPilih(null as unknown as UserItem);
  };

  if (terpilih) {
    return (
      <div className={className}>
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{terpilih.nama}</p>
            <p className="truncate text-xs text-muted-foreground">
              NIP: {terpilih.nip} {terpilih.unitKerja ? `• ${terpilih.unitKerja}` : ''}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-red-500"
            onClick={handleHapus}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          onFocus={() => hasil.length > 0 && setTerbuka(true)}
          placeholder={placeholder}
          className="pl-9"
        />
        {memuat && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {terbuka && hasil.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border bg-background shadow-lg">
          {hasil.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted"
                onClick={() => handlePilih(p)}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.nama}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    NIP: {p.nip}
                    {p.jabatan ? ` • ${p.jabatan}` : ''}
                    {p.unitKerja ? ` • ${p.unitKerja}` : ''}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {terbuka && !memuat && cari.trim() && hasil.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border bg-background p-4 shadow-lg">
          <p className="text-center text-sm text-muted-foreground">
            <Icon name="search_off" className="mb-1 mr-1 inline text-[16px]" />
            Peminjam tidak ditemukan.
          </p>
        </div>
      )}
    </div>
  );
}
