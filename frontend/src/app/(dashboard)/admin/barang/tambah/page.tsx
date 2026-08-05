// ============================================================
//  Admin — Tambah Barang.
// ============================================================

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormBarang } from '@/components/barang/FormBarang';
import { notify } from '@/components/ui/toast';
import { barangService, type DataBarangForm } from '@/services/barang.service';
import { ambilPesanError } from '@/lib/utils';
import { RUTE } from '@/constants/routes';

export default function TambahBarangPage() {
  const router = useRouter();

  const simpan = async (data: DataBarangForm) => {
    try {
      const barang = await barangService.create(data);
      notify.suksess(`Barang "${barang.nama}" berhasil ditambahkan (${barang.kodeBarang}).`);
      router.push(RUTE.adminBarang);
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal menambahkan barang.'));
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Button asChild variant="ghost" size="sm">
        <Link href={RUTE.adminBarang}>
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Barang
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Tambah Barang Baru</CardTitle>
          <p className="text-sm text-muted-foreground">
            Kode barang dibentuk otomatis dari kunci aset: Kode Satker · Kode Barang · NUP
            (mis. 015110199411868000KP-3100102002-1180).
          </p>
        </CardHeader>
        <CardContent>
          <FormBarang onSimpan={simpan} teksTombol="Simpan Barang" />
        </CardContent>
      </Card>
    </div>
  );
}
