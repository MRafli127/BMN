// ============================================================
//  Super Admin — Manajemen Barang (folder per merk, cari, filter).
//  Barang dikelompokkan ke dalam folder berdasarkan merk yang sama;
//  tiap folder memuat unit beserta kode barang dan NUP-nya.
// ============================================================

'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input, Select } from '@/components/ui/input';
import { OPSI_KONDISI } from '@/constants/status';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { KonfirmasiDialog } from '@/components/shared/KonfirmasiDialog';
import { useBarangFolder } from '@/hooks/useBarangFolder';
import { barangService } from '@/services/barang.service';
import { cn, urlFile } from '@/lib/utils';
import { JENIS_BARANG, KONDISI_BARANG } from '@/constants/status';
import { RUTE } from '@/constants/routes';
import type { Barang } from '@/types/barang.type';

// Data satker
const KODE_SATKER = [
  { kode: '015110199411868000KP', label: 'Sekretariat Badan Pendidikan dan Pelatihan Keuangan' },
  { kode: '015110199411868001KP', label: 'Pusat Pembinaan Jabatan Fungsional dan Peminjaman Mutu' },
  { kode: '015110199411868002KP', label: 'Pusat Pendidikan dan Pelatihan Anggaran dan Pembendaharaan' },
  { kode: '015110199411868003KP', label: 'Pusat Pendidikan dan Pelatihan Pajak' },
  { kode: '015110199411868004KP', label: 'Pusat Pendidikan dan Pelatihan Bea dan Cukai' },
  { kode: '015110199411868005KP', label: 'Pusat Pendidikan dan Pelatihan Keuangan Publik' },
  { kode: '015110199411868006KP', label: 'Pusat Pendidikan dan Pelatihan Kepemimpinan dan Manajemen' },
];

// Pilihan jumlah folder yang ditampilkan per halaman
const OPSI_FOLDER = [8, 16, 32, 64];

// Kelompokkan barang menjadi grup per merk
interface GrupMerk {
  merk: string;
  items: Barang[];
  totalUnit: number;
  totalStok: number;
  totalTersedia: number;
}

function kelompokkanPerMerk(data: Barang[]): GrupMerk[] {
  const peta = new Map<string, { items: Barang[]; jumlahLabel: Map<string, number> }>();

  for (const barang of data) {
    const asli = barang.merk?.trim() || 'Tanpa Merk';
    const kunci = asli.toLowerCase().replace(/\s+/g, ' ');
    let grup = peta.get(kunci);
    if (!grup) {
      grup = { items: [], jumlahLabel: new Map() };
      peta.set(kunci, grup);
    }
    grup.items.push(barang);
    grup.jumlahLabel.set(asli, (grup.jumlahLabel.get(asli) || 0) + 1);
  }

  return Array.from(peta.values(), ({ items, jumlahLabel }) => {
    let merk = 'Tanpa Merk';
    let terbanyak = -1;
    for (const [label, jumlah] of jumlahLabel) {
      if (jumlah > terbanyak) {
        terbanyak = jumlah;
        merk = label;
      }
    }
    return {
      merk,
      items,
      totalUnit: items.length,
      totalStok: items.reduce((s, i) => s + i.jumlahTotal, 0),
      totalTersedia: items.reduce((s, i) => s + i.jumlahTersedia, 0),
    };
  }).sort((a, b) => a.merk.localeCompare(b.merk, 'id', { sensitivity: 'base' }));
}

