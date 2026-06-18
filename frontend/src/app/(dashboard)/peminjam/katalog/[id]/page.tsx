// ============================================================
//  Peminjam — Detail Barang (read-only).
//  Menampilkan informasi lengkap barang dari katalog. Aman bila
//  nilai enum di luar dugaan (tidak error) & barang tidak ditemukan.
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Package, MapPin, Boxes, PlusCircle, CheckCircle2, XCircle, ShoppingCart, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { notify } from '@/components/ui/toast';
import { barangService } from '@/services/barang.service';
import { useKeranjangStore } from '@/store/keranjangStore';
import { ambilPesanError, cn, urlFile } from '@/lib/utils';
import { JENIS_BARANG, KONDISI_BARANG } from '@/constants/status';
import { RUTE } from '@/constants/routes';
import type { Barang } from '@/types/barang.type';

export default function DetailKatalogPage() {
  const { id } = useParams<{ id: string }>();
  const [barang, setBarang] = useState<Barang | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [gagal, setGagal] = useState(false);

  const items = useKeranjangStore((s) => s.items);
  const tambah = useKeranjangStore((s) => s.tambah);
  const hapus = useKeranjangStore((s) => s.hapus);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!id) return;
    setMemuat(true);
    setGagal(false);
    barangService
      .getById(id)
      .then(setBarang)
      .catch((e) => {
        setGagal(true);
        notify.gagal(ambilPesanError(e, 'Gagal memuat detail barang.'));
      })
      .finally(() => setMemuat(false));
  }, [id]);

  if (memuat) return <LoadingSpinner layarPenuh />;

  if (gagal || !barang) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Button asChild variant="ghost" size="sm">
          <Link href={RUTE.peminjamKatalog}>
            <ArrowLeft className="h-4 w-4" /> Kembali ke Katalog
          </Link>
        </Button>
        <EmptyState judul="Barang tidak ditemukan" deskripsi="Barang mungkin telah dihapus atau tautannya tidak valid." />
      </div>
    );
  }

  // Fallback aman bila nilai enum di luar daftar yang dikenal.
  const jenisLabel = JENIS_BARANG[barang.jenis] ?? barang.jenis;
  const kondisi = KONDISI_BARANG[barang.kondisi] ?? {
    label: barang.kondisi ?? '-',
    kelas: 'bg-muted text-foreground border-border',
  };
  const tersedia = barang.jumlahTersedia > 0;

  // Deskripsi hasil impor berformat "Merk: X | Jenis BMN: Y | Satker: Z".
  // Pecah menjadi daftar bila memakai pemisah " | ".
  const spesifikasi = (barang.deskripsi || '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Button asChild variant="ghost" size="sm">
        <Link href={RUTE.peminjamKatalog}>
          <ArrowLeft className="h-4 w-4" /> Kembali ke Katalog
        </Link>
      </Button>

      <Card className="overflow-hidden">
        <div className="relative h-56 w-full bg-muted">
          {barang.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urlFile(barang.fotoUrl)} alt={barang.nama} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Package className="h-16 w-16" />
            </div>
          )}
          <span
            className={cn(
              'absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold',
              tersedia ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            )}
          >
            {tersedia ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
            {tersedia ? 'Tersedia' : 'Stok Habis'}
          </span>
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
            <Badge className="border-primary/20 bg-primary/10 text-primary">{jenisLabel}</Badge>
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

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            {tersedia ? (
              <>
                <Button asChild className="w-full sm:w-auto">
                  <Link href={`${RUTE.peminjamAjukan}?barangId=${barang.id}`}>
                    <PlusCircle className="h-4 w-4" /> Ajukan Pinjam
                  </Link>
                </Button>
                {mounted && items[barang.id] ? (
                  <Button
                    variant="secondary"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      hapus(barang.id);
                      notify.info(`"${barang.nama}" dihapus dari keranjang.`);
                    }}
                  >
                    <Check className="h-4 w-4" /> Di Keranjang
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      tambah(barang);
                      notify.sukses(`"${barang.nama}" ditambahkan ke keranjang.`);
                    }}
                  >
                    <ShoppingCart className="h-4 w-4" /> Tambah ke Keranjang
                  </Button>
                )}
              </>
            ) : (
              <Button className="w-full sm:w-auto" disabled>
                Stok Habis
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ ikon: Ikon, label, nilai }: { ikon: typeof Boxes; label: string; nilai: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
      <Ikon className="h-5 w-5 text-primary" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-medium text-foreground">{nilai}</p>
      </div>
    </div>
  );
}
