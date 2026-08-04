// ============================================================
//  Super Admin — Detail Barang (view-only, tidak ada edit).
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Package, MapPin, Boxes, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { notify } from '@/components/ui/toast';
import { barangService } from '@/services/barang.service';
import { ambilPesanError, urlFile } from '@/lib/utils';
import { JENIS_BARANG, KONDISI_BARANG } from '@/constants/status';
import { RUTE } from '@/constants/routes';
import type { Barang } from '@/types/barang.type';
import { Icon } from '@/components/ui/icon';

export default function SuperAdminDetailBarangPage() {
  const { id } = useParams<{ id: string }>();
  const [barang, setBarang] = useState<Barang | null>(null);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    if (!id) return;
    setMemuat(true);
    barangService
      .getById(id)
      .then(setBarang)
      .catch((e) => notify.gagal(ambilPesanError(e, 'Gagal memuat barang.')))
      .finally(() => setMemuat(false));
  }, [id]);

  if (memuat) return <LoadingSpinner layarPenuh />;
  if (!barang) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Icon name="error" style={{ fontSize: 48 }} className="text-gray-400" />
        <p className="text-gray-500">Barang tidak ditemukan.</p>
        <Link href={RUTE.superAdminBarang}>
          <Button variant="outline">Kembali ke Daftar</Button>
        </Link>
      </div>
    );
  }

  const kondisi = KONDISI_BARANG[barang.kondisi];
  const spesifikasi = (barang.deskripsi || '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={RUTE.superAdminBarang}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Detail Barang</h1>
          <p className="text-sm text-gray-500">Melihat detail barang dari semua satker</p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="relative flex h-72 w-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 sm:h-80">
          {barang.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={urlFile(barang.fotoUrl)}
              alt={barang.nama}
              className="max-h-full max-w-full object-contain"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Package className="h-16 w-16" />
            </div>
          )}
        </div>
        <CardContent className="space-y-4 p-6">
          <div>
            <p className="font-mono text-sm text-primary">{barang.kodeBarang}</p>
            <h2 className="text-2xl font-bold text-foreground">{barang.nama}</h2>
            {barang.merk && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                Merk: <span className="font-medium text-foreground">{barang.merk}</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge className="border-primary/20 bg-primary/10 text-primary">{JENIS_BARANG[barang.jenis]}</Badge>
            <Badge className={kondisi.kelas}>{kondisi.label}</Badge>
            {barang.namaSatker && (
              <Badge variant="outline">{barang.namaSatker}</Badge>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Info ikon={Boxes} label="Stok Tersedia" nilai={`${barang.jumlahTersedia} / ${barang.jumlahTotal}`} />
            <Info ikon={MapPin} label="Lokasi" nilai={barang.lokasiPenyimpanan || '-'} />
            {barang.peminjam ? (
              <Info
                ikon={User}
                label="Sedang Dipinjam Oleh"
                nilai={`${barang.peminjam.nama}${barang.peminjam.nip ? ` (${barang.peminjam.nip})` : ''}`}
              />
            ) : (
              <Info ikon={User} label="Peminjam" nilai="-" />
            )}
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
