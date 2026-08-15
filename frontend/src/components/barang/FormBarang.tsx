// ============================================================
//  Form tambah/edit barang (React Hook Form + Zod).
// ============================================================

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Upload, Package } from 'lucide-react';
import { Input, Textarea, Select, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { urlFile } from '@/lib/utils';
import { OPSI_JENIS, OPSI_KONDISI } from '@/constants/status';
import type { Barang } from '@/types/barang.type';
import type { DataBarangForm } from '@/services/barang.service';

const schema = z.object({
  nama: z.string().min(2, 'Nama barang minimal 2 karakter.'),
  merk: z.string().optional(),
  jenis: z.enum(['ELEKTRONIK', 'FURNITUR', 'KENDARAAN', 'ATK', 'LAINNYA']),
  jumlahTotal: z.coerce.number().int('Harus bilangan bulat.').min(1, 'Jumlah minimal 1.'),
  kondisi: z.enum(['BAIK', 'RUSAK_RINGAN', 'RUSAK_BERAT']),
  lokasiPenyimpanan: z.string().optional(),
  deskripsi: z.string().optional(),
  // Identitas aset — membentuk kode barang (Kode Satker - Kode Barang - NUP).
  kodeSatker: z.string().trim().min(1, 'Kode Satker wajib diisi.'),
  kodeBarangBmn: z.string().trim().min(1, 'Kode Barang wajib diisi.'),
  nup: z.string().trim().min(1, 'NUP wajib diisi.'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  nilaiAwal?: Barang;
  onSimpan: (data: DataBarangForm) => Promise<void>;
  teksTombol?: string;
}

export function FormBarang({ nilaiAwal, onSimpan, teksTombol = 'Simpan' }: Props) {
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(nilaiAwal?.fotoUrl ? urlFile(nilaiAwal.fotoUrl) : null);
  const [sedangSimpan, setSedangSimpan] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nama: nilaiAwal?.nama ?? '',
      merk: nilaiAwal?.merk ?? '',
      jenis: nilaiAwal?.jenis ?? 'ELEKTRONIK',
      jumlahTotal: nilaiAwal?.jumlahTotal ?? 1,
      kondisi: nilaiAwal?.kondisi ?? 'BAIK',
      lokasiPenyimpanan: nilaiAwal?.lokasiPenyimpanan ?? '',
      deskripsi: nilaiAwal?.deskripsi ?? '',
      kodeSatker: nilaiAwal?.kodeSatker ?? '',
      kodeBarangBmn: nilaiAwal?.kodeBarangBmn ?? '',
      nup: nilaiAwal?.nup ?? '',
    },
  });

  const pilihFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFoto(file);
    if (file) setPreview(URL.createObjectURL(file));
  };

  const kirim = handleSubmit(async (values) => {
    setSedangSimpan(true);
    try {
      await onSimpan({ ...values, foto });
    } finally {
      setSedangSimpan(false);
    }
  });

  return (
    <form onSubmit={kirim} className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {/* Nama */}
      <div>
        <Label htmlFor="nama">Nama Barang</Label>
        <Input id="nama" placeholder="Contoh: Laptop Dinas" {...register('nama')} className="mt-1" />
        {errors.nama && <p className="mt-1 text-xs text-red-600">{errors.nama.message}</p>}
      </div>

      {/* Merk */}
      <div>
        <Label htmlFor="merk">Merk</Label>
        <Input id="merk" placeholder="Contoh: Lenovo, Dell, HP" {...register('merk')} className="mt-1" />
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

      <div>
        <Label htmlFor="nup">NUP</Label>
        <Input id="nup" placeholder="Contoh: 1180" {...register('nup')} className="mt-1" />
        {errors.nup && <p className="mt-1 text-xs text-red-600">{errors.nup.message}</p>}
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

      {/* Jumlah */}
      <div>
        <Label htmlFor="jumlahTotal">Jumlah Total</Label>
        <Input id="jumlahTotal" type="number" min={1} {...register('jumlahTotal')} className="mt-1" />
        {errors.jumlahTotal && <p className="mt-1 text-xs text-red-600">{errors.jumlahTotal.message}</p>}
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
