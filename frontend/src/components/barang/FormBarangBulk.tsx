// ============================================================
//  Form bulk insert barang (React Hook Form + Zod).
//  Mendukung:
//  - Dropdown merk dari database (autocomplete)
//  - Tambah merk baru
//  - Auto-generate NUP berdasarkan merk + kode satker + kode barang
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Upload, Package, Plus, ChevronDown } from 'lucide-react';
import { Input, Textarea, Select, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { OPSI_JENIS, OPSI_KONDISI } from '@/constants/status';
import type { DataBarangBulkForm } from '@/services/barang.service';
import api from '@/lib/api';

const schema = z.object({
  nama: z.string().min(2, 'Nama barang minimal 2 karakter.'),
  merk: z.string().trim().min(1, 'Merk wajib dipilih atau diisi.'),
  jenis: z.enum(['ELEKTRONIK', 'FURNITUR', 'KENDARAAN', 'ATK', 'LAINNYA']),
  kondisi: z.enum(['BAIK', 'RUSAK_RINGAN', 'RUSAK_BERAT']),
  lokasiPenyimpanan: z.string().optional(),
  deskripsi: z.string().optional(),
  kodeSatker: z.string().trim().min(1, 'Kode Satker wajib diisi.'),
  kodeBarangBmn: z.string().trim().min(1, 'Kode Barang wajib diisi.'),
  jumlahBarang: z.coerce.number().int('Harus bilangan bulat.').min(1, 'Jumlah minimal 1.').max(1000, 'Maksimal 1000.'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onSimpan: (data: DataBarangBulkForm) => Promise<void>;
  teksTombol?: string;
}

export function FormBarangBulk({ onSimpan, teksTombol = 'Simpan' }: Props) {
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sedangSimpan, setSedangSimpan] = useState(false);

  // State untuk dropdown merk
  const [daftarMerk, setDaftarMerk] = useState<string[]>([]);
  const [merkSearch, setMerkSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingMerk, setIsLoadingMerk] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nama: '',
      merk: '',
      jenis: 'ELEKTRONIK',
      kondisi: 'BAIK',
      lokasiPenyimpanan: '',
      deskripsi: '',
      kodeSatker: '',
      kodeBarangBmn: '',
      jumlahBarang: 1,
    },
  });

  const watchedMerk = watch('merk');
  const watchedKodeSatker = watch('kodeSatker');
  const watchedKodeBarangBmn = watch('kodeBarangBmn');
  const watchedJumlahBarang = watch('jumlahBarang');

  // Ambil daftar merk unik dari database
  const fetchDaftarMerk = useCallback(async (search: string = '') => {
    setIsLoadingMerk(true);
    try {
      const response = await api.get('/barang/merk', { params: { q: search } });
      setDaftarMerk(response.data.data || []);
    } catch {
      // Jika gagal, kosongkan saja
      setDaftarMerk([]);
    } finally {
      setIsLoadingMerk(false);
    }
  }, []);

  // Ambil merk saat komponen mount
  useEffect(() => {
    fetchDaftarMerk();
  }, [fetchDaftarMerk]);

  // Debounce search merk
  useEffect(() => {
    const timer = setTimeout(() => {
      if (merkSearch) {
        fetchDaftarMerk(merkSearch);
      } else {
        fetchDaftarMerk();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [merkSearch, fetchDaftarMerk]);

  const pilihFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFoto(file);
    if (file) setPreview(URL.createObjectURL(file));
  };

  const pilihMerk = (merk: string) => {
    setValue('merk', merk);
    setShowDropdown(false);
    setMerkSearch('');
    setIsAddingNew(false);
  };

  const handleTambahMerkBaru = () => {
    const merkBaru = merkSearch.trim().toUpperCase();
    if (merkBaru) {
      setValue('merk', merkBaru);
      setDaftarMerk((prev) => {
        if (!prev.includes(merkBaru)) {
          return [merkBaru, ...prev];
        }
        return prev;
      });
    }
    setShowDropdown(false);
    setMerkSearch('');
    setIsAddingNew(false);
  };

  const handleBukaDropdown = () => {
    fetchDaftarMerk();
    setShowDropdown(true);
  };

  const kirim = handleSubmit(async (values) => {
    setSedangSimpan(true);
    try {
      await onSimpan({ ...values, foto });
    } finally {
      setSedangSimpan(false);
    }
  });

  // Filter merk berdasarkan search
  const merkTerfilter = daftarMerk.filter((m) =>
    m.toLowerCase().includes(merkSearch.toLowerCase())
  );

  return (
    <form onSubmit={kirim} className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {/* Nama */}
      <div>
        <Label htmlFor="nama">Nama Barang</Label>
        <Input id="nama" placeholder="Contoh: Laptop Dell Inspiron" {...register('nama')} className="mt-1" />
        {errors.nama && <p className="mt-1 text-xs text-red-600">{errors.nama.message}</p>}
      </div>

      {/* Merk dengan autocomplete */}
      <div className="relative">
        <Label htmlFor="merk">Merk</Label>
        <div className="mt-1 relative">
          <Input
            id="merk"
            placeholder="Ketik untuk cari merk..."
            value={isAddingNew ? merkSearch : (showDropdown ? merkSearch : watchedMerk || '')}
            onChange={(e) => {
              setMerkSearch(e.target.value);
              if (!isAddingNew) {
                setValue('merk', e.target.value);
              }
            }}
            onFocus={handleBukaDropdown}
            onClick={() => setShowDropdown(true)}
            className="mt-1 pr-10"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className="h-4 w-4" />
          </button>

          {/* Dropdown merk */}
          {showDropdown && (
            <div className="absolute z-50 mt-1 w-full rounded-lg border bg-background shadow-lg">
              {/* Input untuk search/tambah merk baru */}
              <div className="flex items-center gap-2 border-b p-2">
                <Input
                  placeholder="Cari atau tambah merk baru..."
                  value={merkSearch}
                  onChange={(e) => setMerkSearch(e.target.value)}
                  className="h-8 text-sm"
                  autoFocus
                />
                {!merkTerfilter.includes(merkSearch.toUpperCase()) && merkSearch.trim() && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleTambahMerkBaru}
                    className="h-8 whitespace-nowrap text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Tambah
                  </Button>
                )}
              </div>

              {/* Loading state */}
              {isLoadingMerk && (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}

              {/* Daftar merk */}
              {!isLoadingMerk && (
                <div className="max-h-60 overflow-y-auto">
                  {merkTerfilter.length > 0 ? (
                    merkTerfilter.map((merk) => (
                      <button
                        key={merk}
                        type="button"
                        onClick={() => pilihMerk(merk)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        {merk}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      {merkSearch ? 'Merk tidak ditemukan' : 'Tidak ada merk'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        {errors.merk && <p className="mt-1 text-xs text-red-600">{errors.merk.message}</p>}
      </div>

      {/* Identitas aset — membentuk kode barang (Kode Satker - Kode Barang - NUP) */}
      <div className="md:col-span-2">
        <p className="text-sm font-medium text-on-surface">Identitas Aset (BMN)</p>
        <p className="text-xs text-muted-foreground">
          Kode barang dibentuk otomatis dari <strong>Kode Satker · Kode Barang · NUP</strong>{' '}
          (mis. 015110199411868000KP-3100102002-1180).
        </p>
      </div>

      <div>
        <Label htmlFor="kodeSatker">Kode Satker</Label>
        <Input id="kodeSatker" placeholder="Contoh: 015110199411868000KP" {...register('kodeSatker')} className="mt-1" />
        {errors.kodeSatker && <p className="mt-1 text-xs text-red-600">{errors.kodeSatker.message}</p>}
      </div>

      <div>
        <Label htmlFor="kodeBarangBmn">Kode Barang</Label>
        <Input id="kodeBarangBmn" placeholder="Contoh: 3100102002" {...register('kodeBarangBmn')} className="mt-1" />
        {errors.kodeBarangBmn && <p className="mt-1 text-xs text-red-600">{errors.kodeBarangBmn.message}</p>}
      </div>

      {/* Jumlah barang */}
      <div>
        <Label htmlFor="jumlahBarang">Jumlah Barang</Label>
        <Input
          id="jumlahBarang"
          type="number"
          min={1}
          max={1000}
          {...register('jumlahBarang')}
          className="mt-1"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          NUP akan di-generate otomatis: 1-{Number(watchedJumlahBarang) || 1}
        </p>
        {errors.jumlahBarang && <p className="mt-1 text-xs text-red-600">{errors.jumlahBarang.message}</p>}
      </div>

      {/* Preview NUP */}
      <div>
        <Label>Preview NUP</Label>
        <NupPreview
          kodeSatker={watchedKodeSatker}
          kodeBarangBmn={watchedKodeBarangBmn}
          merk={watchedMerk}
          jumlahBarang={Number(watchedJumlahBarang) || 1}
        />
      </div>

      {/* Jenis */}
      <div>
        <Label htmlFor="jenis">Jenis Barang</Label>
        <Select id="jenis" {...register('jenis')} className="mt-1">
          {OPSI_JENIS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Kondisi */}
      <div>
        <Label htmlFor="kondisi">Kondisi</Label>
        <Select id="kondisi" {...register('kondisi')} className="mt-1">
          {OPSI_KONDISI.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Lokasi */}
      <div>
        <Label htmlFor="lokasiPenyimpanan">Lokasi Penyimpanan</Label>
        <Input id="lokasiPenyimpanan" placeholder="Contoh: Gudang Lt. 2 — Rak A1" {...register('lokasiPenyimpanan')} className="mt-1" />
      </div>

      {/* Deskripsi */}
      <div className="md:col-span-2">
        <Label htmlFor="deskripsi">Deskripsi</Label>
        <Textarea id="deskripsi" placeholder="Keterangan tambahan mengenai barang..." {...register('deskripsi')} className="mt-1" />
      </div>

      {/* Foto */}
      <div className="md:col-span-2">
        <Label>Foto Barang</Label>
        <div className="mt-1 flex items-center gap-4">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border bg-muted">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Pratinjau" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <Package className="h-8 w-8" />
              </div>
            )}
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-2 text-sm text-muted-foreground hover:bg-muted">
            <Upload className="h-4 w-4" />
            Pilih foto (JPG/PNG, maks 5 MB)
            <input type="file" accept="image/*" className="hidden" onChange={pilihFoto} />
          </label>
        </div>
      </div>

      <div className="md:col-span-2">
        <Button type="submit" disabled={sedangSimpan} className="w-full md:w-auto">
          {sedangSimpan && <Loader2 className="h-4 w-4 animate-spin" />}
          {teksTombol}
        </Button>
      </div>
    </form>
  );
}

// ============================================================
//  Komponen Preview NUP — menampilkan NUP yang akan di-generate
// ============================================================
interface NupPreviewProps {
  kodeSatker?: string;
  kodeBarangBmn?: string;
  merk?: string;
  jumlahBarang: number;
}

function NupPreview({ kodeSatker, kodeBarangBmn, merk, jumlahBarang }: NupPreviewProps) {
  const [preview, setPreview] = useState<{ nupAwal: string | null; nupAkhir: string | null; tersedia: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Validasi: kodeSatker, kodeBarangBmn, dan jumlahBarang harus terisi
    const kodeSatkerVal = typeof kodeSatker === 'string' ? kodeSatker.trim() : '';
    const kodeBarangBmnVal = typeof kodeBarangBmn === 'string' ? kodeBarangBmn.trim() : '';
    const jumlahVal = typeof jumlahBarang === 'number' ? jumlahBarang : parseInt(String(jumlahBarang), 10);

    if (!kodeSatkerVal || !kodeBarangBmnVal || isNaN(jumlahVal) || jumlahVal < 1) {
      setPreview(null);
      return;
    }

    setLoading(true);
    api.get('/barang/preview-nup', {
      params: { kodeSatker: kodeSatkerVal, kodeBarangBmn: kodeBarangBmnVal, jumlah: jumlahVal },
    })
      .then((res) => {
        if (res.data?.data) {
          setPreview(res.data.data);
        } else {
          setPreview(null);
        }
      })
      .catch(() => setPreview(null))
      .finally(() => setLoading(false));
  }, [kodeSatker, kodeBarangBmn, jumlahBarang]);

  if (loading) {
    return (
      <div className="mt-1 flex items-center gap-2 rounded-lg border bg-muted p-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Memuat...</span>
      </div>
    );
  }

  if (!kodeSatker || !kodeBarangBmn) {
    return (
      <div className="mt-1 rounded-lg border bg-muted p-3">
        <span className="text-sm text-muted-foreground">
          Isi Kode Satker dan Kode Barang untuk melihat preview NUP
        </span>
      </div>
    );
  }

  if (!preview || !preview.nupAwal) {
    return (
      <div className="mt-1 rounded-lg border bg-muted p-3">
        <span className="text-sm text-muted-foreground">
          Belum ada barang dengan Kode Satker dan Kode Barang ini. NUP akan dimulai dari 1.
        </span>
      </div>
    );
  }

  const kodeContoh = `${kodeSatker}-${kodeBarangBmn}-${preview.nupAwal}`;

  return (
    <div className="mt-1 rounded-lg border bg-muted p-3">
      <div className="text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">NUP akan dimulai dari:</span>
          <span className="font-mono font-semibold text-green-600">{preview.nupAwal}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-muted-foreground">Sampai:</span>
          <span className="font-mono font-semibold text-green-600">{preview.nupAkhir}</span>
        </div>
        <div className="mt-2 border-t pt-2">
          <p className="text-xs text-muted-foreground">Contoh kode:</p>
          <p className="font-mono text-xs text-primary">{kodeContoh}</p>
        </div>
      </div>
    </div>
  );
}