// Folder Item Component
function FolderItem({ grup, terbuka, onToggle }: { grup: GrupMerk; terbuka: boolean; onToggle: () => void }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-card transition-colors',
        terbuka && 'border-primary/50 ring-1 ring-primary/20'
      )}
    >
      {/* Header folder */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
          terbuka ? 'bg-gradient-to-r from-primary/5 to-indigo-500/5 hover:from-primary/10 hover:to-indigo-500/10' : 'hover:bg-slate-50'
        )}
      >
        <span className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300',
          terbuka ? 'bg-gradient-to-br from-primary to-indigo-600 shadow-lg' : 'bg-slate-100'
        )}>
          {terbuka ? (
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
            </svg>
          ) : (
            <svg className="h-5 w-5 text-slate-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
            </svg>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn(
            'truncate font-semibold transition-colors',
            terbuka ? 'text-primary' : 'text-slate-700'
          )}>
            {grup.merk}
          </p>
          <p className="text-xs text-slate-500">
            {grup.totalUnit} unit • {grup.totalTersedia} tersedia / {grup.totalStok}
          </p>
        </div>
        <Badge className={cn(
          'border transition-colors',
          terbuka ? 'border-primary/30 bg-primary/10 text-primary' : 'border-slate-200 bg-slate-50 text-slate-600'
        )}>
          {grup.totalUnit} unit
        </Badge>
        <span className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-300',
          terbuka ? 'bg-primary/20' : 'bg-slate-100'
        )}>
          <svg
            className={cn('h-4 w-4 transition-transform', terbuka ? 'rotate-180 text-primary' : 'text-slate-400')}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </span>
      </button>

      {/* Isi folder */}
      {terbuka && (
        <div className="border-t border-slate-100">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Kode Barang</TableHead>
                <TableHead>NUP</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="text-center">Stok</TableHead>
                <TableHead>Satker</TableHead>
                <TableHead>Kondisi</TableHead>
                <TableHead>Peminjam</TableHead>
                <TableHead className="w-20">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grup.items.map((barang) => {
                const kondisi = KONDISI_BARANG[barang.kondisi];
                const satker = KODE_SATKER.find(s => s.label === barang.namaSatker);
                const satkerLabel = satker ? satker.kode.slice(-3) : (barang.namaSatker || '-');
                const isDipinjam = barang.jumlahTersedia === 0 && barang.peminjam;

                return (
                  <TableRow key={barang.id} className={cn("hover:bg-slate-50", isDipinjam && "bg-orange-50/50")}>
                    <TableCell className="font-mono text-xs">{barang.kodeBarang}</TableCell>
                    <TableCell className="font-mono text-sm text-slate-500">{barang.nup || '-'}</TableCell>
                    <TableCell className="font-medium">{barang.nama}</TableCell>
                    <TableCell className="text-center">
                      <span className={barang.jumlahTersedia > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {barang.jumlahTersedia}
                      </span>
                      <span className="text-slate-400"> / {barang.jumlahTotal}</span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{satkerLabel}</TableCell>
                    <TableCell>
                      <Badge className={kondisi.kelas}>{kondisi.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {isDipinjam ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-orange-600">{barang.peminjam?.nama}</span>
                          {barang.peminjam?.nip && (
                            <span className="text-xs text-slate-500">{barang.peminjam.nip}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/super-admin/barang/${barang.id}`}>
                        <Button variant="ghost" size="sm" className="opacity-0 transition-opacity group-hover:opacity-100">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                          </svg>
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function KontenBarang() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kodeSatkerDariUrl = searchParams.get('kodeSatker');
  const [cari, setCari] = useState('');
  const [halaman, setHalaman] = useState(1);
  const [perHalaman, setPerHalaman] = useState(8);
  const [filterKodeSatker, setFilterKodeSatker] = useState(kodeSatkerDariUrl || '');
  const [filterKondisi, setFilterKondisi] = useState('');
  const [filterKetersediaan, setFilterKetersediaan] = useState('');

  // Filter yang aktif: dari URL (prioritas) atau dari dropdown
  const filterAktif: { kodeSatker?: string; kondisi?: string; ketersediaan?: string } = {
    kodeSatker: kodeSatkerDariUrl || filterKodeSatker || undefined,
    kondisi: filterKondisi || undefined,
    ketersediaan: filterKetersediaan || undefined,
  };

  // Ambil data barang
  const { data, filter, ubahFilter, sedangMemuat, refetch } = useBarangFolder(
    filterAktif,
    { includePeminjam: true }
  );

  // Sync state dari URL saat mount (untuk back/forward navigation)
  useEffect(() => {
    setFilterKodeSatker(kodeSatkerDariUrl || '');
  }, [kodeSatkerDariUrl]);

  // Handle ubah filter satker - update URL
  const handleUbahSatker = useCallback((nilai: string) => {
    setFilterKodeSatker(nilai);
    // Update URL
    const params = new URLSearchParams(window.location.search);
    if (nilai) {
      params.set('kodeSatker', nilai);
    } else {
      params.delete('kodeSatker');
    }
    const qs = params.toString();
    router.replace(qs ? `/super-admin/barang?${qs}` : '/super-admin/barang', { scroll: false });
  }, [router]);

  // Debounce pencarian
  useEffect(() => {
    const timer = setTimeout(() => ubahFilter({ q: cari || undefined }), 400);
    return () => clearTimeout(timer);
  }, [cari, ubahFilter]);

  // Kelompokkan barang menjadi folder per merk
  const grup = useMemo(() => kelompokkanPerMerk(data), [data]);

  // Kembali ke halaman 1 bila filter / jumlah per halaman berubah
  useEffect(() => {
    setHalaman(1);
  }, [filter, perHalaman]);

  const totalHalaman = Math.max(1, Math.ceil(grup.length / perHalaman));
  const halamanAman = Math.min(halaman, totalHalaman);
  const grupHalaman = grup.slice((halamanAman - 1) * perHalaman, halamanAman * perHalaman);

  return (
    <div className="space-y-6">
      {/* Header - ungu elegan */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900 via-violet-800 to-indigo-800 p-6 text-white shadow-xl">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-purple-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-1/3 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm shadow-lg ring-1 ring-white/20">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold">Manajemen Barang</h1>
            <p className="text-purple-100">{grup.length} merk • {data.length.toLocaleString('id-ID')} item total</p>
          </div>
        </div>
      </section>

      {/* Panel search + filter */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
        {/* Search */}
        <div className="border-b border-slate-100 p-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari kode / nama barang / merk..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-50/50 p-4">
          <Select
            value={kodeSatkerDariUrl || filterKodeSatker}
            onChange={(e) => handleUbahSatker(e.target.value)}
            className="w-72"
          >
            <option value="">Semua Kode Satker</option>
            {KODE_SATKER.map((s) => (
              <option key={s.kode} value={s.kode}>
                {s.kode.slice(-3)} - {s.label}
              </option>
            ))}
          </Select>
          <Select
            value={filterKondisi}
            onChange={(e) => setFilterKondisi(e.target.value)}
            className="w-40"
          >
            <option value="">Semua Kondisi</option>
            {OPSI_KONDISI.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select
            value={filterKetersediaan}
            onChange={(e) => setFilterKetersediaan(e.target.value)}
            className="w-40"
          >
            <option value="">Semua Stok</option>
            <option value="tersedia">Tersedia</option>
            <option value="habis">Habis</option>
          </Select>
        </div>
      </div>

      {/* Folder per merk */}
      {sedangMemuat ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          ikon="inventory_2"
          judul="Tidak Ada Barang"
          deskripsi="Belum ada barang yang terdaftar."
        />
      ) : (
        <>
          {/* Folder Container */}
          <FolderContainer grup={grupHalaman} />

          {/* Footer: jumlah folder per halaman + navigasi */}
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Tampilkan</span>
              <Select
                value={String(perHalaman)}
                onChange={(e) => setPerHalaman(Number(e.target.value))}
                className="h-9 w-[4.5rem]"
              >
                {OPSI_FOLDER.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </Select>
              <span>folder per halaman • {grup.length} merk • {data.length} barang</span>
            </div>

            {totalHalaman > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">
                  Halaman {halamanAman} dari {totalHalaman}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={halamanAman <= 1}
                  onClick={() => setHalaman(halamanAman - 1)}
                >
                  <ChevronLeft className="h-4 w-4" /> Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={halamanAman >= totalHalaman}
                  onClick={() => setHalaman(halamanAman + 1)}
                >
                  Berikutnya <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Folder Container dengan state terbuka sendiri
function FolderContainer({ grup, autoOpenAll = false }: { grup: GrupMerk[]; autoOpenAll?: boolean }) {
  const [terbuka, setTerbuka] = useState<Set<string>>(new Set());

  // Auto-open all folders when autoOpenAll is true
  useEffect(() => {
    if (autoOpenAll && grup.length > 0) {
      const semuaMerk = new Set(grup.map(g => g.merk));
      setTerbuka(semuaMerk);
    }
  }, [autoOpenAll, grup]);

  const toggle = (merk: string) => {
    setTerbuka((lama) => {
      const baru = new Set(lama);
      if (baru.has(merk)) baru.delete(merk);
      else baru.add(merk);
      return baru;
    });
  };

  const semuaTerbuka = grup.length > 0 && grup.every((g) => terbuka.has(g.merk));
  const bukaTutupSemua = () => {
    setTerbuka((lama) => {
      const baru = new Set(lama);
      for (const g of grup) {
        if (semuaTerbuka) baru.delete(g.merk);
        else baru.add(g.merk);
      }
      return baru;
    });
  };

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button variant="ghost" size="sm" onClick={bukaTutupSemua} className="text-primary hover:bg-primary/10">
          {semuaTerbuka ? 'Tutup semua folder' : 'Buka semua folder'}
        </Button>
      </div>

      <div className="space-y-3">
        {grup.map((g) => (
          <FolderItem
            key={g.merk}
            grup={g}
            terbuka={terbuka.has(g.merk)}
            onToggle={() => toggle(g.merk)}
          />
        ))}
      </div>
    </>
  );
}

export default function SuperAdminBarangPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-2xl bg-slate-200" />
        <div className="h-16 animate-pulse rounded-xl bg-slate-200" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-200" />)}
        </div>
      </div>
    }>
      <KontenBarang />
    </Suspense>
  );
}
