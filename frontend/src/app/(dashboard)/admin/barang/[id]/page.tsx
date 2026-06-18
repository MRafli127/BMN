// ============================================================
//  Admin — Detail & Edit Barang.
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Trash2, Package, MapPin, Boxes, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormBarang } from '@/components/barang/FormBarang';
import { KonfirmasiDialog } from '@/components/shared/KonfirmasiDialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { notify } from '@/components/ui/toast';
import { barangService, type DataBarangForm } from '@/services/barang.service';
import { ambilPesanError, urlFile } from '@/lib/utils';
import { JENIS_BARANG, KONDISI_BARANG } from '@/constants/status';
import { RUTE } from '@/constants/routes';
import type { Barang } from '@/types/barang.type';

export default function DetailBarangPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [barang, setBarang] = useState<Barang | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [mode, setMode] = useState<'lihat' | 'edit'>('lihat');
  const [konfirmHapus, setKonfirmHapus] = useState(false);
  const [sedangHapus, setSedangHapus] = useState(false);

  const muat = () => {
    setMemuat(true);
    barangService
      .getById(id)
      .then(setBarang)
      .catch((e) => notify.gagal(ambilPesanError(e, 'Gagal memuat barang.')))
      .finally(() => setMemuat(false));
  };

  useEffect(() => {
    if (id) muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const simpanEdit = async (data: DataBarangForm) => {
    try {
      const updated = await barangService.update(id, data);
      setBarang(updated);
      setMode('lihat');
      notify.sukses('Barang berhasil diperbarui.');
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal memperbarui barang.'));
    }
  };

  const hapus = async () => {
    setSedangHapus(true);
    try {
      await barangService.remove(id);
      notify.sukses('Barang berhasil dihapus.');
      router.push(RUTE.adminBarang);
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal menghapus barang.'));
      setSedangHapus(false);
    }
  };

  if (memuat) return <LoadingSpinner layarPenuh />;
  if (!barang) return null;

  const kondisi = KONDISI_BARANG[barang.kondisi];

  // Deskripsi hasil impor berformat "Merk: X | Jenis BMN: Y | Satker: Z".
  // Pecah menjadi daftar spesifikasi bila memakai pemisah " | ".
  const spesifikasi = (barang.deskripsi || '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href={RUTE.adminBarang}>
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>
        </Button>
        {mode === 'lihat' ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setMode('edit')}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
            <Button variant="destructive" onClick={() => setKonfirmHapus(true)}>
              <Trash2 className="h-4 w-4" /> Hapus
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setMode('lihat')}>
            <X className="h-4 w-4" /> Batal Edit
          </Button>
        )}
      </div>

      {mode === 'edit' ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Barang</CardTitle>
          </CardHeader>
          <CardContent>
            <FormBarang nilaiAwal={barang} onSimpan={simpanEdit} teksTombol="Simpan Perubahan" />
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="h-56 w-full bg-muted">
            {barang.fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urlFile(barang.fotoUrl)} alt={barang.nama} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <Package className="h-16 w-16" />
              </div>
            )}
          </div>
          <CardContent className="space-y-4 p-6">
            <div>
              <p className="font-mono text-sm text-primary">{barang.kodeBarang}</p>
              <h1 className="text-2xl font-bold text-foreground">{barang.nama}</h1>
              {barang.merk && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Merk: <span className="font-medium text-foreground">{barang.merk}</span>
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className="border-primary/20 bg-primary/10 text-primary">{JENIS_BARANG[barang.jenis]}</Badge>
              <Badge className={kondisi.kelas}>{kondisi.label}</Badge>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Info ikon={Boxes} label="Stok Tersedia" nilai={`${barang.jumlahTersedia} / ${barang.jumlahTotal}`} />
              <Info ikon={MapPin} label="Lokasi" nilai={barang.lokasiPenyimpanan || '-'} />
            </div>

            {spesifikasi.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground">Spesifikasi</p>
                <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                  {spesifikasi.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <KonfirmasiDialog
        terbuka={konfirmHapus}
        onUbahTerbuka={setKonfirmHapus}
        judul="Hapus Barang"
        deskripsi={`Yakin ingin menghapus "${barang.nama}"? Tindakan ini tidak dapat dibatalkan.`}
        teksKonfirmasi="Ya, Hapus"
        variantKonfirmasi="destructive"
        sedangProses={sedangHapus}
        onKonfirmasi={hapus}
      />
    </div>
  );
}

function Info({ ikon: Ikon, label, nilai }: { ikon: typeof Boxes; label: string; nilai: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
      <Ikon className="h-5 w-5 text-primary" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-foreground">{nilai}</p>
      </div>
    </div>
  );
}
